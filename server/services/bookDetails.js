const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const GOOGLE_BOOKS_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes';
const DETAILS_TIMEOUT_MS = 3500;

function stripHtml(text = '') {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOpenLibraryDescription(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return stripHtml(raw);
  if (typeof raw === 'object' && typeof raw.value === 'string') {
    return stripHtml(raw.value);
  }
  return '';
}

function isSafeWorkKey(workKey) {
  return typeof workKey === 'string' && /^\/works\/[A-Za-z0-9_-]+$/.test(workKey.trim());
}

/**
 * Fetch synopsis from Open Library work JSON (/works/OL...W.json),
 * falling back to Google Books intitle:+inauthor: if still empty.
 */
export async function fetchBookSynopsis({ workKey, title, author }) {
  // 1. Try Open Library work details if workKey exists
  if (isSafeWorkKey(workKey)) {
    try {
      const res = await fetch(`${OPEN_LIBRARY_BASE}${workKey.trim()}.json`, {
        signal: AbortSignal.timeout(DETAILS_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const desc = extractOpenLibraryDescription(data?.description);
        if (desc) {
          return {
            description: desc,
            source: 'openlibrary-work',
          };
        }
      }
    } catch {
      // Fall through to Google Books
    }
  }

  // 2. Fallback to Google Books targeted title + author query
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanAuthor = typeof author === 'string' ? author.trim() : '';

  if (cleanTitle) {
    try {
      const q = cleanAuthor
        ? `intitle:${cleanTitle}+inauthor:${cleanAuthor}`
        : `intitle:${cleanTitle}`;
      const params = new URLSearchParams({
        q,
        printType: 'books',
        maxResults: '3',
      });
      const res = await fetch(`${GOOGLE_BOOKS_SEARCH_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(DETAILS_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const item of items) {
          const desc = stripHtml(item?.volumeInfo?.description || '');
          if (desc) {
            return {
              description: desc,
              source: 'google-books',
            };
          }
        }
      }
    } catch {
      // Gracefully return null description on upstream error/timeout
    }
  }

  return {
    description: null,
    source: null,
  };
}
