/* Enjambre de Redes Sociales · lógica de la interfaz (versión GitHub Pages).
   Motor de IA: Gemini.
   - Con config.servicioIA vacío: "modo Gemini". Cada bot arma la instrucción completa, la copia y abre
     Gemini con la cuenta institucional de Google Workspace; la respuesta se pega de vuelta aquí.
   - Con config.servicioIA definido: la página llama al servicio del CRIE (backend-ia/), que usa la API de Gemini. */
(function () {
  'use strict';
  const { IDENTIDAD, REDES, BOTS, bloqueIdentidad } = window.ENJAMBRE;
  const CFG = window.BIC_ENJAMBRE_CONFIG || {};
  const SERVICIO = String(CFG.servicioIA || '').replace(/\/+$/, '');
  const GEMINI_URL = CFG.geminiUrl || 'https://gemini.google.com/app';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let actual = BOTS[0];
  const resultados = {};   // último resultado por bot en esta sesión
  const borradores = {};   // valores del formulario por bot
  const pendientes = {};   // instrucción armada en modo Gemini, a la espera de la respuesta

  /* Ejemplo inicial, marcado como tal */
  const EJEMPLO = {
    copywriter: `## Instagram · publicación de feed

**Gancho:** ¿Parciales encima y sin dónde estudiar? 📚

**Copy:** En la Biblioteca Jorge Roa Martínez tenemos un lugar para ti. Durante la semana de parciales la sala de estudio amplía su horario [DATO POR CONFIRMAR] y puedes solicitar préstamo de portátiles [DATO POR CONFIRMAR: requisitos].

Ven al Edificio 9, encuentra tu espacio y prepárate con calma. ¡Te acompañamos!

**Llamado a la acción:** Guarda esta publicación y compártela con tu grupo de estudio.

**Hashtags:** #BibliotecaUTP #BibliotecaJorgeRoaMartinez #UTP #Parciales #Pereira

**Variante corta:** Parciales a la vista: la sala de estudio te espera en el Edificio 9. 📚`
  };

  /* ---------- Riel ---------- */
  function pintarRiel() {
    $('#botList').innerHTML = BOTS.map((b, i) =>
      `<li><button type="button" class="bot-btn" data-id="${b.id}" aria-current="${b.id === actual.id}">
        <span class="bot-num">${String(i + 1).padStart(2, '0')}</span>
        <span><span class="bot-name">${esc(b.nombre)}</span><span class="bot-role">${esc(b.rol)}</span></span>
      </button></li>`).join('');
  }

  /* ---------- Formulario ---------- */
  function campoHTML(c) {
    const v = (borradores[actual.id] || {})[c.id];
    const id = `f-${actual.id}-${c.id}`;
    if (c.type === 'redes') {
      const sel = v || ['Instagram'];
      return `<div class="field full"><span class="lbl">${esc(c.label)}</span><div class="chips" role="group" aria-label="${esc(c.label)}">` +
        REDES.map(r => `<label class="chip"><input type="checkbox" id="${id}-${r}" name="redes" value="${r}"${sel.includes(r) ? ' checked' : ''}>${r}</label>`).join('') +
        `</div></div>`;
    }
    if (c.type === 'select') {
      return `<div class="field"><label for="${id}">${esc(c.label)}</label><select id="${id}" name="${c.id}">` +
        c.options.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('') + `</select></div>`;
    }
    if (c.type === 'textarea') {
      return `<div class="field full"><label for="${id}">${esc(c.label)}</label><textarea id="${id}" name="${c.id}" placeholder="${esc(c.placeholder || '')}">${esc(v || '')}</textarea></div>`;
    }
    return `<div class="field"><label for="${id}">${esc(c.label)}</label><input type="text" id="${id}" name="${c.id}" placeholder="${esc(c.placeholder || '')}" value="${esc(v || '')}"></div>`;
  }

  function pintarBot() {
    $('#botTitle').textContent = actual.nombre;
    $('#botRole').textContent = actual.rol;
    $('#botDesc').textContent = actual.desc;
    const n = $('#botNotice');
    n.hidden = !actual.aviso;
    n.textContent = actual.aviso || '';
    $('#botForm').innerHTML = actual.campos.map(campoHTML).join('') +
      `<div class="actions">
        <button class="btn" type="submit" id="btnGo">${SERVICIO ? 'Generar con ' + esc(actual.nombre) : 'Preparar para Gemini'}</button>
        <button class="btn ghost" type="button" id="btnStop" hidden>Detener</button>
        <span class="hint" id="formHint"></span>
      </div>`;
    pintarResultado();
  }

  function leerFormulario() {
    const f = $('#botForm');
    const v = {};
    actual.campos.forEach(c => {
      if (c.type === 'redes') v.redes = [...f.querySelectorAll('input[name=redes]:checked')].map(i => i.value);
      else v[c.id] = (f.elements[c.id] && f.elements[c.id].value || '').trim();
    });
    return v;
  }

  /* Markdown mínimo y seguro */
  function inline(s) {
    return esc(s)
      .replace(/\[(DATO|FECHA|NOMBRE)([^\]]*)\]/g, '<span class="ph">[$1$2]</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function md(src) {
    const lines = String(src).replace(/\r/g, '').split('\n');
    let html = '', i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*\|.*\|\s*$/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const body = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
        const [h, ...rest] = body;
        html += '<div class="tbl"><table><thead><tr>' + cells(h).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rest.map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      let m;
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { html += `<h4>${inline(m[2])}</h4>`; i++; continue; }
      if (/^\s*[-*•]\s+/.test(l)) {
        html += '<ul>';
        while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^\s*[-*•]\s+/, ''))}</li>`; i++; }
        html += '</ul>'; continue;
      }
      if (/^\s*\d+[.)]\s+/.test(l)) {
        html += '<ol>';
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>`; i++; }
        html += '</ol>'; continue;
      }
      if (/^\s*(---|\*\*\*)\s*$/.test(l)) { i++; continue; }
      if (l.trim() === '') { i++; continue; }
      const para = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|\s*\|)/.test(lines[i])) { para.push(lines[i]); i++; }
      html += `<p>${para.map(inline).join('<br>')}</p>`;
    }
    return html;
  }

  /* ---------- Copiar al portapapeles ---------- */
  async function copiar(texto, nodoRespaldo) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch (_) {
      if (nodoRespaldo) {
        const r = document.createRange(); r.selectNodeContents(nodoRespaldo);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      return false;
    }
  }

  /* ---------- Motor de IA ---------- */
  const ERRORES_SERVICIO = {
    400: 'La solicitud no es válida. Revisa el texto e inténtalo de nuevo.',
    413: 'El texto es demasiado largo. Pega un extracto más corto.',
    429: 'Se alcanzó el límite de solicitudes por ahora. Espera un minuto e inténtalo de nuevo.',
    502: 'Gemini no respondió. Inténtalo de nuevo en unos minutos.',
    503: 'El servicio de IA no está disponible. Usa el modo Gemini mientras se restablece.'
  };

  /* Pinta en `out` el panel del modo Gemini: copiar la instrucción, abrir Gemini y pegar la respuesta. */
  function panelGemini(out, prompt, alUsar) {
    out.innerHTML = `
      <div class="gem">
        <p class="gem-h"><strong>Instrucción lista para Gemini</strong> · ${prompt.length.toLocaleString('es-CO')} caracteres</p>
        <ol class="gem-steps">
          <li>Pulsa «Copiar y abrir Gemini». Se abrirá Gemini en otra pestaña con tu cuenta institucional.</li>
          <li>Pega la instrucción en Gemini (Ctrl+V o Cmd+V) y envíala.</li>
          <li>Copia la respuesta de Gemini, pégala abajo y pulsa «Usar respuesta».</li>
        </ol>
        <div class="row">
          <a class="btn" href="${esc(GEMINI_URL)}" target="_blank" rel="noopener" data-gem="abrir">Copiar y abrir Gemini ↗</a>
          <button class="btn ghost" type="button" data-gem="copiar">Copiar instrucción</button>
          <span class="hint" data-gem="estado" aria-live="polite"></span>
        </div>
        <details class="gem-ver"><summary>Ver la instrucción</summary><pre data-gem="prompt"></pre></details>
        <div class="field full gem-resp">
          <label>Respuesta de Gemini<textarea rows="6" data-gem="resp" placeholder="Pega aquí la respuesta de Gemini"></textarea></label>
        </div>
        <div class="row"><button class="btn" type="button" data-gem="usar">Usar respuesta</button></div>
      </div>`;
    const pre = out.querySelector('[data-gem="prompt"]');
    pre.textContent = prompt;
    const estado = out.querySelector('[data-gem="estado"]');
    out.querySelector('[data-gem="abrir"]').addEventListener('click', async () => {
      const ok = await copiar(prompt);
      estado.textContent = ok ? 'Instrucción copiada. Pégala en Gemini.' : 'No se pudo copiar solo: usa «Ver la instrucción» y cópiala a mano.';
    });
    out.querySelector('[data-gem="copiar"]').addEventListener('click', async () => {
      const det = out.querySelector('.gem-ver'); det.open = true;
      const ok = await copiar(prompt, pre);
      estado.textContent = ok ? 'Instrucción copiada.' : 'Texto seleccionado: cópialo con Ctrl+C.';
    });
    out.querySelector('[data-gem="usar"]').addEventListener('click', () => {
      const t = out.querySelector('[data-gem="resp"]').value.trim();
      if (!t) { estado.textContent = 'Pega primero la respuesta de Gemini.'; return; }
      alUsar(t);
    });
  }

  /* Ejecuta una instrucción: con el servicio del CRIE si está configurado; si no, modo Gemini.
     alTerminar(texto) se llama cuando hay respuesta. Devuelve una función para cancelar (o null). */
  function ejecutar(prompt, out, alTerminar) {
    if (!SERVICIO) { panelGemini(out, prompt, alTerminar); return null; }
    const ctl = new AbortController();
    out.innerHTML = '<p class="thinking">Gemini está trabajando…</p>';
    fetch(SERVICIO + '/api/generar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }), signal: ctl.signal
    }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.texto) throw { status: r.status, msg: j.error };
      alTerminar(j.texto);
    }).catch(e => {
      if (e && e.name === 'AbortError') { out.innerHTML = '<p class="hint">Generación detenida.</p>'; return; }
      const msg = (e && ERRORES_SERVICIO[e.status]) || 'No se pudo conectar con el servicio de IA.';
      out.innerHTML = `<p class="err">${esc(msg)}</p><p class="hint">Mientras tanto puedes usar el modo Gemini:</p><div data-gem-fallback></div>`;
      panelGemini(out.querySelector('[data-gem-fallback]'), prompt, alTerminar);
    });
    return () => ctl.abort();
  }

  /* ---------- Resultado ---------- */
  function pintarResultado() {
    const r = resultados[actual.id];
    const tag = $('#outTag');
    const out = $('#output');
    $('#outTitle').textContent = `Resultado · ${actual.nombre}`;
    $('#btnSend').hidden = true; $('#btnCopy').hidden = true;
    if (r && r.texto) {
      tag.hidden = false; tag.className = 'tag'; tag.textContent = SERVICIO ? 'Generado' : 'Respuesta de Gemini';
      out.innerHTML = md(r.texto);
      $('#btnCopy').hidden = false;
      $('#btnSend').hidden = !(actual.id === 'prompts' || actual.id === 'guiones');
    } else if (pendientes[actual.id]) {
      tag.hidden = false; tag.className = 'tag example'; tag.textContent = 'En Gemini';
      panelGemini(out, pendientes[actual.id], guardarResultado(actual));
    } else if (EJEMPLO[actual.id]) {
      tag.hidden = false; tag.className = 'tag example'; tag.textContent = 'Ejemplo';
      out.innerHTML = md(EJEMPLO[actual.id]);
    } else {
      tag.hidden = true;
      out.innerHTML = `<p class="hint">Completa el formulario y pulsa «${SERVICIO ? 'Generar con ' + esc(actual.nombre) : 'Preparar para Gemini'}». ${SERVICIO ? 'El resultado aparecerá aquí' : 'La herramienta preparará la instrucción para Gemini'}, ajustado a la identidad de @bibliotecautp.</p>`;
    }
  }

  function guardarResultado(bot) {
    return texto => {
      resultados[bot.id] = { texto };
      delete pendientes[bot.id];
      if (actual === bot) pintarResultado();
    };
  }

  function armarPrompt(v) {
    const datos = Object.assign({}, v, { redes: (v.redes || []).join(', ') || 'Instagram' });
    return [
      `Actúa como el bot "${actual.nombre}" (${actual.rol}) del Enjambre de Marketing Digital de la Biblioteca Jorge Roa Martínez de la Universidad Tecnológica de Pereira. Eres community manager experto en redes sociales bibliotecarias y universitarias.`,
      bloqueIdentidad(),
      'TAREA:',
      actual.tarea(datos),
      'FORMATO DE RESPUESTA: español de Colombia; Markdown con títulos "##", listas y tablas con barras verticales cuando ayuden. Sin preámbulos ni despedidas. Cada entregable debe respetar la identidad de marca anterior (colores con su hex, logo búho-libro, tono). Nunca inventes datos institucionales: usa [DATO POR CONFIRMAR].'
    ].join('\n\n');
  }

  let cancelar = null;
  function generar(e) {
    e.preventDefault();
    const v = leerFormulario();
    borradores[actual.id] = v;
    const faltante = actual.campos.find(c => c.required && !v[c.id]);
    if (faltante) { $('#formHint').textContent = `Completa «${faltante.label}».`; return; }
    if (actual.campos.some(c => c.type === 'redes') && !v.redes.length) { $('#formHint').textContent = 'Elige al menos una red social.'; return; }
    $('#formHint').textContent = '';
    const bot = actual;
    const prompt = armarPrompt(v);
    delete resultados[bot.id];
    if (!SERVICIO) { pendientes[bot.id] = prompt; pintarResultado(); return; }
    const go = $('#btnGo'), stop = $('#btnStop');
    go.disabled = true; stop.hidden = false;
    $('#outTag').hidden = false; $('#outTag').className = 'tag'; $('#outTag').textContent = 'Generando';
    $('#btnCopy').hidden = true; $('#btnSend').hidden = true;
    const fin = guardarResultado(bot);
    cancelar = ejecutar(prompt, $('#output'), t => { fin(t); go.disabled = false; stop.hidden = true; cancelar = null; });
    // Si el servicio falla, ejecutar() muestra el modo Gemini: se liberan los botones.
    setTimeout(() => { if (!resultados[bot.id] && !document.querySelector('#output .thinking')) { go.disabled = false; stop.hidden = true; } }, 1500);
  }

  /* ---------- Identidad ---------- */
  function pintarIdentidad() {
    $('#swatches').innerHTML = IDENTIDAD.paleta.map(c =>
      `<div class="sw"><i style="background:${c.hex}"></i><span><b>${esc(c.nombre)}</b><code>${c.hex}</code></span></div>`).join('');
    $('#idNotes').innerHTML = [
      `<strong>Logo de las piezas:</strong> ${esc(IDENTIDAD.logo)}`,
      `<strong>Tipografía:</strong> ${esc(IDENTIDAD.tipografia)}`,
      `<strong>Plantilla de recomendados:</strong> ${esc(IDENTIDAD.plantillas)}`,
      `<strong>Tono:</strong> ${esc(IDENTIDAD.tono)}`,
      `<strong>Cuentas:</strong> Instagram ${esc(IDENTIDAD.cuentas.instagram)}; Facebook ${esc(IDENTIDAD.cuentas.facebook)}; TikTok ${esc(IDENTIDAD.cuentas.tiktok)}.`
    ].map(t => `<li>${t}</li>`).join('');
  }

  /* ---------- Eventos ---------- */
  $('#botList').addEventListener('click', e => {
    const b = e.target.closest('.bot-btn'); if (!b) return;
    if ($('#botForm').elements.length) borradores[actual.id] = leerFormulario();
    actual = BOTS.find(x => x.id === b.dataset.id);
    pintarRiel(); pintarBot();
    try { localStorage.setItem('enjambre-bot', actual.id); } catch (_) {}
  });
  $('#botForm').addEventListener('submit', generar);
  document.addEventListener('click', e => {
    const l = e.target.closest('.lnk-decl'); if (!l) return;
    e.preventDefault();
    const d = $('#declaratoria'); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#botForm').addEventListener('click', e => {
    if (e.target.id === 'btnStop' && cancelar) { cancelar(); cancelar = null; $('#btnGo').disabled = false; e.target.hidden = true; }
  });
  $('#btnCopy').addEventListener('click', async () => {
    const r = resultados[actual.id]; if (!r || !r.texto) return;
    const b = $('#btnCopy');
    const ok = await copiar(r.texto, $('#output'));
    b.textContent = ok ? 'Copiado' : 'Texto seleccionado';
    setTimeout(() => { b.textContent = 'Copiar texto'; }, 1600);
  });
  $('#btnSend').addEventListener('click', () => {
    const r = resultados[actual.id]; if (!r || !r.texto) return;
    if (actual.id === 'prompts') { $('#cvBrief').value = r.texto; abrirTab('estudio'); $('#cvBrief').focus(); }
    if (actual.id === 'guiones') { $('#capGuion').value = r.texto; abrirTab('estudio'); $('#capGuion').focus(); }
  });

  /* ---------- Pestañas ---------- */
  const TABS = ['bots', 'analitica', 'estudio'];
  function abrirTab(t) {
    if (!TABS.includes(t)) t = 'bots';
    TABS.forEach(x => {
      $('#tab-' + x).hidden = x !== t;
      $('#tab-btn-' + x).setAttribute('aria-selected', String(x === t));
    });
    try { if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t); } catch (_) {}
  }
  document.querySelector('.tabs-inner').addEventListener('click', e => {
    const b = e.target.closest('button.tab'); if (b) abrirTab(b.dataset.tab);
  });
  document.querySelector('.tabs-inner').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const btns = [...document.querySelectorAll('button.tab')];
    const i = btns.indexOf(document.activeElement); if (i < 0) return;
    const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
    n.focus(); abrirTab(n.dataset.tab);
  });

  /* API compartida con analitica.js y estudio.js */
  window.ENJ_APP = { md, esc, abrirTab, bloqueIdentidad, ejecutar, copiar, conServicio: !!SERVICIO, resultado: id => resultados[id] };

  /* ---------- Inicio ---------- */
  try { const g = localStorage.getItem('enjambre-bot'); if (g) actual = BOTS.find(x => x.id === g) || actual; } catch (_) {}
  pintarRiel(); pintarBot(); pintarIdentidad();
  abrirTab((location.hash || '').slice(1));
  const motor = $('#motorIA');
  if (motor) motor.textContent = SERVICIO ? 'Motor: Gemini · servicio institucional' : 'Motor: Gemini · modo copiar y pegar';
})();
