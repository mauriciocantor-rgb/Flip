/* Renombrador de archivos UTP · documentación administrativa según las TRD · Biblioteca e Información Científica (BIC), Universidad Tecnológica de Pereira */
(function () {
  'use strict';
  const { $, esc, pad, slug, extOf, sniff, expectedKind, saveFile, copyText, csvCell, thisYear } = window.BIC_REN;

  /* =========================================================================
     DOCUMENTACIÓN ADMINISTRATIVA — módulo aparte, con su propio estado.
     Reutiliza únicamente utilidades genéricas (slug, esc, pad, deacc, sniff,
     saveFile, copyText, extOf, thisYear) definidas arriba; no toca ni lee el
     estado de la sección académica (state, counters, TYPES, PROGRAMS...).
     ========================================================================= */
const ADM_OFIS = window.BIC_TRD.oficinas;
  const ADM_TRD = window.BIC_TRD.tipologias;
  const ADM_SOP = [['', 'Documento principal'], ['presentacion', 'Presentación'], ['foto', 'Fotografía'], ['video', 'Video'], ['anexo', 'Anexo']];
  const ADM_SOP_EXT = { presentacion: ['pptx', 'pdf'], foto: ['jpg', 'jpeg', 'tif', 'tiff', 'png'], video: ['mp4'], anexo: [] };
  const PREC_TXT = { Y: 'AAAA', M: 'AAAA-MM', D: 'AAAA-MM-DD' };
  const ADM_BANNED = /(^|-)(final|definitivo|definitiva|copia|nuevo|nueva|ultimo|ultima|version|v\d+|borrador)(-|$)/;
  const ADMIN_COUNTERS_KEY = 'utp_renombrador_trd_consecutivos_v1';
  function admLoadCounters() { try { return JSON.parse(localStorage.getItem(ADMIN_COUNTERS_KEY) || '{}'); } catch (e) { return {}; } }
  function admSaveCounters(o) { try { localStorage.setItem(ADMIN_COUNTERS_KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  let adminCounters = admLoadCounters();
  let adminCounterStorageOk = true;
  const adminState = { rows: [], uid: 0 };

  const trdVal = o => o[0] + '|' + o[1];
  function trdByVal(v) { return ADM_TRD.find(o => trdVal(o) === v) || null; }
  function admTipo(r) {
    const o = trdByVal(r.trd); if (!o) return '';
    const tema = slug(r.tema || '');
    if (r.sop) return r.sop + (tema ? '-' + tema : '');
    return o[1] + (tema ? '-' + tema : '');
  }
  function admPrec(r) {
    if (r.sop) return 'D';
    const o = trdByVal(r.trd); if (!o) return 'YMD';
    const t = o[1];
    if (/^(acta|resolucion|acuerdo|notificacion|boletin|salida|entrada|comprobante|nota|orden-pago|liquidacion|derecho|accion)/.test(t) || t === 'informe-inventario-contable') return 'D';
    if (/^(informe|plan|programa|presupuesto)/.test(t)) return 'YM';
    return 'YMD';
  }
  function admPrecTxt(r) { return admPrec(r).split('').map(p => PREC_TXT[p]).join(' o '); }
  function admParseDate(raw) {
    const s = String(raw || '').trim();
    let m, y, mo, d;
    if ((m = s.match(/^(\d{4})$/))) { y = m[1]; }
    else if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})$/))) { y = m[1]; mo = m[2]; }
    else if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) { y = m[1]; mo = m[2]; d = m[3]; }
    else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = m[1]; mo = m[2]; d = m[3]; }
    else if ((m = s.match(/^(\d{1,2})[-\/.](\d{4})$/))) { y = m[2]; mo = m[1]; }
    else if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) { y = m[3]; mo = m[2]; d = m[1]; }
    else return null;
    if (mo !== undefined) { mo = +mo; if (mo < 1 || mo > 12) return { bad: 'El mes debe estar entre 01 y 12.' }; }
    if (d !== undefined) { d = +d; const last = new Date(+y, mo, 0).getDate(); if (d < 1 || d > last) return { bad: 'Ese día no existe en el mes indicado.' }; }
    return { y, mo: mo !== undefined ? pad(mo, 2) : '', d: d !== undefined ? pad(d, 2) : '', prec: d !== undefined ? 'D' : (mo !== undefined ? 'M' : 'Y') };
  }
  function admIsoDate(r) {
    const pd = admParseDate(r.year); if (!pd || pd.bad) return null;
    const allowed = admPrec(r), order = 'YMD';
    let p = pd.prec;
    if (order.indexOf(p) < order.indexOf(allowed[0])) return null;
    if (order.indexOf(p) > order.indexOf(allowed[allowed.length - 1])) p = allowed[allowed.length - 1];
    return pd.y + (p !== 'Y' ? '-' + pd.mo : '') + (p === 'D' ? '-' + pd.d : '');
  }
  function admCode(r) { const o = trdByVal(r.trd); return (r.ofi && o) ? r.ofi + '-' + o[0] : ''; }
  function admGroupKey(r) { const iso = admIsoDate(r); return admCode(r) + '|' + admTipo(r) + '|' + (iso ? iso.slice(0, 4) : ''); }
  function admGroupLabel(key) { const [c, t, y] = key.split('|'); return c + ' · ' + t + ' · ' + y; }
  function admKeyComplete(key) { const [c, t, y] = key.split('|'); return c && t && y; }
  function admNextForGroup(key) {
    const cur = Object.prototype.hasOwnProperty.call(adminCounters, key) ? adminCounters[key] : 1;
    adminCounters[key] = cur + 1;
    adminCounterStorageOk = admSaveCounters(adminCounters);
    return cur;
  }
  function admAssignIdent(r) {
    if (r.identTouched) return;
    const key = admGroupKey(r);
    if (r.identGroup === key && r.ident) return;
    if (r.identGroup && r.ident && /^\d+$/.test(r.ident) && adminCounters[r.identGroup] === parseInt(r.ident, 10) + 1) {
      adminCounters[r.identGroup] -= 1; adminCounterStorageOk = admSaveCounters(adminCounters);
    }
    if (!admKeyComplete(key)) { r.identGroup = null; r.ident = ''; return; }
    r.identGroup = key;
    r.ident = pad(admNextForGroup(key));
  }

  function admNewRow(file) {
    return {
      uid: ++adminState.uid, file: file || null, orig: file ? file.name : '',
      ofi: $('#admDefOfi').value, trd: $('#admDefTrd').value, sop: $('#admDefSop').value, tema: '',
      year: $('#admDefYear').value, ident: '', ext: file ? extOf(file.name).toLowerCase() : '', sniff: null,
      identTouched: false, identGroup: null
    };
  }

  function admCompute(r) {
    const errors = [], warns = [], infos = [], bad = {};
    const o = trdByVal(r.trd);
    if (!r.ofi) { errors.push('Selecciona la oficina productora.'); bad.ofi = 1; }
    if (!o) { errors.push('Selecciona la serie o subserie TRD.'); bad.trd = 1; }
    if (o && /verificar/.test(o[2])) warns.push('El código ' + o[0] + ' tiene lectura dudosa en la TRD escaneada; confírmalo antes de marcar en lote.');
    if (o && /provisional/.test(o[2])) infos.push('Clasificación provisional en la serie 0100 Informes hasta que la tipología se incluya en la TRD.');
    if (r.ofi && r.ofi !== '124000' && o && o[3] === 'BIC') warns.push('Las tipologías BIC usan la oficina 124000.');
    const rawTema = (r.tema || '').trim(), tema = slug(rawTema);
    if (r.sop && !tema) { errors.push('Escribe un tema corto para el soporte (p. ej., «feria del libro»).'); bad.tema = 1; }
    if (tema && tema.split('-').length > 5) warns.push('El tema es largo; el documento maestro recomienda máximo tres palabras.');
    if (tema && ADM_BANNED.test(tema)) warns.push('Evita «final», «copia», «nuevo» o «versión»: el consecutivo ya distingue los archivos.');
    if (/\d{6,}/.test(rawTema)) warns.push('El tema parece contener un número de identificación; no incluyas datos personales en el nombre.');
    let iso = '';
    const pd = admParseDate(r.year);
    if (!String(r.year || '').trim()) { errors.push('Escribe la fecha (' + admPrecTxt(r) + ').'); bad.year = 1; }
    else if (!pd) { errors.push('La fecha debe ir en formato ISO 8601: ' + admPrecTxt(r) + '.'); bad.year = 1; }
    else if (pd.bad) { errors.push(pd.bad); bad.year = 1; }
    else {
      iso = admIsoDate(r) || '';
      if (!iso) { errors.push('Este tipo pide la fecha como ' + admPrecTxt(r) + '.'); bad.year = 1; }
      else if (iso.length < pd.y.length + (pd.prec === 'Y' ? 0 : pd.prec === 'M' ? 3 : 6)) warns.push('Se recortó la fecha a la precisión que usa este tipo (' + admPrecTxt(r) + ').');
      else if (iso !== String(r.year).trim()) infos.push('Fecha normalizada a ISO 8601: ' + iso + '.');
    }
    let ext = (r.ext || '').trim().replace(/^\./, '');
    if (!ext) { errors.push(r.file ? 'El archivo no tiene extensión.' : 'Escribe la extensión del archivo.'); bad.ext = 1; }
    else { const low = slug(ext).replace(/-/g, ''); if (!low) { errors.push('La extensión no es válida.'); bad.ext = 1; ext = ''; } else ext = low; }
    if (ext && r.sop && ADM_SOP_EXT[r.sop].length && ADM_SOP_EXT[r.sop].indexOf(ext) < 0) warns.push('Formato .' + ext + ' no recomendado para este soporte; usa ' + ADM_SOP_EXT[r.sop].map(e => '.' + e).join(', ') + '.');
    if (ext && !r.sop && ['doc', 'docx', 'odt'].indexOf(ext) >= 0) warns.push('Para conservación se recomienda entregar el documento final en PDF.');
    if (r.file && ext && r.sniff) {
      const want = expectedKind(ext);
      if (r.sniff === 'empty') warns.push('El archivo está vacío (0 bytes).');
      else if (want && r.sniff !== want) warns.push('La extensión .' + ext + ' no coincide con el contenido del archivo.');
    }
    if (!r.ident) { errors.push('Falta el consecutivo (se asigna al completar oficina, serie, tipo y fecha).'); bad.ident = 1; }
    else if (!/^\d{4}$/.test(r.ident)) warns.push('El consecutivo debe tener cuatro dígitos.');
    const code = admCode(r), tipo = admTipo(r);
    const name = 'utp_' + (code || 'codigo') + '_' + (tipo || 'tipo') + '_' + (iso || 'fecha') + '_' + (r.ident || 'id') + (ext ? '.' + ext : '');
    if (name.length > 90) warns.push('El nombre tiene ' + name.length + ' caracteres; procura no pasar de 90.');
    const status = errors.length ? 'err' : (warns.length ? 'warn' : 'ok');
    return { name, errors, warns, infos, status, bad, parts: { code, tipo, year: iso, ident: r.ident, ext }, valid: !errors.length };
  }

  function admCheckDuplicates(list) {
    const counts = {};
    list.forEach(c => { if (c.valid) counts[c.name] = (counts[c.name] || 0) + 1; });
    return list.map(c => { if (c.valid && counts[c.name] > 1) { c.errors.push('Este nombre se repite en el lote. Cambia el consecutivo.'); c.status = 'err'; c.valid = false; } return c; });
  }

  function admOfiOptions(sel) { return ADM_OFIS.map(o => '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[0] + ' · ' + esc(o[1]) + '</option>').join(''); }
  function admTrdOptions(sel) {
    let html = '<option value=""' + (!sel ? ' selected' : '') + '>Selecciona una serie o subserie</option>', group = '';
    ADM_TRD.forEach(o => {
      const g = o[3] === 'BIC' ? 'Tipologías BIC (auditoría)' : o[3];
      if (g !== group) { if (group) html += '</optgroup>'; html += '<optgroup label="' + esc(g) + '">'; group = g; }
      html += '<option value="' + esc(trdVal(o)) + '"' + (trdVal(o) === sel ? ' selected' : '') + '>' + o[0] + ' · ' + esc(o[2]) + '</option>';
    });
    return html + '</optgroup>';
  }
  function admSopOptions(sel) { return ADM_SOP.map(s => '<option value="' + s[0] + '"' + (s[0] === sel ? ' selected' : '') + '>' + s[1] + '</option>').join(''); }

  function admRowHTML(r) {
    return '<article class="row admin' + (r.file ? '' : ' manual') + '" data-uid="' + r.uid + '" data-status="ok">' +
      '<div class="row-head"><div class="orig"><span class="lbl">' + (r.file ? 'Archivo original' : 'Nombre sin archivo') + '</span>' +
      '<span class="origname">' + (r.file ? esc(r.orig) : 'Solo se genera el nombre') + '</span></div>' +
      '<button class="btn-quiet" type="button" data-act="removeA" aria-label="Quitar">Quitar</button></div>' +
      '<div class="fields">' +
        '<label class="f f-type" data-f="ofi">Oficina productora<select data-k="ofi">' + admOfiOptions(r.ofi) + '</select></label>' +
        '<label class="f f-author" data-f="sop">Soporte<select data-k="sop">' + admSopOptions(r.sop) + '</select></label>' +
        '<label class="f f-trd" data-f="trd">Serie o subserie TRD<select data-k="trd">' + admTrdOptions(r.trd) + '</select></label>' +
        '<label class="f f-tema" data-f="tema">Tema corto' + (r.sop ? '' : ' (opcional)') + '<input data-k="tema" type="text" autocomplete="off" placeholder="Ej.: feria del libro" value="' + esc(r.tema) + '"></label>' +
        '<label class="f f-sop" data-f="year">Fecha<input data-k="year" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="' + esc(admPrecTxt(r)) + '" value="' + esc(r.year) + '"></label>' +
        '<label class="f f-id" data-f="ident">Consecutivo<input data-k="ident" autocomplete="off" value="' + esc(r.ident) + '"></label>' +
        (r.file ? '' : '<label class="f f-ver" data-f="ext">Extensión<input data-k="ext" autocomplete="off" placeholder="pdf" value="' + esc(r.ext) + '"></label>') +
      '</div>' +
      '<div class="out"><code class="newname" aria-live="polite"></code>' +
      '<div class="out-side"><span class="badge-st"></span><button class="btn alt btn-sm" type="button" data-act="copyA">Copiar nombre</button></div></div>' +
      '<ul class="flags"></ul></article>';
  }

  function admNameHTML(c) {
    const p = c.parts;
    const seg = (k, v, ph) => '<span class="seg' + (v ? '' : ' empty') + '" data-k="' + k + '">' + esc(v || ph) + '</span>';
    const us = '<span class="us">_</span>';
    return seg('inst', 'utp', 'utp') + us + seg('type', p.code, 'código') + us + seg('author', p.tipo, 'tipo') + us +
      seg('year', p.year, 'fecha') + us + seg('id', p.ident, 'id') + '<span class="us">.</span>' + seg('ext', p.ext, 'ext');
  }

  let admLast = [];
  function admRefresh() {
    adminState.rows.forEach(r => admAssignIdent(r));
    admLast = admCheckDuplicates(adminState.rows.map(admCompute));
    adminState.rows.forEach((r, i) => {
      const c = admLast[i];
      const el = document.querySelector('#adminRows .row[data-uid="' + r.uid + '"]');
      if (!el) return;
      el.dataset.status = c.status;
      el.querySelector('.newname').innerHTML = admNameHTML(c);
      const idInp = el.querySelector('[data-k="ident"]'); if (idInp && document.activeElement !== idInp) idInp.value = r.ident;
      const dt = el.querySelector('[data-k="year"]'); if (dt) dt.placeholder = admPrecTxt(r);
      const b = el.querySelector('.badge-st');
      b.textContent = c.status === 'err' ? 'Corregir' : (c.status === 'warn' ? 'Revisar' : 'Listo');
      b.className = 'badge-st ' + c.status;
      el.querySelectorAll('label.f').forEach(l => l.classList.toggle('bad', !!c.bad[l.dataset.f]));
      el.querySelector('.flags').innerHTML = c.errors.map(m => '<li class="err"><b>Corregir:</b>' + esc(m) + '</li>').join('') +
        c.warns.map(m => '<li class="warn"><b>Revisar:</b>' + esc(m) + '</li>').join('') +
        c.infos.map(m => '<li class="info"><b>Nota:</b>' + esc(m) + '</li>').join('');
    });
    admRenderCounters();
    admUpdateSummary();
  }

  function admRenderCounters() {
    const keys = Array.from(new Set(adminState.rows.map(r => r.identGroup).filter(Boolean)));
    const card = $('#adminCountersCard');
    if (!keys.length) { card.hidden = true; return; }
    card.hidden = false;
    $('#adminCounters').innerHTML = keys.map(k => {
      const next = Object.prototype.hasOwnProperty.call(adminCounters, k) ? adminCounters[k] : 1;
      return '<div class="counter-row"><span class="counter-lbl"><code>' + esc(admGroupLabel(k)) + '</code></span>' +
        '<span class="counter-next">Próximo: <code>' + pad(next) + '</code></span>' +
        '<button class="btn-quiet" type="button" data-admreset="' + esc(k) + '">Reiniciar a 1</button></div>';
    }).join('') + (adminCounterStorageOk ? '' : '<p class="hint hint-err">Este navegador no permite guardar los consecutivos.</p>');
  }

  function admRenderAll() {
    const host = $('#adminRows');
    host.innerHTML = adminState.rows.length ? adminState.rows.map(admRowHTML).join('') : '<div class="empty-state">Aún no hay documentos administrativos agregados.</div>';
    $('#btnClearAdmin').hidden = !adminState.rows.length;
    $('#adminCount').textContent = adminState.rows.length ? '(' + adminState.rows.length + ')' : '';
    admRefresh();
  }

  function admUpdateSummary() {
    const card = $('#adminExportCard');
    if (!adminState.rows.length) { card.hidden = true; return; }
    card.hidden = false;
    const ok = admLast.filter(c => c.valid).length;
    $('#adminSum').textContent = ok + ' de ' + admLast.length + ' listos' + (admLast.length - ok ? ', ' + (admLast.length - ok) + ' con errores' : '');
    $('#btnCsvAdmin').disabled = !ok;
    $('#btnZipAdmin').disabled = !adminState.rows.some((r, i) => r.file && admLast[i].valid);
    $('#btnScriptAdmin').disabled = !adminState.rows.some((r, i) => r.file && admLast[i].valid);
  }

  async function admAddFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const rows = files.map(admNewRow);
    adminState.rows.push(...rows);
    admRenderAll();
    for (const r of rows) { r.sniff = await sniff(r.file); }
    admRefresh();
  }

  function admBuildCsv() {
    const head = ['nombre_original', 'nombre_nuevo', 'codigo_trd', 'serie_subserie', 'tipo_documental', 'fecha_iso8601', 'consecutivo', 'extension'];
    const lines = [head.join(';')];
    adminState.rows.forEach((r, i) => {
      const c = admLast[i]; if (!c.valid) return;
      const o = trdByVal(r.trd), p = c.parts;
      lines.push([r.orig, c.name, p.code, o ? o[2] : '', p.tipo, p.year, p.ident, p.ext].map(csvCell).join(';'));
    });
    return '\uFEFF' + lines.join('\r\n');
  }
  function admBuildScript() {
    const q = s => "'" + s.replace(/'/g, "''") + "'";
    const out = ['# Renombrado de documentación administrativa — UTP (Documento maestro de nomenclatura BIC v1.0)', "$ErrorActionPreference = 'Stop'"];
    adminState.rows.forEach((r, i) => { if (r.file && admLast[i].valid) out.push('Rename-Item -LiteralPath ' + q(r.orig) + ' -NewName ' + q(admLast[i].name)); });
    return out.join('\r\n') + '\r\n';
  }
  async function admMakeZip() {
    if (typeof JSZip === 'undefined') { $('#adminMsg').textContent = 'No se pudo cargar la librería ZIP.'; return; }
    const zip = new JSZip();
    adminState.rows.forEach((r, i) => { if (r.file && admLast[i].valid) zip.file(admLast[i].name, r.file); });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    await saveFile('documentos-administrativos-utp.zip', blob);
  }

  function initAdmin() {
    $('#admDefOfi').innerHTML = admOfiOptions('124000');
    $('#admDefTrd').innerHTML = admTrdOptions('');
    $('#admDefSop').innerHTML = admSopOptions('');
    $('#admDefYear').value = String(thisYear);
    $('#adminTypeTable tbody').innerHTML = ADM_TRD.filter(o => o[3] !== 'BIC').map(o => '<tr><td><code>' + o[0] + '</code></td><td>' + esc(o[2]) + '</td><td><code>' + esc(o[1]) + '</code></td></tr>').join('');

    const pick = $('#filePickAdmin');
    $('#btnPickAdmin').addEventListener('click', () => pick.click());
    pick.addEventListener('change', () => { admAddFiles(pick.files); pick.value = ''; });
    $('#btnManualAdmin').addEventListener('click', () => { adminState.rows.push(admNewRow(null)); admRenderAll(); });
    $('#btnAdmApplyAll').addEventListener('click', () => {
      adminState.rows.forEach(r => { r.ofi = $('#admDefOfi').value; r.trd = $('#admDefTrd').value; r.sop = $('#admDefSop').value; r.year = $('#admDefYear').value; });
      admRenderAll();
    });

    const drop = $('#dropAdmin');
    drop.addEventListener('click', e => { if (!e.target.closest('button')) pick.click(); });
    drop.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); pick.click(); } });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => admAddFiles(e.dataTransfer && e.dataTransfer.files));

    $('#btnClearAdmin').addEventListener('click', () => { adminState.rows = []; admRenderAll(); });
    $('#adminCounters').addEventListener('click', e => {
      const b = e.target.closest('button[data-admreset]'); if (!b) return;
      if (!confirm('¿Reiniciar a 1 el consecutivo de «' + admGroupLabel(b.dataset.admreset) + '»?')) return;
      delete adminCounters[b.dataset.admreset]; adminCounterStorageOk = admSaveCounters(adminCounters);
      admRenderCounters();
    });

    const rowsEl = $('#adminRows');
    rowsEl.addEventListener('input', e => {
      const t = e.target; if (!t.dataset || !t.dataset.k) return;
      const row = t.closest('.row'); const r = adminState.rows.find(x => x.uid === +row.dataset.uid);
      if (!r) return;
      r[t.dataset.k] = t.value;
      if (t.dataset.k === 'ident') r.identTouched = t.value.trim() !== '';
      if (t.dataset.k === 'sop') { const l = row.querySelector('label.f-tema'); if (l) l.firstChild.textContent = 'Tema corto' + (r.sop ? '' : ' (opcional)'); }
      if (t.dataset.k === 'ident') { admLast = admCheckDuplicates(adminState.rows.map(admCompute)); }
      admRefresh();
    });
    rowsEl.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const row = b.closest('.row'); const idx = adminState.rows.findIndex(x => x.uid === +row.dataset.uid);
      if (idx < 0) return;
      if (b.dataset.act === 'removeA') { adminState.rows.splice(idx, 1); admRenderAll(); }
      else if (b.dataset.act === 'copyA') {
        const c = admLast[idx]; if (!c.valid) return;
        const ok = await copyText(c.name);
        const old = b.textContent; b.textContent = ok ? 'Copiado' : 'No se pudo copiar';
        setTimeout(() => { b.textContent = old; }, 1600);
      }
    });

    $('#btnCsvAdmin').addEventListener('click', () => saveFile('tabla-documentos-administrativos-utp.csv', new Blob([admBuildCsv()], { type: 'text/csv;charset=utf-8' })));
    $('#btnZipAdmin').addEventListener('click', admMakeZip);
    $('#btnScriptAdmin').addEventListener('click', () => { $('#dlgText').value = admBuildScript(); $('#dlg').showModal(); });

    admRenderAll();
  }
  initAdmin();
})();
