# Herramientas de la Biblioteca UTP

Este directorio reúne la migración a GitHub de cuatro herramientas internas
de la Biblioteca Jorge Roa Martínez / Biblioteca e Información Científica
(BIC) de la Universidad Tecnológica de Pereira, originalmente publicadas
como Claude Artifacts:

| Herramienta | Carpeta | Qué hace |
|---|---|---|
| Colección APA 7 (constructor, verificador, FAQ, infografía) | [`coleccion-apa/`](coleccion-apa) | Línea de herramientas APA con los lineamientos del CRIE (Noto Sans, Atkinson Hyperlegible, HTML/CSS/JS separados, GitHub Pages) y un único servicio de contador para el servidor de la UTP. |
| Ruta Mendeley UTP | [`ruta-mendeley/`](ruta-mendeley) | Ruta de aprendizaje autónomo de Mendeley: diagnóstico, simulador, retos, evaluación y constancia de práctica. |
| Vigilancia Tecnológica BIC | [`vigilancia-tecnologica/`](vigilancia-tecnologica) | Ficha de validación de productos de vigilancia tecnológica (modelo de medición de Minciencias). |
| Laboratorio de Patología Clínica (provisional) | [`laboratorio-patologia/`](laboratorio-patologia) | Turno de urgencias gamificado, modelo anatómico 3D masculino y femenino y lectura de radiografías. Alojamiento provisional para pruebas con un médico general. |
| Grid Masters (provisional) | [`grid-masters/`](grid-masters) | Laboratorio de eléctrica: estabilidad de frecuencia de la red, sala de control con cuatro roles y banco de siete instrumentos de medición. Alojamiento provisional para pruebas. |
| Laboratorio de Tensión Continua (provisional) | [`tension-continua/`](tension-continua) | Osciloscopio y multímetro para fuentes de corriente continua. Reservado para el proyecto de CC. Alojamiento provisional para pruebas. |

> **Actualización (15 de octubre de 2026):** el Constructor de citas y el FAQ
> APA 7 se movieron a [`coleccion-apa/`](coleccion-apa), junto con el
> Verificador de citas y la Infografía de formato, para cumplir los
> lineamientos del CRIE. Sus antiguas carpetas `constructor-citas-apa7/` y
> `faq-apa7/` (con backends individuales para Render) se retiraron; el
> contador de la colección lo aloja ahora el CRIE en el servidor de la UTP.
> Lo que sigue describe Ruta Mendeley y Vigilancia Tecnológica.

## Por qué esta migración

Las cuatro herramientas vivían como Claude Artifacts y usaban la capacidad
**`db`** de esa plataforma para guardar un contador de visualizaciones
compartido. Esa capacidad **solo funciona dentro del sandbox de
claude.ai**: en cuanto el archivo HTML se descarga o se aloja en otro
sitio (por ejemplo, para que toda la comunidad académica pueda abrirlo
directamente), `window.claude` deja de existir y el contador nunca se
actualiza. Lo mismo ocurría con las capacidades `downloads` (descarga de
archivos) y `user` (saber si quien mira la herramienta puede editarla) que
usaban Ruta Mendeley y Vigilancia Tecnológica.

Esta migración resuelve ese problema separando cada herramienta en:

1. **Frontend estático** (`frontend/index.html`) — el mismo HTML/CSS/JS de
   siempre, pensado para publicarse con **GitHub Pages**, sin ningún
   cambio de apariencia ni de lógica de negocio.
2. **Backend propio en Python/Flask** (`backend/`) — una API muy pequeña,
   pensada para desplegarse gratis en **Render** (o Railway /
   PythonAnywhere), que sustituye únicamente las capacidades de Claude
   Artifacts que no existen fuera de su sandbox.

Ningún cambio toca la lógica de negocio de las herramientas (cómo se
construye una cita, qué preguntas tiene el FAQ, cómo se evalúa el
diagnóstico de Mendeley, cómo se arma la ficha de vigilancia): **se migró
solo la capa de persistencia/plataforma**, no el producto.

## Arquitectura

```
Navegador de la persona usuaria
        │
        │  (abre el HTML publicado en GitHub Pages)
        ▼
frontend/index.html  ──fetch()──▶  backend/app.py (Flask, en Render)
                                         │
                                         ▼
                                   counter.db (SQLite)
```

- El frontend es 100 % estático: no necesita Node, build ni nada — es el
  mismo archivo `index.html` que ya se usaba, con las llamadas a
  `window.claude.use(...)` reemplazadas por `fetch()` a la API propia.
- Cada backend es independiente (su propio `app.py`, `requirements.txt`,
  `Procfile`, `render.yaml`), tal como se pidió: cada herramienta puede
  desplegarse, reiniciarse o escalar sin afectar a las demás.
- CORS está habilitado en cada backend (`flask-cors`) para que el frontend,
  alojado en otro dominio (GitHub Pages), pueda llamarlo sin problema.

## Cómo publicar cada herramienta (resumen; el detalle está en el README de cada carpeta)

1. **Backend**: entrar a Render → "New Web Service" → conectar este
   repositorio → carpeta `backend/` de la herramienta → Render detecta
   `render.yaml` y lo despliega automáticamente. Al terminar, Render da una
   URL pública (algo como `https://constructor-citas-apa7-api.onrender.com`).
2. **Frontend**: editar la constante `API_BASE` al inicio del `<script>`
   de `frontend/index.html` con esa URL real, confirmar los cambios, y
   activar GitHub Pages para esta carpeta (Settings → Pages → Branch →
   carpeta `frontend`). GitHub da una URL pública para compartir con la
   comunidad académica.

## Advertencia importante sobre persistencia en hosting gratuito

Los planes gratuitos de Render, Railway y PythonAnywhere normalmente usan
**disco efímero**: los datos guardados en el archivo SQLite pueden
perderse si el servicio se reinicia o se vuelve a desplegar (por
inactividad, actualización, etc.). Para este uso (un contador interno y
registros de práctica, no información crítica) es un riesgo aceptable,
pero conviene saberlo. El README de cada herramienta explica la alternativa
(una base de datos externa gratuita, por ejemplo Supabase o Neon) para
quien prefiera que el conteo nunca se reinicie.

## Estado de la migración

| Herramienta | Frontend migrado | Backend construido y probado | Nota |
|---|---|---|---|
| Constructor de citas APA 7 | — | — | Trasladado a `coleccion-apa/` |
| FAQ APA 7 | — | — | Trasladado a `coleccion-apa/` (versión "…-versión_contador", confirmada como definitiva) |
| Ruta Mendeley UTP | ✅ | ✅ (probado extremo a extremo con navegador real) | La pestaña "Indicadores" (antes solo visible para quien podía editar el artefacto en claude.ai) ahora queda protegida por un token de personal. Ver el README de esta carpeta. |
| Vigilancia Tecnológica BIC | ✅ | ✅ (contador probado extremo a extremo; la descarga en PDF usa la misma técnica estándar de navegador, no se pudo probar el clic en este entorno por restricciones de red del sandbox de pruebas, pero no depende de ninguna capacidad retirada) | — |

Pendiente, a cargo de la biblioteca (requiere cuentas propias que esta
migración no puede crear por la persona usuaria): desplegar los cuatro
backends en Render (o el servicio elegido) y activar GitHub Pages para
cada frontend. Los pasos exactos están en el README de cada carpeta.
