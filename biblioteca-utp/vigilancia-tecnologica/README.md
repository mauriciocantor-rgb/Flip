# Vigilancia Tecnológica BIC

Ficha de validación de productos de vigilancia tecnológica, alineada con
el modelo de medición de grupos de Minciencias (convocatoria vigente):
clasifica el tipo de producto, muestra la lista de evidencias requeridas y
genera una ficha de resultado en PDF. La lógica de clasificación y
validación **no se modificó** en esta migración.

## Estructura

```
vigilancia-tecnologica/
├── frontend/
│   └── index.html      # la herramienta (estático, para GitHub Pages)
└── backend/
    ├── app.py           # API Flask del contador de uso
    ├── requirements.txt
    ├── Procfile
    └── render.yaml
```

## Qué cambió frente al Claude Artifact original

1. **Contador de visualizaciones**: pasó de la capacidad `db` de Claude
   Artifacts (solo funciona dentro de claude.ai) a una API HTTP propia
   (`backend/app.py`).
2. **Descarga de la ficha en PDF**: la herramienta original usaba la
   capacidad `downloads` de Claude Artifacts para guardar el archivo. Esa
   capacidad tampoco existe fuera del sandbox de claude.ai, así que se
   sustituyó por la técnica estándar de cualquier página web (crear un
   `Blob` y un enlace `<a download>` temporal). El PDF se genera igual que
   antes, en el navegador, con la misma librería (`jsPDF`) y el mismo
   diseño; solo cambió el mecanismo para entregarle el archivo a quien lo
   descarga. No requiere backend ni conexión a internet adicional.

## Backend: API

- `GET /healthz` → `{"status": "ok"}`
- `GET /api/count` → `{"count": N}`
- `POST /api/count` → `{"count": N}` (incrementa en 1)

Variables de entorno: `PORT`, `DB_PATH` (opcional), `ALLOWED_ORIGINS`
(opcional, por defecto `*`).

## Desplegar el backend en Render (gratis)

Mismos pasos que en [`constructor-citas-apa7/README.md`](../constructor-citas-apa7/README.md#desplegar-el-backend-en-render-gratis),
cambiando el "Root Directory" a `biblioteca-utp/vigilancia-tecnologica/backend`.

## Publicar el frontend en GitHub Pages

Mismos pasos que en el Constructor de citas, editando en
`frontend/index.html` la línea:
```js
const API_BASE = "https://vigilancia-tecnologica-api.onrender.com";
```
con la URL real que dé Render, y apuntando GitHub Pages a
`biblioteca-utp/vigilancia-tecnologica/frontend`.

## Persistencia del contador

Ver la nota sobre persistencia en el README del Constructor de citas — se
aplica igual aquí.

## Verificación realizada

El contador se probó extremo a extremo (backend real + navegador real):
incrementa correctamente y es el mismo número para todas las visitas. La
descarga en PDF no se pudo ejecutar dentro del entorno de pruebas de esta
migración porque ese entorno bloquea la carga de la librería `jsPDF` desde
su CDN (una restricción de red del entorno de pruebas, no de la
herramienta); conviene que alguien de la biblioteca confirme la descarga
una vez publicado el frontend real.
