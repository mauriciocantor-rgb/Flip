"""Pruebas del servicio del Panel docente.  Ejecutar:  python -m pytest -q"""
import importlib
import os
import sys
from pathlib import Path

DOC = {"X-Token-Docente": "clave-de-prueba"}


def cargar(tmp_path, token="clave-de-prueba"):
    os.environ["PANEL_DB"] = str(tmp_path / "panel.db")
    os.environ["TOKEN_DOCENTE"] = token
    os.environ["ORIGENES_PERMITIDOS"] = "https://mauriciocantor-rgb.github.io"
    sys.path.insert(0, str(Path(__file__).parent))
    import app as modulo
    importlib.reload(modulo)
    return modulo.app.test_client()


def crear(c, lab="grid-masters", modo="juego"):
    r = c.post("/api/sesiones", json={"laboratorio": lab, "modo": modo, "nivel": "pre", "titulo": "Taller", "grupo": "IE-01"}, headers=DOC)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["codigo"]


def unir(c, codigo, nombre="Los Voltios", lab="grid-masters", integrantes=("1088123456", "1088654321")):
    r = c.post(f"/api/sesiones/{codigo}/equipos", json={"nombre": nombre, "integrantes": list(integrantes), "consentimiento": True, "laboratorio": lab})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def test_docente_requiere_clave(tmp_path):
    c = cargar(tmp_path)
    assert c.post("/api/sesiones", json={"laboratorio": "grid-masters"}).status_code == 401
    assert c.get("/api/sesiones", headers={"X-Token-Docente": "otra"}).status_code == 401


def test_sin_token_configurado_responde_503(tmp_path):
    c = cargar(tmp_path, token="")
    assert c.get("/api/sesiones", headers=DOC).status_code == 503


def test_flujo_completo(tmp_path):
    c = cargar(tmp_path)
    codigo = crear(c)
    assert c.get(f"/api/sesiones/{codigo}/publica").get_json()["laboratorio"] == "grid-masters"
    eq = unir(c, codigo)
    T = {"X-Token-Equipo": eq["token"]}
    # telemetría
    r = c.post(f"/api/sesiones/{codigo}/telemetria", headers=T, json={
        "estado": {"puntaje": 950, "t": 95, "jugando": True},
        "eventos": [{"t": 92, "tipo": "accion", "detalle": "Planta: arranque de U4", "rol": "Planta"},
                    {"t": 93, "tipo": "puntos", "detalle": "Actuó una etapa del EDAC", "puntos": -50}]})
    assert r.status_code == 200 and r.get_json()["comandos"] == []
    # comando a todos y a un equipo
    assert c.post(f"/api/sesiones/{codigo}/comandos", headers=DOC, json={"cmd": "evento", "arg": "L3"}).status_code == 201
    assert c.post(f"/api/sesiones/{codigo}/comandos", headers=DOC, json={"cmd": "evento", "arg": "worse"}).status_code == 400
    assert c.post(f"/api/sesiones/{codigo}/comandos", headers=DOC, json={"cmd": "mensaje", "arg": "¡Un minuto!", "equipo": eq["equipo"]}).status_code == 201
    cmds = c.post(f"/api/sesiones/{codigo}/telemetria", headers=T, json={"desde": eq["desde"]}).get_json()["comandos"]
    assert [x["cmd"] for x in cmds] == ["evento", "mensaje"]
    # tablero
    tb = c.get(f"/api/sesiones/{codigo}/tablero", headers=DOC).get_json()
    e = tb["equipos"][0]
    assert e["nombre"] == "Los Voltios" and e["integrantes"] == ["1088123456", "1088654321"]
    assert e["estado"]["puntaje"] == 950 and e["errores"] == 1 and e["acciones"] == 1
    # final y reporte
    c.post(f"/api/sesiones/{codigo}/telemetria", headers=T, json={"final": {"puntaje": 910, "insignia": True, "resultado": "sin apagón"}})
    rep = c.get(f"/api/sesiones/{codigo}/reporte", headers=DOC).get_json()
    assert rep["errores_frecuentes"][0]["detalle"].startswith("Actuó una etapa")
    csv = c.get(f"/api/sesiones/{codigo}/reporte.csv", headers=DOC).get_data(as_text=True)
    assert "1088654321" in csv and "910" in csv
    # histórico
    h = c.get("/api/sesiones", headers=DOC).get_json()["sesiones"][0]
    assert h["equipos"] == 1 and h["estudiantes"] == 2 and h["promedio"] == 910 and h["insignias"] == 1
    # cierre
    c.post(f"/api/sesiones/{codigo}/cerrar", headers=DOC)
    r = c.post(f"/api/sesiones/{codigo}/equipos", json={"nombre": "Tarde", "integrantes": ["123456"], "consentimiento": True})
    assert r.status_code == 410


def test_validaciones_al_unirse(tmp_path):
    c = cargar(tmp_path)
    codigo = crear(c)
    base = {"nombre": "Equipo A", "integrantes": ["1088123456"], "consentimiento": True}
    assert c.post(f"/api/sesiones/{codigo}/equipos", json={**base, "consentimiento": False}).status_code == 400
    assert c.post(f"/api/sesiones/{codigo}/equipos", json={**base, "integrantes": []}).status_code == 400
    assert c.post(f"/api/sesiones/{codigo}/equipos", json={**base, "integrantes": ["<script>"]}).status_code == 400
    assert c.post(f"/api/sesiones/{codigo}/equipos", json={**base, "laboratorio": "turno-urgencias"}).status_code == 409
    assert c.post(f"/api/sesiones/{codigo}/equipos", json=base).status_code == 201
    assert c.post(f"/api/sesiones/{codigo}/equipos", json=base).status_code == 409
    assert c.post("/api/sesiones/BIC-ZZZ/equipos", json=base).status_code == 404


def test_token_de_otra_sesion_no_sirve(tmp_path):
    c = cargar(tmp_path)
    a, b = crear(c), crear(c, "turno-urgencias", "turno")
    eq = unir(c, a)
    r = c.post(f"/api/sesiones/{b}/telemetria", headers={"X-Token-Equipo": eq["token"]}, json={})
    assert r.status_code == 401


def test_importar_resultado_sin_red(tmp_path):
    c = cargar(tmp_path)
    codigo = crear(c, "turno-urgencias", "turno")
    res = {"lab": "turno-urgencias", "equipo": "Sin red", "integrantes": ["1088000111"], "autorizado": True,
           "puntaje": 640, "insignia": True, "resultado": "2 de 2 salvados", "errores": [["Prueba no justificada", -10]]}
    assert c.post(f"/api/sesiones/{codigo}/importar", headers=DOC, json={"resultado": res}).status_code == 201
    tb = c.get(f"/api/sesiones/{codigo}/tablero", headers=DOC).get_json()
    assert tb["equipos"][0]["origen"] == "codigo-resultado" and tb["equipos"][0]["final"]["puntaje"] == 640
    assert c.post(f"/api/sesiones/{codigo}/importar", headers=DOC, json={"resultado": {**res, "lab": "grid-masters"}}).status_code == 400


def test_borrar_sesion_borra_todo(tmp_path):
    c = cargar(tmp_path)
    codigo = crear(c)
    eq = unir(c, codigo)
    c.post(f"/api/sesiones/{codigo}/telemetria", headers={"X-Token-Equipo": eq["token"]}, json={"eventos": [{"tipo": "accion"}]})
    assert c.delete(f"/api/sesiones/{codigo}", headers=DOC).status_code == 200
    import sqlite3
    conn = sqlite3.connect(tmp_path / "panel.db")
    assert conn.execute("SELECT COUNT(*) FROM integrantes").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM eventos").fetchone()[0] == 0


def test_cors(tmp_path):
    c = cargar(tmp_path)
    r = c.options("/api/sesiones", headers={"Origin": "https://mauriciocantor-rgb.github.io"})
    assert r.headers["Access-Control-Allow-Origin"] == "https://mauriciocantor-rgb.github.io"
    assert "X-Token-Docente" in r.headers["Access-Control-Allow-Headers"]
    r = c.options("/api/sesiones", headers={"Origin": "https://otro.sitio"})
    assert "Access-Control-Allow-Origin" not in r.headers
