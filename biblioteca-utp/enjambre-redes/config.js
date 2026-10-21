/*
  Configuración del Enjambre de Redes Sociales · Biblioteca Jorge Roa Martínez (UTP)

  servicioIA: dirección base del servicio de IA que aloja el CRIE en el servidor
  de la UTP (carpeta backend-ia/ de este repositorio), sin barra final.
  Ejemplo: "https://enjambre-ia.utp.edu.co"

  Mientras esté vacía, los bots funcionan en "modo Gemini": arman la instrucción
  completa, la copian y abren Gemini con la cuenta institucional de Google
  Workspace; la respuesta se pega de vuelta en la herramienta.

  geminiUrl: dirección de Gemini que se abre en el modo Gemini.

  IMPORTANTE: si el servicio queda en un dominio que NO termina en .utp.edu.co,
  hay que agregar ese origen a la directiva connect-src de la etiqueta
  <meta http-equiv="Content-Security-Policy"> de index.html.
*/
window.BIC_ENJAMBRE_CONFIG = Object.freeze({
  servicioIA: "",
  geminiUrl: "https://gemini.google.com/app"
});
