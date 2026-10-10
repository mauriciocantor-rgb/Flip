"""
API - Ruta Mendeley UTP - Biblioteca UTP
==========================================

Reemplaza las capacidades de Claude Artifacts usadas por la herramienta
original (solo disponibles dentro del sandbox de claude.ai):

  - "db"   -> contador de visualizaciones + registro de sesiones de práctica
  - "user" -> distinguía si quien miraba la herramienta podía editar el
              artefacto, para mostrarle la pestaña "Indicadores" (solo
              personal de la biblioteca). Fuera de claude.ai no existe ese
              concepto, así que se sustituye por un token compartido
              (STAFF_TOKEN) que el personal de la biblioteca introduce una
              vez en el navegador para ver esa pestaña. Es un cambio de
              MECANISMO de control de acceso, no una pérdida de función:
              la pestaña de indicadores sigue existiendo y sigue
              restringida a personal autorizado.
  - "downloads" -> ya no se necesita backend: en el frontend migrado, la
              constancia en PNG se descarga con la técnica estándar de
              navegador (Blob + enlace <a download>), sin pasar por este
              servidor.

Endpoints:
  GET  /healthz           -> {"status": "ok"}
  GET  /api/count         -> {"count": N}            (lee el contador)
  POST /api/count         -> {"count": N}            (incrementa en 1)
  POST /api/sessions      -> guarda/actualiza una sesión de práctica (por sid)
  GET  /api/indicadores?token=XXXX
                           -> {"sessions": [...]}    (requiere STAFF_TOKEN)

Persistencia: SQLite en un único archivo (ver DB_PATH). Ver README.md de
esta carpeta para el detalle sobre persistencia en hosting gratuito.
"""
import json
import os
import sqlite3
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

COUNTER_NAME = "ruta-mendeley"
DB_PATH = Path(os.environ.get("DB_PATH", str(Path(__file__).parent / "ruta_mendeley.db")))
STAFF_TOKEN = os.environ.get("STAFF_TOKEN", "")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
MAX_SESSIONS_RETURNED = 1000

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS counters ("
        "  name TEXT PRIMARY KEY,"
        "  count INTEGER NOT NULL DEFAULT 0"
        ")"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions ("
        "  sid TEXT PRIMARY KEY,"
        "  dia TEXT,"
        "  data TEXT NOT NULL,"
        "  updated_at TEXT NOT NULL"
        ")"
    )
    return conn


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.get("/api/count")
def read_count():
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT count FROM counters WHERE name = ?", (COUNTER_NAME,)
        ).fetchone()
        return jsonify({"count": row[0] if row else 0})
    finally:
        conn.close()


@app.post("/api/count")
def increment_count():
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO counters (name, count) VALUES (?, 1) "
            "ON CONFLICT(name) DO UPDATE SET count = count + 1",
            (COUNTER_NAME,),
        )
        conn.commit()
        row = conn.execute(
            "SELECT count FROM counters WHERE name = ?", (COUNTER_NAME,)
        ).fetchone()
        return jsonify({"count": row[0] if row else 0})
    finally:
        conn.close()


# Campos que la herramienta original guardaba por sesión
# (nivel, perfil, puntaje, mod, fallos, quiz, constancia); se aceptan tal
# cual vengan del frontend, sin inventar ni descartar campos, para no
# alterar qué datos produce la herramienta.
@app.post("/api/sessions")
def save_session():
    body = request.get_json(silent=True) or {}
    sid = body.get("sid")
    if not sid or not isinstance(sid, str):
        return jsonify({"error": "falta 'sid'"}), 400

    payload = {k: v for k, v in body.items() if k != "sid"}
    payload.setdefault("dia", date.today().isoformat())

    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO sessions (sid, dia, data, updated_at) VALUES (?, ?, ?, datetime('now')) "
            "ON CONFLICT(sid) DO UPDATE SET dia = excluded.dia, data = excluded.data, updated_at = datetime('now')",
            (sid, payload.get("dia"), json.dumps(payload, ensure_ascii=False)),
        )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()


@app.get("/api/indicadores")
def indicadores():
    token = request.args.get("token", "")
    if not STAFF_TOKEN or token != STAFF_TOKEN:
        return jsonify({"error": "no autorizado"}), 401

    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT data FROM sessions ORDER BY updated_at DESC LIMIT ?",
            (MAX_SESSIONS_RETURNED,),
        ).fetchall()
        sessions = [json.loads(r[0]) for r in rows]
        return jsonify({"sessions": sessions})
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
