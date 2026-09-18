import React from 'react';
import { UtpLogo } from './UtpLogo';

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-gradient-to-br from-[#00204A] to-[#003DA5] text-white py-6 px-4 text-center shadow-md">
      <div className="flex items-center justify-center gap-4 max-w-[720px] mx-auto text-left flex-wrap sm:flex-nowrap">
        <div className="shrink-0 w-14 sm:w-16 opacity-95">
          <UtpLogo id="logo-header-mark" className="w-full h-auto text-white" />
        </div>
        <div className="text-center sm:text-left">
          <span className="inline-block bg-[#F2A900] text-[#00204A] text-xs font-bold tracking-wider px-3 py-0.5 rounded-full mb-2 uppercase">
            Vicerrectoría de Investigación · UTP
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 text-white">
            Conversor de PDF a Flipbook
          </h1>
          <p className="text-xs sm:text-sm text-[#d7e2f5] max-w-[560px] leading-relaxed">
            Carga un documento PDF y visualízalo como una publicación digital interactiva, con efecto de pasar página. El contenido original no se modifica: cada página se muestra tal como está en el PDF.
          </p>
          <p className="mt-2 text-[11px] text-white/60 tracking-normal">
            Herramienta interna · Biblioteca e Información Científica (BIC) · Universidad Tecnológica de Pereira
          </p>
        </div>
      </div>
    </header>
  );
};
