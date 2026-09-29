export type CountertopMaterialType = 'quarzo' | 'sinterizado' | 'solid_surface' | 'hpl_compact' | 'postformado';

export interface QstoneProductItem {
  id: string;
  code: string;
  name: string;
  materialType: CountertopMaterialType;
  thicknessMm: 12 | 16 | 18 | 20 | 30 | 38;
  priceM2Clp: number;
  sheetWidthMm: number; // 3200
  sheetHeightMm: number; // 1600
  colorHex: string;
  textureUrl?: string;
  finish: string;
  description: string;
  active: boolean;
}

export type BacksplashMode = 'none' | 'standard_5cm' | 'full_height' | 'custom';
export type BuildingType = 'casa' | 'edificio'; // 250 cm vs 200 cm máx por tramo

export type SinkModelId = 'none' | 'alfa_onec_3018' | 'alfa_twoc_f5858a';
export type CooktopModelId = 'none' | 'fdv_design_60' | 'fdv_design_90';

export interface SinkSpec {
  id: SinkModelId;
  name: string;
  brand: string;
  code: string;
  bowls: number;
  material: string;
  overallWidthMm: number;
  overallDepthMm: number;
  overallHeightMm: number;
  cutoutWidthMm: number;
  cutoutDepthMm: number;
  cutoutRadiusMm: number;
  minCabinetWidthCm: number;
  valveDiameterMm: number;
  installation: 'bajocubierta';
  pdfRef: string;
}

export interface CooktopSpec {
  id: CooktopModelId;
  name: string;
  brand: string;
  code: string;
  burners: number;
  material: string;
  productWidthMm: number;
  productDepthMm: number;
  productHeightMm: number;
  cutoutWidthMm: number;
  cutoutDepthMm: number;
  minCabinetWidthCm: number;
  gasType: string;
  pdfRef: string;
}

export const QSTONE_SINKS: Record<SinkModelId, SinkSpec | null> = {
  none: null,
  alfa_onec_3018: {
    id: 'alfa_onec_3018',
    name: 'Lavaplatos ALFA ONEC 3018',
    brand: 'Sysprotec / Qstone',
    code: 'ALFA-ONEC-3018',
    bowls: 1,
    material: 'Acero Inoxidable 304 (1.2mm)',
    overallWidthMm: 775,
    overallDepthMm: 480,
    overallHeightMm: 230,
    cutoutWidthMm: 695,
    cutoutDepthMm: 400,
    cutoutRadiusMm: 15,
    minCabinetWidthCm: 80,
    valveDiameterMm: 90,
    installation: 'bajocubierta',
    pdfRef: 'ALFA ONEC 3018.pdf'
  },
  alfa_twoc_f5858a: {
    id: 'alfa_twoc_f5858a',
    name: 'Lavaplatos ALFA TWOC F5858A',
    brand: 'Sysprotec / Qstone',
    code: 'ALFA-TWOC-F5858A',
    bowls: 2,
    material: 'Acero Inoxidable 304 (1.2mm)',
    overallWidthMm: 810,
    overallDepthMm: 480,
    overallHeightMm: 210,
    cutoutWidthMm: 730,
    cutoutDepthMm: 400,
    cutoutRadiusMm: 15,
    minCabinetWidthCm: 90,
    valveDiameterMm: 90,
    installation: 'bajocubierta',
    pdfRef: 'ALFA TWOC F5858A.pdf'
  }
};

export const FDV_COOKTOPS: Record<CooktopModelId, CooktopSpec | null> = {
  none: null,
  fdv_design_60: {
    id: 'fdv_design_60',
    name: 'Encimera FDV DESIGN 60 2.0',
    brand: 'FDV / Kitchen Center',
    code: '11732-NAT',
    burners: 4,
    material: 'Acero Inox + Fierro Fundido',
    productWidthMm: 580,
    productDepthMm: 500,
    productHeightMm: 85,
    cutoutWidthMm: 550,
    cutoutDepthMm: 470,
    minCabinetWidthCm: 60,
    gasType: 'Gas Licuado / Natural (Triple Corona)',
    pdfRef: 'ENCIMERA DESIGN 60 2.0.pdf'
  },
  fdv_design_90: {
    id: 'fdv_design_90',
    name: 'Encimera FDV DESIGN 90',
    brand: 'FDV / Kitchen Center',
    code: '10042-NAT',
    burners: 5,
    material: 'Acero Inox + Fierro Fundido',
    productWidthMm: 860,
    productDepthMm: 500,
    productHeightMm: 104,
    cutoutWidthMm: 840,
    cutoutDepthMm: 470,
    minCabinetWidthCm: 90,
    gasType: 'Gas Licuado / Natural (5 focos con wok)',
    pdfRef: 'ENCIMERA DESIGN 90.pdf'
  }
};

export const DEFAULT_QSTONE_CATALOG: QstoneProductItem[] = [
  // 0. Solid Surface & HPL Hospitalario (Norma Sanitaria / Ficha SACYR / KRION Porcelanosa)
  {
    id: 'krion-snow-white-12',
    code: 'KRI_1100_WHITE',
    name: 'Krion Solid Surface Blanco (1100 Snow White EAST 12mm)',
    materialType: 'solid_surface',
    thicknessMm: 12,
    priceM2Clp: 385000,
    sheetWidthMm: 3680,
    sheetHeightMm: 760,
    colorHex: '#FFFFFF',
    finish: 'Satinado Sanitario Antibacteriano',
    description: 'Solid Surface Krion® Porcelanosa 1100 Snow White EAST 12mm. Norma clínica hospitalaria ISO 19712: atérmico, bacteriostático, sin poros ni juntas visibles.',
    active: true
  },
  {
    id: 'krion-grey-12',
    code: 'KRI_6902_GREY',
    name: 'Krion Solid Surface Gris (6902 Light Grey 12mm)',
    materialType: 'solid_surface',
    thicknessMm: 12,
    priceM2Clp: 395000,
    sheetWidthMm: 3680,
    sheetHeightMm: 760,
    colorHex: '#9EA3A8',
    finish: 'Satinado Sanitario',
    description: 'Solid Surface Krion® Porcelanosa 6902 Light Grey 12mm. Tono neutro contemporáneo con tecnología bacteriostática y uniones imperceptibles.',
    active: true
  },
  {
    id: 'krion-green-12',
    code: 'KRI_4601_GREEN',
    name: 'Krion Solid Surface Verde (4601 Green Light / 6602 Sage 12mm)',
    materialType: 'solid_surface',
    thicknessMm: 12,
    priceM2Clp: 410000,
    sheetWidthMm: 3680,
    sheetHeightMm: 760,
    colorHex: '#4A6B56',
    finish: 'Satinado Mineral',
    description: 'Solid Surface Krion® Porcelanosa Verde Mineral 12mm. Alta resistencia química, fácil regeneración superficial y acabado atérmico.',
    active: true
  },
  {
    id: 'krion-red-12',
    code: 'KRI_6401_RED',
    name: 'Krion Solid Surface Rojo (6401 Red Fire / 6405 Happy Red 12mm)',
    materialType: 'solid_surface',
    thicknessMm: 12,
    priceM2Clp: 415000,
    sheetWidthMm: 3680,
    sheetHeightMm: 760,
    colorHex: '#9E2A2B',
    finish: 'Satinado de Alto Impacto',
    description: 'Solid Surface Krion® Porcelanosa Rojo Fuego 12mm. Pigmentación homogénea todo masa, termoformable y unión sin juntas perceptibles.',
    active: true
  },
  {
    id: 'corian-glacier-white-12',
    code: 'COR_GW12_DUPONT',
    name: 'Corian Dupont Glacier White 12mm',
    materialType: 'solid_surface',
    thicknessMm: 12,
    priceM2Clp: 395000,
    sheetWidthMm: 3658,
    sheetHeightMm: 760,
    colorHex: '#FDFDFD',
    finish: 'Satinado Sanitario',
    description: 'Superficie sólida Dupont Corian Glacier White 12mm grado clínico para mesones y laboratorios.',
    active: true
  },
  {
    id: 'hpl-compact-snow-12',
    code: 'HPL_CP12_WHITE',
    name: 'HPL Fenólico Compacto Blanco 12mm (Núcleo Negro)',
    materialType: 'hpl_compact',
    thicknessMm: 12,
    priceM2Clp: 210000,
    sheetWidthMm: 3050,
    sheetHeightMm: 1300,
    colorHex: '#F8FAFC',
    finish: 'Texturado Antibacteriano',
    description: 'Plancha compacta de resina fenólica maciza 12mm impermeable lavable con solventes químicos.',
    active: true
  },
  {
    id: 'hpl-compact-snow-16',
    code: 'HPL_CP16_WHITE',
    name: 'HPL Fenólico Compacto Blanco 16mm (Núcleo Negro)',
    materialType: 'hpl_compact',
    thicknessMm: 16,
    priceM2Clp: 265000,
    sheetWidthMm: 3050,
    sheetHeightMm: 1300,
    colorHex: '#F8FAFC',
    finish: 'Texturado Antibacteriano',
    description: 'Plancha compacta de resina fenólica maciza 16mm de alta resistencia química para recintos sanitarios.',
    active: true
  },
  {
    id: 'postformado-clinico-30',
    code: 'POST_SAN30_WHITE',
    name: 'Cubierta Postformada Sanitaria Blanca 30mm',
    materialType: 'postformado',
    thicknessMm: 30,
    priceM2Clp: 145000,
    sheetWidthMm: 3600,
    sheetHeightMm: 650,
    colorHex: '#F1F5F9',
    finish: 'Laminado HPL Postformado Sanitario R9',
    description: 'Cubierta postformada con curvatura frontal sanitaria, goterón inferior y núcleo hidrófugo sellado para fácil desinfección.',
    active: true
  },

  // 1. Cuarzos (18 mm y 20 mm)
  {
    id: 'qs-black-mamba-18',
    code: 'QP_BM22320160',
    name: 'Qstone Cuarzo Black Mamba 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 338859,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#1C1C1E',
    finish: 'Pulido Seda',
    description: 'Cuarzo de alta densidad fondo negro profundo 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-pure-white-18',
    code: 'QP_PW21320160',
    name: 'Qstone Cuarzo Pure White 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 339818,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FFFFFF',
    finish: 'Pulido Seda',
    description: 'Cuarzo blanco puro de grano extra fino 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-salt-pool-18',
    code: 'QP_SL21320160',
    name: 'Qstone Cuarzo Salt Pool 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 311978,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#EAECEE',
    finish: 'Pulido Seda',
    description: 'Cuarzo blanco con sutiles microcristales salinos 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sand-20',
    code: 'QP_SA31320160',
    name: 'Qstone Cuarzo Sand 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 353264,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#DDD5C7',
    finish: 'Suede / Mate',
    description: 'Tono arena cálido natural 20mm textura suave. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-snow-powder-18',
    code: 'QP_SP21320160',
    name: 'Qstone Cuarzo Snow Powder 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 321574,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F5F7',
    finish: 'Pulido Seda',
    description: 'Blanco nevado con textura translúcida 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-snow-powder-20',
    code: 'QP_SP31320160',
    name: 'Qstone Cuarzo Snow Powder 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 347495,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F5F7',
    finish: 'Pulido Seda',
    description: 'Blanco nevado con textura translúcida 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-white-mamba-18',
    code: 'QP_WM21320160',
    name: 'Qstone Cuarzo White Mamba 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 327343,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F0F2F5',
    finish: 'Pulido Brillante',
    description: 'Blanco brillante con vetas dinámicas tipo mamba 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-gold-20',
    code: 'QP_CO31320160',
    name: 'Qstone Cuarzo Calacatta Gold 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 612315,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F7F6F2',
    finish: 'Pulido Seda',
    description: 'Fondo blanco cálido con vetas doradas y gris perla 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-sharp-20',
    code: 'QP_CT31320160',
    name: 'Qstone Cuarzo Calacatta Sharp 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 503981,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F4F5F8',
    finish: 'Pulido Brillante',
    description: 'Vetas afiladas de alto contraste sobre blanco puro 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-concrete-honed-20',
    code: 'QP_CH32320160',
    name: 'Qstone Cuarzo Concrete Honed 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 358285,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#9E9E9E',
    finish: 'Honed / Mate',
    description: 'Textura hormigón arquitectónico pulido mate al agua 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-aosta-20',
    code: 'QP_CF31320160',
    name: 'Qstone Cuarzo Calacatta Aosta 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 594988,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F3F4F6',
    finish: 'Pulido Seda',
    description: 'Veteado alpino tipo valle de Aosta de gran movimiento 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-calacatta-stratus-20',
    code: 'QP_CR31320160',
    name: 'Qstone Cuarzo Calacatta Stratus 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 510990,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#EEF0F2',
    finish: 'Pulido Seda',
    description: 'Patrón estratificado nebuloso de mármol blanco y gris 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-dark-grey-20',
    code: 'QP_DG31320160',
    name: 'Qstone Cuarzo Dark Grey 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359022,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#424242',
    finish: 'Suede / Mate',
    description: 'Gris oscuro profundo arquitectónico con microtextura 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-imperium-polished-20',
    code: 'QP_IP31320160',
    name: 'Qstone Cuarzo Imperium Polished 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 485737,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#2E2D32',
    finish: 'Pulido Alto Brillo',
    description: 'Negro imperial pulido con destellos minerales 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cool-street-20',
    code: 'QP_CS32320160',
    name: 'Qstone Cuarzo Cool Street 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 328303,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#B0BEC5',
    finish: 'Suede / Mate',
    description: 'Gris urbano frío contemporáneo industrial 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cotton-diamond-20',
    code: 'QP_CD31320160',
    name: 'Qstone Cuarzo Cotton Diamond 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359982,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FAFAFB',
    finish: 'Pulido Seda',
    description: 'Blanco algodón puro con destellos diamantados 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-cotton-diamond-18',
    code: 'QP_CD21320160',
    name: 'Qstone Cuarzo Cotton Diamond 18mm',
    materialType: 'quarzo',
    thicknessMm: 18,
    priceM2Clp: 352842,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FAFAFB',
    finish: 'Pulido Seda',
    description: 'Blanco algodón puro con destellos diamantados 18mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-onix-20',
    code: 'QP_ON32320161',
    name: 'Qstone Cuarzo Onix 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 455978,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#E0D7C6',
    finish: 'Pulido Translúcido',
    description: 'Efecto ónix ámbar marfil con translucidez mineral 20mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-ash-honed-20',
    code: 'QP_AH32300140',
    name: 'Qstone Cuarzo Ash Honed 20mm',
    materialType: 'quarzo',
    thicknessMm: 20,
    priceM2Clp: 359022,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#78909C',
    finish: 'Honed / Mate',
    description: 'Ceniza mate apomazado contemporáneo 20mm. Proveedor SYSPROTEC.',
    active: true
  },

  // 2. Piedras Sinterizadas (12 mm)
  {
    id: 'qs-sint-ana-white-12',
    code: 'QP_AN51320160',
    name: 'Qstone Sinterizado Ana White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#FDFEFE',
    finish: 'Satinado Ultra-compacto',
    description: 'Piedra sinterizada blanco satinado ultra homogéneo 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-aurota-black-12',
    code: 'QP_AB52320160',
    name: 'Qstone Sinterizado Aurota Black 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#18191A',
    finish: 'Satinado Anti-huellas',
    description: 'Negro espacial ultra mate resistente al calor 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-deep-indigo-black-12',
    code: 'QP_DP52320160',
    name: 'Qstone Sinterizado Deep Indigo Black 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#1A1C23',
    finish: 'Satinado Ultra-compacto',
    description: 'Negro profundo con sutil matiz índigo mineral 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-golden-jade-white-12',
    code: 'QP_GJ51320160',
    name: 'Qstone Sinterizado Golden Jade White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F9F8F3',
    finish: 'Pulido Sedoso',
    description: 'Fondo jade marfil con vetas doradas continuas 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-light-clement-grey-12',
    code: 'QP_LG52320160',
    name: 'Qstone Sinterizado Light Clement Grey 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#CFD8DC',
    finish: 'Satinado Ultra-compacto',
    description: 'Gris clement claro mineral suave 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-light-clement-white-12',
    code: 'QP_LC51320160',
    name: 'Qstone Sinterizado Light Clement White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F5F7F8',
    finish: 'Satinado Ultra-compacto',
    description: 'Blanco perla clement con textura ultra compacta 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-lime-stone-grey-12',
    code: 'QP_LS52320160',
    name: 'Qstone Sinterizado Lime Stone Grey 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#90A4AE',
    finish: 'Texturado Piedra Caliza',
    description: 'Piedra caliza gris texturada antibacteriana 12mm. Proveedor SYSPROTEC.',
    active: true
  },
  {
    id: 'qs-sint-lime-stone-white-12',
    code: 'QP_LI51320160',
    name: 'Qstone Sinterizado Lime Stone White 12mm',
    materialType: 'sinterizado',
    thicknessMm: 12,
    priceM2Clp: 331282,
    sheetWidthMm: 3200,
    sheetHeightMm: 1600,
    colorHex: '#F0EFEB',
    finish: 'Texturado Piedra Caliza',
    description: 'Piedra caliza blanca cálida natural 12mm. Proveedor SYSPROTEC.',
    active: true
  }
];

export interface CountertopRunOverride {
  overhangFrontCm?: number;
  overhangBackCm?: number;
  overhangLeftCm?: number;
  overhangRightCm?: number;
  waterfallLeft?: boolean;
  waterfallRight?: boolean;
  regruesoCm?: number;
  backsplashMode?: BacksplashMode;
  backsplashHeightCm?: number;
  backsplashLeft?: boolean;
  backsplashRight?: boolean;
}

export interface CountertopConfig {
  enabled: boolean;
  provider: 'qstone';
  selectedProductId: string;
  regruesoCm: number; // 0 a 5 cm (0, 1, 2, 3, 4, 5 cm)
  regruesoOnOverhangSides?: boolean; // Aplicar faldón perimetral en los laterales con voladizo (default: true)
  baseRegruesoCm?: number; // Regrueso para muebles base (hereda de regruesoCm si no está definido)
  islandRegruesoCm?: number; // Regrueso para islas (hereda de regruesoCm si no está definido)
  backsplashMode: BacksplashMode;
  backsplashHeightCm: number; // 5 cm por defecto o automático a aéreos / custom
  backsplashLeft?: boolean; // Lateral izquierdo con la misma altura que el respaldo
  backsplashRight?: boolean; // Lateral derecho con la misma altura que el respaldo

  // --- SOBREESCRITURAS INDEPENDIENTES POR CUBIERTA/TRAMO DETECTADO ---
  runOverrides?: Record<string, CountertopRunOverride>;
  selectedRunId?: string | null;

  // --- PARÁMETROS MUEBLES BASE CONTRA MURO ---
  baseOverhangFrontCm?: number; // 0 a 5 cm (frente sobre puertas/cajones, default: 2)
  baseOverhangLeftCm?: number; // 0 a 30 cm (lateral izquierdo libre en muebles base)
  baseOverhangRightCm?: number; // 0 a 30 cm (lateral derecho libre en muebles base)
  baseWaterfallLeft?: boolean; // Remate cascada lateral izquierdo exclusivo para muebles base
  baseWaterfallRight?: boolean; // Remate cascada lateral derecho exclusivo para muebles base

  // --- PARÁMETROS MUEBLES ISLA ---
  islandOverhangFrontCm?: number; // 0 a 10 cm (frente isla, default: 2)
  islandOverhangBackCm?: number; // 0 a 50 cm (barra desayunadora trasera en isla, default: 30)
  islandOverhangLeftCm?: number; // 0 a 40 cm (lateral izquierdo isla libre)
  islandOverhangRightCm?: number; // 0 a 40 cm (lateral derecho isla libre)
  islandWaterfallLeft?: boolean; // Remate cascada lateral izquierdo exclusivo para isla
  islandWaterfallRight?: boolean; // Remate cascada lateral derecho exclusivo para isla

  // --- CAMPOS DE RETROCOMPATIBILIDAD Y GENERALES ---
  waterfallLeft: boolean; // Remate lateral cascada al suelo (global/fallback)
  waterfallRight: boolean; // Remate lateral cascada al suelo (global/fallback)
  islandOverhangCm: number; // 0 a 40 cm (barra desayunadora para pisos - retrocompatibilidad)
  overhangFrontCm?: number; // 2 a 10 cm (frente sobre puertas/cajones, fallback)
  overhangBackCm?: number; // 0 a 40 cm (fondo/trasera en isla, fallback)
  overhangLeftCm?: number; // 0 a 40 cm (lateral izquierdo libre, fallback)
  overhangRightCm?: number; // 0 a 40 cm (lateral derecho libre, fallback)

  buildingType: BuildingType; // 'casa' (250 cm max) | 'edificio' (200 cm max)
  sinkModel: SinkModelId;
  sinkCabinetId: string | null;
  cooktopModel: CooktopModelId;
  cooktopCabinetId: string | null;
  extendToWallLeft?: boolean; // Extender cubierta rematando hasta muro/pilar izquierdo
  extendToWallRight?: boolean; // Extender cubierta rematando hasta muro/pilar derecho
  extendToWallMaxGapCm?: number; // Distancia máxima de holgura permitida para llegar al muro/pilar (por defecto 50 cm)
  extendBaseOnly?: boolean; // Solo para muebles adosados a muro (no islas libres por defecto)
}

export const DEFAULT_COUNTERTOP_CONFIG: CountertopConfig = {
  enabled: false,
  provider: 'qstone',
  selectedProductId: 'qs-pure-white-18',
  regruesoCm: 0, // 0 cm = canto simple
  regruesoOnOverhangSides: true,
  backsplashMode: 'standard_5cm',
  backsplashHeightCm: 5,
  backsplashLeft: false,
  backsplashRight: false,
  waterfallLeft: false,
  waterfallRight: false,
  baseWaterfallLeft: false,
  baseWaterfallRight: false,
  islandWaterfallLeft: false,
  islandWaterfallRight: false,
  baseOverhangFrontCm: 2,
  baseOverhangLeftCm: 0,
  baseOverhangRightCm: 0,
  islandOverhangFrontCm: 2,
  islandOverhangBackCm: 30,
  islandOverhangLeftCm: 0,
  islandOverhangRightCm: 0,
  islandOverhangCm: 30, // 30 cm para barra isla
  overhangFrontCm: 2,
  overhangBackCm: 30,
  overhangLeftCm: 0,
  overhangRightCm: 0,
  buildingType: 'casa',
  sinkModel: 'none',
  sinkCabinetId: null,
  cooktopModel: 'none',
  cooktopCabinetId: null,
  extendToWallLeft: false, // Las cubiertas terminan donde termina el mueble por defecto
  extendToWallRight: false,
  extendToWallMaxGapCm: 50,
  extendBaseOnly: true,
};

export interface IslandBackConfig {
  enabled: boolean;
  materialType: 'decorative' | 'countertop';
  decorativeColor: string;
  decorativeMaterial: 'melamina' | 'hpl';
  heightMode: 'to_floor' | 'with_socle'; // estrictamente 'to_floor' cuando materialType === 'countertop'
  thicknessCm: number;
  sidesEnabled?: boolean; // Activar costados/laterales decorativos en isla
  sideLeftEnabled?: boolean; // Lateral izquierdo habilitado
  sideRightEnabled?: boolean; // Lateral derecho habilitado
  sideDepthCm?: number; // Profundidad ajustable con scroll/slider (mínimo profundidad mueble ~60cm, máx ~90cm cubierta)
  sideHeightMode?: 'to_floor' | 'with_socle'; // Encuentro inferior de los laterales
}

export const DEFAULT_ISLAND_BACK_CONFIG: IslandBackConfig = {
  enabled: false,
  materialType: 'decorative',
  decorativeColor: '#FFFFFF',
  decorativeMaterial: 'melamina',
  heightMode: 'to_floor',
  thicknessCm: 1.8,
  sidesEnabled: false,
  sideLeftEnabled: true,
  sideRightEnabled: true,
  sideDepthCm: 60,
  sideHeightMode: 'to_floor',
};

