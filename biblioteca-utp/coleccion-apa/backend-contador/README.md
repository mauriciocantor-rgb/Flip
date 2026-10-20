# Servicio de contador · Colección APA (para el CRIE)

Servicio único que registra cuántas veces se abre cada herramienta de la
colección APA de la Biblioteca Jorge Roa Martínez. Las herramientas son
páginas estáticas en GitHub Pages; este servicio es lo único que necesita
servidor, y está pensado para alojarse en la infraestructura de la UTP.

## Qué guarda y qué no

| Guarda | No guarda |
|---|---|
| Identificador de la herramienta y su total de visitas | Direcciones IP, cookies, nombres, correos |
| Fecha de la última visita registrada | El texto que las personas escriben en las herramientas |

El límite de solicitudes por cliente se calcula en memoria y se descarta a
los 60 segundos; no se escribe en disco.

## Requisitos

- Python 3.10 o superior
- Un proxy inverso con HTTPS (nginx o Apache) en un dominio `*.utp.edu.co`
- Escritura en una carpeta de datos para el archivo SQLite

## Instalación (Linux con systemd)

```bash
sudo useradd --system --home /opt/contador-bic contador-bic
sudo mkdir -p /opt/contador-bic /var/lib/contador-bic /etc/contador-bic
sudo cp app.py semilla.json requirements.txt /opt/contador-bic/
cd /opt/contador-bic
sudo python3 -m venv .venv
sudo .venv/bin/pip install -r requirements.txt
sudo cp .env.example /etc/contador-bic/contador.env      # ajustar valores
sudo chown -R contador-bic:contador-bic /var/lib/contador-bic
sudo cp despliegue/contador-bic.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now contador-bic
```

Proxy inverso: `despliegue/nginx-contador-bic.conf` es un ejemplo listo para
ajustar (`server_name` y certificado). Solo expone `/api/contadores` y
`/healthz`.

Verificación:

```bash
curl https://contador-bic.utp.edu.co/healthz
curl https://contador-bic.utp.edu.co/api/contadores
```

## Conectar las herramientas

Cuando el servicio esté en línea, en `coleccion-apa/assets/js/config.js`:

```js
window.BIC_APA_CONFIG = Object.freeze({
  apiContador: "https://contador-bic.utp.edu.co"
});
```

Si el dominio final **no** termina en `.utp.edu.co`, también hay que agregarlo
en la directiva `connect-src` de la política de seguridad (CSP) de cada
`index.html`.

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/healthz` | `{"estado": "ok"}` |
| GET | `/api/contadores` | totales de todas las herramientas |
| GET | `/api/contadores/<herramienta>` | `{"herramienta": "...", "total": N}` |
| POST | `/api/contadores/<herramienta>` | suma una visita y devuelve el total |

Herramientas registradas: `constructor-citas`, `preguntas-frecuentes`,
`verificador-citas`, `infografia-formato`, `infografia-citas`,
`infografia-formato-general`. Cualquier otro identificador
responde 404. Para sumar una herramienta nueva sin tocar el código, use la
variable `HERRAMIENTAS_EXTRA`.

## Seguridad

- CORS limitado a los orígenes de `ORIGENES_PERMITIDOS` (por defecto,
  `https://mauriciocantor-rgb.github.io`).
- Lista cerrada de herramientas y límite de 20 visitas por cliente y
  herramienta por minuto (`LIMITE_POR_MINUTO`).
- Cabeceras `nosniff`, `no-store`, `Referrer-Policy: no-referrer` y CSP
  restrictiva en todas las respuestas.
- La unidad systemd corre con usuario sin privilegios y sistema de archivos
  de solo lectura salvo la carpeta de datos.

## Conteos heredados

`semilla.json` trae los totales que tenían los artefactos de Claude el 15 de
octubre de 2026 (constructor 39, preguntas frecuentes 24, verificador 3). Se
cargan una sola vez, al primer arranque, y nunca sobrescriben un conteo
existente. Antes de desplegar conviene actualizarlos con el valor del día.

## Copia de seguridad

Basta con respaldar el archivo indicado en `CONTADOR_DB`
(por defecto `/var/lib/contador-bic/contador.db`).

## Pruebas

```bash
pip install -r requirements.txt pytest
python -m pytest -q
```
