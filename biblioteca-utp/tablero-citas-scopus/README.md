# Tablero de citas Scopus · Producción UTP 2020–2026

Tablero estático (GitHub Pages, sin backend) con los indicadores de producción y citación de la Universidad Tecnológica de Pereira en Scopus: documentos, citas, índice h, citas por documento y su evolución anual. Permite descargar los datos en CSV.

Sigue los lineamientos del CRIE: Noto Sans y Atkinson Hyperlegible alojadas en `../comun/fonts`, HTML/CSS/JS separados y ninguna petición a servidores de terceros (los gráficos se dibujan en SVG con `app.js`).

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura del tablero |
| `estilos.css` | Identidad BIC/UTP, modo claro y oscuro |
| `datos.js` | Cifras extraídas de Scopus (único archivo que cambia al actualizar) |
| `app.js` | KPIs, gráficos, tablas, tooltips y descarga CSV |

## Actualizar los datos

1. En Scopus, ejecutar la consulta `AF-ID ( 60077377 ) OR AF-ID ( 60091590 ) AND PUBYEAR > 2019 AND PUBYEAR < 2027`.
2. Tomar el conteo por año de la lista de resultados (`docsPublicados`).
3. Abrir *Citation overview* y tomar documentos, citas, índice h y la fila "Total" por año (`citasRecibidas`); los valores por cohorte salen de las filas de documentos.
4. Reemplazar los valores en `datos.js` y cambiar `fechaConsulta`.

Corte actual: 30 de octubre de 2026.
