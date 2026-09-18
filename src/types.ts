export interface PageImage {
  src: string;
  w: number;
  h: number;
}

export interface DocumentData {
  file: File;
  name: string;
  totalPages: number;
  pages: PageImage[];
  texts: string[];
  resolutions: number[];
}

export interface SearchMatch {
  pageIndex: number;
  pageNumber: number;
  snippet: string;
}

declare global {
  interface Window {
    pdfjsLib?: any;
    St?: {
      PageFlip: new (
        element: HTMLElement,
        settings: {
          width: number;
          height: number;
          size?: 'fixed' | 'stretch';
          minWidth?: number;
          maxWidth?: number;
          minHeight?: number;
          maxHeight?: number;
          showCover?: boolean;
          maxShadowOpacity?: number;
          mobileScrollSupport?: boolean;
          useMouseEvents?: boolean;
          flippingTime?: number;
          startPage?: number;
        }
      ) => PageFlipInstance;
    };
  }
}

export interface PageFlipInstance {
  loadFromHTML: (items: NodeListOf<Element> | HTMLElement[]) => void;
  destroy: () => void;
  turnToPage: (pageIndex: number) => void;
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
  on: (event: string, callback: (e: any) => void) => void;
  off: (event: string, callback: (e: any) => void) => void;
  update: () => void;
}
