"""
Servicio de contador de uso · Colección APA · Biblioteca Jorge Roa Martínez (UTP)
=================================================================================

Un único servicio para todas las herramientas de la colección APA publicadas en
GitHub Pages. Pensado para que el CRIE lo aloje en un servidor de la UTP.

Qué guarda: solo el número de veces que se abre cada herramienta. No guarda
direcciones IP, cookies, nombres ni el texto que escriben las personas.

Endpoints
---------
  GET  /healthz                         -> {"estado": "ok"}
  GET  /api/contadores                  -> {"contadores": {"constructor-citas": 41, ...}}
  GET  /api/contadores/<herramienta>    -> {"herramienta": "...", "total": N}   (solo lectura)
  POST /api/contadores/<herramienta>    -> {"herramienta": "...", "total": N}   (suma 1)

Variables de entorno (ver .env.example)
---------------------------------------
  CONTADOR_DB            Ruta del archivo SQLite (por defecto: ./datos/contador.db)
  ORIGENES_PERMITIDOS    Orígenes del navegador autorizados (CORS), separados por coma.
                         Por defecto: https://mauriciocantor-rgb.github.io
  HERRAMIENTAS_EXTRA     Identificadores adicionales permitidos, separados por coma.
  LIMITE_POR_MINUTO      Máximo de POST por cliente y herramienta en 60 s (por defecto 20).
  CONFIAR_PROXY          "1" si el servicio está detrás de nginx/Apache que envía X-Forwarded-For.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent

# Herramientas que pueden registrar visitas. Un identificador fuera de esta
# lista recibe 404: así nadie puede llenar la base con nombres inventados.
HERRAMIENTAS = {
    "constructor-citas",
    "preguntas-frecuentes",
    "verificador-citas",
    "infografia-formato",
    "infografia-citas",
    "infografia-formato-general",
}
HERRAMIENTAS |= {
    h.strip() for h in os.environ.get("HERRAMIENTAS_EXTRA", "").split(",") if h.strip()
}
PATRON_ID = re.compile(r"^[a-z0-9-]{1,40}$")

DB_PATH = Path(os.environ.get("CONTADOR_DB", str(BASE_DIR / "datos" / "contador.db")))
ORIGENES = {
    o.strip().rstrip("/")
    for o in os.environ.get("ORIGENES_PERMITIDOS", "https://mauriciocantor-rgb.github.io").split(",")
    if o.strip()
}
LIMITE = int(os.environ.get("LIMITE_POR_MINUTO", "20"))
CONFIAR_PROXY = os.environ.get("CONFIAR_PROXY", "0") == "1"
SEMILLA = BASE_DIR / "semilla.json"

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False


# ---------------------------------------------------------------- base de datos
def conectar() -> sqlite3.Connection:
    # El modo WAL queda guardado en el archivo (se fija una vez en inicializar).
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def inicializar() -> None:
    """Crea la tabla y carga los conteos heredados de Claude Artifacts.

    La semilla se aplica con INSERT OR IGNORE: solo la primera vez que existe
    cada herramienta. Nunca sobrescribe un conteo que ya esté en la base.
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    semilla = {}
    if SEMILLA.exists():
        datos = json.loads(SEMILLA.read_text(encoding="utf-8"))
        semilla = {k: int(v) for k, v in datos.get("contadores", {}).items() if k in HERRAMIENTAS}

    # Con varios procesos de gunicorn, todos ejecutan esta función al arrancar.
    # Si otro proceso tiene la base bloqueada en ese instante, se reintenta en
    # lugar de abortar el arranque ("database is locked").
    for intento in range(40):
        conn = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
        try:
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                "CREATE TABLE IF NOT EXISTS contadores ("
                " herramienta TEXT PRIMARY KEY,"
                " total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),"
                " actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))"
                ")"
            )
            for herramienta in sorted(HERRAMIENTAS):
                conn.execute(
                    "INSERT OR IGNORE INTO contadores (herramienta, total) VALUES (?, ?)",
                    (herramienta, max(0, semilla.get(herramienta, 0))),
                )
            conn.execute("COMMIT")
            return
        except sqlite3.OperationalError as error:
            if "locked" not in str(error).lower() or intento == 39:
                raise
            time.sleep(0.25)
        finally:
            conn.close()


inicializar()


# ---------------------------------------------------------------- límite de uso
_ventanas: dict[tuple[str, str], deque] = defaultdict(deque)
_candado = threading.Lock()


def cliente() -> str:
    if CONFIAR_PROXY:
        reenviado = request.headers.get("X-Forwarded-For", "")
        if reenviado:
            return reenviado.split(",")[0].strip()
    return request.remote_addr or "desconocido"


def excede_limite(herramienta: str) -> bool:
    """Ventana deslizante de 60 s en memoria (por proceso). No se guarda nada en disco."""
    ahora = time.monotonic()
    clave = (cliente(), herramienta)
    with _candado:
        cola = _ventanas[clave]
        while cola and ahora - cola[0] > 60:
            cola.popleft()
        if len(cola) >= LIMITE:
            return True
        cola.append(ahora)
        if len(_ventanas) > 50_000:  # evita que la memoria crezca sin control
            _ventanas.clear()
        return False


# ---------------------------------------------------------------- cabeceras
@app.after_request
def cabeceras(resp):
    origen = request.headers.get("Origin", "").rstrip("/")
    if origen and ("*" in ORIGENES or origen in ORIGENES):
        resp.headers["Access-Control-Allow-Origin"] = "*" if "*" in ORIGENES else origen
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "86400"
        resp.headers["Vary"] = "Origin"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return resp


def herramienta_valida(herramienta: str) -> bool:
    return bool(PATRON_ID.match(herramienta)) and herramienta in HERRAMIENTAS


def leer(conn: sqlite3.Connection, herramienta: str) -> int:
    fila = conn.execute("SELECT total FROM contadores WHERE herramienta = ?", (herramienta,)).fetchone()
    return int(fila[0]) if fila else 0


# ---------------------------------------------------------------- rutas
@app.get("/healthz")
def salud():
    with conectar() as conn:
        conn.execute("SELECT 1")
    return jsonify({"estado": "ok"})


@app.get("/api/contadores")
def todos():
    with conectar() as conn:
        filas = conn.execute("SELECT herramienta, total FROM contadores ORDER BY herramienta").fetchall()
    return jsonify({"contadores": {h: int(t) for h, t in filas if h in HERRAMIENTAS}})


@app.route("/api/contadores/<herramienta>", methods=["GET", "POST", "OPTIONS"])
def contador(herramienta: str):
    if not herramienta_valida(herramienta):
        return jsonify({"error": "herramienta no registrada"}), 404
    if request.method == "OPTIONS":
        return ("", 204)
    if request.method == "POST":
        if excede_limite(herramienta):
            return jsonify({"error": "demasiadas solicitudes"}), 429
        with conectar() as conn:
            conn.execute(
                "UPDATE contadores SET total = total + 1,"
                " actualizado = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE herramienta = ?",
                (herramienta,),
            )
            total = leer(conn, herramienta)
    else:
        with conectar() as conn:
            total = leer(conn, herramienta)
    return jsonify({"herramienta": herramienta, "total": total})


@app.errorhandler(404)
def no_encontrado(_):
    return jsonify({"error": "no encontrado"}), 404


@app.errorhandler(405)
def metodo_no_permitido(_):
    return jsonify({"error": "método no permitido"}), 405


if __name__ == "__main__":
    # Solo para pruebas locales. En el servidor se usa gunicorn (ver README.md).
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8000")), debug=False)
