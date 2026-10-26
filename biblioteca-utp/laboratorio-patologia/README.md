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
| `index.html` | Página completa: turno de urgencias gamificado, modelo anatómico 3D, «Define tu enfermedad», consulta, sala de lectura radiológica, vademécum del turno, progreso y autoevaluación. |
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
- Three.js y las fuentes (Noto Sans, Atkinson Hyperlegible y Noto Sans Mono)
  se cargan desde `../comun/` en el mismo repositorio, según los lineamientos
  del CRIE; no se usan CDN ni Google Fonts.

## Qué revisar en las pruebas con el médico general

1. Los seis casos del turno de urgencias: signos vitales por estadio,
   resultados de laboratorio, intervenciones correctas y dañinas, metas de
   tiempo y destino.
2. La clasificación de triage esperada para cada caso (Resolución 5596 de 2015).
3. La lectura de las radiografías y la identificación del órgano en el avatar.
4. La claridad para estudiantes de pregrado y la exigencia para posgrado.
5. Las 18 fichas del vademécum: usos y precauciones de cada medicamento y su
   coherencia con las intervenciones correctas y dañinas de cada caso.

## Vademécum del turno

Sección «Vademécum» y ventana dentro del turno (botón en la barra y junto a
«Intervenciones»). Tiene una ficha por cada medicamento o hemoderivado que se
puede ordenar: para qué se usa, precauciones, término de búsqueda en inglés,
fuente y una ecuación de búsqueda que abre siete recursos de la UTP con la búsqueda
hecha. Al final
están los recursos electrónicos de la UTP para Ciencias de la Salud agrupados
por uso.

- En pregrado el turno se pausa mientras la ventana está abierta; en posgrado
  el reloj sigue corriendo.
- Cada ficha abierta durante el turno queda en el registro y llega al Panel
  docente como acción del médico líder. No suma ni resta puntos.
- Los enlaces pasan por el proxy de la biblioteca (`proxyutp.elogim.com`) y
  piden el usuario del correo institucional. Se tomaron de la página
  [Facultad Ciencias de la Salud](https://biblioteca.utp.edu.co/recursos-electronicos/369/facultad-ciencias-de-la-salud/)
  (actualizada el 20 de abril de 2026). Si la biblioteca cambia un enlace, se
  actualiza en `VD_RES` dentro de `app.js` (o en la fuente del laboratorio).
- Las fichas no dan dosis: remiten a la fuente para verificarlas.

### Búsqueda directa en los recursos

Cada ficha pregunta qué necesita el estudiante (dosis y administración,
contraindicaciones y efectos adversos, interacciones o evidencia en el cuadro
clínico) y arma la ecuación de búsqueda con sinónimos unidos por OR y el
aspecto pedido con AND, por ejemplo
`(alteplase OR "tissue plasminogen activator") AND (contraindications OR "adverse effects")`.

| Recurso | Cómo llega la búsqueda |
|---|---|
| MEDLINE Complete | Ecuación completa en inglés (EBSCOhost, `db=mdc`, `bquery`) |
| MedicLatina | Ecuación completa en español (EBSCOhost, `db=lth`, `bquery`) |
| Scopus | Ecuación dentro de `TITLE-ABS-KEY( )` |
| AccessMedicina | Medicamento y aspecto en español (`searchresults.aspx?q=`) |
| ClinicalKey | Medicamento y aspecto en inglés (`#!/search/`) |
| DynaMed y Micromedex | No aceptan búsqueda por enlace a través del proxy: el botón copia la búsqueda y abre el recurso para pegarla |

Si el estudiante escribe un término que no tiene ficha (por ejemplo,
warfarina), el vademécum ofrece buscarlo directamente en AccessMedicina,
ClinicalKey, MedicLatina, MEDLINE Complete y Micromedex. Cada búsqueda hecha
durante el turno queda en el registro y llega al Panel docente.

Pendiente: probar cada enlace con una cuenta institucional, porque las
direcciones de búsqueda pasan por el proxy de la biblioteca y solo responden
después de iniciar sesión.

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
