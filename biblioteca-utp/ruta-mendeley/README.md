# Ruta Mendeley UTP

Ruta de aprendizaje autónomo para usar Mendeley: diagnóstico de nivel,
biblioteca simulada, módulo "Arregla la referencia", práctica de citar al
escribir, rutas sugeridas por perfil, evaluación final y constancia de
práctica descargable. La lógica de cada módulo (diagnóstico, simulador,
retos, evaluación, generación de la constancia) **no se modificó** en esta
migración.

## Estructura

```
ruta-mendeley/
├── frontend/
│   └── index.html      # la herramienta (estático, para GitHub Pages)
└── backend/
    ├── app.py           # API Flask: contador, sesiones e indicadores
    ├── requirements.txt
    ├── Procfile
    └── render.yaml
```

## Qué cambió frente al Claude Artifact original

Esta es la herramienta con más capacidades de Claude Artifacts, así que
tuvo más adaptaciones. Ninguna cambia lo que la herramienta hace por quien
la usa; cambia solo cómo se sostiene fuera del sandbox de claude.ai:

1. **Contador de visualizaciones** (capacidad `db`) → API HTTP propia,
   igual que en las demás herramientas de la línea.
2. **Registro de sesiones de práctica** (capacidad `db`, una sesión por
   persona que hace el diagnóstico): antes se guardaba directamente en el
   almacenamiento del artefacto; ahora se envía a `POST /api/sessions` del
   backend propio. Se guardan los mismos campos de siempre (nivel, perfil,
   puntaje, módulos completados, fallos, resultado de la evaluación,
   si generó constancia) — nunca nombre ni correo, igual que antes.
3. **Constancia de práctica en PNG** (capacidad `downloads`): se sustituyó
   por la técnica estándar de cualquier página web (`Blob` + enlace
   `<a download>`), igual que en Vigilancia Tecnológica. El botón para
   descargarla ahora está siempre disponible (antes se ocultaba si la
   capacidad no cargaba).
4. **Pestaña "Indicadores" (solo para personal de la biblioteca)**: en
   claude.ai, esta pestaña se mostraba solo a quien podía *editar* el
   artefacto (capacidad `user`/`canEdit`). Ese concepto no existe fuera de
   claude.ai, así que se sustituyó por un **token de personal**
   (`STAFF_TOKEN`, definido como variable de entorno en el backend): la
   pestaña queda visible para cualquiera, pero sus datos solo se cargan
   tras introducir el token correcto (una vez por navegador). **Este es el
   único cambio de mecanismo que vale la pena revisar con la biblioteca**:
   es equivalente en espíritu (acceso restringido a personal autorizado),
   pero el control de acceso ya no depende de la cuenta de claude.ai de
   quien edita el artefacto, sino de conocer ese token.

## Backend: API

- `GET /healthz` → `{"status": "ok"}`
- `GET /api/count` → `{"count": N}`
- `POST /api/count` → `{"count": N}` (incrementa en 1)
- `POST /api/sessions` → guarda o actualiza (por `sid`) una sesión de
  práctica. Cuerpo JSON: `{sid, nivel, perfil, puntaje, mod, fallos, quiz,
  constancia}` (los mismos campos que ya guardaba la herramienta).
- `GET /api/indicadores?token=XXXX` → `{"sessions": [...]}` si el token
  coincide con `STAFF_TOKEN`; `401` en caso contrario.

Variables de entorno:

- `PORT` (la pone Render automáticamente)
- `DB_PATH` (opcional)
- `ALLOWED_ORIGINS` (opcional, por defecto `*`)
- `STAFF_TOKEN` (**obligatoria** para que la pestaña de indicadores
  funcione; si se deja vacía, el acceso queda cerrado para todos — nunca
  abierto por accidente). Elegir una cadena larga y avisarla solo al
  personal de la biblioteca que deba ver los indicadores.

## Desplegar el backend en Render (gratis)

Mismos pasos que en [`constructor-citas-apa7/README.md`](../constructor-citas-apa7/README.md#desplegar-el-backend-en-render-gratis),
cambiando el "Root Directory" a `biblioteca-utp/ruta-mendeley/backend`, y
agregando en Render, en la pestaña "Environment" del servicio, la variable
`STAFF_TOKEN` con el token elegido (`render.yaml` ya la deja marcada como
"a definir manualmente" por seguridad, para no dejarla escrita en el
repositorio).

## Publicar el frontend en GitHub Pages

Mismos pasos que en el Constructor de citas, editando en
`frontend/index.html` la línea:
```js
const API_BASE = "https://ruta-mendeley-api.onrender.com";
```
con la URL real que dé Render, y apuntando GitHub Pages a
`biblioteca-utp/ruta-mendeley/frontend`.

## Persistencia de datos

Ver la nota sobre persistencia en el README del Constructor de citas. Aquí
aplica tanto al contador como a las sesiones de práctica: en el plan
gratuito de Render, ambos pueden reiniciarse si el servicio se redespliega.
Para los indicadores de uso del semestre, si se necesita que no se
pierdan, conviene exportar `GET /api/indicadores` periódicamente o migrar
a una base de datos externa gratuita (Supabase, Neon, Turso).

## Verificación realizada

Se probó extremo a extremo con backend real y navegador real: el contador
incrementa correctamente; `POST /api/sessions` guarda y actualiza
sesiones por `sid`; la pestaña de indicadores rechaza un token incorrecto
(401) y acepta el token correcto, mostrando el panel de estadísticas.
