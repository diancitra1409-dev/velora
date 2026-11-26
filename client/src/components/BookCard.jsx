import { BookOpenCheck, Calendar, User } from 'lucide-react';
import BookCover from './BookCover';

/**
 * Interactive book card for the expanded cosmic grid, displaying Open Library metadata
 * and active chat-context selection state.
 */
export default function BookCard({ book, isSelected, onSelect }) {
  const primaryAuthor = book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author';

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      aria-pressed={isSelected}
      className={`group w-full h-full text-left rounded-2xl border p-4 flex flex-col transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
        isSelected
          ? 'border-pink-400/80 bg-gradient-to-b from-purple-900/50 via-[#0F173A]/95 to-[#0B1026]/95 shadow-xl shadow-pink-500/15 ring-1 ring-pink-400/40'
          : 'border-purple-500/25 bg-[#0B1026]/80 backdrop-blur-md hover:border-purple-400/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-950/60'
      }`}
    >
      {/* Cover showcase stage */}
      <div className="relative w-full rounded-xl bg-gradient-to-br from-blue-950/60 via-purple-950/40 to-pink-950/30 border border-purple-500/20 py-4 px-3 flex items-center justify-center mb-3.5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(168,85,247,0.22),transparent_65%)] pointer-events-none" />
        <div className="relative transition-transform duration-300 group-hover:scale-[1.03]">
          <BookCover
            coverUrl={book.coverUrl}
            title={book.title}
            author={book.authors[0]}
            size="lg"
          />
        </div>

        {isSelected && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-md shadow-pink-500/30">
            <BookOpenCheck className="w-3 h-3" />
            Active
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <h3
          className={`font-editorial font-semibold text-base leading-snug line-clamp-2 transition-colors ${
            isSelected ? 'text-pink-100' : 'text-slate-100 group-hover:text-purple-200'
          }`}
        >
          {book.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 shrink-0 text-pink-400" />
            <span className="truncate font-medium text-slate-200">{primaryAuthor}</span>
          </span>
          {book.firstPublishYear && (
            <span className="inline-flex items-center gap-1 shrink-0 text-blue-300/90">
              <Calendar className="w-3 h-3 text-blue-400" />
              {book.firstPublishYear}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2">
          {book.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {book.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="inline-block max-w-[140px] truncate rounded-md bg-purple-950/60 border border-purple-500/25 px-2 py-0.5 text-[11px] font-medium text-purple-200"
                >
                  {subject}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Click to ask Velora AI about this book
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
