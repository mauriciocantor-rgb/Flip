import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadCard } from './components/UploadCard';
import { ViewerHeader } from './components/ViewerHeader';
import { FlipbookStage } from './components/FlipbookStage';
import { Toolbar } from './components/Toolbar';
import { ThumbsPanel } from './components/ThumbsPanel';
import { SearchModal } from './components/SearchModal';
import { DocumentData, PageFlipInstance } from './types';
import { exportStandaloneFlipbook } from './utils/exportFlipbook';
import { createSampleUtpDocument } from './utils/sampleDocument';

export default function App() {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isViewerActive, setIsViewerActive] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isThumbsOpen, setIsThumbsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const pageFlipRef = useRef<PageFlipInstance | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleProcessPdf = async (file: File) => {
    if (!file || file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }

    if (!window.pdfjsLib) {
      alert('La biblioteca PDF.js aún se está cargando. Por favor espera unos segundos y vuelve a intentarlo.');
      return;
    }

    setIsProcessing(true);
    setStatusText('Iniciando lectura del documento PDF…');
    setProgressPercent(5);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);

      const totalPaginas = pdf.numPages;
      const pages = [];
      const texts = [];
      const resolutions = [];

      const baseScale = 2.0;

      for (let i = 1; i <= totalPaginas; i++) {
        setStatusText(`Convirtiendo página ${i} de ${totalPaginas}…`);
        setProgressPercent(Math.round(((i - 1) / totalPaginas) * 90) + 5);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: baseScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          pages.push({
            src: canvas.toDataURL('image/jpeg', 0.92),
            w: viewport.width,
            h: viewport.height
          });
          resolutions.push(baseScale);
        }

        try {
          const textContent = await page.getTextContent();
          texts.push(textContent.items.map((it: any) => it.str).join(' ').toLowerCase());
        } catch (e) {
          texts.push('');
        }
      }

      setProgressPercent(100);
      setStatusText('Generando visor interactivo…');

      const docData: DocumentData = {
        file,
        name: file.name,
        totalPages: pages.length,
        pages,
        texts,
        resolutions
      };

      setDocumentData(docData);
      setCurrentPage(1);
      setZoom(1.0);
      setIsViewerActive(true);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error al procesar el PDF:', err);
      alert(`Ocurrió un error al procesar el PDF: ${err?.message || 'Error desconocido'}. Intenta con otro archivo.`);
      setIsProcessing(false);
      setProgressPercent(0);
      setStatusText('');
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setStatusText('Cargando publicación institucional UTP de demostración…');
    setProgressPercent(40);

    setTimeout(() => {
      const sampleDoc = createSampleUtpDocument();
      setDocumentData(sampleDoc);
      setPdfDoc(null);
      setCurrentPage(1);
      setZoom(1.0);
      setProgressPercent(100);
      setIsViewerActive(true);
      setIsProcessing(false);
    }, 200);
  };

  const handleCloseViewer = () => {
    setIsViewerActive(false);
    setIsThumbsOpen(false);
    setIsSearchOpen(false);
    setDocumentData(null);
    setPdfDoc(null);
    setZoom(1.0);
    setCurrentPage(1);
    if (pageFlipRef.current) {
      try {
        pageFlipRef.current.destroy();
      } catch (e) {}
      pageFlipRef.current = null;
    }
  };

  const handleResolutionUpdated = (pageIndex: number, newSrc: string, newScale: number) => {
    setDocumentData((prev) => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      if (updatedPages[pageIndex]) {
        updatedPages[pageIndex] = {
          ...updatedPages[pageIndex],
          src: newSrc
        };
      }
      const updatedResolutions = [...prev.resolutions];
      updatedResolutions[pageIndex] = newScale;
      return {
        ...prev,
        pages: updatedPages,
        resolutions: updatedResolutions
      };
    });
  };

  const handlePrevPage = () => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipPrev();
    }
  };

  const handleNextPage = () => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipNext();
    }
  };

  const handleFirstPage = () => {
    if (pageFlipRef.current) {
      pageFlipRef.current.turnToPage(0);
    }
  };

  const handleLastPage = () => {
    if (pageFlipRef.current && documentData) {
      pageFlipRef.current.turnToPage(documentData.pages.length - 1);
    }
  };

  const handleJumpToPage = (pageNum: number) => {
    if (pageFlipRef.current && documentData) {
      const targetIdx = Math.max(0, Math.min(pageNum - 1, documentData.pages.length - 1));
      pageFlipRef.current.turnToPage(targetIdx);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.0, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.6, +(prev - 0.25).toFixed(2)));
  };

  const handleDownloadOriginal = () => {
    if (!documentData) return;
    const url = URL.createObjectURL(documentData.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentData.name || 'documento.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleDownloadStandalone = () => {
    if (!documentData) return;
    exportStandaloneFlipbook(
      documentData.name,
      documentData.name,
      documentData.pages,
      documentData.texts
    );
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (viewerContainerRef.current) {
        viewerContainerRef.current.requestFullscreen?.();
      } else {
        document.documentElement.requestFullscreen?.();
      }
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#f4f6fa] text-[#16202e]">
      {/* Normal Landing State */}
      {!isViewerActive && (
        <>
          <Header />
          <main className="w-full max-w-[960px] px-4 py-8 sm:py-12 flex flex-col items-center flex-1">
            <UploadCard
              onFileSelected={handleProcessPdf}
              onLoadSample={handleLoadSample}
              isProcessing={isProcessing}
              statusText={statusText}
              progressPercent={progressPercent}
            />
          </main>
          <footer className="w-full text-center py-5 px-4 text-xs text-[#5b6b81] border-t border-[#dfe4ec] mt-auto">
            Herramienta interna · Biblioteca e Información Científica (BIC) · Universidad Tecnológica de Pereira
          </footer>
        </>
      )}

      {/* Fullscreen Interactive Flipbook Viewer */}
      {isViewerActive && documentData && (
        <div
          ref={viewerContainerRef}
          id="viewerSection"
          className="fixed inset-0 z-50 flex flex-col viewer-bg overflow-hidden text-white"
        >
          {/* Top Bar with brand and exit */}
          <ViewerHeader
            documentTitle={documentData.name}
            onCloseViewer={handleCloseViewer}
          />

          {/* Interactive Flipbook Stage */}
          <FlipbookStage
            pages={documentData.pages}
            zoom={zoom}
            onPageChange={(p) => setCurrentPage(p)}
            pageFlipRef={pageFlipRef}
            pdfDoc={pdfDoc}
            resolutions={documentData.resolutions}
            onResolutionUpdated={handleResolutionUpdated}
          />

          {/* Bottom Floating Toolbar */}
          <Toolbar
            currentPage={currentPage}
            totalPages={documentData.totalPages}
            zoom={zoom}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onFirstPage={handleFirstPage}
            onLastPage={handleLastPage}
            onJumpToPage={handleJumpToPage}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleThumbs={() => setIsThumbsOpen((prev) => !prev)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onDownloadOriginal={handleDownloadOriginal}
            onDownloadStandalone={handleDownloadStandalone}
            onToggleFullscreen={handleToggleFullscreen}
            isFullscreen={isFullscreen}
          />

          {/* Side Thumbnails Drawer */}
          <ThumbsPanel
            isOpen={isThumbsOpen}
            onClose={() => setIsThumbsOpen(false)}
            pages={documentData.pages}
            currentPage={currentPage}
            onSelectPage={(idx) => handleJumpToPage(idx + 1)}
          />

          {/* Search Dialog */}
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            texts={documentData.texts}
            currentPage={currentPage}
            onJumpToPage={(p) => handleJumpToPage(p)}
          />
        </div>
      )}
    </div>
  );
}
