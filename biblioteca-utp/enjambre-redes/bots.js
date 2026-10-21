/* Enjambre de Marketing Digital · Biblioteca Jorge Roa Martínez (UTP)
   Definición de los 10 bots y de la identidad visual que todos aplican.
   Identidad verificada en la cuenta oficial de Instagram @bibliotecautp (oct. 2026). */
'use strict';

window.ENJAMBRE = (function () {

  /* Identidad de marca que se inyecta en cada instrucción a la IA */
  const IDENTIDAD = {
    marca: 'Biblioteca Jorge Roa Martínez · Universidad Tecnológica de Pereira (UTP)',
    edificio: 'Edificio 9, campus UTP, Pereira (Colombia)',
    web: 'biblioteca.utp.edu.co',
    cuentas: {
      instagram: '@bibliotecautp (cuenta activa y de referencia)',
      facebook: 'facebook.com/BibliotecaUTP (aún muestra la identidad anterior)',
      tiktok: 'usuario por confirmar'
    },
    logo: 'Búho-libro multicolor: libro abierto con páginas en amarillo, naranja, azul y rojo sobre dos ojos azul marino con pico dorado. Va arriba a la izquierda, dentro de la franja azul marino o en una esquina superior sobre fondo claro. No se redibuja ni se recolorea: se usa el archivo oficial.',
    paleta: [
      { nombre: 'Azul marino', hex: '#003060', uso: 'Franjas superior e inferior, titulares sobre claro, pie de página con redes' },
      { nombre: 'Gris claro', hex: '#F0F0F0', uso: 'Fondo de las piezas informativas' },
      { nombre: 'Dorado', hex: '#F0A818', uso: 'Acentos, íconos, destacados' },
      { nombre: 'Naranja', hex: '#F09018', uso: 'Formas de fondo y acentos cálidos' },
      { nombre: 'Azul', hex: '#1878C0', uso: 'Etiquetas y acentos secundarios' },
      { nombre: 'Turquesa', hex: '#00A8C0', uso: 'Formas curvas y elementos de apoyo' },
      { nombre: 'Rojo', hex: '#D83030', uso: 'Subtítulos en cursiva y fondos de reels de agenda' },
      { nombre: 'Rosa suave', hex: '#F0D8D8', uso: 'Fondo de etiquetas tipo "Libro recomendado"' }
    ],
    tipografia: 'Titulares de piezas informativas en serif gruesa; subtítulo en cursiva roja; texto de apoyo en sans-serif. Portadas de reels con sans-serif gruesa en mayúsculas sobre rojo o azul marino. (Los nombres exactos de las fuentes no están confirmados: usar las del manual de marca si existe.)',
    plantillas: 'Plantilla "Recomendado" (libro o revista): franja azul marino con logo arriba, título serif ("Explora nuevos temas", "La biblioteca te acompaña donde estés"), subtítulo en cursiva roja, portada del material a la izquierda, a la derecha etiqueta rosada con el tipo de recurso, título, autor o edición, y un código QR con el llamado "Escanea y descubre…". Cierre fijo: "Recuerda que nuestros recursos electrónicos están disponibles 24/7". Pie azul marino con Instagram, X, YouTube, página web y Facebook.',
    tono: 'Cercano y confiable; tutea a la comunidad ("tú", "ustedes"); exclamaciones moderadas para invitar ("¡La Biblioteca te abre sus puertas!"); acompaña y orienta ("Seguimos aquí para acompañarte"); emojis con medida; lenguaje claro e incluyente.',
    hashtags: '#BibliotecaUTP #BibliotecaJorgeRoaMartinez #UTP #Pereira (sugeridos; el equipo debe confirmar los hashtags que la cuenta usa de forma oficial)'
  };

  function bloqueIdentidad() {
    const p = IDENTIDAD.paleta.map(c => `- ${c.nombre} ${c.hex}: ${c.uso}`).join('\n');
    return [
      'IDENTIDAD DE MARCA OBLIGATORIA (verificada en Instagram @bibliotecautp):',
      `Marca: ${IDENTIDAD.marca}. Sede: ${IDENTIDAD.edificio}. Web: ${IDENTIDAD.web}.`,
      `Logo: ${IDENTIDAD.logo}`,
      'Paleta:', p,
      `Tipografía: ${IDENTIDAD.tipografia}`,
      `Plantillas en uso: ${IDENTIDAD.plantillas}`,
      `Tono de voz: ${IDENTIDAD.tono}`,
      `Hashtags de marca: ${IDENTIDAD.hashtags}`,
      'Público principal: estudiantes de pregrado y posgrado, docentes e investigadores de la UTP.'
    ].join('\n');
  }

  const REDES = ['Instagram', 'TikTok', 'Facebook'];

  /* Campos comunes */
  const F = {
    tema: { id: 'tema', label: 'Tema o necesidad', type: 'textarea', placeholder: 'Ej.: Semana de parciales: horario extendido de la sala de estudio y préstamo de portátiles', required: true },
    redes: { id: 'redes', label: 'Red social', type: 'redes' },
    objetivo: { id: 'objetivo', label: 'Objetivo', type: 'select', options: ['Informar un servicio', 'Promocionar un evento o taller', 'Recomendar un recurso', 'Generar conversación', 'Recordatorio o fecha clave'] }
  };

  const BOTS = [
    {
      id: 'copywriter', nombre: 'Copywriter', rol: 'Redactor de contenidos',
      desc: 'Escribe copies, hilos y descripciones con hashtags, adaptados al tono de cada red.',
      campos: [F.tema, F.redes, F.objetivo,
        { id: 'formato', label: 'Formato', type: 'select', options: ['Publicación de feed', 'Carrusel', 'Reel o TikTok (descripción)', 'Historia', 'Publicación de Facebook'] }],
      tarea: v => `Redacta los textos para ${v.redes} sobre: "${v.tema}". Objetivo: ${v.objetivo}. Formato: ${v.formato}.
Entrega, por cada red indicada: (1) gancho de primera línea, (2) copy completo con la extensión propia de esa red, (3) llamado a la acción, (4) 5 a 8 hashtags que incluyan los de marca, (5) una variante corta alternativa.
Si es carrusel, agrega el texto de cada diapositiva (máximo 8). Respeta el tono de la marca. No inventes horarios, fechas, cifras ni nombres que no estén en el tema: márcalos como [DATO POR CONFIRMAR].`
    },
    {
      id: 'trends', nombre: 'Trend-Hunter', rol: 'Cazador de tendencias',
      desc: 'Propone formatos, memes y estructuras virales del entorno universitario adaptados a la biblioteca.',
      aviso: 'No navega en tiempo real: propone formatos conocidos. Verifica en Instagram y TikTok que el audio o tendencia siga vigente antes de usarlo.',
      campos: [F.tema, F.redes,
        { id: 'momento', label: 'Momento académico', type: 'select', options: ['Inicio de semestre', 'Semana de parciales', 'Entrega de trabajos de grado', 'Vacaciones intersemestrales', 'Fecha conmemorativa', 'Sin momento especial'] }],
      tarea: v => `Para ${v.redes}, propone 5 ideas que adapten formatos y tendencias del entorno universitario colombiano al tema "${v.tema}" (momento: ${v.momento}).
Para cada idea: nombre del formato o tendencia, por qué conecta con estudiantes, cómo adaptarlo a la biblioteca paso a paso, tipo de audio sugerido (descríbelo, no inventes títulos de canciones ni artistas), riesgo de marca (bajo/medio/alto) y cómo mitigarlo.
Aclara al inicio que estas tendencias deben verificarse en la red antes de publicar porque no consultaste datos en tiempo real. Evita humor basado en estereotipos.`
    },
    {
      id: 'guiones', nombre: 'Guiones y Storyboards', rol: 'Estructura de videos cortos',
      desc: 'Diseña gancho, cuerpo y llamado a la acción, plano por plano, para Reels y TikToks.',
      campos: [F.tema, F.redes,
        { id: 'duracion', label: 'Duración', type: 'select', options: ['15 segundos', '30 segundos', '45 segundos', '60 segundos'] },
        { id: 'recursos', label: 'Recursos disponibles', type: 'text', placeholder: 'Ej.: celular, sala de estudio, un monitor estudiantil' }],
      tarea: v => `Escribe el guion y storyboard de un video vertical de ${v.duracion} para ${v.redes} sobre "${v.tema}". Recursos: ${v.recursos || 'celular y espacios de la biblioteca'}.
Entrega una tabla con columnas: Tiempo | Plano (encuadre y lugar de la biblioteca) | Acción | Texto en pantalla | Voz o diálogo | Sonido.
Estructura: gancho en los primeros 2 segundos, cuerpo, llamado a la acción y cierre con el logo búho-libro. Textos en pantalla con la portada estilo reel de la marca (sans-serif gruesa en mayúsculas sobre rojo #D83030 o azul marino #003060). Incluye subtítulos siempre y una nota de accesibilidad.`
    },
    {
      id: 'prompts', nombre: 'Diseñador de Prompts', rol: 'Instrucciones para piezas gráficas',
      desc: 'Redacta instrucciones exactas para que el equipo o Canva produzca piezas fieles a la marca.',
      campos: [F.tema,
        { id: 'pieza', label: 'Pieza', type: 'select', options: ['Post cuadrado 1080×1080', 'Post vertical 1080×1350', 'Carrusel 1080×1350', 'Historia 1080×1920', 'Portada de reel 1080×1920', 'Portada de Facebook 1640×624'] },
        { id: 'plantilla', label: 'Base', type: 'select', options: ['Plantilla "Recomendado" (libro o revista)', 'Anuncio de servicio', 'Evento o taller', 'Portada de reel', 'Pieza libre dentro de la marca'] }],
      tarea: v => `Redacta las instrucciones de diseño para una pieza "${v.pieza}" con base "${v.plantilla}" sobre "${v.tema}".
Entrega: (1) brief para el diseñador humano con jerarquía de elementos, ubicación del logo, colores con hex exactos de la paleta y uso de cada uno, estilo tipográfico por nivel, márgenes de seguridad y textos finales; (2) un prompt listo para pegar en Canva (Magic Design) o en un generador de imágenes, en español, que describa composición, paleta y estilo sin pedir que se genere el logo (el logo oficial se inserta después); (3) texto alternativo para la imagen; (4) lista de control de marca con 6 puntos.
Si es la plantilla "Recomendado", respétala elemento por elemento.`
    },
    {
      id: 'engagement', nombre: 'Respuestas y Engagement', rol: 'Comentarios y mensajes directos',
      desc: 'Redacta respuestas amables a dudas frecuentes y propone cómo generar conversación.',
      aviso: 'Redacta las respuestas para que el equipo las publique. La herramienta no responde por sí sola en las redes.',
      campos: [
        { id: 'mensaje', label: 'Comentario o mensaje recibido', type: 'textarea', placeholder: 'Ej.: ¿Hasta qué hora está abierta la biblioteca en parciales? (No incluyas nombres ni datos personales)', required: true },
        F.redes,
        { id: 'contexto', label: 'Información oficial para responder (opcional)', type: 'textarea', placeholder: 'Pega aquí horarios, requisitos o enlaces vigentes' }],
      tarea: v => `Mensaje recibido en ${v.redes}: "${v.mensaje}".
Información oficial disponible: ${v.contexto || 'ninguna; no inventes datos'}.
Entrega: (1) clasificación (duda frecuente, queja, felicitación, sugerencia, mensaje que requiere escalar), (2) respuesta pública breve, (3) versión para mensaje directo si aplica, (4) una pregunta o invitación para continuar la conversación, (5) si falta información oficial, indica exactamente qué dato debe confirmar el equipo y escribe [DATO POR CONFIRMAR] en su lugar. Si el mensaje es una queja grave o un tema sensible, recomienda pasarlo al bot de Crisis y Reputación.`
    },
    {
      id: 'analitica', nombre: 'Programación y Analítica', rol: 'Horarios y reportes',
      desc: 'Propone la parrilla de horarios y analiza las métricas que pegues desde Meta o TikTok Studio.',
      aviso: 'No publica ni lee las redes directamente. Pega las métricas exportadas (alcance, interacciones, compartidos) para analizarlas.',
      campos: [
        { id: 'modo', label: 'Qué necesitas', type: 'select', options: ['Analizar métricas pegadas', 'Proponer parrilla semanal de horarios'] },
        F.redes,
        { id: 'datos', label: 'Métricas o contexto', type: 'textarea', placeholder: 'Pega una tabla: publicación, fecha, formato, alcance, interacciones, compartidos, guardados…', required: true }],
      tarea: v => `Modo: ${v.modo}. Red: ${v.redes}. Datos o contexto: """${v.datos}"""
Si analizas métricas: calcula tasa de interacción por publicación (interacciones ÷ alcance), ordena de mejor a peor, identifica qué formato y tema funcionan mejor, y entrega 3 recomendaciones accionables. Usa solo los números pegados; si faltan columnas, dilo.
Si propones parrilla: arma una tabla semanal (lunes a domingo) con franja horaria sugerida según la rutina estudiantil (llegada a clase, almuerzo, tarde-noche), formato y tipo de contenido, y explica que las horas deben validarse con las estadísticas reales de la cuenta.`
    },
    {
      id: 'estratega', nombre: 'Estratega editorial', rol: 'Calendario y campañas',
      desc: 'Arma el plan mensual con fechas académicas, efemérides y campañas de la biblioteca.',
      campos: [
        { id: 'periodo', label: 'Periodo', type: 'text', placeholder: 'Ej.: noviembre 2026', required: true },
        F.redes,
        { id: 'prioridades', label: 'Prioridades o eventos del periodo', type: 'textarea', placeholder: 'Ej.: talleres de Mendeley, cierre de semestre, Día del Libro…' },
        { id: 'frecuencia', label: 'Publicaciones por semana', type: 'select', options: ['3', '4', '5', '7'] }],
      tarea: v => `Diseña el calendario editorial de ${v.periodo} para ${v.redes}, con ${v.frecuencia} publicaciones por semana. Prioridades: ${v.prioridades || 'las habituales de la biblioteca (servicios, recursos electrónicos, recomendados, formación)'}.
Entrega una tabla por semana con: fecha, red, formato, tema, pilar de contenido (Servicios, Recursos y recomendados, Formación, Comunidad, Cultura) y bot del enjambre que produce la pieza. Equilibra los pilares y reserva al menos una publicación semanal con la plantilla "Recomendado". Marca como [FECHA POR CONFIRMAR] cualquier fecha institucional que no conozcas con certeza.`
    },
    {
      id: 'crisis', nombre: 'Crisis y reputación', rol: 'Protocolo ante situaciones sensibles',
      desc: 'Responde quejas públicas, comentarios negativos o errores de publicación con un protocolo claro.',
      campos: [
        { id: 'situacion', label: 'Situación', type: 'textarea', placeholder: 'Ej.: varios comentarios se quejan del aire acondicionado de la sala (sin nombres ni datos personales)', required: true },
        F.redes,
        { id: 'gravedad', label: 'Gravedad percibida', type: 'select', options: ['Baja (un comentario aislado)', 'Media (varios usuarios)', 'Alta (se viraliza o involucra a la institución)'] }],
      tarea: v => `Situación en ${v.redes}: "${v.situacion}". Gravedad percibida: ${v.gravedad}.
Entrega: (1) diagnóstico y nivel de riesgo, (2) pasos inmediatos en orden con tiempos (primera hora, primer día), (3) respuesta pública empática y concreta, sin prometer lo que no está confirmado, (4) mensaje interno para la jefatura de la biblioteca, (5) qué NO hacer, (6) cuándo escalar a Comunicaciones de la UTP. Nunca recomiendes borrar comentarios críticos salvo que violen las normas de la comunidad.`
    },
    {
      id: 'accesibilidad', nombre: 'Accesibilidad e inclusión', rol: 'Contenido para todas las personas',
      desc: 'Revisa textos y piezas: texto alternativo, subtítulos, contraste y lenguaje claro e incluyente.',
      campos: [
        { id: 'contenido', label: 'Texto o descripción de la pieza', type: 'textarea', placeholder: 'Pega el copy o describe la imagen o video', required: true },
        F.redes],
      tarea: v => `Revisa este contenido para ${v.redes}: """${v.contenido}"""
Entrega: (1) problemas encontrados (lenguaje no incluyente, exceso de emojis seguidos, hashtags sin mayúscula inicial por palabra, siglas sin explicar, texto en imagen sin alternativa), señalados sin corregirlos en silencio; (2) versión corregida; (3) texto alternativo de máximo 125 caracteres; (4) recomendaciones de subtítulos y contraste usando la paleta de marca (indica qué combinaciones de la paleta cumplen contraste para texto, p. ej. azul marino #003060 sobre gris claro #F0F0F0).`
    },
    {
      id: 'embajadores', nombre: 'Embajadores y alianzas', rol: 'Colaboraciones en el campus',
      desc: 'Propone colaboraciones con semilleros, facultades, Bienestar y estudiantes influyentes.',
      campos: [F.tema, F.redes,
        { id: 'aliado', label: 'Aliado posible', type: 'select', options: ['Semilleros de investigación', 'Facultades o programas', 'Bienestar Universitario', 'Estudiantes creadores de contenido', 'Otras bibliotecas o redes', 'Por definir'] }],
      tarea: v => `Propón una colaboración en ${v.redes} con "${v.aliado}" alrededor de "${v.tema}".
Entrega: (1) concepto de la colaboración y beneficio para ambas partes, (2) formato (colab de Instagram, reel conjunto, toma de cuenta, reto), (3) mensaje de invitación al aliado listo para enviar, (4) lineamientos de marca que el aliado debe respetar (logo, paleta, tono), (5) cómo medir el resultado. No uses nombres de personas reales; deja [NOMBRE] donde corresponda.`
    }
  ];

  return { IDENTIDAD, REDES, BOTS, bloqueIdentidad };
})();
