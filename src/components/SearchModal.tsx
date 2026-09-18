import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { SearchMatch } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  texts: string[];
  currentPage: number;
  onJumpToPage: (pageNumber: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  texts,
  currentPage,
  onJumpToPage
}) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setMatches([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      setMatches([]);
      setHasSearched(false);
      return;
    }

    const results: SearchMatch[] = [];
    texts.forEach((text, idx) => {
      if (!text) return;
      const matchIndex = text.indexOf(cleanQuery);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 35);
        const end = Math.min(text.length, matchIndex + cleanQuery.length + 45);
        const rawSnippet = text.substring(start, end).replace(/\s+/g, ' ');
        results.push({
          pageIndex: idx,
          pageNumber: idx + 1,
          snippet: (start > 0 ? '…' : '') + rawSnippet + (end < text.length ? '…' : '')
        });
      }
    });

    setMatches(results);
    setHasSearched(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-[480px] bg-[#07193b] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header with Search Input */}
        <form onSubmit={handleSearch} className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#F2A900] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar palabras o frases en el PDF…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setMatches([]);
                setHasSearched(false);
                inputRef.current?.focus();
              }}
              className="text-white/40 hover:text-white/80 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002d7a] text-xs font-semibold rounded-lg text-white transition-colors"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        {/* Results Area */}
        <div className="max-h-[360px] overflow-y-auto p-3 flex flex-col gap-2">
          {hasSearched && matches.length === 0 && (
            <div className="py-8 text-center text-white/60 flex flex-col items-center gap-2 text-xs">
              <AlertCircle className="w-6 h-6 text-white/30" />
              <span>No se encontraron coincidencias para "{query}"</span>
            </div>
          )}

          {!hasSearched && (
            <div className="py-6 text-center text-white/40 text-xs">
              Escribe un término y presiona Enter o "Buscar" para explorar el documento.
            </div>
          )}

          {matches.map((m) => {
            const isCurrent = m.pageNumber === currentPage;
            return (
              <div
                key={m.pageIndex}
                onClick={() => {
                  onJumpToPage(m.pageNumber);
                  onClose();
                }}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  isCurrent
                    ? 'bg-blue-950/60 border-[#F2A900]/60 ring-1 ring-[#F2A900]/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="shrink-0 inline-flex items-center gap-1 bg-[#F2A900] text-[#00204A] text-[11px] font-bold px-2 py-0.5 rounded-md mt-0.5">
                    <FileText className="w-3 h-3" />
                    Pág. {m.pageNumber}
                  </span>
                  <p className="text-xs text-[#dce6fb] leading-relaxed line-clamp-2">
                    {m.snippet}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 shrink-0 mt-1" />
              </div>
            );
          })}
        </div>

        {matches.length > 0 && (
          <div className="p-3 bg-black/20 border-t border-white/10 text-[11px] text-white/50 text-center">
            Se encontraron {matches.length} coincidencia{matches.length > 1 ? 's' : ''} en el documento
          </div>
        )}
      </div>
    </div>
  );
};
