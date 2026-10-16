/* Constructor de citas APA 7 · v2.0 · Biblioteca Jorge Roa Martínez (UTP)
   Lógica sin cambios respecto al artefacto publicado (14 oct. 2026). */
'use strict';
/* ============ Utilidades ============ */
const $ = id => document.getElementById(id);
const val = id => ($(id).value || '').trim();
const radio = n => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const span = (cls, txt) => `<span class="p p-${cls}">${esc(txt)}</span>`;

/* Localizadores: página, párrafo, sección, marca de tiempo */
function normalizaLista(v){
  v = v.replace(/\s*(?:-|‐|‑|–|—|\sa\s)\s*/g,'–');
  v = v.replace(/\s*,\s*/g,', ').replace(/\s+y\s+/gi,', ');
  return v;
}
function formatoLocalizador(tipo, raw){
  let v = (raw||'').trim();
  if(!v) return '';
  if(tipo==='pagina'){
    v = v.replace(/^(p[áa]ginas?|p[áa]gs?\.?|pp?\.?)\s*/i,'').trim();
    v = normalizaLista(v);
    return (/[–,]/.test(v) ? 'pp. ' : 'p. ') + v;
  }
  if(tipo==='parrafo'){
    v = v.replace(/^(p[áa]rrafos?|p[áa]rrs?\.?)\s*/i,'').trim();
    v = normalizaLista(v);
    return (/[–,]/.test(v) ? 'párrs. ' : 'párr. ') + v;
  }
  if(tipo==='seccion'){
    v = v.replace(/^secci[óo]n\s+/i,'').trim();
    return 'sección ' + v;
  }
  return v.replace(/\s+/g,''); // marca de tiempo
}
function tiempoValido(v){ return /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(v); }

/* Limpieza del fragmento citado */
function limpiaTexto(raw){
  let t = (raw||'').replace(/\s+/g,' ').trim(), cambios = [];
  if(/^["“”«»]|["“”«»]$/.test(t)){ t = t.replace(/^["“”«»]+/,'').replace(/["“”«»]+$/,'').trim(); cambios.push('comillas'); }
  return {t, cambios};
}
const contarPalabras = t => t ? t.split(/\s+/).filter(Boolean).length : 0;

/* ============ Lectura del formulario ============ */
function leer(){
  return {
    modo: radio('modo'), tipoAutor: radio('tipoAutor'), num: val('numAutores'),
    autor1: val('autor1'), autor2: val('autor2'),
    instNombre: val('instNombre'), instSigla: val('instSigla'), mencion: radio('mencion'),
    secundaria: $('secundaria').checked, origAutor: val('origAutor'), origAnio: val('origAnio'),
    anio: val('anio'), locTipo: val('locTipo'), locValor: val('locValor'),
    forma: radio('forma'), verbo: val('verbo'), texto: $('textoCita').value
  };
}

/* ============ Motor de la cita (no toca la página) ============ */
function construir(d){
  const checks = [], formato = [];
  const anio = d.anio || '';
  const anioH = anio ? span('anio', anio) : `<span class="p-falta">[año]</span>`;
  let plural = false;

  // --- Autor de la fuente consultada ---
  let narrHead, parenInner, autorOk = true;
  if(d.tipoAutor==='institucion'){
    const N = d.instNombre, S = d.instSigla;
    if(!N){ autorOk = false; }
    const NH = N ? span('autor', N) : `<span class="p-falta">[institución]</span>`;
    const SH = S ? span('autor', S) : '';
    if(S && d.mencion==='primera'){
      narrHead = `${NH} (${SH}, ${anioH})`;
      parenInner = `${NH} [${SH}], ${anioH}`;
      checks.push(['info','Primera mención: el nombre completo va acompañado de la sigla. En las menciones siguientes usa solo la sigla.']);
    } else if(S){
      narrHead = `${SH} (${anioH})`;
      parenInner = `${SH}, ${anioH}`;
      checks.push(['info','Menciones siguientes: se usa solo la sigla, porque ya se presentó con el nombre completo.']);
    } else {
      narrHead = `${NH} (${anioH})`;
      parenInner = `${NH}, ${anioH}`;
    }
  } else {
    const a1 = d.autor1, a2 = d.autor2;
    if(!a1 || (d.num==='2' && !a2)) autorOk = false;
    const A1 = a1 ? span('autor', a1) : `<span class="p-falta">[apellido]</span>`;
    const A2 = a2 ? span('autor', a2) : `<span class="p-falta">[apellido]</span>`;
    let narrA, parenA;
    if(d.num==='1'){ narrA = A1; parenA = A1; }
    else if(d.num==='2'){ narrA = `${A1} y ${A2}`; parenA = `${A1} &amp; ${A2}`; plural = true;
      checks.push(['info','Dos autores: se unen con <b>y</b> en la forma narrativa y con <b>&amp;</b> dentro del paréntesis.']); }
    else { narrA = `${A1} ${span('autor','et al.')}`; parenA = narrA; plural = true;
      checks.push(['info','Tres o más autores: se escribe el primer apellido seguido de <b>et al.</b> desde la primera cita.']); }
    narrHead = `${narrA} (${anioH})`;
    parenInner = `${parenA}, ${anioH}`;
  }
  checks.unshift(autorOk ? ['ok','Autor completo.'] : ['err','Falta el apellido del autor o el nombre de la institución.']);

  // --- Año ---
  if(!anio) checks.splice(1,0,['err','Falta el año. Si la fuente no tiene fecha, usa <b>s.f.</b>']);
  else if(/^\d{4}[a-z]?$/i.test(anio) || /^s\.\s?f\.$/i.test(anio) || /^en prensa$/i.test(anio)){
    checks.splice(1,0,['ok', /^s\./i.test(anio) ? 'Fuente sin fecha: se escribe <b>s.f.</b>' : 'Año con formato válido.']);
  } else checks.splice(1,0,['warn','Revisa el año: APA usa cuatro dígitos (2021), <b>s.f.</b> o <b>en prensa</b>.']);

  // --- Cita secundaria ---
  if(d.secundaria){
    const O = d.origAutor ? span('autor', d.origAutor) : `<span class="p-falta">[autor original]</span>`;
    const OA = d.origAnio ? span('anio', d.origAnio) + ', ' : '';
    narrHead = `${O} (${OA}como se citó en ${parenInner})`;
    parenInner = `${O}, ${OA}como se citó en ${parenInner}`;
    plural = /\sy\s|et al\./i.test(d.origAutor);
    checks.push(['info','Cita secundaria: en la lista de referencias incluye solo la fuente que leíste, no la obra original.']);
    if(!d.origAutor) checks.push(['err','Escribe el apellido del autor original.']);
  }

  // --- Localizador ---
  const locF = formatoLocalizador(d.locTipo, d.locValor);
  const locH = locF ? span('loc', locF) : '';
  if(d.locTipo==='tiempo' && d.locValor && !tiempoValido(d.locValor.replace(/\s+/g,'')))
    checks.push(['warn','La marca de tiempo se escribe en horas:minutos:segundos o minutos:segundos, por ejemplo 1:02:15 o 12:30.']);

  const verbo = d.verbo + (plural ? 'n' : '');
  let html = '', tipo = 'parafraseo', bloque = false;

  if(d.modo==='parafraseo'){
    const idea = `<span class="p-ph">${d.forma==='narrativa' ? 'tu idea parafraseada' : 'Tu idea parafraseada'}</span>`;
    if(d.forma==='narrativa') html = `<p>${narrHead} ${esc(verbo)} que ${idea}${locH ? ` (${locH})` : ''}.</p>`;
    else html = `<p>${idea} (${parenInner}${locH ? ', '+locH : ''}).</p>`;
    checks.push(locF ? ['ok','Incluiste el localizador: APA lo recomienda cuando ayuda a ubicar la idea en una obra extensa.']
                     : ['info','En el parafraseo el localizador es opcional; inclúyelo si la obra es extensa.']);
    formato.push('Sin comillas: la idea va redactada con tus palabras, conservando su sentido.');
    formato.push('El punto final va después del paréntesis de la cita.');
  } else {
    const {t, cambios} = limpiaTexto(d.texto);
    const n = contarPalabras(t);
    bloque = n >= 40; tipo = bloque ? 'bloque' : 'corta';
    const locFinal = locH || `<span class="p-falta">[localizador]</span>`;
    checks.push(locF ? ['ok','Localizador presente, obligatorio en toda cita textual.']
                     : ['err','Falta el localizador: toda cita textual indica página, párrafo, sección o marca de tiempo.']);
    if(!t) checks.push(['warn','Pega el fragmento que vas a citar en el paso 6.']);
    if(cambios.length) checks.push(['info','Quitamos las comillas que traía el fragmento: la herramienta las ubica según el tipo de cita.']);

    if(!bloque){
      let tc = t, quitoPunto = false;
      if(/\.$/.test(tc) && !/\.\.\.$|…$/.test(tc)){ tc = tc.slice(0,-1); quitoPunto = true; }
      const T = tc ? esc(tc) : '<span class="p-ph">texto citado</span>';
      if(quitoPunto) checks.push(['info','Se movió el punto final del fragmento: en la cita corta el punto va después del paréntesis.']);
      if(d.forma==='narrativa') html = `<p>${narrHead} ${esc(verbo)} que “${T}” (${locFinal}).</p>`;
      else html = `<p>“${T}” (${parenInner}, ${locFinal}).</p>`;
      checks.push(['ok', `${n} palabra${n===1?'':'s'}: cita corta (menos de 40 palabras).`]);
      formato.push('Va dentro del párrafo, entre comillas dobles.');
      formato.push('El punto final va después del paréntesis; si el fragmento termina en ? o !, ese signo se conserva dentro de las comillas.');
    } else {
      let tb = t;
      if(!/[.!?…]$/.test(tb)) tb += '.';
      const T = esc(tb);
      if(d.forma==='narrativa') html = `<p>${narrHead} ${esc(verbo)}:</p><p class="bloque">${T} (${locFinal})</p>`;
      else html = `<p class="bloque">${T} (${parenInner}, ${locFinal})</p>`;
      checks.push(['ok', `${n} palabras: cita en bloque (40 palabras o más).`]);
      formato.push('Párrafo aparte, con sangría izquierda de 1,27 cm y sin comillas.');
      formato.push('Doble espacio, igual que el resto del documento.');
      formato.push('El punto va al final del texto citado; después del paréntesis no se escribe punto.');
    }
  }
  if(d.forma==='narrativa') formato.push(`El verbo va en ${plural ? 'plural' : 'singular'} porque ${plural ? 'hay varios autores' : 'hay un solo autor'}.`);
  return {html, checks, formato, tipo, bloque};
}

/* ============ Render ============ */
let ejemploActivo = -1, cargando = false;

function render(){
  const d = leer();
  $('bloquePersonas').hidden = d.tipoAutor!=='personas';
  $('bloqueInst').hidden = d.tipoAutor!=='institucion';
  $('autor2Wrap').hidden = d.num!=='2';
  $('mencionWrap').hidden = !d.instSigla;
  $('bloqueSec').hidden = !d.secundaria;
  $('panelTexto').hidden = d.modo!=='textual';
  $('verboWrap').hidden = d.forma!=='narrativa';
  $('locAyuda').textContent = d.modo==='textual' ? 'El localizador es obligatorio en las citas textuales.' : 'En el parafraseo es opcional; ayuda al lector en obras extensas.';

  const loc = {
    pagina:['Página o rango','Ej. 84 · 84-86 · 84, 90','Una página usa <strong>p.</strong>; un rango o varias páginas usan <strong>pp.</strong> La herramienta lo asigna sola.'],
    parrafo:['Número de párrafo','Ej. 3 · 3-4','Para páginas web y documentos sin paginación: <strong>párr.</strong> o <strong>párrs.</strong> Cuenta los párrafos desde el inicio o desde un encabezado.'],
    seccion:['Nombre de la sección','Ej. Discusión','Úsalo cuando no hay páginas ni párrafos numerados. Si el encabezado es largo, abrévialo y ponlo entre comillas.'],
    tiempo:['Marca de tiempo','Ej. 12:30 · 1:02:15','Para videos, pódcast o audios: el momento exacto donde empieza el fragmento citado.']
  }[d.locTipo];
  $('locLbl').textContent = loc[0]; $('locValor').placeholder = loc[1]; $('locHint').innerHTML = loc[2];

  const r = construir(d);
  $('salida').innerHTML = r.html;
  $('salida').classList.toggle('anat', $('verPartes').checked);
  $('leyenda').hidden = !$('verPartes').checked;
  $('checks').innerHTML = r.checks.map(([s,t]) => `<li class="${s}"><span class="ic" aria-hidden="true">${{ok:'✓',warn:'!',err:'×',info:'i'}[s]}</span><span>${t}</span></li>`).join('');
  $('formato').innerHTML = r.formato.map(t => `<li>${t}</li>`).join('');

  const n = contarPalabras(limpiaTexto(d.texto).t);
  $('wcNum').textContent = `${n} palabra${n===1?'':'s'}`;
  $('wcPill').textContent = n>=40 ? 'Cita en bloque' : 'Cita corta';
  $('wcPill').className = 'pill ' + (n>=40 ? 'bloque' : 'corta');

  if(!cargando && ejemploActivo>=0){ ejemploActivo = -1; marcarEjemplo(); }
}

/* ============ Ejemplos ============ */
const BASE = {modo:'textual', tipoAutor:'personas', num:'1', autor1:'', autor2:'', instNombre:'', instSigla:'', mencion:'primera',
  secundaria:false, origAutor:'', origAnio:'', anio:'', locTipo:'pagina', locValor:'', forma:'narrativa', verbo:'afirma', texto:''};
const EJEMPLOS = [
  {t:'Parafraseo · un autor', tags:['Parafraseo','Narrativa'], d:{modo:'parafraseo', autor1:'Gómez', anio:'2021', verbo:'señala'}},
  {t:'Parafraseo · dos autores', tags:['Parafraseo','Parentética'], d:{modo:'parafraseo', num:'2', autor1:'Restrepo', autor2:'Cardona', anio:'2019', forma:'parentetica'}},
  {t:'Institución con sigla · primera mención', tags:['Institución','Sigla'], hl:'Sigla', d:{modo:'parafraseo', tipoAutor:'institucion', instNombre:'Instituto Colombiano de Lectura', instSigla:'ICL', anio:'2022', forma:'parentetica'}},
  {t:'Cita corta · una página', tags:['Textual','p.'], d:{num:'3', autor1:'Martínez', anio:'2020', locValor:'45', forma:'parentetica', texto:'la lectura crítica se fortalece cuando el estudiante contrasta varias fuentes'}},
  {t:'Cita corta · rango de páginas', tags:['Textual','pp.'], hl:'pp.', d:{autor1:'Gómez', anio:'2021', locValor:'112-113', verbo:'sostiene', texto:'el repositorio institucional amplía la visibilidad de la producción académica local.'}},
  {t:'Página web sin paginación', tags:['Textual','párr.'], hl:'párr.', d:{tipoAutor:'institucion', instNombre:'Fundación Lectora', anio:'s.f.', locTipo:'parrafo', locValor:'3', forma:'parentetica', texto:'leer en comunidad convierte la biblioteca en un espacio de encuentro'}},
  {t:'Cita en bloque · narrativa', tags:['Bloque','pp.'], hl:'Bloque', d:{num:'2', autor1:'Restrepo', autor2:'Cardona', anio:'2019', locValor:'23-24', verbo:'explica',
    texto:'Las bibliotecas universitarias han dejado de ser únicamente depósitos de libros para convertirse en espacios de aprendizaje, investigación y encuentro. Su función actual incluye acompañar a los estudiantes en la búsqueda, evaluación y uso ético de la información, así como apoyar a los docentes en la difusión de sus resultados de investigación'}},
  {t:'Video · marca de tiempo', tags:['Textual','Tiempo'], d:{autor1:'Salazar', anio:'2023', locTipo:'tiempo', locValor:'12:30', forma:'parentetica', texto:'una buena pregunta de investigación ya contiene la mitad de la respuesta'}},
  {t:'Cita secundaria', tags:['Parafraseo','Como se citó en'], hl:'Como se citó en', d:{modo:'parafraseo', secundaria:true, origAutor:'Pérez', origAnio:'1998', num:'3', autor1:'Martínez', anio:'2020', verbo:'plantea'}}
];

function aplicar(d){
  const x = Object.assign({}, BASE, d);
  cargando = true;
  for(const [k,v] of Object.entries({autor1:x.autor1, autor2:x.autor2, instNombre:x.instNombre, instSigla:x.instSigla, origAutor:x.origAutor, origAnio:x.origAnio,
      anio:x.anio, locValor:x.locValor, textoCita:x.texto, numAutores:x.num, locTipo:x.locTipo, verbo:x.verbo})) $(k).value = v;
  $('secundaria').checked = x.secundaria;
  for(const [n,v] of [['modo',x.modo],['tipoAutor',x.tipoAutor],['mencion',x.mencion],['forma',x.forma]])
    document.querySelector(`input[name="${n}"][value="${v}"]`).checked = true;
  render();
  cargando = false;
}
function marcarEjemplo(){
  document.querySelectorAll('.ej-card').forEach((c,i)=>c.classList.toggle('activo', i===ejemploActivo));
  $('ejFlag').hidden = ejemploActivo < 0;
}
function cargarEjemplo(i, desplazar){
  ejemploActivo = i; aplicar(EJEMPLOS[i].d); marcarEjemplo();
  if(desplazar && window.innerWidth < 960) $('sr').scrollIntoView({behavior:'smooth', block:'start'});
}
function vistaPrevia(d){
  const div = document.createElement('div');
  div.innerHTML = construir(Object.assign({}, BASE, d)).html.replace(/<\/p><p/g,'</p> <p');
  let t = div.textContent.replace(/\s+/g,' ').trim();
  if(t.length > 150){ const c = t.slice(t.lastIndexOf('(')); t = t.slice(0, 105).trim() + '… ' + c; }
  return t;
}
function pintarEjemplos(){
  $('ejGrid').innerHTML = '';
  EJEMPLOS.forEach((ej,i)=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ej-card';
    b.innerHTML = `<div class="ej-tags">${ej.tags.map(t=>`<span class="ej-tag${t===ej.hl?' hl':''}">${esc(t)}</span>`).join('')}</div>
      <div class="ej-titulo">${esc(ej.t)}</div><div class="ej-prev"></div><div class="ej-accion">Cargar en el formulario →</div>`;
    b.querySelector('.ej-prev').textContent = vistaPrevia(ej.d);
    b.addEventListener('click', ()=>cargarEjemplo(i, true));
    $('ejGrid').appendChild(b);
  });
}

/* ============ Acciones ============ */
function mostrarCopiada(){ const m = $('copiedMsg'); m.classList.add('show'); setTimeout(()=>m.classList.remove('show'), 1600); }
function copiaRespaldo(){
  const sel = window.getSelection(), rango = document.createRange();
  rango.selectNodeContents($('salida')); sel.removeAllRanges(); sel.addRange(rango);
  try{ if(document.execCommand('copy')){ mostrarCopiada(); return; } }catch(e){}
  $('copiedMsg').textContent = 'Texto seleccionado: usa Ctrl+C'; mostrarCopiada();
  setTimeout(()=>{ $('copiedMsg').textContent = 'Copiada'; }, 2200);
}
$('btnCopiar').addEventListener('click', ()=>{
  const texto = $('salida').innerText.replace(/\n{3,}/g,'\n\n').trim();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(mostrarCopiada).catch(copiaRespaldo);
  } else copiaRespaldo();
});
$('btnLimpiar').addEventListener('click', ()=>{ ejemploActivo = -1; aplicar({}); marcarEjemplo(); $('autor1').focus(); });
document.querySelectorAll('.chip[data-anio]').forEach(c => c.addEventListener('click', ()=>{ $('anio').value = c.dataset.anio; render(); }));
$('form').addEventListener('submit', e => e.preventDefault()); // antes: onsubmit="return false"
$('form').addEventListener('input', render);
$('form').addEventListener('change', render);
$('verPartes').addEventListener('change', render);

pintarEjemplos();
cargarEjemplo(3, false);

/* Botón flotante en móvil: lleva al resultado cuando el formulario lo deja fuera de vista */
$('irCita').addEventListener('click', ()=>$('sr').scrollIntoView({behavior:'smooth', block:'start'}));
if('IntersectionObserver' in window){
  const vis = {form:false, res:false};
  const actualiza = ()=>{ $('irCita').hidden = !(vis.form && !vis.res); };
  new IntersectionObserver(e=>{ vis.form = e[0].isIntersecting; actualiza(); }).observe($('form'));
  new IntersectionObserver(e=>{ vis.res = e[0].isIntersecting; actualiza(); }).observe($('salida'));
}

/* El contador de uso compartido vive ahora en ../assets/js/contador.js */
