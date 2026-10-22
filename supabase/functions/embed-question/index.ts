import { corsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return jsonResponse(request, { error: "Authentication required" }, 401);
  }

  try {
    const user = await getAuthenticatedUser(bearerMatch[1].trim());
    if (!user) {
      return jsonResponse(request, { error: "Invalid or expired access token" }, 401);
    }
  } catch (error) {
    console.error("Supabase Auth verification failed:", error);
    return jsonResponse(request, { error: "Unable to verify authentication" }, 500);
  }

  let question: unknown;
  try {
    ({ question } = await request.json());
  } catch {
    return jsonResponse(request, { error: "Request body must be valid JSON" }, 400);
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    return jsonResponse(request, { error: 'A non-empty "question" is required' }, 400);
  }

  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiApiKey) {
    console.error("OPENAI_API_KEY is not configured");
    return jsonResponse(request, { error: "Embedding service is not configured" }, 500);
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: question.trim(),
      }),
    });

    if (!openAiResponse.ok) {
      console.error("OpenAI embedding request failed with status", openAiResponse.status);
      return jsonResponse(request, { error: "Failed to generate embedding" }, 502);
    }

    const result = await openAiResponse.json();
    const embedding = result?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      console.error("OpenAI embedding response did not contain an embedding");
      return jsonResponse(request, { error: "Invalid response from embedding service" }, 502);
    }

    return jsonResponse(request, { embedding });
  } catch (error) {
    console.error("OpenAI embedding request errored:", error);
    return jsonResponse(request, { error: "Failed to generate embedding" }, 502);
  }
});
