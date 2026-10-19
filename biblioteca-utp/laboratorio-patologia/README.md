# Laboratorio de Patología Médica (versión provisional para pruebas)

Laboratorio virtual de la Biblioteca e Información Científica (BIC) de la
Universidad Tecnológica de Pereira, en el marco de la estrategia de
gamificación de la alfabetización digital. Esta carpeta es un **alojamiento
provisional en GitHub Pages** para que un médico general pruebe y revise el
contenido clínico antes de su validación por la Facultad de Ciencias de la
Salud.

> Recurso didáctico. No es una herramienta de diagnóstico ni reemplaza el
> criterio clínico ni la consulta de las guías originales.

## Qué contiene

| Archivo | Uso |
|---|---|
| `index.html` | Página completa: turno de urgencias gamificado, modelo anatómico 3D, «Define tu enfermedad», consulta, sala de lectura radiológica, progreso y autoevaluación. |
| `models/m.json`, `models/f.json` | Índice de los modelos 3D masculino y femenino. |
| `models/m.b64.txt`, `models/f.b64.txt` | Geometría 3D comprimida (gzip en base64) que la página descarga y descomprime en el navegador. |

## Cómo verlo

Con GitHub Pages activado sobre la rama `main` (carpeta raíz), la dirección es:

`https://mauriciocantor-rgb.github.io/Flip/biblioteca-utp/laboratorio-patologia/`

Para activarlo: *Settings → Pages → Build and deployment → Source: Deploy
from a branch → Branch: `main` / `(root)` → Save*. La primera publicación
tarda unos minutos.

## Diferencias con la versión en Claude

- **«Define tu enfermedad» con IA no funciona fuera de claude.ai**: usa la
  capacidad `sample` de Claude Artifacts. La página lo detecta y deja
  disponible el constructor manual.
- El progreso (VX, insignias y tabla de clasificación) se guarda solo en el
  navegador de cada persona (`localStorage`).
- Requiere conexión a internet para Three.js (cdnjs) y las fuentes de Google.

## Qué revisar en las pruebas con el médico general

1. Los seis casos del turno de urgencias: signos vitales por estadio,
   resultados de laboratorio, intervenciones correctas y dañinas, metas de
   tiempo y destino.
2. La clasificación de triage esperada para cada caso (Resolución 5596 de 2015).
3. La lectura de las radiografías y la identificación del órgano en el avatar.
4. La claridad para estudiantes de pregrado y la exigencia para posgrado.

## Fuentes de los modelos y las imágenes (licencias)

- **Modelos 3D masculino y femenino**: Human Reference Atlas, HuBMAP CCF 3D
  Reference Object Library (Browne, Schlehlein, Herr II, Quardokus, Bueckle y
  Börner, 2022), con datos del Visible Human Project de la National Library
  of Medicine. Licencia **CC BY 4.0**. Simplificados y reempaquetados para la
  web.
- **Estómago**: derivado de Z-Anatomy (Kervyn y Zielinski), a su vez derivado
  de BodyParts3D (The Database Center for Life Science). El modelo derivado se
  distribuye bajo **CC BY-SA 4.0**.
- **Radiografías del reto de lectura**: casos de Radiopaedia obtenidos de la
  COVID-19 Image Data Collection (Cohen et al., 2020), licencia
  **CC BY-NC-SA**. Uso educativo, sin fines comerciales.

Las fuentes clínicas de cada caso están en la sección «Referencias» de la
página.
