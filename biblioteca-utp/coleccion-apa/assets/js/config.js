/*
  Configuración de la colección APA · Biblioteca Jorge Roa Martínez (UTP)

  apiContador: dirección base del servicio de contador que aloja el CRIE en
  el servidor de la UTP (carpeta backend-contador/ de este repositorio),
  sin barra final. Ejemplo: "https://contador-bic.utp.edu.co"

  Mientras esté vacía, las herramientas funcionan con normalidad y
  simplemente no muestran el número de visualizaciones.

  IMPORTANTE: si el servicio queda en un dominio que NO termina en
  .utp.edu.co, hay que agregar ese origen a la directiva connect-src de la
  etiqueta <meta http-equiv="Content-Security-Policy"> de cada página.
*/
window.BIC_APA_CONFIG = Object.freeze({
  apiContador: ""
});
