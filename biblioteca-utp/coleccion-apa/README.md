# Colección de herramientas APA 7 · Biblioteca Jorge Roa Martínez (UTP)

Herramientas de la Biblioteca e Información Científica (BIC) para citar y dar
formato según la norma APA 7, preparadas para **embeberse de forma segura en
el campus** siguiendo los lineamientos del **CRIE**:

| Lineamiento CRIE | Cómo se cumple |
|---|---|
| Fuente del texto: **Noto Sans** | `assets/css/fuentes.css` + `base.css`; aplicada a cuerpo, formularios, tablas y ejemplos |
| Títulos: **Atkinson Hyperlegible** | `h1`–`h6`, preguntas del FAQ y títulos de tarjetas |
| HTML, CSS y JavaScript separados | Cada herramienta tiene `index.html`, `estilos.css` y `app.js`; sin estilos ni scripts en línea |
| Despliegue en **GitHub Pages** | Sitio 100 % estático, rutas relativas, sin compilación |

## Herramientas

| Herramienta | Carpeta | Identificador del contador |
|---|---|---|
| Portada de la colección | [`index.html`](index.html) | — |
| Constructor de citas APA 7 (v2.0) | [`constructor-citas/`](constructor-citas) | `constructor-citas` |
| Verificador de citas y referencias (v1.0) | [`verificador-citas/`](verificador-citas) | `verificador-citas` |
| Preguntas frecuentes APA 7 | [`preguntas-frecuentes/`](preguntas-frecuentes) | `preguntas-frecuentes` |
| Infografía · Configura tu formato | [`infografia-formato/`](infografia-formato) | `infografia-formato` |

## Estructura

```
coleccion-apa/
├── index.html                 portada de la colección
├── assets/
│   ├── fonts/                 Noto Sans y Atkinson Hyperlegible (.woff2, licencia OFL)
│   ├── css/fuentes.css        @font-face (sin servidores de terceros)
│   ├── css/base.css           asignación tipográfica y utilidades comunes
│   ├── js/config.js           dirección del servicio de contador
│   ├── js/contador.js         contador de uso compartido
│   └── img/logo-bic-utp.svg   logo del búho
├── <herramienta>/index.html · estilos.css · app.js
└── backend-contador/          servicio Python del contador (lo aloja el CRIE)
```

## Seguridad para embeber

- **Sin dependencias externas**: fuentes, logo y scripts se sirven desde el
  mismo sitio. No hay CDN, Google Fonts ni analítica de terceros.
- **Política de seguridad de contenido (CSP)** en cada página: solo scripts,
  estilos, fuentes e imágenes propios; conexiones únicamente al mismo sitio y a
  `https://*.utp.edu.co` (el contador). Sin estilos ni manejadores en línea.
- El verificador analiza el texto en el navegador: no se envía a ningún servidor.
- El contador solo envía el identificador de la herramienta; no usa cookies.
- GitHub Pages no permite configurar cabeceras HTTP, así que la página **sí
  puede embeberse en un iframe** (lo que se busca). Si el CRIE quisiera
  restringir en qué sitios se embebe, eso requiere alojar el sitio en un
  servidor propio con la cabecera `Content-Security-Policy: frame-ancestors`.

Código de inserción sugerido para el campus:

```html
<iframe src="https://mauriciocantor-rgb.github.io/flip/biblioteca-utp/coleccion-apa/constructor-citas/"
        title="Constructor de citas APA 7 · Biblioteca Jorge Roa Martínez"
        width="100%" height="900" loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
```

`allow-same-origin` es necesario para que el contador pueda hacer su petición;
el portapapeles del botón «Copiar cita» puede requerir además
`allow="clipboard-write"` en el iframe.

## Diseño adaptable (responsive)

Probado en Chromium a 360 px (celular), 768 px (tableta) y 1280 px (escritorio),
y dentro de un iframe de 360 px: sin desplazamiento horizontal ni elementos
fuera del ancho, también con todas las preguntas del FAQ abiertas y con una
cita en bloque en el constructor.

## Contador de uso

Las páginas registran cada apertura en el servicio de `backend-contador/`
(ver su README). Mientras `assets/js/config.js` tenga `apiContador` vacío, las
herramientas funcionan con normalidad y el distintivo del ojo no aparece.

## Publicación

El repositorio ya tiene GitHub Pages activo desde la rama `main`; la colección
queda disponible en:

`https://mauriciocantor-rgb.github.io/flip/biblioteca-utp/coleccion-apa/`

Si Pages estuviera configurado de otra forma, en *Settings → Pages* elija
*Deploy from a branch → main → / (root)*.
