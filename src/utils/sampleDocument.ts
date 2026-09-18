import { DocumentData, PageImage } from '../types';

export function createSampleUtpDocument(): DocumentData {
  const pages: PageImage[] = [];
  const texts: string[] = [];
  const resolutions: number[] = [];

  const samplePagesData = [
    {
      title: 'BOLETÍN CIENTÍFICO E INSTITUCIONAL',
      subtitle: 'Vicerrectoría de Investigación, Innovación y Extensión',
      tag: 'Publicación Oficial UTP — Edición Especial',
      content: [
        'Universidad Tecnológica de Pereira',
        'Biblioteca e Información Científica (BIC)',
        'Pereira, Risaralda, Colombia',
        'La Universidad Tecnológica de Pereira presenta este boletín como parte de la estrategia de divulgación científica y preservación del patrimonio bibliográfico.',
        'Este visor interactivo flipbook permite a la comunidad académica consultar memorias, revistas científicas, tesis y documentos institucionales con una experiencia inmersiva de lectura digital.'
      ],
      pageNumber: '1',
      bgGrad: ['#00204A', '#003DA5'],
      isCover: true
    },
    {
      title: 'SERVICIOS DE INFORMACIÓN CIENTÍFICA',
      subtitle: 'Recursos para docentes, investigadores y estudiantes',
      tag: 'Biblioteca e Información Científica',
      content: [
        '1. Acceso a Bases de Datos Especializadas: Scopus, Web of Science, ScienceDirect, IEEE Xplore y SpringerLink.',
        '2. Repositorio Institucional UTP: Preservación digital de tesis de pregrado y posgrado, patentes y artículos.',
        '3. Asesoría en Normalización y Citación: Capacitaciones en normas APA 7a edición, IEEE y Vancouver.',
        '4. Apoyo a la Publicación en Acceso Abierto: Orientación sobre revistas indexadas en Publindex, Scimago (SJR) y JCR.'
      ],
      pageNumber: '2',
      bgGrad: ['#ffffff', '#f8fafc'],
      isCover: false
    },
    {
      title: 'GRUPOS Y LÍNEAS DE INVESTIGACIÓN',
      subtitle: 'Generación de nuevo conocimiento con impacto regional y global',
      tag: 'Investigación UTP',
      content: [
        '• Biotecnología y Biodiversidad del Eje Cafetero: aprovechamiento sostenible de recursos naturales.',
        '• Ingeniería, Robótica y Sistemas Inteligentes: desarrollo tecnológico para la industria 4.0.',
        '• Salud y Ciencias Biomédicas: epidemiología, salud pública y medicina tropical.',
        '• Ciencias Ambientales y Gestión del Agua: conservación de cuencas hidrográficas y cambio climático.',
        '• Ciencias Sociales, Educación y Humanidades: pedagogía y memoria regional.'
      ],
      pageNumber: '3',
      bgGrad: ['#ffffff', '#f8fafc'],
      isCover: false
    },
    {
      title: 'GUÍA DE DIGITALIZACIÓN Y FORMATOS',
      subtitle: 'Estándares para la publicación en flipbook digital',
      tag: 'Políticas Institucionales',
      content: [
        'Resolución recomendada: Documentos PDF vectoriales o exportados a 300 DPI.',
        'Preservación de hipervínculos y estructura semántica de títulos.',
        'Compatibilidad multiplataforma: El flipbook se adapta automáticamente a computadores de escritorio, tabletas y teléfonos móviles.',
        'Exportación local: Cada usuario puede descargar el flipbook como archivo HTML autocontenido para compartirlo sin necesidad de servidores.'
      ],
      pageNumber: '4',
      bgGrad: ['#ffffff', '#f8fafc'],
      isCover: false
    },
    {
      title: 'CONTACTO Y CRÉDITOS',
      subtitle: 'Universidad Tecnológica de Pereira — Campus La Julita',
      tag: 'Directorio BIC UTP',
      content: [
        'Vicerrectoría de Investigación, Innovación y Extensión',
        'Biblioteca e Información Científica (BIC)',
        'Sitio Web Institucional: www.utp.edu.co',
        'Pereira — Risaralda — Colombia',
        'Diseñado para promover el libre acceso al conocimiento académico e investigativo.'
      ],
      pageNumber: '5',
      bgGrad: ['#00204A', '#0f2b5c'],
      isCover: true
    }
  ];

  const canvasWidth = 800;
  const canvasHeight = 1131; // Aspect ratio ~ A4 (1.414)

  samplePagesData.forEach((pData, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, pData.bgGrad[0]);
    grad.addColorStop(1, pData.bgGrad[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (pData.isCover) {
      // Cover page styling
      ctx.fillStyle = '#F2A900';
      ctx.fillRect(0, 0, canvasWidth, 16);

      // Gold badge
      ctx.fillStyle = '#F2A900';
      ctx.beginPath();
      ctx.roundRect(60, 80, 360, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#00204A';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.tag, 78, 104);

      // Main Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.title, 60, 200);

      // Subtitle
      ctx.fillStyle = '#d7e2f5';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.subtitle, 60, 246);

      // Divider
      ctx.fillStyle = '#F2A900';
      ctx.fillRect(60, 280, 160, 4);

      // Decorative vector geometry
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (let r = 100; r <= 360; r += 50) {
        ctx.beginPath();
        ctx.arc(680, 500, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Content blocks
      ctx.fillStyle = '#f0f4ff';
      ctx.font = '19px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      let y = 370;
      pData.content.forEach((line) => {
        // wrap text if needed
        const words = line.split(' ');
        let currentLine = '';
        words.forEach((w) => {
          const testLine = currentLine ? currentLine + ' ' + w : w;
          if (ctx.measureText(testLine).width > 680) {
            ctx.fillText(currentLine, 60, y);
            y += 32;
            currentLine = w;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) {
          ctx.fillText(currentLine, 60, y);
          y += 42;
        }
      });

      // Footer
      ctx.fillStyle = '#9bb6e5';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('Universidad Tecnológica de Pereira · ' + (index === 0 ? 'Portada' : 'Contraportada'), 60, canvasHeight - 50);
      ctx.fillText(pData.pageNumber, canvasWidth - 80, canvasHeight - 50);
    } else {
      // Inner page styling
      // Top header bar
      ctx.fillStyle = '#003DA5';
      ctx.fillRect(0, 0, canvasWidth, 8);

      // Top running header
      ctx.fillStyle = '#5b6b81';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('UNIVERSIDAD TECNOLÓGICA DE PEREIRA — BIC', 60, 48);
      ctx.fillText('Pág. ' + pData.pageNumber, canvasWidth - 110, 48);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 62);
      ctx.lineTo(canvasWidth - 60, 62);
      ctx.stroke();

      // Category Tag
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.roundRect(60, 90, 260, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#003DA5';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.tag.toUpperCase(), 72, 109);

      // Title
      ctx.fillStyle = '#16202e';
      ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.title, 60, 164);

      // Subtitle
      ctx.fillStyle = '#4a5568';
      ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(pData.subtitle, 60, 202);

      // Gold accent bar
      ctx.fillStyle = '#F2A900';
      ctx.fillRect(60, 222, 90, 4);

      // Content blocks inside styled cards
      let y = 265;
      pData.content.forEach((line) => {
        // card background
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(60, y, canvasWidth - 120, 80, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        
        // Wrap text
        const words = line.split(' ');
        let line1 = '';
        let line2 = '';
        words.forEach((w) => {
          if (ctx.measureText(line1 + ' ' + w).width < 640 && !line2) {
            line1 = line1 ? line1 + ' ' + w : w;
          } else {
            line2 = line2 ? line2 + ' ' + w : w;
          }
        });

        ctx.fillText(line1, 80, y + 36);
        if (line2) {
          ctx.fillStyle = '#475569';
          ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillText(line2, 80, y + 62);
        }

        y += 105;
      });

      // Bottom footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('Vicerrectoría de Investigación · Biblioteca e Información Científica (BIC)', 60, canvasHeight - 40);
      ctx.fillText(pData.pageNumber, canvasWidth - 80, canvasHeight - 40);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    pages.push({ src: dataUrl, w: canvasWidth, h: canvasHeight });
    resolutions.push(2.0);
    texts.push((pData.title + ' ' + pData.subtitle + ' ' + pData.content.join(' ')).toLowerCase());
  });

  const dummyBlob = new Blob(['%PDF-1.4 UTP Sample Document'], { type: 'application/pdf' });
  const dummyFile = new File([dummyBlob], 'Boletin_Institucional_BIC_UTP.pdf', { type: 'application/pdf' });

  return {
    file: dummyFile,
    name: 'Boletin_Institucional_BIC_UTP.pdf',
    totalPages: pages.length,
    pages,
    texts,
    resolutions
  };
}
