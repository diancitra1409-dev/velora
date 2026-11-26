import { ApiHttpError } from './errorParser.js';

const GOOGLE_BOOKS_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'cover_i',
  'subject',
  'first_sentence',
  'edition_count',
].join(',');

const MAX_MERGED_RESULTS = 16;

export const TRENDING_SEARCHES = [
  'Laut Bercerita',
  'Tere Liye',
  'Filosofi Teras',
  'Atomic Habits',
];

export const SEARCH_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'title', label: 'By Title' },
  { id: 'author', label: 'By Author' },
];

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

function upgradeHttps(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  return url.trim().replace(/^http:\/\//i, 'https://');
}

function extractPublishYear(dateStr) {
  if (typeof dateStr === 'number' && Number.isFinite(dateStr)) return dateStr;
  if (typeof dateStr !== 'string') return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeTextForKey(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDedupeKey(book) {
  const normTitle = normalizeTextForKey(book.title);
  const normAuthor = normalizeTextForKey(book.authors?.[0] || '');
  return `${normTitle}::${normAuthor}`;
}

/**
 * Normalize a Google Books volume item into the unified Velora book object.
 */
function normalizeGoogleVolume(item, index) {
  const info = item?.volumeInfo || {};
  const rawCover =
    info.imageLinks?.thumbnail ||
    info.imageLinks?.smallThumbnail ||
    null;

  const subjects = Array.isArray(info.categories)
    ? info.categories
        .flatMap((c) => String(c).split('/'))
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 40)
        .slice(0, 5)
    : [];

  const description = info.description ? stripHtml(info.description) : null;

  return {
    id: item?.id ? `gb-${item.id}` : `gb-${info.title || 'book'}-${index}`,
    key: item?.id ? `/google/${item.id}` : '',
    title: info.title?.trim() || 'Untitled Work',
    authors: Array.isArray(info.authors) ? info.authors.slice(0, 3) : [],
    firstPublishYear: extractPublishYear(info.publishedDate),
    coverId: null,
    coverUrl: upgradeHttps(rawCover),
    subjects,
    description: description || null,
    firstSentence: null,
    editionCount: null,
    source: 'google',
  };
}

/**
 * Normalize an Open Library search doc into the unified Velora book object.
 */
function normalizeOpenLibraryDoc(doc, index) {
  const firstSentence = Array.isArray(doc.first_sentence)
    ? doc.first_sentence[0]
    : typeof doc.first_sentence === 'string'
      ? doc.first_sentence
      : null;

  const subjects = Array.isArray(doc.subject)
    ? doc.subject
        .filter((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 40)
        .slice(0, 5)
    : [];

  return {
    id: doc.key ? `ol-${doc.key}` : `ol-${doc.title || 'book'}-${index}`,
    key: doc.key || '',
    title: doc.title?.trim() || 'Untitled Work',
    authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 3) : [],
    firstPublishYear: doc.first_publish_year ?? null,
    coverId: doc.cover_i ?? null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    subjects,
    description: null,
    firstSentence: firstSentence ? String(firstSentence).trim() : null,
    editionCount: doc.edition_count ?? null,
    source: 'openlibrary',
  };
}

async function fetchGoogleBooks({ query, filter, maxResults = 12, signal }) {
  const q =
    filter === 'title'
      ? `intitle:${query}`
      : filter === 'author'
        ? `inauthor:${query}`
        : query;

  const params = new URLSearchParams({
    q,
    printType: 'books',
    maxResults: String(maxResults),
  });

  const response = await fetch(`${GOOGLE_BOOKS_SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiHttpError(
      response.status,
      `Google Books returned status ${response.status}`,
      response.statusText
    );
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    books: items.map(normalizeGoogleVolume),
    totalFound: typeof data?.totalItems === 'number' ? data.totalItems : items.length,
  };
}

async function fetchOpenLibrary({ query, filter, signal }) {
  const params = new URLSearchParams();
  if (filter === 'title') {
    params.set('title', query);
  } else if (filter === 'author') {
    params.set('author', query);
  } else {
    params.set('q', query);
  }
  params.set('limit', '12');
  params.set('fields', OPEN_LIBRARY_FIELDS);

  const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiHttpError(
      response.status,
      `Open Library returned status ${response.status}`,
      response.statusText
    );
  }

  const data = await response.json();
  const docs = Array.isArray(data?.docs) ? data.docs : [];

  return {
    books: docs.map(normalizeOpenLibraryDoc),
    totalFound: typeof data?.numFound === 'number' ? data.numFound : docs.length,
  };
}

function scorePriority(book) {
  let score = 0;
  if (book.source === 'google') score += 10;
  if (book.coverUrl) score += 5;
  if (book.description) score += 4;
  if (book.firstSentence) score += 1;
  return score;
}

/**
 * Merge Google Books + Open Library results:
 * - Prioritize Google Books matches with cover images & descriptions
 * - Deduplicate matching normalized title + primary author (enriching missing fields)
 * - Cap at 16 clean results
 */
function mergeAndDeduplicate(googleBooks, openLibraryBooks) {
  const rankedGoogle = [...googleBooks].sort((a, b) => scorePriority(b) - scorePriority(a));
  const rankedOpenLib = [...openLibraryBooks].sort((a, b) => scorePriority(b) - scorePriority(a));
  const combined = [...rankedGoogle, ...rankedOpenLib];

  const byKey = new Map();

  for (const book of combined) {
    const key = buildDedupeKey(book);
    if (!byKey.has(key)) {
      byKey.set(key, { ...book });
      continue;
    }

    // Enrich existing prioritized record with any missing metadata from secondary match
    const existing = byKey.get(key);
    if (!existing.coverUrl && book.coverUrl) existing.coverUrl = book.coverUrl;
    if (!existing.description && book.description) existing.description = book.description;
    if (!existing.firstSentence && book.firstSentence) existing.firstSentence = book.firstSentence;
    if (!existing.firstPublishYear && book.firstPublishYear) {
      existing.firstPublishYear = book.firstPublishYear;
    }
    if ((!existing.subjects || existing.subjects.length === 0) && book.subjects?.length > 0) {
      existing.subjects = book.subjects;
    }
  }

  return Array.from(byKey.values()).slice(0, MAX_MERGED_RESULTS);
}

async function runHybridPass({ query, filter, googleMaxResults = 12, signal }) {
  const [googleResult, openLibResult] = await Promise.allSettled([
    fetchGoogleBooks({ query, filter, maxResults: googleMaxResults, signal }),
    fetchOpenLibrary({ query, filter, signal }),
  ]);

  if (signal?.aborted) {
    const abortErr = new Error('Search aborted');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const googleOk = googleResult.status === 'fulfilled';
  const openLibOk = openLibResult.status === 'fulfilled';

  if (!googleOk && !openLibOk) {
    if (
      googleResult.reason?.name === 'AbortError' ||
      openLibResult.reason?.name === 'AbortError'
    ) {
      const abortErr = new Error('Search aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    const bothNetworkFailures =
      googleResult.reason instanceof TypeError &&
      openLibResult.reason instanceof TypeError;

    if (bothNetworkFailures) {
      throw new TypeError('Failed to fetch book catalog');
    }

    // Surface HTTP status / error details if one or both APIs responded with HTTP errors
    throw openLibResult.reason || googleResult.reason;
  }

  const googleBooks = googleOk ? googleResult.value.books : [];
  const openLibBooks = openLibOk ? openLibResult.value.books : [];
  const books = mergeAndDeduplicate(googleBooks, openLibBooks);

  const googleTotal = googleOk ? googleResult.value.totalFound : 0;
  const openLibTotal = openLibOk ? openLibResult.value.totalFound : 0;

  return {
    books,
    googleBooks,
    openLibBooks,
    totalFound: Math.max(googleTotal, openLibTotal, books.length),
  };
}

/**
 * Parallel Hybrid Search querying Google Books API and Open Library Search API simultaneously.
 * Automatically runs a broader unprefixed fallback when a filtered search returns < 3 results.
 */
export async function searchBooks({ query, filter = 'all', signal }) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { books: [], totalFound: 0 };
  }

  const primary = await runHybridPass({
    query: trimmed,
    filter,
    googleMaxResults: 12,
    signal,
  });

  if ((filter === 'title' || filter === 'author') && primary.books.length < 3) {
    try {
      const broader = await runHybridPass({
        query: trimmed,
        filter: 'all',
        googleMaxResults: 15,
        signal,
      });

      const merged = mergeAndDeduplicate(
        [...primary.googleBooks, ...broader.googleBooks],
        [...primary.openLibBooks, ...broader.openLibBooks]
      );

      return {
        books: merged,
        totalFound: Math.max(primary.totalFound, broader.totalFound, merged.length),
      };
    } catch (fallbackErr) {
      if (fallbackErr?.name === 'AbortError') throw fallbackErr;
      // Keep primary results if broader fallback fails
    }
  }

  return {
    books: primary.books,
    totalFound: primary.totalFound,
  };
}
