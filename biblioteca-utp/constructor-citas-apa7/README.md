# Constructor de citas APA 7

Genera citas en formato APA 7.ª edición (parentética y narrativa) a partir
de los datos de la fuente (autores, año, tipo de fuente). La lógica de
construcción de la cita **no se modificó** en esta migración; solo cambió
cómo se registra el contador de visualizaciones.

## Estructura

```
constructor-citas-apa7/
├── frontend/
│   └── index.html      # la herramienta (estático, para GitHub Pages)
└── backend/
    ├── app.py           # API Flask del contador de uso
    ├── requirements.txt
    ├── Procfile
    └── render.yaml
```

## Qué cambió frente al Claude Artifact original

La única diferencia funcional es el contador de visualizaciones
("👁 N usos"): antes se guardaba con la capacidad `db` de Claude Artifacts
(solo funciona dentro de claude.ai); ahora se guarda en una base de datos
propia a través de una API HTTP (`backend/app.py`), visible para cualquiera
que abra la herramienta, dentro o fuera de claude.ai.

Todo lo demás —diseño, formularios, validaciones, construcción de la cita,
copiar al portapapeles— es exactamente el mismo código.

## Backend: API

- `GET /healthz` → `{"status": "ok"}`
- `GET /api/count` → `{"count": N}` (lee el contador sin incrementar)
- `POST /api/count` → `{"count": N}` (incrementa en 1 y devuelve el nuevo total)

Variables de entorno:

- `PORT` (la pone Render automáticamente)
- `DB_PATH` (opcional; ruta del archivo SQLite, por defecto `backend/counter.db`)
- `ALLOWED_ORIGINS` (opcional; dominios permitidos por CORS, por defecto `*`.
  En producción conviene poner la URL real de GitHub Pages, por ejemplo
  `https://mauriciocantor-rgb.github.io`)

## Desplegar el backend en Render (gratis)

1. Crear cuenta en [render.com](https://render.com) (puede entrar con la
   cuenta de GitHub).
2. "New +" → "Web Service" → conectar este repositorio
   (`mauriciocantor-rgb/flip`).
3. En "Root Directory" escribir `biblioteca-utp/constructor-citas-apa7/backend`.
   Render detecta `render.yaml` y completa el resto automáticamente
   (build command, start command, plan gratuito).
4. Crear el servicio. Al terminar el despliegue, Render muestra una URL
   pública, por ejemplo `https://constructor-citas-apa7-api.onrender.com`.
5. Probar que funciona abriendo `<esa URL>/healthz` en el navegador: debe
   responder `{"status": "ok"}`.

> Nota: en el plan gratuito, Render "duerme" el servicio tras ~15 minutos
> sin uso y tarda unos segundos en despertar en la primera visita del día;
> es normal y no requiere ninguna acción.

## Publicar el frontend en GitHub Pages

1. Abrir `frontend/index.html` y, cerca del inicio del `<script>`, cambiar:
   ```js
   const API_BASE = "https://constructor-citas-apa7-api.onrender.com";
   ```
   por la URL real que dio Render en el paso anterior.
2. Confirmar (commit) el cambio.
3. En GitHub: Settings → Pages → Build and deployment → Branch → elegir la
   rama y la carpeta `biblioteca-utp/constructor-citas-apa7/frontend`.
4. GitHub da una URL pública (algo como
   `https://mauriciocantor-rgb.github.io/flip/`) para compartir con la
   comunidad académica.

## Persistencia del contador

El contador se guarda en un archivo SQLite dentro del propio servicio. En
el plan gratuito de Render, el disco no es persistente entre despliegues:
si se vuelve a desplegar el servicio (por ejemplo al actualizar el código),
el contador puede reiniciarse en 0. Para un contador interno esto suele ser
aceptable; si se necesita que nunca se reinicie, la alternativa es apuntar
`DB_PATH` a un disco persistente de pago de Render, o cambiar el backend
para usar una base de datos externa gratuita (Supabase, Neon, Turso).
