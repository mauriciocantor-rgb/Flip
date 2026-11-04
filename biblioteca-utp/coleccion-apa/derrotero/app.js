/*
  Derrotero de la capacitación APA 7 · guía para orientadores
  Biblioteca e Información Científica (BIC) · Universidad Tecnológica de Pereira
  Los colores y proporciones generados se aplican con element.style (CSSOM),
  porque la política de seguridad del CRIE no admite estilos en línea.
*/
function pintar(raiz){
  raiz.querySelectorAll("[data-bg]").forEach(el=>{el.style.background=el.dataset.bg});
  raiz.querySelectorAll("[data-fg]").forEach(el=>{el.style.color=el.dataset.fg});
  raiz.querySelectorAll("[data-flex]").forEach(el=>{el.style.flex=el.dataset.flex});
}
const MAT={
  info:{n:"Infografía Configuración del Formato General",c:"var(--m-info)"},
  anat:{n:"Infografía Anatomía de las citas",c:"var(--m-plant)"},
  cons:{n:"Constructor de citas",c:"var(--m-cons)"},
  guia:{n:"Guía de citas y referencias APA 7",c:"var(--m-guia)"},
  ver:{n:"Verificador",c:"var(--m-ver)"},
  faq:{n:"Preguntas frecuentes",c:"var(--m-faq)"},
  tab:{n:"Infografía Tablas y figuras",c:"var(--m-none)"}
};
const B=[
 {t:"Formato del documento",short:"Formato",d:{120:15,90:10},main:"info",sup:["guia","tab"],img:["fmt","tab"],
  obj:"Dejar el documento configurado antes de hablar de citas.",
  fac:["Abre con una bienvenida breve (2 o 3 minutos): por qué se cita y qué herramientas se llevarán.","Proyecta la infografía Configuración del Formato General (está debajo de este bloque) y recorre sus 5 secciones: tamaño de hoja y márgenes, fuentes aceptadas, espaciado y alineación, numeración y encabezado, niveles de títulos.","Termina con el recuadro de portada para trabajos estudiantiles: título en negrita, nombre del estudiante, afiliación (facultad o programa e institución), asignatura (código y nombre), nombre del docente y fecha de entrega (día, mes y año).","Remite a la guía, capítulo 1 (pp. 3–4): excepciones a la fuente única y al interlineado doble, y orden de las partes del trabajo.","Menciona la infografía Tablas y figuras (la segunda de este bloque) y el capítulo 3 de la guía (pp. 11–13); si el grupo trabaja con datos, muéstrala en 2 minutos."],
  est:["Abren la colección APA en su equipo.","Configuran su propio documento siguiendo la infografía."],
  tip:"Deja la infografía proyectada mientras configuran; el diagnóstico rápido (¿han tenido devoluciones por APA?) cabe en la bienvenida."},
 {t:"Anatomía de una cita",short:"Anatomía",d:{120:20,90:15},main:"anat",sup:["guia"],img:"anat",
  obj:"Entender las partes de la cita y las formas de integrarla al texto.",
  fac:["Proyecta la infografía Anatomía de las citas (está debajo de este bloque) y explica sus 4 secciones en orden.","Anatomía: autor, año y localizador (página, párrafo o marca de tiempo).","Enfoques: cita narrativa y cita parentética.","Tipos según extensión y forma: textual corta, en bloque (40 palabras o más; con exactamente 40 ya va en bloque) y paráfrasis.","Reglas de oro y normativa UTP: «y» entre dos autores, también dentro del paréntesis, y verbo en plural con dos autores.","Apóyate en la guía, capítulo 2 (pp. 5–10): el esquema «La cita en tres preguntas» y la tabla de autores (instituciones con sigla, obra sin autor)."],
  est:["Señalan las partes de la cita en un ejemplo proyectado.","Convierten una cita narrativa en parentética y al revés."],
  tip:"Usa un mismo ejemplo para las cuatro secciones; en el bloque 3 lo resolverás en el constructor."},
 {t:"Constructor de citas",short:"Constructor",d:{120:25,90:20},main:"cons",sup:["anat"],tool:true,
  obj:"Que cada estudiante construya citas correctas con apoyo de la herramienta.",
  fac:["Proyecta el constructor que está debajo de este bloque y resuelve en vivo el ejemplo del bloque 2, paso por paso: datos de la fuente, tipo de cita y resultado.","Usa «Ver un ejemplo» para mostrar una cita textual corta con dos autores.","Asigna tres casos: parafraseo con un autor (narrativa), cita textual corta con tres o más autores (parentética, con página) y cita en bloque con dos autores (narrativa).","Señala la lista «Cómo queda y por qué»: explica cada regla aplicada a la cita del estudiante."],
  est:["Construyen las tres citas.","Copian el resultado a su documento ya configurado."],
  tip:"Pide a un voluntario que proyecte una de sus citas y que el grupo la corrija: aprenden más del error que de la cita perfecta."},
 {t:"Referencias con la guía de la biblioteca",short:"Referencias",d:{120:25,90:20},main:"guia",sup:[],
  obj:"Construir la lista de referencias con la guía institucional como fuente.",
  fac:["Abre la guía en el capítulo 4, Lista de referencias (pp. 14–16), y proyecta la «Anatomía de una referencia»: autor, fecha, título y fuente (¿quién?, ¿cuándo?, ¿qué?, ¿dónde?).","Reglas de la lista: página nueva con el título Referencias centrado y en negrita, interlineado doble, sangría francesa de 1,27 cm y orden alfabético.","Explica cada elemento con sus tablas: autores (dos con «y»; de 3 a 20, todos), fecha (s.f., en prensa), título (mayúscula solo inicial; cursiva si es obra independiente) y fuente (editorial sin ciudad).","Cierra con DOI y URL: el DOI como enlace https://doi.org/, sin punto final y sin «Recuperado de».","Pasa al capítulo 5, Ejemplos de referencias (pp. 17–18), y muestra los modelos que más usan: artículo con DOI, libro, capítulo de libro editado, trabajo de grado en el Repositorio Institucional UTP y página web."],
  est:["Escriben, con el modelo de las pp. 17–18, la referencia de una fuente que estén usando.","Revisan en pareja que su referencia tenga los cuatro elementos y coincida con su cita del bloque 3."],
  tip:"Si alguien usa ChatGPT u otra IA, muestra el último ejemplo de la p. 18: la empresa es el autor y el prompt se describe en el texto o en un apéndice."},
 {t:"Verificador de citas y referencias",short:"Verificador",d:{120:20,90:15},main:"ver",sup:["guia"],
  obj:"Detectar citas sin referencia, referencias sin citar y datos que no coinciden.",
  fac:["Pega en el verificador el material de práctica de esta guía (primero el texto, luego la lista).","Lee con el grupo el resumen y las pestañas de resultados.","Comenta los tres errores sembrados y corrígelos con la guía.","Proyecta la tabla «Errores frecuentes» de la guía (p. 19) y pide que identifiquen cuáles cometieron.","Recuerda que el análisis se hace en el navegador y el texto no se guarda."],
  est:["Pegan un fragmento de su propio trabajo con su lista de referencias.","Corrigen lo que marque la herramienta."],
  tip:"Si nadie trae texto propio, pídeles que modifiquen el texto de práctica (cambiar un año, borrar una referencia) y vuelvan a verificar."},
 {t:"Preguntas frecuentes y cierre",short:"FAQ y cierre",d:{120:15,90:10},main:"faq",sup:["info","anat","cons","guia","ver"],
  obj:"Resolver casos difíciles de forma autónoma y dejar las herramientas a mano.",
  fac:["Plantea un reto de búsqueda en el FAQ: ¿cómo se cita una fuente sin fecha? ¿sin autor? ¿sin página? ¿una cita que ocupa dos páginas?","Contrasta una respuesta con la guía: «Casos especiales» y «Cambios dentro de una cita textual» (pp. 9–10).","Cierra con la «Lista de verificación antes de entregar» de la guía (p. 19) y el flujo de trabajo: formato → anatomía → constructor → guía → verificador → FAQ.","Comparte el kit de enlaces y la guía en PDF, aplica la evaluación de la sesión y cuenta cómo pedir asesoría a la biblioteca."],
  est:["Buscan en el FAQ y explican el caso a sus compañeros.","Guardan los enlaces y la guía, y responden la evaluación."],
  tip:"Si vas tarde, reduce el reto del FAQ a un solo caso; el cierre con la lista de verificación, el kit y la evaluación no se recorta."}
];
const PRE=[
 "Abre la colección en GitHub Pages y deja en pestañas, en este orden: Formato general, Anatomía de las citas, constructor, verificador y FAQ.",
 "Ten abierta la Guía de citas y referencias en PDF, con el capítulo 4 (p. 14) a mano para el bloque 4.",
 "Comprueba que los enlaces abren desde el equipo de la sala y que el proyector se lee bien.",
 "Prueba el texto de práctica en el verificador y anota cómo reporta cada error.",
 "Ten un documento de Word en blanco listo para la demostración de formato.",
 "Prepara los enlaces del kit para pegarlos en el chat o en el aula virtual.",
 "Pide a los estudiantes que traigan un trabajo propio con citas y referencias."
];
const IMGS={tab:"img/tablas-figuras.webp",fmt:"img/formato-general.webp",anat:"img/anatomia-citas.webp"};
const FIGS={
  tab:{h:2703,t:"Apoyo: infografía Tablas y figuras (capítulo 3 de la guía)",alt:"Infografía Presentación de Tablas y Figuras APA 7: anatomía de una tabla, componentes de una figura, reglas de mención en el texto y nota de derechos de autor"},
  fmt:{h:2849,alt:"Infografía Configuración del Formato General APA 7: tamaño de hoja y márgenes, fuentes aceptadas, espaciado y alineación, numeración y encabezado, niveles de títulos y portada para trabajos estudiantiles"},
  anat:{h:3178,alt:"Infografía Estructura y Anatomía de Citas APA 7: anatomía de la cita (autor, año, localizador), cita narrativa y parentética, tipos de cita según extensión y reglas de oro de la UTP"}
};
const figura=k=>`<figure class="fig" id="fig-${k}"><div class="fig-frame"><img src="${IMGS[k]}" alt="${FIGS[k].alt}" width="1000" height="${FIGS[k].h}" loading="lazy"></div><figcaption><span>${FIGS[k].t||"Infografía para proyectar en este bloque"}</span><button type="button" class="btn figbtn" data-fig="${k}" aria-expanded="false">Ver completa</button></figcaption></figure>`;
/* Constructor de citas embebido: versión simplificada (3 pasos) */
const CONS=(()=>{
  const node=document.getElementById("consTpl").content.firstElementChild.cloneNode(true);
  const $=id=>node.querySelector("#"+id);
  const val=id=>$(id).value.trim();
  const radio=n=>node.querySelector(`input[name="${n}"]:checked`).value;
  const LOC={p:"p.",pp:"pp.",parr:"párr.",tiempo:""};
  const fmtLoc=(lt,v)=>(LOC[lt]?LOC[lt]+" ":"")+v;
  const autores=(n,a1,a2)=>n==="1"?a1:n==="2"?`${a1} y ${a2}`:`${a1} et al.`;
  const limpiar=t=>t.replace(/^[\s"“”«»']+|[\s"“”«»']+$/g,"");
  let ultimo="";
  function render(){
    const n=$("cNum").value, tipo=radio("cTipo"), forma=radio("cForma"), lt=$("cLocT").value;
    $("cA2w").hidden=n!=="2"; $("cTxtw").hidden=tipo==="parafraseo";
    $("cLocL").textContent=tipo==="parafraseo"?"Número (opcional al parafrasear)":"Número (obligatorio en cita textual)";
    const a1=val("cA1"), a2=val("cA2"), anio=val("cAnio"), loc=val("cLoc").replace(/\s*[-–]\s*/,"–"), txt=limpiar(val("cTxt"));
    const pend=[];
    if(!a1)pend.push("Escribe el apellido del primer autor.");
    if(n==="2"&&!a2)pend.push("Escribe el apellido del segundo autor.");
    if(!anio)pend.push("Escribe el año o «s.f.» si la fuente no tiene fecha.");
    else if(!/^(\d{4}[a-z]?|s\.f\.|en prensa)$/i.test(anio))pend.push("El año debe tener cuatro cifras (2021) o ser «s.f.».");
    if(tipo!=="parafraseo"&&!loc)pend.push("En una cita textual la ubicación es obligatoria: página, rango o párrafo.");
    if(tipo!=="parafraseo"&&!txt)pend.push("Pega el texto que vas a citar.");
    if(lt==="pp"&&loc&&!/[–,]/.test(loc))pend.push("Escribe dos páginas: seguidas con guion (23-24) o no seguidas con coma (84, 90).");
    if(lt==="tiempo"&&loc&&!/^\d{1,2}:\d{2}(:\d{2})?$/.test(loc))pend.push("La marca de tiempo se escribe así: 12:30 o 1:02:15.");
    const palabras=txt?txt.split(/\s+/).length:0, cc=$("cConteo");
    cc.className="cons-conteo";
    if(tipo==="corta"&&palabras){cc.textContent=palabras<40?`${palabras} palabras: cita corta.`:`${palabras} palabras: son 40 o más, usa «Cita en bloque».`;cc.classList.add(palabras<40?"ok":"mal")}
    else if(tipo==="bloque"&&palabras){cc.textContent=palabras>=40?`${palabras} palabras: cita en bloque.`:`${palabras} palabras: son menos de 40, usa «Cita textual corta».`;cc.classList.add(palabras>=40?"ok":"mal")}
    else cc.textContent="";
    const A=a1||"Apellido", B=a2||"Apellido", Y=anio||"año", aut=autores(n,A,B);
    const V=n==="1"?"señala":"señalan";
    const ubi=loc?fmtLoc(lt,loc):fmtLoc(lt,lt==="tiempo"?"00:00":"00");
    const ubiOpc=loc?`, ${fmtLoc(lt,loc)}`:"";
    const ubiFin=loc?` (${fmtLoc(lt,loc)})`:"";
    const T=txt||"texto copiado de la fuente";
    let html="", plano="";
    const e=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const ph=(s,ok)=>ok?e(s):`<span class="ph">${e(s)}</span>`;
    if(tipo==="parafraseo"){
      if(forma==="narrativa"){plano=`${aut} (${Y}) ${V} que [tu idea con tus palabras]${ubiFin}.`;html=`<p>${ph(aut,a1)} (${ph(Y,anio)}) ${V} que <span class="ph">[tu idea con tus palabras]</span>${e(ubiFin)}.</p>`}
      else{plano=`[Tu idea con tus palabras] (${aut}, ${Y}${ubiOpc}).`;html=`<p><span class="ph">[Tu idea con tus palabras]</span> (${ph(aut,a1)}, ${ph(Y,anio)}${e(ubiOpc)}).</p>`}
    }else if(tipo==="corta"){
      const t=T.replace(/[.,;:]+$/,"");
      if(forma==="narrativa"){plano=`${aut} (${Y}) ${V} que “${t}” (${ubi}).`;html=`<p>${ph(aut,a1)} (${ph(Y,anio)}) ${V} que “${ph(t,txt)}” (${ph(ubi,loc)}).</p>`}
      else{plano=`“${t}” (${aut}, ${Y}, ${ubi}).`;html=`<p>“${ph(t,txt)}” (${ph(aut,a1)}, ${ph(Y,anio)}, ${ph(ubi,loc)}).</p>`}
    }else{
      const t=/[.!?…]$/.test(T)?T:T+".";
      if(forma==="narrativa"){plano=`${aut} (${Y}) ${V}:\n\n${t} (${ubi})`;html=`<p>${ph(aut,a1)} (${ph(Y,anio)}) ${V}:</p><p class="blq">${ph(t,txt)} (${ph(ubi,loc)})</p>`}
      else{plano=`${t} (${aut}, ${Y}, ${ubi})`;html=`<p class="blq">${ph(t,txt)} (${ph(aut,a1)}, ${ph(Y,anio)}, ${ph(ubi,loc)})</p>`}
    }
    $("cOut").innerHTML=html; ultimo=plano;
    $("cPend").innerHTML=pend.map(p=>`<li>${e(p)}</li>`).join("");
    const k=[];
    k.push(n==="1"?"Un autor: solo el apellido.":n==="2"?"Dos autores: se unen con «y», también dentro del paréntesis.":"Tres o más autores: primer apellido + «et al.» desde la primera cita.");
    if(forma==="narrativa")k.push("Narrativa: el apellido forma parte de tu frase y el año va entre paréntesis justo después.");
    else k.push("Parentética: autor y año van juntos al final, separados por coma.");
    if(tipo==="parafraseo")k.push("Parafraseo: no lleva comillas; la página es opcional, pero APA recomienda incluirla en obras extensas. En la narrativa va al final de la oración.");
    if(lt==="tiempo")k.push("Video o audio: la ubicación es la marca de tiempo, sin «p.».");
    if(lt==="pp"&&/,/.test(loc))k.push("Páginas no seguidas: pp. y coma.");
    if(tipo==="corta")k.push("Menos de 40 palabras: entre comillas, dentro del párrafo. El punto va después del paréntesis.");
    if(tipo==="bloque")k.push("40 palabras o más (con exactamente 40 ya va en bloque): párrafo aparte con sangría de 1,27 cm, sin comillas. La ubicación va después del punto final, sin punto adicional.");
    if(anio.toLowerCase()==="s.f.")k.push("Sin fecha: se escribe «s.f.».");
    $("cClaves").innerHTML=k.map(x=>`<li>${e(x)}</li>`).join("");
    $("cAviso").textContent="";
  }
  node.addEventListener("input",render); node.addEventListener("change",render);
  $("cCopiar").addEventListener("click",()=>{
    const ok=()=>{$("cAviso").textContent="Cita copiada."};
    const sel=()=>{const r=document.createRange();r.selectNodeContents($("cOut"));const s=getSelection();s.removeAllRanges();s.addRange(r);$("cAviso").textContent="Cita seleccionada: usa Ctrl+C."};
    try{navigator.clipboard.writeText(ultimo).then(ok,sel)}catch(_){sel()}
  });
  $("cEj").addEventListener("click",()=>{
    $("cNum").value="2";$("cA1").value="Restrepo";$("cA2").value="Cardona";$("cAnio").value="2019";
    node.querySelector('input[name="cTipo"][value="corta"]').checked=true;
    node.querySelector('input[name="cForma"][value="parentetica"]').checked=true;
    $("cLocT").value="p";$("cLoc").value="45";$("cTxt").value="la biblioteca universitaria es un espacio para aprender a investigar";render();
  });
  $("cLimpiar").addEventListener("click",()=>{node.querySelectorAll("input[type=text],textarea").forEach(i=>i.value="");$("cNum").value="1";$("cLocT").value="p";
    node.querySelector('input[name="cTipo"][value="parafraseo"]').checked=true;node.querySelector('input[name="cForma"][value="narrativa"]').checked=true;render()});
  render();
  return node;
})();

let dur=120;
try{const s=localStorage.getItem("derrotero-dur");if(s==="90"||s==="120")dur=+s}catch(e){}
const fmt=m=>{const h=Math.floor(m/60),mm=m%60;return h?`${h}:${String(mm).padStart(2,"0")}`:`0:${String(mm).padStart(2,"0")}`};
const chip=k=>`<span class="mat" data-fg="${MAT[k].c}">${MAT[k].n}</span>`;
function render(){
  document.querySelectorAll(".seg button").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.d===dur));
  let t=0,rib="",blk="";
  B.forEach((b,i)=>{
    const d=b.d[dur],s=t,e=t+d;t=e;
    rib+=`<a href="#b${i+1}" data-flex="${d}" data-bg="${MAT[b.main].c}" title="${b.t} · ${d} min"><span class="rn">${d}′</span><span class="rt">${b.short}</span></a>`;
    blk+=`<article class="block" id="b${i+1}">
      <div class="when"><span class="num">${i+1}</span><span class="range">${fmt(s)}–${fmt(e)}</span><span class="mins">${d} min</span></div>
      <div class="what"><h3>${b.t}</h3><p class="obj">${b.obj}</p>
      <div class="mats">${b.main!=="none"?chip(b.main):""}${b.sup.map(chip).join("")}</div>
      <div class="cols"><div><h4>La facilitadora</h4><ul>${b.fac.map(x=>`<li>${x}</li>`).join("")}</ul></div>
      <div><h4>Los estudiantes</h4><ul>${b.est.map(x=>`<li>${x}</li>`).join("")}</ul></div></div>
      <div class="tip"><b>Consejo:</b> ${b.tip}</div>${b.img?[].concat(b.img).map(figura).join(""):""}${b.tool?'<div class="cons-slot"></div>':""}</div></article>`;
  });
  document.getElementById("ribbon").innerHTML=rib;
  document.getElementById("blocks").innerHTML=blk;
  const slot=document.querySelector(".cons-slot");if(slot&&typeof CONS!=="undefined")slot.appendChild(CONS);
  document.querySelector(".total")&&(document.querySelector(".total").textContent=t+" min");
  const keys=["info","anat","cons","guia","ver","faq","tab"];
  let m=`<thead><tr><th>Material</th>${B.map((b,i)=>`<th class="cen">${i+1}<br>${b.short}</th>`).join("")}<th class="cen">Minutos como principal</th></tr></thead><tbody>`;
  keys.forEach(k=>{
    let mins=0;
    m+=`<tr><td class="name"><span class="dot sm" data-bg="${MAT[k].c}"></span>${MAT[k].n}</td>`+B.map(b=>{
      if(b.main===k){mins+=b.d[dur];return `<td class="c"><span class="dot" data-bg="${MAT[k].c}"></span></td>`}
      if(b.sup.includes(k))return `<td class="c"><span class="dot lite" data-bg="${MAT[k].c}"></span></td>`;
      return `<td class="c"></td>`}).join("")+`<td class="c">${mins||"—"}</td></tr>`;
  });
  document.getElementById("matrix").innerHTML=m+"</tbody>";
  document.getElementById("legend").innerHTML=["info","anat","cons","guia","ver","faq"].map(k=>`<span><i data-bg="${MAT[k].c}"></i>${MAT[k].n}</span>`).join("");
  pintar(document);
}
document.querySelectorAll(".seg button").forEach(b=>b.addEventListener("click",()=>{dur=+b.dataset.d;try{localStorage.setItem("derrotero-dur",dur)}catch(e){}render()}));
let done={};try{done=JSON.parse(localStorage.getItem("derrotero-pre")||"{}")}catch(e){}
document.getElementById("pre").innerHTML=PRE.map((p,i)=>`<label class="check" for="pre${i}"><input type="checkbox" id="pre${i}" ${done[i]?"checked":""}><span>${p}</span></label>`).join("");
document.getElementById("pre").addEventListener("change",e=>{done[e.target.id.slice(3)]=e.target.checked;try{localStorage.setItem("derrotero-pre",JSON.stringify(done))}catch(_){}});
document.querySelectorAll("[data-copy]").forEach(btn=>btn.addEventListener("click",()=>{
  const el=document.getElementById(btn.dataset.copy);
  const txt=[...el.querySelectorAll("p")].map(p=>p.innerText).join(btn.dataset.copy==="pr"?"\n":"\n\n");
  const ok=()=>{btn.textContent="Copiado";setTimeout(()=>btn.textContent="Copiar",1600)};
  const sel=()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent="Texto seleccionado"};
  try{navigator.clipboard.writeText(txt).then(ok,sel)}catch(e){sel()}
}));
render();
document.addEventListener("click",e=>{const bt=e.target.closest(".figbtn");if(!bt)return;const f=document.getElementById("fig-"+bt.dataset.fig),o=f.classList.toggle("open");bt.setAttribute("aria-expanded",o);bt.textContent=o?"Contraer":"Ver completa"});
