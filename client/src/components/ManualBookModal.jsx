import { useEffect, useState } from 'react';
import { BookPlus, Sparkles, X } from 'lucide-react';

/**
 * Glassmorphic cosmic modal allowing users to manually supply a book title, author,
 * and pasted blurb/synopsis so Velora AI can analyze local/indie books without hallucinating.
 */
export default function ManualBookModal({ isOpen, initialTitle = '', onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [blurb, setBlurb] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle.trim());
      setAuthor('');
      setBlurb('');
      setFormError('');
    }
  }, [isOpen, initialTitle]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Please enter a book title.');
      return;
    }

    const cleanAuthor = author.trim();
    const cleanBlurb = blurb.trim();

    onSubmit({
      id: `manual-${Date.now()}`,
      key: '',
      title: cleanTitle,
      authors: cleanAuthor ? [cleanAuthor] : [],
      firstPublishYear: null,
      coverId: null,
      coverUrl: null,
      subjects: ['Custom Book'],
      description: cleanBlurb || null,
      firstSentence: null,
      editionCount: null,
      source: 'manual',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-book-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[#0B1026]/95 backdrop-blur-xl border border-purple-500/40 shadow-2xl shadow-purple-950/80 overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-purple-500/25 bg-gradient-to-r from-blue-950/60 via-purple-950/50 to-pink-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 text-white shadow-md">
              <BookPlus className="w-4 h-4" />
            </span>
            <div>
              <h3 id="manual-book-title" className="font-editorial text-base font-semibold text-white">
                Add Book Manually
              </h3>
              <p className="text-[11px] text-purple-200/80">
                Paste a blurb or synopsis for grounded Velora AI insights
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual book modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-400/25 bg-[#070B1E]/70 text-slate-300 hover:text-white hover:border-pink-400/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {formError && (
            <p className="text-xs text-pink-200 bg-pink-950/50 border border-pink-500/40 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div>
            <label htmlFor="manual-title" className="block text-xs font-semibold text-purple-200 mb-1">
              Book Title <span className="text-pink-400">*</span>
            </label>
            <input
              id="manual-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="e.g., Laut Bercerita or an indie title"
              className="w-full rounded-xl border border-purple-500/35 bg-[#070B1E] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
            />
          </div>

          <div>
            <label htmlFor="manual-author" className="block text-xs font-semibold text-purple-200 mb-1">
              Author
            </label>
            <input
              id="manual-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., Leila S. Chudori"
              className="w-full rounded-xl border border-purple-500/35 bg-[#070B1E] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
            />
          </div>

          <div>
            <label htmlFor="manual-blurb" className="block text-xs font-semibold text-purple-200 mb-1">
              Paste Blurb / Synopsis
            </label>
            <textarea
              id="manual-blurb"
              rows={4}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="Paste the back-cover blurb or short synopsis here so Velora AI can analyze its vibe without guessing..."
              className="w-full rounded-xl border border-purple-500/35 bg-[#070B1E] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-purple-500/30 bg-[#070B1E] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-700/30 hover:brightness-110 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Set Active &amp; Ask Velora AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
