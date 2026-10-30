/*
  Datos del Tablero de citas Scopus · Producción UTP 2020–2026
  Biblioteca e Información Científica (BIC) · Universidad Tecnológica de Pereira

  Fuente: Scopus (Elsevier), consultado el 30 de octubre de 2026 a través del proxy de la UTP.
  Consulta: AF-ID ( 60077377 ) OR AF-ID ( 60091590 ) AND PUBYEAR > 2019 AND PUBYEAR < 2027
  - Lista de resultados: 1.895 documentos (conteo por año del filtro "Year").
  - Citation Overview: 1.308 documentos, 20.302 citas, índice h 58.
  Los agregados por documento (cohortes, índice h por cohorte, umbrales) se
  calcularon a partir de las 1.308 filas del Citation Overview, extraídas
  página por página (7 páginas de 200 filas) y verificadas contra los
  totales que muestra Scopus.
  Para actualizar el tablero basta con reemplazar los valores de este archivo.
*/
window.DATOS_SCOPUS = {
  fechaConsulta: "2026-10-30",
  consulta: "AF-ID ( 60077377 ) OR AF-ID ( 60091590 ) AND PUBYEAR > 2019 AND PUBYEAR < 2027",
  anioParcial: 2026,

  // Totales según Scopus
  documentosBusqueda: 1895,
  documentosOverview: 1308,
  citasTotales: 20302,
  indiceH: 58,

  // Documentos publicados por año (lista de resultados)
  docsPublicados: { 2020: 367, 2021: 265, 2022: 235, 2023: 274, 2024: 266, 2025: 272, 2026: 216 },
  // Documentos de cada año presentes en el Citation Overview
  docsEnOverview: { 2020: 310, 2021: 222, 2022: 184, 2023: 204, 2024: 197, 2025: 138, 2026: 53 },

  // Citas recibidas en cada año calendario (fila "Total" del Citation Overview)
  citasRecibidas: { 2020: 2231, 2021: 3392, 2022: 2751, 2023: 2591, 2024: 2740, 2025: 3456, 2026: 3019 },
  citasAntes2020: 6,      // 2017: 1 · 2019: 5 (registros con fecha anterior a la publicación final)
  citasPosterior2026: 116, // citas con fecha posterior a 2026 (artículos citantes en prensa)

  // Por año de publicación (cohorte), calculado documento a documento
  citasPorCohorte: { 2020: 10986, 2021: 3395, 2022: 1794, 2023: 1690, 2024: 1497, 2025: 781, 2026: 100 },
  hPorCohorte: { 2020: 45, 2021: 29, 2022: 20, 2023: 21, 2024: 18, 2025: 14, 2026: 5 },

  // Distribución por documento (sobre las 1.308 filas)
  mediana: 5,
  maximo: 1829,
  docsCon10oMas: 428,
  docsCon100oMas: 26,
  sumaFilas: 20243 // suma de las filas; difiere en 59 del total de Scopus (columna >2026)
};
