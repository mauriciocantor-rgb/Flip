import React from 'react';
import { UtpLogo } from './UtpLogo';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface ViewerHeaderProps {
  documentTitle: string;
  onCloseViewer: () => void;
}

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({ documentTitle, onCloseViewer }) => {
  return (
    <div
      id="viewerHeader"
      className="w-full flex items-center justify-between px-4 sm:px-6 py-3 gap-3 flex-wrap bg-[#05173c]/85 border-b border-white/10 z-30 shrink-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-7 h-auto opacity-95">
          <UtpLogo id="logo-viewer-mark" className="w-full h-auto text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-[#F2A900] shrink-0 hidden sm:inline" />
          <span
            id="docTitle"
            className="text-xs sm:text-sm font-semibold text-[#dce6fb] truncate max-w-[220px] sm:max-w-[460px] md:max-w-[620px]"
            title={documentTitle}
          >
            {documentTitle}
          </span>
        </div>
      </div>

      <button
        id="newFileBtn"
        onClick={onCloseViewer}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-[#eef3ff] px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Cargar otro PDF
      </button>
    </div>
  );
};
