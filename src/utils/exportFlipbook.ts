import { PageImage } from '../types';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function exportStandaloneFlipbook(
  title: string,
  fileName: string,
  pages: PageImage[],
  texts: string[]
) {
  const baseName = fileName.replace(/\.pdf$/i, '') || 'documento';
  const cleanTitle = title || baseName;
  const safeTitle = escapeHtml(cleanTitle);
  const paginasJSON = JSON.stringify(pages.map((p) => p.src)).replace(/</g, '\\u003c');
  const textosJSON = JSON.stringify(texts || []).replace(/</g, '\\u003c');

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 478.7" fill="#ffffff">
    <path d="M255.53,213.91c-.15-5.5,0-10.98.96-16.42,2.46-14.06,8.48-26.37,18.15-36.84,10.88-11.79,24.24-19.36,40.04-22.13,22.04-3.87,42,1.18,59.39,15.36,12.66,10.32,21.03,23.56,24.46,39.54,5.38,25.03-.57,47.26-17.98,66.13-10.73,11.63-24.11,18.83-39.68,21.51-21.19,3.64-40.5-1.09-57.6-14.24-7.42-5.7-13.41-12.71-18.12-20.79-.1-.18-.24-.34-.37-.51.13-.56.23-1.13.38-1.69.96-3.56.91-7.15.22-10.73-.53-2.78-1.95-5.2-3.35-7.62-2.21-3.83-4.34-7.7-6.5-11.56ZM383.47,209.76c0-30.54-24.86-55.46-55.43-55.54-30.56-.08-55.67,24.88-55.61,55.49.06,30.76,24.72,55.41,55.41,55.53,30.64.12,55.63-24.9,55.63-55.48Z"/>
    <path d="M235.21,246.5c-3.09,4.87-6.46,9.51-10.5,13.65-10.17,10.41-22.28,17.45-36.53,20.35-24.67,5.02-46.58-.9-65.14-17.94-12.32-11.3-19.82-25.48-22.04-42.1-3.52-26.33,4.83-48.45,24.77-65.97,10.49-9.22,22.88-14.69,36.75-16.48,22.66-2.92,42.61,3.26,59.45,18.7,12.6,11.55,20,26.02,22.42,42.94.57,4.01.52,8.11.76,12.17-.28.57-.54,1.15-.85,1.69-2.65,4.68-5.3,9.36-7.97,14.04-1.93,3.39-2.99,7.03-2.64,10.91.24,2.7,1,5.36,1.52,8.04ZM172.57,265.27c30.51,0,55.51-24.89,55.53-55.3.02-30.8-24.86-55.78-55.55-55.75-30.57.03-55.47,24.97-55.45,55.53.02,30.59,24.92,55.51,55.46,55.52Z"/>
    <path d="M348.65,209.19c0,11.73-9.4,21.07-21.19,21.07-11.7,0-21.15-9.47-21.13-21.18.01-11.84,9.48-21.21,21.48-21.14,12.1.06,21.15,10.28,20.84,21.25Z"/>
    <path d="M150.96,209.08c.17-12.67,10.48-21.36,21.67-21.19,11.42.18,20.75,9.68,20.73,21.45-.02,11.62-9.54,20.94-21.39,20.92-11.55-.02-21.02-9.57-21.01-21.18Z"/>
  </svg>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle} — Flipbook UTP</title>
<script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js"><\/script>
<style>
  :root {
    --navy: #003DA5;
    --navy-dark: #00204A;
    --gold: #F2A900;
    --viewer-1: #0a2a63;
    --viewer-2: #05173c;
    --toolbar-bg: rgba(6, 22, 51, 0.88);
    --toolbar-border: rgba(255, 255, 255, 0.14);
    --toolbar-icon: #eef3ff;
    --toolbar-icon-muted: #93a7cf;
    --panel: #ffffff;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.07), transparent 55%),
      repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 2px, transparent 2px, transparent 6px),
      linear-gradient(160deg, var(--viewer-1), var(--viewer-2));
    overflow: hidden;
    color: #fff;
  }
  body { display: flex; flex-direction: column; }
  #hdr {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 12px 20px; flex-shrink: 0;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo { width: 28px; height: auto; flex-shrink: 0; opacity: 0.95; }
  .logo svg { display: block; width: 100%; height: auto; }
  #hdr h1 {
    font-size: 0.88rem; font-weight: 600; color: #dce6fb; margin: 0;
    opacity: 0.9; word-break: break-word;
  }
  .inst-tag {
    font-size: 0.72rem; color: #a9c2f0; background: rgba(255,255,255,0.08);
    padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);
  }
  #stage {
    flex: 1; display: flex; align-items: center; justify-content: center;
    overflow: auto; padding: 6px 12px 100px;
  }
  #flipbook {
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
    background: var(--panel);
  }
  .page {
    background: #fff; display: flex; align-items: center; justify-content: center;
    overflow: hidden; border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .page img { width: 100%; height: 100%; object-fit: contain; display: block; user-select: none; }
  .toolbar {
    position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
    display: flex; align-items: center; gap: 3px;
    background: var(--toolbar-bg);
    border: 1px solid var(--toolbar-border);
    border-radius: 999px;
    padding: 6px 10px;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    max-width: calc(100vw - 24px);
    overflow-x: auto;
    z-index: 100;
  }
  .toolbar .sep { width: 1px; align-self: stretch; margin: 6px 4px; background: var(--toolbar-border); flex-shrink: 0; }
  .tbtn {
    background: transparent; border: none; color: var(--toolbar-icon);
    width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.12s ease;
  }
  .tbtn:hover { background: rgba(255, 255, 255, 0.14); }
  .tbtn svg { width: 17px; height: 17px; }
  .tbtn.accent { background: var(--gold); color: var(--navy-dark); }
  .tbtn.accent:hover { background: #ffb81c; }
  .page-box {
    display: flex; align-items: center; gap: 4px; color: var(--toolbar-icon);
    font-size: 0.8rem; padding: 0 6px; flex-shrink: 0; white-space: nowrap;
  }
  .page-box input {
    width: 34px; text-align: center; background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--toolbar-border); border-radius: 4px; color: #fff;
    font-size: 0.8rem; padding: 3px 2px;
  }
  .page-box .total { color: var(--toolbar-icon-muted); }
  #thumbsBackdrop {
    display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000;
  }
  #thumbsBackdrop.open { display: block; }
  #thumbsPanel {
    position: fixed; top: 0; bottom: 0; left: 0; width: 150px; max-width: 75vw;
    background: rgba(4, 16, 38, 0.96); border-right: 1px solid var(--toolbar-border);
    padding: 16px 10px; overflow-y: auto; display: none; flex-direction: column; gap: 8px;
    z-index: 1001;
  }
  #thumbsPanel.open { display: flex; }
  #thumbsPanel .thumb {
    cursor: pointer; border: 2px solid transparent; border-radius: 6px; overflow: hidden;
    background: #fff; position: relative;
  }
  #thumbsPanel .thumb.current { border-color: var(--gold); }
  #thumbsPanel .thumb img { width: 100%; display: block; }
  #thumbsPanel .thumb .n {
    position: absolute; bottom: 2px; right: 4px; font-size: 0.62rem;
    background: rgba(0, 0, 0, 0.6); color: #fff; padding: 0 4px; border-radius: 3px;
  }
  @media (max-width: 640px) {
    .tbtn { width: 30px; height: 30px; }
    .tbtn svg { width: 15px; height: 15px; }
    .page-box input { width: 28px; }
    .inst-tag { display: none; }
  }
</style>
</head>
<body>
  <div id="hdr">
    <div class="brand">
      <div class="logo">${logoSvg}</div>
      <h1>${safeTitle}</h1>
    </div>
    <span class="inst-tag">Vicerrectoría de Investigación · UTP</span>
  </div>

  <div id="thumbsBackdrop"></div>
  <div id="thumbsPanel"></div>

  <div id="stage">
    <div id="flipbook-wrap"><div id="flipbook"></div></div>
  </div>

  <div class="toolbar">
    <button class="tbtn" id="thumbsBtn" title="Miniaturas">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
    </button>
    <div class="sep"></div>
    <button class="tbtn" id="zoomOutBtn" title="Alejar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button class="tbtn" id="firstPageBtn" title="Primera página">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="5" x2="6" y2="19"/><polyline points="17,5 9,12 17,19"/></svg>
    </button>
    <button class="tbtn" id="prevPageBtn" title="Anterior">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15,5 8,12 15,19"/></svg>
    </button>
    <div class="page-box">
      <input id="pageInput" type="text" inputmode="numeric" value="1" />
      <span>/</span>
      <span class="total" id="pageTotal">1</span>
    </div>
    <button class="tbtn" id="nextPageBtn" title="Siguiente">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,5 16,12 9,19"/></svg>
    </button>
    <button class="tbtn" id="lastPageBtn" title="Última página">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="5" x2="18" y2="19"/><polyline points="7,5 15,12 7,19"/></svg>
    </button>
    <button class="tbtn" id="zoomInBtn" title="Acercar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <div class="sep"></div>
    <button class="tbtn" id="searchBtn" title="Buscar texto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>
    <button class="tbtn accent" id="fullscreenBtn" title="Pantalla completa">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,3 3,3 3,9"/><polyline points="15,3 21,3 21,9"/><polyline points="3,15 3,21 9,21"/><polyline points="21,15 21,21 15,21"/></svg>
    </button>
  </div>

  <script>
    var PAGINAS = ${paginasJSON};
    var TEXTOS = ${textosJSON};
    var flipbookEl = document.getElementById("flipbook");
    var thumbsPanel = document.getElementById("thumbsPanel");
    var thumbsBackdrop = document.getElementById("thumbsBackdrop");
    var pageInput = document.getElementById("pageInput");
    var pageTotal = document.getElementById("pageTotal");
    var pageFlip = null;
    var zoom = 1;
    var zoomEnProceso = false;

    function reiniciarFlipbookEl() {
      var nuevo = document.createElement("div"); nuevo.id = "flipbook";
      flipbookEl.parentNode.replaceChild(nuevo, flipbookEl);
      flipbookEl = nuevo;
      return flipbookEl;
    }

    function tamano() {
      var margenL = window.innerWidth < 480 ? 24 : 60;
      var margenV = window.innerWidth < 480 ? 150 : 180;
      var anchoDisp = Math.min(window.innerWidth - margenL, 520);
      var altoDisp = Math.min(window.innerHeight - margenV, anchoDisp * (window.__PROP__ || 1.33));
      var proporcion = window.__PROP__ || 1.33;
      var ancho = Math.max(220, Math.min(anchoDisp, altoDisp / proporcion));
      return { ancho: Math.round(ancho * zoom), alto: Math.round(ancho * zoom * proporcion), proporcion: proporcion };
    }

    function construir(tamanoForzado) {
      reiniciarFlipbookEl();
      PAGINAS.forEach(function(src) {
        var d = document.createElement("div"); d.className = "page";
        var img = document.createElement("img"); img.src = src;
        d.appendChild(img); flipbookEl.appendChild(d);
      });
      var t = tamanoForzado || tamano();
      pageFlip = new St.PageFlip(flipbookEl, {
        width: t.ancho, height: t.alto, size: "stretch",
        minWidth: 200, maxWidth: 1700, minHeight: 260, maxHeight: 2300,
        showCover: false, maxShadowOpacity: 0.5, mobileScrollSupport: true
      });
      pageFlip.loadFromHTML(document.querySelectorAll(".page"));
      pageTotal.textContent = PAGINAS.length;
      actualizarIndicador();
      pageFlip.on("flip", actualizarIndicador);
    }

    function actualizarIndicador() {
      if (!pageFlip) return;
      var actual = pageFlip.getCurrentPageIndex() + 1;
      pageInput.value = actual;
      resaltarMiniatura(actual - 1);
    }

    function construirMiniaturas() {
      thumbsPanel.innerHTML = "";
      PAGINAS.forEach(function(src, idx) {
        var div = document.createElement("div"); div.className = "thumb"; div.dataset.index = idx;
        div.innerHTML = "<img src=\\"" + src + "\\" /><span class=\\"n\\">" + (idx + 1) + "</span>";
        div.addEventListener("click", function() {
          pageFlip.turnToPage(idx);
          thumbsPanel.classList.remove("open");
          thumbsBackdrop.classList.remove("open");
        });
        thumbsPanel.appendChild(div);
      });
    }

    function resaltarMiniatura(idx) {
      var els = thumbsPanel.querySelectorAll(".thumb");
      for (var i = 0; i < els.length; i++) { els[i].classList.toggle("current", Number(els[i].dataset.index) === idx); }
      var activo = thumbsPanel.querySelector(".thumb.current");
      if (activo) activo.scrollIntoView({ block: "nearest" });
    }

    document.getElementById("thumbsBtn").addEventListener("click", function() {
      thumbsPanel.classList.toggle("open"); thumbsBackdrop.classList.toggle("open");
    });
    thumbsBackdrop.addEventListener("click", function() {
      thumbsPanel.classList.remove("open"); thumbsBackdrop.classList.remove("open");
    });
    document.getElementById("prevPageBtn").addEventListener("click", function() { pageFlip && pageFlip.flipPrev(); });
    document.getElementById("nextPageBtn").addEventListener("click", function() { pageFlip && pageFlip.flipNext(); });
    document.getElementById("firstPageBtn").addEventListener("click", function() { pageFlip && pageFlip.turnToPage(0); });
    document.getElementById("lastPageBtn").addEventListener("click", function() { pageFlip && pageFlip.turnToPage(PAGINAS.length - 1); });

    pageInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        var n = parseInt(pageInput.value, 10);
        if (pageFlip && n >= 1 && n <= PAGINAS.length) pageFlip.turnToPage(n - 1);
        else actualizarIndicador();
        pageInput.blur();
      }
    });

    function aplicarZoom() {
      if (!pageFlip || zoomEnProceso) return;
      zoomEnProceso = true;
      var paginaActual = pageFlip.getCurrentPageIndex();
      var t = tamano();
      pageFlip.destroy();
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          try { construir(t); pageFlip.turnToPage(paginaActual); construirMiniaturas(); }
          catch (e) { console.error(e); }
          finally { zoomEnProceso = false; }
        });
      });
    }

    document.getElementById("zoomInBtn").addEventListener("click", function() {
      zoom = Math.min(3, +(zoom + 0.3).toFixed(2));
      aplicarZoom();
    });
    document.getElementById("zoomOutBtn").addEventListener("click", function() {
      zoom = Math.max(0.6, +(zoom - 0.3).toFixed(2));
      aplicarZoom();
    });

    document.getElementById("searchBtn").addEventListener("click", function() {
      var termino = window.prompt("Buscar texto dentro del documento:");
      if (!termino) return;
      var t = termino.toLowerCase().trim();
      if (!t || !TEXTOS.length) return;
      var inicio = pageFlip ? pageFlip.getCurrentPageIndex() : 0;
      for (var off = 1; off <= TEXTOS.length; off++) {
        var idx = (inicio + off) % TEXTOS.length;
        if (TEXTOS[idx] && TEXTOS[idx].indexOf(t) !== -1) {
          pageFlip.turnToPage(idx);
          return;
        }
      }
      alert("No se encontraron coincidencias para: \\"" + termino + "\\"");
    });

    document.getElementById("fullscreenBtn").addEventListener("click", function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    });

    (function() {
      if (PAGINAS.length > 0) {
        var probe = new Image();
        probe.onload = function() {
          window.__PROP__ = probe.naturalHeight / probe.naturalWidth;
          construir();
          construirMiniaturas();
        };
        probe.onerror = function() {
          window.__PROP__ = 1.33;
          construir();
          construirMiniaturas();
        };
        probe.src = PAGINAS[0];
      }
    })();

    var resizeTO = null;
    window.addEventListener("resize", function() {
      if (!pageFlip) return;
      clearTimeout(resizeTO);
      resizeTO = setTimeout(function() {
        var paginaActual = pageFlip.getCurrentPageIndex();
        var t = tamano();
        pageFlip.destroy();
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            try { construir(t); pageFlip.turnToPage(paginaActual); } catch(e){}
          });
        });
      }, 250);
    });
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flipbook-${baseName.replace(/[^a-z0-9\-_]+/gi, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
