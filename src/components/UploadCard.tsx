import React, { useRef, useState } from 'react';
import { FileUp, FileText, Sparkles, ShieldCheck } from 'lucide-react';

interface UploadCardProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  statusText: string;
  progressPercent: number;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  onFileSelected,
  onLoadSample,
  isProcessing,
  statusText,
  progressPercent
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelected(file);
      } else {
        alert('Por favor selecciona un archivo con formato PDF.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-[620px] flex flex-col items-center gap-6">
      {/* Processing indicator */}
      {isProcessing && (
        <div className="w-full bg-white border border-[#dfe4ec] rounded-xl p-6 shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-5 h-5 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-[#16202e]">{statusText}</p>
          </div>
          <div className="w-full h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F2A900] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-[#5b6b81] mt-2 block">{progressPercent}% completado</span>
        </div>
      )}

      {/* Main Upload Area */}
      {!isProcessing && (
        <>
          <div
            id="uploadCard"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full bg-white border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
              isDragOver
                ? 'border-[#003DA5] bg-blue-50/50 scale-[1.01]'
                : 'border-[#dfe4ec] hover:border-[#003DA5] hover:bg-slate-50/60'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 text-[#003DA5] flex items-center justify-center">
              <FileUp className="w-8 h-8 stroke-[1.75]" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#16202e] mb-2">
              Selecciona o arrastra un archivo PDF
            </h2>
            <p className="text-xs sm:text-sm text-[#5b6b81] max-w-[420px] mx-auto leading-relaxed">
              El documento se procesa en este mismo navegador; no se envía a ningún servidor.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white text-xs font-semibold rounded-lg hover:bg-[#002b75] transition-colors shadow-sm">
              <FileText className="w-4 h-4" />
              Explorar archivos en tu equipo
            </div>

            <p className="text-[11px] text-[#5b6b81]/80 mt-4 leading-normal">
              Cada persona que abre este enlace trabaja con su propio documento, de forma privada e independiente — varios usuarios pueden usarlo al mismo tiempo sin interferir entre sí.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept="application/pdf"
              className="hidden"
              id="fileInput"
            />
          </div>

          {/* Demonstration Quick-Start Button */}
          <div className="w-full flex items-center justify-center">
            <button
              onClick={onLoadSample}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#003DA5] bg-white border border-[#003DA5]/20 hover:border-[#003DA5] hover:bg-blue-50/60 px-5 py-2.5 rounded-full transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#F2A900]" />
              Probar con documento institucional de demostración UTP
            </button>
          </div>

          {/* Privacy and Technical Assurance */}
          <div className="flex items-center gap-2 text-xs text-[#5b6b81] bg-slate-100/80 px-4 py-2 rounded-lg border border-slate-200/70">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Procesamiento 100% en cliente con renderizado vectorial de alta fidelidad.</span>
          </div>
        </>
      )}
    </div>
  );
};
