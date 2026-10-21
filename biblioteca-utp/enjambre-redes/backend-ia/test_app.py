"""Pruebas del servicio de IA del Enjambre.  Ejecutar:  python -m pytest -q"""
import importlib
import os
import sys
from pathlib import Path

ORIGEN = "https://mauriciocantor-rgb.github.io"


def cargar(clave="clave-de-prueba", limite="10"):
    os.environ["GEMINI_API_KEY"] = clave
    os.environ["ORIGENES_PERMITIDOS"] = ORIGEN
    os.environ["LIMITE_POR_MINUTO"] = limite
    sys.path.insert(0, str(Path(__file__).parent))
    import app as modulo
    importlib.reload(modulo)
    return modulo


def test_salud():
    m = cargar()
    r = m.app.test_client().get("/healthz")
    assert r.status_code == 200 and r.get_json()["clave"] is True


def test_genera_con_gemini(monkeypatch):
    m = cargar()
    monkeypatch.setattr(m, "llamar_gemini", lambda p: "## Respuesta\nHola")
    r = m.app.test_client().post("/api/generar", json={"prompt": "Escribe un copy"}, headers={"Origin": ORIGEN})
    assert r.status_code == 200
    assert r.get_json()["texto"].startswith("## Respuesta")
    assert r.headers["Access-Control-Allow-Origin"] == ORIGEN


def test_sin_clave():
    m = cargar(clave="")
    r = m.app.test_client().post("/api/generar", json={"prompt": "x"})
    assert r.status_code == 503


def test_origen_no_autorizado():
    m = cargar()
    r = m.app.test_client().post("/api/generar", json={"prompt": "x"}, headers={"Origin": "https://otro.sitio"})
    assert r.status_code == 403


def test_validaciones(monkeypatch):
    m = cargar()
    monkeypatch.setattr(m, "llamar_gemini", lambda p: "ok")
    c = m.app.test_client()
    assert c.post("/api/generar", json={}).status_code == 400
    assert c.post("/api/generar", json={"prompt": "x" * (m.MAX_CARACTERES + 1)}).status_code == 413


def test_limite(monkeypatch):
    m = cargar(limite="2")
    monkeypatch.setattr(m, "llamar_gemini", lambda p: "ok")
    c = m.app.test_client()
    assert c.post("/api/generar", json={"prompt": "a"}).status_code == 200
    assert c.post("/api/generar", json={"prompt": "a"}).status_code == 200
    assert c.post("/api/generar", json={"prompt": "a"}).status_code == 429


def test_error_de_gemini(monkeypatch):
    m = cargar()
    def falla(p):
        raise m.ErrorGemini(502, "Gemini no respondió correctamente.")
    monkeypatch.setattr(m, "llamar_gemini", falla)
    r = m.app.test_client().post("/api/generar", json={"prompt": "a"})
    assert r.status_code == 502 and "Gemini" in r.get_json()["error"]


def test_lectura_de_respuesta(monkeypatch):
    m = cargar()
    import io, json
    class Resp(io.BytesIO):
        def __enter__(self): return self
        def __exit__(self, *a): return False
    datos = {"candidates": [{"content": {"parts": [{"text": "Parte 1 "}, {"text": "parte 2"}]}}]}
    monkeypatch.setattr(m.urllib.request, "urlopen", lambda req, timeout: Resp(json.dumps(datos).encode()))
    assert m.llamar_gemini("hola") == "Parte 1 parte 2"
