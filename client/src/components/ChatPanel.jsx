import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  BookMarked,
  Compass,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import AstronautIcon from './AstronautIcon';
import BookCover from './BookCover';

export const BOOK_PROMPT_CHIPS = [
  'Ringkasan & Vibe (No Spoiler)',
  'Cocok untuk siapa?',
  '3 Buku Mirip Ini',
];

const GENERAL_PROMPT_CHIPS = [
  'Rekomendasi buku filsafat praktis untuk pemula',
  '3 novel sastra dengan atmosfer hangat & reflektif',
  'Suggest a page-turner non-fiction on habits or creativity',
];

/**
 * Lightweight, safe inline formatter for assistant prose (bold, bullets, paragraphs).
 */
function FormattedMessage({ text }) {
  const lines = text.split('\n');

  const renderInline = (line) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-200">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }
        if (/^[-*•]\s+/.test(line)) {
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <span className="text-pink-400 font-bold select-none">•</span>
              <span>{renderInline(line.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(line)) {
          const match = line.match(/^(\d+\.)\s+(.*)$/);
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <span className="font-semibold text-blue-300 shrink-0">{match?.[1]}</span>
              <span>{renderInline(match?.[2] || line)}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/**
 * Floating Astronaut Launcher Button + Expandable Cosmic Glassmorphic Chat Popup.
 */
export default function ChatPanel({
  isOpen,
  onToggle,
  onClose,
  selectedBook,
  onClearBook,
  messages,
  input,
  onInputChange,
  onSendMessage,
  isGenerating,
  error,
  onRetryLast,
  onResetChat,
}) {
  const scrollEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isGenerating) {
        onSendMessage(input);
      }
    }
  };

  const activeChips = selectedBook ? BOOK_PROMPT_CHIPS : GENERAL_PROMPT_CHIPS;

  return (
    <>
      {/* Expandable Cosmic Chat Popup */}
      <aside
        aria-label="Velora AI Astronaut Chat"
        aria-hidden={!isOpen}
        className={`fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[410px] h-[540px] max-h-[78vh] rounded-2xl bg-[#0B1026]/95 backdrop-blur-xl border border-purple-500/35 shadow-2xl shadow-purple-950/70 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Chat Header + Active Book Banner */}
        <div className="p-3.5 sm:p-4 border-b border-purple-500/25 bg-gradient-to-r from-blue-950/60 via-purple-950/50 to-pink-950/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AstronautIcon className="w-11 h-11 shrink-0" isThinking={isGenerating} />
              <div>
                <h2 className="font-editorial text-base font-semibold text-white leading-tight">
                  Velora AI
                </h2>
                <p className="text-[11px] text-purple-200/80">
                  {selectedBook
                    ? 'Book-aware context · ID & EN'
                    : 'Cosmic discovery · ID & EN'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={onResetChat}
                  title="New chat"
                  aria-label="Reset conversation"
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-400/25 bg-purple-950/60 px-2 py-1.5 text-[11px] font-medium text-purple-100 hover:bg-purple-900/70 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Minimize Velora AI chat"
                title="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-400/25 bg-[#070B1E]/70 text-slate-300 hover:text-white hover:border-pink-400/50 hover:bg-purple-900/50 transition text-lg leading-none"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>

          {/* Compact Active Book Banner */}
          {selectedBook ? (
            <div className="rounded-xl border border-pink-400/35 bg-purple-950/55 p-2 flex items-center gap-2.5">
              <BookCover
                coverUrl={selectedBook.coverUrl}
                title={selectedBook.title}
                author={selectedBook.authors[0]}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <BookMarked className="w-3 h-3 text-pink-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                    Active Book
                  </span>
                </div>
                <p className="font-editorial font-semibold text-xs sm:text-sm text-white truncate">
                  {selectedBook.title}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {selectedBook.authors.length > 0
                    ? selectedBook.authors.join(', ')
                    : 'Unknown Author'}
                  {selectedBook.firstPublishYear ? ` · ${selectedBook.firstPublishYear}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClearBook}
                aria-label="Clear selected book and return to general book-discovery chat"
                title="Clear selection"
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-purple-400/30 bg-[#070B1E]/80 px-2 py-1 text-[11px] font-semibold text-purple-100 hover:border-pink-400/60 hover:text-white transition"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/25 bg-[#070B1E]/70 px-3 py-2 flex items-center gap-2 text-[11px] text-slate-300">
              <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                Click any book card to unlock book-specific prompts, or ask for recommendations.
              </span>
            </div>
          )}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full min-h-[170px] flex flex-col justify-center items-center text-center px-3 py-4">
              <p className="font-editorial text-base font-semibold text-slate-100">
                {selectedBook
                  ? `Ask anything about "${selectedBook.title}"`
                  : 'Ready to chart your next read?'}
              </p>
              <p className="text-xs text-slate-300/85 max-w-xs mt-1.5 leading-relaxed">
                {selectedBook
                  ? 'Tap a quick prompt below or ask your own question in Indonesian or English.'
                  : 'Ask for book recommendations by mood or topic in Indonesian or English.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
                      isUser
                        ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-950/50 rounded-br-sm'
                        : 'bg-[#11193A]/90 border border-purple-500/25 text-slate-200 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      <div className="space-y-1.5">
                        <FormattedMessage text={msg.text} />
                        {msg.modelUsed && (
                          <p className="text-[10px] text-purple-300/70 pt-1 border-t border-purple-500/20">
                            Answered via {msg.modelUsed}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-purple-500/25 bg-[#11193A]/90 px-3.5 py-2.5 flex items-center gap-2 text-xs font-medium text-purple-200">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" />
                </span>
                <span>Velora is thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-pink-500/40 bg-pink-950/45 p-3 text-xs text-pink-100 flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {onRetryLast && (
                <button
                  type="button"
                  onClick={onRetryLast}
                  className="shrink-0 rounded-lg bg-pink-500/20 border border-pink-400/40 px-2.5 py-1 text-[11px] font-semibold text-pink-100 hover:bg-pink-500/30 transition"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Prompt Chips + Composer */}
        <div className="p-3 sm:p-3.5 border-t border-purple-500/25 bg-[#070B1E]/90 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isGenerating}
                onClick={() => onSendMessage(chip)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-45 ${
                  selectedBook
                    ? 'border-pink-400/35 bg-purple-900/45 text-pink-100 hover:border-pink-400/70 hover:bg-purple-800/60'
                    : 'border-purple-500/30 bg-[#101736] text-purple-100 hover:border-blue-400/60 hover:bg-purple-900/50'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedBook
                  ? `Ask about "${selectedBook.title}" (ID / EN)...`
                  : 'Ask Velora AI (ID / EN)...'
              }
              aria-label="Message Velora AI"
              className="flex-1 resize-none rounded-xl border border-purple-500/35 bg-[#0B1026] px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition max-h-28"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              aria-label="Send message"
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-700/40 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Floating Astronaut Mascot Launcher (no solid container box) */}
      <div className="fixed bottom-6 right-6 z-50 group flex items-center">
        {!isOpen && (
          <div
            role="tooltip"
            className="pointer-events-none mr-2.5 rounded-full border border-purple-400/40 bg-[#0B1026]/95 px-3 py-1.5 text-xs font-medium text-purple-100 shadow-lg shadow-purple-950/70 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap"
          >
            Chat with Velora AI
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close Velora AI chat' : 'Chat with Velora AI'}
          className="relative flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 rounded-full"
        >
          <AstronautIcon
            className="w-16 h-16 sm:w-[70px] sm:h-[70px]"
            isThinking={isGenerating}
          />

          {/* Glowing pink notification dot when closed and a book is selected */}
          {!isOpen && selectedBook && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500 ring-2 ring-[#050816] shadow-[0_0_12px_#ec4899]" />
            </span>
          )}
        </button>
      </div>
    </>
  );
}
