/*
  Configuración del Panel docente BIC y de los laboratorios gamificados (UTP)

  api: dirección base del servicio del panel que aloja el CRIE en el servidor
  de la UTP (carpeta panel-docente/backend-panel/ de este repositorio), sin
  barra final. Ejemplo: "https://panel-bic.utp.edu.co"

  Mientras esté vacía:
    - los laboratorios funcionan con normalidad; al unirse a una sesión, el
      resultado se entrega con un código y un QR al final de la partida;
    - el Panel docente trabaja en «modo sin servidor»: crea sesiones y registra
      esos códigos en el navegador del docente, sin seguimiento en vivo.

  IMPORTANTE: si el servicio queda en un dominio que NO termina en
  .utp.edu.co, hay que agregar ese origen a la directiva connect-src de la
  etiqueta <meta http-equiv="Content-Security-Policy"> del panel y de los
  laboratorios.

  pedirCodigos: si el laboratorio no logra consultar la sesión (sin red), si
  debe pedir códigos de estudiante. Por defecto false: solo nombre del equipo.
  Cada sesión define esto en el Panel docente («Identificación de los equipos»).
*/
window.BIC_PANEL_CONFIG = Object.freeze({
  api: "",
  pedirCodigos: false,
  laboratorios: Object.freeze({
    "grid-masters": { nombre: "Grid Masters", area: "Ingeniería eléctrica", ruta: "../grid-masters/" },
    "turno-urgencias": { nombre: "Turno de urgencias", area: "Patología Médica", ruta: "../laboratorio-patologia/" }
  })
});
