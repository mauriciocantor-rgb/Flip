# Preguntas frecuentes sobre la norma APA (7.ª edición)

Guía de referencia rápida (acordeón de preguntas y respuestas) sobre las
dudas más comunes al aplicar APA 7: citas en el texto, datos que faltan,
citas textuales, lista de referencias, casos especiales y errores
comunes. El contenido y la lógica **no se modificaron** en esta migración.

## Nota sobre la versión migrada

En la cuenta de Claude existían dos artefactos con contenido de FAQ-APA 7:
uno llamado "…-versión_contador" y una copia fijada ("Copy") más reciente.
Se migró la versión **"…-versión_contador"**, porque su nombre coincide
con lo pedido explícitamente ("FAQ normas APA preguntas frecuentes
versión contador"). Si la copia más reciente tiene contenido distinto que
también se quiera migrar, avisar para actualizar esta carpeta.

## Estructura

```
faq-apa7/
├── frontend/
│   └── index.html      # la herramienta (estático, para GitHub Pages)
└── backend/
    ├── app.py           # API Flask del contador de uso
    ├── requirements.txt
    ├── Procfile
    └── render.yaml
```

## Qué cambió frente al Claude Artifact original

Igual que en el Constructor de citas: solo el contador de visualizaciones
pasó de la capacidad `db` de Claude Artifacts (solo funciona dentro de
claude.ai) a una API HTTP propia (`backend/app.py`), visible para
cualquiera que abra la guía.

## Backend: API

- `GET /healthz` → `{"status": "ok"}`
- `GET /api/count` → `{"count": N}`
- `POST /api/count` → `{"count": N}` (incrementa en 1)

Variables de entorno: `PORT`, `DB_PATH` (opcional), `ALLOWED_ORIGINS`
(opcional, por defecto `*`) — igual que en el Constructor de citas.

## Desplegar el backend en Render (gratis)

Mismos pasos que en [`constructor-citas-apa7/README.md`](../constructor-citas-apa7/README.md#desplegar-el-backend-en-render-gratis),
cambiando el "Root Directory" a `biblioteca-utp/faq-apa7/backend`.

## Publicar el frontend en GitHub Pages

Mismos pasos que en el Constructor de citas, editando en
`frontend/index.html` la línea:
```js
const API_BASE = "https://faq-apa7-api.onrender.com";
```
con la URL real que dé Render, y apuntando GitHub Pages a
`biblioteca-utp/faq-apa7/frontend`.

## Persistencia del contador

Ver la nota sobre persistencia en el README del Constructor de citas — se
aplica igual aquí.
