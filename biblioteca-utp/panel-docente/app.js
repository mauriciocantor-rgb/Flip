/*
  Panel docente BIC · Biblioteca Jorge Roa Martínez (UTP)

  Seguimiento en vivo de los equipos de los laboratorios gamificados, control
  de la partida, reporte de sesión, histórico y registro de resultados que
  llegan sin red (código BICR1 o QR).

  Dos formas de trabajo:
    - Con servidor (backend-panel/, alojado por el CRIE): todo en vivo, con
      equipos en cualquier computador o celular.
    - Sin servidor (modo de prueba): las sesiones se guardan en este navegador.
      Los laboratorios abiertos en ESTE mismo navegador se comunican con el
      panel por localStorage: seguimiento en vivo, alertas, órdenes y reporte.
      Los equipos de otros dispositivos entregan su resultado con el código o
      el QR (Registrar sin red).

  Sin estilos ni manejadores en línea: compatible con la CSP del CRIE.
  Los anchos y colores dinámicos se fijan con CSSOM (element.style), que la
  CSP permite.
*/
(function () {
  "use strict";

  var CONF = window.BIC_PANEL_CONFIG || {};
  var LABS = CONF.laboratorios || {};
  var POLL_MS = 2500;
  var CLAVE_ACCESO = "bic-panel-acceso";
  var CLAVE_LOCAL = "bic-panel-local-v1";
  var CLAVE_ACTUAL = "bic-panel-sesion";
  var PREF_EQUIPO = "bic-panel-equipo:";   // + código + ":" + id, lo escribe cada laboratorio
  var PREF_CMD = "bic-panel-cmd:";         // + código, órdenes del docente

  var EVENTOS = {
    "grid-masters": [["ramp", "Rampa de demanda +6 %"], ["L3", "Rayo: disparo de L3 (−420 MW)"], ["L1", "Rayo: disparo de L1"], ["link", "Pérdida del telecontrol"], ["linkok", "Restablecer telecontrol"], ["osc", "Oscilación del gobernador U2"], ["unit", "Disparo de una unidad"]],
    "turno-urgencias": [["sys", "Caída del sistema de órdenes"], ["sysok", "Restablecer el sistema"], ["arrive", "Llega un paciente adicional"], ["icu", "Se ocupa la última cama de UCI"], ["worse", "Deterioro súbito (paciente en pantalla)"]]
  };
  var MODOS = { guiado: "Escenario guiado", juego: "Grid Masters (puntaje)", libre: "Libre", turno: "Turno" };
  var NIVELES = {
    "grid-masters": [["pre", "Pregrado"], ["inv", "Docente e investigador"]],
    "turno-urgencias": [["pre", "Pregrado"], ["pos", "Posgrado"]]
  };
  var NOMBRE_NIVEL = { pre: "Pregrado", inv: "Docente e investigador", pos: "Posgrado" };
  var ROLES_GM = ["CND", "Planta", "Protecciones", "Comunicaciones"];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function fechaCorta(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }
  function nombreLab(id) { return (LABS[id] && LABS[id].nombre) || id; }
  function mmss(seg) { seg = Math.max(0, Math.round(seg || 0)); return String(Math.floor(seg / 60)).padStart(2, "0") + ":" + String(seg % 60).padStart(2, "0"); }
  function hhmm(min) { min = Math.max(0, Math.round(min || 0)); return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
  function leerJSON(clave, defecto, almacen) { try { return JSON.parse((almacen || localStorage).getItem(clave)) || defecto; } catch (e) { return defecto; } }
  function guardarJSON(clave, v, almacen) { try { (almacen || localStorage).setItem(clave, JSON.stringify(v)); } catch (e) { /* almacenamiento bloqueado */ } }

  var tt = null;
  function toast(t) { var n = $("#toast"); n.textContent = t; n.classList.add("visible"); clearTimeout(tt); tt = setTimeout(function () { n.classList.remove("visible"); }, 2800); }

  /* ================================================================ datos */
  function apiValida(u) {
    u = String(u || "").trim().replace(/\/+$/, "");
    if (/^https:\/\/[a-z0-9.-]+\.utp\.edu\.co(:\d+)?$/i.test(u)) return u;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(u)) return u; // pruebas locales del CRIE
    return "";
  }

  // --- servidor
  function Remoto(api, clave) { this.api = api; this.clave = clave; this.local = false; }
  Remoto.prototype.pedir = function (metodo, ruta, cuerpo, crudo) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    var op = { method: metodo, headers: { "X-Token-Docente": this.clave } };
    if (cuerpo !== undefined) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    if (ctl) op.signal = ctl.signal;
    return fetch(this.api + ruta, op).then(function (r) {
      clearTimeout(t);
      if (crudo && r.ok) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ("Error " + r.status)); e.status = r.status; throw e; }
        return j;
      });
    }, function () { clearTimeout(t); var e = new Error("Sin conexión con el servidor del panel"); e.red = true; throw e; });
  };
  Remoto.prototype.probar = function () { return this.pedir("GET", "/api/sesiones"); };
  Remoto.prototype.crear = function (d) { return this.pedir("POST", "/api/sesiones", d); };
  Remoto.prototype.listar = function () { return this.pedir("GET", "/api/sesiones").then(function (j) { return j.sesiones || []; }); };
  Remoto.prototype.tablero = function (c) { return this.pedir("GET", "/api/sesiones/" + c + "/tablero"); };
  Remoto.prototype.comando = function (c, cmd, arg, equipo) { return this.pedir("POST", "/api/sesiones/" + c + "/comandos", { cmd: cmd, arg: arg || "", equipo: equipo == null ? null : equipo }); };
  Remoto.prototype.cerrar = function (c) { return this.pedir("POST", "/api/sesiones/" + c + "/cerrar", {}); };
  Remoto.prototype.reporte = function (c) { return this.pedir("GET", "/api/sesiones/" + c + "/reporte"); };
  Remoto.prototype.csv = function (c) { return this.pedir("GET", "/api/sesiones/" + c + "/reporte.csv", undefined, true); };
  Remoto.prototype.importar = function (c, res) { return this.pedir("POST", "/api/sesiones/" + c + "/importar", { resultado: res }); };
  Remoto.prototype.borrar = function (c) { return this.pedir("DELETE", "/api/sesiones/" + c); };

  // --- sin servidor (este navegador)
  function Local() { this.local = true; }
  Local.prototype.db = function () { return leerJSON(CLAVE_LOCAL, { sesiones: {} }); };
  Local.prototype.guardar = function (db) { guardarJSON(CLAVE_LOCAL, db); };
  Local.prototype.probar = function () { return Promise.resolve(true); };
  Local.prototype.crear = function (d) {
    var db = this.db(), A = "ACDEFGHJKMNPQRTUVWXY34679", c;
    do { c = "BIC-"; for (var i = 0; i < 3; i++) c += A[Math.floor(Math.random() * A.length)]; } while (db.sesiones[c]);
    db.sesiones[c] = { codigo: c, laboratorio: d.laboratorio, modo: d.modo, nivel: d.nivel, titulo: d.titulo || "", grupo: d.grupo || "", estado: "abierta", pide_codigos: !!d.pide_codigos, creada: new Date().toISOString().slice(0, 19) + "Z", cerrada: null, equipos: [] };
    this.guardar(db);
    return Promise.resolve(db.sesiones[c]);
  };
  Local.prototype.listar = function () {
    var db = this.db(), self = this;
    return Promise.resolve(Object.keys(db.sesiones).map(function (k) {
      var s = db.sesiones[k], eqs = self.equiposComoServidor(s);
      var p = eqs.map(function (e) { var f = e.final || {}; return f.puntaje != null ? f.puntaje : (e.estado || {}).puntaje; }).filter(function (x) { return typeof x === "number"; });
      return Object.assign({}, s, { equipos: eqs.length, estudiantes: eqs.reduce(function (a, e) { return a + (e.integrantes || []).length; }, 0),
        promedio: p.length ? Math.round(p.reduce(function (a, b) { return a + b; }, 0) / p.length) : null, maximo: p.length ? Math.max.apply(null, p) : null,
        insignias: eqs.filter(function (e) { return e.final && e.final.insignia; }).length });
    }).sort(function (a, b) { return a.creada < b.creada ? 1 : -1; }));
  };
  Local.prototype.sesion = function (c) { var s = this.db().sesiones[c]; if (!s) { var e = new Error("La sesión no existe en este navegador"); e.status = 404; throw e; } return s; };
  Local.prototype.vivos = function (c) {  // equipos de prueba que escriben los laboratorios de este navegador
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREF_EQUIPO + c + ":") === 0) { var r = leerJSON(k, null); if (r) out.push(r); }
      }
    } catch (e) { /* almacenamiento bloqueado */ }
    return out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  };
  Local.prototype.equiposComoServidor = function (s, todos) {
    var ahora = Date.now(), lista = [];
    this.vivos(s.codigo).forEach(function (r, i) {
      var evs = r.eventos || [];
      lista.push({ id: r.id, nombre: r.nombre, integrantes: r.integrantes || [], segundos_sin_senal: Math.round((ahora - r.latido) / 1000),
        estado: r.estado || {}, final: r.final, origen: "prueba",
        eventos: evs.slice(-12).reverse(), total_eventos: evs.length,
        errores: evs.filter(function (x) { return x.puntos < 0; }).length, acciones: evs.filter(function (x) { return x.tipo === "accion"; }).length,
        linea_de_tiempo: todos ? evs : undefined });
    });
    s.equipos.forEach(function (e, i) {
      lista.push({ id: "c" + i, nombre: e.nombre, integrantes: e.integrantes, segundos_sin_senal: null, estado: {}, final: e.final, origen: "codigo-resultado",
        eventos: [], total_eventos: e.errores.length, errores: e.errores.length, acciones: (e.final.metricas && e.final.metricas.acciones) || 0,
        linea_de_tiempo: e.errores.map(function (x) { return { t: 0, tipo: "error", detalle: x[0], puntos: x[1] }; }) });
    });
    return lista;
  };
  Local.prototype.tablero = function (c) { var s = this.sesion(c); return Promise.resolve({ sesion: s, equipos: this.equiposComoServidor(s), comandos: leerJSON(PREF_CMD + c, []).slice(-20).reverse() }); };
  Local.prototype.comando = function (c, cmd, arg, equipo) {
    var s = this.sesion(c);
    if (s.estado !== "abierta") return Promise.reject(new Error("La sesión está cerrada"));
    var l = leerJSON(PREF_CMD + c, []);
    var id = l.length ? l[l.length - 1].id + 1 : 1;
    l.push({ id: id, equipo: equipo == null ? null : equipo, cmd: cmd, arg: arg || "", creado: new Date().toISOString() });
    guardarJSON(PREF_CMD + c, l.slice(-200));
    return Promise.resolve({ id: id });
  };
  Local.prototype.cerrar = function (c) { var db = this.db(); db.sesiones[c].estado = "cerrada"; db.sesiones[c].cerrada = new Date().toISOString().slice(0, 19) + "Z"; this.guardar(db); return Promise.resolve(db.sesiones[c]); };
  function agrupar(lista, signo) {
    var m = {};
    lista.forEach(function (x) {
      if (signo < 0 ? !(x.puntos < 0) : !(x.puntos > 0)) return;
      var k = String(x.detalle).replace(/\b([Cc]ama) \d+\b/g, "$1 N").replace(/\b\d+(?:[.,]\d+)? ?(s|min|%)(?=\W|$)/g, "N $1").slice(0, 120);
      m[k] = (m[k] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { detalle: k, veces: m[k] }; }).sort(function (a, b) { return b.veces - a.veces; }).slice(0, 10);
  }
  Local.prototype.reporte = function (c) {
    var s = this.sesion(c), equipos = this.equiposComoServidor(s, true), todos = [];
    equipos.forEach(function (e) { todos = todos.concat(e.linea_de_tiempo || []); });
    return Promise.resolve({ sesion: s, equipos: equipos, errores_frecuentes: agrupar(todos, -1), aciertos_frecuentes: agrupar(todos, 1), generado: new Date().toISOString() });
  };
  Local.prototype.csv = function (c) {
    var s = this.sesion(c), filas = [["sesion", "laboratorio", "modo", "nivel", "grupo", "fecha", "equipo", "codigo_estudiante", "puntaje_final", "insignia", "resultado", "acciones", "errores", "origen"]];
    this.equiposComoServidor(s).forEach(function (e) {
      var f = e.final || {}, p = f.puntaje != null ? f.puntaje : (e.estado || {}).puntaje;
      (e.integrantes.length ? e.integrantes : [""]).forEach(function (cod) {
        filas.push([s.codigo, s.laboratorio, s.modo, s.nivel, s.grupo, s.creada, e.nombre, cod, p == null ? "" : p, f.insignia ? "sí" : "no", f.resultado || "en curso", e.acciones, e.errores, e.origen]);
      });
    });
    var txt = "﻿" + filas.map(function (f) { return f.map(function (x) { x = String(x == null ? "" : x); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(";"); }).join("\r\n");
    return Promise.resolve(new Blob([txt], { type: "text/csv;charset=utf-8" }));
  };
  Local.prototype.importar = function (c, r) {
    var db = this.db(), s = db.sesiones[c];
    if (r.lab !== s.laboratorio) return Promise.reject(new Error("El resultado no corresponde al laboratorio de la sesión"));
    s.equipos = s.equipos.filter(function (e) { return e.nombre !== r.equipo; });
    s.equipos.push({ nombre: r.equipo, integrantes: s.pide_codigos ? (r.integrantes || []) : [], final: { puntaje: r.puntaje, insignia: !!r.insignia, resultado: r.resultado, metricas: r.metricas || {} }, errores: r.errores || [] });
    this.guardar(db);
    return Promise.resolve({ equipo: s.equipos.length });
  };
  Local.prototype.borrar = function (c) {
    var db = this.db(); delete db.sesiones[c]; this.guardar(db);
    var self = this;
    this.vivos(c).forEach(function (r) { try { localStorage.removeItem(PREF_EQUIPO + c + ":" + r.id); } catch (e) { /* nada */ } });
    try { localStorage.removeItem(PREF_CMD + c); } catch (e) { /* nada */ }
    return Promise.resolve({ borrada: c });
  };

  /* ================================================================ estado */
  var D = null;               // fuente de datos (Remoto o Local)
  var actual = null;          // código de la sesión en pantalla
  var ultimo = null;          // último tablero recibido
  var muestras = {};          // equipo -> [[ms, puntaje]] para las chispas
  var descartadas = {};       // alertas que el docente ya marcó como vistas
  var vistas = {};            // alertas ya vistas (para no repetir el toast)
  var timer = null;

  function conexion(clase, texto) {
    var c = $("#conexion");
    c.classList.remove("ok", "mal", "local");
    if (clase) c.classList.add(clase);
    $("#conexionTxt").textContent = texto;
  }

  /* ================================================================ vistas */
  function mostrar(vista) {
    $$(".vista").forEach(function (v) { v.hidden = true; });
    var mapa = { acceso: "#vAcceso", nueva: "#vNueva", vivo: "#vVivo", reporte: "#vReporte", historico: "#vHistorico", importar: "#vImportar" };
    $(mapa[vista]).hidden = false;
    $$("#pestanas button[data-vista]").forEach(function (b) {
      if (b.dataset.vista === vista) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (vista !== "vivo") detener();
    if (vista === "vivo") abrirVivo();
    if (vista === "nueva") cargarAbiertas();
    if (vista === "historico") cargarHistorico();
    if (vista === "importar") cargarImportar();
    window.scrollTo(0, 0);
  }

  /* ================================================================ acceso */
  function entrar(datos, silencioso) {
    return datos.probar().then(function () {
      D = datos;
      $("#pestanas").hidden = false;
      if (D.local) conexion("local", "Modo de prueba · sin servidor");
      else conexion("ok", "Conectado al servidor del panel");
      actual = sessionStorage.getItem(CLAVE_ACTUAL) || null;
      mostrar(actual ? "vivo" : "nueva");
    }, function (e) {
      if (!silencioso) $("#accesoMsg").textContent = e.status === 401 ? "La clave de docente no es correcta." : e.status === 503 ? "El servidor aún no tiene configurada la clave de docentes (TOKEN_DOCENTE)." : e.message;
      throw e;
    });
  }

  function iniciarAcceso() {
    var api = apiValida(CONF.api);
    var guardado = leerJSON(CLAVE_ACCESO, null, sessionStorage);
    $("#fApi").value = (guardado && guardado.api) || api;
    if (!api && !(guardado && guardado.api)) $(".avanzado").open = true;
    $("#btnEntrar").addEventListener("click", function () {
      var a = apiValida($("#fApi").value), clave = $("#fClave").value.trim();
      if (!a) { $("#accesoMsg").textContent = "Escribe la dirección del servidor del panel (dominio utp.edu.co) o usa «Trabajar sin servidor»."; $(".avanzado").open = true; return; }
      if (!clave) { $("#accesoMsg").textContent = "Escribe la clave de docente."; return; }
      $("#accesoMsg").textContent = "Conectando…";
      entrar(new Remoto(a, clave)).then(function () { guardarJSON(CLAVE_ACCESO, { api: a, clave: clave }, sessionStorage); }, function () { /* mensaje ya mostrado */ });
    });
    $("#fClave").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#btnEntrar").click(); });
    $("#btnLocal").addEventListener("click", function () { guardarJSON(CLAVE_ACCESO, { local: true }, sessionStorage); entrar(new Local()); });
    $("#btnSalir").addEventListener("click", function () {
      try { sessionStorage.removeItem(CLAVE_ACCESO); sessionStorage.removeItem(CLAVE_ACTUAL); } catch (e) { /* nada */ }
      detener(); D = null; actual = null; $("#pestanas").hidden = true; $("#fClave").value = ""; conexion(null, "Sin conectar"); mostrar("acceso");
    });
    if (guardado && guardado.local) return entrar(new Local(), true);
    if (guardado && guardado.api && guardado.clave) return entrar(new Remoto(guardado.api, guardado.clave), true).catch(function () { mostrar("acceso"); });
    mostrar("acceso");
  }

  /* ================================================================ nueva sesión */
  function labElegido() { var r = $("input[name=lab]:checked"); return r ? r.value : "grid-masters"; }
  function pintarOpcionesNueva() {
    var lab = labElegido();
    $("#campoModo").hidden = lab !== "grid-masters";
    var n = vaciar($("#fNivel"));
    NIVELES[lab].forEach(function (x) { var o = el("option", null, x[1]); o.value = x[0]; n.appendChild(o); });
  }
  function iniciarNueva() {
    $$("input[name=lab]").forEach(function (r) { r.addEventListener("change", pintarOpcionesNueva); });
    pintarOpcionesNueva();
    $("#btnCrear").addEventListener("click", function () {
      var lab = labElegido();
      var datos = { laboratorio: lab, modo: lab === "grid-masters" ? $("#fModo").value : "turno", nivel: $("#fNivel").value, titulo: $("#fTitulo").value.trim(), grupo: $("#fGrupo").value.trim(),
        pide_codigos: ($("input[name=ident]:checked") || {}).value === "codigos" };
      $("#nuevaMsg").textContent = "Creando…";
      D.crear(datos).then(function (s) {
        $("#nuevaMsg").textContent = "";
        abrirSesion(s.codigo);
        toast("Sesión " + s.codigo + " creada");
      }, function (e) { $("#nuevaMsg").textContent = e.message; });
    });
  }
  function cargarAbiertas() {
    var ul = vaciar($("#abiertas"));
    D.listar().then(function (lista) {
      var ab = lista.filter(function (s) { return s.estado === "abierta"; });
      if (!ab.length) { ul.appendChild(el("li", "nota", "No hay sesiones abiertas.")); return; }
      ab.forEach(function (s) {
        var li = el("li"), b = el("button");
        b.type = "button";
        b.appendChild(el("b", null, s.codigo));
        b.appendChild(el("span", null, nombreLab(s.laboratorio) + " · " + (MODOS[s.modo] || s.modo) + " · " + (NOMBRE_NIVEL[s.nivel] || s.nivel)));
        b.appendChild(el("span", "nota", (s.titulo || "Sin título") + (s.grupo ? " · " + s.grupo : "") + " · " + s.equipos + " equipos · " + fechaCorta(s.creada)));
        b.addEventListener("click", function () { abrirSesion(s.codigo); });
        li.appendChild(b); ul.appendChild(li);
      });
    }, function (e) { ul.appendChild(el("li", "aviso-error", e.message)); });
  }

  function abrirSesion(codigo) {
    actual = codigo;
    try { sessionStorage.setItem(CLAVE_ACTUAL, codigo); } catch (e) { /* nada */ }
    muestras = {}; descartadas = {}; vistas = {}; ultimo = null;
    mostrar("vivo");
  }

  /* ================================================================ QR */
  function enlaceJuego(s) {
    var lab = LABS[s.laboratorio];
    if (!lab) return "";
    var u = new URL(lab.ruta, location.href);
    u.searchParams.set("sesion", s.codigo);
    if (!D.local && D.api !== apiValida(CONF.api)) u.searchParams.set("api", D.api);
    return u.href;
  }
  function qrSvg(texto, clase) {
    if (typeof window.qrcode !== "function") return el("span", "nota", "QR no disponible");
    var q = window.qrcode(0, "M"); q.addData(texto, "Byte"); q.make();
    var n = q.getModuleCount(), m = 2, NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + (n + 2 * m) + " " + (n + 2 * m));
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR para unirse a la sesión");
    if (clase) svg.setAttribute("class", clase);
    var r = document.createElementNS(NS, "rect"); r.setAttribute("width", n + 2 * m); r.setAttribute("height", n + 2 * m); r.setAttribute("fill", "#fff"); svg.appendChild(r);
    var d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.isDark(y, x)) d += "M" + (x + m) + " " + (y + m) + "h1v1h-1z";
    var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", "#00204A"); svg.appendChild(p);
    return svg;
  }

  /* ================================================================ en vivo */
  function detener() { clearTimeout(timer); timer = null; }

  function abrirVivo() {
    detener();
    $("#vivoVacio").hidden = !!actual;
    $("#vivo").hidden = !actual;
    if (!actual) return;
    ultimo = null;
    vaciar($("#equipos")); vaciar($("#alertas")); vaciar($("#ranking")); vaciar($("#kpis"));
    actualizar(true);
  }

  function actualizar(primera) {
    if (!actual || !D) return;
    D.tablero(actual).then(function (tb) {
      if (!D.local) conexion("ok", "Conectado · en vivo");
      pintarTablero(tb, primera);
      programar();
    }, function (e) {
      if (e.status === 404) { actual = null; try { sessionStorage.removeItem(CLAVE_ACTUAL); } catch (x) { /* nada */ } abrirVivo(); return; }
      if (e.status === 401) { toast("La clave de docente ya no es válida."); $("#btnSalir").click(); return; }
      conexion("mal", "Sin conexión · reintentando");
      programar();
    });
  }
  function programar() { detener(); if (D && !$("#vVivo").hidden) timer = setTimeout(actualizar, D.local ? 1500 : POLL_MS); }

  function pintarCabecera(s) {
    $("#sCodigo").textContent = s.codigo;
    $("#sMeta").textContent = nombreLab(s.laboratorio) + " · " + (MODOS[s.modo] || s.modo) + " · " + (NOMBRE_NIVEL[s.nivel] || s.nivel) +
      (s.titulo ? " · " + s.titulo : "") + (s.grupo ? " · " + s.grupo : "") + " · " + (s.pide_codigos ? "con códigos de estudiante" : "sin datos personales") + " · " + (s.estado === "abierta" ? "abierta" : "cerrada " + fechaCorta(s.cerrada));
    var q = vaciar($("#sQr")); q.appendChild(qrSvg(enlaceJuego(s)));
    var sel = vaciar($("#selEvento"));
    (EVENTOS[s.laboratorio] || []).forEach(function (x) { var o = el("option", null, x[1]); o.value = x[0]; sel.appendChild(o); });
    var cerrada = s.estado !== "abierta";
    $$("#controlGeneral button, #controlGeneral select, #controlGeneral input").forEach(function (b) { b.disabled = cerrada; });
    $("#btnCerrar").disabled = cerrada;
    $("#ctlNota").textContent = D.local && !cerrada ? "Modo de prueba: las órdenes llegan en 2 segundos a los laboratorios abiertos en este mismo navegador. Los equipos de otros dispositivos entregan su resultado con el QR (Registrar sin red)."
      : cerrada ? "La sesión está cerrada: los equipos ya no reciben órdenes." : "Las órdenes llegan a los equipos en unos 3 segundos.";
  }

  function estadoEquipo(e, sesionAbierta) {
    var st = e.estado || {};
    if (e.final) return ["fin", "Terminó"];
    if (e.origen === "codigo-resultado") return ["fin", "Resultado sin red"];
    if (sesionAbierta && e.segundos_sin_senal != null && e.segundos_sin_senal > 15) return ["sin-senal", "Sin señal " + mmss(e.segundos_sin_senal)];
    if (st.terminado) return ["fin", "Terminó"];
    if (st.jugando) return ["jugando", "Jugando"];
    if (st.iniciado || (st.t || 0) > 0) return ["pausa", "En pausa"];
    return ["espera", "Esperando inicio"];
  }

  function puntajeDe(e) {
    if (e.final && typeof e.final.puntaje === "number") return e.final.puntaje;
    var st = e.estado || {};
    if (typeof st.puntaje === "number") return st.puntaje;
    return null;
  }

  function alertasDe(s, e) {
    var st = e.estado || {}, A = [], n = e.nombre;
    var abierta = s.estado === "abierta";
    if (abierta && !e.final && e.segundos_sin_senal != null && e.segundos_sin_senal > 15 && e.origen !== "codigo-resultado")
      A.push({ k: e.id + ":senal", c: "medio", t: n + " perdió la conexión", d: "Hace " + mmss(e.segundos_sin_senal) + ". El juego sigue en su equipo; los datos llegan al volver la red." });
    if (s.laboratorio === "grid-masters") {
      if (st.sin_respuesta >= 30) A.push({ k: e.id + ":resp:" + st.evento, c: "malo", t: n + " no responde a «" + st.evento + "»", d: "Lleva " + st.sin_respuesta + " s sin maniobras. Considera enviarle un mensaje." });
      if (st.apagon || (e.final && /Apagón/.test(e.final.resultado || ""))) A.push({ k: e.id + ":apagon", c: "malo", t: n + ": apagón del área Centro", d: "La frecuencia bajó de 57,5 Hz. Buen caso para el debriefing." });
      else if (st.edac > 0 && !e.final) A.push({ k: e.id + ":edac:" + st.edac, c: "medio", t: n + ": actuó el EDAC", d: st.edac + " etapa(s) de deslastre de carga." });
    } else {
      (st.pacientes || []).forEach(function (p) {
        if (p.estado === "muerto") A.push({ k: e.id + ":muerte:" + p.cama, c: "malo", t: n + ": falleció el paciente de la cama " + p.cama, d: p.caso });
        else if (p.estadio >= 2 && p.estado !== "egresado") A.push({ k: e.id + ":grave:" + p.cama + ":" + p.estadio, c: "medio", t: n + ": cama " + p.cama + " en estadio " + p.estadio, d: p.caso + " · paso actual: " + p.paso });
      });
    }
    (e.eventos || []).forEach(function (ev) {
      if (ev.puntos <= -80 && !/fuera de la banda/.test(ev.detalle)) A.push({ k: e.id + ":ev:" + ev.id, c: "malo", t: n + ": " + ev.detalle, d: ev.puntos + " puntos" });
      if (ev.tipo === "guia") A.push({ k: e.id + ":guia:" + ev.id, c: "info", t: n + " necesitó un recordatorio", d: ev.detalle.replace(/^Recordatorio · /, "") });
    });
    if (e.final && e.final.insignia) A.push({ k: e.id + ":insignia", c: "bueno", t: n + " ganó la insignia", d: e.final.resultado || "" });
    return A;
  }

  function kpi(cont, etq, valor, clase) {
    var k = el("div", "kpi" + (clase ? " " + clase : ""));
    k.appendChild(el("span", null, etq)); k.appendChild(el("b", null, valor));
    cont.appendChild(k);
  }

  function chispa(lista) {
    var NS = "http://www.w3.org/2000/svg", W = 200, H = 42;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "chispa"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("preserveAspectRatio", "none");
    if (!lista || lista.length < 2) return svg;
    var vs = lista.map(function (x) { return x[1]; }), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
    if (mx === mn) { mx += 1; mn -= 1; }
    var t0 = lista[0][0], t1 = lista[lista.length - 1][0] || t0 + 1;
    var d = lista.map(function (x, i) {
      var X = ((x[0] - t0) / Math.max(1, t1 - t0)) * (W - 4) + 2, Y = H - 4 - ((x[1] - mn) / (mx - mn)) * (H - 8);
      return (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1);
    }).join("");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#003DA5"); p.setAttribute("stroke-width", "2.5"); p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  }

  function dato(cont, etq, valor, calidad) {
    var d = el("div", "dato" + (calidad ? " " + calidad : ""));
    d.appendChild(el("span", null, etq)); d.appendChild(el("b", null, valor));
    cont.appendChild(d);
  }

  function tarjetaEquipo(s, e) {
    var st = e.estado || {}, est = estadoEquipo(e, s.estado === "abierta");
    var card = el("article", "equipo");
    if (est[0] === "fin") card.classList.add("e-terminado");
    if (est[0] === "sin-senal") card.classList.add("e-sin-senal");
    if (alertasDe(s, e).some(function (a) { return a.c === "malo"; })) card.classList.add("e-alerta");
    card.setAttribute("aria-label", "Equipo " + e.nombre);

    var cab = el("div", "eq-cab"), izq = el("div");
    izq.appendChild(el("h3", null, e.nombre));
    if ((e.integrantes || []).length) izq.appendChild(el("div", "eq-int", e.integrantes.length + " integrante(s): " + e.integrantes.join(", ")));
    cab.appendChild(izq);
    cab.appendChild(el("span", "estado " + est[0], est[1]));
    card.appendChild(cab);

    var cif = el("div", "eq-cifras"), pts = puntajeDe(e), caja = el("div", "puntaje");
    var gm = s.laboratorio === "grid-masters";
    if (gm && s.modo !== "juego") { caja.textContent = String(st.acciones != null ? st.acciones : (e.acciones || 0)); caja.appendChild(el("small", null, "maniobras")); }
    else { caja.textContent = pts == null ? "—" : String(pts); caja.appendChild(el("small", null, gm ? "PES" : "puntos de vida")); }
    cif.appendChild(caja);
    cif.appendChild(chispa(muestras[e.id]));
    card.appendChild(cif);

    var datos = el("div", "datos");
    if (gm) {
      var f = st.frecuencia;
      dato(datos, "Momento", st.momento || "—");
      dato(datos, "Frecuencia", f != null ? f.toFixed(2) + " Hz" : "—", f == null ? "" : (f < 59.4 || f > 60.6 ? "malo" : (f < 59.8 || f > 60.2 ? "medio" : "bueno")));
      dato(datos, "Nadir", st.nadir != null ? st.nadir.toFixed(2) + " Hz" : (e.final && e.final.metricas && e.final.metricas.nadir ? e.final.metricas.nadir + " Hz" : "—"), st.nadir != null && st.nadir < 59.4 ? "malo" : "");
      dato(datos, "Etapas EDAC", String(st.edac != null ? st.edac : (e.final && e.final.metricas ? e.final.metricas.edac : "—")), st.edac > 0 ? "medio" : "");
      dato(datos, "Reloj", st.t != null ? mmss(st.t) : "—");
      dato(datos, "Telecontrol", st.telecontrol === false ? "Caído" : (st.telecontrol ? "En línea" : "—"), st.telecontrol === false ? "medio" : "");
      card.appendChild(datos);
      var roles = el("div", "roles");
      ROLES_GM.forEach(function (r) { roles.appendChild(el("span", "rol" + ((st.roles || []).indexOf(r) >= 0 ? " on" : ""), r)); });
      card.appendChild(roles);
      if (st.sin_respuesta >= 20) card.appendChild(el("span", "chip " + (st.sin_respuesta >= 30 ? "malo" : "medio"), "Sin responder a «" + st.evento + "» · " + st.sin_respuesta + " s"));
    } else {
      dato(datos, "Reloj clínico", st.t != null ? hhmm(st.t) : "—");
      dato(datos, "Salvados", String(st.salvados != null ? st.salvados : (e.final && e.final.metricas ? e.final.metricas.salvados : "—")), "bueno");
      dato(datos, "Fallecidos", String(st.fallecidos != null ? st.fallecidos : (e.final && e.final.metricas ? e.final.metricas.fallecidos : "—")), (st.fallecidos || (e.final && e.final.metricas && e.final.metricas.fallecidos)) ? "malo" : "");
      card.appendChild(datos);
      var ul = el("ul", "pacientes");
      (st.pacientes || []).forEach(function (p) {
        var li = el("li", "pac " + (p.estado === "muerto" ? "muerto" : p.estado === "egresado" ? "egresado" : ""));
        li.appendChild(el("span", "cama", "Cama " + p.cama));
        var c = el("span", "caso", p.caso); c.title = p.caso + " · triage " + (p.triage || "pendiente") + " · diagnóstico " + (p.dx || "pendiente"); li.appendChild(c);
        var der = el("span", "roles");
        der.appendChild(el("span", "chip " + (p.estado === "muerto" ? "malo" : p.estado === "egresado" ? "bueno" : "info"), p.paso));
        var g = el("span", "gravedad g" + Math.min(3, p.estadio || 0)); g.setAttribute("aria-label", "Estadio " + p.estadio);
        for (var i = 0; i < 3; i++) g.appendChild(el("i"));
        der.appendChild(g);
        li.appendChild(der);
        ul.appendChild(li);
      });
      if ((st.pacientes || []).length) card.appendChild(ul);
    }
    if (e.final) card.appendChild(el("span", "chip " + (e.final.insignia ? "bueno" : "info"), (e.final.insignia ? "Insignia · " : "") + (e.final.resultado || "Resultado recibido")));

    var evs = el("ul", "eventos");
    (e.eventos || []).slice(0, 4).forEach(function (ev) {
      var li = el("li");
      li.appendChild(el("span", "t", gm ? mmss(ev.t) : hhmm(ev.t)));
      li.appendChild(el("span", ev.tipo === "guia" ? "guia" : null, (ev.rol ? ev.rol + ": " : "") + ev.detalle));
      li.appendChild(el("span", "p " + (ev.puntos > 0 ? "mas" : ev.puntos < 0 ? "menos" : ""), ev.puntos ? (ev.puntos > 0 ? "+" : "") + ev.puntos : ""));
      evs.appendChild(li);
    });
    if ((e.eventos || []).length) card.appendChild(evs);

    if (s.estado === "abierta" && e.origen !== "codigo-resultado") {
      var acc = el("div", "eq-acciones");
      var bP = el("button", "btn mini", st.jugando ? "⏸ Pausar" : "⏵ Reanudar"); bP.type = "button";
      bP.addEventListener("click", function () { enviar(st.jugando ? "pausar" : (st.iniciado || st.t ? "reanudar" : "iniciar"), "", e); });
      var bM = el("button", "btn mini", "Mensaje"); bM.type = "button";
      bM.addEventListener("click", function () { dialogoMensaje(e); });
      var bE = el("button", "btn mini", "Lanzar evento"); bE.type = "button";
      bE.addEventListener("click", function () { dialogoEvento(s, e); });
      acc.appendChild(bP); acc.appendChild(bM); acc.appendChild(bE);
      card.appendChild(acc);
    }
    return card;
  }

  function pintarTablero(tb, primera) {
    var s = tb.sesion, eqs = tb.equipos || [];
    ultimo = tb;
    if (primera || !$("#sCodigo").textContent || $("#sCodigo").textContent !== s.codigo) pintarCabecera(s);
    else {
      var cerrada = s.estado !== "abierta";
      if (cerrada && !$("#btnCerrar").disabled) pintarCabecera(s);
    }
    var ahora = Date.now();
    eqs.forEach(function (e) {
      var p = puntajeDe(e);
      if (s.laboratorio === "grid-masters" && s.modo !== "juego") p = (e.estado || {}).acciones;
      if (typeof p === "number") {
        var m = muestras[e.id] = muestras[e.id] || [];
        if (!m.length || m[m.length - 1][1] !== p || ahora - m[m.length - 1][0] > 15000) m.push([ahora, p]);
        if (m.length > 120) m.shift();
      }
    });

    // indicadores
    var k = vaciar($("#kpis"));
    var conectados = eqs.filter(function (e) { return e.segundos_sin_senal != null && e.segundos_sin_senal <= 15; }).length;
    var jugando = eqs.filter(function (e) { return (e.estado || {}).jugando && !e.final; }).length;
    var terminados = eqs.filter(function (e) { return e.final; }).length;
    var pts = eqs.map(puntajeDe).filter(function (x) { return typeof x === "number"; });
    var todas = []; eqs.forEach(function (e) { todas = todas.concat(alertasDe(s, e)); });
    var activas = todas.filter(function (a) { return !descartadas[a.k]; });
    kpi(k, "Equipos", String(eqs.length));
    kpi(k, "Conectados ahora", conectados + " de " + eqs.length);
    kpi(k, "Jugando", String(jugando));
    kpi(k, "Terminaron", String(terminados));
    kpi(k, s.laboratorio === "grid-masters" && s.modo !== "juego" ? "Promedio de maniobras" : "Puntaje promedio",
      s.laboratorio === "grid-masters" && s.modo !== "juego" ? (eqs.length ? String(Math.round(eqs.reduce(function (a, e) { return a + ((e.estado || {}).acciones || 0); }, 0) / eqs.length)) : "—") : (pts.length ? String(Math.round(pts.reduce(function (a, b) { return a + b; }, 0) / pts.length)) : "—"));
    kpi(k, "Alertas activas", String(activas.filter(function (a) { return a.c === "malo" || a.c === "medio"; }).length), activas.some(function (a) { return a.c === "malo"; }) ? "alerta" : "");

    // equipos
    var cont = vaciar($("#equipos"));
    if (!eqs.length) {
      var v = el("div", "tarjeta vacio");
      v.appendChild(el("h3", null, "Aún no hay equipos"));
      v.appendChild(el("p", null, D.local ? "Modo de prueba: abre el laboratorio en otra pestaña de este navegador con «Copiar enlace» (o el QR) y únete con " + s.codigo + ". Los equipos de otros dispositivos aparecen cuando registras su código de resultado." : "Proyecta el código o comparte el enlace: cada equipo abre el laboratorio, pulsa «Unirse a la sesión del docente» y escribe " + s.codigo + "."));
      cont.appendChild(v);
    }
    eqs.forEach(function (e) { cont.appendChild(tarjetaEquipo(s, e)); });

    // alertas
    var ul = vaciar($("#alertas"));
    activas.sort(function (a, b) { var o = { malo: 0, medio: 1, info: 2, bueno: 3 }; return o[a.c] - o[b.c]; });
    if (!activas.length) ul.appendChild(el("li", "vacia", "Sin alertas por ahora."));
    activas.slice(0, 30).forEach(function (a) {
      var li = el("li", a.c), txt = el("div");
      txt.appendChild(el("b", null, a.t));
      if (a.d) { txt.appendChild(document.createElement("br")); txt.appendChild(el("span", null, a.d)); }
      li.appendChild(txt);
      var x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", "Marcar como vista");
      x.addEventListener("click", function () { descartadas[a.k] = 1; li.remove(); });
      li.appendChild(x);
      ul.appendChild(li);
      if (!primera && !vistas[a.k] && a.c === "malo") toast(a.t);
      vistas[a.k] = 1;
    });
    if (primera) activas.forEach(function (a) { vistas[a.k] = 1; });

    // clasificación
    var ol = vaciar($("#ranking"));
    var orden = eqs.map(function (e) { return { n: e.nombre, p: s.laboratorio === "grid-masters" && s.modo !== "juego" ? (e.estado || {}).acciones : puntajeDe(e), ins: e.final && e.final.insignia }; })
      .filter(function (x) { return typeof x.p === "number"; }).sort(function (a, b) { return b.p - a.p; });
    if (!orden.length) ol.appendChild(el("li", "nota", "Sin puntajes todavía."));
    orden.forEach(function (x) { var li = el("li", null, x.n + (x.ins ? " ★" : "")); li.appendChild(el("span", null, String(x.p))); ol.appendChild(li); });

    $("#actualizado").textContent = (D.local ? "Modo de prueba · actualizado " : "Actualizado ") + new Date().toLocaleTimeString("es-CO");
    if (!$("#proyector").hidden) $("#pEquipos").textContent = eqs.length + " equipo(s) unidos";
  }

  function enviar(cmd, arg, equipo) {
    if (!actual) return Promise.resolve();
    return D.comando(actual, cmd, arg, equipo ? equipo.id : null).then(function () {
      var dest = equipo ? "al equipo " + equipo.nombre : "a todos los equipos";
      var txt = { iniciar: "Inicio enviado", pausar: "Pausa enviada", reanudar: "Reanudación enviada", evento: "Evento enviado", mensaje: "Mensaje enviado" }[cmd] || "Orden enviada";
      toast(txt + " " + dest);
      setTimeout(actualizar, 600);
    }, function (e) { toast(e.message); });
  }

  /* ================================================================ diálogos */
  var dlgAceptar = null;
  function abrirDialogo(titulo, cuerpo, aceptar, textoAceptar) {
    $("#dTitulo").textContent = titulo;
    var c = vaciar($("#dCuerpo"));
    c.appendChild(cuerpo);
    $("#dAceptar").textContent = textoAceptar || "Aceptar";
    dlgAceptar = aceptar;
    $("#dialogo").hidden = false;
    var f = c.querySelector("input,select,textarea") || $("#dAceptar");
    setTimeout(function () { f.focus(); }, 30);
  }
  function cerrarDialogo() { $("#dialogo").hidden = true; dlgAceptar = null; }
  function dialogoMensaje(e) {
    var l = el("label", "campo", "Mensaje para " + e.nombre), i = el("input"); i.type = "text"; i.maxLength = 200; i.placeholder = "Ej.: Revisen el flujo por L2";
    l.appendChild(i);
    abrirDialogo("Enviar mensaje", l, function () { var t = i.value.trim(); if (!t) return false; enviar("mensaje", t, e); }, "Enviar");
  }
  function dialogoEvento(s, e) {
    var l = el("label", "campo", "Evento para " + e.nombre), sel = el("select");
    (EVENTOS[s.laboratorio] || []).forEach(function (x) { var o = el("option", null, x[1]); o.value = x[0]; sel.appendChild(o); });
    l.appendChild(sel);
    abrirDialogo("Lanzar evento a un equipo", l, function () { enviar("evento", sel.value, e); }, "Lanzar");
  }
  function confirmar(titulo, texto, accion, boton) {
    abrirDialogo(titulo, el("p", null, texto), accion, boton);
  }

  /* ================================================================ reporte */
  function abrirReporte(codigo) {
    actual = codigo || actual;
    if (!actual) return;
    mostrar("reporte");
    $("#tReporte").textContent = "Cargando…";
    D.reporte(actual).then(pintarReporte, function (e) { $("#tReporte").textContent = e.message; });
  }

  function pintarReporte(r) {
    var s = r.sesion, eqs = r.equipos || [], gm = s.laboratorio === "grid-masters";
    $("#tReporte").textContent = nombreLab(s.laboratorio) + " · " + s.codigo;
    $("#rDatos").textContent = s.pide_codigos
      ? "Datos tratados conforme a la Ley 1581 de 2012: nombre del equipo, códigos de estudiante autorizados al unirse y acciones del juego."
      : "Sesión sin datos personales: solo el nombre del equipo y las acciones del juego.";
    $("#rMeta").textContent = (MODOS[s.modo] || s.modo) + " · " + (NOMBRE_NIVEL[s.nivel] || s.nivel) + (s.titulo ? " · " + s.titulo : "") + (s.grupo ? " · " + s.grupo : "") +
      " · creada " + fechaCorta(s.creada) + (s.cerrada ? " · cerrada " + fechaCorta(s.cerrada) : " · abierta");
    var pts = eqs.map(puntajeDe).filter(function (x) { return typeof x === "number"; });
    var k = vaciar($("#rKpis"));
    kpi(k, "Equipos", String(eqs.length));
    if (s.pide_codigos) kpi(k, "Estudiantes", String(eqs.reduce(function (a, e) { return a + (e.integrantes || []).length; }, 0)));
    kpi(k, gm && s.modo !== "juego" ? "Maniobras promedio" : "Puntaje promedio", pts.length ? String(Math.round(pts.reduce(function (a, b) { return a + b; }, 0) / pts.length)) : "—");
    kpi(k, "Mejor puntaje", pts.length ? String(Math.max.apply(null, pts)) : "—");
    kpi(k, "Insignias", String(eqs.filter(function (e) { return e.final && e.final.insignia; }).length));

    var t = vaciar($("#rTabla"));
    var cab = el("tr");
    ["Puesto", "Equipo", "Integrantes", gm && s.modo !== "juego" ? "Maniobras" : "Puntaje", "Resultado", "Insignia", "Acciones", "Errores"].forEach(function (h) { cab.appendChild(el("th", null, h)); });
    var thead = el("thead"); thead.appendChild(cab); t.appendChild(thead);
    var tb = el("tbody");
    eqs.slice().sort(function (a, b) { return (puntajeDe(b) || -1e9) - (puntajeDe(a) || -1e9); }).forEach(function (e, i) {
      var tr = el("tr");
      tr.appendChild(el("td", "num", String(i + 1)));
      tr.appendChild(el("td", null, e.nombre + (e.origen === "codigo-resultado" ? " (código)" : "")));
      tr.appendChild(el("td", null, (e.integrantes || []).join(", ")));
      var p = puntajeDe(e); tr.appendChild(el("td", "num", p == null ? "—" : String(p)));
      tr.appendChild(el("td", null, e.final ? (e.final.resultado || "") : "Sin terminar"));
      tr.appendChild(el("td", null, e.final && e.final.insignia ? "Sí ★" : "No"));
      tr.appendChild(el("td", "num", String(e.acciones || 0)));
      tr.appendChild(el("td", "num", String(e.errores || 0)));
      tb.appendChild(tr);
    });
    t.appendChild(tb);

    function barras(cont, lista, vacio) {
      vaciar(cont);
      if (!lista.length) { cont.appendChild(el("li", "nota", vacio)); return; }
      var mx = Math.max.apply(null, lista.map(function (x) { return x.veces; }));
      lista.forEach(function (x) {
        var li = el("li");
        li.appendChild(el("span", null, x.detalle + " · " + x.veces + " vez/veces"));
        var b = el("span", "barra"), i = el("i"); i.style.width = Math.max(4, x.veces / mx * 100) + "%"; b.appendChild(i); li.appendChild(b);
        cont.appendChild(li);
      });
    }
    barras($("#rErrores"), r.errores_frecuentes || [], "Sin errores registrados.");
    barras($("#rAciertos"), r.aciertos_frecuentes || [], "Sin aciertos registrados.");

    var lin = vaciar($("#rLineas"));
    eqs.forEach(function (e) {
      var d = el("details", "linea-equipo"), sm = el("summary", null, e.nombre + " · " + (e.linea_de_tiempo || []).length + " registros");
      d.appendChild(sm);
      var tabla = el("table", "tabla"), tbo = el("tbody");
      (e.linea_de_tiempo || []).forEach(function (x) {
        var tr = el("tr");
        tr.appendChild(el("td", "num", gm ? mmss(x.t) : hhmm(x.t)));
        tr.appendChild(el("td", null, x.tipo));
        tr.appendChild(el("td", null, (x.rol ? x.rol + ": " : "") + x.detalle));
        tr.appendChild(el("td", "num", x.puntos ? (x.puntos > 0 ? "+" : "") + x.puntos : ""));
        tbo.appendChild(tr);
      });
      tabla.appendChild(tbo); d.appendChild(tabla); lin.appendChild(d);
    });
    if (!eqs.length) lin.appendChild(el("p", "nota", "No hay equipos en esta sesión."));
  }

  function descargarCsv() {
    D.csv(actual).then(function (blob) {
      var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "reporte-" + actual + ".csv";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, function (e) { toast(e.message); });
  }

  /* ================================================================ histórico */
  var historicoCache = [];
  function cargarHistorico() {
    D.listar().then(function (lista) { historicoCache = lista; pintarHistorico(); }, function (e) { toast(e.message); });
  }
  function pintarHistorico() {
    var f = $("#fHistLab").value;
    var lista = historicoCache.filter(function (s) { return !f || s.laboratorio === f; });
    var k = vaciar($("#hKpis"));
    kpi(k, "Sesiones", String(lista.length));
    kpi(k, "Equipos", String(lista.reduce(function (a, s) { return a + (s.equipos || 0); }, 0)));
    kpi(k, "Estudiantes", String(lista.reduce(function (a, s) { return a + (s.estudiantes || 0); }, 0)));
    kpi(k, "Insignias", String(lista.reduce(function (a, s) { return a + (s.insignias || 0); }, 0)));
    var t = vaciar($("#hTabla")), cab = el("tr");
    ["Fecha", "Código", "Laboratorio", "Modo y nivel", "Título / grupo", "Equipos", "Estudiantes", "Promedio", "Máximo", "Insignias", "Estado"].forEach(function (h) { cab.appendChild(el("th", null, h)); });
    var th = el("thead"); th.appendChild(cab); t.appendChild(th);
    var tb = el("tbody");
    if (!lista.length) { var tr0 = el("tr"), td0 = el("td", "nota", "Aún no hay sesiones."); td0.colSpan = 11; tr0.appendChild(td0); tb.appendChild(tr0); }
    lista.forEach(function (s) {
      var tr = el("tr", "clic"); tr.tabIndex = 0;
      [fechaCorta(s.creada), s.codigo, nombreLab(s.laboratorio), (MODOS[s.modo] || s.modo) + " · " + (NOMBRE_NIVEL[s.nivel] || s.nivel), [s.titulo, s.grupo].filter(Boolean).join(" · ") || "—"].forEach(function (x) { tr.appendChild(el("td", null, x)); });
      [s.equipos, s.estudiantes, s.promedio == null ? "—" : s.promedio, s.maximo == null ? "—" : s.maximo, s.insignias].forEach(function (x) { tr.appendChild(el("td", "num", String(x))); });
      tr.appendChild(el("td", null, s.estado === "abierta" ? "Abierta" : "Cerrada"));
      var ir = function () { if (s.estado === "abierta") abrirSesion(s.codigo); else abrirReporte(s.codigo); };
      tr.addEventListener("click", ir);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    graficaHistorico(lista);
  }
  function graficaHistorico(lista) {
    var cv = $("#hGrafica"), c = cv.getContext("2d"), W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    var css = getComputedStyle(document.body).fontFamily || "sans-serif";
    c.font = "13px " + css;
    var datos = lista.filter(function (s) { return typeof s.promedio === "number"; }).slice().reverse();
    if (datos.length < 1) { c.fillStyle = "#5A6578"; c.fillText("Cuando haya sesiones con puntaje, aquí verás su evolución.", 24, H / 2); return; }
    var L = 56, R = 16, T = 18, B = 40, pw = W - L - R, ph = H - T - B;
    var vs = datos.map(function (s) { return s.promedio; }), mn = Math.min(0, Math.min.apply(null, vs)), mx = Math.max.apply(null, vs);
    if (mx - mn < 4) mx = mn + 4;
    var Y = function (v) { return T + (1 - (v - mn) / (mx - mn)) * ph; };
    var X = function (i) { return L + (datos.length === 1 ? pw / 2 : i / (datos.length - 1) * pw); };
    c.strokeStyle = "#E3E8F0"; c.fillStyle = "#5A6578"; c.lineWidth = 1; c.textAlign = "right";
    for (var g = 0; g <= 4; g++) { var v = mn + (mx - mn) * g / 4, y = Y(v); c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke(); c.fillText(String(Math.round(v)), L - 8, y + 4); }
    var colores = { "grid-masters": "#003DA5", "turno-urgencias": "#B26A00" };
    Object.keys(colores).forEach(function (lab) {
      var pts = datos.map(function (s, i) { return [i, s]; }).filter(function (x) { return x[1].laboratorio === lab; });
      if (!pts.length) return;
      c.strokeStyle = colores[lab]; c.fillStyle = colores[lab]; c.lineWidth = 2.5; c.beginPath();
      pts.forEach(function (x, j) { var px = X(x[0]), py = Y(x[1].promedio); if (j) c.lineTo(px, py); else c.moveTo(px, py); });
      c.stroke();
      pts.forEach(function (x) { c.beginPath(); c.arc(X(x[0]), Y(x[1].promedio), 4.5, 0, Math.PI * 2); c.fill(); });
    });
    c.fillStyle = "#5A6578"; c.textAlign = "center";
    var paso = Math.max(1, Math.ceil(datos.length / 8));
    datos.forEach(function (s, i) { if (i % paso === 0) c.fillText(new Date(s.creada).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }), X(i), H - 14); });
    $("#hLeyenda").textContent = "Puntaje promedio de los equipos en cada sesión · azul: Grid Masters (PES o maniobras) · ámbar: Turno de urgencias (puntos de vida).";
  }

  /* ================================================================ importar */
  var leido = null, stream = null, rafCam = null;
  function cargarImportar() {
    var sel = vaciar($("#fImpSesion"));
    D.listar().then(function (lista) {
      if (!lista.length) { var o = el("option", null, "Primero crea una sesión"); o.value = ""; sel.appendChild(o); return; }
      lista.forEach(function (s) {
        var o = el("option", null, s.codigo + " · " + nombreLab(s.laboratorio) + (s.grupo ? " · " + s.grupo : "") + (s.estado === "abierta" ? "" : " (cerrada)"));
        o.value = s.codigo; o.dataset.lab = s.laboratorio; sel.appendChild(o);
      });
      if (actual) sel.value = actual;
    });
  }
  function decodificar(txt) {
    txt = String(txt || "").trim().replace(/\s+/g, "");
    var m = /^BICR1\.([A-Za-z0-9_-]+)\.([0-9A-F]{4})$/.exec(txt);
    if (!m) throw new Error("El código no tiene el formato BICR1 de los laboratorios. Revisa que esté completo.");
    var h = 0; for (var i = 0; i < m[1].length; i++) h = (h * 31 + m[1].charCodeAt(i)) >>> 0;
    if ((h % 65536).toString(16).toUpperCase().padStart(4, "0") !== m[2]) throw new Error("El código está incompleto o tiene un carácter cambiado. Cópialo de nuevo o escanea el QR.");
    var b64 = m[1].replace(/-/g, "+").replace(/_/g, "/"); while (b64.length % 4) b64 += "=";
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
    var r = JSON.parse(new TextDecoder().decode(bytes));
    if (!r || !r.lab || !r.equipo) throw new Error("El código no trae los datos del equipo.");
    return r;
  }
  function revisar(txt) {
    var msg = $("#impMsg"), vista = vaciar($("#impVista"));
    msg.classList.remove("ok");
    leido = null; $("#btnRegistrar").disabled = true;
    try { leido = decodificar(txt); } catch (e) { msg.textContent = e.message; vista.appendChild(el("p", "nota", "Sin datos válidos.")); return; }
    msg.textContent = "";
    var v = el("div", "vista-previa");
    var fila = function (a, b) { var p = el("p"); p.appendChild(el("b", null, a + ": ")); p.appendChild(document.createTextNode(b)); v.appendChild(p); };
    fila("Laboratorio", nombreLab(leido.lab));
    fila("Sesión indicada por el equipo", leido.sesion || "—");
    fila("Equipo", leido.equipo);
    fila("Integrantes", (leido.integrantes || []).join(", ") || "—");
    fila("Puntaje", String(leido.puntaje));
    fila("Resultado", leido.resultado || "—");
    fila("Insignia", leido.insignia ? "Sí" : "No");
    fila("Autorización de datos", leido.autorizado ? "Marcada por el equipo al unirse" : "No");
    if ((leido.errores || []).length) fila("Errores principales", leido.errores.map(function (x) { return x[0] + " (" + x[1] + ")"; }).join("; "));
    fila("Fecha", (leido.t || "").replace("T", " "));
    vista.appendChild(v);
    var sel = $("#fImpSesion");
    var opcion = Array.prototype.find.call(sel.options, function (o) { return o.value === leido.sesion; });
    if (opcion) sel.value = leido.sesion;
    var lab = sel.selectedOptions[0] && sel.selectedOptions[0].dataset.lab;
    if (lab && lab !== leido.lab) { msg.textContent = "Ojo: la sesión elegida es de " + nombreLab(lab) + " y el resultado es de " + nombreLab(leido.lab) + "."; return; }
    $("#btnRegistrar").disabled = !sel.value;
  }
  function camara(encender) {
    if (!encender) {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null; cancelAnimationFrame(rafCam); $("#camara").hidden = true; return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof window.jsQR !== "function") { toast("Este navegador no permite usar la cámara aquí. Pega el código."); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
      stream = s; var v = $("#video"); v.srcObject = s; v.play(); $("#camara").hidden = false;
      var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
      var ciclo = function () {
        if (!stream) return;
        if (v.readyState >= 2) {
          cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0);
          var img = cx.getImageData(0, 0, cv.width, cv.height), q = window.jsQR(img.data, cv.width, cv.height, { inversionAttempts: "dontInvert" });
          if (q && /^BICR1\./.test(q.data)) { $("#fCodigo").value = q.data; camara(false); revisar(q.data); toast("QR leído"); return; }
        }
        rafCam = requestAnimationFrame(ciclo);
      };
      ciclo();
    }, function () { toast("No fue posible abrir la cámara. Revisa los permisos o pega el código."); });
  }

  /* ================================================================ proyector */
  function proyectar() {
    var tb = ultimo; if (!tb) return;
    var s = tb.sesion, url = enlaceJuego(s);
    $("#pLab").textContent = nombreLab(s.laboratorio) + (s.titulo ? " · " + s.titulo : "");
    $("#pCodigo").textContent = s.codigo;
    $("#pUrl").textContent = url;
    var q = vaciar($("#pQr")); q.appendChild(qrSvg(url));
    $("#pEquipos").textContent = (tb.equipos || []).length + " equipo(s) unidos";
    $("#proyector").hidden = false;
    $("#btnProyCerrar").focus();
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { /* opcional */ });
  }

  /* ================================================================ eventos de la interfaz */
  function enlazar() {
    $$("#pestanas button[data-vista]").forEach(function (b) { b.addEventListener("click", function () { mostrar(b.dataset.vista); }); });
    $$("#controlGeneral [data-cmd]").forEach(function (b) { b.addEventListener("click", function () { enviar(b.dataset.cmd); }); });
    $("#btnEvento").addEventListener("click", function () { enviar("evento", $("#selEvento").value); });
    $("#btnMensaje").addEventListener("click", function () { var t = $("#txtMensaje").value.trim(); if (!t) { $("#txtMensaje").focus(); return; } enviar("mensaje", t).then(function () { $("#txtMensaje").value = ""; }); });
    $("#txtMensaje").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#btnMensaje").click(); });
    $("#btnProyectar").addEventListener("click", proyectar);
    $("#btnProyCerrar").addEventListener("click", function () { $("#proyector").hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(function () { /* nada */ }); });
    $("#btnCopiarEnlace").addEventListener("click", function () {
      if (!ultimo) return; var u = enlaceJuego(ultimo.sesion);
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { toast("Enlace copiado"); }, function () { toast(u); }); else toast(u);
    });
    $("#btnReporte").addEventListener("click", function () { abrirReporte(actual); });
    $("#btnCerrar").addEventListener("click", function () {
      confirmar("Cerrar la sesión " + actual, "Los equipos dejarán de recibir órdenes y ya no podrán unirse. Los resultados quedan guardados para el reporte y el histórico.", function () {
        D.cerrar(actual).then(function () { toast("Sesión cerrada"); abrirReporte(actual); }, function (e) { toast(e.message); });
      }, "Cerrar sesión");
    });
    $("#btnVolverVivo").addEventListener("click", function () { mostrar("vivo"); });
    $("#btnCsv").addEventListener("click", descargarCsv);
    $("#btnImprimir").addEventListener("click", function () { $$("#rLineas details").forEach(function (d) { d.open = true; }); window.print(); });
    $("#btnBorrar").addEventListener("click", function () {
      var c = actual;
      confirmar("Borrar la sesión " + c, "Se borran de forma definitiva los equipos, los códigos de estudiante y todos los eventos de esta sesión (supresión de datos, Ley 1581 de 2012). Descarga antes el CSV si lo necesitas.", function () {
        D.borrar(c).then(function () { toast("Sesión " + c + " borrada"); actual = null; try { sessionStorage.removeItem(CLAVE_ACTUAL); } catch (e) { /* nada */ } mostrar("historico"); }, function (e) { toast(e.message); });
      }, "Borrar definitivamente");
    });
    $("#fHistLab").addEventListener("change", pintarHistorico);
    $("#btnLeer").addEventListener("click", function () { revisar($("#fCodigo").value); });
    $("#fImpSesion").addEventListener("change", function () { if (leido) revisar($("#fCodigo").value); });
    $("#btnRegistrar").addEventListener("click", function () {
      if (!leido) return;
      var c = $("#fImpSesion").value;
      D.importar(c, leido).then(function () {
        $("#impMsg").textContent = "Resultado de «" + leido.equipo + "» registrado en " + c + ".";
        $("#impMsg").classList.add("ok");
        $("#fCodigo").value = ""; leido = null; $("#btnRegistrar").disabled = true; vaciar($("#impVista"));
      }, function (e) { $("#impMsg").classList.remove("ok"); $("#impMsg").textContent = e.message; });
    });
    $("#btnCamara").addEventListener("click", function () { camara(true); });
    $("#btnCamaraOff").addEventListener("click", function () { camara(false); });
    $("#dCancelar").addEventListener("click", cerrarDialogo);
    $("#dAceptar").addEventListener("click", function () { if (dlgAceptar && dlgAceptar() === false) return; cerrarDialogo(); });
    $("#dialogo").addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarDialogo(); if (e.key === "Enter" && e.target.tagName === "INPUT") $("#dAceptar").click(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#proyector").hidden) $("#btnProyCerrar").click(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && !$("#vVivo").hidden) actualizar(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    enlazar();
    iniciarNueva();
    iniciarAcceso();
  });
})();
