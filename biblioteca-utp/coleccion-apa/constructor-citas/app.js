/*
  Constructor de citas APA 7 · v3.0 (versión simplificada) · Biblioteca Jorge Roa Martínez (UTP)
  Tres pasos: datos de la fuente → tipo de cita → resultado.
  Misma lógica que el constructor del derrotero de capacitación, para que orientadores
  y estudiantes vean exactamente lo mismo.
  Reglas: APA Style (apastyle.apa.org) y Guía de citas y referencias de la BIC (cap. 2).
  Todo ocurre en el navegador: no se envía ni se guarda lo que escribe la persona.
*/
(()=>{
  "use strict";
  const node=document.querySelector("main");
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
    cc.className="conteo";
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
})();
