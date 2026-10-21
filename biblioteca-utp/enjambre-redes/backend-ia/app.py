"""
Servicio de IA del Enjambre de Redes Sociales · Biblioteca Jorge Roa Martínez (UTP)
==================================================================================

Recibe la instrucción que arma cada bot del Enjambre (publicado en GitHub Pages)
y la envía a la API de Gemini (Google). La clave de la API vive solo en el
servidor: nunca llega al navegador. Pensado para que el CRIE lo aloje en un
servidor de la UTP.

Qué guarda: nada. No escribe en disco las instrucciones ni las respuestas, y no
registra su contenido en los logs.

Endpoints
---------
  GET  /healthz          -> {"estado": "ok", "modelo": "...", "clave": true|false}
  POST /api/generar      <- {"prompt": "..."}
                         -> {"texto": "...", "modelo": "..."}

Variables de entorno (ver .env.example)
---------------------------------------
  GEMINI_API_KEY         Clave de la API de Gemini (Google AI Studio o la del proyecto
                         de Google Cloud de la UTP). Obligatoria para generar.
  GEMINI_MODELO          Modelo de Gemini (por defecto: gemini-2.5-flash). Verifique en
                         Google AI Studio que el modelo siga disponible.
  GEMINI_API_BASE        Base de la API (por defecto: https://generativelanguage.googleapis.com/v1beta)
  ORIGENES_PERMITIDOS    Orígenes del navegador autorizados (CORS), separados por coma.
                         Por defecto: https://mauriciocantor-rgb.github.io
  LIMITE_POR_MINUTO      Máximo de solicitudes por cliente en 60 s (por defecto 10).
  MAX_CARACTERES         Tamaño máximo de la instrucción (por defecto 60000).
  TIEMPO_MAXIMO          Segundos de espera de la respuesta de Gemini (por defecto 120).
  CONFIAR_PROXY          "1" si el servicio está detrás de nginx/Apache que envía X-Forwarded-For.
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque

from flask import Flask, jsonify, request

CLAVE = os.environ.get("GEMINI_API_KEY", "").strip()
MODELO = os.environ.get("GEMINI_MODELO", "gemini-2.5-flash").strip()
API_BASE = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")
ORIGENES = {
    o.strip().rstrip("/")
    for o in os.environ.get("ORIGENES_PERMITIDOS", "https://mauriciocantor-rgb.github.io").split(",")
    if o.strip()
}
LIMITE = int(os.environ.get("LIMITE_POR_MINUTO", "10"))
MAX_CARACTERES = int(os.environ.get("MAX_CARACTERES", "60000"))
TIEMPO_MAXIMO = int(os.environ.get("TIEMPO_MAXIMO", "120"))
CONFIAR_PROXY = os.environ.get("CONFIAR_PROXY", "0") == "1"

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.config["MAX_CONTENT_LENGTH"] = MAX_CARACTERES * 4 + 1024


class ErrorGemini(Exception):
    def __init__(self, estado: int, mensaje: str):
        super().__init__(mensaje)
        self.estado = estado
        self.mensaje = mensaje


# ---------------------------------------------------------------- límite de uso
_ventanas: dict[str, deque] = defaultdict(deque)
_candado = threading.Lock()


def cliente() -> str:
    if CONFIAR_PROXY:
        reenviado = request.headers.get("X-Forwarded-For", "")
        if reenviado:
            return reenviado.split(",")[0].strip()
    return request.remote_addr or "desconocido"


def excede_limite() -> bool:
    """Ventana deslizante de 60 s en memoria (por proceso). No se guarda nada en disco."""
    ahora = time.monotonic()
    with _candado:
        cola = _ventanas[cliente()]
        while cola and ahora - cola[0] > 60:
            cola.popleft()
        if len(cola) >= LIMITE:
            return True
        cola.append(ahora)
        if len(_ventanas) > 50_000:
            _ventanas.clear()
        return False


# ---------------------------------------------------------------- Gemini
def llamar_gemini(prompt: str) -> str:
    """Llama a generateContent de la API de Gemini y devuelve el texto de la respuesta."""
    url = f"{API_BASE}/models/{MODELO}:generateContent"
    cuerpo = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=cuerpo, method="POST", headers={
        "Content-Type": "application/json",
        "x-goog-api-key": CLAVE,
    })
    try:
        with urllib.request.urlopen(req, timeout=TIEMPO_MAXIMO) as resp:
            datos = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code == 429:
            raise ErrorGemini(429, "Gemini alcanzó su límite de uso. Inténtelo en unos minutos.")
        if error.code in (400, 404):
            raise ErrorGemini(502, "Gemini rechazó la solicitud. Revise el modelo configurado en el servidor.")
        if error.code in (401, 403):
            raise ErrorGemini(503, "La clave de la API de Gemini no es válida o no tiene permisos.")
        raise ErrorGemini(502, "Gemini no respondió correctamente.")
    except (urllib.error.URLError, TimeoutError):
        raise ErrorGemini(502, "No se pudo conectar con Gemini.")

    candidatos = datos.get("candidates") or []
    if not candidatos:
        motivo = (datos.get("promptFeedback") or {}).get("blockReason")
        raise ErrorGemini(422 if motivo else 502, "Gemini no generó contenido para esta solicitud." if motivo else "Gemini devolvió una respuesta vacía.")
    partes = (candidatos[0].get("content") or {}).get("parts") or []
    texto = "".join(p.get("text", "") for p in partes if isinstance(p, dict)).strip()
    if not texto:
        raise ErrorGemini(422, "Gemini no generó contenido para esta solicitud.")
    return texto


# ---------------------------------------------------------------- cabeceras
@app.after_request
def cabeceras(resp):
    origen = request.headers.get("Origin", "").rstrip("/")
    if origen and ("*" in ORIGENES or origen in ORIGENES):
        resp.headers["Access-Control-Allow-Origin"] = "*" if "*" in ORIGENES else origen
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Max-Age"] = "86400"
        resp.headers["Vary"] = "Origin"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return resp


# ---------------------------------------------------------------- rutas
@app.get("/healthz")
def salud():
    return jsonify({"estado": "ok", "modelo": MODELO, "clave": bool(CLAVE)})


@app.route("/api/generar", methods=["POST", "OPTIONS"])
def generar():
    if request.method == "OPTIONS":
        return ("", 204)
    origen = request.headers.get("Origin", "").rstrip("/")
    if origen and "*" not in ORIGENES and origen not in ORIGENES:
        return jsonify({"error": "origen no autorizado"}), 403
    if not CLAVE:
        return jsonify({"error": "el servicio no tiene configurada la clave de Gemini"}), 503
    datos = request.get_json(silent=True) or {}
    prompt = datos.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({"error": "falta la instrucción"}), 400
    if len(prompt) > MAX_CARACTERES:
        return jsonify({"error": "la instrucción es demasiado larga"}), 413
    if excede_limite():
        return jsonify({"error": "demasiadas solicitudes; espere un minuto"}), 429
    try:
        texto = llamar_gemini(prompt)
    except ErrorGemini as error:
        return jsonify({"error": error.mensaje}), error.estado
    return jsonify({"texto": texto, "modelo": MODELO})


@app.errorhandler(413)
def demasiado_grande(_):
    return jsonify({"error": "la instrucción es demasiado larga"}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PUERTO", "8020")))
