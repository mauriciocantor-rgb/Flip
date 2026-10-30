/* Tablero de citas Scopus · lógica (Biblioteca e Información Científica, UTP)
   Gráficos en SVG generados aquí mismo: sin librerías externas (lineamientos CRIE). */
(function () {
  "use strict";
  var D = window.DATOS_SCOPUS;
  var ANIOS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  var NS = "http://www.w3.org/2000/svg";
  var fmt = new Intl.NumberFormat("es-CO");
  var fmt1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var tip = document.getElementById("tooltip");

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function html(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esParcial(a) { return a === D.anioParcial; }
  function etiquetaAnio(a) { return esParcial(a) ? a + "*" : String(a); }

  /* ---------- Corte y KPIs ---------- */
  var f = new Date(D.fechaConsulta + "T12:00:00");
  $("corte").textContent = "Corte: " + f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) +
    " · Fuente: Scopus (Elsevier) · * " + D.anioParcial + " es un año en curso.";

  var citados = D.documentosOverview;
  var kpis = [
    ["Documentos", fmt.format(D.documentosBusqueda), "publicados 2020–2026"],
    ["Citas", fmt.format(D.citasTotales), "recibidas por esos documentos"],
    ["Índice h", fmt.format(D.indiceH), D.indiceH + " documentos con al menos " + D.indiceH + " citas"],
    ["Citas por documento", fmt1.format(D.citasTotales / D.documentosBusqueda), "mediana de " + D.mediana + " entre los citados"],
    ["Documentos citados", fmt1.format(citados / D.documentosBusqueda * 100) + " %", fmt.format(citados) + " de " + fmt.format(D.documentosBusqueda)],
    ["Con 100 citas o más", fmt.format(D.docsCon100oMas), "el más citado suma " + fmt.format(D.maximo)]
  ];
  kpis.forEach(function (k) {
    var c = html("div", "kpi");
    c.appendChild(html("p", "etq", k[0]));
    c.appendChild(html("p", "valor", k[1]));
    c.appendChild(html("p", "det", k[2]));
    $("kpis").appendChild(c);
  });

  /* ---------- Tooltip ---------- */
  function mostrarTip(ev, contenido) {
    tip.innerHTML = "";
    contenido.forEach(function (linea, i) {
      var p = document.createElement("div");
      if (i === 0) { var b = document.createElement("b"); b.textContent = linea; p.appendChild(b); }
      else p.textContent = linea;
      tip.appendChild(p);
    });
    tip.hidden = false;
    moverTip(ev);
  }
  function moverTip(ev) {
    var r = ev.target.getBoundingClientRect();
    var x = ev.clientX != null && ev.clientX !== 0 ? ev.clientX : r.left + r.width / 2;
    var y = ev.clientY != null && ev.clientY !== 0 ? ev.clientY : r.top;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
    var top = y - h - 12; if (top < 8) top = y + 16;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function ocultarTip() { tip.hidden = true; }

  function escala(max) {
    var paso = Math.pow(10, Math.floor(Math.log10(max)));
    var opciones = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < opciones.length; i++) {
      var s = opciones[i] * paso;
      if (max / s <= 5) return { paso: s, tope: Math.ceil(max / s) * s };
    }
    return { paso: paso * 10, tope: Math.ceil(max / (paso * 10)) * paso * 10 };
  }

  /* ---------- Gráfico de barras (simple o apilado) ----------
     series: [{nombre, color, valores:{anio:n}}]  (apiladas de abajo hacia arriba)
     opts: {etiquetas:[anios con cifra visible], decimales, tip(anio)} */
  function barras(cont, series, opts) {
    var W = Math.max(320, Math.round($(cont).clientWidth || 960)), H = W < 560 ? 240 : 300, m = { t: 26, r: 8, b: 34, l: W < 560 ? 44 : 56 };
    $(cont).innerHTML = "";
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var totales = ANIOS.map(function (a) { return series.reduce(function (s, se) { return s + se.valores[a]; }, 0); });
    var sc = escala(Math.max.apply(null, totales));
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opts.aria });
    // rejilla y eje Y
    for (var v = 0; v <= sc.tope; v += sc.paso) {
      var y = m.t + ih - v / sc.tope * ih;
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, "class": v === 0 ? "eje" : "rejilla" }, svg);
      var t = el("text", { x: m.l - 8, y: y + 4, "text-anchor": "end" }, svg);
      t.textContent = fmt.format(v);
    }
    var banda = iw / ANIOS.length, ancho = Math.min(64, banda * 0.56);
    ANIOS.forEach(function (a, i) {
      var cx = m.l + banda * i + banda / 2;
      var g = el("g", { "class": "col" }, svg);
      var base = m.t + ih;
      var marks = el("g", {}, g);
      series.forEach(function (se, j) {
        var val = se.valores[a];
        if (!val) return;
        var hgt = val / sc.tope * ih;
        var tope = j === series.length - 1 || series.slice(j + 1).every(function (s2) { return !s2.valores[a]; });
        var gap = j > 0 ? 2 : 0; // 2px de separación entre segmentos
        var yTop = base - hgt;
        var color = (se.parcial && esParcial(a)) ? se.parcial : se.color;
        if (tope) {
          var rr = Math.min(4, hgt - gap);
          var d = "M" + (cx - ancho / 2) + "," + (base - gap) +
            "V" + (yTop + rr) + "Q" + (cx - ancho / 2) + "," + yTop + " " + (cx - ancho / 2 + rr) + "," + yTop +
            "H" + (cx + ancho / 2 - rr) + "Q" + (cx + ancho / 2) + "," + yTop + " " + (cx + ancho / 2) + "," + (yTop + rr) +
            "V" + (base - gap) + "Z";
          el("path", { d: d, fill: color, "class": "barra" }, marks);
        } else {
          el("rect", { x: cx - ancho / 2, y: yTop, width: ancho, height: Math.max(0, hgt - gap), fill: color, "class": "barra" }, marks);
        }
        base = yTop;
      });
      if (opts.etiquetas.indexOf(a) !== -1) {
        var tv = el("text", { x: cx, y: base - 7, "text-anchor": "middle", "class": "val" }, g);
        tv.textContent = opts.decimales ? fmt1.format(totales[i]) : fmt.format(totales[i]);
      }
      var tx = el("text", { x: cx, y: H - 10, "text-anchor": "middle" }, g);
      tx.textContent = W < 560 ? "\u2019" + etiquetaAnio(a).slice(2) : etiquetaAnio(a);
      // zona de interacción más grande que la barra
      var hit = el("rect", { x: m.l + banda * i, y: m.t, width: banda, height: ih, "class": "hit", tabindex: 0, "aria-label": opts.tip(a).join(". ") }, g);
      g.insertBefore(hit, marks);
      function on(ev) { g.classList.add("activa"); mostrarTip(ev, opts.tip(a)); }
      function off() { g.classList.remove("activa"); ocultarTip(); }
      hit.addEventListener("mouseenter", on);
      hit.addEventListener("mousemove", moverTip);
      hit.addEventListener("mouseleave", off);
      hit.addEventListener("focus", on);
      hit.addEventListener("blur", off);
    });
    $(cont).appendChild(svg);
  }

  function tabla(cont, encabezados, filas) {
    var t = document.createElement("table");
    var tr = document.createElement("tr");
    encabezados.forEach(function (h) { var th = document.createElement("th"); th.scope = "col"; th.textContent = h; tr.appendChild(th); });
    var thead = document.createElement("thead"); thead.appendChild(tr); t.appendChild(thead);
    var tb = document.createElement("tbody");
    filas.forEach(function (f) {
      var r = document.createElement("tr");
      f.forEach(function (c) { var td = document.createElement("td"); td.textContent = c; r.appendChild(td); });
      tb.appendChild(r);
    });
    t.appendChild(tb);
    $(cont).appendChild(t);
  }

  function leyenda(cont, items) {
    items.forEach(function (it) {
      var s = document.createElement("span");
      var i = document.createElement("i"); i.className = it[1];
      s.appendChild(i); s.appendChild(document.createTextNode(it[0]));
      $(cont).appendChild(s);
    });
  }

  function col(v) { return "var(" + v + ")"; }

  /* ---------- 1. Documentos publicados por año ---------- */
  var sinCitas = {};
  ANIOS.forEach(function (a) { sinCitas[a] = D.docsPublicados[a] - D.docsEnOverview[a]; });
  leyenda("leyDocs", [["Con citas registradas", "l1"], ["Sin citas registradas", "l2"]]);
  function dibujarDocs() {
  var maxDocs = ANIOS.reduce(function (b, a) { return D.docsPublicados[a] > D.docsPublicados[b] ? a : b; }, ANIOS[0]);
  barras("gDocs", [
    { nombre: "Con citas", color: col("--serie-1"), valores: D.docsEnOverview },
    { nombre: "Sin citas", color: col("--serie-2"), valores: sinCitas }
  ], {
    aria: "Barras apiladas de documentos publicados por año, 2020 a 2026, divididos entre documentos con y sin citas registradas.",
    etiquetas: [maxDocs, D.anioParcial],
    tip: function (a) {
      var p = D.docsPublicados[a];
      return [etiquetaAnio(a) + (esParcial(a) ? " (año en curso)" : ""),
        "Publicados: " + fmt.format(p),
        "Con citas: " + fmt.format(D.docsEnOverview[a]) + " (" + fmt1.format(D.docsEnOverview[a] / p * 100) + " %)",
        "Sin citas registradas: " + fmt.format(sinCitas[a])];
    }
  });
  }
  tabla("tabla-docs", ["Año", "Publicados", "Con citas", "Sin citas registradas", "% citados"],
    ANIOS.map(function (a) {
      var p = D.docsPublicados[a];
      return [etiquetaAnio(a), fmt.format(p), fmt.format(D.docsEnOverview[a]), fmt.format(sinCitas[a]), fmt1.format(D.docsEnOverview[a] / p * 100) + " %"];
    }).concat([["Total", fmt.format(D.documentosBusqueda), fmt.format(D.documentosOverview), fmt.format(D.documentosBusqueda - D.documentosOverview), fmt1.format(D.documentosOverview / D.documentosBusqueda * 100) + " %"]]));

  /* ---------- 2. Citas recibidas por año ---------- */
  var maxCit = ANIOS.reduce(function (b, a) { return D.citasRecibidas[a] > D.citasRecibidas[b] ? a : b; }, ANIOS[0]);
  function dibujarCitas() {
  barras("gCitas", [{ nombre: "Citas", color: col("--serie-1"), parcial: col("--parcial"), valores: D.citasRecibidas }], {
    aria: "Barras de citas recibidas en cada año calendario, 2020 a 2026.",
    etiquetas: [maxCit, D.anioParcial],
    tip: function (a) {
      var l = [etiquetaAnio(a) + (esParcial(a) ? " (año en curso, hasta el corte)" : ""), "Citas recibidas: " + fmt.format(D.citasRecibidas[a])];
      var ant = ANIOS.indexOf(a) > 0 ? D.citasRecibidas[a - 1] : null;
      if (ant && !esParcial(a)) {
        var vr = (D.citasRecibidas[a] - ant) / ant * 100;
        l.push("Frente a " + (a - 1) + ": " + (vr >= 0 ? "+" : "−") + fmt1.format(Math.abs(vr)) + " %");
      }
      return l;
    }
  });
  }
  var sumaAnual = ANIOS.reduce(function (s, a) { return s + D.citasRecibidas[a]; }, 0);
  tabla("tabla-citas", ["Año", "Citas recibidas"],
    [["Antes de 2020", fmt.format(D.citasAntes2020)]]
      .concat(ANIOS.map(function (a) { return [etiquetaAnio(a), fmt.format(D.citasRecibidas[a])]; }))
      .concat([["Posterior a 2026", fmt.format(D.citasPosterior2026)],
               ["Total", fmt.format(D.citasAntes2020 + sumaAnual + D.citasPosterior2026)]]));

  /* ---------- 3. Citas por documento según año de publicación ---------- */
  var cpd = {};
  ANIOS.forEach(function (a) { cpd[a] = D.citasPorCohorte[a] / D.docsPublicados[a]; });
  function dibujarCoh() {
  barras("gCoh", [{ nombre: "Citas por documento", color: col("--serie-1"), parcial: col("--parcial"), valores: cpd }], {
    aria: "Barras del promedio de citas por documento según el año de publicación, 2020 a 2026.",
    etiquetas: [2020, D.anioParcial],
    decimales: true,
    tip: function (a) {
      return [etiquetaAnio(a) + " · año de publicación",
        "Citas por documento: " + fmt1.format(cpd[a]),
        "Citas acumuladas: " + fmt.format(D.citasPorCohorte[a]),
        "Documentos: " + fmt.format(D.docsPublicados[a]),
        "Índice h de ese año: " + D.hPorCohorte[a]];
    }
  });
  }
  function dibujarTodo() { dibujarDocs(); dibujarCitas(); dibujarCoh(); }
  dibujarTodo();
  var anchoPrevio = window.innerWidth, espera;
  window.addEventListener("resize", function () {
    if (window.innerWidth === anchoPrevio) return;
    anchoPrevio = window.innerWidth; clearTimeout(espera); espera = setTimeout(dibujarTodo, 150);
  });
  tabla("tabla-coh", ["Año de publicación", "Documentos", "Citas acumuladas", "Citas por documento", "Índice h"],
    ANIOS.map(function (a) {
      return [etiquetaAnio(a), fmt.format(D.docsPublicados[a]), fmt.format(D.citasPorCohorte[a]), fmt1.format(cpd[a]), String(D.hPorCohorte[a])];
    }));

  /* ---------- Botones "Ver tabla" ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".btn-tabla"), function (b) {
    b.addEventListener("click", function () {
      var t = $("tabla-" + b.getAttribute("data-tabla"));
      t.hidden = !t.hidden;
      b.setAttribute("aria-expanded", String(!t.hidden));
      b.textContent = t.hidden ? "Ver tabla" : "Ocultar tabla";
    });
  });

  /* ---------- Descarga CSV (separador ";" y coma decimal, para Excel en español) ---------- */
  $("btnCsv").addEventListener("click", function () {
    function dec(x) { return x.toFixed(2).replace(".", ","); }
    var filas = [["Año", "Año en curso", "Documentos publicados", "Documentos con citas", "Documentos sin citas registradas",
      "Porcentaje citados", "Citas recibidas en el año", "Citas acumuladas por documentos del año", "Citas por documento", "Índice h del año"]];
    ANIOS.forEach(function (a) {
      var p = D.docsPublicados[a];
      filas.push([a, esParcial(a) ? "Sí" : "No", p, D.docsEnOverview[a], sinCitas[a], dec(D.docsEnOverview[a] / p * 100),
        D.citasRecibidas[a], D.citasPorCohorte[a], dec(cpd[a]), D.hPorCohorte[a]]);
    });
    filas.push(["Total", "", D.documentosBusqueda, D.documentosOverview, D.documentosBusqueda - D.documentosOverview,
      dec(D.documentosOverview / D.documentosBusqueda * 100), D.citasTotales, D.sumaFilas, dec(D.citasTotales / D.documentosBusqueda), D.indiceH]);
    filas.push([]);
    filas.push(["Fuente", "Scopus (Elsevier), consultado el " + D.fechaConsulta]);
    filas.push(["Consulta", D.consulta]);
    filas.push(["Nota", "Citas recibidas totales incluyen " + D.citasAntes2020 + " citas anteriores a 2020 y " + D.citasPosterior2026 + " posteriores a 2026. Documentos sin citas registradas = búsqueda menos Citation Overview (inferido)."]);
    var csv = filas.map(function (f) {
      return f.map(function (c) { c = String(c); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(";");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "citas-scopus-utp-2020-2026_" + D.fechaConsulta + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* ---------- Nota metodológica ---------- */
  var notas = [
    ["Fuente: Scopus (Elsevier), consultado el " + f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ". Consulta: ", D.consulta, " (los dos identificadores de afiliación de la UTP en Scopus, años de publicación 2020 a 2026)."],
    ["Documentos publicados por año: conteo de la lista de resultados de Scopus (" + fmt.format(D.documentosBusqueda) + " documentos). Citas, índice h y cohortes: Citation Overview de Scopus, que incluye " + fmt.format(D.documentosOverview) + " documentos."],
    ["“Sin citas registradas” se obtiene por diferencia (" + fmt.format(D.documentosBusqueda) + " − " + fmt.format(D.documentosOverview) + " = " + fmt.format(D.documentosBusqueda - D.documentosOverview) + "): son los documentos de la búsqueda que no aparecen en el Citation Overview, que se interpretan como documentos aún sin citas en Scopus. Es una inferencia, no un dato que Scopus muestre directamente."],
    ["Citas totales (" + fmt.format(D.citasTotales) + ") según el total de Scopus, que incluye " + D.citasAntes2020 + " citas fechadas antes de 2020 y " + D.citasPosterior2026 + " posteriores a 2026 (artículos citantes en prensa). La suma documento a documento da " + fmt.format(D.sumaFilas) + "; la diferencia de " + fmt.format(D.citasTotales - D.sumaFilas) + " está en la columna “posterior a 2026”."],
    ["“Citas por documento” divide las citas entre los " + fmt.format(D.documentosBusqueda) + " documentos de la búsqueda (no solo los citados). Las citas incluyen autocitas: no se aplicó ninguna exclusión."],
    [D.anioParcial + " es un año en curso: sus cifras de publicaciones y citas están incompletas y no son comparables con años cerrados. Los documentos recientes, además, han tenido menos tiempo para acumular citas."]
  ];
  notas.forEach(function (n) {
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(n[0]));
    if (n.length > 1) { var c = document.createElement("code"); c.textContent = n[1]; li.appendChild(c); li.appendChild(document.createTextNode(n[2])); }
    $("nota").appendChild(li);
  });
})();
