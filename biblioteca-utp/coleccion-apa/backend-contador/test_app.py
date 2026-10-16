"""Pruebas del servicio de contador.  Ejecutar:  python -m pytest -q"""
import importlib
import os
import sys
from pathlib import Path


def cargar_app(tmp_path, **entorno):
    os.environ["CONTADOR_DB"] = str(tmp_path / "prueba.db")
    os.environ["ORIGENES_PERMITIDOS"] = "https://mauriciocantor-rgb.github.io"
    os.environ["LIMITE_POR_MINUTO"] = entorno.get("limite", "20")
    sys.path.insert(0, str(Path(__file__).parent))
    import app as modulo
    importlib.reload(modulo)
    return modulo.app.test_client()


def test_semilla_y_lectura(tmp_path):
    c = cargar_app(tmp_path)
    r = c.get("/api/contadores")
    assert r.status_code == 200
    assert r.get_json()["contadores"]["constructor-citas"] == 39


def test_incremento(tmp_path):
    c = cargar_app(tmp_path)
    assert c.post("/api/contadores/verificador-citas").get_json()["total"] == 4
    assert c.post("/api/contadores/verificador-citas").get_json()["total"] == 5
    assert c.get("/api/contadores/verificador-citas").get_json()["total"] == 5


def test_semilla_no_sobrescribe(tmp_path):
    c = cargar_app(tmp_path)
    c.post("/api/contadores/preguntas-frecuentes")
    c = cargar_app(tmp_path)  # reinicio del servicio con la misma base
    assert c.get("/api/contadores/preguntas-frecuentes").get_json()["total"] == 25


def test_herramienta_desconocida(tmp_path):
    c = cargar_app(tmp_path)
    assert c.post("/api/contadores/otra-cosa").status_code == 404
    assert c.post("/api/contadores/..%2Fx").status_code == 404


def test_cors(tmp_path):
    c = cargar_app(tmp_path)
    ok = c.post("/api/contadores/constructor-citas", headers={"Origin": "https://mauriciocantor-rgb.github.io"})
    assert ok.headers["Access-Control-Allow-Origin"] == "https://mauriciocantor-rgb.github.io"
    ajeno = c.post("/api/contadores/constructor-citas", headers={"Origin": "https://sitio-ajeno.example"})
    assert "Access-Control-Allow-Origin" not in ajeno.headers


def test_limite(tmp_path):
    c = cargar_app(tmp_path, limite="3")
    codigos = [c.post("/api/contadores/infografia-formato").status_code for _ in range(5)]
    assert codigos == [200, 200, 200, 429, 429]
