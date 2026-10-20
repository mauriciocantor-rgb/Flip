/*
  Conector de sesión · Panel docente BIC · Biblioteca Jorge Roa Martínez (UTP)

  Une un laboratorio gamificado (Grid Masters, Turno de urgencias) a una
  sesión creada por el docente en el Panel docente BIC:
    - el equipo escribe el código de sesión, su nombre y los códigos de
      estudiante, y autoriza el tratamiento de datos (Ley 1581 de 2012);
    - cada 3 s envía el estado del juego y los eventos nuevos al servicio del
      panel (backend-panel/, alojado por el CRIE) y recibe las órdenes del
      docente (iniciar, pausar, reanudar, lanzar un evento, mensaje);
    - al terminar, envía el resultado y además muestra un código de resultado
      con su QR, que el docente puede escanear si no hubo red.

  Sin servidor configurado hay dos casos:
    - Modo de prueba: si la sesión fue creada en el Panel docente de ESTE
      navegador, el juego y el panel se comunican por localStorage (mismo
      sitio, mismo navegador): seguimiento en vivo, órdenes y reporte, sin
      servidor. Sirve para probar antes de que el CRIE aloje el servicio.
    - Si no, el resultado se entrega con el código y el QR al final.

  No usa estilos ni manejadores en línea (compatible con la CSP del CRIE).
  Necesita qrcode-generator (Kazuhiko Arase, licencia MIT) para dibujar el QR.
*/
(function () {
  "use strict";

  var CONF = window.BIC_PANEL_CONFIG || {};
  var CLAVE = "bic-sesion-v1";
  var INTERVALO = 3000;
  var PATRON_CODIGO = /^BIC-[A-Z0-9]{3}$/;
  var PATRON_ESTUDIANTE = /^[A-Za-z0-9.\-]{3,20}$/;
  var CLAVE_PANEL_LOCAL = "bic-panel-local-v1";      // base del Panel docente sin servidor
  var PREF_EQUIPO = "bic-panel-equipo:";               // + código + ":" + id  (lo escribe cada juego)
  var PREF_CMD = "bic-panel-cmd:";                     // + código              (lo escribe el panel)
  function lsLeer(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsGuardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function sesionDePrueba(codigo) { var db = lsLeer(CLAVE_PANEL_LOCAL); return db && db.sesiones && db.sesiones[codigo] || null; }

  function apiBase() {
    var base = String(CONF.api || "").replace(/\/+$/, "");
    try {
      var p = new URLSearchParams(location.search).get("api");
      if (p && /^https:\/\/[a-z0-9.-]+\.utp\.edu\.co(:\d+)?$/i.test(p)) base = p.replace(/\/+$/, "");
      if (p && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(p)) base = p;
    } catch (e) { /* sin URLSearchParams */ }
    return base;
  }

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function leer() { try { return JSON.parse(sessionStorage.getItem(CLAVE) || "null"); } catch (e) { return null; } }
  function guardar(v) { try { if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v)); else sessionStorage.removeItem(CLAVE); } catch (e) { /* almacenamiento bloqueado */ } }

  function b64url(texto) {
    var bytes = new TextEncoder().encode(texto), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function suma(texto) { // verificación corta para detectar códigos copiados con errores
    var h = 0;
    for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
    return (h % 65536).toString(16).toUpperCase().padStart(4, "0");
  }

  function qrSvg(texto) {
    if (typeof window.qrcode !== "function") return null;
    var q = window.qrcode(0, "M");
    q.addData(texto, "Byte");
    q.make();
    var n = q.getModuleCount(), m = 4, NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + (n + 2 * m) + " " + (n + 2 * m));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Código QR del resultado");
    svg.setAttribute("class", "bs-qr");
    var fondo = document.createElementNS(NS, "rect");
    fondo.setAttribute("width", n + 2 * m); fondo.setAttribute("height", n + 2 * m); fondo.setAttribute("fill", "#fff");
    svg.appendChild(fondo);
    var d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "#00204A");
    svg.appendChild(path);
    return svg;
  }

  var S = {
    opciones: null, datos: null, cola: [], timer: null, enLinea: false, cerrada: false,
    chip: null, dialogo: null, banner: null, errores: [], registro: [], nEv: 0
  };

  /* ------------------------------------------------------------ interfaz */
  function construirChip() {
    var b = el("button", "bs-chip");
    b.type = "button";
    b.addEventListener("click", function () { if (S.datos) menuSesion(); else abrirUnirse(); });
    document.body.appendChild(b);
    S.chip = b;
    pintarChip();
  }

  function pintarChip() {
    var b = S.chip;
    if (!b) return;
    b.textContent = "";
    var punto = el("i", "bs-punto");
    b.appendChild(punto);
    if (!S.datos) {
      b.classList.remove("bs-ok", "bs-sin-red", "bs-local");
      b.appendChild(el("span", null, "Unirse a la sesión del docente"));
      b.setAttribute("aria-label", "Unirse a la sesión del docente");
      return;
    }
    var estado = S.datos.prueba ? "bs-ok" : S.datos.local ? "bs-local" : (S.enLinea ? "bs-ok" : "bs-sin-red");
    b.classList.remove("bs-ok", "bs-sin-red", "bs-local");
    b.classList.add(estado);
    var txt = S.datos.codigo + " · " + S.datos.nombre;
    if (S.cerrada) txt += " · sesión cerrada";
    else if (S.datos.prueba) txt += " · modo de prueba";
    else if (S.datos.local) txt += " · sin servidor";
    else if (!S.enLinea) txt += " · reconectando…";
    b.appendChild(el("span", null, txt));
    b.setAttribute("aria-label", "Sesión " + txt + ". Abrir opciones de la sesión");
  }

  function crearDialogo(titulo) {
    cerrarDialogo();
    var fondo = el("div", "bs-fondo");
    var caja = el("div", "bs-dialogo");
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-modal", "true");
    var h = el("h2", "bs-titulo", titulo);
    h.id = "bsTitulo";
    caja.setAttribute("aria-labelledby", "bsTitulo");
    caja.appendChild(h);
    fondo.appendChild(caja);
    fondo.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarDialogo(); });
    document.body.appendChild(fondo);
    S.dialogo = fondo;
    return caja;
  }
  function cerrarDialogo() { if (S.dialogo) { S.dialogo.remove(); S.dialogo = null; if (S.chip) S.chip.focus(); } }

  function campo(caja, etiqueta, input, ayuda) {
    var l = el("label", "bs-campo");
    l.appendChild(el("span", "bs-etq", etiqueta));
    l.appendChild(input);
    if (ayuda) l.appendChild(el("span", "bs-ayuda", ayuda));
    caja.appendChild(l);
    return input;
  }

  function abrirUnirse(codigoInicial) {
    var o = S.opciones;
    var caja = crearDialogo("Unirse a la sesión del docente");
    caja.appendChild(el("p", "bs-texto", "Pide a tu docente el código de la sesión. Así verá el avance de tu equipo en el Panel docente y podrá guiar la partida."));
    var fCodigo = el("input", "bs-input"); fCodigo.placeholder = "BIC-4K7"; fCodigo.maxLength = 7; fCodigo.autocomplete = "off";
    fCodigo.value = codigoInicial || "";
    campo(caja, "Código de la sesión", fCodigo);
    var fNombre = el("input", "bs-input"); fNombre.maxLength = 24; fNombre.placeholder = "Los Voltios";
    if (o.nombreEquipo) fNombre.value = o.nombreEquipo() || "";
    campo(caja, "Nombre del equipo", fNombre);
    // códigos de estudiante y autorización: solo si la sesión los pide (por defecto, no)
    var bloque = el("div", "bs-bloque"); bloque.hidden = true;
    var fCod = el("textarea", "bs-input bs-area"); fCod.rows = 3; fCod.placeholder = "Un código por línea (máximo 6)";
    campo(bloque, "Códigos de estudiante de los integrantes", fCod, "El docente pidió identificar a cada integrante con su código de la UTP.");
    var aut = el("label", "bs-autoriza");
    var chk = el("input"); chk.type = "checkbox";
    aut.appendChild(chk);
    aut.appendChild(el("span", null,
      "Todos los integrantes autorizamos a la Universidad Tecnológica de Pereira (Biblioteca e Información Científica, BIC) a tratar nuestro código de estudiante y los resultados de esta actividad con fines académicos de seguimiento del taller, conforme a la Ley 1581 de 2012 y la política de tratamiento de datos de la UTP. Podemos consultar, corregir o pedir la supresión de estos datos al docente o a la BIC."));
    bloque.appendChild(aut);
    caja.appendChild(bloque);
    var nota = el("p", "bs-ayuda", "Esta sesión no pide datos personales: basta con el nombre del equipo.");
    caja.appendChild(nota);
    var pide = !!CONF.pedirCodigos, consultado = "";
    var aplicar = function (v) { pide = !!v; bloque.hidden = !pide; nota.hidden = pide; };
    aplicar(pide);
    var revisar = function () {
      var c = fCodigo.value.trim().toUpperCase().replace(/\s+/g, "");
      if (/^[A-Z0-9]{3}$/.test(c)) c = "BIC-" + c;
      if (!PATRON_CODIGO.test(c) || c === consultado) return;
      consultado = c;
      var sp = sesionDePrueba(c);
      if (sp) return aplicar(sp.pide_codigos);
      if (apiBase() && window.fetch) pedir("/api/sesiones/" + c + "/publica").then(function (j) { if (consultado === c) aplicar(j.pide_codigos); }, function () { /* sin red: se decide al unirse */ });
    };
    fCodigo.addEventListener("input", revisar);
    revisar();
    var msg = el("p", "bs-msg"); msg.setAttribute("role", "alert");
    caja.appendChild(msg);
    var fila = el("div", "bs-botones");
    var bCancel = el("button", "bs-btn", "Cancelar"); bCancel.type = "button";
    var bOk = el("button", "bs-btn bs-primario", "Unirse"); bOk.type = "button";
    fila.appendChild(bCancel); fila.appendChild(bOk);
    caja.appendChild(fila);
    bCancel.addEventListener("click", cerrarDialogo);
    bOk.addEventListener("click", function () {
      var codigo = fCodigo.value.trim().toUpperCase().replace(/\s+/g, "");
      if (/^[A-Z0-9]{3}$/.test(codigo)) codigo = "BIC-" + codigo;
      var nombre = fNombre.value.replace(/\s+/g, " ").trim();
      var ints = fCod.value.split(/[\s,;]+/).map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
      ints = ints.filter(function (x, i) { return ints.indexOf(x) === i; });
      if (!PATRON_CODIGO.test(codigo)) return mostrar(msg, "Escribe el código tal como lo da el docente, por ejemplo BIC-4K7.");
      if (nombre.length < 2) return mostrar(msg, "Escribe el nombre del equipo.");
      if (pide) {
        if (!ints.length) return mostrar(msg, "Escribe al menos un código de estudiante.");
        if (ints.length > 6) return mostrar(msg, "Máximo 6 integrantes por equipo.");
        for (var i = 0; i < ints.length; i++) if (!PATRON_ESTUDIANTE.test(ints[i])) return mostrar(msg, "Revisa el código «" + ints[i] + "»: solo letras, números, punto o guion (3 a 20 caracteres).");
        if (!chk.checked) return mostrar(msg, "Para unirse, marquen la autorización de tratamiento de datos.");
      } else ints = [];
      bOk.disabled = true; mostrar(msg, "Conectando…");
      unirse(codigo, nombre, ints).then(function (texto) {
        cerrarDialogo();
        aviso(texto);
      }, function (err) {
        bOk.disabled = false;
        if (/código de estudiante|autorización/i.test(err.message || "")) aplicar(true);  // la sesión sí pide códigos
        mostrar(msg, err.message || "No fue posible unirse.");
      });
    });
    setTimeout(function () { (fCodigo.value ? fNombre : fCodigo).focus(); }, 30);
  }

  function mostrar(nodo, t) { nodo.textContent = t; }

  function menuSesion() {
    var d = S.datos;
    var caja = crearDialogo("Sesión " + d.codigo);
    caja.appendChild(el("p", "bs-texto", "Equipo: " + d.nombre + (d.integrantes.length ? " · Integrantes: " + d.integrantes.join(", ") : "")));
    caja.appendChild(el("p", "bs-texto", d.prueba
      ? "Modo de prueba: el Panel docente abierto en este mismo navegador ve su avance en vivo."
      : d.local
      ? "No hay servidor del panel disponible: al terminar la partida verán un código de resultado y un QR para entregar al docente."
      : (S.enLinea ? "Conectados: el docente ve su avance en vivo." : "Sin conexión por ahora. El juego sigue y los datos se envían cuando vuelva la red.")));
    var fila = el("div", "bs-botones");
    var bSalir = el("button", "bs-btn", "Salir de la sesión"); bSalir.type = "button";
    var bOk = el("button", "bs-btn bs-primario", "Seguir jugando"); bOk.type = "button";
    if (S.ultimoResultado) {
      var bRes = el("button", "bs-btn", "Ver código de resultado"); bRes.type = "button";
      bRes.addEventListener("click", function () { mostrarResultado(S.ultimoResultado, true); });
      fila.appendChild(bRes);
    }
    fila.appendChild(bSalir); fila.appendChild(bOk);
    caja.appendChild(fila);
    bOk.addEventListener("click", cerrarDialogo);
    bSalir.addEventListener("click", function () { salir(); cerrarDialogo(); aviso("Saliste de la sesión " + d.codigo + "."); });
    setTimeout(function () { bOk.focus(); }, 30);
  }

  function aviso(texto, docente) {
    if (!S.banner) {
      S.banner = el("div", "bs-banner");
      S.banner.setAttribute("role", "status");
      S.banner.setAttribute("aria-live", "polite");
      document.body.appendChild(S.banner);
    }
    var b = S.banner;
    b.textContent = "";
    if (docente) b.appendChild(el("b", null, "Mensaje del docente: "));
    b.appendChild(el("span", null, texto));
    var x = el("button", "bs-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Cerrar aviso");
    x.addEventListener("click", function () { b.classList.remove("bs-visible"); });
    b.appendChild(x);
    b.classList.toggle("bs-docente", !!docente);
    b.classList.add("bs-visible");
    clearTimeout(S.tAviso);
    S.tAviso = setTimeout(function () { b.classList.remove("bs-visible"); }, docente ? 15000 : 6000);
  }

  /* ------------------------------------------------------------ red */
  function pedir(ruta, opciones) {
    var base = apiBase();
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    opciones = opciones || {};
    opciones.headers = Object.assign({ "Content-Type": "application/json" }, opciones.headers || {});
    if (ctl) opciones.signal = ctl.signal;
    return fetch(base + ruta, opciones).then(function (r) {
      clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ("Error " + r.status)); e.status = r.status; throw e; }
        return j;
      });
    }, function (e) { clearTimeout(t); var err = new Error("sin conexión"); err.red = true; throw err; });
  }

  function unirse(codigo, nombre, integrantes) {
    var o = S.opciones;
    var local = { codigo: codigo, nombre: nombre, integrantes: integrantes, autorizado: integrantes.length > 0, local: true, lab: o.lab };
    if (!apiBase() || !window.fetch) {
      var sp = sesionDePrueba(codigo);
      if (sp) {
        if (sp.laboratorio !== o.lab) return Promise.reject(new Error("Ese código es de otro laboratorio."));
        if (sp.estado !== "abierta") return Promise.reject(new Error("La sesión ya fue cerrada por el docente."));
        if (!sp.pide_codigos) { local.integrantes = []; local.autorizado = false; }
        var cmds = lsLeer(PREF_CMD + codigo) || [];
        local.prueba = true; local.id = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        local.desde = cmds.length ? cmds[cmds.length - 1].id : 0;
        fijar(local, sp);
        return Promise.resolve("¡Listo! Modo de prueba: el panel de este navegador ya ve al equipo " + nombre + ".");
      }
      fijar(local, null);
      return Promise.resolve("Listo. No hay servidor del panel configurado: al terminar verán un código de resultado para entregar al docente.");
    }
    return pedir("/api/sesiones/" + codigo + "/equipos", {
      method: "POST",
      body: JSON.stringify({ nombre: nombre, integrantes: integrantes, consentimiento: integrantes.length > 0, laboratorio: o.lab })
    }).then(function (j) {
      fijar({ codigo: codigo, nombre: nombre, integrantes: integrantes, autorizado: integrantes.length > 0, lab: o.lab, token: j.token, equipo: j.equipo, desde: j.desde || 0 }, j.sesion);
      return "¡Listo! El equipo " + nombre + " quedó unido a la sesión " + codigo + ".";
    }, function (e) {
      if (e.red) {
        fijar(local, null);
        return "No hubo conexión con el servidor del panel. Jueguen normalmente: al terminar verán un código de resultado para entregar al docente.";
      }
      throw e;
    });
  }

  function fijar(datos, sesion) {
    S.datos = datos; S.cerrada = false; S.enLinea = !datos.local;
    if (sesion) S.datos.sesion = { modo: sesion.modo, nivel: sesion.nivel, titulo: sesion.titulo };
    guardar(S.datos);
    if (S.opciones.alUnirse) try { S.opciones.alUnirse(S.datos); } catch (e) { /* el juego sigue */ }
    pintarChip();
    arrancar();
  }

  function salir() {
    clearInterval(S.timer); S.timer = null;
    S.datos = null; S.cola = []; S.enLinea = false; S.cerrada = false;
    guardar(null);
    pintarChip();
  }

  function arrancar() {
    clearInterval(S.timer);
    if (!S.datos) return;
    if (S.datos.prueba) { S.timer = setInterval(latidoPrueba, 2000); latidoPrueba(); return; }
    if (S.datos.local) return;
    S.timer = setInterval(latido, INTERVALO);
    latido();
  }

  var enviando = false;
  function latido(final) {
    if (!S.datos || S.datos.local || (enviando && !final)) return Promise.resolve();
    var d = S.datos;
    var lote = S.cola.splice(0, 60);
    var cuerpo = { desde: d.desde || 0, eventos: lote };
    try { cuerpo.estado = S.opciones.estado ? S.opciones.estado() : {}; } catch (e) { cuerpo.estado = {}; }
    if (final) cuerpo.final = final;
    enviando = true;
    return pedir("/api/sesiones/" + d.codigo + "/telemetria", {
      method: "POST", headers: { "X-Token-Equipo": d.token }, body: JSON.stringify(cuerpo)
    }).then(function (j) {
      enviando = false;
      S.enLinea = true;
      (j.comandos || []).forEach(function (c) {
        d.desde = Math.max(d.desde || 0, c.id);
        if (c.cmd === "mensaje") aviso(c.arg, true);
        if (S.opciones.comando) try { S.opciones.comando(c.cmd, c.arg); } catch (e) { /* comando no aplicable */ }
      });
      guardar(d);
      if (j.sesion === "cerrada" && !S.cerrada) { S.cerrada = true; clearInterval(S.timer); aviso("El docente cerró la sesión. ¡Gracias por jugar!"); }
      pintarChip();
      return true;
    }, function (e) {
      enviando = false;
      S.cola = lote.concat(S.cola).slice(-300);
      if (e.status === 401) { aviso("El servidor ya no reconoce al equipo. Únanse de nuevo con el código de la sesión."); salir(); return false; }
      S.enLinea = false; pintarChip();
      return false;
    });
  }

  /* modo de prueba: el estado se escribe en localStorage y el panel lo lee */
  function latidoPrueba(final) {
    var d = S.datos;
    if (!d || !d.prueba) return false;
    if (final) S.finalPrueba = final;
    var est = {};
    try { est = S.opciones.estado ? S.opciones.estado() : {}; } catch (e) { est = {}; }
    var sp = sesionDePrueba(d.codigo);
    var ok = lsGuardar(PREF_EQUIPO + d.codigo + ":" + d.id, {
      id: d.id, codigo: d.codigo, lab: d.lab, nombre: d.nombre, integrantes: d.integrantes, autorizado: !!d.autorizado,
      estado: est, eventos: S.registro.slice(-400), final: S.finalPrueba || null, latido: Date.now()
    });
    var hubo = false;
    (lsLeer(PREF_CMD + d.codigo) || []).forEach(function (c) {
      if (c.id <= (d.desde || 0)) return;
      d.desde = c.id;
      if (c.equipo != null && c.equipo !== d.id) return;
      hubo = true;
      if (c.cmd === "mensaje") aviso(c.arg, true);
      if (S.opciones.comando) try { S.opciones.comando(c.cmd, c.arg); } catch (e) { /* no aplica */ }
    });
    guardar(d);
    if (hubo) setTimeout(function () { latidoPrueba(); }, 400);  // el panel ve enseguida el efecto de la orden
    if ((!sp || sp.estado !== "abierta") && !S.cerrada) { S.cerrada = true; clearInterval(S.timer); aviso(sp ? "El docente cerró la sesión. ¡Gracias por jugar!" : "La sesión ya no existe en el panel de este navegador."); pintarChip(); }
    return ok;
  }

  /* ------------------------------------------------------------ resultado */
  function codigoResultado(final) {
    var d = S.datos;
    var datos = {
      v: 1, lab: S.opciones.lab, sesion: d.codigo, equipo: d.nombre, integrantes: d.integrantes, autorizado: !!d.autorizado,
      puntaje: final.puntaje, insignia: !!final.insignia, resultado: final.resultado, metricas: final.metricas || {},
      errores: S.errores.slice(0, 6), t: new Date().toISOString().slice(0, 16)
    };
    var cuerpo = b64url(JSON.stringify(datos));
    return "BICR1." + cuerpo + "." + suma(cuerpo);
  }

  function mostrarResultado(r, soloVer) {
    var caja = crearDialogo(r.enviado ? "Resultado enviado al docente" : "Código de resultado");
    caja.appendChild(el("p", "bs-texto", r.enviado && r.prueba
      ? "Modo de prueba: el resultado ya está en el Panel docente de este navegador. El QR sirve como respaldo."
      : r.enviado
      ? "El docente ya tiene el resultado de su equipo en el Panel docente. Si lo pide, muéstrenle también este QR."
      : "No fue posible enviar el resultado por la red. Muestren este QR al docente o copien el código: él lo registra en el Panel docente."));
    var resumen = el("p", "bs-resumen", r.resumen);
    caja.appendChild(resumen);
    var svg = qrSvg(r.codigo);
    if (svg) { var marco = el("div", "bs-marco-qr"); marco.appendChild(svg); caja.appendChild(marco); }
    var area = el("textarea", "bs-input bs-codigo"); area.readOnly = true; area.rows = 3; area.value = r.codigo;
    area.setAttribute("aria-label", "Código de resultado");
    caja.appendChild(area);
    var fila = el("div", "bs-botones");
    var bCopiar = el("button", "bs-btn", "Copiar código"); bCopiar.type = "button";
    bCopiar.addEventListener("click", function () {
      area.select();
      var ok = function () { bCopiar.textContent = "Copiado"; };
      if (navigator.clipboard) navigator.clipboard.writeText(r.codigo).then(ok, function () { document.execCommand("copy"); ok(); });
      else { document.execCommand("copy"); ok(); }
    });
    var bOk = el("button", "bs-btn bs-primario", "Cerrar"); bOk.type = "button";
    bOk.addEventListener("click", cerrarDialogo);
    fila.appendChild(bCopiar); fila.appendChild(bOk);
    caja.appendChild(fila);
    setTimeout(function () { bOk.focus(); }, 30);
  }

  /* ------------------------------------------------------------ API pública */
  window.BicSesion = {
    init: function (opciones) {
      S.opciones = opciones || {};
      construirChip();
      var previo = leer();
      if (previo && previo.lab === S.opciones.lab) {
        S.datos = previo; S.enLinea = !previo.local;
        if (S.opciones.alUnirse) try { S.opciones.alUnirse(S.datos, true); } catch (e) { /* sin efecto */ }
        pintarChip(); arrancar();
      }
      var codigo = "";
      try { codigo = (new URLSearchParams(location.search).get("sesion") || "").toUpperCase(); } catch (e) { /* nada */ }
      if (PATRON_CODIGO.test(codigo) && (!S.datos || S.datos.codigo !== codigo)) setTimeout(function () { abrirUnirse(codigo); }, 900);
    },
    activa: function () { return !!S.datos; },
    datos: function () { return S.datos; },
    evento: function (tipo, detalle, puntos, rol, t) {
      if (!S.datos) return;
      var ev = { tipo: tipo, detalle: String(detalle || "").slice(0, 240), puntos: puntos | 0, rol: rol || "", t: +(t || 0) };
      if (ev.puntos < 0) {
        S.errores.unshift([ev.detalle.slice(0, 80), ev.puntos]);
        S.errores = S.errores.slice(0, 6);
      }
      if (S.datos.prueba) { ev.id = ++S.nEv; S.registro.push(ev); if (S.registro.length > 600) S.registro.shift(); }
      else if (!S.datos.local) S.cola.push(ev);
      if (S.cola.length > 300) S.cola.shift();
    },
    reiniciar: function () { S.errores = []; S.finalPrueba = null; },
    final: function (final) {
      if (!S.datos) return;
      var codigo = codigoResultado(final);
      var r = { codigo: codigo, resumen: final.resumen || "", enviado: false };
      S.ultimoResultado = r;
      if (S.datos.prueba) { r.enviado = latidoPrueba(final); r.prueba = true; mostrarResultado(r); return; }
      if (S.datos.local) { mostrarResultado(r); return; }
      latido(final).then(function (ok) { r.enviado = !!ok; mostrarResultado(r); });
    },
    abrir: function () { if (S.datos) menuSesion(); else abrirUnirse(); }
  };
})();
