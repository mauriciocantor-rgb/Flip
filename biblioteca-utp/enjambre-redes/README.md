# Enjambre de Redes Sociales · Biblioteca Jorge Roa Martínez (UTP)

Herramienta interna de la Biblioteca e Información Científica (BIC) para planear,
crear, medir y cuidar las redes sociales de la biblioteca (Instagram, TikTok y
Facebook), con la identidad visual de la cuenta oficial **@bibliotecautp**.

- **Herramienta:** `https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/enjambre-redes/`
- **Guía de uso e instructivo:** `https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/enjambre-redes/guia/`

## Qué incluye

| Pestaña | Qué hace |
|---|---|
| Especialistas | Diez bots: Copywriter, Trend-Hunter, Guiones y Storyboards, Diseñador de Prompts, Respuestas y Engagement, Programación y Analítica, Estratega editorial, Crisis y reputación, Accesibilidad e inclusión, Embajadores y alianzas. |
| Analítica | Carga de CSV exportado de Meta Business Suite o TikTok Studio (procesado en el navegador), indicadores, tasa de interacción por publicación, rendimiento por formato, ranking y lectura con Gemini. |
| Estudio de piezas | Brief con la identidad de marca para Canva (copiar y abrir) y plan de edición clip por clip para CapCut. |

## Motor de IA: Gemini

La herramienta usa **Gemini** de dos maneras, según `config.js`:

1. **Modo Gemini (activo hoy, `servicioIA` vacío).** Cada bot arma la instrucción
   completa (rol del bot + identidad de marca + tarea), la copia y abre
   `gemini.google.com` con la cuenta institucional de Google Workspace. La
   persona pega la respuesta de vuelta en la herramienta. No requiere servidor.
2. **Servicio institucional (`servicioIA` con la dirección del servicio).** La
   página envía la instrucción a `backend-ia/`, que la pasa a la API de Gemini y
   devuelve el texto. Si el servicio no responde, la página vuelve sola al modo Gemini.

> **Importante:** la licencia de Gemini incluida en Google Workspace permite usar
> Gemini en su aplicación web, Gmail, Docs, etc., pero **no incluye acceso por
> API**. Para el servicio institucional se necesita una clave de la API de Gemini:
> desde Google AI Studio o desde la API de Vertex AI en el proyecto de Google
> Cloud de la UTP (gestionado por el administrador de Workspace/Cloud).

## Estructura

```
enjambre-redes/
├── index.html        Herramienta (HTML)
├── styles.css        Estilos (tipografías CRIE desde ../comun/css/fuentes.css)
├── config.js         Dirección del servicio de IA y de Gemini
├── bots.js           Definición de los 10 bots e identidad de marca
├── app.js            Interfaz, motor de IA (modo Gemini / servicio) y pestañas
├── analitica.js      Pestaña Analítica (CSV)
├── estudio.js        Pestaña Estudio de piezas (Canva y CapCut)
├── guia/             Guía de uso e instructivo
└── backend-ia/       Servicio Python (Flask) para el CRIE → API de Gemini
```

## Lineamientos del CRIE

Noto Sans en el texto y Atkinson Hyperlegible en los títulos (alojadas en
`../comun/fonts`), HTML/CSS/JS en archivos separados, sin librerías externas y
publicación en GitHub Pages. La página declara una política de seguridad de
contenido que solo permite conexiones a `*.utp.edu.co`; si el servicio de IA
queda en otro dominio, agréguelo a `connect-src` en `index.html`.

## Activar el servicio institucional (CRIE)

1. Obtener la clave de la API de Gemini (ver nota anterior).
2. Desplegar `backend-ia/` en un servidor de la UTP:
   ```bash
   sudo useradd --system enjambre-ia
   sudo mkdir -p /opt/enjambre-ia /etc/enjambre-ia
   sudo cp app.py requirements.txt /opt/enjambre-ia/
   cd /opt/enjambre-ia && sudo python3 -m venv .venv && sudo .venv/bin/pip install -r requirements.txt
   sudo cp .env.example /etc/enjambre-ia/enjambre.env   # completar GEMINI_API_KEY
   sudo chmod 600 /etc/enjambre-ia/enjambre.env
   sudo cp despliegue/enjambre-ia.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now enjambre-ia
   ```
   y publicar con nginx usando `despliegue/nginx-enjambre-ia.conf` (HTTPS).
3. Escribir la dirección en `config.js` → `servicioIA: "https://enjambre-ia.utp.edu.co"`.
4. Verificar: `curl https://enjambre-ia.utp.edu.co/healthz` debe responder `"clave": true`.

El servicio no guarda instrucciones ni respuestas, limita las solicitudes por
minuto y solo acepta peticiones desde los orígenes configurados. Pruebas:
`cd backend-ia && python -m pytest -q`.

## Autoría

La idea original, la estructura de la herramienta y la incorporación de nuevos
módulos, bots o comandos son decisiones humanas del equipo de la BIC. La
inteligencia artificial asistió en la redacción y la programación siguiendo esas
decisiones.
