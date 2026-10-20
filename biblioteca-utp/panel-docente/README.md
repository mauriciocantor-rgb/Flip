# Panel docente BIC · laboratorios gamificados

Subherramienta de la Biblioteca e Información Científica (BIC) de la
Universidad Tecnológica de Pereira para que el docente siga a los equipos de
**Grid Masters** y **Turno de urgencias** durante el taller.

| Qué hace el docente | Dónde |
|---|---|
| Crea una sesión (laboratorio, modo, nivel, título y grupo) y proyecta el código con su QR | Nueva sesión · Proyectar código |
| Ve cada equipo en vivo: estado, reloj, puntaje, evolución, frecuencia o pacientes, últimos eventos | Sesión en vivo |
| Recibe alertas: equipo sin señal, sin responder a un evento, apagón, EDAC, paciente grave o fallecido, intervención dañina, recordatorios de la guía, insignias | Sesión en vivo · Alertas |
| Controla la partida: iniciar, pausar y reanudar a todos o a un equipo; lanzar eventos; enviar mensajes | Sesión en vivo · Control |
| Descarga el reporte: resultados por equipo e integrante, errores y aciertos más frecuentes, línea de tiempo | Ver reporte · CSV · Imprimir o PDF |
| Compara sesiones, grupos y semestres | Histórico |
| Registra resultados de equipos que jugaron sin red (QR o código `BICR1.`) | Registrar sin red |

## Cómo funciona

```
 Laboratorio (GitHub Pages)  ── cada 3 s: estado + eventos ──►  Servicio del panel (CRIE, *.utp.edu.co)
   chip «Unirse a la sesión»  ◄── órdenes del docente ────────     backend-panel/app.py · SQLite
                                                                        ▲
 Panel docente (GitHub Pages) ── cada 2,5 s: tablero ───────────────────┘
```

1. El docente entra con la **clave de docente** (variable `TOKEN_DOCENTE` del servicio) y crea la sesión.
2. Cada equipo abre el laboratorio desde el QR (el enlace ya trae `?sesion=BIC-XXX`) y escribe el nombre del
   equipo. Solo si el docente eligió **«Nombre y códigos de estudiante»** al crear la sesión, el juego pide
   también los códigos y la **autorización de tratamiento de datos**.
3. El laboratorio envía su estado y sus eventos; el panel los muestra y devuelve las órdenes del docente.
4. Al terminar, el laboratorio envía el resultado y muestra además un **código de resultado con QR**.

### Modo de prueba (sin servidor)

Sirve para probar todo antes de que el CRIE aloje el servicio, y para talleres en un solo computador.
En el acceso, «Modo de prueba (sin servidor)» no pide clave. Las sesiones quedan en el navegador del
docente, y los laboratorios abiertos **en ese mismo navegador** (otra ventana o pestaña, desde «Copiar
enlace» o el QR) se comunican con el panel mediante `localStorage` (mismo sitio, mismo navegador). Así
funcionan el tablero en vivo, las alertas, las órdenes (iniciar, pausar, eventos, mensajes), el reporte,
el CSV y el histórico. Conviene poner el panel y el juego en dos ventanas lado a lado, porque el
navegador frena las pestañas ocultas. Los equipos de otros dispositivos no pueden llegar al panel sin
servidor: entregan su resultado con el QR.

### Respaldo sin red

Si el servicio no está configurado o el aula pierde la red, el juego sigue normal. Al final, el
equipo ve un QR y un código `BICR1.…` (con verificación para detectar errores al copiarlo). El docente
lo escanea con la cámara o lo pega en **Registrar sin red**. El panel también puede trabajar
**sin servidor**: las sesiones y los resultados quedan solo en el navegador del docente.

## Lineamientos del CRIE

| Lineamiento | Cómo se cumple |
|---|---|
| Texto en **Noto Sans** | `../comun/css/fuentes.css` y `base.css` |
| Títulos en **Atkinson Hyperlegible** | `h1`–`h6` y títulos de tarjetas |
| Cifras de instrumentos y consolas | **Noto Sans Mono** (misma familia Noto; dígitos de igual ancho) |
| HTML, CSS y JavaScript separados | `index.html`, `estilos.css`, `app.js` en el panel y en cada laboratorio |
| Fuentes y librerías en el repositorio | `../comun/fonts`, `../comun/vendor` (sin Google Fonts ni CDN) |
| Despliegue en **GitHub Pages** | Sitio estático, rutas relativas |
| Política de seguridad (CSP) | Solo recursos propios; conexiones al mismo sitio y a `https://*.utp.edu.co`; sin estilos ni scripts en línea |

Los anchos y colores que se calculan en vivo se aplican con CSSOM (`element.style`), que la CSP permite.
En los laboratorios, las plantillas usan `data-css` y un observador que solo acepta propiedades de
presentación de una lista cerrada.

## Tratamiento de datos (Ley 1581 de 2012)

- **Por defecto, sin datos personales:** la sesión guarda el código de la sesión, el nombre del equipo,
  el estado del juego, las acciones, los puntos y el resultado. Así el servicio puede alojarse incluso
  fuera de la UTP para pilotos.
- **Solo si el docente lo elige** («Nombre y códigos de estudiante»): también los códigos de estudiante
  de los integrantes, con la fecha de la autorización. En ese caso conviene que el servicio esté en la UTP.
- **Qué no se guarda:** nombres de personas, correos, direcciones IP ni cookies.
- **Autorización:** en las sesiones con códigos, el equipo no puede unirse sin marcarla. El texto menciona la finalidad académica,
  la Ley 1581 y la política de tratamiento de datos de la UTP.
- **Supresión:** «Borrar esta sesión y todos sus datos» elimina equipos, códigos y eventos.
- **Conservación:** el servicio borra solo las sesiones con más de `RETENCION_DIAS` días (365 por defecto).

> Pendiente institucional: confirmar con la oficina jurídica de la UTP el texto final de la
> autorización y el enlace a la política de tratamiento de datos.

## Servicio del panel (para el CRIE)

Carpeta [`backend-panel/`](backend-panel). Python 3.10+, Flask y SQLite; el mismo esquema de
despliegue del contador de la colección APA.

```bash
sudo useradd --system --home /opt/panel-bic panel-bic
sudo mkdir -p /opt/panel-bic /var/lib/panel-bic /etc/panel-bic
sudo cp app.py requirements.txt /opt/panel-bic/
cd /opt/panel-bic && sudo python3 -m venv .venv && sudo .venv/bin/pip install -r requirements.txt
sudo cp .env.example /etc/panel-bic/panel.env        # definir TOKEN_DOCENTE
sudo chown -R panel-bic:panel-bic /var/lib/panel-bic
sudo cp despliegue/panel-bic.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now panel-bic
```

Proxy inverso: `despliegue/nginx-panel-bic.conf` (solo expone `/api/sesiones` y `/healthz`).
Pruebas: `python -m pytest -q` dentro de `backend-panel/`.

Cuando el servicio esté en línea, poner su dirección en `../comun/js/config.js`:

```js
window.BIC_PANEL_CONFIG = Object.freeze({ api: "https://panel-bic.utp.edu.co", laboratorios: { … } });
```

### Endpoints

| Método | Ruta | Quién |
|---|---|---|
| GET | `/healthz` | cualquiera |
| POST · GET | `/api/sesiones` | docente: crear · histórico |
| GET | `/api/sesiones/<codigo>/publica` | cualquiera (datos para unirse) |
| POST | `/api/sesiones/<codigo>/equipos` | equipo: unirse (códigos + autorización) |
| POST | `/api/sesiones/<codigo>/telemetria` | equipo (cabecera `X-Token-Equipo`) |
| GET | `/api/sesiones/<codigo>/tablero` | docente |
| POST | `/api/sesiones/<codigo>/comandos` | docente: `iniciar`, `pausar`, `reanudar`, `evento`, `mensaje` |
| POST | `/api/sesiones/<codigo>/cerrar` | docente |
| GET | `/api/sesiones/<codigo>/reporte` · `reporte.csv` | docente |
| POST | `/api/sesiones/<codigo>/importar` | docente: resultado `BICR1` |
| DELETE | `/api/sesiones/<codigo>` | docente: supresión |

Las rutas de docente exigen la cabecera `X-Token-Docente`. Sin `TOKEN_DOCENTE` configurado responden 503.

## Código de inserción sugerido para el campus

```html
<iframe src="https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/panel-docente/"
        title="Panel docente · laboratorios gamificados BIC"
        width="100%" height="1100" loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="camera; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads allow-modals"></iframe>
```

`camera` solo se usa para escanear los QR de resultado; `fullscreen`, para proyectar el código.
