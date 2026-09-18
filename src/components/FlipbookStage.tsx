import React, { useEffect, useRef } from 'react';
import { PageImage, PageFlipInstance } from '../types';

interface FlipbookStageProps {
  pages: PageImage[];
  zoom: number;
  onPageChange: (newPage: number) => void;
  pageFlipRef: React.MutableRefObject<PageFlipInstance | null>;
  pdfDoc: any;
  resolutions: number[];
  onResolutionUpdated: (pageIndex: number, newSrc: string, newScale: number) => void;
}

export const FlipbookStage: React.FC<FlipbookStageProps> = ({
  pages,
  zoom,
  onPageChange,
  pageFlipRef,
  pdfDoc,
  resolutions,
  onResolutionUpdated
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isConstructingRef = useRef(false);

  const calculateDimensions = () => {
    const firstPage = pages[0];
    const proportion = firstPage && firstPage.w > 0 ? firstPage.h / firstPage.w : 1.33;
    const isMobile = window.innerWidth < 480;
    const marginH = isMobile ? 24 : 60;
    const marginV = isMobile ? 140 : 170;

    const maxBookWidth = isMobile ? window.innerWidth - marginH : Math.min(window.innerWidth - marginH, 520);
    const maxBookHeight = window.innerHeight - marginV;

    const widthFit = Math.max(220, Math.min(maxBookWidth, maxBookHeight / proportion));
    const finalWidth = Math.round(widthFit * zoom);
    const finalHeight = Math.round(finalWidth * proportion);

    return { width: finalWidth, height: finalHeight, proportion };
  };

  const ensureHighResPage = async (pageIdx: number, zoomLevel: number) => {
    if (!pdfDoc || pageIdx < 0 || pageIdx >= pages.length) return;
    const targetScale = Math.min(2.0 * zoomLevel, 4.2);
    const currentScale = resolutions[pageIdx] || 2.0;
    if (currentScale >= targetScale - 0.15) return;

    try {
      const page = await pdfDoc.getPage(pageIdx + 1);
      const viewport = page.getViewport({ scale: targetScale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const newSrc = canvas.toDataURL('image/jpeg', 0.95);

      onResolutionUpdated(pageIdx, newSrc, targetScale);

      // Also update directly in current DOM without destroying the flipbook
      if (wrapRef.current) {
        const imgs = wrapRef.current.querySelectorAll('.page img');
        if (imgs[pageIdx]) {
          (imgs[pageIdx] as HTMLImageElement).src = newSrc;
        }
      }
    } catch (e) {
      console.warn('No se pudo re-renderizar la página a mayor resolución:', e);
    }
  };

  const buildFlipbook = (targetPageToRestore?: number) => {
    if (!wrapRef.current || isConstructingRef.current || pages.length === 0) return;
    if (!window.St || !window.St.PageFlip) {
      console.warn('Librería St.PageFlip aún no disponible.');
      return;
    }

    isConstructingRef.current = true;

    // Destroy previous instance
    if (pageFlipRef.current) {
      try {
        pageFlipRef.current.destroy();
      } catch (e) {
        console.warn('Error al destruir instancia de flipbook previa:', e);
      }
      pageFlipRef.current = null;
    }

    // Clean DOM
    wrapRef.current.innerHTML = '';
    const bookEl = document.createElement('div');
    bookEl.id = 'flipbook';
    wrapRef.current.appendChild(bookEl);

    // Append pages
    pages.forEach((page, i) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      pageDiv.setAttribute('data-page-index', String(i));
      const img = document.createElement('img');
      img.src = page.src;
      img.alt = `Página ${i + 1}`;
      pageDiv.appendChild(img);
      bookEl.appendChild(pageDiv);
    });

    const { width, height } = calculateDimensions();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          if (!window.St?.PageFlip) return;
          const pageFlip = new window.St.PageFlip(bookEl, {
            width,
            height,
            size: 'stretch',
            minWidth: 200,
            maxWidth: 1800,
            minHeight: 260,
            maxHeight: 2400,
            showCover: false,
            maxShadowOpacity: 0.5,
            mobileScrollSupport: true,
            useMouseEvents: true,
            flippingTime: 700
          });

          pageFlip.loadFromHTML(bookEl.querySelectorAll('.page'));
          pageFlipRef.current = pageFlip;

          // Event listener for page flips
          pageFlip.on('flip', (e: any) => {
            const currentIdx = typeof e.data === 'number' ? e.data : pageFlip.getCurrentPageIndex();
            onPageChange(currentIdx + 1);

            if (zoom > 1.15) {
              ensureHighResPage(currentIdx - 1, zoom);
              ensureHighResPage(currentIdx, zoom);
              ensureHighResPage(currentIdx + 1, zoom);
            }
          });

          // Restore target page if provided
          if (typeof targetPageToRestore === 'number' && targetPageToRestore >= 0) {
            pageFlip.turnToPage(targetPageToRestore);
          } else {
            onPageChange(1);
          }

          if (zoom > 1.15) {
            const currentIdx = typeof targetPageToRestore === 'number' ? targetPageToRestore : 0;
            ensureHighResPage(currentIdx, zoom);
            ensureHighResPage(currentIdx + 1, zoom);
          }
        } catch (err) {
          console.error('Error al inicializar St.PageFlip:', err);
        } finally {
          isConstructingRef.current = false;
        }
      });
    });
  };

  // Initial build & rebuild on zoom change
  useEffect(() => {
    let currentPageIndex = 0;
    if (pageFlipRef.current) {
      try {
        currentPageIndex = pageFlipRef.current.getCurrentPageIndex();
      } catch (e) {}
    }
    buildFlipbook(currentPageIndex);
  }, [zoom]);

  // Window resize handler
  useEffect(() => {
    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        let currentPageIndex = 0;
        if (pageFlipRef.current) {
          try {
            currentPageIndex = pageFlipRef.current.getCurrentPageIndex();
          } catch (e) {}
        }
        buildFlipbook(currentPageIndex);
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      clearTimeout(resizeTimer);
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="flipbook-stage"
      className="flex-1 w-full flex items-center justify-center overflow-auto p-3 sm:p-6 pb-28 select-none"
    >
      <div id="flipbook-wrap" ref={wrapRef} className="transition-transform duration-150" />
    </div>
  );
};
