/* Enjambre · pestaña Analítica
   Fuente: CSV exportado de Meta Business Suite (Instagram o Facebook) o TikTok Studio.
   La lectura de los datos se hace con Gemini (servicio del CRIE o modo copiar y pegar). */
(function () {
  'use strict';
  const A = window.ENJ_APP;
  const $ = s => document.querySelector(s);
  const esc = A.esc;

  /* Columnas canónicas y patrones para reconocerlas (español e inglés) */
  const COLS = [
    { k: 'fecha', label: 'Fecha', re: /^(fecha|date|publish|hora de publicaci|tiempo de publicaci|created|timestamp|fecha de publicaci)/i },
    { k: 'texto', label: 'Publicación', re: /(descripci|caption|t[ií]tulo|title|texto|mensaje|message|video title)/i },
    { k: 'formato', label: 'Formato', re: /(tipo de publicaci|post type|tipo|type|formato|media.?type)/i },
    { k: 'red', label: 'Red', re: /^(red|plataforma|platform|network)$/i },
    { k: 'enlace', label: 'Enlace', re: /(enlace|permalink|link|url)/i },
    { k: 'alcance', label: 'Alcance', re: /^(alcance|reach|cuentas alcanzadas|accounts reached|media.?reach)/i },
    { k: 'vistas', label: 'Visualizaciones', re: /(visualizaciones|reproducciones|views|impresiones|impressions|video views)/i },
    { k: 'megusta', label: 'Me gusta', re: /(me gusta|likes|reacciones|reactions|like.?count)/i },
    { k: 'comentarios', label: 'Comentarios', re: /(comentarios|comments)/i },
    { k: 'compartidos', label: 'Compartidos', re: /(compart|shares)/i },
    { k: 'guardados', label: 'Guardados', re: /(guard|saves|saved)/i },
    { k: 'interacciones', label: 'Interacciones', re: /^(interacciones|interactions|engagement|total interactions)/i }
  ];
  const NUM = ['alcance', 'vistas', 'megusta', 'comentarios', 'compartidos', 'guardados', 'interacciones'];

  /* Datos de ejemplo ficticios para mostrar la herramienta en funcionamiento */
  const EJEMPLO = [
    { fecha: '2026-10-01', texto: 'Ejemplo · Libro recomendado del mes', formato: 'Carrusel', red: 'Instagram', alcance: 820, megusta: 61, comentarios: 4, compartidos: 9, guardados: 14 },
    { fecha: '2026-10-03', texto: 'Ejemplo · Recorrido por un espacio de la biblioteca', formato: 'Reel', red: 'Instagram', alcance: 1960, megusta: 142, comentarios: 18, compartidos: 31, guardados: 22 },
    { fecha: '2026-10-07', texto: 'Ejemplo · Revista recomendada', formato: 'Imagen', red: 'Instagram', alcance: 610, megusta: 38, comentarios: 2, compartidos: 5, guardados: 11 },
    { fecha: '2026-10-09', texto: 'Ejemplo · Agenda cultural de la semana', formato: 'Reel', red: 'Instagram', alcance: 2380, megusta: 175, comentarios: 26, compartidos: 44, guardados: 19 },
    { fecha: '2026-10-14', texto: 'Ejemplo · Invitación a usar los servicios', formato: 'Imagen', red: 'Facebook', alcance: 540, megusta: 29, comentarios: 3, compartidos: 7, guardados: 0 },
    { fecha: '2026-10-15', texto: 'Ejemplo · Colección en exhibición', formato: 'Reel', red: 'Instagram', alcance: 1420, megusta: 96, comentarios: 9, compartidos: 17, guardados: 12 },
    { fecha: '2026-10-19', texto: 'Ejemplo · Sala de estudio en parciales', formato: 'Reel', red: 'Instagram', alcance: 1750, megusta: 120, comentarios: 14, compartidos: 25, guardados: 30 },
    { fecha: '2026-10-21', texto: 'Ejemplo · Recurso electrónico recomendado', formato: 'Carrusel', red: 'Instagram', alcance: 930, megusta: 70, comentarios: 6, compartidos: 12, guardados: 21 }
  ];

  let filas = [];
  let mapa = {};
  let origen = 'Ejemplo';

  /* ---------- CSV ---------- */
  function parseCSV(txt) {
    txt = txt.replace(/^﻿/, '');
    const primera = txt.split(/\r?\n/)[0] || '';
    const sep = [',', ';', '\t'].map(s => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) {
        if (c === '"' && txt[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && txt[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(x => x.trim() !== '')) out.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell); if (row.some(x => x.trim() !== '')) out.push(row);
    return out;
  }
  function aNumero(v) {
    if (v == null) return NaN;
    let s = String(v).trim().replace(/[%\s]/g, '');
    if (!s) return NaN;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    const n = Number(s); return isFinite(n) ? n : NaN;
  }
  function desdeTabla(tabla) {
    const enc = tabla[0].map(h => h.trim());
    const m = {};
    COLS.forEach(c => {
      const i = enc.findIndex((h, idx) => c.re.test(h) && !Object.values(m).includes(idx));
      if (i >= 0) m[c.k] = i;
    });
    const rows = tabla.slice(1).map(r => {
      const o = {};
      Object.entries(m).forEach(([k, i]) => { o[k] = NUM.includes(k) ? aNumero(r[i]) : (r[i] || '').trim(); });
      return o;
    });
    return { rows, mapa: Object.fromEntries(Object.entries(m).map(([k, i]) => [k, enc[i]])) };
  }

  /* ---------- Cálculos ---------- */
  function completar(r) {
    const suma = ['megusta', 'comentarios', 'compartidos', 'guardados'].map(k => r[k]).filter(n => isFinite(n));
    if (!isFinite(r.interacciones)) r.interacciones = suma.length ? suma.reduce((a, b) => a + b, 0) : NaN;
    const base = isFinite(r.alcance) && r.alcance > 0 ? r.alcance : (isFinite(r.vistas) && r.vistas > 0 ? r.vistas : NaN);
    r.tasa = isFinite(base) && isFinite(r.interacciones) ? r.interacciones / base : NaN;
    r.formato = r.formato || 'Sin dato';
    return r;
  }
  const fmt = n => isFinite(n) ? Math.round(n).toLocaleString('es-CO') : '—';
  const pct = n => isFinite(n) ? (n * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%' : '—';
  const sumar = k => filas.reduce((a, r) => a + (isFinite(r[k]) ? r[k] : 0), 0);
  const tiene = k => filas.some(r => isFinite(r[k]));

  function pintar() {
    $('#anaSource').textContent = origen;
    $('#anaSource').className = 'tag' + (origen === 'Ejemplo' ? ' example' : '');
    const conTasa = filas.filter(r => isFinite(r.tasa));
    const tasaMedia = conTasa.length ? conTasa.reduce((a, r) => a + r.interacciones, 0) / conTasa.reduce((a, r) => a + (r.alcance > 0 ? r.alcance : r.vistas), 0) : NaN;
    const kpis = [
      ['Publicaciones', fmt(filas.length), ''],
      ['Alcance total', tiene('alcance') ? fmt(sumar('alcance')) : '—', 'Suma del alcance de cada publicación'],
      ['Interacciones', tiene('interacciones') ? fmt(sumar('interacciones')) : '—', 'Me gusta + comentarios + compartidos + guardados'],
      ['Tasa de interacción', pct(tasaMedia), 'Interacciones ÷ alcance del periodo'],
      ['Compartidos', tiene('compartidos') ? fmt(sumar('compartidos')) : '—', ''],
      ['Guardados', tiene('guardados') ? fmt(sumar('guardados')) : '—', '']
    ];
    $('#kpis').innerHTML = kpis.map(([l, v, t]) => `<div class="kpi"${t ? ` title="${esc(t)}"` : ''}><span class="kpi-l">${esc(l)}</span><span class="kpi-v">${v}</span></div>`).join('');
    pintarGrafico(conTasa);
    pintarFormatos();
    pintarRanking();
    pintarMapa();
  }

  function pintarGrafico(rows) {
    const box = $('#chart');
    if (!rows.length) { box.innerHTML = '<p class="hint">No hay alcance ni interacciones para calcular la tasa.</p>'; return; }
    const datos = rows.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).slice(-24);
    const max = Math.max(...datos.map(r => r.tasa)) || 1;
    const techo = Math.ceil(max * 100 / 5) * 5 / 100 || 0.05;
    const W = Math.max(560, datos.length * 46), H = 240, L = 44, B = 52, T = 14, R = 10;
    const bw = (W - L - R) / datos.length;
    const y = v => T + (H - T - B) * (1 - v / techo);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = techo * i / 4, yy = y(v);
      g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 4}" class="axis" text-anchor="end">${(v * 100).toFixed(v * 100 % 1 ? 1 : 0)}%</text>`;
    }
    const media = datos.reduce((a, r) => a + r.tasa, 0) / datos.length;
    datos.forEach((r, i) => {
      const x = L + i * bw + bw * 0.18, w = bw * 0.64, yy = y(r.tasa);
      const cls = /reel|video/i.test(r.formato) ? 'bar reel' : /carrusel|carousel|album/i.test(r.formato) ? 'bar carr' : 'bar';
      const etiqueta = String(r.fecha).slice(5, 10) || String(i + 1);
      g += `<rect x="${x}" y="${yy}" width="${w}" height="${H - B - yy}" rx="3" class="${cls}"><title>${esc((r.texto || 'Publicación').slice(0, 80))} · ${pct(r.tasa)}</title></rect>`;
      g += `<text x="${x + w / 2}" y="${H - B + 16}" class="axis" text-anchor="middle">${esc(etiqueta)}</text>`;
    });
    g += `<line x1="${L}" x2="${W - R}" y1="${y(media)}" y2="${y(media)}" class="avg"/><text x="${W - R}" y="${y(media) - 5}" class="axis avg-l" text-anchor="end">Promedio ${pct(media)}</text>`;
    box.innerHTML = `<div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Tasa de interacción por publicación">${g}</svg></div>
      <div class="legend"><span><i class="lg reel"></i>Reel o video</span><span><i class="lg carr"></i>Carrusel</span><span><i class="lg img"></i>Imagen u otro</span></div>`;
  }

  function pintarFormatos() {
    const grupos = {};
    filas.forEach(r => { (grupos[r.formato] = grupos[r.formato] || []).push(r); });
    const lista = Object.entries(grupos).map(([f, rs]) => {
      const inter = rs.reduce((a, r) => a + (isFinite(r.interacciones) ? r.interacciones : 0), 0);
      const base = rs.reduce((a, r) => a + (r.alcance > 0 ? r.alcance : (r.vistas > 0 ? r.vistas : 0)), 0);
      return { f, n: rs.length, tasa: base ? inter / base : NaN, alcance: base / rs.length };
    }).sort((a, b) => (b.tasa || 0) - (a.tasa || 0));
    const max = Math.max(...lista.map(x => x.tasa || 0)) || 1;
    $('#byFormat').innerHTML = lista.map(x => `<div class="fbar"><div class="fbar-h"><strong>${esc(x.f)}</strong><span>${x.n} pub. · ${pct(x.tasa)}</span></div><div class="fbar-t"><i style="width:${((x.tasa || 0) / max * 100).toFixed(1)}%"></i></div><span class="hint">Alcance medio ${fmt(x.alcance)}</span></div>`).join('') || '<p class="hint">Sin datos de formato.</p>';
  }

  function pintarRanking() {
    const rs = filas.slice().sort((a, b) => (isFinite(b.tasa) ? b.tasa : -1) - (isFinite(a.tasa) ? a.tasa : -1));
    $('#rowCount').textContent = `${rs.length} publicaciones`;
    $('#rank').innerHTML = `<table><thead><tr><th>#</th><th>Fecha</th><th>Publicación</th><th>Formato</th><th class="n">Alcance</th><th class="n">Interacciones</th><th class="n">Compartidos</th><th class="n">Guardados</th><th class="n">Tasa</th></tr></thead><tbody>` +
      rs.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${esc(String(r.fecha).slice(0, 10))}</td><td class="txt">${r.enlace ? `<a href="${esc(r.enlace)}" target="_blank" rel="noopener">${esc((r.texto || 'Ver publicación').slice(0, 90))}</a>` : esc((r.texto || '—').slice(0, 90))}</td><td>${esc(r.formato)}</td><td class="n">${fmt(r.alcance)}</td><td class="n">${fmt(r.interacciones)}</td><td class="n">${fmt(r.compartidos)}</td><td class="n">${fmt(r.guardados)}</td><td class="n"><strong>${pct(r.tasa)}</strong></td></tr>`).join('') +
      `</tbody></table>`;
  }

  function pintarMapa() {
    const ent = Object.entries(mapa);
    $('#colMap').innerHTML = ent.length
      ? '<ul class="map">' + COLS.map(c => `<li><span>${c.label}</span>${mapa[c.k] ? `<code>${esc(mapa[c.k])}</code>` : '<em class="hint">no encontrada</em>'}</li>`).join('') + '</ul>'
      : '<p class="hint">Datos de ejemplo ficticios: carga tu CSV o los datos en vivo para ver las columnas reales.</p>';
  }

  function cargar(rows, m, fuente) {
    filas = rows.map(completar).filter(r => Object.keys(r).length > 3);
    mapa = m; origen = fuente;
    pintar();
  }

  /* ---------- Carga de CSV ---------- */
  function leerArchivo(file) {
    if (!file) return;
    const st = $('#csvStatus');
    if (file.size > 5 * 1024 * 1024) { st.textContent = 'El archivo supera 5 MB. Exporta un periodo más corto.'; return; }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const tabla = parseCSV(String(fr.result));
        if (tabla.length < 2) { st.textContent = 'El archivo no tiene filas de datos.'; return; }
        const { rows, mapa: m } = desdeTabla(tabla);
        const faltan = ['alcance', 'interacciones', 'megusta'].every(k => !(k in m));
        cargar(rows, m, `CSV · ${file.name}`);
        st.textContent = `${filas.length} publicaciones cargadas.` + (faltan ? ' No se reconocieron columnas de alcance ni de interacciones: revisa «Columnas reconocidas».' : '');
      } catch (e) { st.textContent = 'No se pudo leer el archivo. Verifica que sea un CSV exportado.'; }
    };
    fr.onerror = () => { st.textContent = 'No se pudo leer el archivo.'; };
    fr.readAsText(file);
  }
  $('#csvFile').addEventListener('change', e => leerArchivo(e.target.files[0]));
  const drop = $('#drop');
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); });

  /* ---------- Análisis con IA (Gemini) ---------- */
  let cancelar = null;
  $('#btnAnaIA').addEventListener('click', () => {
    const out = $('#anaOut'), b = $('#btnAnaIA');
    if (cancelar) { cancelar(); cancelar = null; b.textContent = 'Analizar con Gemini'; return; }
    if (!filas.length) { out.innerHTML = '<p class="err">Primero carga datos.</p>'; return; }
    const tabla = ['fecha;red;formato;publicacion;alcance;interacciones;compartidos;guardados;tasa'].concat(
      filas.slice(0, 120).map(r => [String(r.fecha).slice(0, 10), r.red || '', r.formato, (r.texto || '').replace(/[;\n]/g, ' ').slice(0, 70), fmt(r.alcance), fmt(r.interacciones), fmt(r.compartidos), fmt(r.guardados), pct(r.tasa)].join(';'))).join('\n');
    const prompt = `Actúa como el bot "Programación y Analítica" del Enjambre de Marketing Digital de la Biblioteca Jorge Roa Martínez (UTP). Fuente de los datos: ${origen}${origen === 'Ejemplo' ? ' (datos ficticios de demostración: dilo al inicio)' : ''}.
${A.bloqueIdentidad()}

DATOS (una publicación por fila; tasa = interacciones ÷ alcance):
${tabla}

Entrega en Markdown, en español de Colombia, sin preámbulo: ## Hallazgos (máximo 5 viñetas, con cifras tomadas solo de la tabla), ## Qué formato y qué temas funcionan, ## Tres recomendaciones accionables para el próximo mes (cada una con el bot del enjambre que debería ejecutarla), ## Mejores franjas para publicar (solo si las fechas tienen hora; si no, di que hace falta la hora de publicación). No inventes métricas que no estén en la tabla.`;
    if (A.conServicio) b.textContent = 'Detener';
    cancelar = A.ejecutar(prompt, out, texto => {
      out.innerHTML = A.md(texto); cancelar = null; b.textContent = 'Analizar con Gemini';
    });
    if (!cancelar) b.textContent = 'Analizar con Gemini';
  });

  /* ---------- Inicio ---------- */
  cargar(EJEMPLO.map(r => Object.assign({}, r)), {}, 'Ejemplo');
})();
