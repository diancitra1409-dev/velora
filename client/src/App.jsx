import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenText, Sparkles } from 'lucide-react';
import BookSearchPanel from './components/BookSearchPanel';
import ChatPanel from './components/ChatPanel';
import ManualBookModal from './components/ManualBookModal';
import MeteorShower from './components/MeteorShower';
import {
  buildHttpErrorFromResponse,
  parseFriendlyError,
} from './utils/errorParser';
import { searchBooks } from './utils/bookSearch';

const GENERAL_THREAD_KEY = '__general__';

export default function App() {
  // Search state
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [books, setBooks] = useState([]);
  const [totalFound, setTotalFound] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Active book & floating chat state
  const [selectedBook, setSelectedBook] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [threads, setThreads] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');

  const searchAbortRef = useRef(null);

  const activeThreadKey = selectedBook ? selectedBook.id : GENERAL_THREAD_KEY;
  const activeMessages = threads[activeThreadKey] || [];

  const runSearch = useCallback(async (searchQuery, searchFilter) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const result = await searchBooks({
        query: trimmed,
        filter: searchFilter,
        signal: controller.signal,
      });
      setBooks(result.books);
      setTotalFound(result.totalFound);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setSearchError(
        parseFriendlyError(err, 'Could not fetch books from Google Books or Open Library. Please try again.')
      );
      setBooks([]);
      setTotalFound(0);
    } finally {
      if (searchAbortRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    if (query.trim()) {
      runSearch(query, nextFilter);
    }
  };

  const handleTrendingClick = (term) => {
    setQuery(term);
    setFilter('all');
    runSearch(term, 'all');
  };

  const handleSelectBook = (book) => {
    setSelectedBook((prev) => (prev?.id === book.id ? prev : book));
    setChatError('');
    setLastFailedPrompt('');
    // Automatically summon the Floating Astronaut Chat Popup on book selection
    setIsChatOpen(true);
  };

  const handleManualBookSubmit = (manualBook) => {
    setIsManualModalOpen(false);
    handleSelectBook(manualBook);
  };

  const handleClearBook = () => {
    setSelectedBook(null);
    setChatError('');
    setLastFailedPrompt('');
  };

  const handleResetChat = () => {
    setThreads((prev) => ({
      ...prev,
      [activeThreadKey]: [],
    }));
    setChatError('');
    setLastFailedPrompt('');
  };

  const sendChatMessage = async (rawText, { skipAppendUser = false } = {}) => {
    const text = rawText.trim();
    if (!text || isGenerating) return;

    const threadKey = selectedBook ? selectedBook.id : GENERAL_THREAD_KEY;
    const currentHistory = threads[threadKey] || [];

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    const updatedMessages = skipAppendUser ? currentHistory : [...currentHistory, userMsg];

    if (!skipAppendUser) {
      setThreads((prev) => ({
        ...prev,
        [threadKey]: updatedMessages,
      }));
      setChatInput('');
    }

    setIsGenerating(true);
    setChatError('');
    setLastFailedPrompt('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: (skipAppendUser ? currentHistory.slice(0, -1) : currentHistory)
            .slice(-4)
            .map((m) => ({ role: m.role, text: m.text })),
          book: selectedBook
            ? {
                title: selectedBook.title,
                authors: selectedBook.authors,
                firstPublishYear: selectedBook.firstPublishYear,
                subjects: Array.isArray(selectedBook.subjects)
                  ? selectedBook.subjects.slice(0, 5)
                  : [],
                description: selectedBook.description
                  ? selectedBook.description.slice(0, 600)
                  : null,
                firstSentence: selectedBook.firstSentence
                  ? selectedBook.firstSentence.slice(0, 600)
                  : null,
              }
            : null,
        }),
      });

      if (!response.ok) {
        throw await buildHttpErrorFromResponse(response);
      }

      const payload = await response.json();

      const assistantMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: payload.reply || 'I could not generate a response for that question.',
        modelUsed: payload.model || null,
      };

      setThreads((prev) => ({
        ...prev,
        [threadKey]: [...updatedMessages, assistantMsg],
      }));
    } catch (err) {
      setChatError(
        parseFriendlyError(err, 'Something went wrong while contacting Velora AI.')
      );
      setLastFailedPrompt(text);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryLast = () => {
    if (!lastFailedPrompt) return;
    sendChatMessage(lastFailedPrompt, { skipAppendUser: true });
  };

  return (
    <div className="relative min-h-screen flex flex-col cosmic-bg text-slate-100">
      {/* Decorative non-blocking shooting stars & twinkling stars */}
      <MeteorShower />

      {/* Cosmic Top Bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-purple-500/25 bg-[#070B1E]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-700/40 relative">
              <BookOpenText className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-pink-400 ring-2 ring-[#070B1E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-editorial text-xl font-bold tracking-tight text-white">
                  Velora
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-purple-950/70 border border-purple-400/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-200">
                  <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                  Literary AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300/80 hidden sm:block">
                Hybrid Book Search &amp; Cosmic Reading Companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden md:inline-block rounded-full bg-[#0B1026]/90 border border-purple-500/30 px-3 py-1 font-medium text-purple-200">
              Google Books · Open Library · Gemini
            </span>
          </div>
        </div>
      </header>

      {/* Full-Width Book Search Content */}
      <main className="relative z-10 flex-1">
        <BookSearchPanel
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={handleFilterChange}
          onSearchSubmit={runSearch}
          onTrendingClick={handleTrendingClick}
          onOpenManualModal={() => setIsManualModalOpen(true)}
          books={books}
          totalFound={totalFound}
          hasSearched={hasSearched}
          isLoading={isSearching}
          error={searchError}
          selectedBook={selectedBook}
          onSelectBook={handleSelectBook}
        />
      </main>

      {/* Manual Book / Blurb Input Modal */}
      <ManualBookModal
        isOpen={isManualModalOpen}
        initialTitle={query}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualBookSubmit}
      />

      {/* Floating Astronaut Chat Widget */}
      <ChatPanel
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((prev) => !prev)}
        onClose={() => setIsChatOpen(false)}
        selectedBook={selectedBook}
        onClearBook={handleClearBook}
        messages={activeMessages}
        input={chatInput}
        onInputChange={setChatInput}
        onSendMessage={(text) => sendChatMessage(text)}
        isGenerating={isGenerating}
        error={chatError}
        onRetryLast={lastFailedPrompt ? handleRetryLast : null}
        onResetChat={handleResetChat}
      />
    </div>
  );
}
