function savedPageConfigIsValid() {
    return typeof SUPABASE_CONFIG !== 'undefined' &&
        SUPABASE_CONFIG.url &&
        SUPABASE_CONFIG.anonKey &&
        !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
        !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE') &&
        SUPABASE_CONFIG.anonKey.length >= 20;
}

const savedMessage = document.getElementById('saved-message');
const savedItemsContainer = document.getElementById('saved-items');
const savedUserEmail = document.getElementById('saved-user-email');
const savedLogoutBtn = document.getElementById('saved-logout-btn');

function escapeSavedHtml(value) {
    const element = document.createElement('div');
    element.textContent = value ?? '';
    return element.innerHTML;
}

function formatSavedDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function safeSavedSourceUrl(value) {
    if (typeof value !== 'string' || value.length === 0) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

async function loadSavedPage() {
    if (!savedPageConfigIsValid()) {
        savedMessage.textContent = 'Configure Supabase before viewing saved items.';
        return;
    }

    const client = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
    );
    const { data: { session }, error: sessionError } = await client.auth.getSession();

    if (sessionError || !session) {
        savedMessage.textContent = 'Sign in on the search page to see your saved items.';
        return;
    }

    savedUserEmail.textContent = session.user.email || '';
    savedLogoutBtn.classList.remove('hidden');

    const { data, error } = await client
        .from('saved_items')
        .select('id, item_type, title, speaker, content, source_url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        savedMessage.textContent = `Could not load saved items: ${error.message}`;
        return;
    }

    if (!data || data.length === 0) {
        savedMessage.textContent = 'No saved items yet. Use the star beside a search result to save it.';
        return;
    }

    savedMessage.textContent = `${data.length} saved item${data.length === 1 ? '' : 's'}`;
    savedItemsContainer.innerHTML = data.map((item) => {
        const label = item.item_type === 'answer' ? 'AI answer'
            : item.item_type === 'talk' ? 'Talk' : 'Quote';
        const safeSourceUrl = safeSavedSourceUrl(item.source_url);
        const sourceLink = safeSourceUrl
            ? `<a class="result-title-link" href="${escapeSavedHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer">Open source talk</a>`
            : '';

        return `<article class="result-card saved-item-card">
            <div class="result-card-header">
                <div>
                    <span class="saved-item-type">${label}</span>
                    <div class="result-title">${escapeSavedHtml(item.title)}</div>
                    ${item.speaker ? `<div class="result-speaker">by ${escapeSavedHtml(item.speaker)}</div>` : ''}
                </div>
                <button class="save-remove-btn" type="button" data-remove-id="${escapeSavedHtml(item.id)}"
                    aria-label="Remove saved item">Remove</button>
            </div>
            <div class="result-sentences saved-item-content">${escapeSavedHtml(item.content)}</div>
            <div class="saved-item-footer">${sourceLink}<span>${escapeSavedHtml(formatSavedDate(item.created_at))}</span></div>
        </article>`;
    }).join('');

    savedItemsContainer.querySelectorAll('[data-remove-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = button.dataset.removeId;
            button.disabled = true;
            const { error: deleteError } = await client
                .from('saved_items')
                .delete()
                .eq('id', id);

            if (deleteError) {
                button.disabled = false;
                savedMessage.textContent = `Could not remove saved item: ${deleteError.message}`;
                return;
            }

            button.closest('.saved-item-card')?.remove();
            const remaining = savedItemsContainer.querySelectorAll('.saved-item-card').length;
            savedMessage.textContent = remaining
                ? `${remaining} saved item${remaining === 1 ? '' : 's'}`
                : 'No saved items yet. Use the star beside a search result to save it.';
        });
    });
}

savedLogoutBtn.addEventListener('click', async () => {
    if (savedPageConfigIsValid()) {
        const client = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
        );
        await client.auth.signOut();
    }
    window.location.href = 'index.html';
});

function initializeSavedPage() {
    if (!savedPageConfigIsValid()) {
        savedMessage.textContent = 'Loading Supabase configuration…';
        window.addEventListener('config-loaded', () => {
            loadSavedPage().catch((error) => {
                savedMessage.textContent = `Could not load saved items: ${error.message}`;
            });
        }, { once: true });
        window.setTimeout(() => {
            if (!savedPageConfigIsValid()) {
                savedMessage.textContent = 'Could not load Supabase configuration. Check config.public.json.';
            }
        }, 3000);
        return;
    }

    loadSavedPage().catch((error) => {
        savedMessage.textContent = `Could not load saved items: ${error.message}`;
    });
}

initializeSavedPage();
