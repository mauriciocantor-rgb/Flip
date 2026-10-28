# Traductor Académico · Biblioteca Jorge Roa Martínez (UTP)

Herramienta interna de la Biblioteca e Información Científica (BIC) para traducir
al inglés **títulos**, **resúmenes/abstracts** y **tablas de contenido** de trabajos
de grado y tesis, con palabras clave verificadas por tesauro disciplinar, antes de
depositarlos en el Repositorio Institucional (DSpace).

- **Herramienta:** `https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/traductor-academico/`
- **Versión anterior:** Claude Artifact "Traductor Académico UTP" (solo funcionaba dentro de claude.ai).

## Por qué cambió el motor

El artefacto original traducía con una función de Claude (`claude.use("sample")`)
que solo existe dentro de claude.ai. En GitHub Pages esa función no está, así que
la página cargaba pero no traducía. Esta versión **no tiene backend**: usa el
Gemini institucional de Google Workspace en modo copiar y pegar, igual que el
Enjambre de Redes.

## Cómo se usa

1. Elegir el modo (Título, Resumen / Abstract o Tabla de contenido) y pegar el texto en español.
2. Pulsar **Preparar para Gemini**. La herramienta arma la instrucción con las reglas del modo.
3. Pulsar **Copiar y abrir Gemini**: se copia la instrucción y Gemini se abre en otra pestaña con la cuenta de la UTP.
4. Pegar la instrucción en Gemini, enviarla y copiar la respuesta completa.
5. Pegar la respuesta en la herramienta y pulsar **Usar respuesta**. Aparecen la traducción, el
   recuadro de señalamientos (errores del original, nunca corregidos en silencio) y las palabras
   clave con su tesauro.

Las reglas de traducción de cada modo son las mismas del artefacto original
(SEO académico, siglas sin expandir, nombres propios sin traducir, tesauros MeSH,
ERIC, IEEE/ACM, AGROVOC, UNESCO, UNBIS y ODS). Se agregó solo la indicación de
responder en texto plano, y el lector de respuestas tolera el formato Markdown
que Gemini suele añadir.

## Lineamientos del CRIE

| Lineamiento | Cómo se cumple |
|---|---|
| Tipografía | Texto en Noto Sans y títulos en Atkinson Hyperlegible (`../comun/css/fuentes.css`), alojadas en el repositorio. |
| HTML, CSS y JS separados | `index.html`, `estilos.css`, `config.js`, `app.js`. Sin estilos ni scripts en línea. |
| Sin servidores de terceros | La página no hace ninguna petición de red (`connect-src 'none'`). Gemini se abre en otra pestaña. |
| Seguridad | CSP estricta: `script-src 'self'`, `style-src 'self'`, sin `eval`. |
| Identidad | Búho oficial de `../comun/img/logo-bic-utp.svg` (idéntico trazo por trazo al del artefacto) y marca de herramienta interna BIC. |
| Despliegue | GitHub Pages. No necesita servidor ni backend. |

## Estructura

```
traductor-academico/
├── index.html    Estructura de la página
├── estilos.css   Identidad navy/dorado de las herramientas BIC
├── config.js     Dirección de Gemini (geminiUrl)
├── app.js        Instrucciones por modo, paso con Gemini y lectura de la respuesta
└── README.md
```

## Privacidad

La página no guarda los textos ni los envía a ningún servidor. El procesamiento
ocurre en Gemini, bajo la cuenta institucional de Google Workspace de quien la usa.
