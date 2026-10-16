/*
  Contador de uso compartido · colección APA · Biblioteca Jorge Roa Martínez (UTP)

  Reemplaza la capacidad "db" de Claude Artifacts. Cada vez que se abre una
  herramienta registra una visualización en el servicio del CRIE
  (backend-contador/) y muestra el total en el distintivo del ojo.

  - La herramienta se identifica con el atributo data-contador del <body>.
  - Solo se envía el identificador de la herramienta: ningún dato de la
    persona ni del contenido que escribe.
  - Si el servicio no está configurado o no responde, el distintivo queda
    oculto y la herramienta sigue funcionando igual.
*/
(function () {
  "use strict";

  var config = window.BIC_APA_CONFIG || {};
  var base = String(config.apiContador || "").replace(/\/+$/, "");
  var herramienta = document.body && document.body.getAttribute("data-contador");
  var badge = document.getElementById("usageCounter");
  var num = document.getElementById("usageCountNum");

  if (!base || !herramienta || !badge || !num || !window.fetch) return;
  if (!/^[a-z0-9-]{1,40}$/.test(herramienta)) return;

  var controlador = typeof AbortController === "function" ? new AbortController() : null;
  var espera = setTimeout(function () { if (controlador) controlador.abort(); }, 6000);

  fetch(base + "/api/contadores/" + herramienta, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    signal: controlador ? controlador.signal : undefined
  })
    .then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.json();
    })
    .then(function (datos) {
      var total = Number(datos && datos.total);
      if (!isFinite(total) || total < 0) return;
      num.textContent = total.toLocaleString("es-CO");
      badge.title = total === 1 ? "1 visualización registrada" : total.toLocaleString("es-CO") + " visualizaciones registradas";
      badge.setAttribute("aria-label", badge.title);
      badge.hidden = false;
    })
    .catch(function () { /* servicio no disponible: no se muestra el contador */ })
    .then(function () { clearTimeout(espera); });
})();
