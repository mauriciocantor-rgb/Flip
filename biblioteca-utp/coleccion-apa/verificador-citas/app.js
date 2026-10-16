/* Verificador de citas y referencias APA 7 · v1.0 · Biblioteca Jorge Roa Martínez (UTP)
   Lógica sin cambios respecto al artefacto publicado (14 oct. 2026).
   El análisis ocurre en el navegador: el texto no se envía a ningún servidor. */
'use strict';
/* ===== Motor del verificador de correspondencia citas–referencias (APA 7) ===== */
const YEAR_SRC = '(?:\\d{4}[a-z]?|s\\.\\s?f\\.(?:-[a-z])?|en prensa(?:-[a-z])?)';
const YEAR_RE = new RegExp('^' + YEAR_SRC + '$', 'i');
const LOC_RE = /\b(?:pp?\.|p[áa]rrs?\.|secci[óo]n|cap\.|diapositiva|\d{1,2}:\d{2})/i;
const PARTICULAS = new Set(['de','del','la','las','los','el','y','e','van','von','da','di','dos','du','le','para','en','&']);
const INICIALES_COMUNES = new Set(['según','segun','para','como','en','de','por','así','asi','sin','además','ademas','tal','este','esta','estos','estas',
  'los','las','el','la','mientras','aunque','desde','sobre','ante','con','tanto','asimismo','igualmente','finalmente','respecto','frente','al','del',
  'también','tambien','incluso','luego','pero','sin embargo','y','e','o','a','u','que','cuando','donde','si','no','hoy','ya','autores','investigadores','estudios',
  'trabajos','otros','otras','algunos','algunas','varios','varias','dicho','dicha','lo','un','una','su','sus','entre','hacia','hasta','tras','durante','mediante']);

function norm(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
    .replace(/[\[\]().,;:"“”'’]/g,' ').replace(/\s+/g,' ').trim();
}
function normYear(y){ return String(y||'').toLowerCase().replace(/\s+/g,''); }
function baseYear(y){ return normYear(y).replace(/-?[a-z]$/,'').replace(/^s\.f\.?$/,'s.f.'); }
const esMayus = w => /^[\p{Lu}]/u.test(w);

/* ---------- Interpretación del autor de una cita ---------- */
function pareceApellido(t){
  const ws = t.trim().split(/\s+/);
  if(ws.length > 3) return false;
  return ws.every(w => esMayus(w) || PARTICULAS.has(w.toLowerCase()));
}
function interpretaAutor(a, alias){
  a = a.trim().replace(/[,\s]+$/,'');
  const out = { texto:a, personas:[], inst:null, sigla:null, etAl:false, conector:null };
  const br = a.match(/^(.*?)\s*\[([^\]]+)\]$/);
  if(br){ out.inst = br[1].trim(); out.sigla = br[2].trim(); alias[norm(out.sigla)] = norm(out.inst); return out; }
  if(/\s+et\s+al\.?$/i.test(a)){ out.etAl = true; a = a.replace(/\s+et\s+al\.?$/i,'').trim(); }
  const m = a.split(/\s+(&|y|e)\s+/);
  if(m.length === 3 && pareceApellido(m[0]) && pareceApellido(m[2])){
    out.personas = [m[0].trim(), m[2].trim()]; out.conector = m[1];
  } else if(!out.etAl && (a.split(/\s+/).length > 3 || /^[\p{Lu}]{2,}$/u.test(a) || /\s(de|del|para|la|los|las|y)\s/i.test(a))){
    out.inst = a; // institución o sigla
  } else {
    out.personas = [a];
  }
  return out;
}

/* ---------- Extracción de citas del texto ---------- */
function autorPrevio(texto, fin){
  const prev = texto.slice(Math.max(0, fin - 160), fin);
  const toks = prev.split(/(\s+)/);
  let i = toks.length - 1, tomados = [];
  while(i >= 0 && /^\s*$/.test(toks[i])) i--;
  while(i >= 0){
    const w = toks[i];
    if(/^\s+$/.test(w)){ tomados.unshift(w); i--; continue; }
    const limpio = w.replace(/[“"(]/g,'');
    if(limpio !== w) break;
    if(esMayus(w) || PARTICULAS.has(w.toLowerCase()) || w === 'et' || w === 'al.' || /^[\p{Lu}][\p{L}'’\-]*$/u.test(w)){ tomados.unshift(w); i--; }
    else break;
  }
  let frase = tomados.join('').trim();
  // quitar palabras iniciales que no forman parte del nombre
  let ws = frase.split(/\s+/).filter(Boolean);
  while(ws.length && (INICIALES_COMUNES.has(ws[0].toLowerCase()) || PARTICULAS.has(ws[0].toLowerCase()))) ws.shift();
  while(ws.length && PARTICULAS.has(ws[ws.length-1].toLowerCase())) ws.pop();
  frase = ws.join(' ');
  if(!frase || !esMayus(frase)) return null;
  const inicio = fin - prev.length + prev.lastIndexOf(frase);
  return { frase, inicio };
}

function parseSegmento(seg, alias){
  let s = seg.trim().replace(/^(v[ée]anse|v[ée]ase|p\.\s?ej\.,?|por ejemplo,?|cf\.)\s+/i,'');
  if(/comunicaci[óo]n personal/i.test(s)) return { personal:true, texto:s };
  let secundaria = null;
  const cs = s.split(/,?\s*como se cit[óo] en\s+/i);
  if(cs.length > 1){ secundaria = cs[0].trim(); s = cs[1].trim(); }
  const m = s.match(new RegExp('^(.*?),\\s*(' + YEAR_SRC + '(?:\\s*,\\s*' + YEAR_SRC + ')*)(.*)$','i'));
  if(!m) return null;
  const years = m[2].split(/\s*,\s*/).map(normYear);
  return { autor: interpretaAutor(m[1], alias), years, resto:m[3], secundaria, texto:seg.trim() };
}

function extraerCitas(texto){
  const citas = [], alias = {};
  const re = /\(([^()]{2,400})\)/g;
  let m;
  while((m = re.exec(texto))){
    const c = m[1].trim(), ini = m.index, fin = ini + m[0].length;
    if(/^(pp?\.|p[áa]rrs?\.|secci[óo]n)\s/i.test(c) || /^\d{1,2}:\d{2}/.test(c)) continue; // localizador suelto
    const empiezaAnio = new RegExp('^' + YEAR_SRC + '(?=\\s*[,)]|\\s*$)','i').test(c) || /^como se cit[óo] en/i.test(c);
    const siglaAnio = c.match(new RegExp('^([\\p{Lu}][\\p{Lu}\\d&\\-]{1,11}),\\s*(' + YEAR_SRC + ')(.*)$','iu'));
    const previo = autorPrevio(texto, ini);

    if(empiezaAnio || (siglaAnio && previo && previo.frase.split(/\s+/).length >= 2 && /^[\p{Lu}\d&\-]+$/u.test(siglaAnio[1]))){
      // ----- cita narrativa -----
      if(!previo) continue;
      let autorTxt = previo.frase, contenido = c, sigla = null;
      if(!empiezaAnio){ sigla = siglaAnio[1]; contenido = c.slice(c.indexOf(',')+1).trim(); alias[norm(sigla)] = norm(autorTxt); }
      let secundaria = null, consultada = null;
      const cs = contenido.split(/,?\s*como se cit[óo] en\s+/i);
      if(cs.length > 1){
        secundaria = autorTxt;
        consultada = parseSegmento(cs[1], alias);
        if(consultada) citas.push({ forma:'narrativa', inicio:previo.inicio, fin, raw:texto.slice(previo.inicio, fin), seg:consultada, secundaria });
        continue;
      }
      const ym = contenido.match(new RegExp('^(' + YEAR_SRC + '(?:\\s*,\\s*' + YEAR_SRC + ')*)','i'));
      if(!ym) continue;
      const autor = interpretaAutor(autorTxt, alias);
      if(sigla){ autor.inst = autorTxt; autor.personas = []; autor.sigla = sigla; }
      citas.push({ forma:'narrativa', inicio:previo.inicio, fin, raw:texto.slice(previo.inicio, fin),
        seg:{ autor, years: ym[1].split(/\s*,\s*/).map(normYear), resto: contenido.slice(ym[1].length), texto:c } });
      continue;
    }
    // ----- cita parentética (puede tener varias, separadas por ;) -----
    if(!new RegExp(YEAR_SRC,'i').test(c)) continue;
    const segs = c.split(/\s*;\s*/).map(s => parseSegmento(s, alias)).filter(Boolean);
    if(!segs.length) continue;
    segs.forEach((sg, k) => citas.push({ forma:'parentetica', inicio:ini, fin, raw:m[0], seg:sg, grupo:ini, multiple: segs.length > 1 }));
  }
  return { citas, alias };
}

/* ---------- Referencias ---------- */
function parseReferencias(txt){
  const lineas = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^referencias(\s+bibliogr[áa]ficas)?:?$/i.test(l));
  return lineas.map((raw, idx) => {
    const ym = raw.match(new RegExp('\\((' + YEAR_SRC + ')(?:,[^)]*)?\\)','i'));
    const ref = { raw, idx, autores:[], inst:null, year:null, usos:0, problemas:[] };
    if(!ym){ ref.problemas.push(['err','No se encontró el año entre paréntesis después del autor.']); ref.clave = norm(raw); return ref; }
    ref.year = normYear(ym[1]);
    let autor = raw.slice(0, ym.index).trim().replace(/\((?:Eds?|Coords?|Comps?)\.\)/gi,'').trim().replace(/[,\s]+$/,'');
    const re = /(?:^|,\s*|\s+(?:&|y)\s+|\.\s+)((?:[\p{Lu}][\p{L}'’\-]*|de|del|la|las|los|van|von|da|dos|di|le)(?:\s+(?:[\p{Lu}][\p{L}'’\-]*|de|del|la|las|los|van|von|da|dos|di|le))*)\s*,\s*[\p{Lu}]\./gu;
    let a;
    while((a = re.exec(autor))) ref.autores.push(a[1].trim());
    if(!ref.autores.length) ref.inst = autor.replace(/[.\s]+$/,'');
    if(/\s(&)\s/.test(autor)) ref.problemas.push(['info','En la lista de referencias en español se usa “y” antes del último autor, sin coma previa: Apellido, A. y Apellido, B.']);
    ref.clave = norm(ref.inst || ref.autores.join(' ') || raw);
    return ref;
  });
}

/* ---------- Cruce ---------- */
function coincideNombre(autor, ref, alias){
  if(autor.inst || (autor.personas.length === 1 && ref.inst)){
    if(!ref.inst) return false;
    let n = norm(autor.inst || autor.personas[0]);
    if(alias[n]) n = alias[n];
    return n === norm(ref.inst) || (autor.sigla && norm(autor.inst) === norm(ref.inst));
  }
  if(!ref.autores.length) return false;
  return norm(autor.personas[0]) === norm(ref.autores[0]);
}

function verificar(texto, refsTxt){
  const { citas, alias } = extraerCitas(texto);
  const refs = parseReferencias(refsTxt);
  const resultados = [];

  for(const c of citas){
    const sg = c.seg, msgs = [];
    if(sg.personal){ resultados.push({ c, estado:'info', msgs:[['info','Comunicación personal: se cita en el texto pero no va en la lista de referencias.']], refs:[] }); continue; }
    const autor = sg.autor;
    const encontrados = [];
    if(c.secundaria) msgs.push(['info', `Cita secundaria: ${c.secundaria} no necesita entrada propia; debe figurar la fuente que leíste.`]);
    if(sg.secundaria) msgs.push(['info', `Cita secundaria: ${sg.secundaria} no necesita entrada propia; debe figurar la fuente que leíste.`]);
    if(autor.conector === '&') msgs.push(['warn','En español los dos autores se unen con “y”, también dentro del paréntesis: (Restrepo y Cardona, 2019).']);

    for(const y of sg.years){
      const porNombre = refs.filter(r => r.year !== null && coincideNombre(autor, r, alias));
      const exactos = porNombre.filter(r => r.year === y);
      if(exactos.length){
        exactos.forEach(r => { r.usos++; encontrados.push(r); });
        if(exactos.length > 1) msgs.push(['warn', `Hay ${exactos.length} referencias de este autor en ${y}: distínguelas con letras (${y}a, ${y}b) en la cita y en la lista.`]);
        const r = exactos[0];
        if(!autor.inst && !r.inst){
          const n = r.autores.length;
          if(autor.etAl && n === 2) msgs.push(['warn', `La fuente tiene dos autores: nómbralos a ambos (${r.autores[0]} y ${r.autores[1]}) en lugar de usar et al.`]);
          if(autor.etAl && n === 1) msgs.push(['warn','La fuente tiene un solo autor: no corresponde et al.']);
          if(!autor.etAl && autor.personas.length === 1 && n === 2) msgs.push(['warn', `La fuente tiene dos autores: cítalos a ambos (${r.autores[0]} y ${r.autores[1]}).`]);
          if(!autor.etAl && autor.personas.length >= 1 && n >= 3) msgs.push(['warn', `La fuente tiene ${n} autores: usa “${r.autores[0]} et al.” desde la primera cita.`]);
          if(autor.personas.length === 2 && n >= 2 && norm(autor.personas[1]) !== norm(r.autores[1]))
            msgs.push(['warn', `El segundo autor no coincide: en la referencia aparece ${r.autores[1]}.`]);
        }
        continue;
      }
      const porBase = porNombre.filter(r => baseYear(r.year) === baseYear(y));
      if(porBase.length){
        msgs.push(['warn', `La letra del año no coincide: en la referencia aparece ${porBase.map(r=>r.year).join(', ')}.`]);
        porBase.forEach(r => { r.usos++; encontrados.push(r); });
        continue;
      }
      if(porNombre.length){
        msgs.push(['err', `El año no coincide: en la lista de referencias este autor aparece con ${[...new Set(porNombre.map(r=>r.year))].join(', ')}.`]);
        porNombre.forEach(r => r.anioDistinto = (r.anioDistinto || 0) + 1);
        continue;
      }
      msgs.push(['err', `Sin referencia: no hay ninguna entrada de ${autor.inst || autor.personas[0]} (${y}) en la lista.`]);
      if(!autor.inst && autor.personas[0]){
        const co = refs.filter(r => r.year === y && r.autores.slice(1).some(x => norm(x) === norm(autor.personas[0])));
        co.forEach(r => msgs.push(['info', `${autor.personas[0]} aparece como coautor en ${r.autores[0]}${r.autores.length>2?' et al.':' y '+r.autores[1]} (${r.year}). En la cita va primero el apellido del primer autor.`]));
      }
    }
    if(!msgs.some(m => m[0] !== 'info')) msgs.unshift(['ok','Tiene su referencia en la lista.']);
    const estado = msgs.some(m=>m[0]==='err') ? 'err' : msgs.some(m=>m[0]==='warn') ? 'warn' : 'ok';
    resultados.push({ c, estado, msgs, refs:[...new Set(encontrados)] });
  }

  /* Referencias: uso, orden, duplicados */
  const vistos = {};
  refs.forEach((r, i) => {
    if(r.year !== null && r.usos === 0){
      r.problemas.unshift(r.anioDistinto ? ['err','No se cita con este año: el texto menciona a este autor con otro año.'] : ['err','No se cita en el texto: elimínala o agrega la cita correspondiente.']);
    }
    const k = norm(r.raw);
    if(vistos[k] !== undefined) r.problemas.push(['warn', `Referencia repetida (igual a la n.º ${vistos[k]+1}).`]); else vistos[k] = i;
    if(i > 0){
      const prev = refs[i-1];
      const cmp = prev.clave.localeCompare(r.clave, 'es', { sensitivity:'base' });
      if(cmp > 0) r.problemas.push(['warn', 'Fuera de orden alfabético: debería ir antes de la referencia anterior.']);
      else if(cmp === 0 && prev.year && r.year && prev.year.localeCompare(r.year) > 0 && !/s\.f\./.test(r.year))
        r.problemas.push(['warn','Mismo autor: ordena sus obras de la más antigua a la más reciente.']);
    }
    if(!r.problemas.some(p => p[0] !== 'info')) r.problemas.unshift(['ok', `Citada ${r.usos} ${r.usos===1?'vez':'veces'} en el texto.`]);
    r.estado = r.problemas.some(p=>p[0]==='err') ? 'err' : r.problemas.some(p=>p[0]==='warn') ? 'warn' : 'ok';
  });

  /* Citas textuales sin localizador */
  const comillas = [];
  const qre = /[“"«]([^”"»]{12,600})[”"»]/g; let q;
  while((q = qre.exec(texto))){
    const palabras = q[1].trim().split(/\s+/).length;
    if(palabras < 4 || palabras >= 40) continue;
    const despues = texto.slice(q.index + q[0].length, q.index + q[0].length + 160);
    const par = despues.match(/^[^.()]*\(([^()]*)\)/);
    const angulares = q[0][0] === '«';
    const sinLoc = !par || !LOC_RE.test(par[1]);
    if(sinLoc || angulares) comillas.push({ inicio:q.index, fin:q.index + q[0].length, texto:q[1], sinLoc, angulares });
  }
  return { resultados, refs, comillas, alias };
}




/* ============ Interfaz ============ */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ETQ = { ok:'Correcta', warn:'Revisar', err:'Error', info:'Información' };
let tab = 'citas', filtro = 'problemas', ultimo = null, cargando = false, esEjemplo = false;

const EJ_TEXTO = `Los repositorios institucionales se han consolidado como una vía para dar visibilidad a la producción académica. Gómez (2021) señala que su impacto depende de la calidad de los metadatos, una idea que comparten otros estudios (Restrepo y Cardona, 2019; Salazar, 2022).

Martínez et al. (2020) afirman que "la lectura crítica se fortalece cuando el estudiante contrasta varias fuentes" (p. 45). En la misma línea, el Instituto Colombiano de Lectura (ICL, 2022) recomienda formar a los estudiantes desde el primer semestre. Según el ICL (2022), la biblioteca debe liderar ese proceso.

Algunos autores describen la biblioteca como "un ecosistema de aprendizaje en constante cambio" (Ospina, 2020). Pérez (1998, como se citó en Martínez et al., 2020) ya advertía esta transformación, y Restrepo et al. (2019) la vinculan con el uso ético de la información (Herrera, 2018).`;
const EJ_REFS = `Referencias
Gómez, L. (2021). Repositorios institucionales y visibilidad académica (2.ª ed.). Editorial Universidad Tecnológica de Pereira.
Instituto Colombiano de Lectura. (2022). Informe nacional de lectura universitaria.
Martínez, J., Ospina, C. y Duque, A. (2020). Lectura crítica en la educación superior. Revista Colombiana de Educación, 15(2), 40–58.
Salazar, D. (2023). Uso de gestores bibliográficos en estudiantes de ingeniería [Trabajo de grado de pregrado, Universidad Tecnológica de Pereira].
Restrepo, M. y Cardona, P. (2019). La biblioteca como espacio de aprendizaje. En S. Villa (Ed.), Bibliotecas universitarias en Colombia (pp. 15–32). Editorial Académica.
Vargas, R. (2017). Alfabetización informacional. Editorial Académica.`;

function agruparCitas(resultados){
  // une los segmentos de un mismo paréntesis en una sola tarjeta de texto resaltado
  const porPos = {};
  for(const r of resultados){
    const k = r.c.inicio + ':' + r.c.fin;
    const peso = {err:3, warn:2, info:1, ok:0}[r.estado];
    if(!porPos[k] || peso > porPos[k].peso) porPos[k] = { inicio:r.c.inicio, fin:r.c.fin, estado:r.estado, peso };
  }
  return Object.values(porPos).sort((a,b)=>a.inicio-b.inicio);
}

function pintarTextoResaltado(texto, res){
  const marcas = agruparCitas(res.resultados).map(m => ({...m, cls:m.estado==='info'?'ok':m.estado}))
    .concat(res.comillas.map(q => ({ inicio:q.inicio, fin:q.fin, cls:'q' })))
    .sort((a,b)=>a.inicio-b.inicio);
  let html = '', pos = 0;
  for(const m of marcas){
    if(m.inicio < pos) continue;
    html += esc(texto.slice(pos, m.inicio)) + `<mark class="${m.cls}">${esc(texto.slice(m.inicio, m.fin))}</mark>`;
    pos = m.fin;
  }
  html += esc(texto.slice(pos));
  $('revisado').innerHTML = html || '<span class="txt-muted">Pega tu texto en el paso 1 para verlo aquí.</span>';
}

function tarjeta(estado, cabeza, tipo, msgs, extra){
  return `<div class="item ${estado}"><div class="stripe"></div><div class="body">
    <div class="top"><div class="min-w-0">${tipo ? `<div class="tipo">${tipo}</div>` : ''}<div class="cita">${cabeza}</div></div><span class="pill ${estado}">${ETQ[estado]}</span></div>
    <ul class="msgs">${msgs.map(([s,t]) => `<li class="${s}">${esc(t)}</li>`).join('')}</ul>${extra||''}</div></div>`;
}

function render(){
  const texto = $('texto').value, refsTxt = $('refs').value;
  const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const res = verificar(texto, refsTxt);
  ultimo = res;
  $('metaTexto').textContent = `${palabras.toLocaleString('es-CO')} palabra${palabras===1?'':'s'}`;
  $('metaRefs').textContent = `${res.refs.length} referencia${res.refs.length===1?'':'s'}`;

  const citasProb = res.resultados.filter(r => r.estado==='err' || r.estado==='warn');
  const refsProb = res.refs.filter(r => r.estado!=='ok');
  const correctas = res.resultados.filter(r => r.estado==='ok').length;
  const errores = res.resultados.filter(r=>r.estado==='err').length + res.refs.filter(r=>r.estado==='err').length;
  const avisos = citasProb.length - res.resultados.filter(r=>r.estado==='err').length + res.refs.filter(r=>r.estado==='warn').length + res.comillas.length;

  $('resumen').innerHTML = [
    ['', res.resultados.length, 'citas detectadas'],
    ['', res.refs.length, 'referencias en la lista'],
    ['ok', correctas, 'citas con su referencia'],
    [errores ? 'err' : (avisos ? 'warn' : 'ok'), errores + avisos, 'puntos por corregir']
  ].map(([c,n,t]) => `<div class="tile ${c}"><b>${n}</b><span>${t}</span></div>`).join('');

  const v = $('veredicto');
  if(!texto.trim() && !refsTxt.trim()){ v.className='veredicto warn'; v.innerHTML = '<div><strong>Esperando tu texto</strong>Pega el cuerpo del trabajo y la lista de referencias, o carga el ejemplo.</div>'; }
  else if(!res.resultados.length){ v.className='veredicto warn'; v.innerHTML = '<div><strong>No se detectaron citas</strong>Revisa que las citas tengan el formato Autor (año) o (Autor, año).</div>'; }
  else if(errores){ v.className='veredicto err'; v.innerHTML = `<div><strong>Hay ${errores} error${errores===1?'':'es'} de correspondencia</strong>Corrige primero las citas sin referencia, las referencias no citadas y los años que no coinciden.</div>`; }
  else if(avisos){ v.className='veredicto warn'; v.innerHTML = `<div><strong>La correspondencia es completa, con ${avisos} punto${avisos===1?'':'s'} por revisar</strong>Revisa el formato de autores, el orden de la lista y los localizadores.</div>`; }
  else { v.className='veredicto ok'; v.innerHTML = '<div><strong>Todo corresponde</strong>Cada cita tiene su referencia y cada referencia está citada.</div>'; }

  $('nCitas').textContent = res.resultados.length;
  $('nRefs').textContent = res.refs.length;

  /* Citas */
  let citas = res.resultados.map(r => ({...r}));
  const quotes = res.comillas.map(q => ({ estado:'warn', c:{ raw:'“' + q.texto + '”', forma:'textual' }, msgs:[].concat(q.sinLoc ? [['warn','Cita textual sin localizador: agrega la página, el párrafo, la sección o la marca de tiempo después de la cita.']] : [],
    q.angulares ? [['warn','En APA las citas textuales van entre comillas dobles (“ ”), no entre comillas angulares (« »).']] : []), refs:[] }));
  citas = citas.concat(quotes);
  if(filtro==='problemas') citas = citas.filter(r => r.estado==='err' || r.estado==='warn');
  $('listaCitas').innerHTML = citas.length ? citas.map(r => {
    const tipo = r.c.forma==='narrativa' ? 'Narrativa' : r.c.forma==='parentetica' ? 'Parentética' + (r.c.multiple ? ' · cita múltiple' : '') : 'Cita textual';
    const extra = r.refs && r.refs.length ? `<div class="refmatch">↳ ${esc(r.refs[0].raw)}</div>` : '';
    const cabeza = r.c.multiple ? `(${esc(r.c.seg.texto)})<div class="refmatch mt-2">Dentro de ${esc(r.c.raw)}</div>` : esc(r.c.raw);
    return tarjeta(r.estado, cabeza, tipo, r.msgs, extra);
  }).join('') : `<div class="vacio">${res.resultados.length ? 'No hay citas por corregir.' : 'Aún no hay citas detectadas.'}</div>`;

  /* Referencias */
  let refs = res.refs;
  if(filtro==='problemas') refs = refs.filter(r => r.estado!=='ok');
  $('listaRefs').innerHTML = refs.length ? refs.map(r => tarjeta(r.estado, esc(r.raw), `Referencia n.º ${r.idx+1}`, r.problemas)).join('')
    : `<div class="vacio">${res.refs.length ? 'No hay referencias por corregir.' : 'Aún no hay referencias.'}</div>`;

  pintarTextoResaltado(texto, res);
  if(!cargando && esEjemplo){ esEjemplo = false; $('ejFlag').hidden = true; }
}

function mostrar(t){
  tab = t;
  for(const [k,b,p] of [['citas','tabCitas','panCitas'],['refs','tabRefs','panRefs'],['texto','tabTexto','panTexto']]){
    $(b).setAttribute('aria-selected', String(k===t)); $(p).hidden = k!==t;
  }
  $('filtro').hidden = t==='texto';
}
function cargarEjemplo(){
  cargando = true; $('texto').value = EJ_TEXTO; $('refs').value = EJ_REFS; esEjemplo = true; $('ejFlag').hidden = false; render(); cargando = false;
}

let espera;
const programar = () => { clearTimeout(espera); espera = setTimeout(render, 250); };
$('texto').addEventListener('input', programar);
$('refs').addEventListener('input', programar);
$('tabCitas').addEventListener('click', ()=>mostrar('citas'));
$('tabRefs').addEventListener('click', ()=>mostrar('refs'));
$('tabTexto').addEventListener('click', ()=>mostrar('texto'));
document.querySelectorAll('#filtro .chip').forEach(c => c.addEventListener('click', ()=>{
  filtro = c.dataset.f;
  document.querySelectorAll('#filtro .chip').forEach(x => x.setAttribute('aria-pressed', String(x===c)));
  render();
}));
$('btnEjemplo').addEventListener('click', cargarEjemplo);
$('btnLimpiar').addEventListener('click', ()=>{ $('texto').value=''; $('refs').value=''; esEjemplo=false; $('ejFlag').hidden=true; render(); $('texto').focus(); });

cargarEjemplo();

/* El contador de uso compartido vive ahora en ../assets/js/contador.js */
