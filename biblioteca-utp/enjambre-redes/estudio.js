/* Enjambre · pestaña Estudio de piezas (versión GitHub Pages)
   Canva: la página arma el brief con la identidad de @bibliotecautp, lo copia y abre Canva.
   CapCut: Gemini prepara el plan de edición (servicio del CRIE o modo copiar y pegar). */
(function () {
  'use strict';
  const A = window.ENJ_APP;
  const $ = s => document.querySelector(s);
  const { IDENTIDAD } = window.ENJAMBRE;

  function identidadBrief() {
    const p = IDENTIDAD.paleta.map(c => `${c.nombre.toLowerCase()} ${c.hex}`).join(', ');
    return `\n\nIdentidad de la Biblioteca Jorge Roa Martínez (Universidad Tecnológica de Pereira), tomada de su Instagram @bibliotecautp: fondo gris claro #F0F0F0 con franjas superior e inferior azul marino #003060; paleta ${p}; título en serif gruesa azul marino, subtítulo en cursiva roja #D83030, texto de apoyo en sans-serif; tono cercano y claro. Dejar libre la esquina superior izquierda para insertar después el logo oficial búho-libro: no dibujar ningún logo ni búho.`;
  }

  function briefFinal() {
    const brief = $('#cvBrief').value.trim();
    if (!brief) return '';
    return `Formato: ${$('#cvFormat').selectedOptions[0].textContent}.\n\n${brief}${$('#cvBrand').checked ? identidadBrief() : ''}`;
  }

  /* Canva: copiar el brief y abrir Canva */
  $('#canvaForm').addEventListener('submit', e => e.preventDefault());
  $('#btnCanva').addEventListener('click', async () => {
    const st = $('#canvaStatus'), hint = $('#canvaHint');
    const texto = briefFinal();
    if (!texto) { hint.textContent = 'Escribe el brief de la pieza.'; return; }
    hint.textContent = '';
    $('#cvFinal').textContent = texto;
    const ok = await A.copiar(texto, $('#cvFinal'));
    $('#cvVer').open = !ok;
    st.textContent = ok
      ? 'Brief copiado. En Canva, crea el diseño con el formato elegido y pega el brief en la herramienta de IA de Canva (o úsalo como guía para la plantilla).'
      : 'No se pudo copiar solo: el brief quedó seleccionado abajo, cópialo con Ctrl+C.';
  });

  $('#btnFromDesigner').addEventListener('click', () => {
    const r = A.resultado('prompts');
    if (r && r.texto) { $('#cvBrief').value = r.texto.slice(0, 6000); $('#canvaHint').textContent = 'Brief traído del Diseñador de Prompts.'; }
    else $('#canvaHint').textContent = 'Aún no hay un resultado del Diseñador de Prompts en esta sesión.';
  });

  /* CapCut: plan de edición con Gemini */
  let cancelar = null;
  $('#capForm').addEventListener('submit', e => {
    e.preventDefault();
    const out = $('#capOut'), b = $('#btnCap');
    if (cancelar) { cancelar(); cancelar = null; b.textContent = 'Preparar plan de edición'; return; }
    const guion = $('#capGuion').value.trim();
    if (!guion) { $('#capHint').textContent = 'Pega un guion o describe el video.'; return; }
    $('#capHint').textContent = '';
    const prompt = `Actúa como el editor de video del Enjambre de Marketing Digital de la Biblioteca Jorge Roa Martínez (UTP).
${A.bloqueIdentidad()}

Prepara el plan de edición en CapCut para un ${$('#capRed').value} de ${$('#capDur').value} a partir de este guion o idea:
"""${guion.slice(0, 8000)}"""

Entrega en Markdown, en español de Colombia, sin preámbulo:
## Configuración del proyecto (relación 9:16, 1080×1920, 30 fps, duración total)
## Línea de tiempo: tabla con columnas Clip | Inicio–fin | Material (qué grabar o qué imagen usar) | Texto en pantalla | Estilo del texto (color con hex de la paleta, tamaño relativo, animación de CapCut sugerida) | Transición | Sonido
## Subtítulos: usar «Subtítulos automáticos» de CapCut, revisar ortografía, estilo sugerido con colores de marca y contraste suficiente
## Portada: texto en sans-serif gruesa en mayúsculas sobre rojo #D83030 o azul marino #003060, con espacio para el logo búho-libro
## Música: tipo de audio sugerido (de la biblioteca de audios con licencia de CapCut o de la red), sin nombrar canciones específicas
## Exportación y publicación: resolución, formato y lista de control final de marca y accesibilidad (6 puntos)
No inventes datos institucionales: usa [DATO POR CONFIRMAR].`;
    if (A.conServicio) b.textContent = 'Detener';
    cancelar = A.ejecutar(prompt, out, texto => {
      out.innerHTML = A.md(texto) + '<p class="ai-note">Plan generado con Gemini: revísalo antes de editar. <a href="#declaratoria" class="lnk-decl">Ver declaratoria</a></p>';
      cancelar = null; b.textContent = 'Preparar plan de edición';
    });
    if (!cancelar) b.textContent = 'Preparar plan de edición';
  });

  $('#btnFromGuion').addEventListener('click', () => {
    const r = A.resultado('guiones');
    if (r && r.texto) { $('#capGuion').value = r.texto.slice(0, 8000); $('#capHint').textContent = 'Guion traído del bot de Guiones y Storyboards.'; }
    else $('#capHint').textContent = 'Aún no hay un resultado del bot de Guiones en esta sesión.';
  });
})();
