"""
API de contador de uso - Constructor de citas APA 7 - Biblioteca UTP
======================================================================

Reemplaza la capacidad "db" de Claude Artifacts (que solo funciona dentro
del sandbox de claude.ai) por una API HTTP propia, para que el contador de
visualizaciones sea visible para toda la comunidad académica cuando la
herramienta se aloja fuera de esa plataforma (GitHub Pages, etc.).

Endpoints:
  GET  /healthz    -> {"status": "ok"}                  (verificación de salud)
  GET  /api/count  -> {"count": N}                       (lee el contador sin incrementar)
  POST /api/count  -> {"count": N}                       (incrementa en 1 y devuelve el nuevo total)

Persistencia: SQLite en un único archivo (ver DB_PATH). En planes gratuitos
de hosting (Render, Railway, PythonAnywhere) el disco puede no ser
persistente entre despliegues; ver README.md de esta carpeta para el
detalle y las alternativas (p. ej. un disco persistente de pago, o una
base de datos externa gratuita tipo Supabase/Neon) si se requiere que el
conteo nunca se reinicie.
"""
import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

COUNTER_NAME = "constructor-citas-apa7"
DB_PATH = Path(os.environ.get("DB_PATH", str(Path(__file__).parent / "counter.db")))

# Orígenes permitidos para las peticiones del navegador (CORS). En producción,
# restringir a la URL real donde se publique el frontend (GitHub Pages),
# por ejemplo: "https://mauriciocantor-rgb.github.io". "*" funciona de
# inmediato pero es menos estricto; se documenta la alternativa en el README.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
