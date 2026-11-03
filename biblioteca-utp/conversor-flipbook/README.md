# Conversor de PDF a Flipbook — UTP

Herramienta interna de la Biblioteca e Información Científica (BIC),
Universidad Tecnológica de Pereira. Convierte un PDF en un flipbook con
efecto de pasar página, sin alterar el contenido original.

Sin backend: todo se procesa en el navegador de quien la usa, así que varias
personas pueden usarla al mismo tiempo con sus propios documentos.

## Archivos

- `index.html`: la herramienta completa (HTML, CSS y JS en un solo archivo).
  Carga PDF.js 3.11.174 y page-flip 2.0.7 desde CDN.

## Uso

1. Abrir la página (GitHub Pages) o el `index.html` en un navegador.
2. Arrastrar un PDF al recuadro o hacer clic para seleccionarlo.
3. Esperar la barra de progreso; el flipbook se abre en la misma ventana.

## Herramientas del visor

- Miniaturas, navegación por página, búsqueda de texto y pantalla completa.
- Zoom con – / + (0,6× a 3×): al acercar, la página se vuelve a generar
  desde el PDF a mayor resolución.
- Descargar el PDF original (idéntico al cargado).
- Descargar el flipbook como un único `.html` que se abre con doble clic,
  para compartir por correo, WhatsApp, Drive o USB.

## Notas

- Necesita internet la primera vez para cargar las librerías desde el CDN.
- El flipbook descargable no incluye PDF.js: con zoom extremo se ve algo
  menos nítido que en el visor en línea.
- Las descargas funcionan en GitHub Pages y abriendo el archivo en local.
  Dentro de un Claude Artifact el navegador las bloquea.

## Dirección esperada en GitHub Pages

https://mauriciocantor-rgb.github.io/flip/biblioteca-utp/conversor-flipbook/
