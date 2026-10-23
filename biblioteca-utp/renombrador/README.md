# Renombrador de archivos · Biblioteca Jorge Roa Martínez (UTP)

Herramienta interna de la Biblioteca e Información Científica (BIC) para generar y
validar nombres de archivo en dos ámbitos:

1. **Repositorio Institucional**: trabajos de grado y otros recursos, según la
   *Nomenclatura Oficial de Archivos del Repositorio Institucional UTP*. En los PDF
   detecta autor principal, año, tipo de recurso y programa académico.
2. **Documentación administrativa**: cualquier documento de la UTP según su
   **Tabla de Retención Documental (TRD)**, con el formato del *Documento maestro de
   nomenclatura de archivos BIC v1.0* (octubre de 2026):

   `utp_[oficina]-[subserie]_[tipo]_[fecha ISO 8601]_[consecutivo].[extensión]`

   Ejemplo: `utp_124000-0333_acta-reunion-interna_2026-10-23_0001.pdf`

- **Herramienta:** `https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/renombrador/`

## Lineamientos del CRIE

| Lineamiento | Cómo se cumple |
|---|---|
| Tipografía | Texto en Noto Sans y títulos en Atkinson Hyperlegible (`../comun/css/fuentes.css`), alojadas en el repositorio. Los nombres de archivo usan Noto Sans Mono. |
| HTML, CSS y JS separados | `index.html`, `estilos.css`, `app.js`, `admin-trd.js`, `datos-trd.js`. Sin estilos ni scripts en línea. |
| Sin servidores de terceros | pdf.js 3.11.174 y JSZip 3.10.1 están en `../comun/vendor/` con sus licencias. La página no hace ninguna petición fuera de su propio sitio. |
| Seguridad | Política de seguridad de contenido (CSP) estricta: `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, sin `eval`. |
| Despliegue | GitHub Pages. No necesita servidor ni backend. |

## Estructura

```
renombrador/
├── index.html     Página (HTML) con la declaratoria de uso de datos
├── estilos.css    Estilos (identidad navy/dorado y búho de la BIC, modo claro y oscuro)
├── app.js         Módulo académico (Nomenclatura Oficial) y utilidades compartidas
├── admin-trd.js   Módulo de documentación administrativa (TRD)
├── datos-trd.js   Catálogo de oficinas, series y subseries de las TRD de la UTP
└── README.md
```

## Datos y privacidad

- Todo se procesa en el navegador: los archivos no se suben a ningún servidor.
- Se lee el nombre, la extensión y los primeros bytes de cada archivo (para verificar
  el formato real). En los PDF académicos se lee además el texto de las primeras
  cinco páginas.
- Solo se guardan en `localStorage` los consecutivos de cada serie
  (`utp_renombrador_contadores_v1` y `utp_renombrador_trd_consecutivos_v1`).
- Marco: Ley 1581 de 2012, Decreto 1074 de 2015, Ley 1712 de 2014, Ley 594 de 2000,
  Acuerdo 001 de 2024 del AGN, Resolución de Rectoría 1762 de 2024 e ISO/IEC 27001.

## Mantenimiento del catálogo TRD

El catálogo está en `datos-trd.js` (`window.BIC_TRD`). Para agregar una subserie,
añada una fila `[código, tipo-para-el-nombre, nombre, grupo]` en `tipologias`; para
una oficina, `[código, nombre]` en `oficinas`. Las entradas con «verificar» en el
nombre provienen de TRD escaneadas con lectura dudosa y deben confirmarse con
Gestión de Documentos (Secretaría General).

## Prueba local

```
cd Flip            # raíz del repositorio
python3 -m http.server 8000
# abrir http://localhost:8000/biblioteca-utp/renombrador/
```

La página debe servirse por HTTP (no con `file://`) para que funcionen el lector de
PDF y la CSP.
