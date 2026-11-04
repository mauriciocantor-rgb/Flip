/* Preguntas frecuentes APA 7 · buscador de preguntas
   v1.1 (nov. 2026): no distingue tildes ni mayúsculas, busca palabras completas
   o su comienzo (así «tesis» no trae «paréntesis») y avisa cuando no hay resultados. */
'use strict';
var q = document.getElementById('q');
var aviso = document.getElementById('sinResultados');
function normaliza(t){
  return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[\[\]()«»“”"'.,;:¿?¡!]/g, ' ');
}
document.querySelectorAll('details').forEach(function(d){
  d.dataset.busqueda = ' ' + normaliza(d.textContent).replace(/\s+/g, ' ') + ' ';
});
q.addEventListener('input', function(){
  var palabras = normaliza(q.value).split(/\s+/).filter(Boolean);
  var frase = ' ' + palabras.join(' ');
  var todas = Array.prototype.slice.call(document.querySelectorAll('details'));
  // Si la frase completa aparece en alguna pregunta, se muestran solo esas; si no, las que tengan todas las palabras.
  var conFrase = palabras.length > 1 && todas.some(function(d){ return d.dataset.busqueda.indexOf(frase) > -1; });
  var visibles = 0;
  todas.forEach(function(d){
    var m = conFrase ? d.dataset.busqueda.indexOf(frase) > -1
                     : palabras.every(function(p){ return d.dataset.busqueda.indexOf(' ' + p) > -1; });
    d.classList.toggle('hide', !m);
    if(m) visibles++;
    d.open = palabras.length > 0 && m;
  });
  aviso.hidden = !(palabras.length && visibles === 0);
});

/* El contador de uso compartido vive en ../assets/js/contador.js */
