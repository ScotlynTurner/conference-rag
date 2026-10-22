CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('quote', 'talk', 'answer')),
    title TEXT NOT NULL,
    speaker TEXT,
    content TEXT NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_items_user_created_idx
    ON public.saved_items (user_id, created_at DESC);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their saved items" ON public.saved_items;
CREATE POLICY "Users can read their saved items"
    ON public.saved_items FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can save their own items" ON public.saved_items;
CREATE POLICY "Users can save their own items"
    ON public.saved_items FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their saved items" ON public.saved_items;
CREATE POLICY "Users can delete their saved items"
    ON public.saved_items FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated;
