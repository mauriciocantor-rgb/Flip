/* Preguntas frecuentes APA 7 · buscador de preguntas (lógica sin cambios) */
'use strict';
var q=document.getElementById('q');
q.addEventListener('input',function(){
var t=q.value.toLowerCase().trim();
document.querySelectorAll('details').forEach(function(d){
var m=!t||d.textContent.toLowerCase().indexOf(t)>-1;
d.classList.toggle('hide',!m);
if(t&&m)d.open=true;else if(!t)d.open=false;
});
});

/* El contador de uso compartido vive ahora en ../assets/js/contador.js */
