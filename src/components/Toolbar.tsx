import React, { useState, useEffect } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Search,
  Download,
  Share2,
  Maximize,
  Minimize,
  LayoutGrid
} from 'lucide-react';

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onJumpToPage: (pageNum: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleThumbs: () => void;
  onOpenSearch: () => void;
  onDownloadOriginal: () => void;
  onDownloadStandalone: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentPage,
  totalPages,
  zoom,
  onPrevPage,
  onNextPage,
  onFirstPage,
  onLastPage,
  onJumpToPage,
  onZoomIn,
  onZoomOut,
  onToggleThumbs,
  onOpenSearch,
  onDownloadOriginal,
  onDownloadStandalone,
  onToggleFullscreen,
  isFullscreen
}) => {
  const [inputValue, setInputValue] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(inputValue, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        onJumpToPage(pageNum);
      } else {
        setInputValue(String(currentPage));
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 flex items-center gap-1 sm:gap-1.5 bg-[#061633]/90 border border-white/15 rounded-full px-2.5 sm:px-3 py-1.5 backdrop-blur-md shadow-2xl max-w-[calc(100vw-20px)] overflow-x-auto z-40">
      {/* Miniaturas */}
      <button
        id="thumbsBtn"
        onClick={onToggleThumbs}
        title="Miniaturas de páginas"
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 cursor-pointer"
      >
        <LayoutGrid className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      <div className="w-[1px] h-5 bg-white/15 mx-0.5 sm:mx-1 shrink-0" />

      {/* Zoom Out */}
      <button
        id="zoomOutBtn"
        onClick={onZoomOut}
        title="Alejar (-)"
        disabled={zoom <= 0.6}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Primera página */}
      <button
        id="firstPageBtn"
        onClick={onFirstPage}
        title="Primera página"
        disabled={currentPage <= 1}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ChevronsLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Anterior */}
      <button
        id="prevPageBtn"
        onClick={onPrevPage}
        title="Página anterior"
        disabled={currentPage <= 1}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Indicador de página editable */}
      <div className="flex items-center gap-1 text-[#eef3ff] text-xs sm:text-sm px-1 shrink-0 whitespace-nowrap">
        <input
          id="pageInput"
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => setInputValue(String(currentPage))}
          className="w-7 sm:w-9 text-center bg-white/10 border border-white/20 rounded px-1 py-0.5 text-[#fff] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#F2A900]"
          title="Escribe un número de página y presiona Enter"
        />
        <span className="text-white/40">/</span>
        <span id="pageTotal" className="text-[#93a7cf]">
          {totalPages}
        </span>
      </div>

      {/* Siguiente */}
      <button
        id="nextPageBtn"
        onClick={onNextPage}
        title="Página siguiente"
        disabled={currentPage >= totalPages}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Última página */}
      <button
        id="lastPageBtn"
        onClick={onLastPage}
        title="Última página"
        disabled={currentPage >= totalPages}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ChevronsRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Zoom In */}
      <button
        id="zoomInBtn"
        onClick={onZoomIn}
        title="Acercar (+)"
        disabled={zoom >= 3.0}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
      >
        <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      <div className="w-[1px] h-5 bg-white/15 mx-0.5 sm:mx-1 shrink-0" />

      {/* Buscar texto */}
      <button
        id="searchBtn"
        onClick={onOpenSearch}
        title="Buscar texto en el documento"
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 cursor-pointer"
      >
        <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Descargar PDF Original */}
      <button
        id="downloadBtn"
        onClick={onDownloadOriginal}
        title="Descargar PDF original"
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Descargar flipbook para compartir (.html autocontenido) */}
      <button
        id="downloadFlipBtn"
        onClick={onDownloadStandalone}
        title="Descargar flipbook HTML para compartir sin conexión"
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-[#eef3ff] hover:bg-white/15 active:bg-white/25 transition-colors shrink-0 cursor-pointer"
      >
        <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Pantalla completa (Gold Round Accent) */}
      <button
        id="fullscreenBtn"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center bg-[#F2A900] hover:bg-[#ffb81c] active:bg-[#d99400] text-[#00204A] font-bold shadow-md transition-all shrink-0 cursor-pointer"
      >
        {isFullscreen ? (
          <Minimize className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
        ) : (
          <Maximize className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
};
