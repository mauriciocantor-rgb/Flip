import React, { useEffect, useRef } from 'react';
import { PageImage } from '../types';
import { X } from 'lucide-react';

interface ThumbsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageImage[];
  currentPage: number;
  onSelectPage: (pageIndex: number) => void;
}

export const ThumbsPanel: React.FC<ThumbsPanelProps> = ({
  isOpen,
  onClose,
  pages,
  currentPage,
  onSelectPage
}) => {
  const currentThumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentThumbRef.current) {
      currentThumbRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        id="thumbsBackdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Side Drawer */}
      <div
        id="thumbsPanel"
        className="fixed top-0 bottom-0 left-0 w-40 sm:w-44 max-w-[80vw] bg-[#041026]/95 border-r border-white/15 p-4 overflow-y-auto flex flex-col gap-3 z-50 shadow-2xl animate-in slide-in-from-left duration-150"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Páginas ({pages.length})
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 pb-20">
          {pages.map((page, index) => {
            const isCurrent = index === currentPage - 1;
            return (
              <div
                key={index}
                ref={isCurrent ? currentThumbRef : null}
                onClick={() => {
                  onSelectPage(index);
                  onClose();
                }}
                className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-150 border-2 bg-white ${
                  isCurrent
                    ? 'border-[#F2A900] ring-2 ring-[#F2A900]/40 shadow-lg scale-[1.02]'
                    : 'border-transparent hover:border-white/40 opacity-85 hover:opacity-100'
                }`}
              >
                <img
                  src={page.src}
                  alt={`Miniatura página ${index + 1}`}
                  className="w-full h-auto block select-none pointer-events-none"
                  loading="lazy"
                />
                <span
                  className={`absolute bottom-1 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${
                    isCurrent
                      ? 'bg-[#F2A900] text-[#00204A]'
                      : 'bg-black/60 text-white'
                  }`}
                >
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
