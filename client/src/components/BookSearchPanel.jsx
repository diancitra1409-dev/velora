import { BookOpen, BookPlus, Search, Sparkles, X } from 'lucide-react';
import { SEARCH_FILTERS, TRENDING_SEARCHES } from '../utils/bookSearch';
import BookCard from './BookCard';

function BookSkeletonCard() {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-[#0B1026]/75 p-4 animate-pulse">
      <div className="w-full h-48 rounded-xl bg-purple-950/50 mb-3.5" />
      <div className="space-y-2.5">
        <div className="h-4 bg-purple-900/50 rounded w-4/5" />
        <div className="h-3 bg-blue-900/40 rounded w-1/2" />
        <div className="flex gap-2 pt-2">
          <div className="h-5 bg-purple-950/60 rounded-md w-16" />
          <div className="h-5 bg-purple-950/60 rounded-md w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full-width Open Library Book Search Engine with filter tabs,
 * trending starter chips, and responsive 1-to-4 column book card grid.
 */
export default function BookSearchPanel({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onSearchSubmit,
  onTrendingClick,
  onOpenManualModal,
  books,
  totalFound,
  hasSearched,
  isLoading,
  error,
  selectedBook,
  onSelectBook,
}) {
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit(query, filter);
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-28 space-y-6">
      {/* Cosmic Search & Controls Card */}
      <div className="rounded-2xl border border-purple-500/30 bg-[#0B1026]/85 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-purple-950/50 space-y-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Explore the Literary Cosmos
            </h2>
            {hasSearched && !isLoading && !error && (
              <span className="text-xs font-medium text-purple-200 bg-purple-950/70 border border-purple-500/35 px-3 py-1 rounded-full">
                {totalFound > 0
                  ? `${books.length} of ${totalFound.toLocaleString()} results`
                  : '0 results'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300/85 mt-1">
            Search Indonesian and global catalogs via Google Books &amp; Open Library, then click any book to summon Velora AI.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleFormSubmit} className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={
                filter === 'title'
                  ? 'Search by book title (e.g., Bumi Manusia)...'
                  : filter === 'author'
                    ? 'Search by author (e.g., Haruki Murakami)...'
                    : 'Search books, authors, or topics...'
              }
              aria-label="Search books"
              className="w-full rounded-xl border border-purple-500/35 bg-[#070B1E]/90 pl-10 pr-9 py-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-purple-900/50 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-700/30 hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Filter Tabs + Trending Starter Chips + Manual Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Search filter"
              className="inline-flex self-start rounded-xl bg-[#070B1E]/90 p-1 border border-purple-500/30"
            >
              {SEARCH_FILTERS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onFilterChange(tab.id)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-pink-500/90 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onOpenManualModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-400/35 bg-purple-950/45 px-3 py-2 text-xs font-medium text-purple-100 hover:border-pink-400/60 hover:bg-purple-900/55 transition"
            >
              <BookPlus className="w-3.5 h-3.5 text-pink-300" />
              <span>+ Add Book Manually</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-pink-300 mr-1">
              <Sparkles className="w-3 h-3" />
              Trending:
            </span>
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onTrendingClick(term)}
                className="rounded-full border border-purple-400/30 bg-purple-950/50 px-3 py-1 text-xs font-medium text-purple-100 hover:border-pink-400/60 hover:bg-purple-900/60 transition"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div>
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-pink-500/40 bg-pink-950/40 backdrop-blur-md p-4 text-sm text-pink-100 flex items-start justify-between gap-3"
          >
            <div>
              <p className="font-semibold">Unable to load books</p>
              <p className="text-pink-200/90 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => onSearchSubmit(query, filter)}
              className="shrink-0 rounded-lg bg-pink-500/20 border border-pink-400/40 px-3 py-1.5 text-xs font-semibold text-pink-100 hover:bg-pink-500/30 transition"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <BookSkeletonCard key={idx} />
            ))}
          </div>
        )}

        {!isLoading && !error && !hasSearched && (
          <div className="rounded-2xl border border-purple-500/20 bg-[#0B1026]/55 backdrop-blur-md min-h-[280px] flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/25 via-purple-600/25 to-pink-500/25 border border-purple-400/35 flex items-center justify-center text-purple-200 mb-4 shadow-lg shadow-purple-950/60">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-editorial text-xl font-semibold text-slate-100">
              Your next favorite read orbits nearby
            </h3>
            <p className="text-sm text-slate-300/85 max-w-md mt-1.5 leading-relaxed">
              Type a book title or author above, or tap any trending chip like{' '}
              <button
                type="button"
                onClick={() => onTrendingClick('Laut Bercerita')}
                className="font-semibold text-pink-300 underline decoration-purple-400 underline-offset-4 hover:text-pink-200"
              >
                Laut Bercerita
              </button>{' '}
              to search Google Books &amp; Open Library and launch the Velora AI Astronaut.
            </p>
          </div>
        )}

        {!isLoading && !error && hasSearched && books.length === 0 && (
          <div className="rounded-2xl border border-purple-500/25 bg-[#0B1026]/75 p-8 text-center space-y-3">
            <div>
              <p className="font-editorial text-lg font-semibold text-slate-100">
                No matching books found
              </p>
              <p className="text-sm text-slate-300/80 mt-1">
                Try switching to the <span className="font-semibold text-purple-200">All</span> tab, or add the book &amp; blurb manually so Velora AI can still help.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenManualModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pink-400/40 bg-purple-950/60 px-4 py-2 text-xs font-semibold text-pink-100 hover:border-pink-400/70 hover:bg-purple-900/70 transition"
            >
              <BookPlus className="w-3.5 h-3.5 text-pink-300" />
              <span>+ Add Book Manually</span>
            </button>
          </div>
        )}

        {!isLoading && !error && books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isSelected={selectedBook?.id === book.id}
                onSelect={onSelectBook}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
