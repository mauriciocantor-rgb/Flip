"""
Servicio del Panel docente BIC · Biblioteca Jorge Roa Martínez (UTP)
=====================================================================

Recibe la telemetría de los laboratorios gamificados (Grid Masters y Turno de
urgencias) y la entrega al Panel docente para el seguimiento de los equipos en
vivo, el control de la partida, el reporte de la sesión y el histórico.
Pensado para que el CRIE lo aloje en un servidor de la UTP, igual que el
contador de la colección APA.

Qué guarda
----------
- Sesiones: código, laboratorio, modo, nivel, título y grupo.
- Equipos: nombre, códigos de estudiante de sus integrantes (con la
  autorización de tratamiento de datos que marcan al unirse) y el último
  estado del juego.
- Eventos del juego: acciones, puntos ganados o perdidos y resultado final.
No guarda direcciones IP, nombres de personas, correos ni cookies.
Las sesiones más antiguas que RETENCION_DIAS se borran solas.

Autenticación
-------------
- Docentes: cabecera  X-Token-Docente  igual a la variable TOKEN_DOCENTE.
- Equipos: cabecera  X-Token-Equipo  que el servicio entrega al unirse.

Endpoints
---------
  GET    /healthz
  POST   /api/sesiones                          (docente) crear sesión
  GET    /api/sesiones                          (docente) histórico con resumen
  GET    /api/sesiones/<codigo>/publica         datos para unirse (sin datos de equipos)
  POST   /api/sesiones/<codigo>/equipos         un equipo se une
  POST   /api/sesiones/<codigo>/telemetria      (equipo) estado + eventos; devuelve comandos
  GET    /api/sesiones/<codigo>/tablero         (docente) estado en vivo
  POST   /api/sesiones/<codigo>/comandos        (docente) iniciar, pausar, reanudar, evento, mensaje
  POST   /api/sesiones/<codigo>/cerrar          (docente)
  GET    /api/sesiones/<codigo>/reporte         (docente) reporte completo en JSON
  GET    /api/sesiones/<codigo>/reporte.csv     (docente) reporte por integrante en CSV
  POST   /api/sesiones/<codigo>/importar        (docente) resultados traídos sin red (código de resultado)
  DELETE /api/sesiones/<codigo>                 (docente) borra la sesión y todos sus datos

Variables de entorno
--------------------
  TOKEN_DOCENTE         Clave compartida del personal docente (obligatoria; sin ella
                        las rutas de docente responden 503).
  PANEL_DB              Ruta del archivo SQLite (por defecto ./datos/panel.db)
  ORIGENES_PERMITIDOS   Orígenes CORS separados por coma
                        (por defecto https://mauriciocantor-rgb.github.io)
  RETENCION_DIAS        Días que se conservan las sesiones (por defecto 365)
  LIMITE_POR_MINUTO     Máximo de solicitudes de telemetría por equipo en 60 s (por defecto 90)
  CONFIAR_PROXY         "1" si el servicio está detrás de nginx/Apache
"""
from __future__ import annotations

import csv
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import Counter, defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, Response, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("PANEL_DB", str(BASE_DIR / "datos" / "panel.db")))
TOKEN_DOCENTE = os.environ.get("TOKEN_DOCENTE", "")
ORIGENES = {
    o.strip().rstrip("/")
    for o in os.environ.get("ORIGENES_PERMITIDOS", "https://mauriciocantor-rgb.github.io").split(",")
    if o.strip()
}
RETENCION_DIAS = int(os.environ.get("RETENCION_DIAS", "365"))
LIMITE = int(os.environ.get("LIMITE_POR_MINUTO", "90"))
CONFIAR_PROXY = os.environ.get("CONFIAR_PROXY", "0") == "1"

LABORATORIOS = {
    "grid-masters": {
        "modos": {"guiado", "juego", "libre"},
        "niveles": {"pre", "inv"},
        "eventos": {"ramp", "L3", "L1", "link", "linkok", "osc", "unit"},
    },
    "turno-urgencias": {
        "modos": {"turno"},
        "niveles": {"pre", "pos"},
        "eventos": {"sys", "sysok", "arrive", "icu", "worse"},
    },
}
COMANDOS = {"iniciar", "pausar", "reanudar", "evento", "mensaje"}
ALFABETO = "ACDEFGHJKMNPQRTUVWXY34679"  # sin letras ni números que se confunden
PATRON_CODIGO = re.compile(r"^BIC-[A-Z0-9]{3}$")
PATRON_ESTUDIANTE = re.compile(r"^[A-Za-z0-9.\-]{3,20}$")
MAX_INTEGRANTES = 6
MAX_EVENTOS_LOTE = 60
MAX_ESTADO = 8000  # bytes del estado JSON de un equipo

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024


def ahora() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------- base de datos
ESQUEMA = """
CREATE TABLE IF NOT EXISTS sesiones (
  codigo TEXT PRIMARY KEY,
  laboratorio TEXT NOT NULL,
  modo TEXT NOT NULL,
  nivel TEXT NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  grupo TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'abierta',
  creada TEXT NOT NULL,
  cerrada TEXT
);
CREATE TABLE IF NOT EXISTS equipos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion TEXT NOT NULL REFERENCES sesiones(codigo) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  creado TEXT NOT NULL,
  latido REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT '{}',
  final TEXT,
  origen TEXT NOT NULL DEFAULT 'en-linea',
  UNIQUE (sesion, nombre)
);
CREATE TABLE IF NOT EXISTS integrantes (
  equipo INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  autorizado TEXT NOT NULL,
  PRIMARY KEY (equipo, codigo)
);
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipo INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  t REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  puntos INTEGER NOT NULL DEFAULT 0,
  rol TEXT NOT NULL DEFAULT '',
  recibido TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_eventos_equipo ON eventos(equipo, id);
CREATE TABLE IF NOT EXISTS comandos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion TEXT NOT NULL REFERENCES sesiones(codigo) ON DELETE CASCADE,
  equipo INTEGER,
  cmd TEXT NOT NULL,
  arg TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_comandos_sesion ON comandos(sesion, id);
"""


def conectar() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def inicializar() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    for intento in range(40):
        conn = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
        try:
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(ESQUEMA)
            return
        except sqlite3.OperationalError as error:
            if "locked" not in str(error).lower() or intento == 39:
                raise
            time.sleep(0.25)
        finally:
            conn.close()


def purgar(conn: sqlite3.Connection) -> None:
    limite = (datetime.now(timezone.utc) - timedelta(days=RETENCION_DIAS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute("DELETE FROM sesiones WHERE creada < ?", (limite,))


inicializar()

# ---------------------------------------------------------------- límite de uso
_ventanas: dict[str, deque] = defaultdict(deque)
_candado = threading.Lock()


def excede_limite(clave: str, limite: int = LIMITE) -> bool:
    t = time.monotonic()
    with _candado:
        cola = _ventanas[clave]
        while cola and t - cola[0] > 60:
            cola.popleft()
        if len(cola) >= limite:
            return True
        cola.append(t)
        if len(_ventanas) > 50_000:
            _ventanas.clear()
        return False


def cliente() -> str:
    if CONFIAR_PROXY:
        reenviado = request.headers.get("X-Forwarded-For", "")
        if reenviado:
            return reenviado.split(",")[0].strip()
    return request.remote_addr or "desconocido"


# ---------------------------------------------------------------- cabeceras y errores
@app.after_request
def cabeceras(resp):
    origen = request.headers.get("Origin", "").rstrip("/")
    if origen and ("*" in ORIGENES or origen in ORIGENES):
        resp.headers["Access-Control-Allow-Origin"] = "*" if "*" in ORIGENES else origen
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Token-Docente, X-Token-Equipo"
        resp.headers["Access-Control-Max-Age"] = "86400"
        resp.headers["Vary"] = "Origin"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return resp


@app.before_request
def preflight():
    if request.method == "OPTIONS":
        return ("", 204)


def error(mensaje: str, codigo: int):
    return jsonify({"error": mensaje}), codigo


@app.errorhandler(413)
def demasiado_grande(_):
    return error("solicitud demasiado grande", 413)


def es_docente() -> bool:
    if not TOKEN_DOCENTE:
        return False
    recibido = request.headers.get("X-Token-Docente", "")
    return hmac.compare_digest(recibido.encode(), TOKEN_DOCENTE.encode())


def exigir_docente():
    if not TOKEN_DOCENTE:
        return error("el servicio no tiene TOKEN_DOCENTE configurado", 503)
    if excede_limite("docente:" + cliente(), 240):
        return error("demasiadas solicitudes", 429)
    if not es_docente():
        return error("clave de docente inválida", 401)
    return None


def cuerpo() -> dict:
    datos = request.get_json(silent=True)
    return datos if isinstance(datos, dict) else {}


def texto(valor, maximo: int) -> str:
    return re.sub(r"\s+", " ", str(valor or "")).strip()[:maximo]


def sesion_o_404(conn, codigo: str):
    codigo = codigo.upper()
    if not PATRON_CODIGO.match(codigo):
        return None
    return conn.execute("SELECT * FROM sesiones WHERE codigo = ?", (codigo,)).fetchone()


def nuevo_codigo(conn) -> str:
    for _ in range(200):
        codigo = "BIC-" + "".join(secrets.choice(ALFABETO) for _ in range(3))
        if not conn.execute("SELECT 1 FROM sesiones WHERE codigo = ?", (codigo,)).fetchone():
            return codigo
    raise RuntimeError("no hay códigos libres")


def sesion_publica(s) -> dict:
    return {
        "codigo": s["codigo"], "laboratorio": s["laboratorio"], "modo": s["modo"], "nivel": s["nivel"],
        "titulo": s["titulo"], "grupo": s["grupo"], "estado": s["estado"], "creada": s["creada"],
        "cerrada": s["cerrada"],
    }


# ---------------------------------------------------------------- rutas
@app.get("/healthz")
def salud():
    with conectar() as conn:
        conn.execute("SELECT 1")
    return jsonify({"estado": "ok"})


@app.post("/api/sesiones")
def crear_sesion():
    if (r := exigir_docente()):
        return r
    d = cuerpo()
    lab = d.get("laboratorio")
    if lab not in LABORATORIOS:
        return error("laboratorio no válido", 400)
    conf = LABORATORIOS[lab]
    modo = d.get("modo") or sorted(conf["modos"])[0]
    nivel = d.get("nivel") or "pre"
    if modo not in conf["modos"] or nivel not in conf["niveles"]:
        return error("modo o nivel no válido", 400)
    with conectar() as conn:
        purgar(conn)
        codigo = nuevo_codigo(conn)
        conn.execute(
            "INSERT INTO sesiones (codigo, laboratorio, modo, nivel, titulo, grupo, creada) VALUES (?,?,?,?,?,?,?)",
            (codigo, lab, modo, nivel, texto(d.get("titulo"), 80), texto(d.get("grupo"), 60), ahora()),
        )
        s = conn.execute("SELECT * FROM sesiones WHERE codigo = ?", (codigo,)).fetchone()
    return jsonify(sesion_publica(s)), 201


@app.get("/api/sesiones")
def historico():
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        purgar(conn)
        sesiones = conn.execute("SELECT * FROM sesiones ORDER BY creada DESC LIMIT 300").fetchall()
        salida = []
        for s in sesiones:
            equipos = conn.execute("SELECT id, estado, final FROM equipos WHERE sesion = ?", (s["codigo"],)).fetchall()
            n_est = conn.execute(
                "SELECT COUNT(*) FROM integrantes i JOIN equipos e ON e.id = i.equipo WHERE e.sesion = ?",
                (s["codigo"],),
            ).fetchone()[0]
            puntajes, insignias = [], 0
            for e in equipos:
                fin = json.loads(e["final"]) if e["final"] else None
                est = json.loads(e["estado"] or "{}")
                p = (fin or est).get("puntaje")
                if isinstance(p, (int, float)):
                    puntajes.append(p)
                if fin and fin.get("insignia"):
                    insignias += 1
            salida.append({
                **sesion_publica(s),
                "equipos": len(equipos),
                "estudiantes": n_est,
                "promedio": round(sum(puntajes) / len(puntajes)) if puntajes else None,
                "maximo": max(puntajes) if puntajes else None,
                "insignias": insignias,
            })
    return jsonify({"sesiones": salida})


@app.get("/api/sesiones/<codigo>/publica")
def publica(codigo: str):
    if excede_limite("publica:" + cliente(), 60):
        return error("demasiadas solicitudes", 429)
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
    if not s:
        return error("no existe una sesión con ese código", 404)
    return jsonify(sesion_publica(s))


@app.post("/api/sesiones/<codigo>/equipos")
def unirse(codigo: str):
    if excede_limite("unirse:" + cliente(), 30):
        return error("demasiadas solicitudes", 429)
    d = cuerpo()
    nombre = texto(d.get("nombre"), 24)
    if len(nombre) < 2:
        return error("escribe el nombre del equipo", 400)
    integrantes = []
    for c in d.get("integrantes") or []:
        c = texto(c, 20).upper()
        if c and c not in integrantes:
            if not PATRON_ESTUDIANTE.match(c):
                return error(f"código de estudiante no válido: {c}", 400)
            integrantes.append(c)
    if not integrantes:
        return error("escribe al menos un código de estudiante", 400)
    if len(integrantes) > MAX_INTEGRANTES:
        return error(f"máximo {MAX_INTEGRANTES} integrantes por equipo", 400)
    if d.get("consentimiento") is not True:
        return error("falta la autorización de tratamiento de datos", 400)
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        if s["estado"] != "abierta":
            return error("la sesión ya fue cerrada por el docente", 410)
        if d.get("laboratorio") and d.get("laboratorio") != s["laboratorio"]:
            return error("ese código es de otro laboratorio", 409)
        if conn.execute("SELECT 1 FROM equipos WHERE sesion = ? AND nombre = ?", (s["codigo"], nombre)).fetchone():
            return error("ya hay un equipo con ese nombre en la sesión", 409)
        token = secrets.token_urlsafe(24)
        cur = conn.execute(
            "INSERT INTO equipos (sesion, nombre, token, creado, latido) VALUES (?,?,?,?,?)",
            (s["codigo"], nombre, token, ahora(), time.time()),
        )
        eq = cur.lastrowid
        marca = ahora()
        conn.executemany(
            "INSERT INTO integrantes (equipo, codigo, autorizado) VALUES (?,?,?)",
            [(eq, c, marca) for c in integrantes],
        )
        ultimo = conn.execute("SELECT COALESCE(MAX(id),0) FROM comandos WHERE sesion = ?", (s["codigo"],)).fetchone()[0]
    return jsonify({"equipo": eq, "token": token, "sesion": sesion_publica(s), "desde": ultimo}), 201


def equipo_por_token(conn, codigo: str):
    token = request.headers.get("X-Token-Equipo", "")
    if not token:
        return None
    return conn.execute(
        "SELECT e.*, s.estado AS estado_sesion, s.laboratorio FROM equipos e JOIN sesiones s ON s.codigo = e.sesion"
        " WHERE e.token = ? AND e.sesion = ?",
        (token, codigo.upper()),
    ).fetchone()


@app.post("/api/sesiones/<codigo>/telemetria")
def telemetria(codigo: str):
    with conectar() as conn:
        eq = equipo_por_token(conn, codigo)
        if not eq:
            return error("equipo no reconocido", 401)
        if excede_limite(f"tele:{eq['id']}"):
            return error("demasiadas solicitudes", 429)
        d = cuerpo()
        estado = d.get("estado")
        if isinstance(estado, dict):
            crudo = json.dumps(estado, ensure_ascii=False)
            if len(crudo.encode()) <= MAX_ESTADO:
                conn.execute("UPDATE equipos SET estado = ? WHERE id = ?", (crudo, eq["id"]))
        conn.execute("UPDATE equipos SET latido = ? WHERE id = ?", (time.time(), eq["id"]))
        eventos = d.get("eventos") or []
        if isinstance(eventos, list):
            filas = []
            for ev in eventos[:MAX_EVENTOS_LOTE]:
                if not isinstance(ev, dict):
                    continue
                try:
                    t = float(ev.get("t") or 0)
                    pts = int(ev.get("puntos") or 0)
                except (TypeError, ValueError):
                    continue
                filas.append((eq["id"], t, texto(ev.get("tipo"), 24) or "nota", texto(ev.get("detalle"), 240),
                              max(-1000, min(1000, pts)), texto(ev.get("rol"), 24), ahora()))
            conn.executemany(
                "INSERT INTO eventos (equipo, t, tipo, detalle, puntos, rol, recibido) VALUES (?,?,?,?,?,?,?)", filas
            )
        final = d.get("final")
        if isinstance(final, dict):
            crudo = json.dumps(final, ensure_ascii=False)
            if len(crudo.encode()) <= MAX_ESTADO:
                conn.execute("UPDATE equipos SET final = ? WHERE id = ?", (crudo, eq["id"]))
        try:
            desde = int(d.get("desde") or 0)
        except (TypeError, ValueError):
            desde = 0
        cmds = conn.execute(
            "SELECT id, cmd, arg FROM comandos WHERE sesion = ? AND id > ? AND (equipo IS NULL OR equipo = ?) ORDER BY id",
            (eq["sesion"], desde, eq["id"]),
        ).fetchall()
    return jsonify({
        "comandos": [dict(c) for c in cmds],
        "sesion": eq["estado_sesion"],
    })


def resumen_equipos(conn, codigo: str, eventos_por_equipo: int = 12) -> list[dict]:
    salida = []
    for e in conn.execute("SELECT * FROM equipos WHERE sesion = ? ORDER BY id", (codigo,)).fetchall():
        integrantes = [r["codigo"] for r in conn.execute("SELECT codigo FROM integrantes WHERE equipo = ? ORDER BY codigo", (e["id"],))]
        recientes = [dict(r) for r in conn.execute(
            "SELECT id, t, tipo, detalle, puntos, rol, recibido FROM eventos WHERE equipo = ? ORDER BY id DESC LIMIT ?",
            (e["id"], eventos_por_equipo),
        )]
        conteo = conn.execute(
            "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN puntos < 0 THEN 1 ELSE 0 END),0) AS errores,"
            " COALESCE(SUM(CASE WHEN tipo = 'accion' THEN 1 ELSE 0 END),0) AS acciones FROM eventos WHERE equipo = ?",
            (e["id"],),
        ).fetchone()
        salida.append({
            "id": e["id"], "nombre": e["nombre"], "integrantes": integrantes,
            "segundos_sin_senal": round(time.time() - e["latido"], 1) if e["latido"] else None,
            "estado": json.loads(e["estado"] or "{}"),
            "final": json.loads(e["final"]) if e["final"] else None,
            "origen": e["origen"],
            "eventos": recientes, "total_eventos": conteo["n"], "errores": conteo["errores"], "acciones": conteo["acciones"],
        })
    return salida


@app.get("/api/sesiones/<codigo>/tablero")
def tablero(codigo: str):
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        equipos = resumen_equipos(conn, s["codigo"])
        cmds = [dict(c) for c in conn.execute(
            "SELECT id, equipo, cmd, arg, creado FROM comandos WHERE sesion = ? ORDER BY id DESC LIMIT 20", (s["codigo"],))]
    return jsonify({"sesion": sesion_publica(s), "equipos": equipos, "comandos": cmds, "servidor": time.time()})


@app.post("/api/sesiones/<codigo>/comandos")
def comando(codigo: str):
    if (r := exigir_docente()):
        return r
    d = cuerpo()
    cmd = d.get("cmd")
    if cmd not in COMANDOS:
        return error("comando no válido", 400)
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        if s["estado"] != "abierta":
            return error("la sesión está cerrada", 410)
        arg = texto(d.get("arg"), 200)
        if cmd == "evento" and arg not in LABORATORIOS[s["laboratorio"]]["eventos"]:
            return error("evento no válido para este laboratorio", 400)
        if cmd == "mensaje" and not arg:
            return error("escribe el mensaje", 400)
        equipo = d.get("equipo")
        if equipo is not None:
            if not conn.execute("SELECT 1 FROM equipos WHERE id = ? AND sesion = ?", (equipo, s["codigo"])).fetchone():
                return error("equipo no encontrado", 404)
        cur = conn.execute(
            "INSERT INTO comandos (sesion, equipo, cmd, arg, creado) VALUES (?,?,?,?,?)",
            (s["codigo"], equipo, cmd, arg, ahora()),
        )
    return jsonify({"id": cur.lastrowid}), 201


@app.post("/api/sesiones/<codigo>/cerrar")
def cerrar(codigo: str):
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        if s["estado"] == "abierta":
            conn.execute("UPDATE sesiones SET estado = 'cerrada', cerrada = ? WHERE codigo = ?", (ahora(), s["codigo"]))
        s = conn.execute("SELECT * FROM sesiones WHERE codigo = ?", (s["codigo"],)).fetchone()
    return jsonify(sesion_publica(s))


def construir_reporte(conn, s) -> dict:
    equipos = resumen_equipos(conn, s["codigo"], eventos_por_equipo=0)
    errores, aciertos = Counter(), Counter()
    for e in equipos:
        filas = conn.execute(
            "SELECT t, tipo, detalle, puntos, rol FROM eventos WHERE equipo = ? ORDER BY id", (e["id"],)
        ).fetchall()
        e["linea_de_tiempo"] = [dict(f) for f in filas]
        for f in filas:
            # agrupa variantes del mismo error: «cama 2», «en 14 s», «(45 s)», «12 s fuera…»
            clave = re.sub(r"\b([Cc]ama) \d+\b", r"\1 N", f["detalle"])
            clave = re.sub(r"\b\d+(?:[.,]\d+)? ?(s|min|%)(?=\W|$)", r"N \1", clave)[:120]
            if f["puntos"] < 0:
                errores[clave] += 1
            elif f["puntos"] > 0:
                aciertos[clave] += 1
    return {
        "sesion": sesion_publica(s),
        "equipos": equipos,
        "errores_frecuentes": [{"detalle": k, "veces": v} for k, v in errores.most_common(10)],
        "aciertos_frecuentes": [{"detalle": k, "veces": v} for k, v in aciertos.most_common(10)],
        "generado": ahora(),
    }


@app.get("/api/sesiones/<codigo>/reporte")
def reporte(codigo: str):
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        return jsonify(construir_reporte(conn, s))


@app.get("/api/sesiones/<codigo>/reporte.csv")
def reporte_csv(codigo: str):
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        rep = construir_reporte(conn, s)
    salida = io.StringIO()
    w = csv.writer(salida, delimiter=";")
    w.writerow(["sesion", "laboratorio", "modo", "nivel", "grupo", "fecha", "equipo", "codigo_estudiante",
                "puntaje_final", "insignia", "resultado", "acciones", "errores", "origen"])
    for e in rep["equipos"]:
        fin = e["final"] or {}
        puntaje = fin.get("puntaje", e["estado"].get("puntaje", ""))
        for c in e["integrantes"] or [""]:
            w.writerow([s["codigo"], s["laboratorio"], s["modo"], s["nivel"], s["grupo"], s["creada"], e["nombre"], c,
                        puntaje, "sí" if fin.get("insignia") else "no", fin.get("resultado", "en curso"),
                        e["acciones"], e["errores"], e["origen"]])
    datos = "﻿" + salida.getvalue()
    return Response(datos, mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="reporte-{s["codigo"]}.csv"'})


@app.post("/api/sesiones/<codigo>/importar")
def importar(codigo: str):
    """Registra resultados que los equipos entregaron como código o QR porque no tenían red."""
    if (r := exigir_docente()):
        return r
    d = cuerpo()
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        res = d.get("resultado")
        if not isinstance(res, dict) or res.get("lab") != s["laboratorio"]:
            return error("el resultado no corresponde al laboratorio de la sesión", 400)
        nombre = texto(res.get("equipo"), 24)
        integrantes = [texto(c, 20).upper() for c in res.get("integrantes") or [] if PATRON_ESTUDIANTE.match(texto(c, 20))][:MAX_INTEGRANTES]
        if len(nombre) < 2:
            return error("el resultado no trae nombre de equipo", 400)
        if not res.get("autorizado") and integrantes:
            return error("el resultado no trae la autorización de tratamiento de datos", 400)
        fila = conn.execute("SELECT id FROM equipos WHERE sesion = ? AND nombre = ?", (s["codigo"], nombre)).fetchone()
        final = {k: res.get(k) for k in ("puntaje", "insignia", "resultado", "metricas", "t") if k in res}
        crudo = json.dumps(final, ensure_ascii=False)[:MAX_ESTADO]
        if fila:
            eq = fila["id"]
            conn.execute("UPDATE equipos SET final = ? WHERE id = ?", (crudo, eq))
        else:
            cur = conn.execute(
                "INSERT INTO equipos (sesion, nombre, token, creado, final, origen) VALUES (?,?,?,?,?, 'codigo-resultado')",
                (s["codigo"], nombre, secrets.token_urlsafe(24), ahora(), crudo),
            )
            eq = cur.lastrowid
            marca = ahora()
            conn.executemany("INSERT OR IGNORE INTO integrantes (equipo, codigo, autorizado) VALUES (?,?,?)",
                             [(eq, c, marca) for c in integrantes])
        for ev in (res.get("errores") or [])[:20]:
            conn.execute("INSERT INTO eventos (equipo, t, tipo, detalle, puntos, recibido) VALUES (?,?,?,?,?,?)",
                         (eq, 0, "error", texto(ev[0] if isinstance(ev, list) else ev, 240),
                          int(ev[1]) if isinstance(ev, list) and len(ev) > 1 and isinstance(ev[1], int) else -1, ahora()))
    return jsonify({"equipo": eq}), 201


@app.delete("/api/sesiones/<codigo>")
def borrar(codigo: str):
    if (r := exigir_docente()):
        return r
    with conectar() as conn:
        s = sesion_o_404(conn, codigo)
        if not s:
            return error("no existe una sesión con ese código", 404)
        conn.execute("DELETE FROM sesiones WHERE codigo = ?", (s["codigo"],))
    return jsonify({"borrada": s["codigo"]})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5070")), debug=False)
