/*
  Turno de urgencias · Laboratorio de Patología Médica · Biblioteca e Información Científica (BIC) · UTP
  Código del laboratorio (versión CRIE: HTML, CSS y JavaScript separados).
  Se carga después de ../comun/js/config.js, ../comun/vendor/qrcode-generator.js
  y ../comun/js/bic-sesion.js (conexión con el Panel docente) y de three.js r128.
*/

/* ---------- Estilos dinámicos sin estilos en línea (CSP del CRIE) ----------
   Las plantillas que necesitan un ancho o un color calculado escriben
   data-css="propiedad:valor"; este observador lo aplica con CSSOM
   (element.style.setProperty), que la CSP sí permite. Solo acepta propiedades
   de presentación de la lista. */
(function(){
  const PERMITIDAS=new Set(['width','height','background','background-color','color','border-color','display','font-size','font-family','margin-top','transition','justify-content','gap','flex-wrap','align-items','left','top','opacity']);
  const aplicar=el=>{const d=el.getAttribute('data-css');if(d==null)return;el.removeAttribute('data-css');
    d.split(';').forEach(p=>{const i=p.indexOf(':');if(i<1)return;const k=p.slice(0,i).trim().toLowerCase(),v=p.slice(i+1).trim();if(PERMITIDAS.has(k)&&!/url\(|expression|javascript:/i.test(v))el.style.setProperty(k,v);});};
  const barrer=r=>{if(r.nodeType!==1)return;if(r.hasAttribute('data-css'))aplicar(r);r.querySelectorAll('[data-css]').forEach(aplicar);};
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='attributes')aplicar(m.target);else m.addedNodes.forEach(barrer);})).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-css']});
  barrer(document.body);
})();

(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}

/* ================= Sources ================= */
const SRC={
  oms_tb:{t:'Organización Mundial de la Salud. Tuberculosis. Nota descriptiva.',u:'https://www.who.int/news-room/fact-sheets/detail/tuberculosis',k:'OMS'},
  oms_hbv:{t:'Organización Mundial de la Salud. Hepatitis B. Nota descriptiva.',u:'https://www.who.int/news-room/fact-sheets/detail/hepatitis-b',k:'OMS'},
  sp_cap:{t:'Regunath, H. y Oba, Y. (2024). Community-Acquired Pneumonia. En StatPearls. StatPearls Publishing; NCBI Bookshelf.',u:'https://www.ncbi.nlm.nih.gov/books/NBK430749/',k:'StatPearls'},
  sp_stemi:{t:'Akbar, H. y Sharma, S. (2024). Acute ST-Segment Elevation Myocardial Infarction (STEMI). En StatPearls. StatPearls Publishing; NCBI Bookshelf.',u:'https://www.ncbi.nlm.nih.gov/books/NBK532281/',k:'StatPearls'},
  sp_panc:{t:'Wang, C. F., Tariq, A. y Chandra, S. (2025). Acute Pancreatitis. En StatPearls. StatPearls Publishing; NCBI Bookshelf.',u:'https://www.ncbi.nlm.nih.gov/books/NBK482468/',k:'StatPearls'},
  msd_acv:{t:'Alexandrov, A. V. y Krishnaiah, B. (2025). Accidente cerebrovascular isquémico. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-neurol%C3%B3gicos/accidente-cerebrovascular/accidente-cerebrovascular-isqu%C3%A9mico',k:'Manual MSD'},
  msd_ulc:{t:'Vakil, N. (2025). Enfermedad ulcerosa péptica. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-gastrointestinales/gastritis-y-enfermedad-ulcerosa-p%C3%A9ptica/enfermedad-ulcerosa-p%C3%A9ptica',k:'Manual MSD'},
  msd_hp:{t:'Vakil, N. (2025). Infección por Helicobacter pylori. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-gastrointestinales/gastritis-y-enfermedad-ulcerosa-p%C3%A9ptica/infecci%C3%B3n-por-helicobacter-pylori',k:'Manual MSD'},
  msd_cir:{t:'Lee, T. H. (2026). Cirrosis. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-hep%C3%A1ticos-y-biliares/fibrosis-y-cirrosis/cirrosis',k:'Manual MSD'},
  msd_itu:{t:'Imam, T. H. (2026). Infecciones urinarias bacterianas. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-urogenitales/infecciones-urinarias/infecciones-urinarias-iu-bacterianas',k:'Manual MSD'},
  burb_pna:{t:'Burbridge, B. y Mah, E. Pneumonia. En Undergraduate Diagnostic Imaging Fundamentals. University of Saskatchewan; LibreTexts.',u:'https://med.libretexts.org/Bookshelves/Allied_Health/Undergraduate_Diagnostic_Imaging_Fundamentals_(Burbridge_and_Mah)/09%3A_Chest/9.06%3A_Pneumonia',k:'Burbridge y Mah'},
  burb_eff:{t:'Burbridge, B. y Mah, E. Pleural Effusion. En Undergraduate Diagnostic Imaging Fundamentals. University of Saskatchewan; LibreTexts.',u:'https://med.libretexts.org/Bookshelves/Allied_Health/Undergraduate_Diagnostic_Imaging_Fundamentals_(Burbridge_and_Mah)/09%3A_Chest/9.05%3A_Pleural_Effusion',k:'Burbridge y Mah'},
  burb_ptx:{t:'Burbridge, B. y Mah, E. Pneumothorax. En Undergraduate Diagnostic Imaging Fundamentals. University of Saskatchewan; LibreTexts.',u:'https://med.libretexts.org/Bookshelves/Allied_Health/Undergraduate_Diagnostic_Imaging_Fundamentals_(Burbridge_and_Mah)/09%3A_Chest/9.07%3A_Pneumothorax',k:'Burbridge y Mah'},
  rp_ctr:{t:'Bell, D. J., Gaillard, F. et al. Cardiothoracic ratio. Radiopaedia.',u:'https://radiopaedia.org/articles/cardiothoracic-ratio',k:'Radiopaedia'},
  calgary:{t:'The Calgary Guide to Understanding Disease. Acute MCA-Territory Ischemic Stroke: Findings on Non-Contrast CT. University of Calgary.',u:'https://calgaryguide.ucalgary.ca/?p=3827',k:'Calgary Guide'},
  msd_hic:{t:'Alexandrov, A. V. y Krishnaiah, B. (2025). Hemorragia intracerebral. Manual MSD, versión para profesionales.',u:'https://www.msdmanuals.com/es/professional/trastornos-neurol%C3%B3gicos/accidente-cerebrovascular/hemorragia-intracerebral',k:'Manual MSD'},
  msd_tbrx:{t:'Manual MSD. Tuberculosis (chest radiograph) [imagen con lesión cavitada en el lóbulo superior derecho].',u:'https://www.msdmanuals.com/professional/multimedia/image/tuberculosis-chest-radiograph',k:'Manual MSD'},
  sp_hs:{t:'Ballard, K., Sathe, N. C. y Shuman, V. L. (2024). Hidradenitis Suppurativa. En StatPearls. StatPearls Publishing; NCBI Bookshelf.',u:'https://www.ncbi.nlm.nih.gov/books/NBK534867/',k:'StatPearls'},
  donghia:{t:"D'Onghia, M., Malvaso, D., Galluccio, G., Antonelli, F., Coscarella, G., Rubegni, P., Peris, K. y Calabrese, L. (2024). Evidence on hidradenitis suppurativa as an autoinflammatory skin disease. Journal of Clinical Medicine, 13(17), 5211.",u:'https://doi.org/10.3390/jcm13175211',k:"D'Onghia et al., 2024"},
  gau:{t:'Gau, S.-Y. et al. (2022). Risk of liver dysfunction and non-alcoholic fatty liver diseases in people with hidradenitis suppurativa: A systematic review and meta-analysis of real-world evidences. Frontiers in Immunology, 13, 959691.',u:'https://doi.org/10.3389/fimmu.2022.959691',k:'Gau et al., 2022'},
  gonzalez:{t:'González-Villanueva, I. et al. (2020). Hidradenitis suppurativa is associated with non-alcoholic fatty liver disease: A cross-sectional study. Acta Dermato-Venereologica, 100.',u:'https://doi.org/10.2340/00015555-3597',k:'González-Villanueva et al., 2020'},
  frings:{t:'Frings, V. et al. (2025). High prevalence of metabolic dysfunction-associated steatotic liver disease in patients with hidradenitis suppurativa: A guide to easily assess the clinical risk of comorbid liver disease. JID Innovations.',u:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12590143/',k:'Frings et al., 2025'},
  rinella:{t:'Rinella, M. E. et al. (2023). A multisociety Delphi consensus statement on new fatty liver disease nomenclature. Hepatology, 78(6), 1966-1986.',u:'https://doi.org/10.1097/HEP.0000000000000520',k:'Rinella et al., 2023'},
  hra:{t:'Browne, K., Schlehlein, H., Herr II, B. W., Quardokus, E., Bueckle, A. y Börner, K. (2022). HuBMAP CCF 3D Reference Object Library [modelos 3D de referencia, Visible Human Male y Female, National Library of Medicine]. Human Reference Atlas. Licencia CC BY 4.0.',u:'https://humanatlas.io/3d-reference-library',k:'HRA'},
  zanat:{t:'Kervyn, G. y Zielinski, M. Z-Anatomy: The libre 3D atlas of anatomy. Licencia CC BY-SA 4.0; modelos derivados de BodyParts3D, The Database Center for Life Science (CC BY-SA 2.1 Japón).',u:'https://github.com/Z-Anatomy/Models-of-human-anatomy',k:'Z-Anatomy'},
  res5596:{t:'Ministerio de Salud y Protección Social. (2015). Resolución 5596 de 2015, por la cual se definen los criterios técnicos para el sistema de selección y clasificación de pacientes en los servicios de urgencias (triage).',u:'https://normograma.supersalud.gov.co/compilacion/docs/resolucion_minsaludps_5596_2015.htm',k:'Res. 5596/2015'},
  who_bec:{t:'Organización Mundial de la Salud y Comité Internacional de la Cruz Roja. (2018). Basic emergency care: Approach to the acutely ill and injured.',u:'https://www.icrc.org/en/publication/basic-emergency-care-approach-acutely-ill-and-injured',k:'OMS, BEC'},
  news2:{t:'Royal College of Physicians. (2017). National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS.',u:null,k:'NEWS2'},
  dengue_col:{t:'Ministerio de la Protección Social, Instituto Nacional de Salud y OPS/OMS. (2010). Guía de atención clínica integral del paciente con dengue.',u:'https://www3.paho.org/col/dmdocuments/Guia%20atencion%20clinica%20dengue%20180210.pdf',k:'Guía dengue 2010'},
  who_arbo:{t:'Organización Mundial de la Salud. (2025). WHO guidelines for clinical management of arboviral diseases: dengue, chikungunya, Zika and yellow fever.',u:'https://www.who.int/publications/i/item/9789240111110',k:'OMS 2025'},
  sepsis3:{t:'Singer, M. et al. (2016). The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA, 315(8), 801-810.',u:'https://doi.org/10.1001/jama.2016.0287',k:'Sepsis-3'},
  ssc2021:{t:'Evans, L. et al. (2021). Surviving Sepsis Campaign: International guidelines for management of sepsis and septic shock 2021. Critical Care Medicine, 49(11), e1063-e1143.',u:'https://doi.org/10.1097/CCM.0000000000005337',k:'SSC 2021'},
  esc_acs:{t:'Byrne, R. A. et al. (2023). 2023 ESC Guidelines for the management of acute coronary syndromes. European Heart Journal, 44(38), 3720-3826.',u:'https://doi.org/10.1093/eurheartj/ehad191',k:'ESC 2023'},
  aha_stroke:{t:'Powers, W. J. et al. (2019). Guidelines for the early management of patients with acute ischemic stroke: 2019 update. Stroke, 50(12), e344-e418.',u:'https://doi.org/10.1161/STR.0000000000000211',k:'AHA/ASA 2019'},
  bts_o2:{t:"O'Driscoll, B. R., Howard, L. S., Earis, J. y Mak, V. (2017). BTS guideline for oxygen use in adults in healthcare and emergency settings. Thorax, 72(Suppl 1), ii1-ii90.",u:'https://doi.org/10.1136/thoraxjnl-2016-209729',k:'BTS 2017'},
  metlay2019:{t:'Metlay, J. P. et al. (2019). Diagnosis and treatment of adults with community-acquired pneumonia: An official clinical practice guideline of the American Thoracic Society and Infectious Diseases Society of America. American Journal of Respiratory and Critical Care Medicine, 200(7), e45-e67.',u:'https://doi.org/10.1164/rccm.201908-1581ST',k:'ATS/IDSA 2019'},
  who_preterm:{t:'Organización Mundial de la Salud. (2015). WHO recommendations on interventions to improve preterm birth outcomes.',u:'https://www.who.int/publications/i/item/9789241508988',k:'OMS 2015'},
  utp_salud:{t:'Biblioteca e Información Científica, Universidad Tecnológica de Pereira. (2026). Recursos electrónicos: Facultad Ciencias de la Salud. Consultado el 26 de octubre de 2026.',u:'https://biblioteca.utp.edu.co/recursos-electronicos/369/facultad-ciencias-de-la-salud/',k:'BIC UTP'},
  dka2024:{t:'Umpierrez, G. E. et al. (2024). Hyperglycemic crises in adults with diabetes: A consensus report. Diabetes Care, 47(8), 1257-1275.',u:'https://doi.org/10.2337/dci24-0032',k:'Consenso 2024'},
  who_pe:{t:'Organización Mundial de la Salud. (2011). WHO recommendations for prevention and treatment of pre-eclampsia and eclampsia.',u:'https://www.who.int/publications/i/item/9789241548335',k:'OMS 2011'},
  cohen:{t:'Cohen, J. P., Morrison, P., Dao, L., Roth, K., Duong, T. Q. y Ghassemi, M. (2020). COVID-19 image data collection: Prospective predictions are the future. arXiv:2006.11988. Radiografías de casos de Radiopaedia (CC BY-NC-SA 3.0) usadas en el reto de lectura.',u:'https://github.com/ieee8023/covid-chestxray-dataset',k:'Cohen et al., 2020'},
  robbins:{t:'Kumar, V., Abbas, A. K. y Aster, J. C. Robbins y Cotran. Patología estructural y funcional (10.ª ed.). Elsevier. Texto de referencia para el aspecto macroscópico; consulta la edición disponible en la biblioteca.',u:null,k:'Robbins'}
};

/* ================= Organs ================= */
const ORG={
  cerebro:{name:'Cerebro',c:'#E2B1AB',d:'#B07D77',cx:210,cy:150,
    path:'M70 175 C58 105 120 42 210 40 C300 38 355 98 350 160 C347 200 325 225 292 228 C272 258 232 262 202 248 C172 262 122 255 97 232 C78 216 72 197 70 175 Z',
    lc:{x:200,y:150,rx:72,ry:46,rot:-0.3}},
  pulmon:{name:'Pulmones',c:'#E6A29F',d:'#B46A68',cx:200,cy:160,
    path:'M150 42 C120 42 82 110 72 180 C64 235 72 275 97 280 C132 285 167 275 182 262 C187 200 182 110 172 62 Z M250 42 C280 42 318 110 328 180 C336 235 328 275 303 280 C268 285 240 278 222 265 C230 240 215 225 228 200 C225 150 222 100 230 62 Z',
    lc:{x:112,y:228,rx:56,ry:46,rot:0}},
  corazon:{name:'Corazón',c:'#C4454D',d:'#8E2A33',cx:200,cy:170,
    path:'M205 64 C150 42 88 74 95 144 C100 207 162 252 215 292 C252 244 308 198 302 132 C298 72 248 52 205 64 Z',
    lc:{x:232,y:208,rx:50,ry:44,rot:0.2}},
  higado:{name:'Hígado',c:'#8C3A2F',d:'#5E231B',cx:195,cy:140,
    path:'M40 120 C60 60 200 40 330 70 C362 78 366 106 340 126 C290 162 230 182 170 212 C120 236 70 236 50 200 C35 175 32 145 40 120 Z',
    lc:{x:180,y:130,rx:110,ry:60,rot:0}},
  estomago:{name:'Estómago',c:'#E3A285',d:'#AF6F58',cx:210,cy:150,
    path:'M150 42 C162 40 176 46 179 62 C186 110 230 128 270 138 C312 148 334 190 302 226 C270 256 200 252 160 226 C110 196 100 140 115 92 C120 66 132 46 150 42 Z',
    lc:{x:214,y:154,rx:30,ry:30,rot:0}},
  pancreas:{name:'Páncreas',c:'#E6C07C',d:'#B58C4A',cx:200,cy:170,
    path:'M64 170 C72 140 112 130 152 140 C202 152 252 146 302 120 C332 108 352 120 347 140 C337 166 302 176 262 181 C212 189 162 201 122 211 C87 219 58 201 64 170 Z',
    lc:{x:200,y:170,rx:120,ry:30,rot:-0.15}},
  rinon:{name:'Riñón',c:'#9A3E3B',d:'#6B2624',cx:215,cy:160,
    path:'M205 40 C275 40 305 110 300 170 C295 240 255 290 200 285 C155 280 135 240 165 215 C185 200 185 170 165 150 C135 125 145 40 205 40 Z',
    lc:{x:235,y:160,rx:50,ry:90,rot:0}}
};
ORG.piel={name:'Piel',c:'#E8B496',d:'#B57B5E',cx:210,cy:176,path:'M30 60 L390 60 L390 292 L30 292 Z',lc:{x:200,y:150,rx:130,ry:60,rot:0}};
ORG.reproductor={name:'Aparato reproductor',c:'#D9908A',d:'#A85E58',cx:210,cy:160};
ORG.mama={name:'Glándula mamaria',c:'#F2D2B0',d:'#C29A78',cx:210,cy:160};
const ORG_ORDER=['cerebro','pulmon','corazon','higado','estomago','pancreas','rinon','piel','reproductor','mama'];
const EXPLORE=ORG_ORDER.filter(k=>k!=='mama');
function orgName(k){if(k==='reproductor')return typeof V3!=='undefined'&&V3.sex==='f'?'Aparato reproductor femenino':'Aparato reproductor masculino';return ORG[k].name;}
function availableOrgans(){return ORG_ORDER.filter(k=>k!=='mama'||(typeof V3!=='undefined'&&V3.sex==='f'));}

const LESIONS={consolidacion:'Consolidación',cavitacion:'Cavitación y granulomas',infarto:'Necrosis isquémica (infarto)',hepatitis:'Inflamación difusa con ictericia',cirrosis:'Fibrosis con nódulos de regeneración',ulcera:'Úlcera',abscesos:'Abscesos',isquemia:'Infarto cerebral (isquemia)',pancreatitis:'Edema, hemorragia y necrosis grasa',inflamacion:'Inflamación (congestión y edema)',fibrosis:'Fibrosis',nodulos:'Nódulos o masas',hemorragia:'Hemorragia',necrosis:'Necrosis',edema:'Edema',hidradenitis:'Oclusión folicular, abscesos y túneles (Hurley)',esteatosis:'Esteatosis (hígado graso)'};
const GENERIC_LES=['inflamacion','edema','abscesos','nodulos','fibrosis','hemorragia','necrosis','consolidacion','ulcera','infarto'];

/* ================= Diseases ================= */
const ROUTES={
  aerea:{t:'Inhalación por vía aérea',pts:[[150,96],[150,150],[122,200]]},
  aerea_apex:{t:'Inhalación de gotitas suspendidas en el aire',pts:[[150,96],[150,150],[128,170]]},
  coronaria:{t:'Trombo en una arteria coronaria',pts:[[160,178],[156,200],[166,226]]},
  embolia:{t:'Émbolo desde el corazón hacia una arteria cerebral',pts:[[162,222],[158,180],[150,120],[140,60]]},
  sangre:{t:'Sangre y fluidos corporales (vía parenteral, sexual, perinatal)',pts:[[150,380],[142,330],[140,280]]},
  toxica:{t:'Agresión crónica (alcohol, virus o metabolismo) que llega por la circulación portal',pts:[[160,340],[150,300],[138,278]]},
  oral:{t:'Vía oral, colonización de la mucosa gástrica',pts:[[150,96],[150,200],[176,264],[188,290]]},
  biliar:{t:'Obstrucción por un cálculo biliar en la desembocadura común',pts:[[132,286],[146,302],[160,310]]},
  ascendente:{t:'Vía ascendente: uretra, vejiga y uréter',pts:[[150,392],[136,374],[120,358]]},
  folicular:{t:'No es una infección: oclusión del folículo piloso en zonas de pliegues (axilas, ingles), favorecida por tabaquismo, obesidad y fricción',pts:[[236,146],[230,160]]}
};

const DIS=[
 {id:'neumonia',name:'Neumonía adquirida en la comunidad',organ:'pulmon',lesion:'consolidacion',route:'aerea',infectious:true,
  agent:'Bacterias como Streptococcus pneumoniae y Haemophilus influenzae; también virus respiratorios (rinovirus, influenza).',
  mech:'Los microorganismos alcanzan los alvéolos, que se llenan de exudado inflamatorio y pierden aire.',
  macro:'Consolidación de un lóbulo o de segmentos: el pulmón se vuelve firme, rojo y luego gris (hepatización), sin aire en la zona afectada.',
  sx:['Fiebre y escalofríos','Tos con expectoración purulenta','Disnea y dolor torácico pleurítico'],
  dx:['Radiografía de tórax: infiltrado o derrame','Hemograma, electrolitos, función renal y hepática','Hemocultivos y cultivo de esputo en pacientes hospitalizados'],
  tx:'Antibiótico empírico según el lugar de atención y la gravedad: monoterapia ambulatoria (macrólido, amoxicilina o doxiciclina) o betalactámico más macrólido, o fluoroquinolona respiratoria, si se hospitaliza.',
  prev:'Vacunación antineumocócica y contra la influenza.',src:['sp_cap','robbins'],
  kase:{who:'Hombre de 67 años',cc:'Tres días de fiebre, tos con expectoración purulenta y dolor en el costado derecho al respirar.',hx:'Hipertensión arterial. No fuma desde hace 10 años.',
   v:{hr:108,pa:'118/72',sp:91,fr:26,t:'38,9'},ecg:{},exam:'Crepitantes y matidez en la base del pulmón derecho.',
   res:{rx_torax:'Consolidación del lóbulo inferior derecho.',hemograma:'Leucocitosis con neutrofilia.',pcr:'Proteína C reactiva elevada.'},pert:['rx_torax','hemograma','pcr']},
  tx_opts:[['Antibiótico empírico ajustado a la gravedad (betalactámico más macrólido si se hospitaliza)',1,'Correcto: cubre a S. pneumoniae y a los atípicos, como recomienda StatPearls.'],['Solo antitusivos y reposo',0,'Una neumonía bacteriana con hipoxemia requiere antibiótico.'],['Anticoagulación plena',0,'No hay indicación de anticoagular en este cuadro.'],['Corticoide sistémico sin antibiótico',0,'El corticoide no trata la infección y puede empeorarla.']]},

 {id:'tuberculosis',name:'Tuberculosis pulmonar',organ:'pulmon',lesion:'cavitacion',route:'aerea_apex',infectious:true,
  agent:'Mycobacterium tuberculosis, bacteria que se transmite por el aire cuando una persona enferma tose, estornuda o escupe.',
  mech:'El bacilo induce una respuesta inmunitaria celular que forma granulomas con necrosis caseosa; en la reactivación se forman cavidades.',
  macro:'Granulomas blanco-amarillentos de aspecto caseoso y cavitación en el vértice del pulmón.',
  sx:['Tos prolongada, a veces con sangre','Fiebre y sudores nocturnos','Pérdida de peso, debilidad y cansancio'],
  dx:['Pruebas diagnósticas rápidas recomendadas por la OMS como prueba inicial (moleculares, resultados en 48 h)','Radiografía de tórax'],
  tx:'Esquema de cuatro fármacos (rifampicina, isoniazida, pirazinamida y etambutol) durante 4 a 6 meses. Suspenderlo antes favorece la resistencia.',
  prev:'Vacuna BCG en niños de países con alta carga; detección y tratamiento de casos y contactos.',src:['oms_tb','robbins'],
  kase:{who:'Mujer de 34 años',cc:'Tos de cuatro semanas, a veces con sangre, sudores nocturnos y pérdida de peso.',hx:'Convive con un familiar en tratamiento por tos crónica.',
   v:{hr:96,pa:'110/70',sp:95,fr:20,t:'37,9'},ecg:{},exam:'Estertores en el vértice pulmonar derecho; aspecto adelgazado.',
   res:{rx_torax:'Opacidades y una cavitación en el lóbulo superior derecho.',molecular_tb:'Se detecta M. tuberculosis, sin resistencia a rifampicina.',hemograma:'Anemia leve.'},pert:['rx_torax','molecular_tb']},
  tx_opts:[['Rifampicina, isoniazida, pirazinamida y etambutol durante 4 a 6 meses',1,'Correcto: es el esquema de la OMS para tuberculosis sensible.'],['Amoxicilina durante 7 días',0,'Los antibióticos habituales no tratan la tuberculosis.'],['Isoniazida sola',0,'La monoterapia favorece la resistencia.'],['Resección quirúrgica inmediata de la cavidad',0,'El tratamiento de primera línea es farmacológico.']]},

 {id:'iam',name:'Infarto agudo de miocardio con elevación del ST',organ:'corazon',lesion:'infarto',route:'coronaria',infectious:false,urgent:{limit:90,label:'ICP primaria idealmente en 90 minutos'},
  agent:'Rotura de una placa de ateroma con trombosis que ocluye por completo una arteria coronaria.',
  mech:'Sin flujo, el músculo cardíaco sufre necrosis que avanza del endocardio al epicardio (infarto transmural).',
  macro:'Zona pálida y moteada en la pared del ventrículo izquierdo que luego se vuelve amarillenta con un borde hiperémico; con las semanas se convierte en cicatriz.',
  sx:['Dolor torácico opresivo','Sudoración','Signos de insuficiencia cardíaca o compromiso circulatorio'],
  dx:['ECG de 12 derivaciones inmediato: elevación del ST en dos derivaciones contiguas','Troponina de alta sensibilidad por encima del percentil 99'],
  tx:'Reperfusión urgente: intervención coronaria percutánea (ICP) primaria, idealmente en 90 minutos, o fibrinólisis si no es posible a tiempo. Aspirina más un inhibidor P2Y12 y anticoagulación; luego betabloqueante y estatina de alta intensidad.',
  prev:'Control de presión arterial, lípidos, diabetes y tabaquismo.',src:['sp_stemi','robbins'],
  kase:{who:'Hombre de 58 años',cc:'Dolor opresivo detrás del esternón desde hace 40 minutos, irradiado al brazo izquierdo, con sudoración.',hx:'Fumador; dislipidemia sin tratamiento.',
   v:{hr:102,pa:'145/90',sp:95,fr:22,t:'36,8'},ecg:{st:0.32},exam:'Diaforético; ruidos cardíacos rítmicos, sin soplos.',
   res:{ecg:'Elevación del ST en V1 a V4 (cara anterior).',troponina:'Elevada por encima del percentil 99.'},pert:['ecg','troponina']},
  tx_opts:[['Reperfusión con ICP primaria, aspirina, inhibidor P2Y12 y anticoagulación',1,'Correcto: la reperfusión rápida limita la necrosis.'],['Observación y nueva troponina en 6 horas',0,'Con elevación del ST no se espera: se reperfunde de inmediato.'],['Antibiótico de amplio espectro',0,'El infarto no es una infección.'],['Oxígeno a todos los pacientes como única medida',0,'El oxígeno se reserva para la hipoxemia y no reperfunde la arteria.']]},

 {id:'hepatitisb',name:'Hepatitis B crónica',organ:'higado',lesion:'hepatitis',route:'sangre',infectious:true,
  agent:'Virus de la hepatitis B (VHB), transmitido por sangre y fluidos corporales, de madre a hijo en el parto y por contacto sexual.',
  mech:'La respuesta inmunitaria contra los hepatocitos infectados produce inflamación persistente que puede llevar a fibrosis.',
  macro:'Hígado aumentado de tamaño, de color amarillento cuando hay ictericia, con superficie moteada por la inflamación.',
  sx:['A menudo asintomática','Ictericia, orina oscura y cansancio en la fase aguda','Náuseas, vómito y dolor abdominal'],
  dx:['Antígeno de superficie (HBsAg): la confirmación de laboratorio es esencial','Pruebas de función hepática'],
  tx:'Antivirales orales (tenofovir o entecavir) en la infección crónica; la mayoría los toma de por vida. La fase aguda no tiene tratamiento específico.',
  prev:'Vacuna: primera dosis en las primeras 24 horas de vida y dos o tres dosis más.',src:['oms_hbv','robbins'],
  kase:{who:'Mujer de 39 años',cc:'Cansancio y molestia en el lado derecho del abdomen. Le detectaron una prueba positiva en un tamizaje hace 8 meses y no consultó.',hx:'Transfusión en la infancia.',
   v:{hr:78,pa:'120/78',sp:98,fr:16,t:'36,7'},ecg:{},exam:'Hígado palpable, sin ictericia.',
   res:{perfil_hepatico:'ALT elevada (dos veces el límite superior).',serologia_vhb:'HBsAg positivo, persistente por más de 6 meses.',eco_abdominal:'Hígado de ecogenicidad heterogénea, sin nódulos.'},pert:['serologia_vhb','perfil_hepatico']},
  tx_opts:[['Antiviral oral (tenofovir o entecavir) y seguimiento',1,'Correcto: es el tratamiento que recomienda la OMS para la infección crónica.'],['Antibiótico durante 14 días',0,'Es una infección viral.'],['Vacunar contra hepatitis B como tratamiento',0,'La vacuna previene; no trata una infección establecida.'],['Trasplante hepático inmediato',0,'No hay insuficiencia hepática ni cirrosis descompensada.']]},

 {id:'cirrosis',name:'Cirrosis hepática',organ:'higado',lesion:'cirrosis',route:'toxica',infectious:false,
  agent:'Daño hepático crónico por consumo de alcohol, hepatitis C o B crónicas, esteatohepatitis metabólica o lesión biliar.',
  mech:'La agresión mantenida produce fibrosis que distorsiona la estructura del hígado y aumenta la presión portal.',
  macro:'Hígado pequeño, firme y de superficie nodular: nódulos de regeneración rodeados de tejido fibroso denso.',
  sx:['Cansancio, anorexia y pérdida de peso','Arañas vasculares y eritema palmar','Ascitis, ictericia, hemorragia por várices o encefalopatía'],
  dx:['Hepatograma, coagulación y hemograma','Ecografía, TC o RM: hígado nodular, signos de hipertensión portal','Elastografía para estadificar la fibrosis','Biopsia solo en casos no concluyentes'],
  tx:'Tratar la causa (por ejemplo, suspender el alcohol o dar antivirales), manejar las complicaciones (diuréticos en la ascitis, carvedilol en hipertensión portal) y valorar el trasplante hepático.',
  prev:'Evitar el alcohol, vacunación contra hepatitis A y B y tratamiento de las hepatitis virales.',src:['msd_cir','robbins'],
  kase:{who:'Hombre de 61 años',cc:'Aumento del perímetro abdominal y cansancio de dos meses.',hx:'Consumo de alcohol diario durante más de 20 años.',
   v:{hr:92,pa:'104/64',sp:97,fr:18,t:'36,9'},ecg:{},exam:'Ascitis, arañas vasculares y eritema palmar.',
   res:{eco_abdominal:'Hígado pequeño de contorno nodular, ascitis y esplenomegalia.',elastografia:'Rigidez hepática muy aumentada, compatible con fibrosis avanzada.',perfil_hepatico:'Bilirrubina elevada y albúmina baja.',hemograma:'Plaquetas bajas.'},pert:['eco_abdominal','elastografia','perfil_hepatico']},
  tx_opts:[['Suspender el alcohol, diurético para la ascitis, carvedilol y valorar trasplante',1,'Correcto: se trata la causa y las complicaciones.'],['Antibiótico profiláctico sin otras medidas',0,'No aborda la causa ni las complicaciones principales.'],['Biopsia hepática urgente como tratamiento',0,'La biopsia es diagnóstica y aquí no es necesaria.'],['Paracetamol a dosis altas para el malestar',0,'Es hepatotóxico: deben evitarse los fármacos que dañan el hígado.']]},

 {id:'ulcera',name:'Úlcera péptica por Helicobacter pylori',organ:'estomago',lesion:'ulcera',route:'oral',infectious:true,
  agent:'Helicobacter pylori (o el uso de antiinflamatorios no esteroideos, AINE), que alteran la defensa de la mucosa.',
  mech:'El ácido y la pepsina erosionan la mucosa debilitada hasta formar un defecto que atraviesa la muscular de la mucosa.',
  macro:'Lesión redonda de bordes regulares y fondo limpio, rodeada de mucosa enrojecida.',
  sx:['Dolor epigástrico urente que mejora con comida o antiácidos','En la úlcera duodenal, dolor que despierta por la noche','Complicaciones: hemorragia digestiva y perforación'],
  dx:['Endoscopia: confirma y permite biopsiar las úlceras gástricas','Prueba de aliento con urea o antígeno en heces para H. pylori'],
  tx:'Erradicación de H. pylori durante 14 días (terapia cuádruple con bismuto o triple con claritromicina según la resistencia local) y supresión ácida; evitar AINE, tabaco y alcohol.',
  prev:'Evitar el uso innecesario de AINE; confirmar la erradicación al menos 4 semanas después.',src:['msd_ulc','msd_hp','robbins'],
  kase:{who:'Mujer de 45 años',cc:'Dolor epigástrico urente de seis semanas que mejora con antiácidos.',hx:'No toma AINE.',
   v:{hr:84,pa:'122/78',sp:98,fr:16,t:'36,6'},ecg:{},exam:'Dolor a la palpación del epigastrio, sin signos de peritonitis.',
   res:{aliento_urea:'Positiva para H. pylori.',endoscopia:'Úlcera de bordes regulares y fondo limpio en el antro gástrico; se tomaron biopsias.'},pert:['aliento_urea','endoscopia']},
  tx_opts:[['Erradicación de H. pylori durante 14 días más supresión ácida',1,'Correcto: erradicar la bacteria cura la úlcera y reduce recaídas.'],['Antiácidos a demanda sin más estudio',0,'No elimina la causa y la úlcera recaerá.'],['Ibuprofeno para el dolor',0,'Los AINE empeoran la úlcera.'],['Cirugía gástrica programada',0,'Se reserva para complicaciones como perforación u obstrucción.']]},

 {id:'pielonefritis',name:'Pielonefritis aguda',organ:'rinon',lesion:'abscesos',route:'ascendente',infectious:true,
  agent:'Escherichia coli en cerca del 80 % de los casos con vía urinaria normal.',
  mech:'La bacteria asciende desde la vejiga por el uréter e inflama la pelvis renal y el parénquima.',
  macro:'Riñón aumentado de tamaño con focos en parches que avanzan de la médula a la corteza en forma de cuña; pueden formarse abscesos.',
  sx:['Fiebre y escalofríos','Dolor lumbar con sensibilidad en el ángulo costovertebral','Náuseas y vómito; en adultos mayores, confusión o sepsis'],
  dx:['Análisis de orina: piuria con cilindros leucocitarios','Urocultivo','Imágenes solo si es complicada, recurrente o no responde'],
  tx:'Antibiótico según la resistencia local: fluoroquinolona oral si el manejo es ambulatorio; parenteral si se hospitaliza, con paso a vía oral hasta completar 7 a 14 días.',
  prev:'Tratamiento oportuno de la infección urinaria baja y corrección de obstrucciones.',src:['msd_itu','robbins'],
  kase:{who:'Mujer de 28 años',cc:'Fiebre, escalofríos y dolor lumbar derecho; ardor al orinar desde hace tres días.',hx:'Infecciones urinarias previas.',
   v:{hr:112,pa:'112/70',sp:97,fr:22,t:'39,2'},ecg:{},exam:'Puñopercusión renal derecha positiva.',
   res:{uroanalisis:'Piuria con cilindros leucocitarios.',urocultivo:'Crecimiento de Escherichia coli.',hemograma:'Leucocitosis.'},pert:['uroanalisis','urocultivo']},
  tx_opts:[['Antibiótico según la resistencia local (fluoroquinolona o parenteral si se hospitaliza)',1,'Correcto: cubre a E. coli en el riñón.'],['Solo analgésicos y líquidos',0,'La infección renal requiere antibiótico.'],['Nitrofurantoína como en la cistitis',0,'No alcanza concentraciones adecuadas en el tejido renal.'],['Nefrectomía',0,'No hay indicación quirúrgica en una pielonefritis no complicada.']]},

 {id:'acv',name:'Accidente cerebrovascular isquémico',organ:'cerebro',lesion:'isquemia',route:'embolia',infectious:false,urgent:{limit:180,label:'ventana de trombólisis: hasta 4,5 h desde el inicio, con criterios'},
  agent:'Oclusión de una arteria cerebral por aterotrombosis o por un émbolo (por ejemplo, desde el corazón en la fibrilación auricular).',
  mech:'La isquemia focal produce un infarto permanente en el territorio de la arteria ocluida.',
  macro:'Zona pálida y reblandecida en el territorio de la arteria cerebral media, con edema alrededor.',
  sx:['Déficit neurológico focal de inicio súbito','Hemiparesia contralateral','Afasia si se afecta el hemisferio dominante'],
  dx:['TC sin contraste para descartar hemorragia','Glucemia desde el inicio','Angio-TC o angio-RM para detectar oclusión de grandes vasos','Escala NIHSS'],
  tx:'Trombólisis intravenosa dentro de la ventana permitida y trombectomía mecánica si hay oclusión de un gran vaso. Sin anticoagulación en la fase aguda; prevención secundaria según la causa.',
  prev:'Control de la presión arterial, anticoagulación en la fibrilación auricular, estatinas y abandono del tabaco.',src:['msd_acv','robbins'],
  kase:{who:'Hombre de 72 años',cc:'Debilidad súbita del brazo y la pierna derechos y dificultad para hablar desde hace 90 minutos.',hx:'Hipertensión arterial; palpitaciones ocasionales.',
   v:{hr:88,pa:'168/96',sp:96,fr:18,t:'36,8'},ecg:{irr:true},exam:'Hemiparesia derecha y afasia; NIHSS elevado.',
   res:{glucemia:'Normal: descarta hipoglucemia.',tc_cerebral:'Sin hemorragia.',angio_tc:'Oclusión de la arteria cerebral media izquierda.',ecg:'Fibrilación auricular.'},pert:['glucemia','tc_cerebral','angio_tc','ecg']},
  tx_opts:[['Trombólisis IV en la ventana y trombectomía mecánica',1,'Correcto: hay oclusión de un gran vaso y el paciente llegó a tiempo.'],['Anticoagulación inmediata con heparina',0,'En la fase aguda aumenta el riesgo de transformación hemorrágica.'],['Bajar la presión arterial de forma agresiva',0,'En el ictus agudo no se reduce la presión salvo situaciones concretas.'],['Esperar a la RM del día siguiente',0,'Se pierde la ventana terapéutica.']]},

 {id:'pancreatitis',name:'Pancreatitis aguda biliar',organ:'pancreas',lesion:'pancreatitis',route:'biliar',infectious:false,
  agent:'Cálculos biliares (la causa más frecuente) o consumo intenso de alcohol; también hipertrigliceridemia y fármacos.',
  mech:'La activación de las enzimas dentro del páncreas provoca autodigestión, edema e inflamación.',
  macro:'Forma edematosa: páncreas aumentado y pálido. Forma necrosante: áreas hemorrágicas oscuras y necrosis grasa blanca como tiza.',
  sx:['Dolor epigástrico intenso irradiado a la espalda','Náuseas, vómito y anorexia','En casos graves: fiebre, taquicardia e hipotensión'],
  dx:['Dos de tres: dolor típico, lipasa o amilasa al menos 3 veces el límite superior, imagen compatible','Ecografía para buscar cálculos biliares'],
  tx:'Reanimación con líquidos moderada e individualizada (Ringer lactato), analgesia, nutrición enteral temprana y colecistectomía en el mismo ingreso si es biliar. Antibiótico solo si hay infección.',
  prev:'Colecistectomía en litiasis sintomática y abandono del alcohol.',src:['sp_panc','robbins'],
  kase:{who:'Mujer de 52 años',cc:'Dolor epigástrico intenso irradiado a la espalda desde hace seis horas, con náuseas y vómito.',hx:'Cálculos biliares conocidos.',
   v:{hr:110,pa:'108/68',sp:96,fr:22,t:'37,8'},ecg:{},exam:'Dolor intenso a la palpación del epigastrio; taquicardia.',
   res:{lipasa:'Más de 3 veces el límite superior normal.',eco_abdominal:'Colelitiasis; páncreas aumentado de tamaño.',hemograma:'Leucocitosis leve.'},pert:['lipasa','eco_abdominal']},
  tx_opts:[['Líquidos moderados, analgesia, nutrición enteral temprana y colecistectomía en el ingreso',1,'Correcto: es el manejo que describe StatPearls.'],['Antibiótico profiláctico de rutina',0,'Solo se usa si hay infección confirmada o muy probable.'],['Ayuno prolongado con nutrición parenteral desde el ingreso',0,'Se prefiere la nutrición enteral temprana.'],['Cirugía pancreática urgente',0,'No está indicada en la pancreatitis aguda sin complicaciones.']]},
 {id:'hidradenitis',name:'Hidradenitis supurativa',organ:'piel',lesion:'hidradenitis',route:'folicular',infectious:false,
  agent:'Enfermedad inflamatoria crónica del folículo piloso, no contagiosa. Intervienen la predisposición genética (entre 33 % y 40 % de los pacientes tiene un familiar de primer grado afectado) y factores como el tabaquismo, la obesidad y la fricción.',
  mech:'El folículo se ocluye, se dilata y se rompe; la queratina y las bacterias que pasan a la dermis activan la inmunidad innata (TNF-α, IL-1, IL-17) y se forman nódulos, abscesos y túneles. Se describe como enfermedad autoinflamatoria, con participación de la inmunidad adaptativa en las fases crónicas; no es una enfermedad autoinmune clásica.',
  macro:'Hurley I: abscesos sin túneles ni cicatrices. Hurley II: abscesos recurrentes con túneles y cicatrices, únicos o múltiples pero separados por piel sana. Hurley III: compromiso difuso con múltiples túneles interconectados.',
  sx:['Nódulos dolorosos y abscesos recurrentes en axilas, ingles, región perianal o submamaria','Drenaje maloliente por los túneles','Cicatrices retráctiles, dolor e impacto en la calidad de vida'],
  dx:['Diagnóstico clínico: lesiones típicas (nódulos, túneles, cicatrices), localización en pliegues y cronicidad; no requiere pruebas de laboratorio','Estadificación de Hurley','Biopsia solo si hay duda, sobre todo para descartar carcinoma escamoso','Tamizaje de comorbilidades: síndrome metabólico, diabetes, dislipidemia y enfermedad hepática esteatósica'],
  tx:'Según el estadio: clindamicina tópica en la enfermedad leve y temprana; tetraciclinas orales; clindamicina más rifampicina. Si la respuesta es insuficiente o la enfermedad es moderada a grave: biológico (adalimumab es el de mayor respaldo; alternativas: secukinumab o infliximab) y cirugía (destechamiento o escisión) combinada con tratamiento médico. Dejar de fumar, control del peso, manejo del dolor y apoyo psicológico.',
  prev:'Sin prevención primaria establecida. Se recomienda eliminar desencadenantes (tabaco, fricción) y controlar el peso.',src:['sp_hs','donghia','gau'],
  assoc:{organ:'higado',lesion:'esteatosis',stage:2,title:'Hígado: enfermedad hepática esteatósica asociada a disfunción metabólica (MASLD)',
   pts:[
    ['Qué se observa','Las personas con hidradenitis tienen más hígado graso que la población general. Un metaanálisis de 8 estudios observacionales halló mayor riesgo de enfermedad hepática (OR 1,50), de hígado graso no alcohólico (OR 1,78; IC 95 % 1,28-2,48) y de hepatitis B (OR 1,48), pero no de hepatitis C.','gau'],
    ['Independiente del peso','En un estudio con ecografía, el hígado graso apareció en 57,6 % de los pacientes con hidradenitis frente a 31,7 % de controles con la misma edad, sexo e índice de masa corporal; la asociación se mantuvo al ajustar por factores metabólicos (OR 2,79).','gonzalez'],
    ['Con la nomenclatura actual','Desde 2023 el hígado graso no alcohólico (NAFLD) se denomina MASLD. Una cohorte de 94 pacientes evaluada con elastografía de transición encontró una prevalencia de MASLD de hasta 75 %.','frings'],
    ['Mecanismo propuesto','Vías inflamatorias compartidas y factores de riesgo comunes (obesidad, resistencia a la insulina, tabaquismo). Es una asociación: los estudios no demuestran que una enfermedad cause la otra.','frings'],
    ['Qué hacer en la consulta','Los autores recomiendan tamizar la función hepática en las personas con hidradenitis y, si hay alteraciones o factores de riesgo, valorar ecografía o elastografía. El mayor riesgo de hepatitis B también justifica la serología.','gau']]},
  kase:{who:'Mujer de 29 años',cc:'Nódulos dolorosos que supuran en ambas axilas e ingles desde hace cuatro años; reaparecen cada pocas semanas y le dejan cicatrices.',hx:'Fuma 10 cigarrillos al día. Índice de masa corporal de 34. Ha recibido varios ciclos de antibiótico oral y drenajes en urgencias, con recaídas.',
   v:{hr:84,pa:'132/84',sp:98,fr:16,t:'37,2'},ecg:{},exam:'Axilas: nódulos inflamatorios y abscesos con dos túneles que drenan y cicatrices en cordón, separados por piel sana (Hurley II). Lesiones similares en ingles.',
   note:'El diagnóstico es clínico. Las pruebas clave de este caso evalúan la comorbilidad hepática y preparan un posible tratamiento biológico.',
   res:{perfil_hepatico:'ALT y GGT levemente elevadas.',eco_abdominal:'Aumento difuso de la ecogenicidad hepática compatible con esteatosis; sin nódulos.',serologia_vhb:'HBsAg negativo.',igra:'Negativo: sin evidencia de tuberculosis latente.',hemograma:'Leucocitosis leve.',pcr:'Proteína C reactiva elevada.',glucemia:'Glucemia levemente elevada.'},pert:['perfil_hepatico','eco_abdominal','serologia_vhb','igra']},
  tx_opts:[['Adalimumab tras descartar tuberculosis latente y hepatitis B, cirugía de los túneles, dejar de fumar, bajar de peso y seguimiento del hígado graso',1,'Correcto: con túneles y recaídas pese a antibióticos, el biológico con mayor respaldo es adalimumab, combinado con cirugía y control de desencadenantes (StatPearls). La evaluación hepática orienta el manejo de la comorbilidad.'],['Nuevos drenajes en urgencias cada vez que aparezca un absceso',0,'El drenaje solo da alivio transitorio: no trata la enfermedad ni elimina los túneles, y las lesiones reaparecen.'],['Clindamicina tópica como único tratamiento',0,'La clindamicina tópica es de primera línea en la enfermedad leve y temprana; con túneles y cicatrices no es suficiente.'],['Antibiótico para curar la infección y aislamiento de la paciente',0,'No es una infección contagiosa sino una enfermedad inflamatoria crónica del folículo; los cultivos de lesiones sin romper suelen ser estériles.']]}
];
const DISMAP=Object.fromEntries(DIS.map(d=>[d.id,d]));

const TESTS=[
 {id:'hemograma',n:'Hemograma',m:20},{id:'pcr',n:'Proteína C reactiva',m:30},{id:'glucemia',n:'Glucemia capilar',m:2},
 {id:'rx_torax',n:'Radiografía de tórax',m:30},{id:'molecular_tb',n:'Prueba molecular rápida de TB',m:120},
 {id:'ecg',n:'ECG de 12 derivaciones',m:5},{id:'troponina',n:'Troponina de alta sensibilidad',m:60},
 {id:'perfil_hepatico',n:'Perfil hepático',m:60},{id:'serologia_vhb',n:'Serología de hepatitis B (HBsAg)',m:120},
 {id:'eco_abdominal',n:'Ecografía abdominal',m:45},{id:'elastografia',n:'Elastografía hepática',m:40},
 {id:'lipasa',n:'Lipasa sérica',m:45},{id:'aliento_urea',n:'Prueba de aliento con urea',m:40},{id:'endoscopia',n:'Endoscopia digestiva alta',m:90},
 {id:'uroanalisis',n:'Análisis de orina',m:20},{id:'urocultivo',n:'Urocultivo',m:240},
 {id:'tc_cerebral',n:'TC cerebral sin contraste',m:25},{id:'angio_tc',n:'Angio-TC de vasos cerebrales',m:20},
 {id:'igra',n:'IGRA (tuberculosis latente)',m:240}
];
const TESTMAP=Object.fromEntries(TESTS.map(t=>[t.id,t]));

/* ================= Progress (per-viewer, browser storage) ================= */
const LEVELS=[[0,'Estudiante'],[250,'Interno'],[700,'Residente'],[1400,'Especialista']];
const BADGES=[
 {id:'explorador',ab:'EX',n:'Explorador anatómico',d:'Abre los nueve órganos del modelo 3D.'},
 {id:'patologo',ab:'PA',n:'Mirada de patólogo',d:'Observa las diez enfermedades en estadio 3.'},
 {id:'creador',ab:'CR',n:'Creador de casos',d:'Define tu primera enfermedad.'},
 {id:'ojo',ab:'OC',n:'Ojo clínico',d:'Diagnostica correctamente con 2 pruebas o menos.'},
 {id:'musculo',ab:'TM',n:'Tiempo es músculo',d:'Trata un infarto dentro de los 90 minutos.'},
 {id:'cerebro',ab:'TC',n:'Tiempo es cerebro',d:'Trata un ictus dentro de la ventana.'},
 {id:'antibiotico',ab:'AJ',n:'Antibiótico justo',d:'Trata bien tres casos infecciosos.'},
 {id:'racha',ab:'R3',n:'Racha de tres',d:'Resuelve tres casos perfectos seguidos.'},
 {id:'quiz',ab:'QZ',n:'Repaso completo',d:'Responde bien todas las preguntas.'},
 {id:'lector',ab:'LS',n:'Lector sistemático',d:'Completa la lista de lectura y acierta el diagnóstico en tres placas.'},
 {id:'ojorx',ab:'OR',n:'Ojo radiológico',d:'Encuentra todos los hallazgos en cinco placas.'},
 {id:'ict',ab:'IC',n:'Medidor del ICT',d:'Mide el índice cardiotorácico con un error máximo de 0,04.'},
 {id:'turno',ab:'TU',n:'Turno sin muertes',d:'Termina un turno de urgencias sin pacientes fallecidos.'},
 {id:'triage',ab:'TR',n:'Triage certero',d:'Clasifica bien a cinco pacientes con la Resolución 5596 de 2015.'},
 {id:'avatar',ab:'AV',n:'Ojo anatómico',d:'Señala el órgano afectado en el avatar de tres pacientes.'},
 {id:'sistemico',ab:'MS',n:'Mirada sistémica',d:'Evalúa el hígado de un paciente con hidradenitis supurativa.'}
];
const KEY='lab-patologia-v1';
let P=defaultP();
function defaultP(){return {xp:0,organs:[],seen3:[],badges:[],cases:0,dxOk:0,txOk:0,inf:0,streak:0,custom:[],quiz:{},rx:{read:0,ok:0,sys:0,all:0,done:{}}};}
try{const raw=localStorage.getItem(KEY); if(raw){const o=JSON.parse(raw); P=Object.assign(defaultP(),o);}}catch(e){}
P.rx=Object.assign({read:0,ok:0,sys:0,all:0,done:{}},P.rx||{});
function save(){try{localStorage.setItem(KEY,JSON.stringify(P));}catch(e){}}
function levelOf(xp){let L=LEVELS[0],N=null;for(let i=0;i<LEVELS.length;i++){if(xp>=LEVELS[i][0]){L=LEVELS[i];N=LEVELS[i+1]||null;}}return {L,N};}
let toastT=null;
function toast(msg){const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2600);}
function addXP(n,why){if(n<=0) return; const before=levelOf(P.xp).L[1]; P.xp+=n; save(); renderProgress(); const after=levelOf(P.xp).L[1]; toast(after!==before?`¡Subiste a ${after}! +${n} VX`:`+${n} VX · ${why}`);}
function badge(id){if(P.badges.includes(id)) return; P.badges.push(id); save(); renderProgress(); const b=BADGES.find(x=>x.id===id); setTimeout(()=>toast('Insignia: '+b.n),900);}

/* ================= Organ renderer (sombreado por píxel con relieve e iluminación) ================= */
const RS=1.5, OW=420, OH=320, PW=Math.round(OW*RS), PH=Math.round(OH*RS);
const NZ=(function(seed){const R=rng(seed);const perm=new Uint8Array(512);const base=[];for(let i=0;i<256;i++)base.push(i);for(let i=255;i>0;i--){const j=Math.floor(R()*(i+1));const t=base[i];base[i]=base[j];base[j]=t;}for(let i=0;i<512;i++)perm[i]=base[i&255];
  const g=(h,x,y)=>{switch(h&7){case 0:return x+y;case 1:return -x+y;case 2:return x-y;case 3:return -x-y;case 4:return x;case 5:return -x;case 6:return y;default:return -y;}};
  const fd=t=>t*t*t*(t*(t*6-15)+10);
  function n2(x,y){let X=Math.floor(x),Y=Math.floor(y);const xf=x-X,yf=y-Y;X&=255;Y&=255;const u=fd(xf),v=fd(yf);const a=perm[X]+Y,b=perm[X+1]+Y;const g00=g(perm[a],xf,yf),g10=g(perm[b],xf-1,yf),g01=g(perm[a+1],xf,yf-1),g11=g(perm[b+1],xf-1,yf-1);const l1=g00+u*(g10-g00),l2=g01+u*(g11-g01);return (l1+v*(l2-l1))*0.75;}
  function fbm(x,y,o){let s=0,a=0.5,f=1,nn=0;o=o||4;for(let i=0;i<o;i++){s+=a*n2(x*f,y*f);nn+=a;a*=0.5;f*=2.03;}return s/nn;}
  const W=[0,0];
  function worley(x,y){const X=Math.floor(x),Y=Math.floor(y);let f1=9,f2=9;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=X+i,cy=Y+j;const h1=perm[(perm[cx&255]+(cy&255))&511];const h2=perm[(h1+71)&511];const d=Math.hypot(cx+h1/255-x,cy+h2/255-y);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}W[0]=f1;W[1]=f2;return W;}
  return {n2,fbm,worley};})(1729);
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function segDist(x,y,pts){let best=1e9;for(let i=1;i<pts.length;i++){const ax=pts[i-1][0],ay=pts[i-1][1],dx=pts[i][0]-ax,dy=pts[i][1]-ay;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));const ex=ax+dx*t-x,ey=ay+dy*t-y;const d=ex*ex+ey*ey;if(d<best)best=d;}return Math.sqrt(best);}
function boxBlur(src,w,h,r){const tmp=new Float32Array(w*h),out=new Float32Array(src);const k=2*r+1;
  for(let pass=0;pass<3;pass++){
    for(let y=0;y<h;y++){const row=y*w;let acc=0;for(let x=-r;x<=r;x++)acc+=out[row+Math.min(w-1,Math.max(0,x))];for(let x=0;x<w;x++){tmp[row+x]=acc/k;acc+=out[row+Math.min(w-1,x+r+1)]-out[row+Math.max(0,x-r)];}}
    for(let x=0;x<w;x++){let acc=0;for(let y=-r;y<=r;y++)acc+=tmp[Math.min(h-1,Math.max(0,y))*w+x];for(let y=0;y<h;y++){out[y*w+x]=acc/k;acc+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
  }return out;}
const O={r:0,g:0,b:0,h:0,gl:0};
function setO(r,g,b,h,gl){O.r=r;O.g=g;O.b=b;O.h=h;O.gl=gl;}
function mixO(r,g,b,t){if(!(t>0))return;if(t>1)t=1;O.r+=(r-O.r)*t;O.g+=(g-O.g)*t;O.b+=(b-O.b)*t;}
const FISS=[[[70,170],[120,166],[178,162]],[[168,66],[140,140],[110,210],[90,262]],[[236,74],[262,140],[292,210],[318,264]]];
function cub(p0,p1,p2,p3,n){const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}return o;}
const LAD=cub([214,100],[200,170],[206,240],[224,290],16), RCA=cub([170,102],[128,140],[122,200],[152,246],16);
const SYLV=[[146,190],[200,166],[250,148],[290,134]], CENT=[[236,44],[226,100],[214,150],[204,176]];
const MAT={
  lung(x,y,e){const f=NZ.fbm(x*0.045,y*0.045,4);const w=NZ.worley(x*0.11,y*0.11);const sep=1-sm(0,0.09,w[1]-w[0]);
    setO(0.87+0.05*f,0.60+0.05*f,0.58+0.04*f,1.6*f,0.55);O.r-=0.07*sep;O.g-=0.08*sep;O.b-=0.07*sep;
    const a=NZ.fbm(x*0.32+11,y*0.32,2);if(a>0.36){mixO(0.24,0.23,0.25,Math.min(1,(a-0.36)*4)*(0.5+0.5*(1-y/320))*0.8);}
    let fd=1e9;for(const F of FISS){const d=segDist(x,y,F);if(d<fd)fd=d;}O.h-=5*Math.exp(-(fd*fd)/5);if(fd<1.6){O.r*=0.86;O.g*=0.8;O.b*=0.8;}},
  trachea(x,y,e){const r=sm(-0.3,0.7,Math.sin(y*0.62));setO(0.91-0.06*(1-r),0.81-0.07*(1-r),0.76,2.4*r,0.35);},
  muscle(x,y,e){const f=NZ.fbm(x*0.03,y*0.03,4);const fib=0.03*Math.sin(x*0.55+y*0.32+f*6);setO(0.64+0.06*f+fib,0.17+0.03*f,0.19+0.03*f,1.2*f,0.6);
    const d=Math.min(segDist(x,y,LAD),segDist(x,y,RCA));
    if(d<10){const w=NZ.worley(x*0.25,y*0.25);const lump=1-sm(0,0.6,w[0]);const t=sm(10,5,d);mixO(0.90+0.04*lump,0.80+0.04*lump,0.52,t*0.9);O.h+=t*(2.5+1.5*lump);O.gl=0.45;}
    if(d<2.6){mixO(0.66,0.10,0.10,0.9);O.h+=1.2;}
    const dv=Math.min(segDist(x-5,y,LAD),segDist(x,y-5,RCA));if(dv<1.8&&d>2.6){mixO(0.34,0.24,0.44,0.8);O.h+=0.8;}},
  aorta(x,y,e){const f=NZ.fbm(x*0.05,y*0.05,2);setO(0.86+0.03*f,0.46,0.44,0,0.6);},
  pulm(x,y,e){setO(0.52,0.52,0.80,0,0.6);},
  vena(x,y,e){setO(0.40,0.40,0.74,0,0.6);},
  liver(x,y,e){const f=NZ.fbm(x*0.035,y*0.035,4);const w=NZ.worley(x*0.24,y*0.24);const lob=1-sm(0.05,0.4,w[0]);setO(0.47+0.05*f+0.012*lob,0.15+0.025*f,0.12+0.02*f,0.9*f+0.2*lob,0.85);
    const df=segDist(x,y,[[238,48],[232,110],[226,176]]);if(df<2){mixO(0.92,0.84,0.78,0.7);O.h-=1.5;}},
  gall(x,y,e){const f=NZ.fbm(x*0.06,y*0.06,2);setO(0.28+0.04*f,0.46+0.05*f,0.22,0,0.85);},
  mucosa(x,y,e){const t=(x*0.62+y*0.78)*0.08+3.6*NZ.fbm(x*0.016,y*0.016,3);const rid=Math.pow(0.5+0.5*Math.sin(t*6.283),2.2);const f=NZ.fbm(x*0.2,y*0.2,2);
    setO(0.84+0.05*rid+0.02*f,0.47+0.06*rid,0.42+0.05*rid,3.2*rid+0.5*f,0.5);if(e<0.14)mixO(0.60,0.20,0.20,sm(0.14,0.02,e));},
  esoph(x,y,e){const r=0.5+0.5*Math.sin(x*0.9);setO(0.86,0.68,0.64,1.6*r,0.6);},
  pancreas(x,y,e){const w=NZ.worley(x*0.17,y*0.17);const bump=1-sm(0,0.6,w[0]);const sep=1-sm(0,0.07,w[1]-w[0]);const f=NZ.fbm(x*0.04,y*0.04,3);
    setO(0.90+0.03*f-0.08*sep,0.74+0.03*f-0.10*sep,0.48-0.08*sep,3.5*bump,0.35);},
  duod(x,y,e){const f=NZ.fbm(x*0.06,y*0.06,2);setO(0.88+0.03*f,0.62,0.54,0,0.55);},
  kidney(x,y,e,d){const ang=Math.atan2(y-170,x-176),rho=Math.hypot(x-176,y-170);const f=NZ.fbm(x*0.08,y*0.08,3);setO(0.70+0.04*f,0.31+0.03*f,0.27,0.4*f,0.45);
    const sinus=sm(56,40,rho);const pyr=sm(0.05,0.45,Math.cos(ang*6.5+0.6))*sm(0.30,0.40,d)*(1-sinus);if(pyr>0){mixO(0.44+0.04*Math.sin(ang*150),0.11,0.12,pyr*0.95);O.h-=0.5*pyr;}
    if(sinus>0){const w=NZ.worley(x*0.2,y*0.2);mixO(0.94,0.84,0.55,sinus);O.h+=sinus*(1.5+2*(1-sm(0,0.6,w[0])));}
    const dp=segDist(x,y,[[198,170],[172,174],[150,180]]);if(dp<12)mixO(0.93,0.87,0.80,sm(12,7,dp));
    if(e<0.06)mixO(0.82,0.62,0.56,0.6);},
  ureter(x,y,e){setO(0.88,0.76,0.62,0,0.5);},
  artery(x,y,e){setO(0.78,0.20,0.20,0,0.6);},
  vein(x,y,e){setO(0.34,0.38,0.70,0,0.6);},
  brain(x,y,e){const q=NZ.fbm(x*0.016,y*0.016,3),q2=NZ.fbm(x*0.05+3,y*0.05,2);const sv=Math.sin((q*20+q2*1.4)*3.2);const crown=1-sm(0.45,0.95,sv);
    setO(0.60+0.28*crown,0.38+0.34*crown,0.36+0.31*crown,7*Math.pow((1-sv)/2,0.6),0.14);
    if(crown<0.3&&NZ.fbm(x*0.08,y*0.08,2)>0.12)mixO(0.62,0.18,0.20,0.5);
    const ds=segDist(x,y,SYLV);if(ds<9){const t=Math.exp(-(ds*ds)/18);O.h-=10*t;O.r*=1-0.35*t;O.g*=1-0.45*t;O.b*=1-0.45*t;}
    const dc=segDist(x,y,CENT);if(dc<6){const t=Math.exp(-(dc*dc)/8);O.h-=6*t;O.r*=1-0.25*t;O.g*=1-0.3*t;O.b*=1-0.3*t;}},
  cerebellum(x,y,e){const r=sm(-0.3,0.8,Math.sin(y*1.25+NZ.fbm(x*0.03,y*0.03,2)*3));setO(0.68+0.18*r,0.46+0.2*r,0.44+0.18*r,2.6*r,0.3);},
  stem(x,y,e){setO(0.86,0.70,0.64,0,0.3);},
  epiderm(x,y,e){const top=SKTOP(x);const t=Math.max(0,Math.min(1,(y-top)/(SKBOT(x)-top)));const f=NZ.fbm(x*0.2,y*0.2,2);
    setO(0.95-0.08*t+0.02*f,0.83-0.16*t,0.74-0.18*t,0.6*f,0.3);if(y-top<3){mixO(0.98,0.94,0.88,0.75);O.gl=0.55;}if(t>0.78)mixO(0.60,0.38,0.30,0.55*sm(0.78,1,t));},
  dermis(x,y,e){const f=NZ.fbm(x*0.03,y*0.03,3);const fib=Math.sin(x*0.09+y*0.32+NZ.fbm(x*0.05,y*0.08,2)*7);
    setO(0.90+0.03*f,0.66+0.03*f+0.025*fib,0.66+0.025*fib,0.7*fib+0.6*f,0.22);if(y<SKBOT(x)+16)mixO(0.95,0.76,0.73,0.45);
    const vv=Math.min(Math.abs(y-(SKBOT(x)+18+2*Math.sin(x*0.05))),Math.abs(y-(DBOT(x)-6)));if(vv<1.2&&NZ.fbm(x*0.06,y*0.06+2,2)>0.05){mixO(0.74,0.22,0.24,0.6);O.h+=0.5;}},
  fat(x,y,e){const w=NZ.worley(x*0.05,y*0.06);const lob=1-sm(0,0.8,w[0]);const sep=1-sm(0,0.035,w[1]-w[0]);const f=NZ.fbm(x*0.1,y*0.1,2);
    setO(0.98,0.86+0.03*f,0.52+0.05*f,1.4*lob+0.4*f,0.45);if(sep>0){mixO(0.90,0.66,0.60,sep*0.7);O.h-=0.8*sep;}},
  follicle(x,y,e){let d=1e9;for(const F of FOLL){const q=segDist(x,y,F);if(q<d)d=q;}setO(0.93,0.80,0.72,0,0.3);if(d<1.7){mixO(0.24,0.16,0.12,0.95);O.h+=0.8;}},
  hair(x,y,e){setO(0.22,0.15,0.11,0,0.7);},
  seb(x,y,e){const w=NZ.worley(x*0.45,y*0.45);const b=1-sm(0,0.6,w[0]);setO(0.97,0.91,0.70,2*b,0.5);},
  gland(x,y,e){const r=0.5+0.5*Math.sin(x*0.9+Math.sin(y*0.8)*3);setO(0.78+0.08*r,0.55,0.66,1.5*r,0.3);}
};
function SKTOP(x){return 62+2.2*Math.sin(x*0.07)+1.2*Math.sin(x*0.19);}
function SKBOT(x){return 86+4.5*Math.sin(x*0.26);}
function DBOT(x){return 202+4*Math.sin(x*0.05);}
function HBOT(x){return 290+3*Math.sin(x*0.09);}
function bandPath(fTop,fBot,x0,x1){let d='M'+x0+' '+fTop(x0).toFixed(1);for(let x=x0+4;x<=x1;x+=4)d+=' L'+x+' '+fTop(x).toFixed(1);for(let x=x1;x>=x0;x-=4)d+=' L'+x+' '+fBot(x).toFixed(1);return d+' Z';}
const FOLL=[[[80,62],[88,120],[96,176]],[[160,62],[168,120],[176,176]],[[240,62],[248,120],[256,178]],[[318,62],[326,120],[334,176]]];
const HSG={1:{fol:[1],tun:[],abs:[[174,146,30]],op:[]},
  2:{fol:[1,2],tun:[[[180,162],[214,184],[254,172]],[[254,172],[272,124],[278,66]]],abs:[[174,144,34]],op:[278]},
  3:{fol:[0,1,2,3],tun:[[[180,164],[214,184],[254,172]],[[254,172],[272,124],[278,66]],[[100,166],[132,188],[170,166]],[[132,188],[126,124],[124,66]],[[254,172],[296,190],[330,166]],[[296,190],[302,124],[306,66]]],abs:[[174,144,36],[94,148,28],[332,148,28]],op:[124,278,306]}};
const ORGDEF={
  piel:{parts:[{d:bandPath(x=>DBOT(x)-2,HBOT,30,390),mat:'fat',blur:8,amp:10,les:true},
    {d:bandPath(x=>SKBOT(x)-2,DBOT,30,390),mat:'dermis',blur:8,amp:10,les:true},
    ...FOLL.map(F=>({e:[F[2][0]+20,F[2][1]+30,13,8,0.2],mat:'gland',blur:3,amp:5,les:true})),
    ...FOLL.map(F=>({e:[F[1][0]+11,F[1][1]-4,8,6,0.4],mat:'seb',blur:3,amp:5,les:true})),
    {d:bandPath(SKTOP,SKBOT,30,390),mat:'epiderm',blur:6,amp:8,les:true},
    ...FOLL.map(F=>({d:'M'+F[0][0]+' '+F[0][1]+' L'+F[1][0]+' '+F[1][1]+' L'+F[2][0]+' '+F[2][1],stroke:9,mat:'follicle',blur:3,amp:5,les:true})),
    ...FOLL.map(F=>({e:[F[2][0]+1,F[2][1]+3,7,8,0],mat:'follicle',blur:3,amp:6,les:true})),
    ...FOLL.map(F=>({d:'M'+(F[0][0]-7)+' 30 L'+F[0][0]+' 64',stroke:2.2,mat:'hair',blur:1,amp:1}))]},
  pulmon:{parts:[{d:'M201 0 L201 92 M201 92 L178 146 M201 92 L226 146',stroke:18,mat:'trachea',blur:5,amp:9},
    {d:'M150 36 C134 36 118 52 106 80 C88 120 72 180 66 236 C64 258 70 270 84 268 C112 262 150 258 178 266 C186 268 190 260 188 250 C184 222 176 200 176 182 C176 166 186 156 184 140 C182 110 176 70 166 48 C162 40 156 36 150 36 Z',mat:'lung',blur:20,amp:34,les:true},
    {d:'M252 36 C266 36 282 52 294 80 C312 120 330 182 336 238 C338 258 332 270 318 268 C290 264 262 262 238 268 C228 270 224 262 226 254 C232 240 214 236 212 222 C210 206 228 196 226 180 C224 160 218 150 222 132 C226 104 232 64 240 46 C243 40 247 36 252 36 Z',mat:'lung',blur:20,amp:34,les:true}]},
  corazon:{parts:[{d:'M160 110 L158 10',stroke:22,mat:'vena',blur:6,amp:12},
    {d:'M190 112 C184 60 210 28 250 26 C286 24 304 46 302 92',stroke:30,mat:'aorta',blur:8,amp:16},
    {d:'M218 34 L208 0 M246 26 L244 0 M276 30 L288 0',stroke:11,mat:'aorta',blur:4,amp:7},
    {d:'M214 114 C222 82 236 66 264 66',stroke:26,mat:'pulm',blur:7,amp:14},
    {e:[128,140,32,40,0],mat:'muscle',blur:12,amp:20},
    {d:'M150 96 C118 104 98 146 104 186 C110 230 160 268 226 294 C264 262 302 214 304 170 C306 126 276 96 240 96 C214 96 188 104 168 98 Z',mat:'muscle',blur:22,amp:34,les:true},
    {e:[288,118,20,13,-0.5],mat:'muscle',blur:6,amp:10}]},
  higado:{parts:[{e:[200,214,15,26,0.35],mat:'gall',blur:6,amp:10},
    {d:'M36 124 C40 86 92 56 168 50 C236 44 314 52 352 70 C372 80 372 100 352 112 C318 132 270 150 226 176 C196 194 164 214 128 224 C90 234 52 222 40 196 C32 176 32 150 36 124 Z',mat:'liver',blur:26,amp:30,les:true}]},
  estomago:{parts:[{d:'M154 0 L154 50',stroke:22,mat:'esoph',blur:5,amp:10},{d:'M300 222 C318 236 332 252 340 274',stroke:20,mat:'duod',blur:5,amp:10},
    {d:'M150 42 C162 40 176 46 179 62 C186 110 230 128 270 138 C312 148 334 190 302 226 C270 256 200 252 160 226 C110 196 100 140 115 92 C120 66 132 46 150 42 Z',mat:'mucosa',blur:16,amp:18,les:true}]},
  pancreas:{parts:[{d:'M150 150 C220 140 280 124 340 110',stroke:8,mat:'vein',blur:3,amp:4},
    {d:'M110 108 C40 120 30 236 92 250 C124 257 140 240 138 222',stroke:26,mat:'duod',blur:7,amp:14},
    {d:'M70 40 C80 90 90 140 94 172',stroke:6,mat:'gall',blur:2,amp:3},
    {d:'M58 176 C62 140 100 126 140 138 C190 152 246 146 300 122 C330 110 356 120 352 142 C346 168 306 178 262 184 C214 192 166 206 124 216 C86 226 54 208 58 176 Z',mat:'pancreas',blur:18,amp:22,les:true}]},
  rinon:{parts:[{d:'M168 166 L110 150',stroke:8,mat:'artery',blur:3,amp:4},{d:'M168 182 L110 188',stroke:9,mat:'vein',blur:3,amp:4},
    {d:'M168 192 C150 236 150 284 160 318',stroke:10,mat:'ureter',blur:3,amp:5},
    {d:'M205 40 C275 40 305 110 300 170 C295 240 255 290 200 285 C155 280 135 240 165 215 C185 200 185 170 165 150 C135 125 145 40 205 40 Z',mat:'kidney',blur:14,amp:14,les:true,dblur:44}]},
  cerebro:{parts:[{d:'M232 236 L256 236 L262 312 L240 312 Z',mat:'stem',blur:6,amp:10},{e:[298,250,48,28,0],mat:'cerebellum',blur:10,amp:14},
    {d:'M64 178 C52 118 104 46 196 40 C278 34 348 84 352 150 C355 196 330 224 294 228 C274 252 236 260 206 248 C176 262 122 256 94 234 C74 218 66 200 64 178 Z',mat:'brain',blur:22,amp:26,les:true}]}
};
const LOC={pulmon:{x:100,y:222,rx:56,ry:50,rot:0.2},corazon:{x:240,y:214,rx:46,ry:40,rot:0.3},higado:{x:150,y:130,rx:110,ry:60,rot:0},estomago:{x:214,y:150,rx:28,ry:28,rot:0},pancreas:{x:200,y:170,rx:120,ry:30,rot:-0.15},rinon:{x:235,y:160,rx:50,ry:90,rot:0},cerebro:{x:206,y:150,rx:74,ry:50,rot:-0.3},piel:{x:200,y:150,rx:130,ry:60,rot:0}};
function lesionField(organ,x,y,sev){const L=LOC[organ];const c=Math.cos(-L.rot),s=Math.sin(-L.rot);const dx=x-L.x,dy=y-L.y;const X=dx*c-dy*s,Y=dx*s+dy*c;let d=Math.sqrt((X*X)/(L.rx*L.rx)+(Y*Y)/(L.ry*L.ry));d+=0.22*NZ.fbm(x*0.05+7,y*0.05,3);const sz=0.5+0.6*sev;return 1-sm(0.72*sz,1.0*sz,d);}
function swellOf(l,s){return {hepatitis:1+0.07*s,cirrosis:1-0.16*s,abscesos:1+0.06*s,pancreatitis:1+0.1*s,edema:1+0.08*s,inflamacion:1+0.04*s,esteatosis:1+0.06*s}[l]||1;}
function applyLesion(organ,les,sev,x,y,e){
  const L=LOC[organ];
  switch(les){
    case 'consolidacion':{let f=lesionField(organ,x,y,sev);if(organ==='pulmon'){const side=(-78*(y-66)-196*(x-168))/211;f*=sm(-2,4,side);}if(f<=0)return;
      const col=sev<0.5?[0.70,0.26,0.24]:(sev<0.9?[0.50,0.13,0.12]:[0.62,0.56,0.52]);mixO(col[0],col[1],col[2],0.92*f);const g=NZ.fbm(x*0.35,y*0.35,2);O.r+=0.05*g*f;O.g+=0.04*g*f;O.b+=0.04*g*f;O.h+=f*(2.5+1.2*g);O.gl*=1-0.65*f;break;}
    case 'cavitacion':{const cc=organ==='pulmon'?[134,94]:[L.x,L.y];const dA=Math.hypot(x-cc[0]-6,y-cc[1]-8);const reg=1-sm(30+40*sev,60+50*sev,dA);
      if(reg>0){const w=NZ.worley(x*0.09,y*0.09);const nod=(1-sm(0.16,0.32,w[0]))*reg*sm(0.1,0.4,sev+0.2);if(nod>0){mixO(0.92,0.86,0.66,nod);O.h+=3*nod;O.gl*=1-0.5*nod;}
        const fb=1-sm(0,0.05,Math.abs(NZ.fbm(x*0.04,y*0.04,2)-0.05));if(fb>0)mixO(0.95,0.92,0.88,fb*0.5*reg*sev);}
      if(sev>=0.6){const R=8+14*sev;const dc=Math.hypot(x-cc[0],y-cc[1])/R;if(dc<0.95){mixO(0.20,0.12,0.11,0.92);O.h-=8*(1-dc*dc);O.gl=0.15;}else if(dc<1.35){const t=1-Math.abs(dc-1.12)/0.23;if(t>0){mixO(0.92,0.84,0.62,t);O.h+=2*t;}}}
      break;}
    case 'infarto':{const f=lesionField(organ,x,y,sev);if(organ==='corazon'&&Math.hypot(x-207,y-140)<4.5){mixO(0.12,0.02,0.03,1);O.h+=2;}if(f<=0)return;const n=NZ.fbm(x*0.12,y*0.12,2);
      if(sev<0.5)mixO(0.36,0.06,0.09,f*(0.6+0.3*n));
      else{const core=sm(0.25,0.75,f),rim=f*(1-core);const cc=sev<0.9?[0.86,0.70,0.44]:[0.84,0.78,0.72];mixO(0.34,0.05,0.07,rim*1.4);mixO(cc[0],cc[1],cc[2],core*(0.85+0.1*n));if(sev>=0.9)O.h-=1.5*core;}
      O.gl*=1-0.4*f;break;}
    case 'hepatitis':{const n=NZ.fbm(x*0.03,y*0.03,3);mixO(0.78,0.58,0.22,sev*(0.45+0.25*n));const w=NZ.worley(x*0.2,y*0.2);const sp=1-sm(0.08,0.2,w[0]);if(sp>0)mixO(0.86,0.72,0.40,sp*0.6*sev);break;}
    case 'cirrosis':{const w=NZ.worley(x*0.11,y*0.11);const nod=1-sm(0,0.72,w[0]);const sep=1-sm(0,0.12,w[1]-w[0]);mixO(0.74,0.50,0.25,0.75*sev);O.h+=(4+7*sev)*nod*sev;if(sep>0)mixO(0.92,0.86,0.76,sep*0.85*sev);O.gl*=1-0.35*sev;break;}
    case 'ulcera':{const R=(9+13*sev)*(1+0.18*NZ.fbm(Math.atan2(y-L.y,x-L.x)*1.6+5,1.3,2));const r=Math.hypot(x-L.x,y-L.y)/R;if(r<2.4){if(r<1){O.h=-11*(1-r*r);const n=NZ.fbm(x*0.4,y*0.4,2);mixO(0.80+0.04*n,0.74+0.04*n,0.60,0.92);O.gl=0.2;if(sev>=0.9&&Math.hypot(x-L.x-R*0.35,y-L.y+R*0.25)<1.8){mixO(0.35,0.05,0.06,1);O.h+=1.2;}}
      else if(r<1.28){mixO(0.62,0.12,0.12,0.85);O.h+=2.5*Math.max(0,1-Math.abs(r-1.12)/0.16);}else mixO(0.78,0.22,0.20,0.6*(1-(r-1.28)/1.12));}break;}
    case 'abscesos':{mixO(0.78,0.20,0.17,0.3*sev);const w=NZ.worley(x*0.12+5,y*0.12);const pick=NZ.fbm(x*0.03+9,y*0.03,2)>0.2-0.55*sev;const sp=pick?1-sm(0.10,0.22,w[0]):0;if(sp>0){const core=1-sm(0.06,0.14,w[0]);mixO(0.70,0.10,0.10,sp*0.8);mixO(0.94,0.85,0.34,core);O.h+=3*sp;}break;}
    case 'isquemia':{const f=lesionField(organ,x,y,sev);if(f<=0)return;O.h*=1-0.65*f;O.h+=2.5*f;mixO(0.92,0.84,0.74,0.6*f);mixO(0.58,0.24,0.26,0.25*f*(1-f)*4);O.gl*=1-0.3*f;break;}
    case 'pancreatitis':{mixO(0.95,0.86,0.70,0.28*sev);O.gl=Math.min(1,O.gl+0.3*sev);const n=NZ.fbm(x*0.04+2,y*0.04,3);const th=0.32-0.3*sev;if(n>th){const t=sm(th,th+0.1,n);mixO(0.30,0.06,0.05,0.88*t);O.h-=t;}
      const w=NZ.worley(x*0.2+3,y*0.2);const fn=(NZ.fbm(x*0.05,y*0.05+4,2)>0.1-0.4*sev)?1-sm(0.05,0.15,w[0]):0;if(fn>0){mixO(0.97,0.95,0.88,fn);O.h+=2*fn;O.gl*=0.5;}break;}
    case 'inflamacion':{const f=lesionField(organ,x,y,sev);mixO(0.82,0.22,0.18,0.55*f);O.h+=2*f;break;}
    case 'edema':{const f=lesionField(organ,x,y,sev);mixO(0.96,0.90,0.84,0.38*f);O.h+=3*f;O.gl=Math.min(1,O.gl+0.3*f);break;}
    case 'fibrosis':{const f=lesionField(organ,x,y,sev);const ln=1-sm(0,0.07,Math.abs(NZ.fbm(x*0.03+1,y*0.03,3)-0.08));mixO(0.94,0.90,0.84,ln*f*0.9);O.h-=ln*f;break;}
    case 'nodulos':{const f=lesionField(organ,x,y,Math.max(sev,0.6));const w=NZ.worley(x*0.035+2,y*0.035);const nod=(1-sm(0.05,0.36,w[0]))*f;if(nod>0){mixO(0.92,0.86,0.74,nod*0.95);O.h+=9*nod*(0.5+sev);O.gl*=1-0.5*nod;}break;}
    case 'hemorragia':{const f=lesionField(organ,x,y,sev);const n=NZ.fbm(x*0.05+4,y*0.05,3);mixO(0.36,0.04,0.06,f*sm(0.05,0.2,n)*0.95);break;}
    case 'hidradenitis':{const st=Math.max(1,Math.min(3,Math.round(sev*3)));const G=HSG[st];
      let df=1e9;for(const i of G.fol){const q=segDist(x,y,FOLL[i]);if(q<df)df=q;}const sg=8+5*st;mixO(0.82,0.30,0.28,0.5*Math.exp(-(df*df)/(2*sg*sg)));
      if(st===3&&y<DBOT(x))mixO(0.84,0.40,0.38,0.22);
      for(const i of G.fol){const F=FOLL[i];const r=Math.hypot((x-F[0][0]-3)/6,(y-F[0][1]-20)/14);if(r<1){mixO(0.95,0.90,0.74,0.9*(1-r*r));O.h+=2*(1-r);}}
      let dt=1e9;for(const T of G.tun){const q=segDist(x,y,T);if(q<dt)dt=q;}
      if(dt<18&&y>SKBOT(x)){const fb=1-sm(0,0.09,Math.abs(NZ.fbm(x*0.05+3,y*0.09,2)-0.02));mixO(0.97,0.93,0.89,fb*0.85*sm(18,6,dt));}
      if(dt<9){const t=dt/9;if(t<0.58){const n=NZ.fbm(x*0.25,y*0.25,2);mixO(0.34,0.08,0.07,0.95);if(n>0.15)mixO(0.90,0.78,0.38,0.7);O.h-=5*(1-t);O.gl=0.75;}else{mixO(0.95,0.80,0.76,0.9);O.h+=1.2;}}
      for(const A of G.abs){const r=Math.hypot((x-A[0])/A[2],(y-A[1])/(A[2]*0.8));
        const rr=r*(1+0.12*NZ.fbm(x*0.08+A[0],y*0.08,2));
        if(rr<0.66){const n=NZ.fbm(x*0.3,y*0.3,2);mixO(0.93+0.03*n,0.82+0.04*n,0.40+0.08*n,0.97);O.h+=6*(1-rr);O.gl=0.85;}
        else if(rr<0.9){mixO(0.52,0.10,0.10,0.92);O.h+=4*(1-rr);}else if(rr<1.7)mixO(0.80,0.26,0.24,0.75*(1.7-rr)/0.85);
        if(y<SKBOT(x)+6){const dx=x-A[0];O.h+=(4+3*st)*Math.exp(-(dx*dx)/(2*(A[2]*1.3)*(A[2]*1.3)));}}
      if(y<SKBOT(x)+4)for(const ox of G.op){const dx=Math.abs(x-ox);if(dx<4.5){mixO(0.28,0.08,0.07,0.95);O.h-=5*(1-dx/4.5);O.gl=0.8;}else if(dx<10){mixO(0.93,0.80,0.40,0.8*(1-(dx-4.5)/5.5));O.h+=0.8;}}
      break;}
    case 'esteatosis':{const n=NZ.fbm(x*0.025+5,y*0.025,3);mixO(0.84,0.64,0.36,Math.min(0.92,sev*(1.05+0.25*n)));const w=NZ.worley(x*0.3,y*0.3);const dot=1-sm(0.05,0.18,w[0]);if(dot>0)mixO(0.94,0.82,0.54,dot*0.35*sev);O.gl=Math.min(1,O.gl+0.15*sev);break;}
    case 'necrosis':{const f=lesionField(organ,x,y,sev);const n=NZ.fbm(x*0.1,y*0.1,2);if(n>0)mixO(0.42,0.36,0.30,0.85*f);else mixO(0.80,0.72,0.42,0.85*f);O.gl*=1-0.9*f;O.h-=1.5*f;break;}
  }
}
const LIGHT=(()=>{const l=[-0.42,-0.58,0.70];const n=Math.hypot(l[0],l[1],l[2]);return l.map(v=>v/n);})();
const HALF=(()=>{const h=[LIGHT[0],LIGHT[1],LIGHT[2]+1];const n=Math.hypot(h[0],h[1],h[2]);return h.map(v=>v/n);})();
const MCV=document.createElement('canvas');MCV.width=PW;MCV.height=PH;const MCX=MCV.getContext('2d',{willReadFrequently:true});
function partPath(part){if(part._p)return part._p;const p=new Path2D();if(part.e){const q=part.e;p.ellipse(q[0],q[1],q[2],q[3],q[4]||0,0,Math.PI*2);}else p.addPath(new Path2D(part.d));part._p=p;return p;}
function shadePart(D,organ,part,lesion,sev,s){
  const o=ORG[organ];MCX.setTransform(1,0,0,1,0,0);MCX.clearRect(0,0,PW,PH);MCX.setTransform(RS*s,0,0,RS*s,RS*o.cx*(1-s),RS*o.cy*(1-s));
  const p=partPath(part);if(part.stroke){MCX.lineWidth=part.stroke;MCX.lineCap='round';MCX.lineJoin='round';MCX.strokeStyle='#fff';MCX.stroke(p);}else{MCX.fillStyle='#fff';MCX.fill(p);}
  const md=MCX.getImageData(0,0,PW,PH).data;const n=PW*PH;const A=new Float32Array(n);let x0=PW,y0=PH,x1=-1,y1=-1;
  for(let i=0;i<n;i++){const a=md[i*4+3];if(a){A[i]=a/255;const x=i%PW,y=(i-x)/PW;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
  if(x1<0)return;
  const B=boxBlur(A,PW,PH,Math.max(2,Math.round((part.blur||16)*RS/1.7)));
  const H=new Float32Array(n),C=new Float32Array(n*4);const mat=MAT[part.mat];const amp=(part.amp||20)*RS;
  let DB=null,dmax=1;if(part.dblur){DB=boxBlur(A,PW,PH,Math.round(part.dblur*RS/1.7));dmax=0;for(let i=0;i<n;i++)if(A[i]&&DB[i]>dmax)dmax=DB[i];}
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*PW+x;if(!A[i])continue;const e=Math.max(0,Math.min(1,(B[i]-0.5)*2));
    const lx=(x/RS-o.cx*(1-s))/s,ly=(y/RS-o.cy*(1-s))/s;mat(lx,ly,e,DB?Math.max(0,(DB[i]-0.5*dmax)/(0.5*dmax)):e);if(lesion)applyLesion(organ,lesion,sev,lx,ly,e);
    H[i]=amp*Math.sqrt(e)+O.h*RS;C[i*4]=O.r;C[i*4+1]=O.g;C[i*4+2]=O.b;C[i*4+3]=O.gl;}
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*PW+x;const a=A[i];if(!a)continue;
    const hl=(x>0&&A[i-1])?H[i-1]:H[i],hr=(x<PW-1&&A[i+1])?H[i+1]:H[i],hu=(y>0&&A[i-PW])?H[i-PW]:H[i],hd=(y<PH-1&&A[i+PW])?H[i+PW]:H[i];
    let nx=-(hr-hl)*0.5,ny=-(hd-hu)*0.5,nz=1;const nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
    const dif=Math.max(0,nx*LIGHT[0]+ny*LIGHT[1]+nz*LIGHT[2]);const sp=Math.pow(Math.max(0,nx*HALF[0]+ny*HALF[1]+nz*HALF[2]),part.shin||36)*C[i*4+3];
    const e=Math.max(0,Math.min(1,(B[i]-0.5)*2));const k=(0.30+0.85*dif)*(0.62+0.38*sm(0,0.4,e));
    const r=Math.min(255,(C[i*4]*k+sp*0.9)*255),g=Math.min(255,(C[i*4+1]*k+sp*0.9)*255),b=Math.min(255,(C[i*4+2]*k+sp*0.9)*255);
    const j=i*4;const da=D[j+3]/255;const oa=a+da*(1-a);D[j]=(r*a+D[j]*da*(1-a))/oa;D[j+1]=(g*a+D[j+1]*da*(1-a))/oa;D[j+2]=(b*a+D[j+2]*da*(1-a))/oa;D[j+3]=oa*255;}
}
const OCACHE=new Map();
function organImage(organ,lesion,stage){
  const key=organ+'|'+(lesion&&stage>0?lesion+'|'+stage:'sano');if(OCACHE.has(key))return OCACHE.get(key);
  const cv=document.createElement('canvas');cv.width=PW;cv.height=PH;const ctx=cv.getContext('2d');const img=ctx.createImageData(PW,PH);
  const sev=lesion?stage/3:0;const sw=lesion&&stage>0?swellOf(lesion,sev):1;
  for(const part of ORGDEF[organ].parts)shadePart(img.data,organ,part,part.les&&sev>0?lesion:null,sev,part.les?sw:1);
  ctx.putImageData(img,0,0);OCACHE.set(key,cv);return cv;
}
function prepCanvas(cv){const dpr=window.devicePixelRatio||1;const cw=cv.clientWidth||OW;const w=Math.round(cw*dpr),h=Math.round(cw*OH/OW*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}const ctx=cv.getContext('2d');ctx.setTransform(cv.width/OW,0,0,cv.height/OH,0,0);ctx.clearRect(0,0,OW,OH);ctx.imageSmoothingQuality='high';return ctx;}
function blit(ctx,img){ctx.save();ctx.shadowColor='rgba(10,20,40,0.28)';ctx.shadowBlur=16;ctx.shadowOffsetX=4;ctx.shadowOffsetY=8;ctx.drawImage(img,0,0,OW,OH);ctx.restore();}
function drawOrgan(cv,organ,lesion,sev){const st=lesion?Math.round(sev*3):0;const ctx=prepCanvas(cv);blit(ctx,organImage(organ,lesion,st));}
const TMP=document.createElement('canvas');TMP.width=PW;TMP.height=PH;const TMX=TMP.getContext('2d');
function drawOrganAnim(cv,organ,lesion,stage,p){const ctx=prepCanvas(cv);blit(ctx,organImage(organ,null,0));if(p<=0||!lesion||stage<=0)return;
  const tgt=organImage(organ,lesion,stage);const L=LOC[organ];TMX.globalCompositeOperation='source-over';TMX.clearRect(0,0,PW,PH);TMX.drawImage(tgt,0,0);
  TMX.globalCompositeOperation='destination-in';const R=Math.max(1,p*560*RS);const g=TMX.createRadialGradient(L.x*RS,L.y*RS,0,L.x*RS,L.y*RS,R);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(0.75,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');TMX.fillStyle=g;TMX.fillRect(0,0,PW,PH);TMX.globalCompositeOperation='source-over';
  ctx.drawImage(TMP,0,0,OW,OH);}

/* ================= Hero plates ================= */
function drawHero(){if(typeof V3!=='undefined'&&V3.ready&&v3Snapshot($('#heroA'),V3.sex,'pulmon',null,0)){v3Snapshot($('#heroB'),V3.sex,'pulmon','consolidacion',1);return;}drawOrgan($('#heroA'),'pulmon',null,0);drawOrgan($('#heroB'),'pulmon','consolidacion',1);}
function onV3Ready(){if(!V3.heroDone){V3.heroDone=true;drawHero();}if(assocOpen)renderAssoc(curDisease());renderModel();}

/* ================= Visor 3D (HuBMAP HRA, CC BY 4.0 · Z-Anatomy, CC BY-SA 4.0) ================= */
const ORG3D_ID={piel:1,cerebro:2,pulmon:3,corazon:4,higado:5,estomago:6,pancreas:7,rinon:8,reproductor:9,mama:10,ctx:11,vasos:12};
const PARTCODE={skin:0,areola:1,cerebellum:1,stem:2,cortexL:0,cortexR:0,mcaL:3,mcaR:3,lung:0,Rupper:1,Rmiddle:2,Rlower:3,Lupper:4,Llower:5,hilum:6,trachea:7,
  heart:0,right_cardiac_atrium:1,left_cardiac_atrium:2,right_ventricle:3,left_ventricle:4,coronary:5,vessel:6,liver:0,gall:1,
  kidney:0,capsule:0,cortex:1,column:2,pyramid:3,papilla:4,pelvis:5,pancreas:0,stomach:0,prostate:0,seminal:1,urethra:2,testis:3,uterus:0,ovary:1,tube:2,vagina:3,
  lobes:0,ducts:1,spleen:0,bowel:1,bladder:2,bone:3};
const LES3D={consolidacion:1,cavitacion:2,infarto:3,hepatitis:4,cirrosis:5,ulcera:6,abscesos:7,isquemia:8,pancreatitis:9,inflamacion:10,fibrosis:11,nodulos:12,hemorragia:13,necrosis:14,edema:15,hidradenitis:16,esteatosis:17};
const GLSL_COMMON=`
varying vec3 vO; varying float vPart; varying float vAO;
uniform int uOrg; uniform int uLes; uniform float uSev; uniform float uRev; uniform vec3 uC; uniform float uR; uniform vec3 uHS[4]; uniform int uNHS; uniform float uBump; uniform float uSel;
vec3 gA; float gH; float gR; vec3 gCell;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
 vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
 vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
 float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
 return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453123);}
float hash1(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
vec2 cell(vec3 p){vec3 b=floor(p),f=fract(p);float f1=8.0,f2=8.0;gCell=b;
 for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec3 g=vec3(float(i),float(j),float(k));vec3 r=g+hash3(b+g)-f;float d=dot(r,r);if(d<f1){f2=f1;f1=d;gCell=b+g;}else if(d<f2)f2=d;}
 return sqrt(vec2(f1,f2));}
float region(vec3 c,float R){float d=length(vO-c)/max(R*uRev,1e-4);d+=0.22*fbm(vO*40.0);return 1.0-smoothstep(0.72,1.0,d);}
bool isPart(float k){return abs(vPart-k)<0.5;}
void tissue(){
 vec3 p=vO; bool fr=gl_FrontFacing; gA=vec3(0.8,0.6,0.55); gH=0.0; gR=0.45;
 if(uOrg==1){float n=fbm(p*70.0);gA=vec3(0.80,0.60,0.50)+0.03*n;gR=0.6;gH=0.25*fbm(p*900.0);if(isPart(1.0))gA=vec3(0.52,0.32,0.26);}
 else if(uOrg==2){float n=fbm(p*60.0);gA=vec3(0.76,0.58,0.53)+0.04*n;gR=0.42;
   float v=abs(snoise(p*60.0+2.0));float vv=(1.0-smoothstep(0.0,0.035,v))*smoothstep(-0.1,0.35,snoise(p*14.0+5.0));gA=mix(gA,vec3(0.60,0.14,0.15),vv*0.6);gH+=vv*0.4;
   if(isPart(1.0)){float f=sin(p.y*1400.0+fbm(p*90.0)*5.0);gA=vec3(0.78,0.60,0.56)+0.05*f;gH=0.5*f;}
   if(isPart(2.0))gA=vec3(0.88,0.78,0.72);}
 else if(uOrg==3){vec2 c=cell(p*180.0);float sep=1.0-smoothstep(0.0,0.06,c.y-c.x);gA=vec3(0.86,0.55,0.54)+0.03*fbm(p*50.0);gA*=1.0-0.12*sep;gH=-0.4*sep;gR=0.38;
   float a=fbm(p*260.0+7.0);float an=smoothstep(0.28,0.55,a)*(0.35+0.5*smoothstep(0.40,0.62,p.y));gA=mix(gA,vec3(0.18,0.17,0.19),an*0.75);
   if(isPart(6.0))gA=vec3(0.70,0.42,0.42);
   if(isPart(7.0)){float r=0.5+0.5*sin(p.y*700.0);gA=vec3(0.92,0.84,0.78)-0.06*r;gH=0.6*r;gR=0.35;}}
 else if(uOrg==4){float f=fbm(p*80.0);gA=vec3(0.50,0.15,0.14)+0.04*f;gR=0.32;gH=0.2*fbm(p*500.0);
   float fat=smoothstep(0.32,0.6,fbm(p*45.0+3.0))*0.8;if(isPart(1.0)||isPart(2.0))fat=max(fat,0.45*smoothstep(0.1,0.45,fbm(p*30.0)));
   if(fat>0.0){vec2 c=cell(p*400.0);gA=mix(gA,vec3(0.94,0.80,0.45)-0.05*c.x,fat*0.9);gH+=fat*(0.8-c.x);}
   if(isPart(5.0)){gA=vec3(0.66,0.10,0.09);gR=0.22;}
   if(isPart(6.0)){gA=vec3(0.90,0.72,0.64)+0.03*f;gR=0.3;}}
 else if(uOrg==5){float f=fbm(p*45.0);vec2 c=cell(p*500.0);gA=vec3(0.50,0.16,0.12)+0.035*f-0.03*(1.0-smoothstep(0.0,0.1,c.y-c.x));gR=0.22;
   if(isPart(1.0)){gA=vec3(0.24,0.42,0.18)+0.03*f;gR=0.18;}}
 else if(uOrg==6){float f=fbm(p*60.0);
   if(fr){gA=vec3(0.88,0.66,0.58)+0.03*f;gR=0.3;float v=abs(snoise(p*70.0));gA=mix(gA,vec3(0.62,0.20,0.20),(1.0-smoothstep(0.0,0.04,v))*0.5);}
   else{float t=p.x*45.0+p.y*70.0+2.2*fbm(p*18.0);float rid=pow(0.5+0.5*sin(t*6.283),2.0);gA=vec3(0.84,0.46,0.42)+0.06*rid;gH=1.4*rid;gR=0.35;}}
 else if(uOrg==7){vec2 c=cell(p*220.0);float bump=1.0-smoothstep(0.0,0.7,c.x);float sep=1.0-smoothstep(0.0,0.07,c.y-c.x);gA=vec3(0.92,0.76,0.52)-0.08*sep;gH=1.0*bump-0.5*sep;gR=0.4;}
 else if(uOrg==8){float f=fbm(p*70.0);gA=vec3(0.56,0.20,0.17)+0.03*f;gR=0.22;
   if(isPart(1.0)||isPart(2.0))gA=vec3(0.64,0.30,0.26)+0.03*f;
   if(isPart(3.0)||isPart(4.0)){float st=0.5+0.5*sin(dot(p,vec3(900.0,500.0,0.0)));gA=vec3(0.46,0.12,0.13)+0.04*st;gH=0.3*st;}
   if(isPart(5.0)){gA=vec3(0.93,0.86,0.72);gR=0.3;}
   if(!fr)gA*=0.55;}
 else if(uOrg==9){float f=fbm(p*60.0);gA=vec3(0.86,0.56,0.52)+0.03*f;gR=0.3;
   if(isPart(1.0)){vec2 c=cell(p*300.0);gA=vec3(0.92,0.84,0.78);gH=1.0-smoothstep(0.0,0.6,c.x);}
   if(isPart(2.0))gA=vec3(0.88,0.62,0.58);if(isPart(3.0))gA=vec3(0.86,0.60,0.56);}
 else if(uOrg==10){vec2 c=cell(p*160.0);gA=isPart(1.0)?vec3(0.96,0.80,0.70):vec3(0.96,0.86,0.70)-0.06*c.x;gH=0.8-c.x;gR=0.45;}
 else if(uOrg==11){gR=0.5;if(isPart(0.0))gA=vec3(0.46,0.16,0.22);if(isPart(1.0))gA=vec3(0.88,0.68,0.62);if(isPart(2.0))gA=vec3(0.90,0.80,0.72);if(isPart(3.0)){gA=vec3(0.93,0.89,0.80)+0.03*fbm(p*90.0);gR=0.7;}}
 else if(uOrg==12){gA=vec3(0.86,0.42,0.40);gR=0.3;}
 // ---------- lesiones ----------
 if(uLes>0&&uSev>0.0){float s=uSev;
  if(uLes==1){float m=region(uC,uR*(0.55+0.6*s));if(uOrg==3)m*=float(isPart(3.0));
    vec3 col=s<0.5?vec3(0.62,0.20,0.18):(s<0.9?vec3(0.48,0.12,0.11):vec3(0.60,0.55,0.52));gA=mix(gA,col,0.9*m);gR=mix(gR,0.6,m);gH+=m*0.8*fbm(p*300.0);}
  else if(uLes==2){float reg=region(uC,uR*(0.6+0.7*s));vec2 c=cell(p*380.0);float nod=(1.0-smoothstep(0.15,0.32,c.x))*reg*step(hash1(gCell),0.35+0.4*s);
    gA=mix(gA,vec3(0.93,0.88,0.70),nod);gH+=1.5*nod;
    if(s>=0.6){float R=(0.006+0.010*s)*uRev;float d=length(p-uC)/R;if(d<1.0){gA=vec3(0.20,0.11,0.10);gH-=3.0*(1.0-d*d);gR=0.8;}else if(d<1.4){gA=mix(gA,vec3(0.90,0.82,0.60),1.0-abs(d-1.2)/0.2);gH+=1.0;}}}
  else if(uLes==3){float m=region(uC,uR*(0.45+0.5*s));float n=fbm(p*200.0);
    if(s<0.5)gA=mix(gA,vec3(0.34,0.06,0.10),m*(0.6+0.3*n));
    else{float core=smoothstep(0.35,0.8,m);float rim=m*(1.0-core);vec3 cc=s<0.9?vec3(0.86,0.70,0.44):vec3(0.84,0.80,0.74);gA=mix(gA,vec3(0.36,0.05,0.07),rim*1.2);gA=mix(gA,cc,core*(0.85+0.1*n));if(s>=0.9)gH-=1.5*core;}
    gR=mix(gR,0.6,m);}
  else if(uLes==4){float m=region(uC,uR);float n=fbm(p*40.0);gA=mix(gA,vec3(0.70,0.52,0.24),m*s*(0.32+0.2*n));vec2 c=cell(p*300.0);gA=mix(gA,vec3(0.84,0.70,0.36),m*s*0.5*(1.0-smoothstep(0.1,0.3,c.x)));}
  else if(uLes==5){float m=region(uC,uR);vec2 c=cell(p*(260.0+80.0*s));float nod=1.0-smoothstep(0.0,0.8,c.x);float sep=1.0-smoothstep(0.0,0.10,c.y-c.x);
    gA=mix(gA,vec3(0.76,0.52,0.26)+0.05*nod,m*0.8*s);gA=mix(gA,vec3(0.92,0.86,0.74),m*sep*0.8*s);gH+=m*s*(3.0*nod-1.0*sep);gR=mix(gR,0.5,m*s);}
  else if(uLes==6){if(!fr){float R=(0.006+0.008*s)*max(uRev,0.05);float d=length(p-uC)/R*(1.0+0.15*snoise(p*500.0));
    if(d<1.0){gA=mix(gA,vec3(0.86,0.80,0.66),0.92);gH=-4.0*(1.0-d*d);gR=0.7;if(s>=0.9&&length(p-uC-vec3(R*0.3,R*0.2,0.0))<R*0.14)gA=vec3(0.30,0.04,0.05);}
    else if(d<1.3){gA=mix(gA,vec3(0.62,0.12,0.12),0.85);gH=2.0;}else if(d<2.4)gA=mix(gA,vec3(0.80,0.24,0.22),0.6*(2.4-d)/1.1);}}
  else if(uLes==7){float m=region(uC,uR);gA=mix(gA,vec3(0.72,0.20,0.17),0.35*s*m);vec2 c=cell(p*260.0);float pick=step(hash1(gCell),0.15+0.45*s)*m;
    float sp=(1.0-smoothstep(0.12,0.38,c.x))*pick;float core=(1.0-smoothstep(0.05,0.18,c.x))*pick;gA=mix(gA,vec3(0.70,0.10,0.10),sp*0.8);gA=mix(gA,vec3(0.95,0.86,0.36),core);gH+=2.0*sp;}
  else if(uLes==8){float m=region(uC,uR*(0.5+0.6*s))*float(isPart(3.0)||isPart(0.0))*step(0.0,p.x);gA=mix(gA,vec3(0.93,0.86,0.78),0.65*m);gA=mix(gA,vec3(0.60,0.26,0.30),0.35*m*(1.0-m)*4.0);gH*=1.0-0.7*m;gR=mix(gR,0.6,m);}
  else if(uLes==9){float m=region(uC,uR);gA=mix(gA,vec3(0.96,0.88,0.74),0.3*s*m);float n=fbm(p*70.0+2.0);float th=0.35-0.3*s;float hm=smoothstep(th,th+0.1,n)*m;gA=mix(gA,vec3(0.32,0.06,0.06),0.88*hm);
    vec2 c=cell(p*420.0);float fn=(1.0-smoothstep(0.05,0.22,c.x))*step(hash1(gCell),0.1+0.4*s)*m;gA=mix(gA,vec3(0.98,0.96,0.90),fn);gH+=2.0*fn;}
  else if(uLes==10){float m=region(uC,uR*(0.5+0.6*s));gA=mix(gA,vec3(0.80,0.20,0.17),0.55*m);gH+=1.0*m;}
  else if(uLes==11){float m=region(uC,uR*(0.5+0.6*s));float ln=1.0-smoothstep(0.0,0.06,abs(fbm(p*90.0+1.0)));gA=mix(gA,vec3(0.94,0.90,0.84),ln*m*0.9);gH-=ln*m;}
  else if(uLes==12){float m=region(uC,uR*(0.6+0.5*s));vec2 c=cell(p*120.0);float nod=(1.0-smoothstep(0.05,0.4,c.x))*m*step(hash1(gCell),0.5);gA=mix(gA,vec3(0.92,0.86,0.74),nod*0.95);gH+=4.0*nod;}
  else if(uLes==13){float m=region(uC,uR*(0.5+0.6*s));float n=fbm(p*90.0+4.0);gA=mix(gA,vec3(0.34,0.04,0.06),m*smoothstep(0.0,0.2,n)*0.95);}
  else if(uLes==14){float m=region(uC,uR*(0.5+0.6*s));float n=fbm(p*120.0);gA=mix(gA,n>0.0?vec3(0.44,0.38,0.32):vec3(0.80,0.72,0.42),0.85*m);gR=mix(gR,0.9,m);gH-=m;}
  else if(uLes==15){float m=region(uC,uR*(0.5+0.6*s));gA=mix(gA,vec3(0.96,0.90,0.84),0.4*m);gR=mix(gR,0.12,m);}
  else if(uLes==16){float st=floor(s*3.0+0.5);float best=10.0;for(int i=0;i<4;i++){if(i<uNHS){float d=length(p-uHS[i]);best=min(best,d);}}
    float R=(0.020+0.014*st)*max(uRev,0.02);float m=1.0-smoothstep(0.6,1.0,best/R+0.3*fbm(p*70.0));
    if(m>0.0){gA=mix(gA,vec3(0.56,0.30,0.28),0.55*m);vec2 c=cell(p*230.0);float id=hash1(gCell);
      float nod=step(id,0.22+0.2*st)*(1.0-smoothstep(0.15,0.5,c.x));gH+=nod*m*4.0;gA=mix(gA,vec3(0.74,0.22,0.20),nod*m*0.85);
      float core=step(id,0.10*st)*(1.0-smoothstep(0.05,0.2,c.x));gA=mix(gA,vec3(0.94,0.84,0.46),core*m);gR=mix(gR,0.18,core*m);
      if(st>=2.0){float pit=step(0.93-0.05*st,id)*(1.0-smoothstep(0.04,0.11,c.x));gA=mix(gA,vec3(0.16,0.06,0.05),pit*m);gH-=pit*m*4.0;
        float sc=1.0-smoothstep(0.0,0.07,abs(fbm(p*48.0+3.0)));gA=mix(gA,vec3(0.88,0.74,0.70),sc*m*0.8*(st-1.0)/2.0);gH+=sc*m*2.0;}}}
  else if(uLes==17){float m=region(uC,uR);float n=fbm(p*30.0);gA=mix(gA,vec3(0.86,0.66,0.38),min(0.92,s*(1.05+0.25*n))*m);gR=mix(gR,0.18,m*s);}
 }
}`;
function makeTissueMat(orgKey,opts){
  const U={uOrg:{value:ORG3D_ID[orgKey]},uLes:{value:0},uSev:{value:0},uRev:{value:1},uC:{value:new THREE.Vector3()},uR:{value:0.05},
    uHS:{value:[new THREE.Vector3(9,9,9),new THREE.Vector3(9,9,9),new THREE.Vector3(9,9,9),new THREE.Vector3(9,9,9)]},uNHS:{value:0},uBump:{value:0.00035},uSel:{value:0}};
  const m=new THREE.MeshPhysicalMaterial(Object.assign({color:0xffffff,roughness:0.45,metalness:0,clearcoat:({piel:0,ctx:0,higado:0.25,corazon:0.4,cerebro:0.3})[orgKey]??0.35,clearcoatRoughness:0.32,side:THREE.DoubleSide},opts||{}));
  m.userData.U=U;
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aPart; attribute float aAO; varying vec3 vO; varying float vPart; varying float vAO;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvO=position; vPart=aPart; vAO=aAO;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+GLSL_COMMON)
      .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\ntissue();')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=pow(clamp(gA,0.0,1.0),vec3(2.2))*mix(0.22,1.0,pow(smoothstep(0.02,0.9,vAO),1.3));')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=gR;')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition);float hx=dFdx(gH*uBump),hy=dFdy(gH*uBump);vec3 tR1=cross(dpy,normal),tR2=cross(normal,dpx);float det=dot(dpx,tR1);vec3 grad=sign(det)*(hx*tR1+hy*tR2);normal=normalize(abs(det)*normal-grad);}')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float fr=1.0-abs(dot(normalize(vViewPosition),normal));totalEmissiveRadiance+=uSel*vec3(0.04,0.10,0.28)*pow(fr,2.0);}');
  };
  m.customProgramCacheKey=()=>'tissue-v1'+(opts&&opts.transparent?'-t':'');
  return m;
}
const V3={ok:!!window.THREE,ready:false,sex:'m',packs:{},loading:{},mode:'body',showSkin:true,cut:true,organ:null,yaw:0.0,pitch:0.06,dist:3.6,target:null,anim:null,dirty:true,state:{organ:'pulmon',lesion:null,sev:0,rev:1}};
function v3Init(){
  if(!V3.ok){$('#v3dMsg').textContent='No se pudo cargar el motor 3D en esta vista.';return;}
  const cv=$('#v3d'); V3.ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:false});
  V3.ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1)); V3.ren.outputEncoding=THREE.sRGBEncoding; V3.ren.toneMapping=THREE.ACESFilmicToneMapping; V3.ren.toneMappingExposure=0.88; V3.ren.localClippingEnabled=true;
  V3.scene=new THREE.Scene(); V3.cam=new THREE.PerspectiveCamera(26,1,0.01,30); V3.target=new THREE.Vector3(0,0.05,0);
  V3.env=makeEnv(V3.ren); V3.scene.environment=V3.env;
  const key=new THREE.DirectionalLight(0xfff4ea,1.6); key.position.set(-1.2,2.2,2.4); V3.scene.add(key);
  const rim=new THREE.DirectionalLight(0xdfe8ff,0.9); rim.position.set(1.8,0.8,-2.2); V3.scene.add(rim);
  V3.scene.add(new THREE.HemisphereLight(0xffffff,0x6a5a55,0.35));
  V3.camLight=new THREE.DirectionalLight(0xffffff,0.55); V3.scene.add(V3.camLight);
  V3.root=new THREE.Group(); V3.scene.add(V3.root);
  bindOrbit(cv);
  new ResizeObserver(()=>{v3Size();}).observe(cv.parentElement); v3Size();
  v3Loop();
  v3LoadSex(V3.sex);
}
function makeEnv(ren){
  const pm=new THREE.PMREMGenerator(ren); const sc=new THREE.Scene();
  const geo=new THREE.SphereGeometry(10,32,16); const col=[];const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/10;const c=new THREE.Color().setRGB(0.55+0.4*Math.max(0,y),0.55+0.38*Math.max(0,y),0.58+0.36*Math.max(0,y)).multiplyScalar(y<0?0.45+0.4*(1+y):1);col.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); sc.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const panel=(x,y,z,w,h,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(k,k,k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);sc.add(m);};
  panel(-4,6,6,6,3,6); panel(6,2,-3,3,5,2.5); panel(0,-1,7,8,1.2,1.2);
  const rt=pm.fromScene(sc,0.03); pm.dispose(); return rt.texture;
}
function v3Size(){const cv=$('#v3d');const w=cv.clientWidth||600,h=cv.clientHeight||500;V3.ren.setSize(w,h,false);V3.cam.aspect=w/h;V3.cam.updateProjectionMatrix();V3.dirty=true;}
async function fetchPack(sex){
  const man=await (await fetch('models/'+sex+'.json')).json();
  const txt=(await (await fetch('models/'+sex+'.b64.txt')).text()).trim();
  const bin=Uint8Array.from(atob(txt),ch=>ch.charCodeAt(0));
  let buf;
  if('DecompressionStream' in window){buf=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
  else throw new Error('sin DecompressionStream');
  return {man,buf};
}
async function v3LoadSex(sex){
  $('#v3dLoad').hidden=false; $('#v3dMsg').textContent='Cargando el modelo '+(sex==='f'?'femenino':'masculino')+'…';
  try{
    if(!V3.packs[sex]){V3.loading[sex]=V3.loading[sex]||fetchPack(sex).then(p=>buildPack(sex,p));V3.packs[sex]=await V3.loading[sex];}
    if(V3.sex!==sex) return;
    V3.root.clear(); V3.root.add(V3.packs[sex].group); V3.ready=true; $('#v3dLoad').hidden=true;
    v3Apply(true); if(typeof onV3Ready==='function') onV3Ready();
  }catch(e){$('#v3dMsg').textContent='No se pudieron cargar los modelos 3D ('+(e&&e.message||e)+'). Recarga la página para intentarlo de nuevo.';}
}
function buildPack(sex,{man,buf}){
  const group=new THREE.Group(); const organs={};
  for(const k in man.organs){const e=man.organs[k];
    const q=new Uint16Array(buf,e.pos,e.nv*3);const pid=new Uint8Array(buf,e.pid,e.nv);const ind=e.idx===16?new Uint16Array(buf,e.ind,e.nf*3):new Uint32Array(buf,e.ind,e.nf*3);
    const pos=new Float32Array(e.nv*3);for(let i=0;i<e.nv;i++)for(let a=0;a<3;a++)pos[i*3+a]=e.lo[a]+q[i*3+a]/65535*(e.hi[a]-e.lo[a]);
    const part=new Float32Array(e.nv);for(let i=0;i<e.nv;i++)part[i]=PARTCODE[e.parts[pid[i]]]||0;const aoB=new Uint8Array(buf,e.ao,e.nv);const ao=new Float32Array(e.nv);for(let i=0;i<e.nv;i++)ao[i]=aoB[i]/255;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aPart',new THREE.BufferAttribute(part,1));g.setAttribute('aAO',new THREE.BufferAttribute(ao,1));g.setIndex(new THREE.BufferAttribute(ind,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    const isSkin=k==='piel';
    const mat=makeTissueMat(k,isSkin?{transparent:true,opacity:0.14,depthWrite:false,side:THREE.FrontSide,envMapIntensity:0.35,roughness:0.8}:{});
    const mesh=new THREE.Mesh(g,mat);mesh.userData.organ=k;mesh.renderOrder=isSkin?10:0;
    const c=new THREE.Vector3();g.boundingBox.getCenter(c);const piv=new THREE.Group();piv.position.copy(c);mesh.position.copy(c).multiplyScalar(-1);piv.add(mesh);const fb=new THREE.Box3();if(k==='rinon'){const v=new THREE.Vector3();for(let i=0;i<e.nv;i++){if(part[i]===5)continue;v.set(pos[i*3],pos[i*3+1],pos[i*3+2]);fb.expandByPoint(v);}}else fb.copy(g.boundingBox);piv.userData={organ:k,center:c,mesh,box:g.boundingBox.clone(),fbox:fb};
    group.add(piv);organs[k]=piv;
    // anterior default anchor
    let best=-1e9,bi=0;for(let i=0;i<e.nv;i++){const dx=pos[i*3]-c.x,dy=pos[i*3+1]-c.y;const sc=pos[i*3+2]-4*(dx*dx+dy*dy)/Math.max(0.01,g.boundingSphere.radius);if(sc>best){best=sc;bi=i;}}
    piv.userData.front=new THREE.Vector3(pos[bi*3],pos[bi*3+1],pos[bi*3+2]);
  }
  const A={};for(const k in man.anchors)A[k]=new THREE.Vector3().fromArray(man.anchors[k]);
  const sk=organs.piel.userData.box;const bc=new THREE.Vector3();sk.getCenter(bc);
  return {group,organs,A,bodyC:bc,bodyH:sk.max.y-sk.min.y};
}
function lesionSetup(pk,organ,lesion){
  const P=pk.organs[organ];if(!P)return null;const A=pk.A;const u=P.userData;const size=u.box.getSize(new THREE.Vector3()).length();
  let c=u.front.clone(),R=size*0.22;
  if(organ==='pulmon'&&lesion==='consolidacion'){c=A.rll;R=size*0.30;}
  else if(organ==='pulmon'&&lesion==='cavitacion'){c=A.rulApex;R=size*0.16;}
  else if(organ==='corazon'&&(lesion==='infarto')){c=A.lvAnt;R=size*0.22;}
  else if(organ==='estomago'&&lesion==='ulcera'){c=nearestVertex(P,A.antrum);}
  else if(organ==='rinon'){c=A.kidR;R=size*0.18;}
  else if(organ==='cerebro'&&lesion==='isquemia'){c=A.mcaLsurf;R=size*0.30;}
  else if(['hepatitis','cirrosis','esteatosis','pancreatitis'].includes(lesion)){c=u.center.clone();R=size*0.75;}
  return {c,R};
}
function nearestVertex(P,t){const pos=P.userData.mesh.geometry.attributes.position;let b=1e9,bi=0;for(let i=0;i<pos.count;i++){const dx=pos.getX(i)-t.x,dy=pos.getY(i)-t.y,dz=pos.getZ(i)-t.z;const d=dx*dx+dy*dy+dz*dz;if(d<b){b=d;bi=i;}}return new THREE.Vector3(pos.getX(bi),pos.getY(bi),pos.getZ(bi));}
function swell3(l,s){return {hepatitis:1+0.05*s,cirrosis:1-0.12*s,abscesos:1+0.05*s,pancreatitis:1+0.08*s,edema:1+0.06*s,inflamacion:1+0.03*s,esteatosis:1+0.07*s}[l]||1;}
function applyPackState(pk,st,mode){
  for(const k in pk.organs){const P=pk.organs[k];const U=P.userData.mesh.material.userData.U;const on=k===st.organ&&st.lesion&&st.sev>0;
    U.uLes.value=on?(LES3D[st.lesion]||0):0;U.uSev.value=on?st.sev:0;U.uRev.value=on?st.rev:1;U.uSel.value=(mode==='body'&&k===st.organ)?1:0;
    if(on){const L=lesionSetup(pk,k,st.lesion);if(L){U.uC.value.copy(L.c);U.uR.value=L.R;}
      if(st.lesion==='hidradenitis'){const s3=Math.round(st.sev*3);const list=s3>=3?[pk.A.axR,pk.A.axL,pk.A.inR,pk.A.inL]:(s3>=2?[pk.A.axR,pk.A.axL]:[pk.A.axR]);list.forEach((v,i)=>U.uHS.value[i].copy(v));U.uNHS.value=list.length;}}
    const sw=on?swell3(st.lesion,st.sev*st.rev):1;P.scale.setScalar(sw);
    const m=P.userData.mesh.material;
    let vis=true;
    if(mode==='organ'){vis=(k===st.organ);}
    else{if(k==='piel')vis=V3.showSkin;}
    P.visible=vis;
    if(k==='piel'){const op=mode==='organ'?1:0.14;if(m.opacity!==op){m.opacity=op;m.transparent=op<1;m.depthWrite=op>=1;m.needsUpdate=true;}}
    const wantCut=mode==='organ'&&V3.cut&&(k==='rinon'||k==='estomago')&&k===st.organ;
    m.clippingPlanes=wantCut?[new THREE.Plane(new THREE.Vector3(0,0,-1),P.userData.center.z+(k==='estomago'?0.004:0))]:null;
  }
}
function v3Apply(snapCam){
  if(!V3.ready)return;const pk=V3.packs[V3.sex];applyPackState(pk,V3.state,V3.mode);
  const cutable=V3.mode==='organ'&&(V3.state.organ==='rinon'||V3.state.organ==='estomago');$('#v3Cut').hidden=!cutable;
  $('#v3Skin').disabled=V3.mode==='organ';
  if(snapCam!==false)v3Frame(snapCam===true);
  V3.dirty=true;
}
function camGoal(){
  const pk=V3.packs[V3.sex];
  if(V3.mode==='body'){return {t:pk.bodyC.clone().add(new THREE.Vector3(0,0.02,0)),d:pk.bodyH*1.95,yaw:0,pitch:0.04};}
  const o=V3.state.organ;const P=pk.organs[o];if(!P)return null;
  if(o==='piel'){const t=pk.A.axR.clone();return {t,d:0.42,yaw:-0.95,pitch:0.12};}
  const sz=P.userData.fbox.getSize(new THREE.Vector3());const r=Math.max(sz.x,sz.y,sz.z);
  const yaw={cerebro:-1.45,rinon:0,estomago:0}[o]||0;
  return {t:P.userData.fbox.getCenter(new THREE.Vector3()),d:r*2.9+0.05,yaw,pitch:o==='cerebro'?0.1:0.05};
}
function v3Frame(instant){const g=camGoal();if(!g)return;
  if(instant||reduce){V3.target.copy(g.t);V3.dist=g.d;V3.yaw=g.yaw;V3.pitch=g.pitch;V3.anim=null;V3.dirty=true;return;}
  V3.anim={t0:performance.now(),dur:700,from:{t:V3.target.clone(),d:V3.dist,yaw:V3.yaw,pitch:V3.pitch},to:g};}
function v3Loop(now){requestAnimationFrame(v3Loop);if(!V3.ren)return;
  if(V3.anim){const a=V3.anim;let k=Math.min(1,((now||performance.now())-a.t0)/a.dur);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    V3.target.lerpVectors(a.from.t,a.to.t,e);V3.dist=a.from.d+(a.to.d-a.from.d)*e;V3.yaw=a.from.yaw+(a.to.yaw-a.from.yaw)*e;V3.pitch=a.from.pitch+(a.to.pitch-a.from.pitch)*e;if(k>=1)V3.anim=null;V3.dirty=true;}
  if(V3.revAnim){const r=V3.revAnim;const k=Math.min(1,((now||performance.now())-r.t0)/r.dur);V3.state.rev=k;applyPackState(V3.packs[V3.sex],V3.state,V3.mode);if(k>=1){V3.revAnim=null;if(r.done)r.done();}V3.dirty=true;}
  if(!V3.dirty)return;V3.dirty=false;
  const cp=Math.cos(V3.pitch);V3.cam.position.set(V3.target.x+V3.dist*cp*Math.sin(V3.yaw),V3.target.y+V3.dist*Math.sin(V3.pitch),V3.target.z+V3.dist*cp*Math.cos(V3.yaw));
  V3.cam.near=Math.max(0.005,V3.dist*0.02);V3.cam.far=V3.dist*10+5;V3.cam.updateProjectionMatrix();V3.cam.lookAt(V3.target);
  V3.camLight.position.copy(V3.cam.position);V3.ren.render(V3.scene,V3.cam);
}
function bindOrbit(cv){
  const pts=new Map();let moved=0,last=null,pinch0=null;
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button});moved=0;last={x:e.clientX,y:e.clientY};V3.anim=null;});
  cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
    if(pts.size===2){const a=[...pts.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch0)V3.dist=Math.max(0.08,Math.min(8,V3.dist*pinch0/d));pinch0=d;}
    else if(p.b===2||e.shiftKey){const s=V3.dist*0.0016;const right=new THREE.Vector3(Math.cos(V3.yaw),0,-Math.sin(V3.yaw));V3.target.addScaledVector(right,-dx*s);V3.target.y+=dy*s;}
    else{V3.yaw-=dx*0.008;V3.pitch=Math.max(-1.3,Math.min(1.3,V3.pitch+dy*0.006));}
    V3.dirty=true;});
  const up=e=>{const p=pts.get(e.pointerId);pts.delete(e.pointerId);if(pts.size<2)pinch0=null;if(p&&moved<6&&V3.mode==='body')pick(e);};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);pinch0=null;});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();V3.dist=Math.max(0.08,Math.min(8,V3.dist*Math.exp(e.deltaY*0.0012)));V3.anim=null;V3.dirty=true;},{passive:false});
  cv.addEventListener('keydown',e=>{const k=e.key;let h=true;if(k==='ArrowLeft')V3.yaw-=0.15;else if(k==='ArrowRight')V3.yaw+=0.15;else if(k==='ArrowUp')V3.pitch=Math.min(1.3,V3.pitch+0.1);else if(k==='ArrowDown')V3.pitch=Math.max(-1.3,V3.pitch-0.1);else if(k==='+'||k==='=')V3.dist*=0.88;else if(k==='-')V3.dist*=1.14;else h=false;if(h){e.preventDefault();V3.dirty=true;}});
}
const RAY=window.THREE?new THREE.Raycaster():null;
function pick(e){if(!V3.ready)return;const cv=$('#v3d');const r=cv.getBoundingClientRect();const v=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  RAY.setFromCamera(v,V3.cam);const pk=V3.packs[V3.sex];const list=[];for(const k in pk.organs){if(k==='ctx'||k==='vasos'||k==='piel')continue;if(pk.organs[k].visible)list.push(pk.organs[k].userData.mesh);}
  let hit=RAY.intersectObjects(list,false)[0];let org=hit?hit.object.userData.organ:null;
  if(!org&&V3.showSkin){const h2=RAY.intersectObject(pk.organs.piel.userData.mesh,false)[0];if(h2)org='piel';}
  if(org){if(V3.pickHook){V3.pickHook(org);return;}if(ORG[org])selectOrgan(org,true);}}
function v3SetSex(sex){if(sex===V3.sex&&V3.ready)return;V3.sex=sex;V3.ready=false;$$('#v3Sex button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===sex)));renderOrganChips();
  if(!availableOrgans().includes(S.organ)){S.organ='pulmon';fillDisSel();}
  v3LoadSex(sex);renderModel();}
function v3SetMode(m){V3.mode=m;$$('#v3Mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));v3Apply();}
function v3Reveal(done){if(reduce||!V3.ready){V3.state.rev=1;v3Apply(false);if(done)done();return;}V3.revAnim={t0:performance.now(),dur:1600,done};}
/* Snapshot renderer for hero plates and the association panel */
let SNAP=null;
function v3Snapshot(cv,sex,organ,lesion,sev,view){
  const pk=V3.packs[sex];if(!pk)return false;
  if(!SNAP){const c=document.createElement('canvas');SNAP={c,r:new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:true,preserveDrawingBuffer:true})};SNAP.r.outputEncoding=THREE.sRGBEncoding;SNAP.r.toneMapping=THREE.ACESFilmicToneMapping;SNAP.r.localClippingEnabled=true;
    SNAP.scene=new THREE.Scene();SNAP.scene.environment=makeEnv(SNAP.r);const k=new THREE.DirectionalLight(0xfff4ea,1.6);k.position.set(-1.2,2.2,2.4);SNAP.scene.add(k);const rm=new THREE.DirectionalLight(0xdfe8ff,0.9);rm.position.set(1.8,0.8,-2.2);SNAP.scene.add(rm);SNAP.scene.add(new THREE.HemisphereLight(0xffffff,0x6a5a55,0.35));SNAP.cl=new THREE.DirectionalLight(0xffffff,0.55);SNAP.scene.add(SNAP.cl);SNAP.cam=new THREE.PerspectiveCamera(26,1,0.005,20);}
  const w=cv.width,h=cv.height;SNAP.r.setSize(w,h,false);SNAP.cam.aspect=w/h;SNAP.cam.updateProjectionMatrix();
  const st={organ,lesion,sev,rev:1};
  const P=pk.organs[organ];const sz=P.userData.box.getSize(new THREE.Vector3());const r=Math.max(sz.x,sz.y,sz.z);const t=P.userData.center;const d=r*2.6;const yaw=(view&&view.yaw)||0;
  const saved=[];for(const k in pk.organs){const Q=pk.organs[k];saved.push([Q,Q.visible,Q.scale.x]);const U=Q.userData.mesh.material.userData.U;saved.push([U,U.uLes.value,U.uSev.value,U.uRev.value,U.uSel.value,U.uC.value.clone(),U.uR.value]);}
  applyPackState(pk,st,'organ');
  const parent=pk.group.parent;SNAP.scene.add(pk.group);
  SNAP.cam.position.set(t.x+d*Math.sin(yaw),t.y+d*0.05,t.z+d*Math.cos(yaw));SNAP.cam.lookAt(t);SNAP.cl.position.copy(SNAP.cam.position);
  SNAP.r.render(SNAP.scene,SNAP.cam);
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(SNAP.c,0,0,w,h);
  SNAP.scene.remove(pk.group);if(parent)parent.add(pk.group);
  applyPackState(pk,V3.state,V3.mode);V3.dirty=true;return true;
}

/* ================= Model state ================= */
const S={organ:'pulmon',dis:'neumonia',sev:2,sick:true,animSev:null};
function allDiseases(){return DIS.concat(P.custom||[]);}
function curDisease(){return allDiseases().find(d=>d.id===S.dis)||null;}
function fillDisSel(){
  const sel=$('#disSel'); const list=allDiseases().filter(d=>d.organ===S.organ);
  sel.innerHTML=list.length?list.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}${d.custom?' · definida por ti':''}</option>`).join(''):'<option value="">Sin enfermedades para este órgano</option>';
  if(!list.find(d=>d.id===S.dis)) S.dis=list[0]?list[0].id:null;
  sel.value=S.dis||'';
}
function renderOrganChips(){const box=$('#organChips');if(!box)return;box.innerHTML=availableOrgans().map(k=>`<button type="button" class="chip" data-o="${k}" aria-pressed="${k===S.organ}">${esc(orgName(k))}</button>`).join('');}
$('#organChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(b)selectOrgan(b.dataset.o,true);});
function selectOrgan(k,user){
  S.organ=k; fillDisSel(); S.animSev=null; V3.mode='organ'; $$('#v3Mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m==='organ'))); renderModel(); v3Apply();
  if(user&&!P.organs.includes(k)){P.organs.push(k);save();addXP(5,'nuevo órgano explorado');if(EXPLORE.every(o=>P.organs.includes(o))) badge('explorador');}
}
function sevLabel(n){return ['sin lesión','leve','moderado','grave'][n];}
function renderModel(){
  $('#organName').textContent=orgName(S.organ);
  const d=curDisease();
  $('#btnSano').setAttribute('aria-pressed',!S.sick); $('#btnEnfermo').setAttribute('aria-pressed',S.sick);
  $('#sev').value=S.sev; $('#sevOut').textContent=S.sev+' · '+sevLabel(S.sev);
  const les=d&&S.sick?d.lesion:null;
  V3.state.organ=S.organ; V3.state.lesion=les; V3.state.sev=les?S.sev/3:0; if(!V3.revAnim) V3.state.rev=1; v3Apply(false);
  $$('#organChips .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.o===S.organ)));
  const sx=V3.sex==='f'?'modelo femenino':'modelo masculino';
  $('#organCaption').textContent=orgName(S.organ)+' · '+sx+' · '+(les&&S.sev>0?(LESIONS[les]||'')+', estadio '+S.sev+' de 3.':'órgano sano.')+(S.organ==='rinon'||S.organ==='estomago'?' Usa «Corte coronal» para ver el interior.':'')+(S.organ==='estomago'?' Versión intermedia: el modelo del estómago está en ajuste.':(S.organ==='rinon'?' Versión intermedia: el corte del riñón está en ajuste.':''));
  const micro=S.organ==='piel'; $('#micro').hidden=!micro;
  if(micro){const sevF=S.animSev!=null?S.animSev:S.sev/3; drawOrgan($('#organ'),'piel',les==='hidradenitis'||(les&&GENERIC_LES.includes(les))?les:null,les?sevF:0);
    $('#microCap').textContent='Epidermis, dermis con folículos pilosos y glándulas, e hipodermis. '+(les==='hidradenitis'&&S.sev>0?'Hurley '+['','I: nódulo y absceso sin túneles','II: abscesos recurrentes con túneles y cicatrices','III: túneles interconectados y compromiso difuso'][S.sev]+'.':'')+' Esquema didáctico.';}
  $('#viaText').textContent=d?('Vía o mecanismo de llegada: '+(ROUTES[d.route]?ROUTES[d.route].t:'definida por el estudiante')):'';
  $('#inoc').disabled=!d;
  renderFicha($('#ficha'),d);
  renderAssoc(d);
  if(d&&S.sick&&S.sev===3&&!d.custom&&!P.seen3.includes(d.id)){P.seen3.push(d.id);save();addXP(10,'lesión observada en estadio 3');if(P.seen3.length>=DIS.length) badge('patologo');}
}
let assocOpen=null;
function renderAssoc(d){
  const box=$('#assoc'); if(!d||!d.assoc){box.hidden=true;return;}
  const a=d.assoc; box.hidden=false; $('#assocTitle').textContent=a.title;
  $('#assocLead').textContent='La '+d.name.toLowerCase()+' se asocia con enfermedad del '+ORG[a.organ].name.toLowerCase()+'. Evalúalo como lo harías en la consulta.';
  const open=assocOpen===d.id; $('#assocBody').hidden=!open; $('#assocGo').hidden=open;
  if(open){if(!(V3.ready&&v3Snapshot($('#assocCv'),V3.sex,a.organ,a.lesion,a.stage/3))) drawOrgan($('#assocCv'),a.organ,a.lesion,a.stage/3);
    $('#assocPts').innerHTML=a.pts.map(p=>`<div><dt>${esc(p[0])}</dt><dd>${esc(p[1])} <span class="src">(<a href="${SRC[p[2]].u}" target="_blank" rel="noopener">${esc(SRC[p[2]].k)}</a>)</span></dd></div>`).join('')+`<p class="src">Nomenclatura: <a href="${SRC.rinella.u}" target="_blank" rel="noopener">${esc(SRC.rinella.k)}</a></p>`;}
}
$('#assocGo').onclick=()=>{const d=curDisease(); if(!d||!d.assoc) return; assocOpen=d.id; renderAssoc(d);
  if(!P.assocDone){P.assocDone=true;save();addXP(15,'evaluación sistémica');badge('sistemico');}};
function srcHTML(d){
  if(d.custom){
    const refs=(d.refs||[]).map(r=>`<li>${esc(r)}</li>`).join('');
    return `<p class="src">${d.ai?'Ficha generada por IA. Verifica en estas fuentes sugeridas:':'Ficha definida por el estudiante.'}</p>${refs?`<ul class="src">${refs}</ul>`:''}`;
  }
  return `<p class="src">Fuentes: ${d.src.map(k=>SRC[k].u?`<a href="${SRC[k].u}" target="_blank" rel="noopener">${esc(SRC[k].k)}</a>`:esc(SRC[k].k)).join(' · ')}</p>`;
}
function renderFicha(box,d){
  if(!d){box.innerHTML='<p class="muted">Elige una enfermedad para ver su ficha.</p>';return;}
  const li=a=>`<ul>${(a||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  box.innerHTML=`<div class="e-48a924a"><h3>${esc(d.name)}</h3>${d.custom?`<span class="pill ${d.ai?'warn':'info'}">${d.ai?'Generada por IA · verificar':'Definida por el estudiante'}</span>`:`<span class="pill ${d.infectious?'bad':'info'}">${d.infectious?'Infecciosa':'No infecciosa'}</span>`}</div>
  <dl class="two">
    <div><dt>Agente o causa</dt><dd>${esc(d.agent)}</dd></div>
    <div><dt>Mecanismo</dt><dd>${esc(d.mech)}</dd></div>
    <div><dt>Aspecto macroscópico</dt><dd>${esc(d.macro)}</dd></div>
    <div><dt>Signos y síntomas</dt><dd>${li(d.sx)}</dd></div>
    <div><dt>Diagnóstico</dt><dd>${li(d.dx)}</dd></div>
    <div><dt>Tratamiento (enfoque general)</dt><dd>${esc(d.tx)}</dd></div>
    ${d.prev?`<div><dt>Prevención</dt><dd>${esc(d.prev)}</dd></div>`:''}
    ${d.notes?`<div><dt>Tu hipótesis</dt><dd>${esc(d.notes)}</dd></div>`:''}
  </dl>${srcHTML(d)}`;
}
$('#disSel').onchange=e=>{S.dis=e.target.value;S.sick=true;S.animSev=null;renderModel();};
$('#sev').oninput=e=>{S.sev=+e.target.value;S.animSev=null;renderModel();};
$('#btnSano').onclick=()=>{S.sick=false;S.animSev=null;renderModel();};
$('#btnEnfermo').onclick=()=>{S.sick=true;renderModel();};
$('#inoc').onclick=inoculate;
function inoculate(){
  const d=curDisease(); if(!d) return; S.sick=true; if(S.sev===0) S.sev=2;
  if(S.organ!==d.organ){S.organ=d.organ;fillDisSel();S.dis=d.id;$('#disSel').value=d.id;}
  V3.mode='organ'; $$('#v3Mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m==='organ')));
  V3.state.rev=0; renderModel(); v3Apply();
  if(S.organ==='piel'&&!reduce){const t0=performance.now();const tgt=S.sev/3;(function st(now){const g=Math.min(1,(now-t0)/1600);S.animSev=tgt*g;drawOrganAnim($('#organ'),'piel',d.lesion,S.sev,g);if(g<1)requestAnimationFrame(st);else{S.animSev=null;}})(t0);}
  v3Reveal(()=>renderModel());
  toast(d.infectious?'Agente inoculado: observa cómo avanza la lesión':'Lesión aplicada: observa cómo avanza');
}
/* ================= Define your disease ================= */
(function(){
  $('#mOrgan').innerHTML=ORG_ORDER.map(k=>`<option value="${k}">${ORG[k].name}</option>`).join('');
  $('#mLesion').innerHTML=GENERIC_LES.map(k=>`<option value="${k}">${LESIONS[k]}</option>`).join('');
})();
function slug(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'enfermedad';}
function addCustom(d){
  P.custom=(P.custom||[]).filter(x=>x.id!==d.id); P.custom.push(d); if(P.custom.length>20) P.custom.shift(); save();
  const first=!P.badges.includes('creador'); addXP(20,'enfermedad definida'); if(first) badge('creador');
  renderMyList(); renderFicha($('#aiOut .fichaBox')||makeOutBox(),d);
  S.organ=d.organ; fillDisSel(); S.dis=d.id; $('#disSel').value=d.id; S.sick=true; if(S.sev===0) S.sev=2; renderModel();
}
function makeOutBox(){const b=document.createElement('div');b.className='fichaBox ficha';$('#aiOut').appendChild(b);return b;}
function renderMyList(){
  const box=$('#myList'); const list=P.custom||[];
  box.innerHTML=list.length?list.map(d=>`<button type="button" class="chip" data-id="${esc(d.id)}">${esc(d.name)} · ${esc(ORG[d.organ].name)}</button>`).join(''):'<span class="small muted">Aún no has definido enfermedades.</span>';
}
$('#myList').addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b) return; const d=(P.custom||[]).find(x=>x.id===b.dataset.id); if(!d) return; renderFicha($('#aiOut .fichaBox')||makeOutBox(),d); S.organ=d.organ; fillDisSel(); S.dis=d.id; $('#disSel').value=d.id; S.sick=true; renderModel(); document.getElementById('modelo').scrollIntoView({behavior:reduce?'auto':'smooth'});});
$('#mGo').onclick=()=>{
  const name=($('#mName').value||'Mi enfermedad').trim().slice(0,60); const organ=$('#mOrgan').value; const agent=$('#mAgent').value; const lesion=$('#mLesion').value;
  addCustom({id:'m-'+slug(name)+'-'+organ,custom:true,ai:false,name,organ,lesion,infectious:/Bacteriana|Viral|Fúngica|Parasitaria/.test(agent),route:null,
    agent:'Causa '+agent.toLowerCase()+'.',mech:'Definido por el estudiante: describe en tu hipótesis cómo la causa produce la lesión.',macro:LESIONS[lesion]+' en '+ORG[organ].name.toLowerCase()+'.',
    sx:[],dx:[],tx:'Propón el tratamiento en tu hipótesis y contrástalo con las fuentes.',notes:($('#mNotes').value||'').trim().slice(0,600),refs:['Contrasta tu hipótesis con StatPearls, el Manual MSD o la OMS.']});
  toast('Enfermedad llevada al modelo');
};
let aiCtl=null, sampleFn=null;
(async()=>{try{if(window.claude&&window.claude.use){sampleFn=await window.claude.use('sample');}}catch(e){sampleFn=null;}
  if(!sampleFn){$('#aiGo').disabled=true;$('#aiStatus').textContent='La asistencia de IA no está disponible en esta vista. Usa el constructor manual.';}
})();
const AI_LES=Object.keys(LESIONS);
$('#aiGo').onclick=async()=>{
  const name=($('#aiName').value||'').trim().slice(0,80);
  if(!name){$('#aiStatus').textContent='Escribe el nombre de una enfermedad.';return;}
  if(!sampleFn){$('#aiStatus').textContent='La asistencia de IA no está disponible. Usa el constructor manual.';return;}
  aiCtl=new AbortController(); $('#aiGo').disabled=true; $('#aiStop').hidden=false; $('#aiStatus').textContent='Pensando… preparando la ficha.';
  const prompt=`Eres docente de patología y clínica para estudiantes universitarios de ciencias de la salud en Colombia. Un estudiante escribió el nombre de una enfermedad entre comillas angulares: «${name.replace(/[«»]/g,'')}».
Responde SOLO con un objeto JSON, en español, con esta forma:
{"reconocida": true|false, "nombre": "nombre médico correcto", "organo": uno de ${JSON.stringify(ORG_ORDER)} (el órgano principal afectado; si no está en la lista, el más relacionado), "infecciosa": true|false, "lesion": uno de ${JSON.stringify(AI_LES)} (el patrón macroscópico más representativo), "agente": "causa o agente en una frase", "mecanismo": "fisiopatología en una o dos frases", "aspecto": "aspecto macroscópico del órgano en una o dos frases", "sintomas": ["3 a 5 elementos"], "diagnostico": ["2 a 4 pruebas con el hallazgo esperado"], "tratamiento": "enfoque general basado en guías, sin dosis", "prevencion": "una frase", "fuentes": ["2 o 3 fuentes de referencia donde verificar, por título: nota descriptiva de la OMS, capítulo de StatPearls, Manual MSD o Robbins; sin inventar URL ni autores"]}
Si el texto no corresponde a una enfermedad real, responde {"reconocida": false}. No incluyas texto fuera del JSON.`;
  try{
    const r=await sampleFn.json(prompt,{signal:aiCtl.signal,modelTier:'default'});
    if(!r||r.reconocida!==true){$('#aiStatus').textContent='No reconocí una enfermedad con ese nombre. Revisa la ortografía o usa el constructor manual.';return;}
    const organ=ORG_ORDER.includes(r.organo)?r.organo:'pulmon'; const lesion=AI_LES.includes(r.lesion)?r.lesion:'inflamacion';
    const arr=a=>Array.isArray(a)?a.map(String).slice(0,6):[];
    const nm=String(r.nombre||name).slice(0,80);
    addCustom({id:'ai-'+slug(nm),custom:true,ai:true,name:nm,organ,lesion,infectious:!!r.infecciosa,route:null,agent:String(r.agente||''),mech:String(r.mecanismo||''),macro:String(r.aspecto||''),sx:arr(r.sintomas),dx:arr(r.diagnostico),tx:String(r.tratamiento||''),prev:String(r.prevencion||''),refs:arr(r.fuentes)});
    $('#aiStatus').textContent='Ficha lista y llevada al modelo. Verifícala con las fuentes antes de estudiarla.';
  }catch(e){
    const c=e&&e.code;
    if(c==='cancelled') $('#aiStatus').textContent='Detenido.';
    else if(c==='not_granted'||c==='sampling_disabled'||c==='not_declared'||c==='capability_disabled'){$('#aiStatus').textContent='No se concedió el uso de Claude en esta vista. Usa el constructor manual.';sampleFn=null;}
    else if(c==='rate_limited') $('#aiStatus').textContent='Demasiadas solicitudes por ahora. Inténtalo más tarde.';
    else if(c==='refused') $('#aiStatus').textContent='No se pudo generar esa ficha. Prueba con otra enfermedad.';
    else if(c==='invalid_json') $('#aiStatus').textContent='La respuesta no tuvo el formato esperado. Pulsa «Generar ficha» de nuevo.';
    else $('#aiStatus').textContent='No se pudo completar la solicitud. Inténtalo de nuevo.';
  }finally{$('#aiGo').disabled=!sampleFn;$('#aiStop').hidden=true;}
};
$('#aiStop').onclick=()=>{if(aiCtl) aiCtl.abort();};
$('#aiName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#aiGo').click();}});

/* ================= Consulta ================= */
const C={d:null,min:0,ordered:[],explored:false,phase:'inv',dxOk:false,txOk:false,last:null};
function newCase(){
  const pool=DIS.filter(d=>d.id!==C.last); const d=pool[Math.floor(Math.random()*pool.length)];
  Object.assign(C,{d,min:0,ordered:[],explored:false,phase:'inv',dxOk:false,txOk:false,last:d.id});
  const k=d.kase;
  $('#caseCard').innerHTML=`<div class="e-48a924a"><h3>Paciente en consulta</h3>${d.urgent?'<span class="pill bad">Urgencia tiempo-dependiente</span>':'<span class="pill info">Consulta</span>'}</div>
   <p class="who">${esc(k.who)} · paciente ficticio</p><p><b>Motivo:</b> ${esc(k.cc)}</p><p class="small"><b>Antecedentes:</b> ${esc(k.hx)}</p>`;
  $('#vHR').textContent=k.v.hr; $('#vPA').textContent=k.v.pa; $('#vSP').textContent=k.v.sp; $('#vFR').textContent=k.v.fr; $('#vT').textContent=k.v.t;
  $('#monRhythm').textContent=k.ecg.irr?'Ritmo irregular':(k.ecg.st?'Alerta ST':'Ritmo regular');
  ecgState.hr=k.v.hr; ecgState.st=k.ecg.st||0; ecgState.irr=!!k.ecg.irr; ecgState.rr=null;
  $('#tests').innerHTML=TESTS.map(t=>`<button type="button" class="test" data-t="${t.id}" aria-pressed="false"><span>${esc(t.n)}</span><small>+${t.m} min</small></button>`).join('');
  $('#log').innerHTML='<div class="entry"><b>Inicio</b>Examina al paciente y elige las pruebas que justificarías.</div>';
  $('#exam').disabled=false;
  $('#dxSel').innerHTML='<option value="">Elige un diagnóstico…</option>'+DIS.slice().sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  $('#dxSel').disabled=false; $('#dxGo').disabled=false; $('#dxFb').textContent=''; $('#dxFb').className='';
  $('#txPanel').hidden=true; $('#resPanel').hidden=true; $('#txFb').textContent='';
  updateMeters();
}
function updateMeters(){
  const d=C.d; const lim=d.urgent?d.urgent.limit:240;
  $('#mTime').textContent=C.min+' min'+(d.urgent?' / '+lim:'');
  $('#mTimeBar').style.width=Math.min(100,C.min/lim*100)+'%';
  $('#mTimeBar').style.background=C.min>lim?css('--bad'):(C.min>lim*0.7?css('--warn'):css('--ok'));
  const rate=d.urgent?0.35:0.08; const stab=Math.max(10,Math.round(100-C.min*rate));
  $('#mStab').textContent=stab+' %'; $('#mStabBar').style.width=stab+'%';
  $('#mStabBar').style.background=stab<50?css('--bad'):(stab<75?css('--warn'):css('--ok'));
}
function logEntry(title,text,hit){const e=document.createElement('div');e.className='entry'+(hit?' hit':'');e.innerHTML=`<b>${esc(title)} · min ${C.min}</b>${esc(text)}`;$('#log').prepend(e);return e;}
$('#exam').onclick=()=>{if(C.explored||C.phase==='fin') return;C.explored=true;C.min+=5;$('#exam').disabled=true;logEntry('Exploración física',C.d.kase.exam,true);updateMeters();};
$('#tests').addEventListener('click',e=>{
  const b=e.target.closest('.test'); if(!b||C.phase==='fin') return; const id=b.dataset.t; if(C.ordered.includes(id)) return;
  C.ordered.push(id); const t=TESTMAP[id]; C.min+=t.m; b.setAttribute('aria-pressed','true'); b.disabled=true;
  const res=C.d.kase.res[id]; const le=logEntry(t.n,res||'Sin alteraciones relevantes.',!!res); const pm=PLATE_FOR[id]; if(pm){const pid=pm[C.d.id]||pm._; const vb=document.createElement('button'); vb.type='button'; vb.className='btn'; vb.style.marginTop='6px'; vb.textContent='Ver la placa en la sala de lectura'; vb.onclick=()=>openPlate(pid); le.appendChild(document.createElement('br')); le.appendChild(vb);} updateMeters();
});
$('#dxGo').onclick=()=>{
  const v=$('#dxSel').value; if(!v){$('#dxFb').textContent='Elige un diagnóstico.';return;}
  C.dxOk=v===C.d.id; $('#dxSel').disabled=true; $('#dxGo').disabled=true; $('#exam').disabled=true; $$('#tests .test').forEach(b=>b.disabled=true);
  $('#dxFb').className='note '+(C.dxOk?'ok':'bad');
  $('#dxFb').textContent=C.dxOk?'Diagnóstico correcto.':`No es correcto. El diagnóstico era ${C.d.name}. Revisa los hallazgos clave: ${C.d.kase.pert.map(p=>TESTMAP[p].n).join(', ')}.`+(C.d.kase.note?' '+C.d.kase.note:'');
  C.phase='tx';
  const opts=C.d.tx_opts.map((o,i)=>({o,i})).sort(()=>Math.random()-.5);
  $('#txOpts').innerHTML=opts.map(({o,i})=>`<label class="opt" data-i="${i}"><input type="radio" name="tx" id="tx${i}" value="${i}"><span>${esc(o[0])}</span></label>`).join('');
  $('#txPanel').hidden=false; $('#txGo').disabled=false;
};
$('#txGo').onclick=()=>{
  const r=document.querySelector('input[name="tx"]:checked'); if(!r){$('#txFb').textContent='Elige un tratamiento.';return;}
  const i=+r.value; const o=C.d.tx_opts[i]; C.txOk=!!o[1]; $('#txGo').disabled=true;
  $$('#txOpts .opt').forEach(l=>{const j=+l.dataset.i;l.querySelector('input').disabled=true;if(C.d.tx_opts[j][1]) l.classList.add('right');else if(j===i) l.classList.add('wrong');});
  $('#txFb').className='note '+(C.txOk?'ok':'bad'); $('#txFb').textContent=o[2];
  finishCase();
};
function finishCase(){
  C.phase='fin'; const d=C.d; const lines=[]; let total=0;
  const irrelevant=C.ordered.filter(t=>!d.kase.pert.includes(t)); const relevant=C.ordered.filter(t=>d.kase.pert.includes(t));
  if(C.dxOk){lines.push(['Diagnóstico correcto',100]);total+=100;} else lines.push(['Diagnóstico incorrecto',0]);
  if(C.txOk){lines.push(['Tratamiento adecuado',60]);total+=60;} else lines.push(['Tratamiento inadecuado',0]);
  if(irrelevant.length){lines.push([`Pruebas no justificadas (${irrelevant.length})`,-10*irrelevant.length]);total-=10*irrelevant.length;}
  if(C.dxOk&&C.ordered.length<=2){lines.push(['Ojo clínico: 2 pruebas o menos',20]);total+=20;badge('ojo');}
  if(d.urgent){if(C.min<=d.urgent.limit&&C.dxOk&&C.txOk){lines.push([`A tiempo: ${C.min} min (${d.urgent.label})`,40]);total+=40;badge(d.id==='iam'?'musculo':'cerebro');}else lines.push([`Tiempo: ${C.min} min (${d.urgent.label})`,0]);}
  total=Math.max(0,total);
  P.cases++; if(C.dxOk) P.dxOk++; if(C.txOk) P.txOk++;
  if(d.infectious&&C.txOk){P.inf++; if(P.inf>=3) badge('antibiotico');}
  const perfect=C.dxOk&&C.txOk&&!irrelevant.length; P.streak=perfect?P.streak+1:0; if(P.streak>=3) badge('racha');
  save();
  $('#scoreLines').innerHTML=lines.map(l=>`<div><span>${esc(l[0])}</span><b>${l[1]>0?'+':''}${l[1]} VX</b></div>`).join('')+`<div><span><b>Total del caso</b></span><b>${total} VX</b></div>`+(relevant.length?'':`<div><span class="muted">Pruebas clave para este caso: ${esc(d.kase.pert.map(p=>TESTMAP[p].n).join(', '))}</span><b></b></div>`);
  $('#resPanel').hidden=false;
  addXP(total,'caso clínico');
}
$('#newCase').onclick=()=>{newCase();document.getElementById('consulta').scrollIntoView({behavior:reduce?'auto':'smooth'});};
$('#seeModel').onclick=()=>{const d=C.d;const fx=/^Mujer/.test(d.kase.who)?'f':'m';if(fx!==V3.sex)v3SetSex(fx);S.organ=d.organ;fillDisSel();S.dis=d.id;$('#disSel').value=d.id;S.sick=true;S.sev=3;renderModel();document.getElementById('modelo').scrollIntoView({behavior:reduce?'auto':'smooth'});};

/* ECG monitor */
const ecgState={hr:75,st:0,irr:false,rr:null};
const ecgCv=$('#ecg'); let ecgVisible=true, ecgRAF=null;
function gauss(x,m,s){return Math.exp(-((x-m)**2)/(2*s*s));}
function beatShape(p,st){return 0.12*gauss(p,0.12,0.025)-0.12*gauss(p,0.225,0.008)+1.0*gauss(p,0.25,0.011)-0.28*gauss(p,0.28,0.01)+(st?st*(p>0.285&&p<0.46?1:0)*Math.min(1,(p-0.285)/0.03)*(p>0.43?Math.max(0,(0.46-p)/0.03):1):0)+0.3*gauss(p,0.42,0.045)+st*0.5*gauss(p,0.38,0.05);}
function drawECG(now){
  const dpr=window.devicePixelRatio||1; const W=520,H=200; const cw=ecgCv.clientWidth||W;
  if(ecgCv.width!==Math.round(cw*dpr)){ecgCv.width=Math.round(cw*dpr);ecgCv.height=Math.round(cw*H/W*dpr);}
  const ctx=ecgCv.getContext('2d'); ctx.setTransform(ecgCv.width/W,0,0,ecgCv.height/H,0,0);
  ctx.fillStyle=css('--mon-bg'); ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=css('--mon-grid'); ctx.lineWidth=1;
  for(let x=0;x<=W;x+=26){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,H);ctx.stroke();}
  for(let y=0;y<=H;y+=25){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(W,y+.5);ctx.stroke();}
  const secs=4; const t0=(reduce?0:now/1000);
  const beat=60/(ecgState.hr||75);
  if(ecgState.irr&&!ecgState.rr){const R=rng(7);ecgState.rr=Array.from({length:64},()=>beat*(0.6+R()*0.8));}
  const col=css('--ecg'); ctx.strokeStyle=col; ctx.lineWidth=2; ctx.shadowColor=col; ctx.shadowBlur=4; ctx.beginPath();
  const base=H*0.62, amp=H*0.42;
  for(let px=0;px<=W;px++){
    const t=t0-secs+px/W*secs; let p;
    if(ecgState.irr){const total=ecgState.rr.reduce((a,b)=>a+b,0);let tt=((t%total)+total)%total;let i=0;while(tt>ecgState.rr[i]){tt-=ecgState.rr[i];i++;}p=tt/ecgState.rr[i];}
    else p=((t%beat)+beat)%beat/beat;
    let v=beatShape(p,ecgState.st); if(ecgState.irr) v+=0.03*Math.sin(t*40)+0.02*Math.sin(t*67);
    const y=base-v*amp; if(px===0) ctx.moveTo(px,y); else ctx.lineTo(px,y);
  }
  ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle=col; ctx.font='600 12px "Noto Sans Mono", monospace'; ctx.fillText('II  25 mm/s',8,16);
  if(ecgState.st>0){ctx.fillStyle=css('--pa');ctx.fillText('ST ↑',W-48,16);}
  if(!reduce&&ecgVisible) ecgRAF=requestAnimationFrame(drawECG);
}
try{new IntersectionObserver(es=>{for(const e of es){ecgVisible=e.isIntersecting;if(ecgVisible&&!reduce){cancelAnimationFrame(ecgRAF);ecgRAF=requestAnimationFrame(drawECG);}}}).observe(ecgCv);}catch(e){}

/* ================= Sala de lectura radiológica ================= */
const RXN=512;
const RLp='M236 96 C200 96 150 120 124 170 C100 220 92 300 96 380 C120 372 168 360 214 372 C226 330 230 300 232 270 C234 220 240 150 236 96 Z';
const LLp='M276 96 C312 96 362 120 388 170 C412 220 420 300 418 392 C396 386 352 380 316 386 C306 360 296 340 300 300 C302 240 276 160 276 96 Z';
const PLATES=[
 {id:'rx-normal',kind:'rx',name:'Tórax PA · control',who:'Mujer de 30 años',ind:'Examen de ingreso laboral, sin síntomas.',dx:'normal',gen:{heart:130,seed:11},finds:[],
  exp:'Sin hallazgos patológicos: ángulos costofrénicos libres, silueta cardíaca de tamaño normal (ICT ≤ 0,5) y trama vascular que se afina hacia la periferia.',src:['burb_pna','rp_ctr']},
 {id:'rx-neumonia',kind:'rx',name:'Tórax PA · fiebre y tos',who:'Hombre de 67 años',ind:'Fiebre, tos productiva y dolor pleurítico derecho.',dx:'neumonia',gen:{heart:132,pna:true,seed:12},
  finds:[{x:160,y:330,rx:68,ry:52,t:'Consolidación en el lóbulo inferior derecho'},{x:170,y:322,rx:24,ry:22,t:'Broncograma aéreo'}],
  exp:'Opacidad lobar con broncograma aéreo: bronquios con aire dentro de alvéolos ocupados por exudado. La consolidación no cruza la cisura.',src:['burb_pna']},
 {id:'rx-tb',kind:'rx',name:'Tórax PA · tos crónica',who:'Mujer de 34 años',ind:'Tos de cuatro semanas, sudores nocturnos y pérdida de peso.',dx:'tb',gen:{heart:128,tb:true,seed:13},
  finds:[{x:176,y:150,rx:30,ry:28,t:'Cavitación en el lóbulo superior derecho'},{x:204,y:198,rx:30,ry:22,t:'Opacidades nodulares satélite'}],
  exp:'Lesión cavitada en el lóbulo superior derecho, como en la imagen de referencia del Manual MSD. La tuberculosis se confirma con pruebas microbiológicas o moleculares rápidas (OMS).',src:['msd_tbrx','oms_tb']},
 {id:'rx-derrame',kind:'rx',name:'Tórax PA · disnea',who:'Hombre de 58 años',ind:'Disnea progresiva y dolor torácico izquierdo.',dx:'derrame',gen:{heart:132,eff:true,seed:14},
  finds:[{x:396,y:296,rx:30,ry:28,t:'Menisco cóncavo en el borde superior del líquido'},{x:362,y:372,rx:62,ry:30,t:'Borramiento del ángulo costofrénico izquierdo'}],
  exp:'Opacidad homogénea en la base izquierda con menisco cóncavo y pérdida del ángulo costofrénico: el líquido ocupa la zona declive del hemitórax.',src:['burb_eff']},
 {id:'rx-neumotorax',kind:'rx',name:'Tórax PA · dolor súbito',who:'Hombre de 22 años, alto y delgado',ind:'Dolor torácico derecho súbito y disnea.',dx:'neumotorax',gen:{heart:130,ptx:true,seed:15},
  finds:[{x:142,y:232,rx:20,ry:96,t:'Línea pleural visceral'},{x:112,y:240,rx:18,ry:100,t:'Ausencia de trama pulmonar por fuera de la línea'}],
  exp:'Línea pleural visceral blanca, convexa hacia afuera, sin trama pulmonar más allá y con hiperlucidez del hemitórax derecho.',src:['burb_ptx']},
 {id:'rx-cardio',kind:'rx',name:'Tórax PA · edemas',who:'Mujer de 71 años',ind:'Disnea de esfuerzo y edema en las piernas.',dx:'cardiomegalia',gen:{heart:190,seed:16},
  finds:[{x:290,y:326,rx:105,ry:72,t:'Silueta cardíaca aumentada (ICT > 0,5)'}],
  exp:'El índice cardiotorácico (diámetro cardíaco máximo / diámetro torácico interno máximo) supera 0,5 en una proyección PA. Mídelo con la herramienta «Medir ICT».',src:['rp_ctr']},
 {id:'tc-normal',kind:'ct',name:'TC de cráneo · cefalea',who:'Mujer de 45 años',ind:'Cefalea crónica sin signos de alarma.',dx:'normal',gen:{seed:21},finds:[],
  exp:'TC sin contraste sin hallazgos agudos: buena diferenciación entre sustancia gris y blanca, ventrículos simétricos y sin hiperdensidades.',src:['msd_acv']},
 {id:'tc-isquemia',kind:'ct',name:'TC de cráneo · déficit súbito',who:'Hombre de 72 años',ind:'Hemiparesia derecha y afasia desde hace 90 minutos.',dx:'acv',gen:{isch:true,seed:22},
  finds:[{x:346,y:254,rx:18,ry:12,t:'Signo de la ACM hiperdensa'},{x:340,y:266,rx:12,ry:30,t:'Pérdida del ribete insular'},{x:392,y:250,rx:46,ry:84,t:'Pérdida de diferenciación gris-blanca en el territorio de la ACM izquierda'}],
  exp:'Signos tempranos de isquemia en el territorio de la arteria cerebral media izquierda y ausencia de hemorragia, que es lo primero que debe descartar la TC sin contraste.',src:['calgary','msd_acv']},
 {id:'tc-hemorragia',kind:'ct',name:'TC de cráneo · cefalea súbita',who:'Mujer de 64 años, hipertensa',ind:'Cefalea intensa, vómito y hemiparesia derecha.',dx:'hic',gen:{hem:true,seed:23},
  finds:[{x:312,y:264,rx:26,ry:34,t:'Hiperdensidad en el putamen izquierdo (hematoma)'},{x:276,y:226,rx:14,ry:30,t:'Compresión del ventrículo lateral izquierdo'}],
  exp:'Aumento de densidad en los ganglios basales izquierdos, compatible con hemorragia intracerebral; el putamen es la localización más frecuente de la hemorragia hipertensiva. La hemorragia contraindica la trombólisis.',src:['msd_hic','msd_acv']}
];
const RXDX={rx:[['normal','Sin hallazgos patológicos'],['neumonia','Neumonía (consolidación)'],['tb','Tuberculosis (cavitación)'],['derrame','Derrame pleural'],['neumotorax','Neumotórax'],['cardiomegalia','Cardiomegalia']],ct:[['normal','Sin hallazgos agudos'],['acv','ACV isquémico agudo'],['hic','Hemorragia intracerebral']]};
const RXCHECK={rx:['Proyección y calidad (PA, inspiración)','Vía aérea: tráquea centrada','Huesos y partes blandas','Corazón y mediastino (índice cardiotorácico)','Diafragmas y ángulos costofrénicos','Campos pulmonares y trama vascular','Pleura y periferia'],ct:['Ventana adecuada (cerebral)','Hiperdensidades: ¿hay sangre?','Signos tempranos de isquemia','Línea media y ventrículos','Hueso y partes blandas']};
const RXW={rx:{L:48,W:86},ct:{L:40,W:80}};
const PCACHE=new Map();
function heartPath(W){const cx=287,a=v=>(cx+v*W).toFixed(1);return new Path2D(`M${a(-0.2)} 250 C${a(-0.45)} 265 ${a(-0.5)} 305 ${a(-0.45)} 345 C${a(-0.38)} 385 ${a(0)} 400 ${a(0.2)} 398 C${a(0.5)} 392 ${a(0.55)} 360 ${a(0.52)} 325 C${a(0.5)} 290 ${a(0.3)} 258 ${a(0.05)} 250 Z`);}
function genRx(g){
  const c=document.createElement('canvas');c.width=c.height=RXN;const x=c.getContext('2d',{willReadFrequently:true});const R=rng(g.seed||7);
  const v=n=>`rgb(${n},${n},${n})`;x.fillStyle='#000';x.fillRect(0,0,RXN,RXN);
  x.fillStyle=v(92);x.fill(new Path2D('M54 512 L60 176 C66 124 118 94 200 72 L218 58 L294 58 L312 72 C394 94 446 124 452 176 L458 512 Z'));x.fill(new Path2D('M218 0 L294 0 L296 70 L216 70 Z'));
  x.fillStyle=v(82);x.fill(new Path2D('M10 512 L20 196 C24 156 40 136 62 132 L58 512 Z'));x.fill(new Path2D('M502 512 L492 196 C488 156 472 136 450 132 L454 512 Z'));
  x.fillStyle=v(112);x.beginPath();x.ellipse(170,452,120,80,0,0,Math.PI*2);x.fill();
  const RL=new Path2D(RLp),LL=new Path2D(LLp);x.fillStyle=v(26);x.fill(RL);x.fill(LL);
  if(!g.eff){x.fillStyle=v(36);x.beginPath();x.ellipse(356,428,30,15,0,0,Math.PI*2);x.fill();}
  x.globalCompositeOperation='lighter';x.lineCap='round';
  const branch=(px,py,ang,len,w,depth)=>{if(depth<=0||len<6)return;const nx=px+Math.cos(ang)*len,ny=py+Math.sin(ang)*len;x.strokeStyle=`rgba(255,255,255,${0.06+0.05*depth/5})`;x.lineWidth=w;x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();const k=1+Math.floor(R()*2);for(let i=0;i<=k;i++)branch(nx,ny,ang+(R()-0.5)*0.9,len*0.72,w*0.68,depth-1);};
  x.save();x.clip(RL);for(let k=0;k<11;k++)branch(226,236,Math.PI+(R()-0.5)*1.9,46,5,5);x.restore();
  x.save();x.clip(LL);for(let k=0;k<11;k++)branch(292,230,(R()-0.5)*1.9,46,5,5);x.restore();
  x.globalCompositeOperation='source-over';
  if(g.pna){x.save();x.clip(RL);x.clip(new Path2D('M80 262 L232 296 L240 410 L80 410 Z'));x.globalCompositeOperation='lighter';
    for(let k=0;k<30;k++){const cx=150+R()*80-40,cy=338+R()*56-28,r=22+R()*26;const gr=x.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,'rgba(255,255,255,0.13)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(cx-r,cy-r,2*r,2*r);}
    x.globalCompositeOperation='source-over';x.strokeStyle=v(64);x.lineWidth=3.5;x.lineCap='round';
    const tube=(px,py,ang,len,d)=>{if(d<=0)return;const nx=px+Math.cos(ang)*len,ny=py+Math.sin(ang)*len;x.lineWidth=1.2+d;x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();tube(nx,ny,ang-0.35,len*0.75,d-1);tube(nx,ny,ang+0.3,len*0.7,d-1);};
    tube(200,300,2.3,26,3);x.restore();}
  if(g.tb){x.save();x.clip(RL);x.globalCompositeOperation='lighter';for(let k=0;k<26;k++){const a=R()*Math.PI*2,d=R()*52;const cx=186+Math.cos(a)*d,cy=170+Math.sin(a)*d*0.8,r=3+R()*6;x.fillStyle='rgba(255,255,255,0.22)';x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}
    x.strokeStyle='rgba(255,255,255,0.16)';x.lineWidth=2;for(let k=0;k<5;k++){x.beginPath();x.moveTo(176+R()*10,160);x.quadraticCurveTo(205,200+R()*20,226,232);x.stroke();}
    x.strokeStyle='rgba(255,255,255,0.46)';x.lineWidth=7;x.beginPath();x.arc(176,150,19,0,Math.PI*2);x.stroke();x.globalCompositeOperation='source-over';x.fillStyle=v(22);x.beginPath();x.arc(176,150,15,0,Math.PI*2);x.fill();x.restore();}
  x.fillStyle=v(140);x.fill(new Path2D('M234 92 C228 140 224 200 218 262 L304 262 C298 210 294 150 282 92 Z'));x.beginPath();x.ellipse(300,186,20,17,0,0,Math.PI*2);x.fill();
  const HP=heartPath(g.heart||130);x.fill(HP);
  x.fillStyle=v(54);x.fill(new Path2D('M248 40 L266 40 L266 176 L257 190 L248 176 Z'));x.strokeStyle=v(54);x.lineWidth=9;x.lineCap='round';x.beginPath();x.moveTo(253,186);x.lineTo(226,222);x.moveTo(261,186);x.lineTo(290,218);x.stroke();
  if(g.eff){x.save();x.clip(new Path2D('M298 96 L452 96 L458 512 L298 512 Z'));x.fillStyle=v(156);x.fill(new Path2D('M298 512 L298 352 C330 350 386 336 428 268 L462 268 L462 512 Z'));x.restore();}
  if(g.ptx){x.save();x.clip(RL);x.fillStyle=v(12);x.fill(new Path2D('M240 86 L212 104 C168 116 142 170 140 236 C138 300 142 340 152 374 L60 420 L60 86 Z'));x.restore();
    x.strokeStyle=v(120);x.lineWidth=2.2;x.beginPath();x.moveTo(212,104);x.bezierCurveTo(168,116,142,170,140,236);x.bezierCurveTo(138,300,142,340,152,374);x.stroke();}
  x.globalCompositeOperation='lighter';
  x.save();x.clip(new Path2D('M226 40 L286 40 L306 512 L206 512 Z'));for(let y=62;y<480;y+=26){x.fillStyle='rgba(255,255,255,0.055)';x.fillRect(238,y,36,20);x.fillStyle='rgba(255,255,255,0.04)';x.beginPath();x.ellipse(244,y+10,4,6,0,0,Math.PI*2);x.ellipse(268,y+10,4,6,0,0,Math.PI*2);x.fill();}x.restore();
  x.lineCap='round';x.strokeStyle='rgba(255,255,255,0.30)';x.lineWidth=13;
  x.beginPath();x.moveTo(246,112);x.bezierCurveTo(220,104,190,100,150,104);x.bezierCurveTo(120,106,100,98,86,92);x.stroke();
  x.beginPath();x.moveTo(266,112);x.bezierCurveTo(292,104,322,100,362,104);x.bezierCurveTo(392,106,412,98,426,92);x.stroke();
  for(let i=0;i<10;i++){const y0=104+i*29;for(const sgn of [-1,1]){const X=t=>256+sgn*(256-t);x.strokeStyle='rgba(255,255,255,0.12)';x.lineWidth=8;x.beginPath();x.moveTo(X(240),y0);x.bezierCurveTo(X(200),y0-12,X(150),y0-4,X(118),y0+22);x.bezierCurveTo(X(104),y0+34,X(98),y0+52,X(100),y0+64);x.stroke();
      x.strokeStyle='rgba(255,255,255,0.07)';x.lineWidth=3;x.stroke();}}
  for(let i=0;i<7;i++){const y0=150+i*34;for(const sgn of [-1,1]){const X=t=>256+sgn*(256-t);x.strokeStyle='rgba(255,255,255,0.07)';x.lineWidth=8;x.beginPath();x.moveTo(X(104),y0);x.bezierCurveTo(X(140),y0+18,X(180),y0+30,X(214),y0+44);x.stroke();}}
  x.strokeStyle='rgba(255,255,255,0.07)';x.lineWidth=4;x.beginPath();x.moveTo(86,140);x.bezierCurveTo(96,200,104,250,98,300);x.moveTo(426,140);x.bezierCurveTo(416,200,408,250,414,300);x.stroke();
  x.globalCompositeOperation='source-over';
  const d=x.getImageData(0,0,RXN,RXN).data;let F=new Float32Array(RXN*RXN);for(let i=0;i<F.length;i++)F[i]=d[i*4]/255;F=boxBlur(F,RXN,RXN,2);
  for(let y=0;y<RXN;y++)for(let xx=0;xx<RXN;xx++){const i=y*RXN+xx;F[i]=Math.max(0,Math.min(1,F[i]*(0.95+0.05*(1-Math.abs(xx-256)/256))+0.022*(R()-0.5)+0.018*NZ.n2(xx*0.45+g.seed,y*0.45)));}
  let hl=1e9,hr=-1e9,tl=1e9,tr=-1e9;
  for(let y=96;y<=400;y+=2)for(let xx=60;xx<460;xx+=1){if(x.isPointInPath(HP,xx,y)){if(xx<hl)hl=xx;if(xx>hr)hr=xx;}if(x.isPointInPath(RL,xx,y)&&xx<tl)tl=xx;if(x.isPointInPath(LL,xx,y)&&xx>tr)tr=xx;}
  return {F,ctr:(hr-hl)/(tr-tl),heart:[hl,hr],thor:[tl,tr]};
}
function genCt(g){
  const N=RXN,F=new Float32Array(N*N),R=rng(g.seed||3),cx=256,cy=262;
  const inE=(x,y,ex,ey,rx,ry,rot)=>{const c=Math.cos(-(rot||0)),s=Math.sin(-(rot||0));const dx=x-ex,dy=y-ey;const X=dx*c-dy*s,Y=dx*s+dy*c;return (X*X)/(rx*rx)+(Y*Y)/(ry*ry);};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;const ro=Math.hypot((x-cx)/192,(y-cy)/232),ri=Math.hypot((x-cx)/176,(y-cy)/216);let hu=-1000;
    if(ro<1.05&&ro>=1)hu=50;
    if(ro<1){if(ri>=1){hu=850+300*NZ.fbm(x*0.08,y*0.08,2);}else{
      const depth=(1-ri)*176;const ang=Math.atan2(y-cy,x-cx);const n=NZ.fbm(x*0.035,y*0.035,3);const gyr=Math.sin(ang*26+n*6);
      hu=depth<9+4*gyr?38:28;if(depth<15&&Math.abs(gyr)<0.12)hu=8;if(depth<2.2)hu=10;
      if(inE(x,y,204,262,16,30,-0.2)<1||inE(x,y,308,262,16,30,0.2)<1)hu=36;
      if(inE(x,y,238,292,14,18)<1||inE(x,y,274,292,14,18)<1)hu=35;
      if(inE(x,y,232,226,8,12)<1||inE(x,y,280,226,8,12)<1)hu=36;
      if(inE(x,y,172,262,6,30)<1||inE(x,y,340,262,6,30)<1)hu=38;
      if(inE(x,y,161,258,4,30,0.1)<1||inE(x,y,351,258,4,30,-0.1)<1)hu=8;
      const rvx=g.hem?268:272,rvr=g.hem?5:9;
      if(inE(x,y,240,228,9,28,0.35)<1||inE(x,y,rvx,228,rvr,28,-0.35)<1)hu=6;
      if(inE(x,y,247,300,6,18)<1||inE(x,y,265,300,g.hem?4:6,18)<1)hu=6;
      if(inE(x,y,256,280,3,14)<1)hu=6;
      if(Math.abs(x-256)<3&&(y<214||y>318))hu=10;if(Math.abs(x-256)<1.2&&(y<214||y>318))hu=55;
      if(g.isch&&x>262){const a=Math.atan2(y-cy,x-cx);if(a>-0.95&&a<1.0&&Math.hypot(x-cx,y-cy)>62){const t=sm(-0.95,-0.75,a)*sm(1.0,0.8,a);if(hu===38||hu===36)hu=38-12*t;else if(hu===28)hu=28-4*t;else if(hu===8&&depth<15)hu=8+16*t;}}
      if(g.isch&&segDist(x,y,[[334,256],[356,251]])<2)hu=70;
      if(g.hem){const dh=inE(x,y,312,264,20,28,0.15)+0.25*NZ.fbm(x*0.08,y*0.08,2);if(dh<1)hu=66;else if(dh<1.35)hu=20;}
    }}
    F[i]=hu+(hu>-500&&hu<200?2.6*NZ.n2(x*0.8+g.seed,y*0.8)+2.4*(R()-0.5):0);}
  return {F:boxBlur(F,N,N,1)};
}
function plateData(p){if(PCACHE.has(p.id))return PCACHE.get(p.id);const d=p.kind==='rx'?genRx(p.gen):genCt(p.gen);PCACHE.set(p.id,d);return d;}
const RXV={p:null,L:48,W:86,inv:false,mode:'mark',found:[],miss:[],checks:new Set(),lines:[],drag:null,lupa:null,done:false};
const RXBASE=document.createElement('canvas');RXBASE.width=RXBASE.height=RXN;const RXBX=RXBASE.getContext('2d');
const rxCv=$('#rx'),rxCtx=rxCv.getContext('2d');
function rxWindow(){const p=RXV.p,d=plateData(p);const img=RXBX.createImageData(RXN,RXN);const D=img.data;
  let lo,w;if(p.kind==='rx'){w=RXV.W/100;lo=RXV.L/100-w/2;}else{w=RXV.W;lo=RXV.L-w/2;}
  for(let i=0;i<d.F.length;i++){let v=(d.F[i]-lo)/w;v=v<0?0:v>1?1:v;if(RXV.inv)v=1-v;const c=v*255;D[i*4]=c;D[i*4+1]=c;D[i*4+2]=c;D[i*4+3]=255;}
  RXBX.putImageData(img,0,0);$('#rxWL').textContent=p.kind==='rx'?`N ${RXV.L} · V ${RXV.W}`:`L ${RXV.L} UH · W ${RXV.W} UH`;rxDraw();}
function rxDraw(){const c=rxCtx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,RXN,RXN);c.drawImage(RXBASE,0,0);const p=RXV.p;
  c.font='600 13px "Noto Sans Mono", monospace';c.fillStyle='rgba(255,255,255,.8)';c.fillText('D',12,24);c.fillText(p.kind==='rx'?'PA':'Axial · sin contraste',p.kind==='rx'?474:300,24);
  const show=RXV.done?p.finds.map((f,i)=>({f,i,ok:RXV.found.includes(i)})):RXV.found.map(i=>({f:p.finds[i],i,ok:true}));
  for(const s of show){c.save();c.strokeStyle=s.ok?'#4ADE80':'#F2A900';c.lineWidth=2.5;if(!s.ok)c.setLineDash([6,5]);c.beginPath();c.ellipse(s.f.x,s.f.y,s.f.rx,s.f.ry,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle=s.ok?'#4ADE80':'#F2A900';c.beginPath();c.arc(s.f.x+s.f.rx*0.7,s.f.y-s.f.ry*0.7,10,0,Math.PI*2);c.fill();c.fillStyle='#0B0F14';c.textAlign='center';c.fillText(String(s.i+1),s.f.x+s.f.rx*0.7,s.f.y-s.f.ry*0.7+4);c.restore();}
  for(const m of RXV.miss){c.strokeStyle='rgba(255,90,90,.85)';c.lineWidth=2;c.beginPath();c.moveTo(m[0]-6,m[1]-6);c.lineTo(m[0]+6,m[1]+6);c.moveTo(m[0]+6,m[1]-6);c.lineTo(m[0]-6,m[1]+6);c.stroke();}
  const lines=RXV.lines.concat(RXV.drag?[RXV.drag]:[]);lines.forEach((l,i)=>{c.strokeStyle=i===0?'#F2A900':'#5CC8F0';c.fillStyle=c.strokeStyle;c.lineWidth=2;c.beginPath();c.moveTo(l.x0,l.y);c.lineTo(l.x1,l.y);c.stroke();for(const xx of [l.x0,l.x1]){c.beginPath();c.moveTo(xx,l.y-7);c.lineTo(xx,l.y+7);c.stroke();}c.font='600 12px "Noto Sans Mono", monospace';c.textAlign='left';c.fillText((i===0?'1 · corazón ':'2 · tórax ')+Math.abs(l.x1-l.x0).toFixed(0)+' px',Math.min(l.x0,l.x1),l.y-10);});
  if(RXV.lupa){const [lx,ly]=RXV.lupa,r=70,z=2.2;c.save();c.beginPath();c.arc(lx,ly,r,0,Math.PI*2);c.clip();c.fillStyle='#000';c.fillRect(lx-r,ly-r,2*r,2*r);c.drawImage(RXBASE,lx-r/z,ly-r/z,2*r/z,2*r/z,lx-r,ly-r,2*r,2*r);c.restore();c.strokeStyle='#F2A900';c.lineWidth=2;c.beginPath();c.arc(lx,ly,r,0,Math.PI*2);c.stroke();}
}
function rxPos(e){const r=rxCv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*RXN,(e.clientY-r.top)/r.height*RXN];}
function rxIct(){const out=$('#rxIctOut');if(RXV.p.kind!=='rx'){out.textContent='';return;}if(RXV.lines.length<2){out.textContent=RXV.mode==='ict'?(RXV.lines.length===0?'Traza 1: el diámetro cardíaco máximo, de borde a borde.':'Traza 2: el diámetro torácico interno máximo.'):'';return;}
  const h=Math.abs(RXV.lines[0].x1-RXV.lines[0].x0),t=Math.abs(RXV.lines[1].x1-RXV.lines[1].x0);const ict=h/t;RXV.ict=ict;out.textContent=`ICT medido: ${ict.toFixed(2).replace('.',',')} (${h.toFixed(0)} / ${t.toFixed(0)} px) · ${ict>0.5?'mayor de 0,5':'0,5 o menos'}`;}
rxCv.addEventListener('pointerdown',e=>{if(!RXV.p)return;const [x,y]=rxPos(e);
  if(RXV.mode==='ict'&&RXV.p.kind==='rx'){if(RXV.lines.length>=2)RXV.lines=[];RXV.drag={x0:x,x1:x,y};rxCv.setPointerCapture(e.pointerId);rxDraw();return;}
  if(RXV.mode==='mark'&&!RXV.done){const hits=RXV.p.finds.map((f,i)=>({f,i,d:((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2})).filter(h=>h.d<=1&&!RXV.found.includes(h.i)).sort((a,b)=>a.f.rx*a.f.ry-b.f.rx*b.f.ry);
    if(hits.length){RXV.found.push(hits[0].i);$('#rxFb').className='note ok small';$('#rxFb').textContent='Hallazgo identificado: '+hits[0].f.t+'.';}
    else if(RXV.p.finds.some((f,i)=>RXV.found.includes(i)&&((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2<=1)){$('#rxFb').className='note small';$('#rxFb').textContent='Ese hallazgo ya está marcado.';}
    else{RXV.miss.push([x,y]);$('#rxFb').className='note warn small';$('#rxFb').textContent='No hay un hallazgo patológico en ese punto.';}
    rxFoundUI();rxDraw();}});
rxCv.addEventListener('pointermove',e=>{if(!RXV.p)return;const [x,y]=rxPos(e);if(RXV.drag){RXV.drag.x1=x;rxDraw();return;}if(RXV.mode==='lupa'){RXV.lupa=[x,y];rxDraw();}});
rxCv.addEventListener('pointerup',e=>{if(RXV.drag){if(Math.abs(RXV.drag.x1-RXV.drag.x0)>8)RXV.lines.push(RXV.drag);RXV.drag=null;rxIct();rxDraw();}});
rxCv.addEventListener('pointerleave',()=>{if(RXV.lupa){RXV.lupa=null;rxDraw();}});
$$('#rxModes button').forEach(b=>b.addEventListener('click',()=>{RXV.mode=b.dataset.m;RXV.lupa=null;$$('#rxModes button').forEach(x=>x.setAttribute('aria-pressed',x===b));rxCv.style.cursor=RXV.mode==='lupa'?'zoom-in':'crosshair';rxCv.style.touchAction=RXV.mode==='mark'?'manipulation':'none';rxIct();rxDraw();}));
$('#rxLevel').addEventListener('input',e=>{RXV.L=+e.target.value;rxWindow();});
$('#rxWidth').addEventListener('input',e=>{RXV.W=+e.target.value;rxWindow();});
$('#rxInvert').onclick=()=>{RXV.inv=!RXV.inv;$('#rxInvert').setAttribute('aria-pressed',RXV.inv);rxWindow();};
$('#rxPresetA').onclick=()=>{const k=RXV.p.kind;if(k==='rx'){RXV.L=40;RXV.W=70;}else{RXV.L=40;RXV.W=80;}rxSyncSliders();rxWindow();};
$('#rxPresetB').onclick=()=>{const k=RXV.p.kind;if(k==='rx'){RXV.L=62;RXV.W=60;}else{RXV.L=500;RXV.W=2000;}rxSyncSliders();rxWindow();};
$('#rxReset').onclick=()=>{const k=RXV.p.kind;RXV.L=RXW[k].L;RXV.W=RXW[k].W;RXV.inv=false;RXV.lines=[];RXV.ict=null;$('#rxInvert').setAttribute('aria-pressed','false');rxSyncSliders();rxIct();rxWindow();};
function rxSyncSliders(){const k=RXV.p.kind;const lv=$('#rxLevel'),wd=$('#rxWidth');if(k==='rx'){lv.min=0;lv.max=100;wd.min=5;wd.max=100;}else{lv.min=-100;lv.max=600;wd.min=10;wd.max=2500;}lv.value=RXV.L;wd.value=RXV.W;
  $('#rxPresetA').textContent=k==='rx'?'Ventana pulmón':'Ventana cerebro (80/40)';$('#rxPresetB').textContent=k==='rx'?'Ventana mediastino':'Ventana hueso (2000/500)';}
function rxFoundUI(){const p=RXV.p;$('#rxFound').textContent=p.finds.length?`${RXV.found.length} / ${p.finds.length}`:'sin hallazgos esperados';
  $('#rxFoundList').innerHTML=RXV.found.length?RXV.found.map(i=>`<li>${esc(p.finds[i].t)}</li>`).join(''):'<li class="muted">Marca en la imagen lo que consideres patológico.</li>';}
function rxLoad(id,from){const p=PLATES.find(q=>q.id===id);if(!p)return;Object.assign(RXV,{p,L:RXW[p.kind].L,W:RXW[p.kind].W,inv:false,found:[],miss:[],checks:new Set(),lines:[],drag:null,lupa:null,done:false,ict:null});
  if(p.kind!=='rx'&&RXV.mode==='ict'){RXV.mode='mark';}
  $$('#rxModes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===RXV.mode));$('#mIct').hidden=p.kind!=='rx';
  $$('#rxList .chip').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id));
  $('#rxTitle').textContent=p.name;$('#rxInfo').innerHTML=`<b>${esc(p.who)}</b> · paciente ficticio. ${esc(p.ind)}${from?' <span class="pill info">Desde la consulta</span>':''}`;
  $('#rxChecks').innerHTML=RXCHECK[p.kind].map((t,i)=>`<li><label><input type="checkbox" id="rxc${i}" data-i="${i}"> ${esc(t)}</label></li>`).join('');
  $('#rxDx').innerHTML='<option value="">Elige tu diagnóstico…</option>'+RXDX[p.kind].map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join('');$('#rxDx').disabled=false;$('#rxGo').disabled=false;
  $('#rxFb').className='';$('#rxFb').textContent=P.rx.done[p.id]?'Ya leíste esta placa: esta lectura es de práctica y no suma VX.':'';
  rxSyncSliders();rxFoundUI();rxIct();
  $('#rxStage').hidden=false;$('#rxLoading').hidden=true;
  requestAnimationFrame(()=>{rxWindow();});}
$('#rxChecks').addEventListener('change',e=>{const i=e.target.dataset.i;if(i==null)return;if(e.target.checked)RXV.checks.add(+i);else RXV.checks.delete(+i);});
$('#rxGo').onclick=()=>{const v=$('#rxDx').value;if(!v){$('#rxFb').className='note warn small';$('#rxFb').textContent='Elige un diagnóstico.';return;}
  const p=RXV.p;RXV.done=true;$('#rxDx').disabled=true;$('#rxGo').disabled=true;const ok=v===p.dx;const all=p.finds.length===0||RXV.found.length===p.finds.length;const sys=RXV.checks.size===RXCHECK[p.kind].length;
  let ictOk=false;if(p.kind==='rx'&&RXV.ict!=null){const d=plateData(p);ictOk=Math.abs(RXV.ict-d.ctr)<=0.04;}
  const first=!P.rx.done[p.id];let xp=0;const lines=[];
  if(ok){xp+=40;lines.push('Diagnóstico correcto: +40 VX');}else lines.push('Diagnóstico incorrecto. Era: '+RXDX[p.kind].find(o=>o[0]===p.dx)[1]+'.');
  if(p.finds.length){xp+=10*RXV.found.length;lines.push(`Hallazgos: ${RXV.found.length} de ${p.finds.length} (+${10*RXV.found.length} VX)`);}
  if(RXV.miss.length){xp-=5*RXV.miss.length;lines.push(`Marcas sin hallazgo: ${RXV.miss.length} (−${5*RXV.miss.length} VX)`);}
  if(sys){xp+=15;lines.push('Lectura sistemática completa: +15 VX');}
  if(p.kind==='rx'&&RXV.ict!=null){const real=plateData(p).ctr;lines.push(`ICT medido ${RXV.ict.toFixed(2).replace('.',',')}; real ${real.toFixed(2).replace('.',',')}`+(ictOk?' (+20 VX)':''));if(ictOk)xp+=20;}
  xp=Math.max(0,xp);
  if(first){P.rx.done[p.id]=true;P.rx.read++;if(ok)P.rx.ok++;if(ok&&sys)P.rx.sys++;if(all&&p.finds.length)P.rx.all++;save();if(P.rx.sys>=3)badge('lector');if(P.rx.all>=5)badge('ojorx');if(ictOk)badge('ict');addXP(xp,'lectura radiológica');}
  else lines.push('Lectura de práctica: no suma VX.');
  const srcs=p.src.map(k=>SRC[k]).filter(Boolean).map(s=>s.u?`<a href="${s.u}" target="_blank" rel="noopener">${esc(s.k)}</a>`:esc(s.k)).join(' · ');
  $('#rxFb').className='note '+(ok?'ok':'bad')+' small';$('#rxFb').innerHTML=`<b>${ok?'Lectura correcta.':'Revisa la lectura.'}</b> ${esc(p.exp)}<br>${lines.map(esc).join('<br>')}<br><span class="muted">Fuente: ${srcs}</span>`;
  rxDraw();renderProgress();};
function rxInit(){$('#rxList').innerHTML=PLATES.map(p=>`<button type="button" class="chip" data-id="${p.id}" aria-pressed="false">${esc(p.name)}</button>`).join('');
  $('#rxList').addEventListener('click',e=>{const b=e.target.closest('.chip');if(b)rxLoad(b.dataset.id);});rxLoad('rx-neumonia');}
function openPlate(id){rxLoad(id,true);document.getElementById('radiologia').scrollIntoView({behavior:reduce?'auto':'smooth'});}
const PLATE_FOR={rx_torax:{neumonia:'rx-neumonia',tuberculosis:'rx-tb',_:'rx-normal'},tc_cerebral:{acv:'tc-isquemia',_:'tc-normal'}};
rxInit();

/* ================= Progress UI ================= */
function renderProgress(){
  const {L,N}=levelOf(P.xp);
  $('#chipLevel').textContent=L[1]; $('#chipXp').textContent=P.xp+' VX';
  $('#pLevel').textContent=L[1]; $('#pXp').textContent=P.xp+' VX';
  const pct=N?Math.round((P.xp-L[0])/(N[0]-L[0])*100):100; $('#pBar').style.width=pct+'%';
  $('#pNext').textContent=N?`Faltan ${N[0]-P.xp} VX para ${N[1]}.`:'Llegaste al nivel máximo.';
  const st=[['Casos atendidos',P.cases],['Diagnósticos correctos',P.dxOk],['Tratamientos adecuados',P.txOk],['Órganos explorados',P.organs.filter(k=>EXPLORE.includes(k)).length+' / '+EXPLORE.length],['Lesiones en estadio 3',P.seen3.length+' / '+DIS.length],['Enfermedades definidas',(P.custom||[]).length],['Placas leídas',P.rx.read]];
  $('#pStats').innerHTML=st.map(s=>`<div class="meter-box"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');
  $('#badges').innerHTML=BADGES.map(b=>{const on=P.badges.includes(b.id);return `<div class="badge ${on?'on':''}"><div class="ico" aria-hidden="true">${b.ab}</div><div><b>${esc(b.n)}</b><span>${esc(b.d)}</span><span class="mono e-7a21c6a">${on?'Obtenida':'Bloqueada'}</span></div></div>`;}).join('');
}
$('#resetAsk').onclick=()=>{
  $('#resetBox').innerHTML='<p class="small">¿Borrar VX, insignias y enfermedades definidas en este navegador?</p><div class="row"><button class="btn" type="button" id="resetNo">Cancelar</button><button class="btn primary" type="button" id="resetYes">Sí, reiniciar</button></div>';
  $('#resetNo').onclick=restoreReset; $('#resetYes').onclick=()=>{P=defaultP();save();restoreReset();if(RXV.p)rxLoad(RXV.p.id);renderProgress();renderMyList();fillDisSel();renderModel();quizA.fill(null);renderQuiz();toast('Progreso reiniciado');};
};
function restoreReset(){$('#resetBox').innerHTML='<button class="btn" type="button" id="resetAsk2">Reiniciar progreso</button>';$('#resetAsk2').onclick=()=>$('#resetAsk').onclick();}

/* ================= Turno de urgencias ================= */
const RXIMG={rx_nac:'data:image/jpeg;base64,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',rx_derrame:'data:image/jpeg;base64,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',rx_normal:'data:image/jpeg;base64,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'};
const RXINFO={
  rx_nac:{find:[{x:215,y:285,rx:95,ry:70}],w:640,h:525,txt:'Consolidación del lóbulo inferior derecho con broncograma aéreo.',src:'Caso de Radiopaedia «Pneumococcal pneumonia», CC BY-NC-SA 3.0, vía COVID-19 Image Data Collection (Cohen et al., 2020).'},
  rx_derrame:{find:[{x:440,y:300,rx:100,ry:60},{x:170,y:350,rx:70,ry:40}],w:640,h:542,txt:'Derrame pleural izquierdo con menisco y borramiento del ángulo costofrénico, con consolidación asociada.',src:'Caso de Radiopaedia «Parapneumonic effusion», CC BY-NC-SA 3.0, vía COVID-19 Image Data Collection (Cohen et al., 2020).'},
  rx_normal:{find:[],w:628,h:640,txt:'Radiografía de tórax sin hallazgos patológicos.',src:'Caso de Radiopaedia, radiografía previa normal, CC BY-NC-SA 3.0, vía COVID-19 Image Data Collection (Cohen et al., 2020).'}
};
const TU_TESTS=[
 {id:'gluc',n:'Glucometría',m:2},{id:'ecg',n:'ECG de 12 derivaciones',m:5},{id:'hemo',n:'Hemograma con hematocrito y plaquetas',m:20},
 {id:'lact',n:'Lactato sérico',m:15},{id:'pcr',n:'Proteína C reactiva',m:25},{id:'quim',n:'Creatinina y electrolitos',m:30},
 {id:'hep',n:'Perfil hepático y LDH',m:40},{id:'coag',n:'Tiempos de coagulación (INR)',m:30},{id:'uro',n:'Parcial de orina',m:20},
 {id:'cet',n:'Cetonas séricas y anion gap',m:20},{id:'prot',n:'Proteinuria (relación proteína/creatinina)',m:30},{id:'ns1',n:'Antígeno NS1 de dengue',m:30},
 {id:'hemoc',n:'Hemocultivos (2 sets)',m:10},{id:'trop',n:'Troponina de alta sensibilidad',m:45},{id:'rx',n:'Radiografía de tórax',m:25},
 {id:'tc',n:'TC de cráneo simple',m:20},{id:'eco',n:'Ecografía a la cabecera (POCUS)',m:10},
 {id:'gases',n:'Gases arteriales',m:10,pg:1},{id:'angiotc',n:'Angio-TC de vasos cerebrales',m:20,pg:1}];
const TU_INT=[
 {id:'o2',n:'Oxígeno suplementario'},{id:'acet',n:'Acetaminofén'},{id:'aine',n:'Ibuprofeno (AINE)'},
 {id:'liq_dengue',n:'Cristaloides IV 10 mL/kg/h'},{id:'bolo_dengue',n:'Bolo de cristaloides 20 mL/kg en 15 min'},
 {id:'bolo30',n:'Cristaloides 30 mL/kg (sepsis)'},{id:'liq_cad',n:'Cristaloides isotónicos 1 L en la primera hora'},
 {id:'abx',n:'Antibiótico empírico IV'},{id:'asa',n:'Ácido acetilsalicílico, dosis de carga'},
 {id:'icp',n:'ICP primaria (hemodinamia)',need:'hemodinamia'},{id:'trombo',n:'Trombólisis IV (alteplasa)'},
 {id:'insulina',n:'Insulina IV en infusión'},{id:'potasio',n:'Reposición de potasio IV'},{id:'bicarb',n:'Bicarbonato de sodio IV'},
 {id:'mg',n:'Sulfato de magnesio IV'},{id:'antihta',n:'Antihipertensivo (labetalol, hidralazina o nifedipino)'},
 {id:'parto',n:'Finalizar el embarazo',need:'gineco'},{id:'cortico',n:'Dexametasona IV'},{id:'furo',n:'Furosemida IV'},
 {id:'antic',n:'Anticoagulación plena'},{id:'egreso',n:'Alta con analgesia'},
 {id:'noradr',n:'Norepinefrina en infusión',pg:1},{id:'hidrocort',n:'Hidrocortisona IV',pg:1},{id:'trombect',n:'Trombectomía mecánica',need:'neuro',pg:1},
 {id:'transf_plq',n:'Transfusión de plaquetas',pg:1},{id:'iot',n:'Intubación orotraqueal',pg:1}];
const TU_CONS=[{id:'hemodinamia',n:'Hemodinamia'},{id:'neuro',n:'Neurología'},{id:'gineco',n:'Ginecoobstetricia'},{id:'uci',n:'UCI'},{id:'cirugia',n:'Cirugía general'}];
const TU_DX=[['dengue','Dengue con signos de alarma o grave'],['nac_sepsis','Neumonía adquirida en la comunidad con sepsis'],['iamcest','Infarto agudo de miocardio con elevación del ST'],['acv','Ataque cerebrovascular isquémico agudo'],['cad','Cetoacidosis diabética'],['preeclampsia','Preeclampsia con signos de severidad'],
 ['dispepsia','Dispepsia o gastritis'],['viral','Síndrome viral inespecífico'],['gastroenteritis','Gastroenteritis aguda'],['migrana','Migraña'],['ansiedad','Crisis de ansiedad'],['pielonefritis','Pielonefritis aguda'],['apendicitis','Apendicitis aguda']];
const TU_DISPO=[['alta','Alta'],['hosp','Hospitalización'],['uci','UCI o unidad especializada'],['cx','Salas de cirugía o parto']];
const TU_EQUIP=['Monitor multiparámetro','Pulsioxímetro','Tensiómetro','Glucómetro','Electrocardiógrafo','Bomba de infusión','Desfibrilador (DEA)','Bolsa autoinflable (Ambu)','Ecógrafo POCUS','Carro de paro'];
const AVPU={A:'Alerta',C:'Confusión nueva',V:'Responde a la voz',P:'Responde al dolor',U:'No responde'};
/* Casos: signos vitales [FC, PAS, PAD, FR, SpO2, T, conciencia] por estadio 0 a 3 */
const TU_CASES=[
 {id:'dengue',dx:'dengue',sex:'f',who:'Mujer de 26 años, 58 kg',bed:'Dengue',triage:3,organ:'higado',lesion:'hepatitis',organs:['higado'],
  cc:'Cuarto día de fiebre alta, dolor retroocular y muscular. Vive en Pereira.',hx:'Sin enfermedades previas. Vecinos con dengue.',
  v:[[98,110,70,18,98,38.4,'A'],[110,104,82,22,97,36.9,'A'],[128,94,80,26,95,36.2,'A'],[146,72,52,32,90,35.6,'V']],
  exam:['Exantema, mialgias. Abdomen blando. Prueba del torniquete positiva.','Cayó la fiebre. Dolor abdominal intenso y continuo, vómito persistente y hepatomegalia dolorosa: signos de alarma.','Piel fría, llenado capilar de 4 s, pulso débil y presión de pulso estrecha: choque compensado.','Hipotensión y somnolencia: choque hipotensivo.'],
  res:{hemo:['Hto 40 %, plaquetas 135 000, leucocitos 3 200.','Hto 46 % en ascenso, plaquetas 58 000.','Hto 52 %, plaquetas 28 000.'],ns1:'NS1 positivo.',hep:['AST 90, ALT 70 U/L.','AST 240, ALT 180 U/L.','AST 620, ALT 410 U/L.'],lact:['1,2 mmol/L.','2,1 mmol/L.','4,2 mmol/L.'],
   eco:['Sin líquido libre.','Engrosamiento de la pared vesicular con líquido perivesicular.','Ascitis y derrame pleural derecho.'],quim:['Creatinina 0,8.','Creatinina 0,9.','Creatinina 1,4.'],rx:['rx_normal','rx_normal','rx_normal']},
  key:['hemo','ns1'],prog:[70,60,45],
  need:[['liq_dengue|bolo_dengue'],['bolo_dengue']],needPg:[[],['uci']],good:{acet:0.9},
  harm:{aine:'Los AINE aumentan el riesgo de sangrado en dengue.',cortico:'Los corticoides no están indicados en dengue.',transf_plq:'No se transfunden plaquetas profilácticamente sin sangrado.',egreso:'Con signos de alarma, el dengue requiere manejo hospitalario.',furo:'El diurético empeora la hipovolemia en la fase de fuga plasmática.'},
  goals:[{id:'hto',label:'Hematocrito y plaquetas en la primera hora',test:'hemo',within:60,pts:50}],
  dispo:['hosp','uci'],tip:['Fase febril. Vigila los signos de alarma cuando caiga la fiebre: es el inicio de la fase crítica.','Hay signos de alarma: grupo B. Inicia cristaloides IV y controla el hematocrito.','Choque por dengue: grupo C. Bolo de cristaloides y reevaluación.'],
  src:'Guía de Atención Clínica Integral del Paciente con Dengue (Colombia, 2010); OMS, guías de enfermedades arbovirales (2025).'},
 {id:'nac',dx:'nac_sepsis',sex:'m',who:'Hombre de 67 años, 78 kg',bed:'Neumonía',triage:2,organ:'pulmon',lesion:'consolidacion',organs:['pulmon'],
  cc:'Tres días de tos con expectoración amarilla, fiebre y dolor en el costado derecho al respirar.',hx:'Hipertensión arterial. Exfumador.',
  v:[[96,132,80,22,93,38.5,'A'],[112,104,62,26,90,38.9,'C'],[126,84,48,30,88,39.2,'C'],[140,64,36,34,82,38.0,'V']],
  exam:['Crepitantes y soplo tubárico en la base derecha.','Confusión nueva, taquipnea y piel caliente.','Extremidades moteadas y oliguria.','Hipotensión refractaria, somnolencia.'],
  res:{rx:['rx_nac','rx_nac','rx_derrame'],hemo:['Leucocitos 16 800 con neutrofilia.','Leucocitos 21 000.','Leucocitos 2 900, plaquetas 98 000.'],pcr:'PCR 180 mg/L.',lact:['1,8 mmol/L.','2,9 mmol/L.','4,8 mmol/L.'],
   hemoc:'Hemocultivos tomados; resultado en 24 a 48 horas.',quim:['Creatinina 1,0.','Creatinina 1,6.','Creatinina 2,4.'],gases:['pH 7,44, PaO2 64 mmHg.','pH 7,36, PaO2 58 mmHg.','pH 7,24, PaO2 52 mmHg, HCO3 15.']},
  key:['rx','lact','hemoc'],prog:[60,50,45],
  need:[['abx'],['abx','bolo30']],needPg:[[],['noradr','uci']],good:{o2:0.75},harm:{egreso:'El paciente tiene criterios de hospitalización y riesgo de sepsis.'},
  goals:[{id:'abx60',label:'Antibiótico en la primera hora',int:'abx',within:60,pts:100},{id:'cult',label:'Hemocultivos antes del antibiótico',special:'cultFirst',pts:50},{id:'lact',label:'Lactato medido',test:'lact',within:180,pts:30}],
  dispo:['hosp','uci'],tip:['NEWS2 alto: busca el foco y mide lactato. La radiografía te dará una placa real para leer.','Sepsis: hemocultivos y antibiótico en la primera hora.','Choque séptico: 30 mL/kg de cristaloides; en posgrado, norepinefrina si la PAM sigue por debajo de 65 mmHg.'],
  src:'Singer et al. (2016), Sepsis-3; Evans et al. (2021), Surviving Sepsis Campaign.'},
 {id:'iam',dx:'iamcest',sex:'m',who:'Hombre de 58 años, 82 kg',bed:'Dolor epigástrico',triage:2,organ:'corazon',lesion:'infarto',organs:['corazon'],
  cc:'«Agrieras» desde hace 40 minutos que no ceden con antiácido, con sudoración.',hx:'Fumador, dislipidemia sin tratamiento.',
  v:[[92,152,94,18,97,36.8,'A'],[104,138,88,20,95,36.9,'A'],[118,86,58,26,90,36.5,'A'],[160,60,30,30,80,36.2,'U']],
  exam:['Dolor retroesternal opresivo irradiado a la mandíbula, diaforesis leve.','Dolor intenso persistente, diaforesis profusa.','Estertores bilaterales, hipotensión y frialdad: choque cardiogénico.','Fibrilación ventricular.'],
  res:{ecg:['Ondas T hiperagudas en V2 a V4 sin elevación diagnóstica del ST. Repetir en 15 a 30 minutos.','Elevación del ST de 3 mm en V1 a V4 (cara anterior).','Elevación del ST de V1 a V6 con extrasístoles ventriculares.'],trop:['Ligeramente por encima del percentil 99.','Elevada.','Muy elevada.'],
   rx:['rx_normal','rx_normal','Congestión pulmonar bilateral (sin imagen disponible).'],gluc:'142 mg/dL.',hemo:'Normal.'},
  key:['ecg','trop'],prog:[35,45,35],
  need:[['asa','icp'],['asa','icp']],needPg:[[],['uci']],good:{o2:0.95},harm:{egreso:'El dolor torácico con cambios isquémicos no puede darse de alta como dispepsia.',aine:'Los AINE están contraindicados en el síndrome coronario agudo.'},
  goals:[{id:'ecg10',label:'ECG en los primeros 10 minutos',test:'ecg',within:10,pts:80,ord:1},{id:'icp90',label:'ICP primaria en 90 minutos',int:'icp',within:90,pts:120}],
  dispo:['uci','cx'],tip:['Dolor «gástrico» con sudoración en un fumador: ECG de inmediato.','Elevación del ST: aspirina y activación de hemodinamia para ICP primaria.','Choque cardiogénico: reperfusión urgente y UCI.'],
  src:'Byrne et al. (2023), guías ESC de síndrome coronario agudo; Akbar y Sharma (2024), StatPearls.'},
 {id:'acv',dx:'acv',sex:'f',who:'Mujer de 74 años, 62 kg',bed:'Déficit transitorio',triage:2,organ:'cerebro',lesion:'isquemia',organs:['cerebro'],
  cc:'Hace 40 minutos tuvo debilidad del brazo derecho y dificultad para hablar durante 15 minutos. Ahora dice sentirse bien.',hx:'Hipertensión. Palpitaciones ocasionales, sin anticoagulación.',
  v:[[84,172,98,18,96,36.7,'A'],[92,178,100,18,95,36.8,'A'],[96,186,104,20,94,37.0,'V'],[58,210,118,10,90,37.5,'U']],
  exam:['Sin déficit en este momento. Pulso irregular.','Hemiparesia derecha y afasia de expresión (NIHSS 10). El déficit reapareció: empieza la ventana terapéutica.','Hemiplejia derecha, afasia global, desviación de la mirada (NIHSS 19).','Anisocoria y respiración irregular: herniación.'],
  res:{gluc:'112 mg/dL.',ecg:'Fibrilación auricular.',tc:['Sin hallazgos agudos.','Sin hemorragia; cambios tempranos mínimos (ASPECTS 9).','Hipodensidad extensa en el territorio de la arteria cerebral media izquierda.'],angiotc:['Sin oclusión de gran vaso.','Oclusión del segmento M1 de la arteria cerebral media izquierda.','Oclusión de M1 izquierda.'],coag:'INR 1,0.',hemo:'Plaquetas 230 000.'},
  key:['gluc','tc'],prog:[25,90,90],onsetStage:1,
  need:[['trombo'],['trombo']],needPg:[['trombect'],['trombect']],harm:{antic:'La anticoagulación plena en la fase aguda del ACV aumenta el riesgo de transformación hemorrágica.',egreso:'Un déficit neurológico transitorio requiere estudio urgente: alto riesgo de ACV.'},
  goals:[{id:'tc25',label:'TC en los primeros 25 minutos',test:'tc',within:25,pts:80,ord:1},{id:'win',label:'Trombólisis dentro de la ventana de 4,5 horas',int:'trombo',special:'window',pts:120}],
  dispo:['uci'],tip:['Un déficit transitorio en una paciente con pulso irregular es una alarma: estudia ya.','Déficit establecido: glucometría y TC simple; si no hay sangrado y estás en la ventana, trombólisis.','En posgrado, la angio-TC define la trombectomía.'],
  src:'Powers et al. (2019), guías AHA/ASA de ACV isquémico agudo; Alexandrov y Krishnaiah (2025), Manual MSD.'},
 {id:'cad',dx:'cad',sex:'m',who:'Hombre de 19 años, 60 kg',bed:'Vómito y dolor abdominal',triage:2,organ:'pancreas',lesion:null,organs:['pancreas'],
  cc:'Dos días de vómito y dolor abdominal. Mucha sed y orina abundante desde hace dos semanas.',hx:'Diabetes tipo 1; dejó la insulina hace cuatro días.',
  v:[[108,118,72,24,98,37.0,'A'],[122,108,64,30,98,36.8,'A'],[134,92,56,32,97,36.5,'V'],[150,74,40,10,95,36.0,'U']],
  exam:['Mucosas secas, dolor abdominal difuso sin defensa.','Respiración de Kussmaul y aliento cetónico.','Somnolencia y deshidratación severa.','Coma.'],
  res:{gluc:['386 mg/dL.','452 mg/dL.','520 mg/dL.'],cet:['Cetonas positivas, anion gap 20.','Cetonas positivas, anion gap 26.','Anion gap 32.'],gases:['pH 7,26, HCO3 14.','pH 7,14, HCO3 9.','pH 6,98, HCO3 5.'],quim:['Na 132, K 5,4, creatinina 1,3.','Na 131, K 5,7, creatinina 1,6.','K 6,0, creatinina 2,1.'],uro:'Glucosuria y cetonuria.',hemo:'Leucocitosis de estrés, 13 500.'},
  key:['gluc','cet','quim'],prog:[55,55,45],
  need:[['liq_cad','insulina'],['liq_cad','insulina']],needPg:[['potasio'],['potasio','uci']],harm:{bicarb:'El bicarbonato no está indicado con pH de 7,0 o más.',egreso:'La cetoacidosis requiere manejo hospitalario.'},
  goals:[{id:'gluc10',label:'Glucometría en los primeros 10 minutos',test:'gluc',within:10,pts:50,ord:1},{id:'kfirst',label:'Potasio conocido antes de la insulina',special:'kFirst',pts:60}],
  dispo:['hosp','uci'],tip:['Vómito, sed y poliuria en un joven: glucometría ya.','Cetoacidosis: líquidos primero, revisa el potasio y luego insulina en infusión.','Cetoacidosis grave: UCI.'],
  src:'Umpierrez et al. (2024), consenso de crisis hiperglucémicas en adultos.'},
 {id:'pe',dx:'preeclampsia',sex:'f',who:'Mujer de 29 años, primigestante, 35 semanas',bed:'Cefalea en embarazo',triage:2,organ:'reproductor',lesion:null,organs:['reproductor','higado'],
  cc:'Cefalea desde esta mañana e hinchazón de los pies.',hx:'Controles prenatales normales hasta la semana 30.',
  v:[[92,148,96,18,98,36.8,'A'],[98,164,112,20,98,36.9,'A'],[106,172,116,22,96,37.0,'A'],[120,180,120,28,92,37.2,'U']],
  exam:['Edema de miembros inferiores. Feto activo.','Cefalea intensa, fosfenos e hiperreflexia: signos de severidad.','Dolor en epigastrio e hipocondrio derecho.','Convulsión tónico-clónica: eclampsia.'],
  res:{prot:['Relación proteína/creatinina 0,45.','0,9.','1,6.'],hemo:['Plaquetas 168 000.','Plaquetas 132 000.','Plaquetas 86 000; hemólisis en el frotis.'],hep:['AST 32 U/L.','AST 70 U/L.','AST 260 U/L, LDH 720 U/L: HELLP.'],quim:'Creatinina 0,9.',eco:'Feto único vivo, cefálico, líquido amniótico normal.'},
  key:['prot','hemo','hep'],prog:[50,50,40],
  need:[['mg','antihta','parto'],['mg','antihta','parto']],needPg:[[],['uci']],harm:{furo:'Los diuréticos no están indicados en la preeclampsia sin edema pulmonar.',egreso:'Hipertensión en el embarazo con cefalea requiere evaluación hospitalaria.'},
  goals:[{id:'mg',label:'Sulfato de magnesio administrado',int:'mg',within:240,pts:80},{id:'hta60',label:'Antihipertensivo en la primera hora de la crisis',int:'antihta',special:'severeBP',pts:80}],
  dispo:['cx','uci'],tip:['Hipertensión y cefalea en el tercer trimestre: proteinuria, plaquetas y transaminasas.','Signos de severidad: sulfato de magnesio, antihipertensivo y ginecoobstetricia para finalizar el embarazo.','Sospecha de HELLP: estabiliza y finaliza el embarazo.'],
  src:'OMS (2011), recomendaciones para la prevención y el tratamiento de la preeclampsia y la eclampsia.'}];
const TU={level:'pre',speed:1,run:false,t:0,pts:0,pats:[],sel:null,sys:true,icu:2,ended:false,log:[],avatar:null,reader:null,started:false,pend:[],cons:{}};
function tuNews(v,o2){let s=0;const [hr,sbp,,rr,sp,t,c]=v;
  s+=rr<=8?3:rr<=11?1:rr<=20?0:rr<=24?2:3; s+=sp<=91?3:sp<=93?2:sp<=95?1:0; s+=o2?2:0;
  s+=sbp<=90?3:sbp<=100?2:sbp<=110?1:sbp<=219?0:3; s+=hr<=40?3:hr<=50?1:hr<=90?0:hr<=110?1:hr<=130?2:3;
  s+=c==='A'?0:3; s+=t<=35?3:t<=36?1:t<=38?0:t<=39?1:2; return s;}
function tuVitals(p){const s=Math.min(3,p.s);const i=Math.min(2,Math.floor(s)),f=s-i;const a=p.c.v[i],b=p.c.v[i+1];const v=a.map((x,k)=>typeof x==='number'?x+(b[k]-x)*f:(f>0.6?b[k]:x));
  if(p.done.o2&&p.c.id!=='iam')v[4]=Math.min(98,v[4]+4);return v;}
function tuStage(p){return Math.min(3,Math.floor(p.s));}
function tuFmt(t){const h=Math.floor(t/60),m=Math.floor(t%60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function tuLog(txt,hit){TU.log.unshift({t:TU.t,txt});const e=document.createElement('div');e.className='entry'+(hit?' hit':'');e.innerHTML=`<b>${tuFmt(TU.t)}</b>${esc(txt)}`;$('#tuLog').prepend(e);while($('#tuLog').children.length>120)$('#tuLog').lastChild.remove();}
function tuPts(n,why,p){TU.pts+=n;if(p)p.pts+=n;if(why)tuLog(`${n>0?'+':''}${n} · ${why}`,n>0);}
function tuNewPatient(c,arrive,bed){return {c,bed,arrive,s:0,m:1,mul:1,hist:[],tests:{},ints:{},done:{},orders:[],dx:null,dxOk:false,triage:null,stage:0,state:'espera',pts:0,goals:{},treating:false,stableT:0,onset:null,avatarOk:false,rxRead:false,outcome:null,lastStage:0,maxStage:0,severeBPt:null};}
function tuStartTurn(){
  const pool=TU_CASES.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const n=TU.level==='pre'?2:4;const arr=TU.level==='pre'?[0,15]:[0,8,20,35];
  Object.assign(TU,{run:true,t:0,pts:0,pats:[],sel:null,sys:true,icu:TU.level==='pre'?2:1,ended:false,log:[],started:true,pend:[],cons:{}});
  TU.queue=pool.slice(0,n).map((c,i)=>({c,at:arr[i]}));TU.spare=pool.slice(n);
  $('#tuLog').innerHTML='';$('#tuDebrief').hidden=true;$('#tuMain').hidden=false;$('#tuPause').disabled=false;$('#tuPause').textContent='Pausa';
  tuLog(`Inicia el turno en nivel ${TU.level==='pre'?'pregrado':'posgrado'}.`,true);tuCoach('Llega el primer paciente. Clasifícalo con el triage antes de cualquier otra cosa.');TU.stepKey=null;
  tuBuildButtons();tuRender(true);
}
function tuCoach(t){$('#tuCoach').textContent=t;}
function tuArrivals(){while(TU.queue.length&&TU.queue[0].at<=TU.t){const q=TU.queue.shift();const p=tuNewPatient(q.c,TU.t,TU.pats.length+1);TU.pats.push(p);tuLog(`Ingresa a la cama ${p.bed}: ${q.c.who}. ${q.c.cc}`,true);if(TU.sel==null)TU.sel=TU.pats.length-1;toast('Nuevo paciente en la cama '+p.bed);}}
function tuNeedMet(p){const band=p.s<1.5?0:1;let req=p.c.need[band].slice();if(TU.level==='pos')req=req.concat(p.c.needPg[band]);
  return req.every(r=>r.split('|').some(x=>x.startsWith('t:')?p.tests[x.slice(2)]&&p.tests[x.slice(2)].done:(x==='uci'?TU.cons['uci:'+p.bed]==='ok':!!p.done[x])));}
function tuTick(dt){
  TU.t+=dt;tuArrivals();
  for(const p of TU.pats){if(p.state==='muerto'||p.state==='egresado')continue;
    // pruebas en curso
    for(const id in p.tests){const r=p.tests[id];if(!r.done&&TU.t>=r.ready){r.done=true;r.stage=tuStage(p);r.txt=tuResult(p,id,r.stage);tuLog(`Resultado (cama ${p.bed}) · ${tuTestName(id)}: ${r.txt.label}`,true);}}
    // enfermería automática
    if($('#tuAuto').checked){for(const o of p.orders)if(!o.given&&TU.t>=o.t+2)tuGive(p,o,true);}
    // evolución
    if(p.dxOk&&tuNeedMet(p)){if(!p.treating){p.treating=true;tuLog(`Cama ${p.bed}: tratamiento definitivo completo; el paciente empieza a responder.`,true);}p.s=Math.max(0,p.s-dt/40);}
    else{p.treating=false;const st=Math.min(2,Math.floor(p.s));const rate=1/p.c.prog[st];let g=1;for(const k in p.c.good||{})if(p.done[k])g*=p.c.good[k];if(p.done.liq_dengue||p.done.bolo30||p.done.liq_cad)g*=0.8;p.s+=rate*g*p.mul*(TU.level==='pre'?0.6:1)*dt;}
    const stg=tuStage(p);
    if(p.c.onsetStage!=null&&p.onset==null&&stg>=p.c.onsetStage)p.onset=TU.t;
    if(p.c.id==='pe'&&stg>=1&&p.severeBPt==null)p.severeBPt=TU.t;
    if(stg>p.maxStage){p.maxStage=stg;if(stg<3){tuPts(-50,`Cama ${p.bed}: el paciente empeora al estadio ${stg}`,p);if(p===TU.pats[TU.sel]&&TU.level==='pre')tuCoach(p.c.tip[Math.min(2,stg)]);}}
    if(p.s>=3){p.state='muerto';p.outcome='Falleció';tuPts(-300,`Cama ${p.bed}: paro cardiorrespiratorio sin retorno. El paciente fallece.`,p);toast('Falleció el paciente de la cama '+p.bed);}
    if(p.treating&&p.s<0.3){p.stableT+=dt;if(p.state!=='estable'&&p.stableT>10){p.state='estable';tuLog(`Cama ${p.bed}: paciente estable. Define el destino.`,true);}}
    if(p.lastH==null||TU.t-p.lastH>=2){p.lastH=TU.t;p.hist.push([TU.t,p.s]);}
  }
  // interconsultas
  for(const k in TU.cons){const c=TU.cons[k];if(typeof c==='object'&&TU.t>=c.ready){if(c.id==='uci'&&TU.icu<=0){TU.cons[k]='sin cama';tuLog(`Enlace: la UCI no tiene camas para la cama ${c.bed}.`,false);}else{if(c.id==='uci')TU.icu--;TU.cons[k]='ok';tuLog(`Enlace: ${TU_CONS.find(x=>x.id===c.id).n} acepta al paciente de la cama ${c.bed}.`,true);}}}
  const active=TU.pats.filter(p=>p.state!=='muerto'&&p.state!=='egresado');
  if((!TU.queue.length&&TU.pats.length&&!active.length)||TU.t>=480)tuEnd();
}
function tuTestName(id){const t=TU_TESTS.find(x=>x.id===id);return t?t.n:id;}
function tuResult(p,id,stg){let r=p.c.res[id];if(r==null)return {label:'Sin alteraciones relevantes.'};if(Array.isArray(r))r=r[Math.min(stg,r.length-1)];
  if(id==='rx'&&RXINFO[r])return {label:'Placa disponible: ábrela para leerla.',img:r};return {label:r};}
function tuOrderTest(p,id){if(p.tests[id]){toast('Ya se pidió esa prueba');return;}const t=TU_TESTS.find(x=>x.id===id);
  if(!TU.sys)tuLog('Orden verbal con lectura de vuelta (sistema caído).',true);
  p.tests[id]={t:TU.t,ready:TU.t+t.m,done:false};tuLog(`Médico (cama ${p.bed}) pide ${t.n}.`);
  if(!p.c.key.includes(id)&&p.c.res[id]==null&&id!=='gluc'){tuPts(TU.level==='pos'?-15:-10,`Prueba no justificada para este cuadro: ${t.n}`,p);}
  tuGoalCheck(p,'test',id);tuRender();}
function tuOrderInt(p,id){const it=TU_INT.find(x=>x.id===id);if(p.ints[id]){toast('Ya ordenaste esa intervención');return;}
  p.ints[id]=true;p.orders.push({id,t:TU.t,given:false});tuLog(`Médico (cama ${p.bed}) ordena ${it.n}.`);tuRender();}
function tuGive(p,o,auto){const it=TU_INT.find(x=>x.id===o.id);
  if(it.need&&TU.cons[it.need+':'+p.bed]!=='ok'){if(!o.warned){o.warned=true;tuLog(`Enfermería (cama ${p.bed}): ${it.n} requiere que ${TU_CONS.find(x=>x.id===it.need).n} acepte al paciente. Pídelo a Enlace.`);}return;}
  if(o.id==='trombo'){const st=tuStage(p);if(!(p.tests.tc&&p.tests.tc.done)){if(!o.warned2){o.warned2=true;tuLog('Enfermería: la trombólisis exige una TC que descarte hemorragia.');}return;}
    if(p.onset==null||TU.t-p.onset>270){o.given=true;p.done.trombo_fuera=true;tuPts(-100,'Trombólisis fuera de la ventana o sin déficit establecido: riesgo de sangrado sin beneficio',p);return;}}
  o.given=true;p.done[o.id]=TU.t;tuLog(`${auto?'Enfermería (automática)':'Enfermería'} administra ${it.n} (cama ${p.bed}).`);
  const h=p.c.harm[o.id];if(h){p.mul*=1.5;tuPts(-80,`Intervención dañina: ${h}`,p);}
  else{const allNeed=p.c.need.flat().concat(p.c.needPg.flat()).join('|').split('|');if(allNeed.includes(o.id)||(p.c.good&&p.c.good[o.id]))tuPts(20,`Intervención indicada: ${it.n}`,p);}
  tuGoalCheck(p,'int',o.id);tuRender();}
function tuGoalCheck(p,kind,id){for(const g of p.c.goals){if(p.goals[g.id])continue;const el=TU.t-p.arrive;
  if(g.test&&kind==='test'&&g.test===id){p.goals[g.id]=el<=g.within?'ok':'tarde';if(p.goals[g.id]==='ok')tuPts(g.pts,`Meta cumplida: ${g.label}`,p);}
  if(g.int&&kind==='int'&&g.int===id){let ok=el<=(g.within||1e9);if(g.special==='window')ok=p.onset!=null&&TU.t-p.onset<=270;if(g.special==='severeBP')ok=p.severeBPt==null||TU.t-p.severeBPt<=60;p.goals[g.id]=ok?'ok':'tarde';if(ok)tuPts(g.pts,`Meta cumplida: ${g.label}`,p);}
  if(g.special==='cultFirst'&&kind==='int'&&id==='abx'){p.goals[g.id]=p.tests.hemoc?'ok':'no';if(p.tests.hemoc)tuPts(g.pts,`Meta cumplida: ${g.label}`,p);}
  if(g.special==='kFirst'&&kind==='int'&&id==='insulina'){const ok=p.tests.quim&&p.tests.quim.done;p.goals[g.id]=ok?'ok':'no';if(ok)tuPts(g.pts,`Meta cumplida: ${g.label}`,p);else if(TU.level==='pos')tuPts(-40,'Insulina sin conocer el potasio: riesgo de hipopotasemia',p);}}}
function tuConsult(p,id){const k=id+':'+p.bed;if(TU.cons[k]){toast('Ya se solicitó');return;}TU.cons[k]={id,bed:p.bed,ready:TU.t+(id==='uci'?15:12)};
  const v=tuVitals(p);tuLog(`Enlace solicita ${TU_CONS.find(x=>x.id===id).n} para la cama ${p.bed} con SBAR.`);tuRender();}
function tuSbar(p){const v=tuVitals(p);return `S: ${p.c.who}, ${p.c.cc.toLowerCase()} B: ${p.c.hx} A: FC ${Math.round(v[0])}, PA ${Math.round(v[1])}/${Math.round(v[2])}, FR ${Math.round(v[3])}, SpO2 ${Math.round(v[4])} %, NEWS2 ${tuNews(v,p.done.o2)}${p.dx?'; impresión diagnóstica: '+TU_DX.find(d=>d[0]===p.dx)[1].toLowerCase():''}. R: solicito valoración y conducta.`;}
function tuDiagnose(p,dx){if(p.dx){toast('Ya confirmaste un diagnóstico');return;}p.dx=dx;p.dxOk=dx===p.c.dx;
  if(p.dxOk)tuPts(100,`Diagnóstico correcto en la cama ${p.bed}`,p);else{tuPts(TU.level==='pos'?-60:-30,`Diagnóstico incorrecto en la cama ${p.bed}: ${TU_DX.find(d=>d[0]===dx)[1]}`,p);p.dx=null;if(TU.level==='pre')tuCoach('Ese diagnóstico no explica los hallazgos. Revisa las pruebas clave y vuelve a intentarlo.');}tuRender();}
function tuDispo(p,d){if(p.state!=='estable')return;const ok=p.c.dispo.includes(d);p.state='egresado';p.outcome=ok?'Salvado: '+TU_DISPO.find(x=>x[0]===d)[1]:'Salvado, con destino inadecuado';tuPts(ok?150:40,`Cama ${p.bed}: destino ${TU_DISPO.find(x=>x[0]===d)[1].toLowerCase()}${ok?'':' (no era el más adecuado)'}`,p);if(p.maxStage<2&&ok)tuPts(50,'Bono: el paciente nunca llegó a estado grave',p);tuRender();}
function tuSetTriage(p,cat){if(p.triage!=null)return;p.triage=cat;const d=Math.abs(cat-p.c.triage);if(d===0){tuPts(50,`Triage correcto (categoría ${['I','II','III','IV','V'][cat-1]})`,p);P.triageOk=(P.triageOk||0)+1;save();if(P.triageOk>=5)badge('triage');}else if(d===1)tuPts(15,'Triage cercano al correcto',p);else tuPts(-20,'Triage inadecuado: el paciente quedó mal priorizado',p);p.state='atención';tuRender();}
/* lectura de la placa */
function tuOpenRx(p,img){const R=RXINFO[img];TU.reader={p,img};$('#tuRxImg').src=RXIMG[img];$('#tuRxMark').hidden=true;$('#tuRxFb').textContent='';$('#tuRxSrc').textContent='Imagen: '+R.src;$('#tuReader').hidden=false;}
$('#tuReaderClose').onclick=()=>{$('#tuReader').hidden=true;};
/* ================= Vademécum del turno y recursos electrónicos de la UTP ================= */
const VD_PX='https://';
const VD_RES={
  micromedex:{n:'Micromedex',u:VD_PX+'lpdotlib.proxyutp.elogim.com/utpereira-colombia-2024',d:'Información de medicamentos: dosis, interacciones, compatibilidad intravenosa, efectos adversos y toxicología.'},
  dynamed:{n:'DynaMed',u:VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?profile=dmp&authtype=ip,uid',d:'Resúmenes clínicos basados en la evidencia para decidir en el punto de atención.'},
  clinicalkey:{n:'ClinicalKey',u:VD_PX+'clinicalkey.proxyutp.elogim.com/',d:'Libros, revistas, guías de práctica clínica y monografías de medicamentos de Elsevier.'},
  accessmedicina:{n:'AccessMedicina',u:VD_PX+'accessmedicina.proxyutp.elogim.com/',d:'Libros de texto de medicina de McGraw-Hill en español, con videos y herramientas.'},
  accessmedicine:{n:'AccessMedicine',u:VD_PX+'accessmedicine.proxyutp.elogim.com/',d:'La versión en inglés de McGraw-Hill: textos, casos y herramientas de referencia.'},
  obgyn:{n:'Access ObGyn',u:VD_PX+'obgyn.proxyutp.elogim.com/',d:'Obstetricia y ginecología: textos, guías y herramientas de McGraw-Hill.'},
  eureka:{n:'Eureka (Médica Panamericana)',u:VD_PX+'medicapanamericana.proxyutp.elogim.com/eureka',d:'Libros de ciencias de la salud de la Editorial Médica Panamericana, en español.'},
  amolca:{n:'Amolca',u:VD_PX+'amolca.proxyutp.elogim.com/',d:'Libros interactivos de ciencias de la salud.'},
  medline:{n:'MEDLINE Complete',u:VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?profile=ehost&defaultdb=mdc&authtype=ip',d:'Artículos biomédicos en texto completo para buscar la evidencia original.'},
  mediclatina:{n:'MedicLatina',u:VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?profile=ehost&defaultdb=lth&authtype=ip',d:'Revistas médicas latinoamericanas y españolas, en español.'},
  nejm:{n:'The New England Journal of Medicine',u:VD_PX+'nejm.proxyutp.elogim.com/',d:'Revista semanal de medicina general: ensayos clínicos, revisiones y casos.'},
  bmj:{n:'The BMJ',u:VD_PX+'thebmj-bmj.proxyutp.elogim.com/',d:'Revista de medicina general con investigación, revisiones clínicas y opinión de expertos.'},
  scopus:{n:'Scopus',u:VD_PX+'scopus.proxyutp.elogim.com/',d:'Resúmenes y citas de literatura científica de todas las áreas, con herramientas de bibliometría.'},
  primal:{n:'Primal Pictures',u:VD_PX+'anatomytv.proxyutp.elogim.com/',d:'Anatomía humana en 3D para repasar el órgano afectado.'}
};
const VD_GRUPOS=[
  ['Medicamentos','Para confirmar dosis, interacciones y contraindicaciones.',['micromedex']],
  ['Decisión clínica en el punto de atención','Para revisar el manejo completo de cada cuadro.',['dynamed','clinicalkey','accessmedicina','accessmedicine','obgyn']],
  ['Libros de ciencias de la salud','Para estudiar la farmacología y la fisiopatología con calma.',['eureka','amolca']],
  ['Artículos y evidencia original','Para leer los ensayos y las guías completas.',['medline','mediclatina','scopus','nejm','bmj']],
  ['Anatomía','Para repasar en 3D el órgano comprometido.',['primal']]
];
/* Ecuaciones de búsqueda: términos por medicamento (inglés y español) y cuadro clínico */
const VD_T={
 o2:{en:['oxygen therapy','oxygen inhalation therapy'],es:['oxigenoterapia'],ce:['hypoxemia'],cs:['hipoxemia']},
 acet:{en:['acetaminophen','paracetamol'],es:['acetaminofén','paracetamol'],ce:['dengue'],cs:['dengue']},
 aine:{en:['ibuprofen','NSAID'],es:['ibuprofeno','antiinflamatorios no esteroideos'],ce:['dengue','acute coronary syndrome'],cs:['dengue','síndrome coronario agudo']},
 cristaloides:{en:['lactated Ringer','crystalloid solutions'],es:['lactato de Ringer','cristaloides'],ce:['sepsis','dengue','diabetic ketoacidosis'],cs:['sepsis','dengue','cetoacidosis diabética']},
 abx:{en:['ceftriaxone','clarithromycin','empirical antibiotic therapy'],es:['ceftriaxona','claritromicina','antibioticoterapia empírica'],ce:['community-acquired pneumonia','sepsis'],cs:['neumonía adquirida en la comunidad','sepsis']},
 asa:{en:['aspirin','acetylsalicylic acid'],es:['ácido acetilsalicílico','aspirina'],ce:['acute coronary syndrome','myocardial infarction'],cs:['síndrome coronario agudo','infarto agudo de miocardio']},
 trombo:{en:['alteplase','tissue plasminogen activator'],es:['alteplasa','trombólisis'],ce:['acute ischemic stroke'],cs:['ataque cerebrovascular isquémico','ictus isquémico']},
 insulina:{en:['regular insulin','insulin infusion'],es:['insulina regular','infusión de insulina'],ce:['diabetic ketoacidosis'],cs:['cetoacidosis diabética']},
 potasio:{en:['potassium chloride'],es:['cloruro de potasio'],ce:['hypokalemia','diabetic ketoacidosis'],cs:['hipopotasemia','cetoacidosis diabética']},
 bicarb:{en:['sodium bicarbonate'],es:['bicarbonato de sodio'],ce:['diabetic ketoacidosis'],cs:['cetoacidosis diabética']},
 mg:{en:['magnesium sulfate'],es:['sulfato de magnesio'],ce:['preeclampsia','eclampsia'],cs:['preeclampsia','eclampsia']},
 antihta:{en:['labetalol','hydralazine','nifedipine'],es:['labetalol','hidralazina','nifedipino'],ce:['severe hypertension in pregnancy','preeclampsia'],cs:['hipertensión severa en el embarazo','preeclampsia']},
 cortico:{en:['dexamethasone','antenatal corticosteroids'],es:['dexametasona','corticoides antenatales'],ce:['preterm birth'],cs:['parto pretérmino']},
 furo:{en:['furosemide'],es:['furosemida'],ce:['pulmonary edema','fluid overload'],cs:['edema pulmonar','sobrecarga de volumen']},
 antic:{en:['heparin','enoxaparin'],es:['heparina','enoxaparina'],ce:['acute ischemic stroke','venous thromboembolism'],cs:['ataque cerebrovascular isquémico','tromboembolia venosa']},
 noradr:{en:['norepinephrine','noradrenaline'],es:['norepinefrina','noradrenalina'],ce:['septic shock'],cs:['choque séptico']},
 hidrocort:{en:['hydrocortisone'],es:['hidrocortisona'],ce:['septic shock'],cs:['choque séptico']},
 transf_plq:{en:['platelet transfusion'],es:['transfusión de plaquetas'],ce:['dengue','thrombocytopenia'],cs:['dengue','trombocitopenia']}
};
/* Lo que necesita el usuario: cada opción agrega su bloque a la ecuación */
const VD_NEED=[
 {id:'dosis',n:'Dosis y administración',en:['dosage','drug administration'],es:['dosis','administración']},
 {id:'contra',n:'Contraindicaciones y efectos adversos',en:['contraindications','adverse effects'],es:['contraindicaciones','efectos adversos']},
 {id:'inter',n:'Interacciones',en:['drug interactions'],es:['interacciones farmacológicas']},
 {id:'cuadro',n:'Evidencia en el cuadro clínico',en:null,es:null}
];
const vdQ=t=>/\s/.test(t)?`"${t}"`:t;
const vdOr=a=>a.length>1?'('+a.map(vdQ).join(' OR ')+')':vdQ(a[0]);
// ecuación booleana (bases de artículos) y consulta corta (herramientas clínicas)
function vdEq(t,need,lang){const d=lang==='es'?t.es:t.en,c=lang==='es'?t.cs:t.ce,nd=VD_NEED.find(x=>x.id===need);
  const f=nd.en?(lang==='es'?nd.es:nd.en):c;return vdOr(d)+' AND '+vdOr(f);}
function vdCorta(t,need,lang){const d=(lang==='es'?t.es:t.en)[0],nd=VD_NEED.find(x=>x.id===need);
  const f=nd.en?(lang==='es'?nd.es:nd.en)[0]:(lang==='es'?t.cs:t.ce)[0];return d+' '+f;}
/* Cómo abre cada recurso: 'url' llega con la búsqueda hecha; 'copia' copia la búsqueda y abre el recurso */
const VD_IR=[
 {k:'micromedex',modo:'copia',lang:'en',q:(t)=>t.en[0]},
 {k:'dynamed',modo:'copia',lang:'en',q:(t,n)=>vdCorta(t,n,'en')},
 {k:'clinicalkey',modo:'url',lang:'en',url:(t,n)=>VD_PX+'clinicalkey.proxyutp.elogim.com/#!/search/'+encodeURIComponent(vdCorta(t,n,'en'))},
 {k:'accessmedicina',modo:'url',lang:'es',url:(t,n)=>VD_PX+'accessmedicina.proxyutp.elogim.com/searchresults.aspx?q='+encodeURIComponent(vdCorta(t,n,'es'))},
 {k:'medline',modo:'url',lang:'en',url:(t,n)=>VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?direct=true&authtype=ip&db=mdc&type=1&site=ehost-live&bquery='+encodeURIComponent(vdEq(t,n,'en'))},
 {k:'mediclatina',modo:'url',lang:'es',url:(t,n)=>VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?direct=true&authtype=ip&db=lth&type=1&site=ehost-live&bquery='+encodeURIComponent(vdEq(t,n,'es'))},
 {k:'scopus',modo:'url',lang:'en',url:(t,n)=>VD_PX+'scopus.proxyutp.elogim.com/results/results.uri?src=s&sot=b&sdt=b&s='+encodeURIComponent('TITLE-ABS-KEY('+vdEq(t,n,'en')+')')}
];
const VD_UTP='https://biblioteca.utp.edu.co/recursos-electronicos/369/facultad-ciencias-de-la-salud/';
const VD_MYLOFT='https://app.myloft.xyz/user/login';
const VD=[
 {id:'o2',ints:['o2'],n:'Oxígeno suplementario',g:'Gas medicinal',
  uso:'Corrige la hipoxemia. En la mayoría de los adultos la meta de saturación está entre 94 y 98 %, y entre 88 y 92 % si hay riesgo de retener CO2.',
  cuidado:'No se recomienda de rutina cuando la saturación es normal, por ejemplo en el síndrome coronario agudo con saturación de 90 % o más. Vigila la respuesta con el pulsioxímetro.',
  q:'Oxygen therapy',src:['bts_o2','esc_acs']},
 {id:'acet',ints:['acet'],n:'Acetaminofén (paracetamol)',g:'Analgésico y antipirético',
  uso:'Fiebre y dolor leve a moderado. Es el analgésico de elección cuando los AINE están contraindicados, como en el dengue.',
  cuidado:'La sobredosis produce daño hepático. Respeta la dosis máxima diaria y ajústala en hepatopatía, alcoholismo y desnutrición.',
  q:'Acetaminophen',src:['dengue_col','who_arbo']},
 {id:'aine',ints:['aine'],n:'Ibuprofeno',g:'Antiinflamatorio no esteroideo (AINE)',
  uso:'Dolor, fiebre e inflamación en cuadros sin riesgo de sangrado ni compromiso renal.',
  cuidado:'Contraindicado en el dengue por el riesgo de sangrado y en el síndrome coronario agudo. Precaución en enfermedad renal, úlcera péptica, anticoagulación y tercer trimestre del embarazo.',
  q:'Ibuprofen',src:['dengue_col','esc_acs']},
 {id:'cristaloides',ints:['liq_dengue','bolo_dengue','bolo30','liq_cad'],n:'Cristaloides isotónicos',g:'Soluciones intravenosas (lactato de Ringer, solución salina al 0,9 %)',
  uso:'Reponen volumen en la deshidratación, el dengue con signos de alarma o choque, la sepsis con hipoperfusión y la cetoacidosis diabética. El volumen y la velocidad cambian según el cuadro.',
  cuidado:'Reevalúa después de cada bolo: perfusión, diuresis, hematocrito y crepitantes. El exceso de líquidos produce sobrecarga y edema pulmonar.',
  q:'Lactated Ringer solution',src:['dengue_col','ssc2021','dka2024']},
 {id:'abx',ints:['abx'],n:'Antibiótico empírico intravenoso',g:'Antimicrobianos (por ejemplo, betalactámico más macrólido en la neumonía grave)',
  uso:'Infección bacteriana probable. En la sepsis y el choque séptico se administra en la primera hora, idealmente después de tomar hemocultivos, sin retrasar el inicio.',
  cuidado:'Pregunta siempre por alergias. Ajusta el esquema a la función renal, al foco probable y a la resistencia local.',
  q:'Ceftriaxone',src:['ssc2021','metlay2019']},
 {id:'asa',ints:['asa'],n:'Ácido acetilsalicílico',g:'Antiagregante plaquetario',
  uso:'Síndrome coronario agudo: dosis de carga masticada lo antes posible, salvo contraindicación.',
  cuidado:'No se usa con alergia al medicamento ni con sangrado activo. Evítalo en el dengue por el riesgo de sangrado.',
  q:'Aspirin',src:['esc_acs']},
 {id:'trombo',ints:['trombo'],n:'Alteplasa',g:'Trombolítico (activador tisular del plasminógeno)',
  uso:'Ataque cerebrovascular isquémico agudo dentro de las 4,5 horas desde el inicio de los síntomas, con TC simple sin hemorragia.',
  cuidado:'Contraindicada si hay hemorragia intracraneal, presión arterial por encima de 185/110 mmHg que no se controla, coagulopatía o plaquetas por debajo de 100 000. Haz una glucometría antes de decidir.',
  q:'Alteplase',src:['aha_stroke']},
 {id:'insulina',ints:['insulina'],n:'Insulina regular intravenosa en infusión',g:'Hipoglucemiante',
  uso:'Cetoacidosis diabética y estado hiperosmolar, una vez iniciados los líquidos.',
  cuidado:'Conoce el potasio antes de empezar: si está por debajo de 3,5 mmol/L, se repone primero. Controla la glucometría cada hora y el potasio con frecuencia.',
  q:'Insulin regular',src:['dka2024']},
 {id:'potasio',ints:['potasio'],n:'Cloruro de potasio intravenoso',g:'Electrolito',
  uso:'Hipopotasemia y mantenimiento del potasio durante el tratamiento de la cetoacidosis.',
  cuidado:'Nunca se aplica en bolo. Se diluye y se administra con bomba de infusión y monitoreo cardiaco. Revisa la función renal y la diuresis.',
  q:'Potassium chloride',src:['dka2024']},
 {id:'bicarb',ints:['bicarb'],n:'Bicarbonato de sodio intravenoso',g:'Alcalinizante',
  uso:'En la cetoacidosis solo se considera si el pH es menor de 7,0.',
  cuidado:'Con pH de 7,0 o más no mejora el desenlace y puede empeorar la hipopotasemia.',
  q:'Sodium bicarbonate',src:['dka2024']},
 {id:'mg',ints:['mg'],n:'Sulfato de magnesio intravenoso',g:'Anticonvulsivante en obstetricia',
  uso:'Prevención y tratamiento de la eclampsia en la preeclampsia con signos de severidad.',
  cuidado:'Vigila el reflejo patelar, la frecuencia respiratoria y la diuresis. Ten a mano gluconato de calcio como antídoto.',
  q:'Magnesium sulfate',src:['who_pe']},
 {id:'antihta',ints:['antihta'],n:'Antihipertensivos de acción rápida',g:'Labetalol intravenoso, hidralazina intravenosa o nifedipino oral',
  uso:'Hipertensión severa en el embarazo, con presión de 160/110 mmHg o más.',
  cuidado:'Baja la presión de forma gradual para no comprometer la perfusión de la placenta. El labetalol está contraindicado en el asma y en los bloqueos cardiacos. El nifedipino se da por vía oral, no sublingual.',
  q:'Labetalol',src:['who_pe']},
 {id:'cortico',ints:['cortico'],n:'Dexametasona intravenosa',g:'Corticoide',
  uso:'Maduración pulmonar fetal cuando hay riesgo de parto pretérmino entre las semanas 24 y 34, entre otras indicaciones.',
  cuidado:'No está indicada en el dengue. Eleva la glucemia.',
  q:'Dexamethasone',src:['who_preterm','dengue_col']},
 {id:'furo',ints:['furo'],n:'Furosemida intravenosa',g:'Diurético de asa',
  uso:'Sobrecarga de volumen y edema pulmonar.',
  cuidado:'Empeora la hipovolemia, por ejemplo en la fase crítica del dengue. No está indicada en la preeclampsia sin edema pulmonar. Produce hipopotasemia.',
  q:'Furosemide',src:['dengue_col','who_pe']},
 {id:'antic',ints:['antic'],n:'Anticoagulación plena',g:'Heparina no fraccionada o enoxaparina',
  uso:'Tromboembolia venosa, algunos síndromes coronarios y prevención de embolias según el riesgo del paciente.',
  cuidado:'En la fase aguda del ataque cerebrovascular isquémico aumenta el riesgo de transformación hemorrágica. Contraindicada con sangrado activo. Vigila las plaquetas y la función renal.',
  q:'Heparin',src:['aha_stroke']},
 {id:'noradr',ints:['noradr'],pg:1,n:'Norepinefrina en infusión',g:'Vasopresor',
  uso:'Primera elección en el choque séptico cuando la presión arterial media sigue por debajo de 65 mmHg a pesar de los líquidos.',
  cuidado:'Requiere bomba de infusión y monitoreo continuo. Puede iniciarse por una vena periférica mientras se consigue un acceso central. Vigila la extravasación.',
  q:'Norepinephrine',src:['ssc2021']},
 {id:'hidrocort',ints:['hidrocort'],pg:1,n:'Hidrocortisona intravenosa',g:'Corticoide',
  uso:'Choque séptico que necesita vasopresor de forma continua.',
  cuidado:'Produce hiperglucemia. No reemplaza los líquidos ni el antibiótico.',
  q:'Hydrocortisone',src:['ssc2021']},
 {id:'transf_plq',ints:['transf_plq'],pg:1,n:'Transfusión de plaquetas',g:'Hemoderivado',
  uso:'Sangrado activo con trombocitopenia, o antes de un procedimiento según el recuento.',
  cuidado:'En el dengue no se transfunden plaquetas de forma preventiva si no hay sangrado. Vigila las reacciones transfusionales.',
  q:'Platelet transfusion',src:['dengue_col','who_arbo']}
];
const vdNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function vdBotones(id,need){const t=VD_T[id];
  return VD_IR.map(r=>{const R=VD_RES[r.k];
    if(r.modo==='url')return `<a class="btn vd-ir" href="${esc(r.url(t,need))}" target="_blank" rel="noopener noreferrer" data-vd-ir="${r.k}">${esc(R.n)}</a>`;
    return `<a class="btn vd-ir vd-copia" href="${esc(R.u)}" target="_blank" rel="noopener noreferrer" data-vd-ir="${r.k}" data-vd-copia="${esc(r.q(t,need))}" title="Copia la búsqueda y abre ${esc(R.n)}">${esc(R.n)} <small>copia y pega</small></a>`;}).join('');}
function vdBusqueda(id,need){const t=VD_T[id];
  return `<div class="vd-eq"><span class="lbl">Ecuación de búsqueda</span><code class="vd-q" data-vd-eq>${esc(vdEq(t,need,'en'))}</code>
  <button class="btn vd-copiar" type="button" data-vd-copiar="${esc(vdEq(t,need,'en'))}">Copiar</button></div>
  <p class="small muted vd-nota">MEDLINE Complete y Scopus reciben la ecuación completa; MedicLatina y AccessMedicina, su versión en español: <code class="vd-q">${esc(vdEq(t,need,'es'))}</code>. ClinicalKey, DynaMed y Micromedex buscan mejor con pocas palabras.</p>
  <div class="vd-links">${vdBotones(id,need)}</div>`;}
function vdCard(v){
  const fuentes=v.src.map(k=>SRC[k]).filter(Boolean).map(s=>s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.k)}</a>`:esc(s.k)).join(', ');
  const need='dosis';
  return `<details class="vd-card" data-vd="${v.id}"><summary><span class="vd-n">${esc(v.n)}</span><span class="vd-g">${esc(v.g)}</span>${v.pg?'<span class="vd-pg">Posgrado</span>':''}</summary>
  <div class="vd-body"><p><b>Para qué se usa.</b> ${esc(v.uso)}</p><p><b>Precauciones.</b> ${esc(v.cuidado)}</p>
  <div class="vd-busca"><p class="vd-pregunta"><b>¿Qué necesitas buscar?</b></p>
  <div class="seg vd-need" role="group" aria-label="Qué necesitas buscar">${VD_NEED.map(n=>`<button type="button" data-vd-need="${n.id}" aria-pressed="${n.id===need}">${esc(n.n)}</button>`).join('')}</div>
  <div class="vd-out">${vdBusqueda(v.id,need)}</div></div>
  <p class="src">Fuente de la ficha: ${fuentes}.</p></div></details>`;}
/* Búsqueda libre: lo que el usuario escribe, sin ficha */
function vdLibre(q){const t=q.trim();if(t.length<3)return '';const e=encodeURIComponent(t),eq=/\s/.test(t)?`"${t}"`:t;
  const L=[['accessmedicina',VD_PX+'accessmedicina.proxyutp.elogim.com/searchresults.aspx?q='+e],['clinicalkey',VD_PX+'clinicalkey.proxyutp.elogim.com/#!/search/'+e],
   ['mediclatina',VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?direct=true&authtype=ip&db=lth&type=1&site=ehost-live&bquery='+encodeURIComponent(eq)],
   ['medline',VD_PX+'ebsco.proxyutp.elogim.com/login.aspx?direct=true&authtype=ip&db=mdc&type=1&site=ehost-live&bquery='+encodeURIComponent(eq)]];
  return `<div class="panel vd-libre"><p class="small"><b>Buscar "${esc(t)}" directamente en los recursos de la UTP.</b> Si el término está en español, empieza por AccessMedicina o MedicLatina.</p>
  <div class="vd-links">${L.map(([k,u])=>`<a class="btn vd-ir" href="${esc(u)}" target="_blank" rel="noopener noreferrer" data-vd-ir="${k}" data-vd-libre="${esc(t)}">${esc(VD_RES[k].n)}</a>`).join('')}
  <a class="btn vd-ir vd-copia" href="${esc(VD_RES.micromedex.u)}" target="_blank" rel="noopener noreferrer" data-vd-ir="micromedex" data-vd-copia="${esc(t)}" data-vd-libre="${esc(t)}">Micromedex <small>copia y pega</small></a></div></div>`;}
function vdRender(lista,cuenta,q){const t=vdNorm(q).trim();
  const vs=VD.filter(v=>!t||vdNorm(v.n+' '+v.g+' '+v.q+' '+v.uso).includes(t));
  $(lista).innerHTML=(vs.length?vs.map(vdCard).join(''):'<p class="small muted">No hay fichas con ese término.</p>')+vdLibre(q||'');
  if(cuenta)$(cuenta).textContent=`${vs.length} de ${VD.length} fichas`;}
function vdRecursos(){
  $('#vdRecursos').innerHTML=VD_GRUPOS.map(([t,d,ks])=>`<div class="panel vd-grupo"><h4>${esc(t)}</h4><p class="small muted">${esc(d)}</p><ul class="vd-ul">${ks.map(k=>{const r=VD_RES[k];return `<li><a href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${esc(r.n)}</a><span class="small muted">${esc(r.d)}</span></li>`;}).join('')}</ul></div>`).join('');}
// Consulta desde el turno: queda en el registro y llega al panel docente
function tuVadeConsulta(v){if(TU.started&&!TU.ended)tuLog(`Consulta del vademécum: ${v.n}.`);}
function vdToggle(e){const d=e.target;if(!d.matches||!d.matches('details.vd-card')||!d.open)return;const v=VD.find(x=>x.id===d.dataset.vd);if(v&&d.closest('#tuVade'))tuVadeConsulta(v);}
// Búsqueda en un recurso desde el turno: registro y panel docente
function tuVadeBusqueda(recurso,que,tema){if(TU.started&&!TU.ended)tuLog(`Busca en ${recurso}: ${tema} (${que}).`);}
function vdCopiar(txt){try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(txt).then(()=>true,()=>false);}catch(e){}
  return Promise.resolve(false);}
function vdClick(e){
  const nb=e.target.closest('[data-vd-need]');
  if(nb){const card=nb.closest('.vd-card');const need=nb.dataset.vdNeed;
    card.querySelectorAll('[data-vd-need]').forEach(x=>x.setAttribute('aria-pressed',String(x===nb)));
    card.querySelector('.vd-out').innerHTML=vdBusqueda(card.dataset.vd,need);return;}
  const cp=e.target.closest('[data-vd-copiar]');
  if(cp){vdCopiar(cp.dataset.vdCopiar).then(ok=>toast(ok?'Ecuación copiada':'Selecciona la ecuación y cópiala'));return;}
  const ir=e.target.closest('[data-vd-ir]');if(!ir)return;
  const R=VD_RES[ir.dataset.vdIr];
  if(ir.dataset.vdCopia!=null)vdCopiar(ir.dataset.vdCopia).then(ok=>toast(ok?`Búsqueda copiada: pégala en el buscador de ${R.n}`:`Escribe en ${R.n}: ${ir.dataset.vdCopia}`));
  if(ir.closest('#tuVade')){const card=ir.closest('.vd-card');
    if(card){const v=VD.find(x=>x.id===card.dataset.vd);const nb2=card.querySelector('[data-vd-need][aria-pressed="true"]');
      tuVadeBusqueda(R.n,nb2?nb2.textContent.toLowerCase():'',v.n);}
    else tuVadeBusqueda(R.n,'búsqueda libre',ir.dataset.vdLibre||'');}}
let vdPausa=false;
function tuVadeOpen(filtro){
  if(TU.level==='pre'&&TU.run&&!TU.ended){$('#tuPause').click();vdPausa=true;}
  $('#tuVadeNota').textContent=TU.started&&!TU.ended?(vdPausa?'En pregrado el turno queda en pausa mientras consultas.':(TU.run?'En posgrado el reloj sigue corriendo mientras consultas.':'El turno está en pausa.')):'Consulta las fichas antes de empezar el turno.';
  $('#tuVadeBuscar').value=filtro||'';vdRender('#tuVadeLista',null,filtro||'');$('#tuVade').hidden=false;$('#tuVadeBuscar').focus();}
function tuVadeClose(){$('#tuVade').hidden=true;if(vdPausa&&!TU.run&&!TU.ended)$('#tuPause').click();vdPausa=false;}
vdRender('#vdLista','#vdCuenta','');vdRecursos();
$('#vdBuscar').addEventListener('input',e=>vdRender('#vdLista','#vdCuenta',e.target.value));
$('#tuVadeBuscar').addEventListener('input',e=>vdRender('#tuVadeLista',null,e.target.value));
$('#vdLista').addEventListener('toggle',vdToggle,true);
$('#vdLista').addEventListener('click',vdClick);
$('#tuVadeLista').addEventListener('click',vdClick);
$('#tuVadeLista').addEventListener('toggle',vdToggle,true);
$$('[data-vade-open]').forEach(b=>b.addEventListener('click',()=>tuVadeOpen('')));
$('#tuVadeClose').addEventListener('click',tuVadeClose);
$('#tuVade').addEventListener('click',e=>{if(e.target.id==='tuVade')tuVadeClose();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#tuVade').hidden)tuVadeClose();});
$('#tuVadeTodo').addEventListener('click',()=>{tuVadeClose();});

$('#tuReader').addEventListener('click',e=>{if(e.target.id==='tuReader')$('#tuReader').hidden=true;});
function tuRxAnswer(normal,x,y){const r=TU.reader;if(!r)return;const R=RXINFO[r.img];const p=r.p;let ok;
  if(normal)ok=!R.find.length;else ok=R.find.some(f=>((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2<=1);
  $('#tuRxFb').textContent=(ok?'Correcto. ':'No es correcto. ')+R.txt;$('#tuRxFb').style.color=ok?'var(--ok)':'var(--bad)';
  const k='rx:'+r.img;if(!p.readRx)p.readRx={};if(!p.readRx[k]){p.readRx[k]=1;if(ok){tuPts(40,'Lectura correcta de la radiografía',p);}else tuPts(-10,'Lectura incorrecta de la radiografía',p);}}
$('#tuRxImg').addEventListener('click',e=>{const R=RXINFO[TU.reader.img];const b=e.target.getBoundingClientRect();const x=(e.clientX-b.left)/b.width*R.w,y=(e.clientY-b.top)/b.height*R.h;const m=$('#tuRxMark');m.style.left=((e.clientX-b.left)/b.width*100)+'%';m.style.top=((e.clientY-b.top)/b.height*100)+'%';m.hidden=false;tuRxAnswer(false,x,y);});
$('#tuRxNormal').onclick=()=>tuRxAnswer(true);
/* avatar 3D */
let tuV3Home=null;
function tuAvatar(p){if(!V3.ok){toast('El motor 3D no está disponible en esta vista');return;}
  const box=$('#tuAvatar');const v=document.querySelector('.v3d');if(!tuV3Home)tuV3Home={parent:v.parentElement,next:v.nextSibling};
  if(!box.hidden&&TU.avatar===p){tuAvatarClose();return;}
  box.appendChild(v);box.hidden=false;TU.avatar=p;$('#tuAvatarBtn').textContent='Cerrar el avatar';
  if(V3.sex!==p.c.sex)v3SetSex(p.c.sex);V3.showSkin=true;$('#v3Skin').setAttribute('aria-pressed','true');V3.state={organ:'none',lesion:null,sev:0,rev:1};v3SetMode('body');
  $('#tuAvatarState').textContent=p.avatarOk?'Ya identificaste el órgano de este paciente.':'Toca en el avatar el órgano que explica el cuadro.';
  V3.pickHook=org=>{if(TU.avatar!==p)return;const ok=p.c.organs.includes(org);const name=orgName(org);
    if(!p.avatarTried){p.avatarTried=1;if(ok){tuPts(50,`Avatar: órgano correcto (${name})`,p);P.avatarOk=(P.avatarOk||0)+1;save();if(P.avatarOk>=3)badge('avatar');}else tuPts(-10,`Avatar: ${name} no es el órgano afectado`,p);}
    if(ok){p.avatarOk=true;const les=p.c.lesion;V3.state={organ:p.c.organs[0],lesion:les,sev:les?Math.min(1,tuStage(p)/3+0.01):0,rev:1};V3.mode='organ';$$('#v3Mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m==='organ')));v3Apply();
      $('#tuAvatarState').textContent=`${name}: ${les?'así se ve la lesión en el estadio actual del paciente.':(p.c.id==='cad'?'en la diabetes tipo 1 el daño es de las células beta del páncreas endocrino; la cetoacidosis es una alteración metabólica sin lesión macroscópica característica.':'la lesión principal está en la placenta y el endotelio; en el síndrome HELLP también se compromete el hígado.')}`;}
    else $('#tuAvatarState').textContent=`${name} no explica este cuadro. Intenta de nuevo.`;};}
function tuAvatarClose(){const box=$('#tuAvatar');const v=box.querySelector('.v3d');if(v&&tuV3Home)tuV3Home.parent.insertBefore(v,tuV3Home.next);box.hidden=true;TU.avatar=null;V3.pickHook=null;$('#tuAvatarBtn').textContent='Señalar el órgano afectado en el avatar';renderModel();}
/* interfaz */
function tuBuildButtons(){const pg=TU.level==='pos';
  $('#tuTests').innerHTML=TU_TESTS.filter(t=>pg||!t.pg).map(t=>`<button class="btn" type="button" data-test="${t.id}">${esc(t.n)}<small>${t.m} min</small></button>`).join('');
  $('#tuInterv').innerHTML=TU_INT.filter(t=>pg||!t.pg).map(t=>`<button class="btn" type="button" data-int="${t.id}">${esc(t.n)}</button>`).join('');
  $('#tuDx').innerHTML='<option value="">Elige un diagnóstico…</option>'+TU_DX.slice().sort((a,b)=>a[1].localeCompare(b[1],'es')).map(d=>`<option value="${d[0]}">${esc(d[1])}</option>`).join('');
  $('#tuConsult').innerHTML=TU_CONS.map(c=>`<button class="btn" type="button" data-cons="${c.id}">${esc(c.n)}<small></small></button>`).join('');
  $('#tuDispoBtns').innerHTML=TU_DISPO.map(d=>`<button class="btn" type="button" data-dispo="${d[0]}">${esc(d[1])}</button>`).join('');
  $('#tuEquip').innerHTML=TU_EQUIP.map(e=>`<span data-eq="${esc(e)}">${esc(e)}</span>`).join('');}
function cur(){return TU.sel!=null?TU.pats[TU.sel]:null;}
$('#tuTests').addEventListener('click',e=>{const b=e.target.closest('[data-test]');const p=cur();if(!b||!p||p.state==='muerto'||p.state==='egresado')return;if(p.triage==null){toast('Primero clasifica al paciente con el triage');return;}tuOrderTest(p,b.dataset.test);});
$('#tuInterv').addEventListener('click',e=>{const b=e.target.closest('[data-int]');const p=cur();if(!b||!p||p.state==='muerto'||p.state==='egresado')return;if(p.triage==null){toast('Primero clasifica al paciente con el triage');return;}tuOrderInt(p,b.dataset.int);});
$('#tuConsult').addEventListener('click',e=>{const b=e.target.closest('[data-cons]');const p=cur();if(!b||!p)return;tuConsult(p,b.dataset.cons);});
$('#tuDispoBtns').addEventListener('click',e=>{const b=e.target.closest('[data-dispo]');const p=cur();if(b&&p)tuDispo(p,b.dataset.dispo);});
$('#tuDxGo').onclick=()=>{const p=cur();const v=$('#tuDx').value;if(!p||!v)return;tuDiagnose(p,v);};
$$('#tuTriage button').forEach(b=>b.onclick=()=>{const p=cur();if(p)tuSetTriage(p,+b.dataset.t);});
$('#tuBoard').addEventListener('click',e=>{const b=e.target.closest('.tu-bed');if(!b)return;TU.sel=+b.dataset.i;if(TU.avatar)tuAvatarClose();tuRender(true);});
$('#tuNurse').addEventListener('click',e=>{const b=e.target.closest('[data-give]');const p=cur();if(!b||!p)return;const o=p.orders[+b.dataset.give];if(o&&!o.given)tuGive(p,o,false);});
$('#tuLab').addEventListener('click',e=>{const b=e.target.closest('[data-rx]');const p=cur();if(b&&p)tuOpenRx(p,b.dataset.rx);const c=e.target.closest('[data-crit]');if(c&&p){const r=p.tests[c.dataset.crit];if(r&&!r.reported){r.reported=true;const fast=TU.t-r.ready<=5;tuPts(fast?20:5,`Laboratorio reporta un valor crítico al médico${fast?' a tiempo':''}`,p);tuRender();}}});
$('#tuAvatarBtn').onclick=()=>{const p=cur();if(p)tuAvatar(p);};
$$('#tuLevel button').forEach(b=>b.onclick=()=>{if(TU.run&&!TU.ended){toast('Termina o reinicia el turno para cambiar de nivel');return;}TU.level=b.dataset.l;$$('#tuLevel button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#tuAuto').checked=TU.level==='pre';});
$$('#tuSpeed button').forEach(b=>b.onclick=()=>{TU.speed=+b.dataset.v;$$('#tuSpeed button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('#tuStart').onclick=()=>{if(TU.avatar)tuAvatarClose();tuStartTurn();$('#tuStart').textContent='Reiniciar turno';};
$('#tuPause').onclick=()=>{if(TU.ended)return;TU.run=!TU.run;$('#tuPause').textContent=TU.run?'Pausa':'Continuar';};
$$('[data-gm]').forEach(b=>b.onclick=()=>{if(!TU.started)return;const k=b.dataset.gm;const p=cur();
  if(k==='sys'){TU.sys=false;tuLog('Docente: cae el sistema de órdenes. Toda orden se da en voz alta y se confirma con lectura de vuelta.',false);}
  if(k==='sysok'){TU.sys=true;tuLog('Docente: el sistema de órdenes se restablece.',true);}
  if(k==='arrive'&&TU.spare&&TU.spare.length){TU.queue.push({c:TU.spare.shift(),at:TU.t});tuLog('Docente: llega un paciente adicional.',false);}
  if(k==='icu'){TU.icu=0;tuLog('Docente: se ocupó la última cama de UCI.',false);}
  if(k==='worse'&&p&&p.state!=='muerto'){p.s=Math.min(2.6,p.s+0.9);tuLog(`Docente: deterioro súbito del paciente de la cama ${p.bed}.`,false);}
  tuRender();});
let tuLast=null,tuRenderTick=0;
function tuLoop(ts){requestAnimationFrame(tuLoop);if(tuLast==null)tuLast=ts;const el=Math.min(0.25,(ts-tuLast)/1000);tuLast=ts;
  if(TU.run&&!TU.ended){const dt=el*TU.speed;const n=Math.max(1,Math.ceil(dt/0.25));for(let i=0;i<n;i++)tuTick(dt/n);}
  tuRenderTick+=el;if(tuRenderTick>0.25){tuRenderTick=0;if(TU.started)tuRender();}
  if(TU.started&&!$('#tuMain').hidden)tuDrawMon(ts);}
function tuRender(full){const ps=TU.pats;$('#tuClock').textContent=tuFmt(TU.t);$('#tuPts').textContent=Math.round(TU.pts);
  $('#tuCount').textContent=`${ps.filter(p=>p.state==='egresado').length} de ${ps.length} salvados`;
  $('#tuIcu').textContent=TU.icu;$('#tuSys').textContent=TU.sys?'En línea':'Caído: órdenes verbales';$('#tuSys').style.color=TU.sys?'':'var(--bad)';
  $('#tuBoard').innerHTML=ps.map((p,i)=>{const v=tuVitals(p);const nw=tuNews(v,p.done.o2);const sev=Math.min(1,p.s/3);const col=p.s<1?'var(--ok)':(p.s<2?'var(--warn)':'var(--bad)');
    const st=p.state==='muerto'?'Fallecido':(p.state==='egresado'?p.outcome:(p.state==='estable'?'Estable: definir destino':(p.triage==null?'Sin triage':(p.treating?'Respondiendo al tratamiento':['Estadio leve','Moderado','Grave','Crítico'][tuStage(p)]))));
    return `<button type="button" class="tu-bed ${p.state==='muerto'?'dead':''} ${p.state==='egresado'?'done':''}" data-i="${i}" aria-pressed="${i===TU.sel}"><span class="bn">Cama ${p.bed}${p.triage?' · triage '+['I','II','III','IV','V'][p.triage-1]:''}</span><b>${esc(p.c.who.split(',')[0])}</b><span class="small muted">${esc(p.c.bed)}</span>
      <span class="vs">FC ${Math.round(v[0])} · PA ${Math.round(v[1])}/${Math.round(v[2])} · SpO₂ ${Math.round(v[4])} % · NEWS2 ${nw}</span><span class="sev" aria-hidden="true"><i data-css="width:${Math.max(4,sev*100)}%;background:${col}"></i></span><span class="st" data-css="color:${col}">${esc(st)}</span></button>`;}).join('')||'<p class="small muted">Aún no hay pacientes.</p>';
  const p=cur();if(!p)return;const v=tuVitals(p);const nw=tuNews(v,p.done.o2);const stg=tuStage(p);
  $('#tuPtName').textContent=`Cama ${p.bed} · ${p.c.bed}`;$('#tuPtWho').textContent=p.c.who;$('#tuPtCc').textContent=p.c.cc;$('#tuPtHx').textContent=p.c.hx;$('#tuPtExam').textContent=p.c.exam[Math.min(3,stg)];
  $('#tuPtTriage').textContent=p.triage?'Triage '+['I','II','III','IV','V'][p.triage-1]:'Sin triage';$('#tuPtTriage').className='pill '+(p.triage?'info':'warn');
  $('#tuPtNews').textContent='NEWS2 '+nw;$('#tuPtNews').className='pill '+(nw>=7?'bad':(nw>=5?'warn':'ok'));
  $('#tuPtHint').textContent=TU.level==='pre'&&p.state!=='muerto'?p.c.tip[Math.min(2,stg)]+(nw>=5?' NEWS2 de 5 o más indica respuesta urgente.':''):'';
  $('#tuMonName').textContent=`Cama ${p.bed}`;$('#tuMonRhythm').textContent=p.c.id==='acv'?'Fibrilación auricular':(p.c.id==='iam'&&stg>=1?'Elevación del ST':(stg>=3?'Paro':'Ritmo sinusal'));
  const pam=Math.round((v[1]+2*v[2])/3);
  $('#tuVitals').innerHTML=[['FC','lpm',Math.round(v[0]),'var(--ecg)'],['PA','mmHg',Math.round(v[1])+'/'+Math.round(v[2]),'var(--pa)'],['PAM','mmHg',pam,pam<65?'#FF6B70':'var(--pa)'],['SpO₂','%',Math.round(v[4]),'var(--spo2)'],['FR','rpm',Math.round(v[3]),'#C9D4E2'],['T','°C',v[5].toFixed(1).replace('.',','),'var(--temp)'],['ACVPU','',AVPU[v[6]],'#C9D4E2']].map(x=>`<div class="vt" data-css="color:${x[3]}"><span>${x[0]} ${x[1]}</span><b class="${x[0]==='ACVPU'||x[0]==='PA'?'sm':''}">${x[2]}</b></div>`).join('');
  $('#tuTriageBox').style.display=p.triage==null?'':'none';
  $$('#tuTests [data-test]').forEach(b=>b.setAttribute('aria-pressed',String(!!p.tests[b.dataset.test])));
  $$('#tuInterv [data-int]').forEach(b=>b.setAttribute('aria-pressed',String(!!p.ints[b.dataset.int])));
  $('#tuDxGo').disabled=!!p.dx;$('#tuDx').disabled=!!p.dx;if(p.dx)$('#tuDx').value=p.dx;
  $('#tuDispo').hidden=p.state!=='estable';
  $('#tuNurse').innerHTML=p.orders.map((o,i)=>{const it=TU_INT.find(x=>x.id===o.id);return `<div class="tu-item"><span>${esc(it.n)}</span>${o.given?'<span class="small e-0b3aaee">Administrado</span>':`<button class="btn" type="button" data-give="${i}">Administrar${TU.sys?'':' (confirmar en voz alta)'}</button>`}</div>`;}).join('')||'<p class="small muted">Sin órdenes pendientes.</p>';
  $$('#tuEquip [data-eq]').forEach(s=>{const e=s.dataset.eq;const on=e==='Monitor multiparámetro'||e==='Pulsioxímetro'||e==='Tensiómetro'||(e==='Glucómetro'&&p.tests.gluc)||(e==='Electrocardiógrafo'&&p.tests.ecg)||(e==='Bomba de infusión'&&(p.done.noradr||p.done.insulina||p.done.mg||p.done.liq_dengue))||(e==='Ecógrafo POCUS'&&p.tests.eco)||(e==='Bolsa autoinflable (Ambu)'&&p.done.iot)||((e==='Desfibrilador (DEA)'||e==='Carro de paro')&&tuStage(p)>=3);s.classList.toggle('on',!!on);});
  $('#tuLab').innerHTML=Object.keys(p.tests).map(id=>{const r=p.tests[id];const pr=Math.min(100,(TU.t-r.t)/(r.ready-r.t)*100);const crit=r.done&&r.stage>=1&&p.c.key.includes(id);
    return `<div class="tu-item ${crit?'crit':''}"><b>${esc(tuTestName(id))}</b>${r.done?`<span>${esc(r.txt.label)}</span>${r.txt.img?`<button class="btn" type="button" data-rx="${r.txt.img}">Abrir la placa</button>`:''}${crit&&!r.reported?`<button class="btn" type="button" data-crit="${id}">Reportar valor crítico</button>`:''}`:`<span class="bar"><i data-css="width:${pr}%"></i></span><span class="small muted">Listo en ${Math.max(0,Math.ceil(r.ready-TU.t))} min</span>`}</div>`;}).join('')||'<p class="small muted">Sin pruebas solicitadas.</p>';
  $$('#tuConsult [data-cons]').forEach(b=>{const s=TU.cons[b.dataset.cons+':'+p.bed];b.querySelector('small').textContent=s==null?'':(s==='ok'?'aceptada':(typeof s==='object'?'en trámite':s));b.setAttribute('aria-pressed',String(s!=null));});
  $('#tuSbar').textContent=tuSbar(p);
  tuStep();
}
/* paso siguiente para pregrado: la franja guía dice qué hacer y con qué botón */
function tuStep(){if(TU.level!=='pre'||!TU.run||TU.ended)return;const p=cur();if(!p)return;let k,t;const B=`Cama ${p.bed}`;
  const crit=Object.keys(p.tests).find(id=>{const r=p.tests[id];return r.done&&r.stage>=1&&p.c.key.includes(id)&&!r.reported;});
  const rx=Object.keys(p.tests).find(id=>{const r=p.tests[id];return r.done&&r.txt&&r.txt.img&&!(p.readRx&&p.readRx['rx:'+r.txt.img]);});
  const nTests=Object.keys(p.tests).length,nDone=Object.values(p.tests).filter(r=>r.done).length;
  if(p.state==='muerto'){k='dead';t=`${B}: el paciente falleció. Toca otra cama en el tablero para seguir el turno.`;}
  else if(p.state==='egresado'){k='out';t=`${B} resuelta. Toca otra cama en el tablero; el turno termina cuando todos tengan destino.`;}
  else if(p.triage==null){k='tri';t=`Paso 1 de 9 · Clasifica. ${B}: mira los signos vitales y el NEWS2 y pulsa una categoría en «Triage de llegada» (I es la más urgente; V, la menos).`;}
  else if(!nTests){k='test';t=`Pasos 2 y 3 de 9 · Evalúa y pide pruebas. ${B}: lee el examen físico (ABCDE) y el monitor; luego pide en «Pruebas» los exámenes que sugiere la pista clínica. Cada prueba tarda; las que no corresponden restan puntos.`;}
  else if(crit){k='crit'+crit;t=`Laboratorio · ${B}: hay un valor crítico. Pulsa «Reportar valor crítico» ya (+20 si es a tiempo).`;}
  else if(rx){k='rx'+rx;t=`Paso 5 de 9 · Lee la placa. ${B}: pulsa «Abrir la placa» y toca el hallazgo principal; si la ves normal, pulsa «Sin hallazgos».`;}
  else if(!p.dx&&!nDone){k='wait'+(p.avatarTried?'a':'');t=p.avatarTried?`${B}: espera los resultados; la barra de «Laboratorio e imágenes» muestra cuánto falta.`:`Paso 4 de 9 · Señala el órgano. ${B}: mientras llegan los resultados, pulsa «Señalar el órgano afectado en el avatar» y toca el órgano que crees enfermo.`;}
  else if(!p.dx){k='dx';t=`Paso 6 de 9 · Diagnostica. ${B}: con los resultados, elige una opción en «Diagnóstico» y pulsa «Confirmar diagnóstico».`;}
  else if(!p.treating){const band=p.s<1.5?0:1;const cons=new Set();
    if(p.c.need[band].some(r=>r.split('|').includes('uci'))&&TU.cons['uci:'+p.bed]!=='ok')cons.add('uci');
    for(const o of p.orders){const it=TU_INT.find(x=>x.id===o.id);if(!o.given&&it&&it.need&&TU.cons[it.need+':'+p.bed]!=='ok')cons.add(it.need);}
    const wait=[...cons].filter(c=>typeof TU.cons[c+':'+p.bed]==='object');const ask=[...cons].filter(c=>TU.cons[c+':'+p.bed]==null);
    const nm=c=>'«'+TU_CONS.find(x=>x.id===c).n+'»';
    const pend=p.orders.some(o=>!o.given);const testsPend=Object.values(p.tests).some(r=>!r.done);
    const lastG=Math.max(-1e9,...p.orders.filter(o=>o.given).map(o=>typeof p.done[o.id]==='number'?p.done[o.id]:-1e9));const fresh=!pend&&p.orders.length&&TU.t-lastG<6;
    k='tx'+p.orders.length+(pend?'p':'')+(fresh?'f':'')+ask.join()+'/'+wait.join();
    t=`Paso 7 de 9 · Trata. ${B}: `+(p.orders.length?(pend&&!ask.length&&!wait.length?($('#tuAuto').checked?'enfermería está administrando tus órdenes; en un momento verás si el paciente responde.':'pulsa «Administrar» en «Órdenes por administrar».'):(pend?'hay órdenes en espera.':fresh?'tratamiento administrado. Espera unos minutos para ver si el paciente responde.':'el paciente aún no responde: falta parte del tratamiento'+(testsPend?' o una prueba en curso':'')+'. Revisa la pista clínica y ordena lo que falte en «Intervenciones».')):`ordena el tratamiento en «Intervenciones» siguiendo la pista clínica${$('#tuAuto').checked?'; enfermería lo administra sola':' y luego pulsa «Administrar» en «Órdenes por administrar»'}.`)
      +(ask.length?` Necesitas que acepte ${ask.map(nm).join(' y ')}: pídelo en «Enlace interconsultas».`:'')+(wait.length?` ${wait.map(nm).join(' y ')} está revisando el caso; acepta en unos minutos.`:'')+(p.orders.length?'':' Las intervenciones dañinas restan puntos.');}
  else if(p.state!=='estable'){k='resp';t=`Paso 8 de 9 · Estabiliza. ${B} responde al tratamiento. Espera a que diga «Estable»${TU.pats.some(q=>q!==p&&q.state!=='muerto'&&q.state!=='egresado')?' y, mientras tanto, atiende la otra cama':''}.`;}
  else{k='dispo';t=`Paso 9 de 9 · Define el destino. ${B} está estable: elige a dónde va en «Paciente estable: define el destino».`;}
  const wait=TU.pats.find(q=>q!==p&&q.triage==null&&q.state!=='muerto');if(wait&&k!=='tri'){k+='w'+wait.bed;t+=` Ojo: la cama ${wait.bed} espera triage; tócala en el tablero.`;}
  const key=p.bed+':'+k;if(TU.stepKey!==key){TU.stepKey=key;tuCoach(t);}}
function tuDrawMon(ts){const cv=$('#tuEcg');const p=cur();if(!p)return;const dpr=window.devicePixelRatio||1;const W=520,H=190;const cw=cv.clientWidth||W;if(cv.width!==Math.round(cw*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(cw*H/W*dpr);}
  const c=cv.getContext('2d');c.setTransform(cv.width/W,0,0,cv.height/H,0,0);c.fillStyle=css('--mon-bg');c.fillRect(0,0,W,H);c.strokeStyle=css('--mon-grid');c.lineWidth=1;
  for(let x=0;x<=W;x+=26){c.beginPath();c.moveTo(x+.5,0);c.lineTo(x+.5,H);c.stroke();}for(let y=0;y<=H;y+=24){c.beginPath();c.moveTo(0,y+.5);c.lineTo(W,y+.5);c.stroke();}
  const v=tuVitals(p);const stg=tuStage(p);const hr=Math.max(30,v[0]);const beat=60/hr;const t0=reduce?0:ts/1000;const st=p.c.id==='iam'&&stg>=1?0.3:0;const irr=p.c.id==='acv';const dead=stg>=3;
  const draw=(base,amp,col,fn)=>{c.strokeStyle=col;c.lineWidth=2;c.beginPath();for(let px=0;px<=W;px++){const t=t0-4+px/W*4;let ph=((t%beat)+beat)%beat/beat;if(irr){const k=Math.floor(t/beat);ph=((t+0.18*Math.sin(k*2.3))%beat+beat)%beat/beat;}const y=base-fn(ph,t)*amp;if(px===0)c.moveTo(px,y);else c.lineTo(px,y);}c.stroke();};
  if(dead){draw(70,30,css('--ecg'),(ph,t)=>0.6*Math.sin(t*38)+0.3*Math.sin(t*61));}
  else draw(75,60,css('--ecg'),ph=>beatShape(ph,st));
  draw(160,22,css('--spo2'),ph=>dead?0:Math.max(0,Math.sin(Math.PI*Math.min(1,ph*2.2)))*0.9-0.2);}
function tuEnd(){if(TU.ended)return;TU.ended=true;TU.run=false;$('#tuPause').disabled=true;
  for(const p of TU.pats)if(p.state!=='muerto'&&p.state!=='egresado'){p.outcome=p.state==='estable'?'Estable, sin destino definido':'Sin resolver al cierre del turno';}
  const saved=TU.pats.filter(p=>p.state==='egresado').length,dead=TU.pats.filter(p=>p.state==='muerto').length;
  tuLog(`Fin del turno: ${saved} salvados, ${dead} fallecidos. Puntos: ${Math.round(TU.pts)}.`,true);tuCoach('Fin del turno. Revisa la junta clínico-patológica más abajo.');
  P.turnos=(P.turnos||[]);P.turnos.push({team:($('#tuTeam').value||'Equipo').slice(0,24),level:TU.level,pts:Math.round(TU.pts),saved,n:TU.pats.length});P.turnos.sort((a,b)=>b.pts-a.pts);P.turnos=P.turnos.slice(0,20);save();
  addXP(Math.max(10,Math.round(TU.pts/10)),'turno de urgencias');if(!dead&&TU.pats.length)badge('turno');tuDebrief();}
function tuDebrief(){$('#tuDebrief').hidden=false;const cv=$('#tuDebCv');const dpr=window.devicePixelRatio||1;const W=760,H=240;const cw=cv.clientWidth||W;cv.width=Math.round(cw*dpr);cv.height=Math.round(cw*H/W*dpr);
  const c=cv.getContext('2d');c.setTransform(cv.width/W,0,0,cv.height/H,0,0);c.fillStyle=css('--mon-bg');c.fillRect(0,0,W,H);const L=50,T=12,pw=W-L-12,ph=H-T-30;const tmax=Math.max(60,TU.t);
  c.font='11px Noto Sans Mono, monospace';c.fillStyle='#93A3B6';c.strokeStyle='#ffffff14';
  ['Leve','Moderado','Grave','Crítico'].forEach((n,i)=>{const y=T+ph-(i/3)*ph;c.beginPath();c.moveTo(L,y);c.lineTo(L+pw,y);c.stroke();c.textAlign='right';c.fillText(n,L-4,y+4);});
  for(let i=0;i<=6;i++){const t=tmax*i/6;c.textAlign='center';c.fillText(tuFmt(t),L+pw*i/6,H-10);}
  const cols=['#F4C54E','#7FB2FF','#6FD3A6','#F08A7E','#C9A2FF','#FFFFFF'];
  TU.pats.forEach((p,i)=>{c.strokeStyle=cols[i%6];c.lineWidth=2.5;c.beginPath();p.hist.forEach((h,k)=>{const x=L+h[0]/tmax*pw,y=T+ph-Math.min(3,h[1])/3*ph;if(!k)c.moveTo(x,y);else c.lineTo(x,y);});c.stroke();c.fillStyle=cols[i%6];c.textAlign='left';c.fillText('Cama '+p.bed,L+8+i*80,T+12);});
  $('#tuDebRows').innerHTML=TU.pats.map(p=>{const g=p.c.goals.map(x=>`${x.label}: ${p.goals[x.id]==='ok'?'cumplida':(p.goals[x.id]?'tarde o no':'no')}`).join('; ');const dx=TU_DX.find(d=>d[0]===p.c.dx)[1];
    return `<tr><td>Cama ${p.bed}<br><span class="small muted">${esc(p.c.who)}</span></td><td>${p.triage?['I','II','III','IV','V'][p.triage-1]:'–'} <span class="small muted">(correcto: ${['I','II','III','IV','V'][p.c.triage-1]})</span></td><td>${esc(dx)}${p.dxOk?'':' <span class="small e-83ef854">(no confirmado)</span>'}<br><span class="src">${esc(p.c.src)}</span></td><td class="small">${esc(g)}</td><td>${esc(p.outcome||'')}</td><td class="mono">${Math.round(p.pts)}</td><td><button class="btn" type="button" data-see3d="${p.bed}">Ver en 3D</button></td></tr>`;}).join('');
  $('#tuBoardRows').innerHTML=(P.turnos||[]).map(r=>`<tr><td>${esc(r.team)}</td><td>${r.level==='pos'?'Posgrado':'Pregrado'}</td><td class="mono">${r.pts}</td><td>${r.saved} de ${r.n}</td></tr>`).join('');}
$('#tuDebRows').addEventListener('click',e=>{const b=e.target.closest('[data-see3d]');if(!b)return;const p=TU.pats.find(x=>x.bed===+b.dataset.see3d);if(!p)return;if(TU.avatar)tuAvatarClose();
  if(V3.sex!==p.c.sex)v3SetSex(p.c.sex);S.organ=p.c.organs[0];fillDisSel();renderOrganChips();V3.mode='organ';$$('#v3Mode button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.m==='organ')));
  const stg=Math.max(p.maxStage,tuStage(p));setTimeout(()=>{V3.state={organ:p.c.organs[0],lesion:p.c.lesion,sev:p.c.lesion?Math.max(1,Math.min(3,stg))/3:0,rev:1};v3Apply();$('#organCaption').textContent=`${orgName(p.c.organs[0])} del paciente de la cama ${p.bed} en el estadio máximo que alcanzó (${['leve','moderado','grave','crítico'][Math.min(3,stg)]}). Representación didáctica.`;},300);
  document.getElementById('modelo').scrollIntoView({behavior:reduce?'auto':'smooth'});});
requestAnimationFrame(tuLoop);

/* ================= Recorrido guiado (motor común de la colección BIC) ================= */
const BicTour=(function(){
  let S=null;
  const RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const owlSvg=()=>{const o=document.querySelector('.owl svg');if(!o)return '';const c=o.cloneNode(true);c.setAttribute('viewBox','20 0 460 285');c.removeAttribute('role');c.setAttribute('aria-hidden','true');c.removeAttribute('aria-label');return c.outerHTML;};
  const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
  function target(st){let el=null;try{el=typeof st.el==='function'?st.el():st.el?document.querySelector(st.el):null;}catch(e){el=null;}return vis(el)?el:null;}
  function open(cfg){close(false);const root=document.createElement('div');root.className='bt-root';
    root.innerHTML=`<div class="bt-shield"></div><div class="bt-spot off"></div><div class="bt-pop" role="dialog" aria-modal="true" aria-labelledby="btT" aria-describedby="btB"><button class="bt-x" type="button" aria-label="Cerrar el recorrido">×</button><div class="bt-hd"><div class="bt-owl">${owlSvg()}</div><div><span class="bt-n" id="btN"></span><h3 id="btT"></h3></div></div><div id="btB"></div><div class="bt-ft"><div class="bt-dots" aria-hidden="true"></div><button class="bt-prev" type="button">Atrás</button><button class="bt-next" type="button">Siguiente</button></div></div>`;
    document.body.appendChild(root);document.body.classList.add('bt-on');
    S={cfg,i:0,root,spot:root.querySelector('.bt-spot'),pop:root.querySelector('.bt-pop'),el:null,back:document.activeElement,raf:null};
    root.querySelector('.bt-x').onclick=()=>close(false);
    root.querySelector('.bt-prev').onclick=()=>go(S.i-1);
    root.querySelector('.bt-next').onclick=()=>{if(S.i>=S.cfg.steps.length-1)close(true);else go(S.i+1);};
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(false);}else if(e.key==='ArrowRight'){e.preventDefault();root.querySelector('.bt-next').click();}else if(e.key==='ArrowLeft'&&S.i>0){e.preventDefault();go(S.i-1);}
      else if(e.key==='Tab'){const f=[...S.pop.querySelectorAll('button:not([disabled])')];const a=f.indexOf(document.activeElement);if(e.shiftKey&&a<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&a===f.length-1){e.preventDefault();f[0].focus();}}});
    window.addEventListener('resize',onMove);window.addEventListener('scroll',onMove,true);
    go(0);}
  function onMove(){if(!S)return;cancelAnimationFrame(S.raf);S.raf=requestAnimationFrame(place);}
  function go(i){if(!S)return;const st=S.cfg.steps[i];if(!st)return;S.i=i;
    try{if(st.before)st.before();}catch(e){}
    const n=S.cfg.steps.length;S.root.querySelector('#btN').textContent=`Paso ${i+1} de ${n}`;
    S.root.querySelector('#btT').textContent=st.title;
    S.root.querySelector('#btB').innerHTML=st.html;
    S.root.querySelector('.bt-dots').innerHTML=S.cfg.steps.map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('');
    S.root.querySelector('.bt-prev').disabled=i===0;
    const nx=S.root.querySelector('.bt-next');nx.textContent=i===n-1?(S.cfg.doneLabel||'¡A jugar!'):'Siguiente';nx.classList.toggle('go',i===n-1);
    setTimeout(()=>{if(!S)return;S.el=target(st);
      if(S.el){const r=S.el.getBoundingClientRect();const fits=r.top>=70&&r.bottom<=window.innerHeight-20;if(!fits){const tall=r.height>window.innerHeight*0.55;const y=tall?r.top+window.scrollY-96:r.top+window.scrollY-(window.innerHeight-r.height)/2;window.scrollTo({top:Math.max(0,y),behavior:RM?'auto':'smooth'});}}
      place();setTimeout(place,RM?0:420);nx.focus({preventScroll:true});},st.wait||60);}
  function place(){if(!S)return;const pop=S.pop,spot=S.spot,vw=window.innerWidth,vh=window.innerHeight,m=12;
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    if(!S.el||!vis(S.el)){spot.classList.add('off');spot.style.cssText=`left:${vw/2}px;top:${vh/2}px;width:0;height:0`;pop.style.left=Math.max(m,(vw-pw)/2)+'px';pop.style.top=Math.max(m,(vh-ph)/2)+'px';return;}
    spot.classList.remove('off');const r=S.el.getBoundingClientRect(),pad=8;
    const L=Math.max(4,r.left-pad),T=Math.max(4,r.top-pad),W=Math.min(vw-8,r.right+pad)-L,H=Math.min(vh-8,r.bottom+pad)-T;
    spot.style.left=L+'px';spot.style.top=T+'px';spot.style.width=Math.max(0,W)+'px';spot.style.height=Math.max(0,H)+'px';
    let top,left=Math.min(vw-pw-m,Math.max(m,r.left+r.width/2-pw/2));
    if(T+H+ph+m*2<=vh)top=T+H+m;else if(T-ph-m>=m)top=T-ph-m;
    else{top=vh-ph-m;if(r.right+pw+m*2<=vw)left=r.right+m;else if(r.left-pw-m>=m)left=r.left-pw-m;}
    pop.style.left=left+'px';pop.style.top=Math.max(m,top)+'px';}
  function close(done){if(!S)return;const s=S;S=null;window.removeEventListener('resize',onMove);window.removeEventListener('scroll',onMove,true);s.root.remove();document.body.classList.remove('bt-on');
    try{localStorage.setItem(s.cfg.key,'1');}catch(e){}
    try{if(done&&s.cfg.onDone)s.cfg.onDone();if(s.cfg.onClose)s.cfg.onClose(done);}catch(e){}
    if(s.back&&s.back.focus)try{s.back.focus({preventScroll:true});}catch(e){}}
  function invite(cfg){let seen=null;try{seen=localStorage.getItem(cfg.key);}catch(e){}if(seen)return;
    setTimeout(()=>{if(S||document.querySelector('.bt-invite'))return;const d=document.createElement('div');d.className='bt-invite';d.setAttribute('role','dialog');d.setAttribute('aria-label','Invitación al recorrido guiado');
      d.innerHTML=`<b>${cfg.inviteTitle||'¿Primera vez aquí?'}</b><p>${cfg.inviteText||'Te muestro cómo se juega en un minuto.'}</p><div class="row"><button class="y" type="button">Muéstrame</button><button class="n" type="button">Ahora no</button></div>`;
      document.body.appendChild(d);d.querySelector('.y').onclick=()=>{d.remove();open(cfg);};d.querySelector('.n').onclick=()=>{d.remove();try{localStorage.setItem(cfg.key,'1');}catch(e){}};},cfg.inviteDelay||1800);}
  return {open,close,invite,get active(){return !!S;}};
})();

/* ---------- Recorrido guiado del Turno de urgencias ---------- */
{const mob=()=>window.innerWidth<=860;
const practice=()=>{const m=document.getElementById('tuMain');const started=m&&m.hidden;if(started)document.getElementById('tuStart').click();
  setTimeout(()=>{const pb=document.getElementById('tuPause');if(pb&&!pb.disabled&&pb.textContent.trim()==='Pausa')pb.click();},started?350:0);};
const TOUR_PAT={key:KEY+'-tour',inviteTitle:'¿Primer turno?',inviteText:'Te acompaño en un turno de práctica y te muestro cada botón en un minuto.',
 steps:[
  {title:'¡Bienvenido al servicio de urgencias!',html:'<p>Soy el búho de la BIC. Aquí atiendes pacientes que llegan estables y <b>empeoran con las horas</b> si nadie reconoce lo que tienen. Tu misión: que ninguno muera.</p><span class="bt-tip">Avanza con las flechas del teclado y sal con Esc.</span>'},
  {el:()=>mob()?document.getElementById('xpchip'):document.querySelector('.top nav'),title:'El mapa del hospital',html:'<p>Arriba están los pisos del laboratorio: el turno, el modelo 3D, la consulta, la sala de lectura y la autoevaluación. A la derecha, tu nivel y tus <b>VX</b>.</p>'},
  {el:'#tuLevel',title:'Elige el nivel',html:'<p><b>Pregrado</b>: dos pacientes, dos camas de UCI y pistas en pantalla. <b>Posgrado</b>: cuatro pacientes, una cama de UCI y sin pistas.</p>'},
  {el:()=>document.getElementById('tuAuto').closest('label'),title:'¿Juegas solo?',html:'<p>Deja esta casilla marcada: enfermería administra tus órdenes y el laboratorio entrega los resultados por ti. En equipo, desmárcala y repártanse los roles.</p>'},
  {el:'.tu-status',title:'Tu tablero de control',html:'<p>El <b>reloj del turno</b> corre rápido: una hora clínica dura un minuto. Los <b>puntos de vida</b> suben con cada acierto y bajan con cada error.</p>'},
  {before:practice,wait:800,el:'#tuBoard',title:'Llegó tu primer paciente',html:'<p>Abrí un <b>turno de práctica</b> y lo dejé en pausa. Cada tarjeta es una cama: la barra de color muestra qué tan grave está. Toca una cama para atenderla.</p>'},
  {el:'#tuTriageBox',title:'Paso 1: el triage',html:'<p>Antes de todo, clasifica al paciente de <b>I</b> (inmediato) a <b>V</b> (no urgente), según la Resolución 5596 de 2015. Solo tienes un intento.</p>'},
  {el:()=>document.querySelector('#tuMain .monitor'),title:'Paso 2: el monitor',html:'<p>Signos vitales en vivo. Debajo, junto al nombre del paciente, verás el <b>NEWS2</b>: si llega a 5 o más, el paciente necesita respuesta urgente.</p>'},
  {el:'#tuTests',title:'Paso 3: pide pruebas',html:'<p>Pide solo las que el cuadro justifica: cada una tarda y una prueba innecesaria resta puntos. Los resultados llegan a «Laboratorio e imágenes».</p>'},
  {el:'#tuAvatarBtn',title:'Paso 4: señala el órgano',html:'<p>Abre el cuerpo 3D del paciente y toca el órgano que crees afectado. Acertar suma 50 puntos. Si pides radiografía, también podrás leer una placa real.</p>'},
  {el:()=>document.getElementById('tuDx').closest('label'),title:'Paso 5: diagnostica',html:'<p>Elige el diagnóstico y confírmalo. Con el diagnóstico correcto, ordena las <b>intervenciones</b> y el paciente empezará a mejorar.</p>'},
  {el:'#tuConsult',title:'Paso 6: llama al especialista',html:'<p>Algunos tratamientos necesitan una interconsulta: hemodinamia, neurología, ginecología o UCI. El mensaje <b>SBAR</b> ya viene preparado.</p>'},
  {el:'#tuCoach',title:'La guía te habla',html:'<p>Lee esta franja: te dice qué está pasando y qué conviene hacer. Cuando el paciente esté estable, define su <b>destino</b>: alta, hospitalización, UCI o cirugía.</p>'},
  {el:'#tuPause',title:'¡Tu turno empieza ahora!',html:'<p>El turno de práctica está en pausa. Pulsa <b>Continuar</b> cuando estés listo. Si ningún paciente muere, ganas la insignia <b>Turno sin muertes</b>.</p><span class="bt-tip">El botón «¿Cómo se juega?» de la esquina inferior izquierda repite este recorrido. Completarlo te da 5 VX.</span>'}],
 onDone:()=>{if(!P.tour){P.tour=1;save();addXP(5,'recorrido guiado completado');}}};
const hb=document.createElement('button');hb.type='button';hb.className='bt-help';hb.setAttribute('aria-label','¿Cómo se juega? Abre el recorrido guiado');hb.innerHTML='<i aria-hidden="true">?</i><span>¿Cómo se juega?</span>';hb.onclick=()=>BicTour.open(TOUR_PAT);document.body.appendChild(hb);
BicTour.invite(TOUR_PAT);}

/* ================= Quiz ================= */
const QZ=[
 {q:'Ante la sospecha de un ictus isquémico, ¿qué prueba de imagen se hace primero para decidir la trombólisis?',o:['Resonancia magnética al día siguiente','TC cerebral sin contraste para descartar hemorragia','Radiografía de cráneo','Electroencefalograma'],a:1,e:'La TC sin contraste descarta la hemorragia, que contraindica la trombólisis (Manual MSD).'},
 {q:'¿Cuántos criterios se necesitan para diagnosticar una pancreatitis aguda?',o:['Uno de tres','Dos de tres: dolor típico, lipasa o amilasa ≥ 3 veces el límite superior, imagen compatible','Los tres siempre','Solo la lipasa elevada'],a:1,e:'Basta con dos de los tres criterios (StatPearls).'},
 {q:'El esquema de la OMS para la tuberculosis sensible combina…',o:['Amoxicilina y claritromicina','Rifampicina, isoniazida, pirazinamida y etambutol','Isoniazida sola durante un año','Tenofovir y entecavir'],a:1,e:'Son cuatro fármacos durante 4 a 6 meses; suspenderlos antes favorece la resistencia (OMS).'},
 {q:'¿Qué hallazgo del análisis de orina orienta hacia pielonefritis y no solo cistitis?',o:['Nitritos positivos','Cilindros leucocitarios','Cristales de oxalato','Proteinuria aislada'],a:1,e:'La piuria con cilindros leucocitarios sugiere compromiso del parénquima renal (Manual MSD).'},
 {q:'¿Qué define macroscópicamente a la cirrosis?',o:['Hígado aumentado y liso','Nódulos de regeneración rodeados de tejido fibroso denso','Un único quiste','Abscesos múltiples'],a:1,e:'La cirrosis distorsiona la arquitectura con fibrosis y nódulos regenerativos (Manual MSD).'},
 {q:'En el infarto con elevación del ST, la intervención coronaria percutánea primaria se busca idealmente…',o:['En las primeras 24 horas','En 90 minutos desde la presentación en un centro con hemodinamia','Después de la segunda troponina','Solo si hay fiebre'],a:1,e:'StatPearls recomienda ICP primaria idealmente en 90 minutos, o 120 si hay traslado.'},
 {q:'¿Cuándo se confirma la erradicación de H. pylori?',o:['Al día siguiente de terminar los antibióticos','Con prueba de aliento o antígeno en heces al menos 4 semanas después del tratamiento','Con serología, que se negativiza en días','No es necesario confirmarla'],a:1,e:'La serología persiste tras la curación; se usa aliento con urea o antígeno en heces ≥ 4 semanas después (Manual MSD).'}
,
 {q:'En una radiografía de tórax PA, ¿qué valor del índice cardiotorácico se considera normal?',o:['0,5 o menos','0,7 o menos','Cualquier valor si el paciente no tiene síntomas','Mayor de 0,6'],a:0,e:'El ICT divide el diámetro cardíaco máximo entre el diámetro torácico interno máximo; en PA, el normal es 0,5 o menos (Radiopaedia).'},
 {q:'¿Qué relación con el hígado describe la evidencia en la hidradenitis supurativa?',o:['Ninguna: es una enfermedad que solo afecta la piel','Mayor prevalencia de hígado graso (MASLD), incluso al ajustar por factores metabólicos clásicos','El hígado graso es la causa de la hidradenitis','Solo se asocia con la hepatitis C'],a:1,e:'Estudios observacionales y un metaanálisis muestran más hígado graso en la hidradenitis (OR 1,78). Es una asociación, no una relación causal demostrada (Gau et al., 2022).'},
 {q:'¿Qué signo radiográfico define el neumotórax?',o:['Menisco cóncavo en la base','Línea pleural visceral sin trama pulmonar por fuera de ella','Broncograma aéreo','Cavitación apical'],a:1,e:'La pleura visceral se ve como una línea blanca convexa hacia afuera, con hiperlucidez y sin trama pulmonar más allá (Burbridge y Mah).'}
];
const quizA=new Array(QZ.length).fill(null);
function renderQuiz(){
  $('#quiz').innerHTML=QZ.map((x,i)=>`<fieldset class="q"><legend>PREGUNTA ${i+1}</legend><h3>${esc(x.q)}</h3>${x.o.map((o,j)=>{const a=quizA[i];let c='';if(a!=null){if(j===x.a)c='right';else if(j===a)c='wrong';}return `<label class="opt ${c}"><input type="radio" name="q${i}" id="q${i}o${j}" value="${j}" ${a===j?'checked':''} ${a!=null?'disabled':''}> <span>${esc(o)}</span></label>`;}).join('')}${quizA[i]!=null?`<p class="note ${quizA[i]===x.a?'ok':'bad'} small">${quizA[i]===x.a?'Correcto. ':'No es correcto. '}${esc(x.e)}</p>`:''}</fieldset>`).join('');
  const sc=quizA.filter((a,i)=>a===QZ[i].a).length; $('#qScore').textContent=sc+' / '+QZ.length;
}
$('#quiz').addEventListener('change',e=>{const m=e.target.name&&e.target.name.match(/^q(\d+)$/);if(!m) return;const i=+m[1];if(quizA[i]!=null) return;quizA[i]=+e.target.value;
  if(quizA[i]===QZ[i].a&&!P.quiz[i]){P.quiz[i]=true;save();addXP(10,'respuesta correcta');if(Object.keys(P.quiz).length>=QZ.length) badge('quiz');}
  renderQuiz();});
$('#qReset').onclick=()=>{quizA.fill(null);renderQuiz();};

/* ================= References ================= */
$('#refs').innerHTML=Object.values(SRC).map(s=>`<li>${s.u?`<a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a>`:esc(s.t)}</li>`).join('');

/* ================= Init ================= */
renderOrganChips(); fillDisSel(); renderModel(); drawHero(); v3Init();
$$('#v3Sex button').forEach(b=>b.onclick=()=>v3SetSex(b.dataset.s));
$$('#v3Mode button').forEach(b=>b.onclick=()=>v3SetMode(b.dataset.m));
$('#v3Skin').onclick=()=>{V3.showSkin=!V3.showSkin;$('#v3Skin').setAttribute('aria-pressed',String(V3.showSkin));v3Apply(false);};
$('#v3Cut').onclick=()=>{V3.cut=!V3.cut;$('#v3Cut').setAttribute('aria-pressed',String(V3.cut));v3Apply(false);};
$('#v3Reset').onclick=()=>v3Frame(false); renderProgress(); renderMyList(); renderQuiz(); newCase(); cancelAnimationFrame(ecgRAF); ecgRAF=requestAnimationFrame(drawECG);
let rz=null; window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{drawHero();renderModel();},120);});
const rethemes=()=>{drawHero();renderModel();};
try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',rethemes);}catch(e){}
new MutationObserver(rethemes).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
/* ---------- Conexión del Turno de urgencias con el Panel docente BIC ---------- */
{
  const R=n=>Math.round(n);
  const ev=(tipo,detalle,puntos,rol)=>{if(window.BicSesion)BicSesion.evento(tipo,detalle,puntos,rol,R(TU.t||0));};
  const DX=id=>{const d=TU_DX.find(x=>x[0]===id);return d?d[1]:id;};
  const paso=p=>p.state==='muerto'?'Falleció':p.state==='egresado'?'Egresado':p.triage==null?'Triage':!Object.keys(p.tests).length?'Pruebas':!p.dx?'Diagnóstico':p.state==='estable'?'Destino':p.treating?'Respondiendo':'Tratamiento';
  // puntos (aciertos y errores clínicos)
  const pts0=tuPts;tuPts=function(n,why,p){pts0(n,why,p);if(n)ev('puntos',why,n);};
  // órdenes y pruebas: el docente ve qué hace el equipo
  const test0=tuOrderTest;tuOrderTest=function(p,id){const ya=!!p.tests[id];test0(p,id);if(!ya&&p.tests[id])ev('accion',`Cama ${p.bed}: pide ${tuTestName(id)}`,0,'Médico líder');};
  const int0=tuOrderInt;tuOrderInt=function(p,id){const ya=!!p.ints[id];int0(p,id);if(!ya&&p.ints[id]){const it=TU_INT.find(x=>x.id===id);ev('accion',`Cama ${p.bed}: ordena ${it?it.n:id}`,0,'Médico líder');}};
  const cons0=tuConsult;tuConsult=function(p,id){const ya=TU.cons[id+':'+p.bed];cons0(p,id);if(!ya&&TU.cons[id+':'+p.bed]){const c=TU_CONS.find(x=>x.id===id);ev('accion',`Cama ${p.bed}: interconsulta a ${c?c.n:id}`,0,'Enlace');}};
  // consultas del vademécum durante el turno
  const vd0=tuVadeConsulta;tuVadeConsulta=function(v){vd0(v);if(TU.started&&!TU.ended)ev('accion',`Consulta el vademécum: ${v.n}`,0,'Médico líder');};
  const vb0=tuVadeBusqueda;tuVadeBusqueda=function(r,q,t){vb0(r,q,t);if(TU.started&&!TU.ended)ev('accion',`Busca en ${r}: ${t}${q?' ('+q+')':''}`,0,'Médico líder');};
  const arr0=tuArrivals;tuArrivals=function(){const n=TU.pats.length;arr0();for(let i=n;i<TU.pats.length;i++)ev('evento',`Ingresa a la cama ${TU.pats[i].bed}: ${TU.pats[i].c.who}`);};
  // recordatorios del docente sin conexión y eventos del panel interno
  document.querySelectorAll('[data-gm]').forEach(b=>b.addEventListener('click',()=>{if(TU.started)ev('evento','Docente: '+b.textContent.trim());}));
  // inicio
  const start0=tuStartTurn;tuStartTurn=function(){start0();if(window.BicSesion)BicSesion.reiniciar();ev('evento',`Inicio del turno (${TU.level==='pre'?'pregrado':'posgrado'})`);};
  // fin del turno
  const end0=tuEnd;tuEnd=function(){const ya=TU.ended;end0();if(ya||!window.BicSesion||!BicSesion.activa())return;
    const n=TU.pats.length,saved=TU.pats.filter(p=>p.state==='egresado').length,dead=TU.pats.filter(p=>p.state==='muerto').length;
    const tri=TU.pats.filter(p=>p.triage!=null&&p.triage===p.c.triage).length,dx=TU.pats.filter(p=>p.dxOk).length;
    const puntaje=R(TU.pts),insignia=!dead&&n>0;
    const resultado=`${saved} de ${n} salvados`+(dead?`, ${dead} fallecido${dead>1?'s':''}`:'');
    BicSesion.final({puntaje,insignia,resultado,
      metricas:{nivel:TU.level,pacientes:n,salvados:saved,fallecidos:dead,triage_exacto:tri,diagnosticos_correctos:dx,horas_clinicas:+(TU.t/60).toFixed(1)},
      resumen:`${puntaje} puntos · ${resultado}`+(insignia?' · ¡insignia ganada!':'')});};
  if(window.BicSesion)BicSesion.init({lab:'turno-urgencias',
    nombreEquipo:()=>$('#tuTeam').value,
    alUnirse:(d)=>{$('#tuTeam').value=d.nombre;const ss=d.sesion;if(ss&&ss.nivel&&!TU.run&&TU.level!==ss.nivel){const b=document.querySelector(`#tuLevel [data-l="${ss.nivel}"]`);if(b)b.click();}},
    estado:()=>{const ps=TU.pats||[];
      return {t:R(TU.t||0),nivel:TU.level,iniciado:!!TU.started,jugando:!!(TU.run&&!TU.ended),terminado:!!TU.ended,puntaje:R(TU.pts||0),
        salvados:ps.filter(p=>p.state==='egresado').length,fallecidos:ps.filter(p=>p.state==='muerto').length,en_espera:(TU.queue||[]).length,
        uci:TU.icu,sistema:TU.sys!==false,
        pacientes:ps.map(p=>({cama:p.bed,caso:DX(p.c.dx),estadio:tuStage(p),estado:p.state,paso:paso(p),
          triage:p.triage==null?null:(p.triage===p.c.triage?'exacto':Math.abs(p.triage-p.c.triage)===1?'cercano':'inadecuado'),dx:p.dx?(p.dxOk?'correcto':'incorrecto'):null}))};},
    comando:(c,a)=>{
      if(c==='iniciar'){if(!TU.started||TU.ended)$('#tuStart').click();else if(!TU.run)$('#tuPause').click();document.getElementById('turno')?.scrollIntoView({block:'start'});}
      if(c==='pausar'&&TU.run&&!TU.ended)$('#tuPause').click();
      if(c==='reanudar'&&TU.started&&!TU.run&&!TU.ended)$('#tuPause').click();
      if(c==='evento'&&TU.started&&!TU.ended){const b=document.querySelector(`[data-gm="${a}"]`);if(b)b.click();}
      if(c==='mensaje')tuCoach('Docente: '+a);}});
}

})();

