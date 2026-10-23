/* Renombrador de archivos UTP · repositorio institucional (trabajos de grado y otros recursos) · Biblioteca e Información Científica (BIC), Universidad Tecnológica de Pereira */
(function () {
  'use strict';

  /* pdf.js: worker alojado en el repositorio; sin eval (compatible con la CSP del CRIE) */
  if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '../comun/vendor/pdf.worker.min.js';

  /* ---------- Vocabulario controlado (sección 6 del documento) ---------- */
  const TYPES = [
    ['technology-thesis', 'Trabajo de grado de Tecnología', 'Trabajos de grado'],
    ['undergraduate-thesis', 'Trabajo de grado de Pregrado', 'Trabajos de grado'],
    ['specialization-thesis', 'Trabajo de grado de Especialización', 'Trabajos de grado'],
    ['master-thesis', 'Trabajo de grado de Maestría', 'Trabajos de grado'],
    ['doctoral-thesis', 'Trabajo de grado de Doctorado', 'Trabajos de grado'],
    ['research-output', 'Producto de investigación', 'Otros recursos'],
    ['book', 'Libro', 'Otros recursos'],
    ['book-chapter', 'Capítulo de libro', 'Otros recursos'],
    ['journal-article', 'Artículo científico', 'Otros recursos'],
    ['conference-paper', 'Ponencia / artículo de conferencia', 'Otros recursos'],
    ['research-report', 'Informe de investigación', 'Otros recursos'],
    ['technical-report', 'Informe técnico', 'Otros recursos'],
    ['working-paper', 'Documento de trabajo', 'Otros recursos'],
    ['dataset', 'Conjunto de datos', 'Otros recursos'],
    ['software', 'Software', 'Otros recursos'],
    ['educational-resource', 'Recurso educativo', 'Otros recursos'],
    ['institutional-publication', 'Publicación institucional', 'Otros recursos']
  ];
  const TYPE_CODES = new Set(TYPES.map(t => t[0]));

  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n, w) => String(n).padStart(w || 4, '0');
  const thisYear = new Date().getFullYear();

  /* ---------- Estado ---------- */
  const state = { rows: [], counter: 1, uid: 0 };

  /* ---------- Normalización ---------- */
  function slug(s) {
    return String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // tildes, diéresis y la tilde de la ñ
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function extOf(name) {
    const i = name.lastIndexOf('.');
    return i > 0 && i < name.length - 1 ? name.slice(i + 1) : '';
  }

  /* ---------- Verificación del formato real (firma del archivo) ---------- */
  const ZIP_FAMILY = new Set(['zip', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'epub']);
  async function sniff(file) {
    try {
      const buf = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      if (!buf.length) return 'empty';
      const head = new TextDecoder('latin1').decode(buf);
      if (head.indexOf('%PDF-') !== -1) return 'pdf';
      if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return 'zip';
      if (buf[0] === 0x89 && head.slice(1, 4) === 'PNG') return 'png';
      if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
      if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11) return 'ole';
      return 'unknown';
    } catch (e) { return 'unknown'; }
  }
  const SNIFF_LABEL = { pdf: 'un PDF', zip: 'un ZIP u Office moderno', png: 'una imagen PNG', jpg: 'una imagen JPG', ole: 'un documento Office antiguo', unknown: 'un formato no reconocido', empty: 'un archivo vacío' };
  function expectedKind(ext) {
    if (ext === 'pdf') return 'pdf';
    if (ZIP_FAMILY.has(ext)) return 'zip';
    if (ext === 'png') return 'png';
    if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
    if (ext === 'doc' || ext === 'xls' || ext === 'ppt') return 'ole';
    return null;
  }

  /* ---------- Identificación del autor principal en el PDF ---------- */
  const deacc = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'san', 'santa', 'da', 'das', 'do', 'dos', 'di', 'van', 'von', 'der', 'den', 'le']);
  const GIVEN_CONNECTOR = /^(?:de los|de las|de la|del|de)\s+(?:angeles|carmen|jesus|pilar|rosario|socorro|mercedes|consuelo|dolores|belen|paz|luz)$/;
  const STOP_RE = new RegExp('\\b(?:universidad\\w*|facultad\\w*|programa\\w*|maestria|doctorado|especializacion|tecnolog\\w*|trabajo|grado|tesis|director\\w*|codirector\\w*|asesor\\w*|jurado\\w*|evaluador\\w*|revisor\\w*|tutor\\w*|ingenieri\\w*|ciencias|departamento|repositorio|biblioteca|requisito|titulo|presentad\\w*|optar|escuela|instituto|centro|grupo|linea|investigacion|proyecto|informe|resumen|abstract|palabras|clave|fecha|nota|aceptacion|firma|cedula|correo|e-?mail|risaralda|colombia|vicerrector\\w*|magister|licenciatura|pregrado|posgrado|doctor|dra?|ph\\.?d|msc|especialista|articulo|revista|volumen|editorial|isbn|issn|doi|copyright|derechos|reservados|modelo|sistema|estudio|analisis|diseno|evaluacion|desarrollo)\\b');
  const DIRECTOR_RE = /\b(?:director\w*|codirector\w*|asesor\w*|jurado\w*|evaluador\w*|revisor\w*|tutor\w*|dirigid[oa]\s+por|bajo la direccion)\b/;
  const LABELS = [
    { re: /(?:^|\s)presentad[oa]s?\s+por\b\s*[:\-–—]?\s*/, txt: 'Presentado por', level: 'alta' },
    { re: /(?:^|\s)elaborad[oa]s?\s+por\b\s*[:\-–—]?\s*/, txt: 'Elaborado por', level: 'alta' },
    { re: /(?:^|\s)realizad[oa]s?\s+por\b\s*[:\-–—]?\s*/, txt: 'Realizado por', level: 'alta' },
    { re: /(?:^|\s)desarrollad[oa]s?\s+por\b\s*[:\-–—]?\s*/, txt: 'Desarrollado por', level: 'alta' },
    { re: /(?:^|\s)escrit[oa]s?\s+por\b\s*[:\-–—]?\s*/, txt: 'Escrito por', level: 'alta' },
    { re: /^autor(?:es|a|as)?\b\s*(?:principal\b)?\s*[:\-–—]?\s*/, txt: 'Autor', level: 'alta' },
    { re: /^authors?\b\s*[:\-–—]?\s*/, txt: 'Author', level: 'alta' },
    { re: /^(?:estudiantes?|tesista|candidat[oa]|investigador(?:a|es)?(?:\s+principal)?)\s*[:\-–—]\s*/, txt: 'Estudiante', level: 'media' },
    { re: /^por\s*[:\-–—]\s*/, txt: 'Por', level: 'media' },
    { re: /^por\s*$/, txt: 'Por', level: 'media' },
    { re: /\spor\s*[:\-–—]?\s*$/, txt: 'por', level: 'alta', needsCtx: true }
  ];
  const LEVEL_ORDER = { alta: 0, media: 1, baja: 2 };

  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s\-'’])([a-záéíóúüñ])/g, (m, a, b) => a + b.toUpperCase())
      .split(' ').map((w, i) => (i > 0 && PARTICLES.has(deacc(w))) ? w.toLowerCase() : w).join(' ');
  }
  function cleanNameText(s) {
    return String(s)
      .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079*†‡§¶#]+/g, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/\b(?:c\.?\s?c\.?|cod(?:igo|\.)?|c[oó]digo|c[eé]dula|tel|cel)\b.*$/i, '')
      .replace(/\d+/g, '')
      .replace(/[,;:\-–—]+\s*$/, '')
      .replace(/\s+/g, ' ').trim();
  }
  function isNameLike(s) {
    if (!s) return false;
    if (STOP_RE.test(deacc(s))) return false;
    if (/@|https?:|www\./i.test(s)) return false;
    const toks = s.split(/\s+/).filter(Boolean);
    const core = toks.filter(t => !PARTICLES.has(deacc(t)));
    if (core.length < 2 || core.length > 6 || toks.length > 11) return false;
    let caps = 0;
    for (const t of toks) {
      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\-]+$/.test(t)) return false;
      if (/^[A-ZÀ-ÖØ-Þ]/.test(t)) caps++;
      else if (!PARTICLES.has(deacc(t))) return false;
    }
    return caps >= 2;
  }
  const isUp = x => x === x.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(x);

  // Convierte «Nombres Apellidos» en los apellidos que van en el nombre del archivo.
  function nameInfo(full) {
    const notes = [];
    const toks = full.split(/\s+/).filter(Boolean);
    let merged = [], buf = [];
    toks.forEach(t => {
      if (PARTICLES.has(deacc(t))) buf.push(t);
      else { merged.push(buf.concat(t).join(' ')); buf = []; }
    });
    if (buf.length) { if (merged.length) merged[merged.length - 1] += ' ' + buf.join(' '); else merged.push(buf.join(' ')); }
    let hasParticle = merged.some(m => m.split(' ').length > 1 && PARTICLES.has(deacc(m.split(' ')[0])));
    const fixed = [];
    merged.forEach(m => {
      if (fixed.length && GIVEN_CONNECTOR.test(deacc(m))) fixed[fixed.length - 1] += ' ' + m; else fixed.push(m);
    });
    merged = fixed;
    const n = merged.length;
    const take = n >= 3 ? 2 : 1;
    if (n === 3) notes.push('El nombre completo tiene tres partes: se asumió un nombre y dos apellidos.');
    if (hasParticle) notes.push('El nombre contiene partículas (de, del, la…): verifica dónde empiezan los apellidos.');
    return { full, surnames: titleCase(merged.slice(-take).join(' ')), given: merged.slice(0, -take).join(' '), assumption: notes.join(' ') };
  }

  // Devuelve la lista de autores contenida en un texto (uno o varios).
  function parseAuthors(raw) {
    const t = cleanNameText(raw);
    if (!t) return [];
    const one = t.match(/^([^,;]+),\s*([^,;]+)$/);
    if (one) {
      const L = one[1].trim(), R = one[2].trim();
      if (isUp(L) && !isUp(R) && isNameLike(L + ' ' + R)) {
        return [{ full: t, surnames: titleCase(L), given: R, assumption: '' }];
      }
    }
    const parts = t.split(/\s*(?:;|&|,|\s+y\s+|\s+e\s+)\s*/).map(x => x.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every(isNameLike)) return parts.map(nameInfo);
    return isNameLike(t) ? [nameInfo(t)] : [];
  }

  async function pageLines(page) {
    const tc = await page.getTextContent();
    const items = tc.items.filter(i => typeof i.str === 'string' && i.str.length && i.transform)
      .map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], h: (i.height || Math.abs(i.transform[3]) || 0), w: i.width || 0 }));
    items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
    const lines = [];
    for (const it of items) {
      const tol = Math.max(2, (it.h || 8) * 0.45);
      let L = lines.find(l => Math.abs(l.y - it.y) <= tol);
      if (!L) { L = { y: it.y, items: [], size: 0 }; lines.push(L); }
      L.items.push(it); L.size = Math.max(L.size, it.h || 0);
    }
    lines.sort((a, b) => b.y - a.y);
    return lines.map(L => {
      L.items.sort((a, b) => a.x - b.x);
      let txt = '', prev = null;
      for (const it of L.items) {
        if (prev) {
          const gap = it.x - (prev.x + prev.w);
          if (!/\s$/.test(txt) && !/^\s/.test(it.s) && gap > (it.h || 8) * 0.15) txt += ' ';
        }
        txt += it.s; prev = it;
      }
      return { text: txt.replace(/\s+/g, ' ').trim().normalize('NFC'), size: L.size };
    }).filter(l => l.text);
  }

  function namesAfter(lines, start, max) {
    const out = [];
    for (let j = start; j < lines.length && out.length < max; j++) {
      const p = parseAuthors(lines[j].text);
      if (!p.length) break;
      out.push(...p);
    }
    return out;
  }

  function pickAuthor(pages, meta) {
    const groups = [];
    // 1) Líneas con etiqueta explícita (Autor, Presentado por, etc.)
    pages.forEach(pg => {
      const L = pg.lines;
      L.forEach((ln, i) => {
        const d = deacc(ln.text);
        for (const lab of LABELS) {
          const m = d.match(lab.re);
          if (!m) continue;
          if (lab.needsCtx && !/(presentad|requisito|optar|trabajo|tesis|proyecto|informe)/.test(d)) continue;
          const rest = ln.text.slice(m.index + m[0].length).trim();
          let names = rest ? parseAuthors(rest) : [];
          if (rest && names.length) names = names.concat(namesAfter(L, i + 1, 3));
          else if (!rest) names = namesAfter(L, i + 1, 4);
          if (names.length) groups.push({ names, via: 'label', label: lab.txt, page: pg.n, level: lab.level, idx: i });
          break;
        }
      });
    });
    // 2) Sin etiqueta: nombres bajo el título en la primera página, fuera del contexto de director/asesor
    if (!groups.length && pages[0]) {
      const L = pages[0].lines;
      const maxSize = Math.max(0, ...L.map(l => l.size));
      let start = 0;
      L.forEach((l, i) => { if (maxSize && l.size >= maxSize * 0.92 && l.text.length > 3) start = i + 1; });
      if (start >= L.length) start = 0;
      const unl = []; let inDir = false;
      for (let i = start; i < L.length; i++) {
        const d = deacc(L[i].text);
        if (DIRECTOR_RE.test(d)) { inDir = true; continue; }
        const p = parseAuthors(L[i].text);
        if (!p.length) { inDir = false; continue; }
        if (inDir) continue;
        unl.push({ names: p, via: 'sinetiqueta', label: '', page: 1, level: '', idx: i });
      }
      if (unl.length) {
        const total = unl.reduce((a, g) => a + g.names.length, 0);
        unl.forEach(g => { g.level = total === 1 ? 'media' : 'baja'; g.many = total > 1; });
        groups.push(...unl);
      }
    }
    // 3) Metadatos del PDF (último recurso)
    let metaGroup = null;
    if (meta && meta.Author) {
      const p = parseAuthors(String(meta.Author));
      if (p.length) metaGroup = { names: p, via: 'meta', label: '', page: 0, level: 'baja' };
    }
    if (metaGroup) groups.push(metaGroup);
    if (!groups.length) return { principal: null };

    groups.sort((a, b) => (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || (a.via === 'meta') - (b.via === 'meta') || (a.page - b.page) || (a.idx - b.idx));
    const g = groups[0], pr = g.names[0];
    let where, levelNote = '';
    if (g.via === 'label') where = 'página ' + g.page + ', tras «' + g.label + '»';
    else if (g.via === 'sinetiqueta') { where = 'página 1, línea sin etiqueta bajo el título'; levelNote = g.many ? 'hay varios nombres sin etiqueta en la portada; se tomó el primero. Verifica que sea el autor y no el director u otra persona.' : 'no había una etiqueta como «Autor» o «Presentado por»; verifica que no sea el director u otra persona.'; }
    else { where = 'metadatos del PDF, campo Autor'; levelNote = 'los metadatos suelen reflejar a quien creó el archivo, no necesariamente al autor del documento.'; }
    if (g.level === 'media' && g.via === 'label') levelNote = 'la etiqueta «' + g.label + '» no siempre indica al autor principal.';

    const seen = new Set([deacc(pr.full)]);
    const alts = [];
    groups.forEach(gr => gr.names.forEach(n => {
      const k = deacc(n.full);
      if (!seen.has(k)) { seen.add(k); alts.push(n); }
    }));
    return { principal: Object.assign({ where, level: g.level, levelNote }, pr), groupSize: g.names.length, groupNames: g.names.map(n => n.full), alts: alts.slice(0, 4), meta: meta ? { author: meta.Author || '', title: meta.Title || '' } : null };
  }




  /* ---------- Contadores de identificador por programa/tipo (persistidos en este navegador) ---------- */
  const COUNTERS_KEY = 'utp_renombrador_contadores_v1';
  function loadCounters() {
    try { return JSON.parse(localStorage.getItem(COUNTERS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveCounters(obj) {
    try { localStorage.setItem(COUNTERS_KEY, JSON.stringify(obj)); return true; } catch (e) { return false; }
  }
  let counters = loadCounters();
  let counterStorageOk = true;
  function groupKeyFor(r) {
    if (!r.typeTouched && r.programAbbr) return 'prog:' + r.programAbbr;
    if (r.type) return 'type:' + r.type;
    return 'general';
  }
  function groupLabelFor(key) {
    if (key === 'general') return 'Sin programa ni tipo determinado';
    if (key.indexOf('prog:') === 0) { const p = programByAbbr(key.slice(5)); return p ? p.name + ' (' + p.abbr + ')' : key; }
    if (key.indexOf('type:') === 0) { const t = TYPES.find(x => x[0] === key.slice(5)); return t ? t[1] : key; }
    return key;
  }
  function nextForGroup(key) {
    const start = Math.max(1, parseInt($('#defStart').value, 10) || 1);
    const cur = Object.prototype.hasOwnProperty.call(counters, key) ? counters[key] : start;
    counters[key] = cur + 1;
    counterStorageOk = saveCounters(counters);
    return cur;
  }
  function assignIdent(r, force) {
    if (r.identTouched && !force) return;
    const key = groupKeyFor(r);
    if (r.identGroup === key && r.ident && !force) return;
    r.identGroup = key;
    r.ident = pad(nextForGroup(key));
  }

  /* ---------- Programas académicos UTP (mapeados a tipo de recurso) ----------
     Fuente: oferta académica publicada en programasacademicos.utp.edu.co y en las
     páginas de cada facultad, consultada en septiembre de 2026. Relación de trabajo,
     no un listado oficialmente certificado: verifíquese y complétese con el tiempo. */
  const PROGRAMS = [
    ["Licenciatura en Artes Visuales","Pregrado","undergraduate-thesis","lav"],
    ["Licenciatura en Filosofía","Pregrado","undergraduate-thesis","lf"],
    ["Licenciatura en Bilingüismo con Énfasis en Inglés","Pregrado","undergraduate-thesis","lbei"],
    ["Licenciatura en Música","Pregrado","undergraduate-thesis","lm"],
    ["Administración del Turismo Sostenible","Pregrado","undergraduate-thesis","ats"],
    ["Tecnología en Gestión del Turismo Sostenible","Tecnología","technology-thesis","tgts"],
    ["Técnica Profesional en Procesos del Turismo Sostenible","Tecnología","technology-thesis","tppts"],
    ["Administración Ambiental","Pregrado","undergraduate-thesis","aa"],
    ["Física","Pregrado","undergraduate-thesis","f"],
    ["Matemáticas","Pregrado","undergraduate-thesis","m"],
    ["Licenciatura en Educación Infantil","Pregrado","undergraduate-thesis","lei"],
    ["Licenciatura en Ciencias Sociales","Pregrado","undergraduate-thesis","lcs"],
    ["Licenciatura en Educación Básica Primaria","Pregrado","undergraduate-thesis","lebp"],
    ["Licenciatura en Tecnología","Pregrado","undergraduate-thesis","lt"],
    ["Licenciatura en Literatura y Lengua Castellana","Pregrado","undergraduate-thesis","lllc"],
    ["Licenciatura en Etnoeducación","Pregrado","undergraduate-thesis","le"],
    ["Licenciatura en Matemáticas y Física","Pregrado","undergraduate-thesis","lmf"],
    ["Ciencias del Deporte y la Recreación","Pregrado","undergraduate-thesis","cdr"],
    ["Medicina Veterinaria y Zootecnia","Pregrado","undergraduate-thesis","mvz"],
    ["Medicina","Pregrado","undergraduate-thesis","me"],
    ["Administración de Empresas","Pregrado","undergraduate-thesis","ae"],
    ["Administración Industrial","Pregrado","undergraduate-thesis","ai"],
    ["Ingeniería Industrial","Pregrado","undergraduate-thesis","ii"],
    ["Ingeniería Civil","Pregrado","undergraduate-thesis","ic"],
    ["Ingeniería Mecánica","Pregrado","undergraduate-thesis","im"],
    ["Ingeniería Eléctrica","Pregrado","undergraduate-thesis","ie"],
    ["Ingeniería Electrónica","Pregrado","undergraduate-thesis","inel"],
    ["Ingeniería de Sistemas y Computación","Pregrado","undergraduate-thesis","isc"],
    ["Ingeniería Física","Pregrado","undergraduate-thesis","if"],
    ["Ingeniería de Manufactura","Pregrado","undergraduate-thesis","inma"],
    ["Ingeniería Mecatrónica","Pregrado","undergraduate-thesis","inme"],
    ["Ingeniería en Procesos Agroindustriales","Pregrado","undergraduate-thesis","ipa"],
    ["Ingeniería en Procesos Sostenibles de las Maderas","Pregrado","undergraduate-thesis","ipsm"],
    ["Química Industrial","Pregrado","undergraduate-thesis","qi"],
    ["Tecnología Industrial","Tecnología","technology-thesis","ti"],
    ["Tecnología en Gestión Logística","Tecnología","technology-thesis","tgl"],
    ["Tecnología en Desarrollo de Software","Tecnología","technology-thesis","tds"],
    ["Tecnología en Desarrollo del Software","Tecnología","technology-thesis","tdeso"],
    ["Tecnología en Procesos de Fabricación Metalmecánica","Tecnología","technology-thesis","tpfm"],
    ["Tecnología en Diseño y Construcción de Instalaciones Eléctricas de Media y Baja Tensión","Tecnología","technology-thesis","tdciembt"],
    ["Tecnología Eléctrica","Tecnología","technology-thesis","te"],
    ["Tecnología en Desarrollo de Procesos Químicos Sostenibles","Tecnología","technology-thesis","tdpqs"],
    ["Tecnología Química","Tecnología","technology-thesis","tq"],
    ["Tecnología en Regencia de Farmacia","Tecnología","technology-thesis","trf"],
    ["Tecnología en Atención Prehospitalaria","Tecnología","technology-thesis","tap"],
    ["Tecnología en Mecatrónica","Tecnología","technology-thesis","tm"],
    ["Técnico Profesional en Mecatrónica","Tecnología","technology-thesis","tpm"],
    ["Tecnología en Producción Forestal","Tecnología","technology-thesis","tpf"],
    ["Tecnología en Producción Agrícola","Tecnología","technology-thesis","tpa"],
    ["Tecnología en Producción Agrícola Integrada","Tecnología","technology-thesis","tpai"],
    ["Tecnología Mecánica","Tecnología","technology-thesis","teme"],
    ["Especialización Tecnológica en Ensayos no Destructivos para Inspección de Materiales","Especialización","specialization-thesis","etendim"],
    ["Especialización en Analítica y Ciencia de Datos Aplicada","Especialización","specialization-thesis","eacda"],
    ["Especialización en Dramaturgia del Actor","Especialización","specialization-thesis","eda"],
    ["Especialización en Electrónica Digital","Especialización","specialization-thesis","eed"],
    ["Especialización en Enseñanza de la Física","Especialización","specialization-thesis","eef"],
    ["Especialización en Entrenamiento Deportivo y Readaptación Funcional","Especialización","specialization-thesis","eedrf"],
    ["Especialización en Gerencia de Proyectos","Especialización","specialization-thesis","egp"],
    ["Especialización en Gerencia del Deporte","Especialización","specialization-thesis","egd"],
    ["Especialización en Gerencia en Sistemas de Salud","Especialización","specialization-thesis","egss"],
    ["Especialización en Gestión Ambiental Local","Especialización","specialization-thesis","egal"],
    ["Especialización en Gestión de la Calidad y Normalización Técnica","Especialización","specialization-thesis","egcnt"],
    ["Especialización en Gestión del Riesgo de Emergencias y Desastres","Especialización","specialization-thesis","egred"],
    ["Especialización en Logística Empresarial","Especialización","specialization-thesis","ele"],
    ["Especialización en Procesos Industriales Agroalimentarios","Especialización","specialization-thesis","epia"],
    ["Especialización en Seguridad y Salud en el Trabajo","Especialización","specialization-thesis","esset"],
    ["Especialización en Soldadura","Especialización","specialization-thesis","es"],
    ["Especialización en Tecnologías de la Información y las Comunicaciones","Especialización","specialization-thesis","etic"],
    ["Especialización en Ginecología y Obstetricia","Especialización (médico-quirúrgica)","specialization-thesis","ego"],
    ["Especialización en Medicina Crítica y Cuidado Intensivo","Especialización (médico-quirúrgica)","specialization-thesis","emcci"],
    ["Especialización en Medicina Interna","Especialización (médico-quirúrgica)","specialization-thesis","emi"],
    ["Especialización en Pediatría","Especialización (médico-quirúrgica)","specialization-thesis","ep"],
    ["Especialización en Psiquiatría","Especialización (médico-quirúrgica)","specialization-thesis","esps"],
    ["Maestría Biología Vegetal","Maestría","master-thesis","mbv"],
    ["Maestría en Administración de Empresas","Maestría","master-thesis","mae"],
    ["Maestría en Administración del Desarrollo Humano y Organizacional","Maestría","master-thesis","madho"],
    ["Maestría en Administración Económica y Financiera","Maestría","master-thesis","maef"],
    ["Maestría en Biología Molecular y Biotecnología","Maestría","master-thesis","mbmb"],
    ["Maestría en Ciencias Ambientales","Maestría","master-thesis","mca"],
    ["Maestría en Ciencias Física","Maestría","master-thesis","mcf"],
    ["Maestría en Ciencias Químicas","Maestría","master-thesis","mcq"],
    ["Maestría en Comunicación Educativa","Maestría","master-thesis","mce"],
    ["Maestría en Desarrollo Agroindustrial","Maestría","master-thesis","mda"],
    ["Maestría en Ecotecnología","Maestría","master-thesis","maec"],
    ["Maestría en Educación","Maestría","master-thesis","maed"],
    ["Maestría en Educación Bilingüe","Maestría","master-thesis","meb"],
    ["Maestría en Educación y Arte","Maestría","master-thesis","mea"],
    ["Maestría en Enseñanza de la Física","Maestría","master-thesis","mef"],
    ["Maestría en Enseñanza de la Matemática","Maestría","master-thesis","mem"],
    ["Maestría en Estética y Creación","Maestría","master-thesis","mec"],
    ["Maestría en Estudios Culturales y Narrativas Contemporáneas","Maestría","master-thesis","mecnc"],
    ["Maestría en Filosofía","Maestría","master-thesis","mf"],
    ["Maestría en Gerencia de la Cadena de Suministro","Maestría","master-thesis","mgcs"],
    ["Maestría en Gerencia de las Organizaciones del Deporte","Maestría","master-thesis","mgod"],
    ["Maestría en Gerencia de Sistemas de Salud","Maestría","master-thesis","mgss"],
    ["Maestría en Gestión del Riesgo de Desastres","Maestría","master-thesis","mgrd"],
    ["Maestría en Gestión y Dirección de Proyectos","Maestría","master-thesis","mgdp"],
    ["Maestría en Historia","Maestría","master-thesis","mh"],
    ["Maestría en Infancia","Maestría","master-thesis","mi"],
    ["Maestría en Ingeniería de Sistemas y Computación","Maestría","master-thesis","misc"],
    ["Maestría en Ingeniería Eléctrica","Maestría","master-thesis","mie"],
    ["Maestría en Ingeniería Mecánica","Maestría","master-thesis","mim"],
    ["Maestría en Instrumentación Física","Maestría","master-thesis","mif"],
    ["Maestría en Investigación Operativa y Estadística","Maestría","master-thesis","mioe"],
    ["Maestría en Lingüística","Maestría","master-thesis","ml"],
    ["Maestría en Literatura","Maestría","master-thesis","mali"],
    ["Maestría en Matemática","Maestría","master-thesis","mm"],
    ["Maestría en Migraciones Internacionales","Maestría","master-thesis","mmi"],
    ["Maestría en Música","Maestría","master-thesis","mamu"],
    ["Maestría en Sistemas Automáticos de Producción","Maestría","master-thesis","msap"],
    ["Maestría en Sistemas Integrados de Gestión de la Calidad","Maestría","master-thesis","msigc"],
    ["Doctorado en Biotecnología","Doctorado","doctoral-thesis","db"],
    ["Doctorado en Ciencias","Doctorado","doctoral-thesis","dc"],
    ["Doctorado en Ciencias Ambientales","Doctorado","doctoral-thesis","dca"],
    ["Doctorado en Ciencias Biomédicas","Doctorado","doctoral-thesis","dcb"],
    ["Doctorado en Didáctica","Doctorado","doctoral-thesis","dd"],
    ["Doctorado en Ingeniería","Doctorado","doctoral-thesis","di"],
    ["Doctorado en Literatura","Doctorado","doctoral-thesis","dl"],
  ];
  const PROGRAMS_SORTED = PROGRAMS.slice().sort((a, b) => b[0].length - a[0].length);
  function findProgram(text) {
    const d = deacc(text).replace(/\s+/g, ' ');
    for (const [name, level, code, abbr] of PROGRAMS_SORTED) {
      const dn = deacc(name).replace(/\s+/g, ' ');
      if (d.indexOf(dn) !== -1) return { name, level, code, abbr };
    }
    return null;
  }
  function programByAbbr(abbr) { const p = PROGRAMS.find(x => x[3] === abbr); return p ? { name: p[0], level: p[1], code: p[2], abbr: p[3] } : null; }

  /* ---------- Año y tipo de recurso detectados en la portada ---------- */
  const CITY_RE = /\b(pereira|risaralda|bogota|medellin|cali|barranquilla|cartagena|manizales|armenia|ibague|pasto|neiva|monteria|popayan|colombia)\b/;
  function extractYear(pages, meta) {
    const cur = new Date().getFullYear();
    let cand = [];
    pages.forEach(pg => pg.lines.forEach((ln, i) => {
      const m = ln.text.match(/\b(19[5-9]\d|20[0-4]\d)\b/g);
      if (m) m.forEach(y => cand.push({ year: y, text: ln.text, page: pg.n, idx: i }));
    }));
    cand = cand.filter(c => +c.year <= cur + 1);
    if (!cand.length) {
      if (meta && meta.CreationDate) {
        const m = String(meta.CreationDate).match(/D:(\d{4})/);
        if (m) return { value: m[1], where: 'metadatos del PDF (fecha de creación)', level: 'baja' };
      }
      return null;
    }
    const p1 = cand.filter(c => c.page === 1);
    const cityP1 = p1.filter(c => CITY_RE.test(deacc(c.text)));
    if (cityP1.length) { const b = cityP1.sort((a, b) => b.idx - a.idx)[0]; return { value: b.year, where: 'página 1, junto al lugar de publicación («' + b.text + '»)', level: 'alta' }; }
    if (p1.length) {
      const standalone = p1.filter(c => c.text.trim().length <= 6);
      const pick = (standalone.length ? standalone : p1).sort((a, b) => b.idx - a.idx)[0];
      return { value: pick.year, where: 'página 1 («' + pick.text + '»)', level: standalone.length ? 'media' : 'baja' };
    }
    const any = cand.sort((a, b) => a.page - b.page)[0];
    return { value: any.year, where: 'página ' + any.page + ' («' + any.text + '»)', level: 'baja' };
  }

  const TYPE_RULES = [
    [/optar\s+(?:al|el)\s+titulo\s+de\s+doctor|tesis\s+doctoral|doctorado\s+en/, 'doctoral-thesis', 'alta'],
    [/optar\s+(?:al|el)\s+titulo\s+de\s+magister|maestria\s+en/, 'master-thesis', 'alta'],
    [/optar\s+(?:al|el)\s+titulo\s+de\s+especialista|especializacion\s+en/, 'specialization-thesis', 'alta'],
    [/optar\s+(?:al|el)\s+titulo\s+de\s+tecnolog|tecnologia\s+en/, 'technology-thesis', 'alta'],
    [/optar\s+(?:al|el)\s+titulo\s+de\s+ingenier|optar\s+(?:al|el)\s+titulo\s+de\s+licenciad|optar\s+(?:al|el)\s+titulo\s+profesional/, 'undergraduate-thesis', 'alta'],
    [/\bmagister\b/, 'master-thesis', 'media'],
    [/\bespecialista\b/, 'specialization-thesis', 'media'],
    [/\btecnologo\b/, 'technology-thesis', 'media'],
    [/trabajo de grado[\s\S]{0,40}ingenier|ingenier[\s\S]{0,40}trabajo de grado/, 'undergraduate-thesis', 'media'],
    [/ponencia|memorias del congreso|conferencia internacional/, 'conference-paper', 'media'],
    [/\bissn\b/, 'journal-article', 'media'],
    [/capitulo de libro/, 'book-chapter', 'media'],
    [/\bisbn\b/, 'book', 'media'],
    [/informe tecnico/, 'technical-report', 'media'],
    [/informe de investigacion/, 'research-report', 'media'],
    [/documento de trabajo/, 'working-paper', 'media'],
    [/conjunto de datos|\bdataset\b/, 'dataset', 'media']
  ];
  function extractType(pages) {
    const text = pages.slice(0, 2).map(pg => pg.lines.map(l => l.text).join(' \n ')).join(' \n ');
    const prog = findProgram(text);
    if (prog) { const t = TYPES.find(x => x[0] === prog.code); return { value: prog.code, label: t ? t[1] : prog.code, where: 'programa reconocido en la portada: «' + prog.name + '» (' + prog.level + ')', level: 'alta', program: prog.name, abbr: prog.abbr }; }
    const d = deacc(text);
    for (const [re, code, level] of TYPE_RULES) {
      if (re.test(d)) { const t = TYPES.find(x => x[0] === code); return { value: code, label: t ? t[1] : code, where: 'texto de la portada', level }; }
    }
    return null;
  }

  async function detectAuthor(file) {
    if (typeof pdfjsLib === 'undefined') return { state: 'error', reason: 'No se pudo cargar el lector de PDF (pdf.js). Escribe el autor manualmente.' };
    let pdf;
    try {
      const buf = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
    } catch (e) {
      return { state: 'error', reason: 'El PDF no se pudo abrir (' + ((e && e.message) || e) + '). Puede estar protegido o dañado.' };
    }
    try {
      const total = pdf.numPages, scan = Math.min(total, 5);
      const pages = []; let chars = 0;
      for (let n = 1; n <= scan; n++) {
        const pg = await pdf.getPage(n);
        const lines = await pageLines(pg);
        pages.push({ n, lines });
        chars += lines.reduce((a, l) => a + l.text.length, 0);
      }
      let meta = null;
      try { const m = await pdf.getMetadata(); meta = (m && m.info) || null; } catch (_) { /* sin metadatos */ }
      const res = pickAuthor(pages, meta);
      res.yearInfo = extractYear(pages, meta);
      res.typeInfo = extractType(pages);
      res.total = total; res.scanned = scan; res.hasText = chars > 20;
      if (res.principal) res.state = 'done';
      else {
        res.state = 'none';
        res.reason = res.hasText ? 'no se encontró un autor en las primeras ' + scan + ' páginas del PDF.' : 'el PDF no tiene texto seleccionable (probablemente es un escaneo).';
      }
      return res;
    } catch (e) {
      return { state: 'error', reason: 'Error al analizar el PDF (' + ((e && e.message) || e) + ').' };
    } finally {
      try { pdf.destroy(); } catch (_) { /* nada */ }
    }
  }

  let detectChain = Promise.resolve();
  function queueDetect(r) {
    r.det = { state: 'pending' };
    refresh();
    detectChain = detectChain.then(() => runDetect(r)).catch(() => { /* ya se informa por fila */ });
  }
  async function runDetect(r) {
    if (!state.rows.includes(r)) return;
    const det = await detectAuthor(r.file);
    if (!state.rows.includes(r)) return;
    r.det = det;
    const el = document.querySelector('.row[data-uid="' + r.uid + '"]');
    if (det.principal && !r.authorTouched) {
      r.author = det.principal.surnames;
      const inp = el && el.querySelector('[data-k="author"]');
      if (inp) inp.value = r.author;
    }
    if (det.yearInfo && !r.yearTouched) {
      r.year = det.yearInfo.value;
      const inp = el && el.querySelector('[data-k="year"]');
      if (inp) inp.value = r.year;
    }
    if (det.typeInfo && !r.typeTouched) {
      r.type = det.typeInfo.value;
      const sel = el && el.querySelector('[data-k="type"]');
      if (sel) sel.value = r.type;
      r.programAbbr = det.typeInfo.abbr || null;
    }
    assignIdent(r);
    refresh();
  }
  function startDetect(r) {
    if (!r.file) return;
    if (r.sniff === 'pdf') { queueDetect(r); return; }
    r.det = { state: 'skip', reason: r.sniff === 'empty' ? 'El archivo está vacío, no se puede leer el autor.' : (r.ext === 'pdf' ? 'El archivo no parece un PDF real, así que no se puede leer el autor.' : 'La identificación automática del autor solo aplica a PDF. Escribe el autor manualmente.') };
    assignIdent(r);
  }
  function detectHTML(r) {
    const d = r.det;
    if (!d) return '';
    const redo = '<button class="chip" type="button" data-act="redetect">Detectar de nuevo</button>';
    if (d.state === 'pending') return '<span>Leyendo las primeras páginas del PDF para identificar al autor principal…</span>';
    if (d.state === 'skip') return '<span>' + esc(d.reason) + '</span>';
    if (d.state === 'error') return '<span><b>No se pudo identificar el autor.</b> ' + esc(d.reason) + '</span>' + redo;
    if (d.state === 'none') return '<span><b>No se pudo identificar el autor:</b> ' + esc(d.reason) + ' Escríbelo manualmente.</span>' + redo;
    const p = d.principal;
    let h = '<span><b>Autor:</b> «' + esc(p.full) + '» (' + esc(p.where) + ').</span>';
    if (r.authorTouched && slug(r.author) !== slug(p.surnames)) h += '<button class="chip" type="button" data-act="useDetected">Usar «' + esc(p.surnames) + '»</button>';
    (d.alts || []).forEach((a, i) => { h += '<button class="chip" type="button" data-act="useAlt" data-i="' + i + '" title="' + esc(a.full) + '">Usar «' + esc(a.surnames) + '»</button>'; });
    if (d.yearInfo) h += '<span><b>Año:</b> ' + esc(d.yearInfo.value) + ' (' + esc(d.yearInfo.where) + ').</span>';
    else h += '<span>No se encontró un año en la portada; escríbelo.</span>';
    if (d.typeInfo) h += '<span><b>Tipo:</b> ' + esc(d.typeInfo.label) + (d.typeInfo.program ? ' — programa: ' + esc(d.typeInfo.program) + ' («' + esc(d.typeInfo.abbr) + '»)' : '') + '.</span>';
    if (r.identGroup) h += '<span><b>Identificador:</b> serie de «' + esc(groupLabelFor(r.identGroup)) + '».</span>';
    else h += '<span>No se pudo determinar el tipo de recurso; selecciónalo.</span>';
    return h + redo;
  }

  /* ---------- Cálculo y validación de una fila ---------- */
  function compute(r, dupCount) {
    const errors = [], warns = [], infos = [];
    const bad = {};

    // Tipo
    if (!r.type) { if (!r.file) errors.push('Selecciona el tipo de recurso.'); bad.type = 1; }
    else if (!TYPE_CODES.has(r.type)) { errors.push('El tipo de recurso no está en el vocabulario controlado.'); bad.type = 1; }

    // Autor
    const rawAuthor = r.author.trim();
    const author = slug(rawAuthor);
    if (!rawAuthor) { errors.push('Escribe el apellido del autor principal.'); bad.author = 1; }
    else if (!author) { errors.push('El autor no contiene letras ni números válidos.'); bad.author = 1; }
    else {
      if (author !== rawAuthor) infos.push('Autor normalizado: «' + rawAuthor + '» → ' + author);
      const tokens = rawAuthor.split(/[\s,;_-]+/).filter(t => t && !PARTICLES.has(deacc(t)));
      if (/,/.test(rawAuthor) || tokens.length > 2) warns.push('El autor tiene ' + tokens.length + ' palabras. Verifica que sea solo el apellido (o apellidos) del autor principal y no incluya nombres de pila.');
    }

    // Año
    const rawYear = r.year.trim();
    if (!/^\d{4}$/.test(rawYear)) { if (!(r.file && !rawYear)) errors.push('El año debe tener cuatro dígitos (por ejemplo, ' + thisYear + ').'); bad.year = 1; }
    else {
      const y = +rawYear;
      if (y < 1900) { errors.push('El año ' + rawYear + ' es anterior a 1900.'); bad.year = 1; }
      else if (y > thisYear + 1) { warns.push('El año ' + rawYear + ' es posterior al año en curso.'); }
    }

    // Identificador
    const rawId = r.ident.trim();
    let ident = slug(rawId).replace(/-/g, '');
    if (!rawId) { errors.push('Escribe el identificador del registro.'); bad.ident = 1; }
    else if (!ident) { errors.push('El identificador no contiene caracteres válidos.'); bad.ident = 1; }
    else {
      if (/^\d{1,3}$/.test(ident)) {
        const padded = pad(ident, 4);
        infos.push('Identificador completado a cuatro dígitos: ' + rawId + ' → ' + padded);
        ident = padded;
      } else if (ident !== rawId) {
        infos.push('Identificador normalizado: «' + rawId + '» → ' + ident);
      }
      if (!/^\d{4}$/.test(ident)) warns.push('El identificador «' + ident + '» no sigue el formato de cuatro dígitos usado en los ejemplos oficiales.');
    }

    // Versión (opcional)
    let ver = '';
    const rawVer = r.ver.trim().toLowerCase();
    if (rawVer) {
      const m = rawVer.match(/^v?(\d{1,2})$/);
      if (!m) { errors.push('La versión debe escribirse como v01, v02, etc.'); bad.ver = 1; }
      else {
        ver = 'v' + pad(m[1], 2);
        if (ver !== rawVer) infos.push('Versión normalizada: «' + r.ver.trim() + '» → ' + ver);
      }
    }

    // Extensión
    let ext = (r.ext || '').trim().replace(/^\./, '');
    if (!ext) { errors.push(r.file ? 'El archivo no tiene extensión.' : 'Escribe la extensión del archivo (por ejemplo, pdf).'); bad.ext = 1; }
    else {
      const lower = slug(ext).replace(/-/g, '');
      if (!lower) { errors.push('La extensión no es válida.'); bad.ext = 1; ext = ''; }
      else {
        if (lower !== ext) infos.push('Extensión en minúsculas: .' + ext + ' → .' + lower);
        ext = lower;
      }
    }

    // Autor identificado en el PDF
    const det = r.det;
    if (det && det.state === 'done') {
      const pr = det.principal;
      if (r.authorTouched && author && slug(r.author) !== slug(pr.surnames)) warns.push('El autor escrito difiere del detectado en el PDF («' + pr.full + '» → ' + slug(pr.surnames) + '). Verifica cuál es el autor principal.');
      if (pr.level !== 'alta' && pr.levelNote) warns.push('Detección de confianza ' + pr.level + ' para el autor: ' + pr.levelNote);
      if (pr.assumption) warns.push(pr.assumption);
      if (det.groupSize > 1) warns.push('El PDF menciona ' + det.groupSize + ' autores (' + det.groupNames.join('; ') + '). Se usó el primero como autor principal.');
      if (det.yearInfo && r.yearTouched && rawYear && rawYear !== det.yearInfo.value) warns.push('El año escrito difiere del detectado en la portada (' + det.yearInfo.value + '). Verifica cuál es correcto.');
      if (det.yearInfo && det.yearInfo.level !== 'alta' && !r.yearTouched) warns.push('El año se tomó de forma menos directa (' + det.yearInfo.where + '). Verifica que sea correcto.');
      if (det.typeInfo && r.typeTouched && r.type && r.type !== det.typeInfo.value) warns.push('El tipo de recurso elegido difiere del detectado en la portada (' + det.typeInfo.label + '). Verifica cuál es correcto.');
      if (det.typeInfo && det.typeInfo.level !== 'alta' && !r.typeTouched) warns.push('El tipo de recurso se dedujo de una mención general en el texto, no de la frase «para optar al título de…». Verifica que sea correcto.');
    }
    if ((!det || det.state !== 'done' || !det.yearInfo) && r.file && !rawYear) errors.push('No se detectó el año en la portada. Escríbelo.');
    if ((!det || det.state !== 'done' || !det.typeInfo) && r.file && !r.type) errors.push('No se detectó el tipo de recurso en la portada. Selecciónalo.');

    // Palabras no permitidas
    if (/final|definitivo/i.test(rawAuthor + ' ' + rawId + ' ' + r.ver)) warns.push('Evita términos como final, final2 o definitivo en el nombre.');

    // Formato real
    if (r.file && ext && r.sniff) {
      const want = expectedKind(ext);
      if (r.sniff === 'empty') warns.push('El archivo está vacío (0 bytes).');
      else if (want && r.sniff !== want) warns.push('La extensión .' + ext + ' no coincide con el contenido: el archivo parece ' + (SNIFF_LABEL[r.sniff] || 'otro formato') + '. La extensión debe corresponder al formato real.');
    }

    const progAbbr = (!r.typeTouched && r.programAbbr) ? r.programAbbr : '';
    const name = 'utp_' + r.type + (progAbbr ? '_' + progAbbr : '') + '_' + author + '_' + rawYear + '_' + ident + (ver ? '_' + ver : '') + (ext ? '.' + ext : '');
    const partsOk = r.type && author && /^\d{4}$/.test(rawYear) && ident && ext;

    if (partsOk && dupCount && dupCount[name] > 1) errors.push('Este nombre se repite en el lote. Cambia el identificador o la versión para que cada archivo sea único.');

    const status = errors.length ? 'err' : (warns.length ? 'warn' : 'ok');
    return { name, errors, warns, infos, status, bad, parts: { type: r.type, author, year: rawYear, ident, ver, ext, prog: progAbbr }, valid: !errors.length };
  }

  /* ---------- Render ---------- */
  function typeOptions(sel) {
    let html = '<option value=""' + (!sel ? ' selected' : '') + '>Selecciona un tipo</option>';
    let group = '';
    TYPES.forEach(t => {
      if (t[2] !== group) { if (group) html += '</optgroup>'; html += '<optgroup label="' + t[2] + '">'; group = t[2]; }
      html += '<option value="' + t[0] + '"' + (t[0] === sel ? ' selected' : '') + '>' + esc(t[1]) + ' (' + t[0] + ')</option>';
    });
    return html + '</optgroup>';
  }

  function rowHTML(r) {
    return '<article class="row' + (r.file ? '' : ' manual') + '" data-uid="' + r.uid + '" data-status="ok">' +
      '<div class="row-head">' +
        '<div class="orig"><span class="lbl">' + (r.file ? 'Archivo original' : 'Nombre sin archivo') + '</span>' +
        '<span class="origname">' + (r.file ? esc(r.orig) : 'Solo se genera el nombre') + '</span></div>' +
        '<button class="btn-quiet" type="button" data-act="remove" aria-label="Quitar ' + esc(r.orig || 'esta fila') + '">Quitar</button>' +
      '</div>' +
      '<div class="fields">' +
        '<label class="f f-type" data-f="type">Tipo de recurso<select data-k="type">' + typeOptions(r.type) + '</select></label>' +
        '<label class="f f-author" data-f="author">Autor principal (apellidos)<input data-k="author" type="text" autocomplete="off" placeholder="Ej.: García López" value="' + esc(r.author) + '"></label>' +
        '<label class="f f-year" data-f="year">Año<input data-k="year" inputmode="numeric" maxlength="4" autocomplete="off" value="' + esc(r.year) + '"></label>' +
        '<label class="f f-id" data-f="ident">Identificador<input data-k="ident" autocomplete="off" value="' + esc(r.ident) + '"></label>' +
        '<label class="f f-ver" data-f="ver">Versión (opcional)<input data-k="ver" autocomplete="off" placeholder="v01" value="' + esc(r.ver) + '"></label>' +
        (r.file ? '' : '<label class="f f-ext" data-f="ext">Extensión<input data-k="ext" autocomplete="off" placeholder="pdf" value="' + esc(r.ext) + '"></label>') +
      '</div>' +
      '<div class="detect"></div>' +
      '<div class="out">' +
        '<code class="newname" aria-live="polite"></code>' +
        '<div class="out-side"><span class="badge-st"></span><button class="btn alt btn-sm" type="button" data-act="copy">Copiar nombre</button></div>' +
      '</div>' +
      '<ul class="flags"></ul>' +
    '</article>';
  }

  function nameHTML(c) {
    const p = c.parts;
    const seg = (k, v, ph) => '<span class="seg' + (v ? '' : ' empty') + '" data-k="' + k + '">' + esc(v || ph) + '</span>';
    const us = '<span class="us">_</span>';
    return seg('inst', 'utp', 'utp') + us + seg('type', p.type, 'tipo') + (p.prog ? us + seg('prog', p.prog, '') : '') + us + seg('author', p.author, 'autor') + us +
      seg('year', /^\d{4}$/.test(p.year) ? p.year : '', 'año') + us + seg('id', p.ident, 'id') +
      (p.ver ? us + seg('ver', p.ver, '') : '') + '<span class="us">.</span>' + seg('ext', p.ext, 'ext');
  }

  function computeAll() {
    const base = state.rows.map(r => compute(r));
    const dup = {};
    base.forEach(c => { if (c.parts.type && c.parts.author && c.parts.ident && c.parts.ext) dup[c.name] = (dup[c.name] || 0) + 1; });
    return state.rows.map(r => compute(r, dup));
  }

  const BADGE = { ok: ['Listo', 'ok'], warn: ['Revisar', 'warn'], err: ['Corregir', 'err'] };
  let last = [];

  function refresh() {
    last = computeAll();
    state.rows.forEach((r, i) => {
      const c = last[i];
      const el = $('.row[data-uid="' + r.uid + '"]');
      if (!el) return;
      el.dataset.status = c.status;
      $('.newname', el).innerHTML = nameHTML(c);
      const b = $('.badge-st', el);
      b.textContent = BADGE[c.status][0];
      b.className = 'badge-st ' + BADGE[c.status][1];
      el.querySelectorAll('label.f').forEach(l => l.classList.toggle('bad', !!c.bad[l.dataset.f]));
      $('.detect', el).innerHTML = detectHTML(r);
      $('.flags', el).innerHTML =
        c.errors.map(m => '<li class="err"><b>Corregir:</b>' + esc(m) + '</li>').join('') +
        c.warns.map(m => '<li class="warn"><b>Revisar:</b>' + esc(m) + '</li>').join('') +
        c.infos.map(m => '<li class="info"><b>Nota:</b>' + esc(m) + '</li>').join('');
    });
    renderCounters();
    updateSummary();
  }

  function renderCounters() {
    const keys = Array.from(new Set(state.rows.map(groupKeyFor)));
    const card = $('#countersCard');
    if (!keys.length) { card.hidden = true; return; }
    card.hidden = false;
    const start = Math.max(1, parseInt($('#defStart').value, 10) || 1);
    const rowsHtml = keys.map(k => {
      const next = Object.prototype.hasOwnProperty.call(counters, k) ? counters[k] : start;
      return '<div class="counter-row"><span class="counter-lbl">' + esc(groupLabelFor(k)) + '</span>' +
        '<span class="counter-next">Próximo: <code>' + pad(next) + '</code></span>' +
        '<button class="btn-quiet" type="button" data-reset="' + esc(k) + '">Reiniciar a 1</button></div>';
    }).join('');
    $('#counters').innerHTML = rowsHtml + (counterStorageOk ? '' : '<p class="hint hint-err">Este navegador no permite guardar los contadores (modo privado o almacenamiento bloqueado); se reinician cada vez que recargues la página.</p>');
  }

  function renderAll() {
    const host = $('#rows');
    if (!state.rows.length) {
      host.innerHTML = '<div class="empty-state">Aún no hay archivos. Agrega los que vas a depositar y aquí verás el nombre final de cada uno.</div>';
    } else {
      host.innerHTML = state.rows.map(rowHTML).join('');
    }
    $('#btnClear').hidden = !state.rows.length;
    $('#count').textContent = state.rows.length ? '(' + state.rows.length + ')' : '';
    refresh();
  }

  function updateSummary() {
    const bar = $('#exportbar');
    if (!state.rows.length) { bar.hidden = true; return; }
    bar.hidden = false;
    const ok = last.filter(c => c.valid).length;
    const errs = last.length - ok;
    const warn = last.filter(c => c.status === 'warn').length;
    let t = ok + ' de ' + last.length + ' listos';
    if (errs) t += ', ' + errs + ' con errores';
    if (warn) t += ', ' + warn + ' por revisar';
    $('#sum').textContent = t;
    $('#btnCsv').disabled = !ok;
    $('#btnZip').disabled = !state.rows.some((r, i) => r.file && last[i].valid);
    $('#btnScript').disabled = !state.rows.some((r, i) => r.file && last[i].valid);
  }

  let msgTimer;
  function toast(t) {
    const m = $('#msg'); m.textContent = t;
    clearTimeout(msgTimer); msgTimer = setTimeout(() => { m.textContent = ''; }, 7000);
  }

  /* ---------- Alta y baja de filas ---------- */
  function newRow(file) {
    const r = {
      uid: ++state.uid, file: file || null, orig: file ? file.name : '',
      type: $('#defType').value, author: '', year: $('#defYear').value,
      ident: '', ver: '', ext: file ? extOf(file.name) : '', sniff: null, det: null, authorTouched: false, yearTouched: false, typeTouched: false, identTouched: false, identGroup: null, programAbbr: null
    };
    if (!file) assignIdent(r);
    return r;
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const rows = files.map(newRow);
    state.rows.push(...rows);
    renderAll();
    for (const r of rows) { r.sniff = await sniff(r.file); }
    rows.forEach(startDetect);
    refresh();
    $('#rows').lastElementChild && $('#rows').lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- Exportaciones ---------- */
  function csvCell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function buildCsv() {
    const head = ['nombre_original', 'nombre_nuevo', 'tipo_recurso', 'programa_abreviatura', 'autor', 'anio', 'identificador', 'serie_del_identificador', 'version', 'extension', 'autor_principal_detectado_en_pdf', 'donde_se_detecto'];
    const lines = [head.join(';')];
    state.rows.forEach((r, i) => {
      const c = last[i]; if (!c.valid) return;
      const p = c.parts;
      const dp = r.det && r.det.state === 'done' ? r.det.principal : null;
      lines.push([r.orig, c.name, p.type, p.prog, p.author, p.year, p.ident, r.identGroup ? groupLabelFor(r.identGroup) : '', p.ver, p.ext, dp ? dp.full : '', dp ? dp.where : ''].map(csvCell).join(';'));
    });
    return '\uFEFF' + lines.join('\r\n');
  }
  function buildScript() {
    const q = s => "'" + s.replace(/'/g, "''") + "'";
    const out = [
      '# Renombrado según la Nomenclatura Oficial de Archivos del Repositorio Institucional UTP',
      '# Ejecuta este script en la carpeta que contiene los archivos originales.',
      "$ErrorActionPreference = 'Stop'"
    ];
    state.rows.forEach((r, i) => {
      if (r.file && last[i].valid) out.push('Rename-Item -LiteralPath ' + q(r.orig) + ' -NewName ' + q(last[i].name));
    });
    return out.join('\r\n') + '\r\n';
  }

  /* Descarga estándar del navegador: el archivo se arma aquí mismo y se entrega como descarga. */
  async function saveFile(filename, data) {
    try {
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Descarga iniciada: ' + filename);
    } catch (e) { toast('No se pudo iniciar la descarga.'); }
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  }

  async function makeZip() {
    if (typeof JSZip === 'undefined') { toast('No se pudo cargar la librería ZIP. Usa el script de renombrado o la tabla CSV.'); return; }
    const btn = $('#btnZip'); btn.disabled = true;
    try {
      const zip = new JSZip();
      let n = 0;
      state.rows.forEach((r, i) => { if (r.file && last[i].valid) { zip.file(last[i].name, r.file); n++; } });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, m => { $('#msg').textContent = 'Preparando ZIP… ' + Math.round(m.percent) + '%'; });
      $('#msg').textContent = '';
      await saveFile('archivos-renombrados-utp.zip', blob);
    } catch (e) { toast('No se pudo generar el ZIP: ' + (e.message || e)); }
    finally { updateSummary(); }
  }

  /* ---------- Eventos ---------- */
  function init() {
    $('#defType').innerHTML = typeOptions('');
    $('#defYear').value = String(thisYear);
    const tb = $('#typeTable tbody');
    tb.innerHTML = TYPES.map(t => '<tr><td><code>' + t[0] + '</code></td><td>' + esc(t[1]) + '</td></tr>').join('');
    $('#programTable tbody').innerHTML = PROGRAMS.slice().sort((a, b) => a[0].localeCompare(b[0], 'es')).map(p => '<tr><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td><td><code>' + esc(p[2]) + '</code></td><td><code>' + esc(p[3]) + '</code></td></tr>').join('');

    const pick = $('#filePick');
    $('#btnPick').addEventListener('click', () => pick.click());
    $('#drop').addEventListener('click', e => { if (!e.target.closest('button')) pick.click(); });
    $('#drop').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); pick.click(); } });
    pick.addEventListener('change', () => { addFiles(pick.files); pick.value = ''; });
    $('#btnManual').addEventListener('click', () => { state.rows.push(newRow(null)); renderAll(); const l = $('#rows').lastElementChild; if (l) { const inp = l.querySelector('[data-k="author"]'); inp && inp.focus(); } });

    const drop = $('#drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => addFiles(e.dataTransfer && e.dataTransfer.files));
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());

    $('#btnApplyAll').addEventListener('click', () => {
      const t = $('#defType').value, y = $('#defYear').value;
      state.rows.forEach(r => {
        r.type = t; r.year = y;
        r.typeTouched = t !== ''; r.yearTouched = y.trim() !== '';
        if (!r.identTouched) assignIdent(r, true);
      });
      renderAll();
      toast('Tipo y año aplicados a todas las filas; los identificadores se reasignaron según el nuevo tipo.');
    });
    $('#btnRenumber').addEventListener('click', () => {
      state.rows.forEach(r => { if (!r.identTouched) { r.identGroup = null; r.ident = ''; } });
      state.rows.forEach(r => { if (!r.identTouched) assignIdent(r); });
      renderAll();
      toast('Identificadores asignados según la serie de cada programa o tipo.');
    });
    $('#btnClear').addEventListener('click', () => { state.rows = []; renderAll(); });
    $('#counters').addEventListener('click', e => {
      const b = e.target.closest('button[data-reset]'); if (!b) return;
      if (!confirm('¿Reiniciar a 1 el contador de «' + groupLabelFor(b.dataset.reset) + '»? Esto no afecta a los archivos ya nombrados.')) return;
      delete counters[b.dataset.reset]; counterStorageOk = saveCounters(counters);
      renderCounters();
      toast('Contador reiniciado.');
    });

    const rowsEl = $('#rows');
    rowsEl.addEventListener('input', e => {
      const t = e.target; if (!t.dataset || !t.dataset.k) return;
      const row = t.closest('.row'); const r = state.rows.find(x => x.uid === +row.dataset.uid);
      if (!r) return;
      r[t.dataset.k] = t.value;
      if (t.dataset.k === 'author') r.authorTouched = t.value.trim() !== '';
      if (t.dataset.k === 'year') r.yearTouched = t.value.trim() !== '';
      if (t.dataset.k === 'type') {
        r.typeTouched = t.value !== '';
        assignIdent(r);
        const identInp = row.querySelector('[data-k="ident"]');
        if (identInp) identInp.value = r.ident;
      }
      if (t.dataset.k === 'ident') r.identTouched = t.value.trim() !== '';
      refresh();
    });
    rowsEl.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const row = b.closest('.row'); const idx = state.rows.findIndex(x => x.uid === +row.dataset.uid);
      if (idx < 0) return;
      if (b.dataset.act === 'remove') { state.rows.splice(idx, 1); renderAll(); }
      else if (b.dataset.act === 'redetect') { if (state.rows[idx].file) queueDetect(state.rows[idx]); }
      else if (b.dataset.act === 'useDetected' || b.dataset.act === 'useAlt') {
        const r = state.rows[idx];
        const pick = b.dataset.act === 'useDetected' ? r.det.principal : r.det.alts[+b.dataset.i];
        r.author = pick.surnames; r.authorTouched = b.dataset.act === 'useAlt';
        const inp = row.querySelector('[data-k="author"]'); if (inp) inp.value = r.author;
        refresh();
      }
      else if (b.dataset.act === 'copy') {
        const c = last[idx];
        if (!c.valid) { toast('Corrige los errores de esta fila antes de copiar el nombre.'); return; }
        const ok = await copyText(c.name);
        const old = b.textContent; b.textContent = ok ? 'Copiado' : 'No se pudo copiar';
        setTimeout(() => { b.textContent = old; }, 1600);
      }
    });

    $('#btnCsv').addEventListener('click', () => saveFile('tabla-renombrado-utp.csv', new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' })));
    $('#btnZip').addEventListener('click', makeZip);
    const dlg = $('#dlg');
    $('#btnScript').addEventListener('click', () => { $('#dlgText').value = buildScript(); dlg.showModal(); });
    $('#dlgClose').addEventListener('click', () => dlg.close());
    $('#dlgCopy').addEventListener('click', async () => {
      const ok = await copyText($('#dlgText').value);
      const b = $('#dlgCopy'); const old = b.textContent; b.textContent = ok ? 'Copiado' : 'Selecciona y copia manualmente';
      if (!ok) $('#dlgText').select();
      setTimeout(() => { b.textContent = old; }, 1800);
    });
    $('#dlgSave').addEventListener('click', () => saveFile('renombrar-archivos-utp.ps1.txt', $('#dlgText').value));

    renderAll();
  }
  init();

  /* Utilidades que comparte el módulo de documentación administrativa (admin-trd.js) */
  window.BIC_REN = { $, esc, pad, slug, extOf, sniff, expectedKind, saveFile, copyText, csvCell, thisYear };
})();
