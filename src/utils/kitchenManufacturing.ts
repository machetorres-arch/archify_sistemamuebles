import { CabinetType } from '../store/kitchenStore';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { Part, generateEdgeBandingList } from './manufacturing';
import { calculateSocleSystem } from './kitchenSocle';
import { calculateGolaSystem } from './kitchenGola';
import { HANDLE_CATALOG, FINISH_LABELS } from '../types/handle';
import { generateCountertopPieces } from './countertopNesting';
import { optimizeNesting, groupIdenticalBoardPatterns, NestingPart, BoardResult } from './nesting';

// Parámetros técnicos de herrajes según marca (igualados con el configurador de closets)
export const HARDWARE_SPECS = {
  Provelcar: {
    // Según plano técnico Provelcar "undermount full extension":
    // SKW (Drawer Width) = LW (Inside Cabinet Width) - 49
    slideClearanceTotal: 49, 
    slideName: 'Corredera Oculta Provelcar Ext. Total (Cierre Suave)',
    // Según plano: SKL (Drawer Length) = NL - 10
    drawerLengthDeduction: 10,
    maxSideThickness: 18 // Espesor máximo admitido para el lateral del cajón
  },
  Hafele: {
    // Gama Alta Industrial Häfele Matrix Runner / Moovit
    slideClearanceTotal: 42, 
    slideName: 'Corredera Oculta Häfele Matrix Runner Ext. Total (Cierre Suave Premium Smuso)',
    drawerLengthDeduction: 0,
    maxSideThickness: 16
  }
};

export function getNominalSlideLength(innerDepthMm: number): number {
  const availableNLs = [250, 300, 350, 400, 450, 500, 550];
  // Requerimiento mínimo (LT min = NL + 3). Holgura de seguridad de +10mm
  for (let i = availableNLs.length - 1; i >= 0; i--) {
    if (availableNLs[i] + 10 <= innerDepthMm) {
      return availableNLs[i];
    }
  }
  return 250; // Fallback mínimo
}

/**
 * Determina si una pieza, textura o módulo corresponde a Laminado de Alta Presión HPL (Abet Laminati u otros)
 */
export function isHplFinish(materialUrlOrColor?: string, doorMaterial?: string, cab?: CabinetType): boolean {
  if (materialUrlOrColor) {
    const s = materialUrlOrColor.toLowerCase();
    // 1. Detección intrínseca por patrón de textura o nombre HPL de alta presión
    if (
      s.includes('abet') ||
      s.includes('laminati') ||
      s.includes('fiore') ||
      s.includes('broccato') ||
      s.includes('terrazzo') ||
      s.includes('bacterio') ||
      s.includes('hpl')
    ) {
      return true;
    }
    // 2. Si es textura de veta de madera estándar o color melamínico, NUNCA es HPL
    if (
      s.includes('light-wood-grain') ||
      s.includes('wood-grain') ||
      s.includes('melamina') ||
      s.startsWith('#') ||
      s.includes('masisa') ||
      s.includes('arauco') ||
      s.includes('frost')
    ) {
      return false;
    }
  }

  // 3. Si no hay textura intrínseca detectable, evaluar banderas explícitas del material
  if (doorMaterial === 'melamina') return false;
  if (doorMaterial === 'hpl') return true;
  if (cab?.doorMaterial === 'melamina') return false;
  if (cab?.doorMaterial === 'hpl') return true;

  return false;
}

/**
 * Determina si un mueble de cocina tiene puertas y admite repisas interiores
 */
export function isCabinetWithDoors(cab?: Partial<CabinetType> | null): boolean {
  if (!cab) return false;
  if (cab.type === 'decoration' || (typeof cab.variant === 'string' && cab.variant.startsWith('deco_'))) return false;
  const v = cab.variant || ((cab.width ?? 0) > 60 ? '2_doors' : '1_door');
  if (typeof v !== 'string') return false;
  return (
    v === '1_door' ||
    v === '2_doors' ||
    v === 'hospital_meson_1door' ||
    v === '1_door_1_drawer' ||
    v === 'tall_1_door' ||
    v === 'tall_2_doors' ||
    v === 'tall_split_2_doors' ||
    v === 'tall_oven_vent' ||
    v === 'tall_oven_micro' ||
    v === 'tall_microwave_niche' ||
    v === 'wall_1_door' ||
    v === 'wall_2_doors' ||
    v.includes('door') ||
    v.startsWith('corner_blind') ||
    v.startsWith('wall_corner_blind') ||
    (cab.type === 'island' && (v === '1_door' || v === '2_doors')) ||
    (cab.type === 'wall' && (v === '1_door' || v === '2_doors' || !cab.variant)) ||
    (cab.type === 'base' && (v === '1_door' || v === '2_doors' || !cab.variant))
  );
}

/**
 * Determina si un mueble tiene 2 puertas verticales superpuestas (despensas divididas y torres de hornos)
 */
export function isCabinetWithSplitDoors(cab?: Partial<CabinetType> | null): boolean {
  if (!cab) return false;
  return (
    cab.variant === 'tall_split_2_doors' ||
    cab.variant === 'tall_oven_vent' ||
    cab.variant === 'tall_oven_micro' ||
    cab.variant === 'tall_microwave_niche'
  );
}

/**
 * Obtiene la cantidad de repisas para secciones inferior y superior de un mueble dividido
 */
export function getSplitCabinetShelvesCounts(cab?: Partial<CabinetType> | null): { lower: number; upper: number } {
  if (!cab) return { lower: 1, upper: 3 };
  let defaultLower = 1;
  let defaultUpper = 3;
  if (cab.variant === 'tall_oven_vent' || cab.variant === 'tall_oven_micro') {
    defaultLower = 1;
    defaultUpper = 1;
  } else if (cab.variant === 'tall_microwave_niche') {
    defaultLower = 1;
    defaultUpper = 2;
  }

  const lower = cab.shelvesCountLower !== undefined
    ? cab.shelvesCountLower
    : (cab.shelvesCount !== undefined ? Math.min(cab.shelvesCount, defaultLower) : defaultLower);
  const upper = cab.shelvesCountUpper !== undefined
    ? cab.shelvesCountUpper
    : (cab.shelvesCount !== undefined ? Math.max(0, cab.shelvesCount - lower) : defaultUpper);
  return { lower, upper };
}

/**
 * Cantidad estándar de repisas por defecto según tipología
 */
export function getDefaultShelvesCount(cab?: Partial<CabinetType> | null): number {
  if (!cab) return 1;
  const v = cab.variant || ((cab.width ?? 0) > 60 ? '2_doors' : '1_door');
  if (v === 'hospital_meson_1door') {
    return 2;
  }
  if (v === 'tall_1_door' || v === 'tall_2_doors' || v === 'tall_split_2_doors') {
    return 4;
  }
  if (v === 'tall_oven_vent' || v === 'tall_oven_micro') {
    return 2;
  }
  if (v === 'tall_microwave_niche') {
    return 3;
  }
  if (v === '1_door_1_drawer') {
    const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
    const socleH = useKitchenStore.getState().socleHeight ?? 10;
    const legsHeight = isBaseOrTall ? socleH : 0;
    const cabH = (cab.height ?? 90) - legsHeight;
    const doorH = cabH - 18 - 0.9;
    return doorH > 40 ? 1 : 0;
  }
  return 1;
}

/**
 * Posiciones verticales en Y (en cm) de los ejes de bisagra relativas al fondo del lateral (0 a cabH)
 */
export function getCabinetHingesPositions(cab?: Partial<CabinetType> | null): number[] {
  if (!cab) return [9, 61];
  const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
  const socleH = useKitchenStore.getState().socleHeight ?? 10;
  const legsHeight = isBaseOrTall ? socleH : 0;
  const cabH = (cab.height ?? 90) - legsHeight;
  const v = cab.variant || ((cab.width ?? 0) > 60 ? '2_doors' : '1_door');

  if (v === 'tall_split_2_doors') {
    const baseH = 70;
    const upperH = cabH - baseH;
    const hinges = [9, baseH - 9, baseH + 9, cabH - 9];
    if (upperH > 100) {
      hinges.push(baseH + upperH * 0.5);
    }
    return hinges.sort((a, b) => a - b);
  }

  if (v === 'tall_oven_vent' || v === 'tall_oven_micro') {
    const baseH = 70;
    const ovenH = 60;
    const microH = 38;
    const topStart = baseH + ovenH + microH; // 168
    const hinges = [9, baseH - 9];
    if (cabH > topStart + 18) {
      hinges.push(topStart + 9, cabH - 9);
    }
    return hinges.sort((a, b) => a - b);
  }

  if (v === 'tall_microwave_niche') {
    const baseH = 70;
    const nicheH = 45;
    const topStart = baseH + nicheH; // 115
    const hinges = [9, baseH - 9];
    if (cabH > topStart + 18) {
      hinges.push(topStart + 9, cabH - 9);
      const topH = cabH - topStart;
      if (topH > 80) {
        hinges.push(topStart + topH * 0.5);
      }
    }
    return hinges.sort((a, b) => a - b);
  }

  if (v === 'tall_1_door' || v === 'tall_2_doors' || cab.type === 'tall') {
    return [
      9,
      cabH * 0.35,
      cabH * 0.65,
      cabH - 9
    ].sort((a, b) => a - b);
  }

  if (v === '1_door_1_drawer') {
    const doorH = cabH - 18 - 0.9;
    return [9, Math.max(15, doorH - 9)];
  }

  // Estándar 1 puerta o 2 puertas (base, isla, aéreo)
  return [9, Math.max(18, cabH - 9)];
}

/**
 * Calcula las cotas de elevación Y (en cm) de las repisas interiores,
 * distribuidas paramétricamente y con desplazamiento automático anti-colisión
 * respecto a las bisagras (zona de exclusión de +/- 4.5 cm).
 */
export function getResolvedCabinetShelfElevations(cab: CabinetType, thicknessCm = 1.8): number[] {
  const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
  const socleH = useKitchenStore.getState().socleHeight ?? 10;
  const legsHeight = isBaseOrTall ? socleH : 0;
  const cabH = cab.height - legsHeight;
  const v = cab.variant || (cab.width > 60 ? '2_doors' : '1_door');

  const count = cab.shelvesCount !== undefined ? cab.shelvesCount : getDefaultShelvesCount(cab);
  const hinges = getCabinetHingesPositions(cab);
  const HINGE_COLLISION_RADIUS = 4.5; // cm (45mm alrededor del eje de bisagra)

  if (isCabinetWithSplitDoors(cab)) {
    const baseH = 70;
    const elevations: number[] = [];
    const { lower: lowerCount, upper: upperCount } = getSplitCabinetShelvesCounts(cab);

    // Repisas vano inferior (0 a 70cm)
    if (lowerCount > 0) {
      const step = (baseH - 2 * thicknessCm) / (lowerCount + 1);
      for (let i = 0; i < lowerCount; i++) {
        let yLow = thicknessCm + (i + 1) * step;
        for (const h of hinges.filter(h => h < baseH)) {
          if (Math.abs(yLow - h) <= HINGE_COLLISION_RADIUS) {
            yLow += (yLow >= h ? 5.0 : -5.0);
          }
        }
        elevations.push(Math.max(thicknessCm + 4, Math.min(baseH - thicknessCm - 4, yLow)));
      }
    }

    // Repisas vano superior
    let upperStart = baseH;
    if (v === 'tall_oven_vent' || v === 'tall_oven_micro') {
      upperStart = 70 + 60 + 38; // 168
    } else if (v === 'tall_microwave_niche') {
      upperStart = 70 + 45; // 115
    }

    if (upperCount > 0 && cabH > upperStart + thicknessCm * 2 + 10) {
      const upperH = cabH - upperStart;
      const step = (upperH - 2 * thicknessCm) / (upperCount + 1);
      for (let i = 0; i < upperCount; i++) {
        let yUp = upperStart + thicknessCm + (i + 1) * step;
        for (const h of hinges.filter(h => h > upperStart)) {
          if (Math.abs(yUp - h) <= HINGE_COLLISION_RADIUS) {
            yUp += (yUp >= h ? 5.0 : -5.0);
          }
        }
        elevations.push(Math.max(upperStart + thicknessCm + 4, Math.min(cabH - thicknessCm - 4, yUp)));
      }
    }
    return elevations.sort((a, b) => a - b);
  }

  if (count <= 0) return [];

  if (v === '1_door_1_drawer') {
    const doorH = cabH - 18 - 0.9;
    const step = (doorH - 2 * thicknessCm) / (count + 1);
    const elevations: number[] = [];
    for (let i = 0; i < count; i++) {
      let yPos = thicknessCm + (i + 1) * step;
      for (const h of hinges) {
        if (Math.abs(yPos - h) <= HINGE_COLLISION_RADIUS) {
          yPos += (yPos >= h ? 5.0 : -5.0);
        }
      }
      elevations.push(Math.max(thicknessCm + 4, Math.min(doorH - thicknessCm - 4, yPos)));
    }
    return elevations.sort((a, b) => a - b);
  }

  const bottomOffset = thicknessCm;
  const topOffset = thicknessCm;
  const usableH = cabH - topOffset - bottomOffset;
  const step = usableH / (count + 1);

  const rawElevations: number[] = [];
  for (let i = 0; i < count; i++) {
    let yPos = bottomOffset + (i + 1) * step;
    for (const h of hinges) {
      if (Math.abs(yPos - h) <= HINGE_COLLISION_RADIUS) {
        const shift = yPos >= h ? 5.0 : -5.0;
        yPos += shift;
      }
    }
    yPos = Math.max(bottomOffset + 4.5, Math.min(cabH - topOffset - 4.5, yPos));
    rawElevations.push(Math.round(yPos * 10) / 10);
  }

  rawElevations.sort((a, b) => a - b);
  for (let i = 1; i < rawElevations.length; i++) {
    if (rawElevations[i] - rawElevations[i - 1] < (thicknessCm + 2.5)) {
      rawElevations[i] = rawElevations[i - 1] + thicknessCm + 3.0;
    }
  }

  return rawElevations;
}

export function generateKitchenPartsList(cabinets: CabinetType[]): Part[] {
  const parts: Part[] = [];
  const state = useStore.getState();
  const kState = useKitchenStore.getState();
  const rawThick = state.thickness || 1.8;
  const thickness = rawThick >= 1.2 ? Number(rawThick.toFixed(2)) : 1.8; // thickness en cm (mínimo 12mm, estándar 15/18mm)
  const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;
  
  cabinets.forEach((cab, index) => {
    if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) return;
    const cabName = `(Cab ${index+1} ${cab.type})`;
    const w = cab.width;
    const h = cab.height;
    const d = cab.depth;
    
    // Base, tall and island cabinet legs/socle
    const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
    const socleH = kState.socleHeight ?? 10;
    const legsHeight = isBaseOrTall ? socleH : 0;
    const cabH = h - legsHeight;
    const innerW = w - thickness * 2;
    const innerH = cabH - thickness * ((cab.type === 'base' || cab.type === 'island') ? 1 : 2);
    
    // 1. Laterales (Sides)
    const isBaseGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
    const hasGolaC = isBaseGola && (cab.variant === '1_door_1_drawer' || cab.variant === '2_pot_drawers' || cab.variant === '4_drawers');
    const isWineRack = cab.variant?.includes('wine_rack') || cab.variant === 'base_wine_rack' || cab.variant === 'wall_wine_rack' || cab.variant === 'tall_wine_rack' || cab.variant === 'island_wine_rack';
    const effectiveDepth = isWineRack ? (d + thickness) : d;
    const lateralNotes = isWineRack
      ? 'Opción A: Lateral botellero prolongado a plomo con frentes contiguos (Corte recto con disco en escuadradora/panelera/celco)'
      : (isBaseGola
        ? (hasGolaC ? 'Mecanizado CNC: Destaje Gola L Superior 58x26mm + Gola C Intermedio 68x26mm (Paso continuo)' : 'Mecanizado CNC: Destaje Gola L Superior 58x26mm (Paso continuo)')
        : 'Laterales del gabinete');

    parts.push({
      name: `Lateral ${cabName}`,
      moduleId: cab.id,
      moduleIndex: index,
      qty: 2,
      length: cabH * 10,
      width: effectiveDepth * 10,
      thickness: thickness * 10,
      material: cab.structureColor || state.structureColor,
      edgeL1: true, edgeL2: false, edgeW1: true, edgeW2: true,
      notes: lateralNotes
    });

    // 1.1 Tapas Laterales Vistas (Costados Decorativos de Terminación)
    if (cab.leftCoverPanel?.enabled) {
      const coverThick = cab.leftCoverPanel.thickness || thickness;
      const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
      const coverExtend = cab.leftCoverPanel.extendToFloor && isBaseOrTall;
      const coverH = coverExtend ? h : cabH;
      const hasFronts = !isWineRack && cab.variant !== 'open' && cab.variant !== 'tall_open' && cab.variant !== 'wall_open';
      const coverDepth = (hasFronts || isWineRack) ? (d + thickness) : d;
      const coverMat = cab.leftCoverPanel.color || cab.doorColor || state.doorColor;

      parts.push({
        name: `Tapa Lateral Izq. Vista ${cabName}`,
        moduleId: cab.id,
        moduleIndex: index,
        qty: 1,
        length: coverH * 10,
        width: coverDepth * 10,
        thickness: coverThick * 10,
        material: coverMat,
        edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
        notes: `Tapa lateral decorativa izquierda vista (${coverExtend ? 'al suelo' : 'al casco'}) enrasada con frentes`
      });
    }

    if (cab.rightCoverPanel?.enabled) {
      const coverThick = cab.rightCoverPanel.thickness || thickness;
      const isBaseOrTall = cab.type === 'base' || cab.type === 'tall' || cab.type === 'island';
      const coverExtend = cab.rightCoverPanel.extendToFloor && isBaseOrTall;
      const coverH = coverExtend ? h : cabH;
      const hasFronts = !isWineRack && cab.variant !== 'open' && cab.variant !== 'tall_open' && cab.variant !== 'wall_open';
      const coverDepth = (hasFronts || isWineRack) ? (d + thickness) : d;
      const coverMat = cab.rightCoverPanel.color || cab.doorColor || state.doorColor;

      parts.push({
        name: `Tapa Lateral Der. Vista ${cabName}`,
        moduleId: cab.id,
        moduleIndex: index,
        qty: 1,
        length: coverH * 10,
        width: coverDepth * 10,
        thickness: coverThick * 10,
        material: coverMat,
        edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
        notes: `Tapa lateral decorativa derecha vista (${coverExtend ? 'al suelo' : 'al casco'}) enrasada con frentes`
      });
    }

    // 2. Base
    parts.push({
      name: `Piso ${cabName}`,
      moduleId: cab.id,
      moduleIndex: index,
      qty: 1,
      length: innerW * 10,
      width: effectiveDepth * 10,
      thickness: thickness * 10,
      material: cab.structureColor || state.structureColor,
      edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
      notes: isWineRack
        ? 'Opción A: Piso botellero prolongado a plomo con frentes contiguos (Corte recto con disco en escuadradora/panelera/celco)'
        : 'Piso del gabinete'
    });

    // 3. Techo o Barras de Armado
    const ctConfig = kState.countertopConfig;
    const selectedProduct = kState.qstoneCatalog?.find(p => p.id === ctConfig?.selectedProductId);
    const requiresFullTop = ctConfig?.enabled && selectedProduct?.materialType === 'sinterizado';

    if (cab.type === 'base' || cab.type === 'island') {
        if (requiresFullTop) {
            // Regla técnica de fabricación: para cubierta sinterizada se exige tapa/techo ciego completo de melamina
            parts.push({
                name: `Tapa Melamina Completa (Soporte Sinterizado) ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: innerW * 10,
                width: d * 10,
                thickness: thickness * 10,
                material: cab.structureColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: 'Tapa continua completa para soporte homogéneo de cubierta sinterizada 12mm'
            });
        } else {
            // Barras superior delantera y trasera tradicionales (para cuarzo o sin cubierta)
            parts.push({
                name: `Barra Frontal ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: innerW * 10,
                width: 10 * 10, // 10 cm width
                thickness: thickness * 10,
                material: cab.structureColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
            // Barra trasera
            parts.push({
                name: `Barra Trasera ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: innerW * 10,
                width: 10 * 10, // 10 cm width
                thickness: thickness * 10,
                material: cab.structureColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
        }
    } else {
        // Wall or Tall cabinet has a full top
        parts.push({
            name: `Techo ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: d * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Techo del gabinete'
        });
    }

    // 4. Fondo (Back panel)
    parts.push({
        name: `Fondo Trasera ${cabName}`,
        moduleId: cab.id,
        moduleIndex: index,
        qty: 1,
        length: innerW * 10,
        width: innerH * 10,
        thickness: 3, // Placa MDF 3mm trasera
        material: cab.backColor || state.structureColor,
        edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
        notes: 'Placa de fondo 3mm'
    });

    // 5. Repisas (Shelves) y Divisores si corresponde
    if (cab.variant === '2_doors' || cab.variant === '1_door' || cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind' || ((cab.type === 'wall' || cab.type === 'base' || cab.type === 'island') && (!cab.variant || cab.variant?.includes('door')))) {
        const shelfQty = cab.shelvesCount !== undefined ? cab.shelvesCount : getDefaultShelvesCount(cab);
        if (shelfQty > 0) {
            parts.push({
                name: `Repisa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: shelfQty,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${shelfQty} repisa(s) interior(es) regulable(s)`
            });
        }
    } else if (cab.variant === 'tall_1_door' || cab.variant === 'tall_2_doors') {
        const shelfQty = cab.shelvesCount !== undefined ? cab.shelvesCount : getDefaultShelvesCount(cab);
        if (shelfQty > 0) {
            parts.push({
                name: `Repisa Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: shelfQty,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${shelfQty} repisas interiores de despensa alta`
            });
        }
    } else if (cab.variant === 'tall_split_2_doors') {
        parts.push({
            name: `Divisor Fijo Línea Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Divisor estructural a cota 70cm (línea de muebles base)'
        });
        const { lower: lowerCount, upper: upperCount } = getSplitCabinetShelvesCounts(cab);
        if (lowerCount > 0) {
            parts.push({
                name: `Repisa Inferior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: lowerCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${lowerCount} repisa(s) en puerta inferior (línea base)`
            });
        }
        if (upperCount > 0) {
            parts.push({
                name: `Repisa Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: upperCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${upperCount} repisa(s) en puerta superior (línea alta)`
            });
        }
    } else if (cab.variant === 'tall_oven_micro') {
        parts.push({
            name: `Base Soporte Horno ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Base reforzada soporte horno a 70cm'
        });
        parts.push({
            name: `Divisor Horno / Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Divisor entre horno y microondas empotrado'
        });
        parts.push({
            name: `Techo Nicho Torre ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Cierre superior nicho de electrodomésticos'
        });
        const { lower: lowerCount, upper: upperCount } = getSplitCabinetShelvesCounts(cab);
        if (lowerCount > 0) {
            parts.push({
                name: `Repisa Inferior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: lowerCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${lowerCount} repisa(s) en puerta inferior (0-70cm)`
            });
        }
        if (upperCount > 0) {
            parts.push({
                name: `Repisa Superior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: upperCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${upperCount} repisa(s) en puerta superior (sobre hornos)`
            });
        }
    } else if (cab.variant === 'tall_microwave_niche') {
        parts.push({
            name: `Base Soporte Nicho Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Base soporte nicho microondas a 70cm'
        });
        parts.push({
            name: `Techo Nicho Abierto ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Cierre superior nicho abierto para microondas de sobremesa'
        });
        const { lower: lowerCount, upper: upperCount } = getSplitCabinetShelvesCounts(cab);
        if (lowerCount > 0) {
            parts.push({
                name: `Repisa Inferior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: lowerCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${lowerCount} repisa(s) en puerta inferior (0-70cm)`
            });
        }
        if (upperCount > 0) {
            parts.push({
                name: `Repisa Superior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: upperCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${upperCount} repisa(s) en puerta superior (sobre nicho)`
            });
        }
    } else if (cab.variant === 'tall_open' || (cab.type === 'tall' && cab.variant === 'open')) {
        parts.push({
            name: `Repisas a la Vista ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 5,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '5 repisas vistas distribuidas simétricamente'
        });
    } else if (cab.variant?.includes('wine_rack')) {
        const usefulDepth = Math.min(d - 2, 32);
        const innerH = cabH - thickness * 2;
        // Fondo falso estructural a 32cm útiles del frente
        parts.push({
            name: `Fondo Falso Botellero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: innerH * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Fondo falso vertical a 320mm para tope de botellas estándar'
        });

        // Celdas paramétricas (mínimo 10.5 cm por celda, máximo 5 corridas)
        const minClearance = 10.5;
        const cols = Math.min(5, Math.max(1, Math.floor((innerW + thickness) / (minClearance + thickness))));
        const rows = Math.max(2, Math.floor(innerH / 12.5));

        if (cols > 1) {
            parts.push({
                name: `Divisor Vertical Botellero ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: cols - 1,
                length: innerH * 10,
                width: usefulDepth * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || cab.structureColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `Montante vertical separador de ${cols} corridas`
            });
        }

        if (rows > 1) {
            parts.push({
                name: `Repisa Horizontal Botellero ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: rows - 1,
                length: (innerW - 0.2) * 10,
                width: usefulDepth * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || cab.structureColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `Repisa horizontal separadora de ${rows} niveles`
            });
        }
    } else if (cab.variant?.startsWith('wall_corner_blind')) {
        parts.push({
            name: `Repisa Interior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa interior módulo aéreo esquinero'
        });
    }

    // 6. Frentes (Doors/Drawers)
    const gap = 0.3; // 3mm gap
    const frontMat = cab.doorColor || state.doorColor;
    if (cab.variant?.startsWith('wall_corner_blind')) {
        const stripW = 5.5; // 55 mm según lámina técnica PDF
        const doorW = w - stripW - gap * 3;
        parts.push({
            name: `Tapa Esquinero Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: stripW * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Regleta frontal tapa esquinero 55mm según lámina 3 PDF'
        });
        parts.push({
            name: `Regleta Retorno Esquina Interior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: stripW * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Regleta perpendicular interior escuadra unión esquinero'
        });
        parts.push({
            name: `Puerta Frontal Batiente ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: doorW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta batiente para mueble aéreo esquinero'
        });
    } else if (cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind') {
        const blindW = Math.max(35, w / 2);
        const stripW = 6.5; // Regleta de ajuste frontal traslapada de 65 mm (evita colisiones con tiradores a 90°)
        const doorW = w - blindW - gap * 2;
        parts.push({
            name: `Panel Ciego ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: blindW * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Panel ciego frontal esquinero (mismo tono estructura/paredes)'
        });
        parts.push({
            name: `Regleta de Ajuste Frontal Traslapada ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: stripW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Regleta de ajuste traslapada 65mm para evitar colisión de tiradores a 90°'
        });
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: doorW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta batiente esquinero'
        });
        parts.push({
            name: `Poste Amarre Ciego ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: cabH * 10,
            width: 10 * 10,
            thickness: thickness * 10,
            material: cab.structureColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Regleta vertical de fijación'
        });
        parts.push({
            name: `Repisa Interior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa interior de vano ciego'
        });
    } else if (cab.variant === 'corner_l' || cab.variant === 'base_corner_l') {
        // Módulo esquinero en L articulado (900x900 mm)
        const doorW = 30 - gap * 2;
        parts.push({
            name: `Puerta Bi-Fold Hoja 1 ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: doorW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Hoja principal anclada a lateral de mueble con bisagra 170°'
        });
        parts.push({
            name: `Puerta Bi-Fold Hoja 2 ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: doorW * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Hoja secundaria articulada solidaria con bisagra de rincón bi-fold'
        });
        parts.push({
            name: `Repisa en L - Tramo Principal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (w - 30 - 2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Tramo A de repisa continua a escuadra'
        });
        parts.push({
            name: `Repisa en L - Retorno Escuadra ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (30 - 2) * 10,
            width: (d - 30 - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Tramo B de repisa continua a escuadra'
        });
    } else if (cab.variant === 'tall_oven_vent') {
        const baseH = 70;
        const ovenH = 60;
        const microH = 38;
        const topH = Math.max(10, cabH - (baseH + ovenH + microH));
        const lowerDoorH = baseH - gap * 2;
        const topDoorH = topH - gap * 2;

        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta inferior despensero a cota de 700mm'
        });
        if (topDoorH > 10) {
            parts.push({
                name: `Puerta Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: topDoorH * 10,
                width: (w - gap * 2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
                notes: 'Puerta superior torre de hornos'
            });
        }
        parts.push({
            name: `Base Soporte Horno c/ Chimenea ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 5) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Base soporte reforzada horno (retranqueo técnico 50mm para chimenea térmica)'
        });
        parts.push({
            name: `Divisor Horno / Micro c/ Convección ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 5) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Divisor intermedio con paso libre de aire caliente posterior'
        });
        parts.push({
            name: `Techo Nicho Horno c/ Escape Aire ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: innerW * 10,
            width: (d - 5) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Techo superior nicho de electrodomésticos con evacuación térmica'
        });
        const { lower: lowerCount, upper: upperCount } = getSplitCabinetShelvesCounts(cab);
        if (lowerCount > 0) {
            parts.push({
                name: `Repisa Inferior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: lowerCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${lowerCount} repisa(s) en puerta inferior (0-70cm)`
            });
        }
        if (upperCount > 0) {
            parts.push({
                name: `Repisa Superior Torre ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: upperCount,
                length: (innerW - 0.2) * 10,
                width: (d - 4) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `${upperCount} repisa(s) en puerta superior (sobre hornos)`
            });
        }
    } else if (cab.variant === 'tall_inner_drawers') {
        // Puerta exterior única de gran altura
        parts.push({
            name: `Puerta Frontal Alta Continua ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta exterior despensero continuo. Requiere bisagras 165° con ángulo cero invasión'
        });

        // 4 Gavetas Interiores (Cajones ingleses)
        const innerDepthMm = (d - 5) * 10;
        const nominalLength = getNominalSlideLength(innerDepthMm);
        const drawerBoxLength = nominalLength - hwSpec.drawerLengthDeduction;
        const drawerBoxOuterWidth = innerW * 10 - hwSpec.slideClearanceTotal;
        const drawerFrontBackLength = drawerBoxOuterWidth - (2 * thickness * 10);
        const innerDrawerH = 140; // 140 mm
        const cInnerMat = cab.drawerInnerColor || state.structureColor;

        for (let i = 0; i < 4; i++) {
            // Frente interior con uñero fresado CNC
            parts.push({
                name: `Frente Cajón Interior ${i + 1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: drawerBoxOuterWidth,
                width: innerDrawerH,
                thickness: thickness * 10,
                material: cab.drawerFrontColor || frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
                notes: 'Frente interior de melamina con uñero fresado CNC en centro superior'
            });
            // Laterales de cajón interior
            parts.push({
                name: `Lateral Cajón Interior ${i + 1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 2,
                length: drawerBoxLength,
                width: 120,
                thickness: thickness * 10,
                material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `P/ ${hwSpec.slideName} (NL=${nominalLength}mm)`
            });
            // Trasera de cajón interior
            parts.push({
                name: `Trasera Cajón Interior ${i + 1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: drawerFrontBackLength,
                width: 120,
                thickness: thickness * 10,
                material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `P/ ${hwSpec.slideName}`
            });
            // Fondo de cajón 3mm
            parts.push({
                name: `Fondo Cajón Interior ${i + 1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: drawerBoxLength,
                width: drawerBoxOuterWidth,
                thickness: 3,
                material: cab.backColor || '#dddddd',
                edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: 'Fondo ranurado/clavado 3mm'
            });
        }

        // 3 Repisas superiores fijas/regulables
        parts.push({
            name: `Repisas Interiores Superiores ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 3,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisas despensero superior sobre gavetas interiores'
        });
    } else if (cab.variant === 'sink_u_drawer') {
        const isGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
        const regruesoCm = (ctConfig?.enabled && (cab.type === 'base' || cab.type === 'island')) ? (ctConfig.regruesoCm || 0) : 0;
        const regruesoDeduction = isGola ? Math.max(0, regruesoCm - 3.5) : regruesoCm;
        
        let lowerH = (cabH - gap * 3) / 2;
        let upperH = (cabH - gap * 3) / 2;
        if (isGola) {
            const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3);
            lowerH = availH / 2;
            upperH = availH / 2;
        }
        if (regruesoDeduction > 0) {
            upperH = Math.max(8, Number((upperH - regruesoDeduction).toFixed(1)));
        }

        // Frentes exteriores
        parts.push({
            name: `Frente Cajón Inferior Ollero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (w - gap * 2) * 10,
            width: lowerH * 10,
            thickness: thickness * 10,
            material: cab.drawerFrontColor || frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Frente exterior cajón ollero inferior'
        });
        parts.push({
            name: `Frente Cajón Superior en U ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (w - gap * 2) * 10,
            width: upperH * 10,
            thickness: thickness * 10,
            material: cab.drawerFrontColor || frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Frente exterior cajón superior lavaplatos (aloja cajón en U)'
        });

        const innerDepthMm = (d - 5) * 10;
        const nominalLength = getNominalSlideLength(innerDepthMm);
        const drawerBoxLength = nominalLength - hwSpec.drawerLengthDeduction;
        const drawerBoxOuterWidth = innerW * 10 - hwSpec.slideClearanceTotal;
        const drawerFrontBackLength = drawerBoxOuterWidth - (2 * thickness * 10);
        const cInnerMat = cab.drawerInnerColor || state.structureColor;

        // Cajón 1: Inferior estándar
        parts.push({
            name: `Lateral Cajón Inferior ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 2,
            length: drawerBoxLength, width: 180, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: `P/ ${hwSpec.slideName} (NL=${nominalLength}mm)`
        });
        parts.push({
            name: `Contrafrente Cajón Inferior ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 1,
            length: drawerFrontBackLength, width: 180, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: `Testero frontal interior p/ fijación de frente exterior`
        });
        parts.push({
            name: `Trasera Cajón Inferior ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 1,
            length: drawerFrontBackLength, width: 180, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: `Testero posterior p/ ${hwSpec.slideName}`
        });
        parts.push({
            name: `Fondo Cajón Inferior ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 1,
            length: drawerBoxLength, width: drawerBoxOuterWidth, thickness: 3, material: cab.backColor || '#dddddd',
            edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Fondo ranurado/clavado 3mm'
        });

        // Cajón 2: Superior en U para salvar sifón sanitario
        const skw = drawerBoxOuterWidth / 10; // cm
        const uCutoutW = Math.min(32, Math.max(22, w * 0.32)); // cm
        const wingW = (skw - uCutoutW) / 2; // cm
        const uCutoutLength = Math.max(16, (drawerBoxLength / 10) - 12); // cm
        const frontBandLength = (drawerBoxLength / 10) - uCutoutLength; // cm
        const sideH = 140;

        parts.push({
            name: `Costados Exteriores Cajón en U ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 2,
            length: drawerBoxLength, width: sideH, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Costados laterales exteriores del cajón en U'
        });
        parts.push({
            name: `Contrafrente Frontal Cajón en U ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 1,
            length: drawerFrontBackLength, width: sideH, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Testero frontal continuo para ensamble y fijación de frente exterior'
        });
        parts.push({
            name: `Traseras Alas Cajón en U ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 2,
            length: wingW * 10, width: sideH, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Traseras individuales de cada ala izquierda/derecha'
        });
        parts.push({
            name: `Costados Interiores Divisorios Calado U ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 2,
            length: uCutoutLength * 10, width: sideH, thickness: thickness * 10, material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Paredes interiores que conforman el calado central del sifón'
        });
        parts.push({
            name: `Fondo Alas Cajón en U (3mm) ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 2,
            length: drawerBoxLength, width: wingW * 10, thickness: 3, material: cab.backColor || '#dddddd',
            edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Fondo de cada ala lateral del cajón en U'
        });
        parts.push({
            name: `Fondo Banda Frontal Cajón en U (3mm) ${cabName}`,
            moduleId: cab.id, moduleIndex: index, qty: 1,
            length: frontBandLength * 10, width: uCutoutW * 10, thickness: 3, material: cab.backColor || '#dddddd',
            edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Fondo de la unión frontal central del cajón en U'
        });
    } else if (cab.variant === 'spice_rack') {
        const isGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
        const regruesoCm = (ctConfig?.enabled && (cab.type === 'base' || cab.type === 'island')) ? (ctConfig.regruesoCm || 0) : 0;
        const regruesoDeduction = isGola ? Math.max(0, regruesoCm - 3.5) : regruesoCm;
        const doorH = isGola ? (cabH - 3.5 - gap * 2) : (cabH - regruesoDeduction - gap * 2);

        // 1. Frente Exterior Especiero
        parts.push({
            name: `Frente Exterior Especiero Extraíble ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: doorH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: cab.drawerFrontColor || frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Frente extraíble de mueble especiero con tirador vertical o gola'
        });

        // 2. Carro Interior de Melamina (misma melamina que cajones)
        const innerDepthMm = (d - 1.5) * 10;
        const nominalLength = getNominalSlideLength(innerDepthMm);
        const cartDepthMm = nominalLength - 10;
        const cartOuterWidthMm = innerW * 10 - hwSpec.slideClearanceTotal;
        const cartInnerWidthMm = cartOuterWidthMm - (2 * thickness * 10);
        const cInnerMat = cab.drawerInnerColor || state.structureColor;
        const cartHeightMm = (cabH - 12) * 10;
        const guardHeightMm = 60; // 60mm de alto para barandillas de contención

        // Base / Piso inferior del carro
        parts.push({
            name: `Piso Base Carro Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: cartDepthMm,
            width: cartOuterWidthMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: `Base de melamina para soporte y anclaje de correderas ${hwSpec.slideName}`
        });

        // Montante / Trasera vertical posterior
        parts.push({
            name: `Trasera / Montante Vertical Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: cartHeightMm,
            width: cartOuterWidthMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Estructura vertical posterior de unión entre niveles y repisas'
        });

        // Barandillas laterales inferiores
        parts.push({
            name: `Barandillas Laterales Inferiores Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: cartDepthMm,
            width: guardHeightMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Costados de contención nivel inferior para botellas altas'
        });

        // Contrafrentes / Amarres frontales de fijación al frente exterior
        parts.push({
            name: `Amarres Frontales Fijación Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: cartInnerWidthMm,
            width: guardHeightMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Amarres frontales atornillados al frente exterior de melamina'
        });

        // Repisa intermedia
        parts.push({
            name: `Repisa Intermedia Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: cartDepthMm - (thickness * 10),
            width: cartOuterWidthMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Bandeja intermedia de melamina para frascos y especias'
        });

        // Barandillas laterales intermedias
        parts.push({
            name: `Barandillas Laterales Intermedias Especiero ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: cartDepthMm - (thickness * 10),
            width: guardHeightMm,
            thickness: thickness * 10,
            material: cInnerMat,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Costados de contención nivel superior para frascos'
        });
    } else if (cab.variant === '1_door' || cab.variant === 'tall_1_door') {
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap*2) * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
    } else if (cab.variant === '2_doors' || cab.variant === 'tall_2_doors') {
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (cabH - gap*2) * 10,
            width: ((w - gap*3)/2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
    } else if (cab.variant === 'tall_split_2_doors') {
        const baseH = 70;
        const lowerDoorH = baseH - gap*2;
        const upperDoorH = (cabH - baseH) - gap*2;
        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta inferior a cota de mueble base'
        });
        parts.push({
            name: `Puerta Superior Alta ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: upperDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta superior despensa'
        });
    } else if (cab.variant === 'tall_oven_micro') {
        const baseH = 70;
        const ovenH = 60;
        const microH = 38;
        const topH = Math.max(10, cabH - (baseH + ovenH + microH));
        const lowerDoorH = baseH - gap*2;
        const topDoorH = topH - gap*2;

        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
        if (topDoorH > 10) {
            parts.push({
                name: `Puerta Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: topDoorH * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
    } else if (cab.variant === 'tall_microwave_niche') {
        const baseH = 70;
        const nicheH = 45;
        const topH = Math.max(10, cabH - (baseH + nicheH));
        const lowerDoorH = baseH - gap*2;
        const topDoorH = topH - gap*2;

        parts.push({
            name: `Puerta Inferior Base ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: lowerDoorH * 10,
            width: (w - gap*2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
        });
        if (topDoorH > 10) {
            parts.push({
                name: `Puerta Superior Despensa ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: topDoorH * 10,
                width: (w - gap*2) * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true
            });
        }
    } else if (cab.variant === 'wall_lift_up') {
        parts.push({
            name: `Puerta Elevable Aventos ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (cabH - gap * 2) * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta basculante hacia arriba con pistones a gas'
        });
        if (cabH > 50) {
            parts.push({
                name: `Repisa Interior ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (innerW - 0.2) * 10,
                width: (d - 2) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
        }
    } else if (cab.variant === 'wall_lift_up_double') {
        const sectionH = (cabH - gap * 3) / 2;
        parts.push({
            name: `Puerta Elevable Inferior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: sectionH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Módulo inferior basculante'
        });
        parts.push({
            name: `Puerta Elevable Superior ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: sectionH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Módulo superior basculante'
        });
        parts.push({
            name: `Divisor Horizontal Fijo ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa divisoria entre tramos basculantes'
        });
    } else if (cab.variant === 'wall_microwave_niche') {
        const nicheH = 38;
        const topH = Math.max(20, cabH - nicheH - gap * 2);
        const topDoorH = topH - gap * 2;
        parts.push({
            name: `Divisor Base Nicho Microondas ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: 'Repisa reforzada sobre nicho microondas'
        });
        parts.push({
            name: `Puerta Superior Elevable ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: topDoorH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta abatible superior de mueble microondas'
        });
        if (topH > 45) {
            parts.push({
                name: `Repisa Interior Superior ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (innerW - 0.2) * 10,
                width: (d - 2) * 10,
                thickness: thickness * 10,
                material: cab.shelfColor || state.structureColor,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false
            });
        }
    } else if (cab.variant === 'wall_open') {
        parts.push({
            name: `Repisas a la Vista ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '2 repisas vistas interiores'
        });
    } else if (cab.variant === '4_drawers' || cab.variant === '2_pot_drawers' || cab.variant === '2_drawers_1_pot' || cab.variant === '1_door_1_drawer' || cab.variant === 'hospital_meson_3drawers') {
        const isGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
        const hConfig = cab.handleConfig || kState.handleConfig;
        const isKutz = hConfig?.model === 'kutz_asa';
        const gapY = isKutz ? 1.0 : gap;
        const regruesoCm = (ctConfig?.enabled && (cab.type === 'base' || cab.type === 'island')) ? (ctConfig.regruesoCm || 0) : 0;
        const stoneThCm = (selectedProduct?.thicknessMm || 20) / 10;
        const faldonDrop = Math.max(0, regruesoCm - stoneThCm);
        const topDeduction = (cab.type === 'base' || cab.type === 'island')
            ? (isKutz ? (faldonDrop + 3.2) : (isGola ? Math.max(0, regruesoCm - 3.5) : faldonDrop))
            : 0;

        let drawCount = 0;
        let drawerHeights: number[] = [];
        let isPotDrawer = cab.variant === '2_pot_drawers';
        
        if (cab.variant === 'hospital_meson_3drawers') {
            // Ficha MC.2.02 SACYR / Plano CAD: 3 cajones (A, B y C)
            drawCount = 3;
            const availH = Math.max(30, cabH - topDeduction - gapY * 4);
            const hA = Math.max(10, Math.round(availH * (160 / 536) * 10) / 10);
            const hB = Math.max(10, Math.round(availH * (160 / 536) * 10) / 10);
            const hC = availH - hA - hB;
            // Cajones de abajo hacia arriba: C, B, A
            drawerHeights = [hC, hB, hA];
        } else if (cab.variant === '4_drawers') {
            drawCount = 4;
            if (isGola) {
                const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5);
                drawerHeights = [availH / 4, availH / 4, availH / 4, availH / 4];
            } else {
                const availH = Math.max(20, cabH - topDeduction - gapY * 5);
                drawerHeights = [availH / 4, availH / 4, availH / 4, availH / 4];
            }
        } else if (cab.variant === '2_pot_drawers') {
            drawCount = 2;
            if (isGola) {
                const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3);
                drawerHeights = [availH / 2, availH / 2];
            } else {
                const availH = Math.max(20, cabH - topDeduction - gapY * 3);
                drawerHeights = [availH / 2, availH / 2];
            }
        } else if (cab.variant === '2_drawers_1_pot') {
            drawCount = 3;
            if (isGola) {
                const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 4);
                drawerHeights = [availH * 0.5, availH * 0.25, availH * 0.25];
            } else {
                const availH = Math.max(20, cabH - topDeduction - gapY * 4);
                const lowH = Math.round(availH * 0.5 * 10) / 10;
                const upH = (availH - lowH) / 2;
                drawerHeights = [lowH, upH, upH];
            }
        } else if (cab.variant === '1_door_1_drawer') {
            drawCount = 1;
            drawerHeights = [isGola ? 14.5 : 18];
        }
        
        drawerHeights.forEach((dh, i) => {
            const isOlleroFront = cab.variant === '2_drawers_1_pot' ? i === 0 : isPotDrawer;
            parts.push({
                name: cab.variant === '2_drawers_1_pot' 
                    ? (i === 0 ? `Frente Cajón Ollero Inferior ${cabName}` : `Frente Cajón Superior ${i} ${cabName}`)
                    : `Frente Cajón ${i+1} ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (w - gap*2) * 10,
                width: dh * 10,
                thickness: thickness * 10,
                material: cab.drawerFrontColor || frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
                notes: isGola ? 'Tapacanto perimetral (Alineado a Riel Gola Provelcar)' : (isOlleroFront ? 'Frente cajón ollero de gran capacidad' : 'Tapacanto perimetral')
            });
        });

        if (cab.variant === '1_door_1_drawer') {
            const doorH = isGola 
                ? Math.max(15, cabH - 3.5 - 14.5 - 4.0 - gap * 4 - topDeduction) 
                : Math.max(15, cabH - 18 - topDeduction - gapY * 3);
            parts.push({
                name: `Puerta Frontal ${cabName}`,
                moduleId: cab.id,
                moduleIndex: index,
                qty: 1,
                length: (w - gap*2) * 10,
                width: doorH * 10,
                thickness: thickness * 10,
                material: frontMat,
                edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
                notes: isGola ? 'Puerta frontal (Descuento 40mm p/ Riel Gola C x176)' : undefined
            });
            const defaultShelves = doorH > 40 ? 1 : 0;
            const shelfQty = cab.shelvesCount !== undefined ? cab.shelvesCount : defaultShelves;
            if (shelfQty > 0) {
                parts.push({
                    name: `Repisa ${cabName}`,
                    moduleId: cab.id,
                    moduleIndex: index,
                    qty: shelfQty,
                    length: (innerW - 0.2) * 10,
                    width: (d - 4) * 10,
                    thickness: thickness * 10,
                    material: cab.shelfColor || state.structureColor,
                    edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                    notes: `${shelfQty} repisa(s) regulable(s) bajo cajón`
                });
            }
        }
        
        // Cajas de cajones calculadas con HARDWARE_SPECS exactos
        const innerDepthMm = (d - 5) * 10;
        const nominalLength = getNominalSlideLength(innerDepthMm);
        const drawerBoxLength = nominalLength - hwSpec.drawerLengthDeduction;
        const drawerBoxOuterWidth = innerW * 10 - hwSpec.slideClearanceTotal;
        const drawerFrontBackLength = drawerBoxOuterWidth - (2 * thickness * 10);
        const cInnerMat = cab.drawerInnerColor || state.structureColor;

        for (let i=0; i<drawCount; i++) {
            const currentSideH = cab.variant === '2_drawers_1_pot' 
                ? (i === 0 ? 180 : 120) 
                : (isPotDrawer ? 180 : 120);
            // Laterales cajon
            parts.push({
                name: `Lateral Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 2,
                length: drawerBoxLength, width: currentSideH, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `P/ ${hwSpec.slideName} (NL=${nominalLength}mm)`
            });
            // Contrafrente (Frontal Interior) de caja
            parts.push({
                name: `Contrafrente Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 1,
                length: drawerFrontBackLength, width: currentSideH, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `Testero frontal interior p/ fijación de frente exterior`
            });
            // Trasera de caja
            parts.push({
                name: `Trasera Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 1,
                length: drawerFrontBackLength, width: currentSideH, thickness: thickness * 10, material: cInnerMat,
                edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: `Testero posterior p/ ${hwSpec.slideName}`
            });
            // Fondo de cajón (3mm)
            parts.push({
                name: `Fondo Cajón ${cabName} (${i+1})`,
                moduleId: cab.id, moduleIndex: index, qty: 1,
                length: drawerBoxLength, width: drawerBoxOuterWidth, thickness: 3, material: cab.backColor || '#dddddd',
                edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
                notes: 'Fondo ranurado/clavado 3mm'
            });
        }
    } else if (cab.variant === 'hospital_meson_1door') {
        const isGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
        const rawDoorH = isGola ? (cabH - 3.5 - gap * 2) : (cabH - gap * 2);
        parts.push({
            name: `Puerta Frontal Clínica (KUTZ) ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 1,
            length: rawDoorH * 10,
            width: (w - gap * 2) * 10,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: 'Puerta batiente clínica de 1 hoja con perfil tirador KUTZ 12/18 y bisagras con freno'
        });
        // 2 repisas interiores de MDF 18mm laminado 2 caras
        parts.push({
            name: `Repisa Interior Clínica ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (innerW - 0.2) * 10,
            width: (d - 4) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '2 repisas interiores MDF 18mm laminado blanco 2 caras (Norma MC.2.02)'
        });
    } else if (cab.variant === 'hospital_niche_open') {
        // Nicho abierto sin puerta, con 2 repisas vistas
        parts.push({
            name: `Repisa Nicho Clínico ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: 2,
            length: (innerW - 0.2) * 10,
            width: (d - 2) * 10,
            thickness: thickness * 10,
            material: cab.shelfColor || state.structureColor,
            edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: false,
            notes: '2 repisas vistas interiores para instrumental / dispensadores clínicos'
        });
    } else if (cab.variant !== 'wall_open' && cab.variant !== 'tall_open' && cab.variant !== 'open' && !cab.variant?.includes('wine_rack') && !cab.variant?.startsWith('wall_corner_blind') && cab.variant !== 'hospital_niche_open') {
        // Fallback estándar para puertas batientes en cualquier variante base, mural o torre
        const isGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
        const isDouble = w > 60;
        const doorQty = isDouble ? 2 : 1;
        const doorWidth = isDouble ? ((w - gap * 3) / 2) * 10 : (w - gap * 2) * 10;
        const rawDoorH = isGola ? (cabH - 3.5 - gap * 2) : (cabH - gap * 2);
        parts.push({
            name: `Puerta Frontal ${cabName}`,
            moduleId: cab.id,
            moduleIndex: index,
            qty: doorQty,
            length: rawDoorH * 10,
            width: doorWidth,
            thickness: thickness * 10,
            material: frontMat,
            edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true,
            notes: (isDouble ? 'Puertas batientes dobles' : 'Puerta batiente estándar') + (isGola ? ' (Descuento 35mm p/ Riel Gola L x175)' : '')
        });
    }
  });

  parts.forEach(p => {
    const cab = cabinets.find(c => c.id === p.moduleId);
    const isFront = (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')) &&
                    !p.name.toLowerCase().includes('contrafrente') &&
                    !p.name.toLowerCase().includes('amarre') &&
                    !p.name.toLowerCase().includes('caja');
    const isBack = p.thickness === 3 || p.thickness === 3.5 || p.name.includes('Fondo') || p.name.includes('Trasera');
    const isCover = p.name.includes('Tapa Lateral') || p.name.includes('Costado Decorativo');

    if (isFront) {
      p.materialCategory = 'doors';
      const isDrawerFront = p.name.includes('Frente Cajón');
      const specificMat = isDrawerFront ? (cab?.drawerFrontMaterial || 'melamina') : (cab?.doorMaterial);
      p.isHpl = isHplFinish(p.material, specificMat, isDrawerFront ? undefined : cab);
    } else if (isCover) {
      p.materialCategory = 'cover';
      const coverMatType = (p.name.includes('Izq') ? cab?.leftCoverPanel?.material : cab?.rightCoverPanel?.material) || cab?.doorMaterial;
      p.isHpl = isHplFinish(p.material, coverMatType, cab);
    } else if (isBack) {
      p.materialCategory = 'backs';
      p.isHpl = false;
    } else {
      p.materialCategory = 'structure';
      p.isHpl = false;
    }
  });

  return parts;
}

const DEFAULT_MELAMINE_NAMES: Record<string, string> = {
  '#FFFFFF': 'Blanco Frost',
  '#171717': 'Negro Profundo',
  '#F8F9FA': 'Bianco Polo',
  '#202020': 'Nero',
  '#D4A373': 'Roble Natural',
  '#A3B18A': 'Verde Salvia',
  '#588157': 'Verde Bosque',
  '#3A5A40': 'Verde Olivo',
  '#E0E1DD': 'Gris Humo',
  '#778DA9': 'Azul Nórdico',
  '#415A77': 'Azul Petróleo',
  '#1B263B': 'Azul Noche',
  '#2B2D42': 'Grafito Mate',
  '#8D99AE': 'Gris Plata',
  '#EDF2F4': 'Blanco Nieve',
  '#DDA15E': 'Madera Teca',
  '#BC6C25': 'Nogal Ceniza',
};

export function generateKitchenHardwareList(cabinets: CabinetType[]) {
    const hardware: { Categoria: string; Item: string; Cantidad: number; Unidad: string; Detalles?: string }[] = [];

    const state = useStore.getState();
    const kState = useKitchenStore.getState();
    const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;
    const rawThick = state.thickness || 1.8;
    const thicknessMm = Math.round((rawThick >= 1.2 ? rawThick : 1.8) * 10);

    const DEFAULT_NAMES = DEFAULT_MELAMINE_NAMES;

    const getColorName = (colorVal?: string) => {
      if (!colorVal) return 'Melamina Blanca';
      if (colorVal.startsWith('data:')) {
        const found = state.customTextures?.find((t: any) => t.url === colorVal);
        return found?.name || 'Textura Personalizada';
      }
      if (colorVal.startsWith('#')) {
        return DEFAULT_NAMES[colorVal.toUpperCase()] || `Color ${colorVal}`;
      }
      const found = state.customTextures?.find((t: any) => t.url === colorVal);
      if (found) return found.name;
      const parts = colorVal.split('/');
      return parts[parts.length - 1].replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    };

    // 0. CÁLCULO DE TABLEROS Y PLANCHAS (Melaminas, MDF 3mm, Laminados HPL)
    const allParts = generateKitchenPartsList(cabinets);
    const m2PorPlacaMDF = 2.44 * 1.83; // 4.465 m²
    const m2PorPlacaHPL = 3.05 * 1.30; // 3.965 m²

    // Agrupación por material / decorativo para cálculo multidecorativo exacto
    const melDoorsByColor: Record<string, { m2: number; name: string }> = {};
    const hplDoorsByColor: Record<string, { m2Hpl: number; m2Mdf: number; name: string }> = {};
    const structByColor: Record<string, { m2: number; name: string }> = {};
    let backsM2 = 0;
    
    // Tapacantos agrupados por material / decorativo
    const cantosFrontByColor: Record<string, { meters: number; name: string }> = {};
    const cantosStructByColor: Record<string, { meters: number; name: string }> = {};

    allParts.forEach(p => {
      const pArea = (p.length * p.width * p.qty) / 1000000;
      const isFront = (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')) &&
                      !p.name.toLowerCase().includes('contrafrente') &&
                      !p.name.toLowerCase().includes('amarre') &&
                      !p.name.toLowerCase().includes('caja');
      const isBack = p.thickness === 3 || p.name.includes('Fondo') || p.name.includes('Trasera');
      const isHPL = p.isHpl !== undefined ? p.isHpl : (isFront && isHplFinish(p.material, undefined, cabinets.find(c => c.id === p.moduleId)));
      const colorVal = p.material || (isFront ? state.doorColor : state.structureColor);
      const colorName = getColorName(colorVal);

      if (isBack) {
        backsM2 += pArea;
      } else if (isFront) {
        if (isHPL) {
          // Norma de fabricación: el laminado HPL se corta 1 cm (10mm) más ancho y más largo para prensado y refilado
          const hplPieceArea = (((p.length + 10) * (p.width + 10)) * p.qty) / 1000000;
          if (!hplDoorsByColor[colorVal]) {
            hplDoorsByColor[colorVal] = { m2Hpl: 0, m2Mdf: 0, name: colorName };
          }
          hplDoorsByColor[colorVal].m2Hpl += hplPieceArea;
          hplDoorsByColor[colorVal].m2Mdf += pArea;
        } else {
          if (!melDoorsByColor[colorVal]) {
            melDoorsByColor[colorVal] = { m2: 0, name: colorName };
          }
          melDoorsByColor[colorVal].m2 += pArea;
        }
      } else {
        if (!structByColor[colorVal]) {
          structByColor[colorVal] = { m2: 0, name: colorName };
        }
        structByColor[colorVal].m2 += pArea;
      }

      // Tapacantos
      const cantosL = (p.edgeL1 ? 1 : 0) + (p.edgeL2 ? 1 : 0);
      const cantosW = (p.edgeW1 ? 1 : 0) + (p.edgeW2 ? 1 : 0);
      const meters = (((cantosL * p.length) + (cantosW * p.width)) * p.qty) / 1000;
      if (meters > 0) {
        if (isFront) {
          if (!cantosFrontByColor[colorVal]) {
            cantosFrontByColor[colorVal] = { meters: 0, name: colorName };
          }
          cantosFrontByColor[colorVal].meters += meters;
        } else {
          if (!cantosStructByColor[colorVal]) {
            cantosStructByColor[colorVal] = { meters: 0, name: colorName };
          }
          cantosStructByColor[colorVal].meters += meters;
        }
      }
    });

    // 0.1 Tableros de Puertas / Frentes Melamina Estándar (por decorativo)
    Object.values(melDoorsByColor).forEach(item => {
      if (item.m2 > 0) {
        const requiredDoorsBoards = Math.max(1, Math.ceil((item.m2 * 1.18) / m2PorPlacaMDF));
        const eff = ((item.m2 / (requiredDoorsBoards * m2PorPlacaMDF)) * 100).toFixed(1);
        hardware.push({
          Categoria: 'Tableros',
          Item: `Plancha Melamina Puertas y Frentes (${item.name})`,
          Cantidad: requiredDoorsBoards,
          Unidad: `Planchas (2440x1830x${thicknessMm}mm)`,
          Detalles: `Área neta: ${item.m2.toFixed(2)} m² | Aprovechamiento est.: ${eff}%`
        });
      }
    });

    // 0.2 Tableros HPL por cada decorativo independiente y Sustrato MDF Crudo 18mm consolidado
    let totalMdfSustratoM2 = 0;
    Object.values(hplDoorsByColor).forEach(item => {
      if (item.m2Hpl > 0) {
        const reqHpl = Math.max(1, Math.ceil((item.m2Hpl * 1.15) / m2PorPlacaHPL));
        const effHpl = ((item.m2Hpl / (reqHpl * m2PorPlacaHPL)) * 100).toFixed(1);
        hardware.push({
          Categoria: 'Tableros',
          Item: `Plancha Laminado HPL Puertas (${item.name})`,
          Cantidad: reqHpl,
          Unidad: 'Planchas (3050x1300x0.9mm)',
          Detalles: `Enchape HPL (+1cm sobremedida refilado). Área corte: ${item.m2Hpl.toFixed(2)} m² | Efic.: ${effHpl}%`
        });
        totalMdfSustratoM2 += item.m2Mdf;
      }
    });

    if (totalMdfSustratoM2 > 0) {
      const reqMdfSustrato = Math.max(1, Math.ceil((totalMdfSustratoM2 * 1.18) / m2PorPlacaMDF));
      const effMdf = ((totalMdfSustratoM2 / (reqMdfSustrato * m2PorPlacaMDF)) * 100).toFixed(1);
      hardware.push({
        Categoria: 'Tableros',
        Item: 'Plancha MDF Crudo / Sustrato Base p/ HPL (18mm)',
        Cantidad: reqMdfSustrato,
        Unidad: 'Planchas (2440x1830x18mm)',
        Detalles: `Alma base desnuda para prensado HPL 18mm. Área neta: ${totalMdfSustratoM2.toFixed(2)} m² | Efic.: ${effMdf}%`
      });
      const litersGlue = Math.max(1, Math.ceil(totalMdfSustratoM2 * 0.35));
      hardware.push({
        Categoria: 'Insumos',
        Item: 'Adhesivo de Contacto Alta Resistencia (Prensado HPL)',
        Cantidad: litersGlue,
        Unidad: 'Litros / Galón',
        Detalles: `Pegado de alta resistencia HPL sobre sustrato MDF 18mm (${(totalMdfSustratoM2 * 2).toFixed(1)} m² caras)`
      });
    }

    // 0.3 Tableros de Estructura y Cajas de Cajón (por decorativo)
    Object.values(structByColor).forEach(item => {
      if (item.m2 > 0) {
        const requiredStructBoards = Math.max(1, Math.ceil((item.m2 * 1.15) / m2PorPlacaMDF));
        const effStruct = ((item.m2 / (requiredStructBoards * m2PorPlacaMDF)) * 100).toFixed(1);
        hardware.push({
          Categoria: 'Tableros',
          Item: `Plancha Melamina Estructura y Cajones (${item.name})`,
          Cantidad: requiredStructBoards,
          Unidad: `Planchas (2440x1830x${thicknessMm}mm)`,
          Detalles: `Área neta: ${item.m2.toFixed(2)} m² | Aprovechamiento est.: ${effStruct}%`
        });
      }
    });

    // 0.4 Tableros MDF 3mm (Fondos y Traseras)
    if (backsM2 > 0) {
      const requiredBackBoards = Math.max(1, Math.ceil((backsM2 * 1.12) / m2PorPlacaMDF));
      const effBack = ((backsM2 / (requiredBackBoards * m2PorPlacaMDF)) * 100).toFixed(1);
      hardware.push({
        Categoria: 'Tableros',
        Item: 'Plancha MDF / Durolac Traseras y Fondos 3mm',
        Cantidad: requiredBackBoards,
        Unidad: 'Planchas (2440x1830x3mm)',
        Detalles: `Fondos ranurados y traseras de módulos. Área neta: ${backsM2.toFixed(2)} m² | Efic.: ${effBack}%`
      });
    }

    // 0.5 CUBIERTAS SANITARIAS Y MARMOLERÍA (Krion Solid Surface / Qstone Cuarzo / HPL Compacto / Postformado)
    if (kState.countertopConfig?.enabled) {
      const ctBOM = generateCountertopPieces(
        cabinets,
        kState.countertopConfig,
        kState.qstoneCatalog,
        kState.islandBackConfig,
        kState.walls,
        kState.architecturalElements,
        kState.roomConfig
      );

      if (ctBOM && ctBOM.pieces.length > 0) {
        const prod = ctBOM.product;
        const thicknessLabel = `${prod.thicknessMm}mm`;
        const piecesCount = ctBOM.pieces.length;
        const mainPiecesDesc = ctBOM.pieces.map(p => `${p.name} (${p.lengthMm}x${p.widthMm}mm)`).join(', ');

        hardware.push({
          Categoria: 'Cubiertas',
          Item: `Plancha Cubierta ${prod.name} (${thicknessLabel})`,
          Cantidad: Math.max(1, ctBOM.slabsCount),
          Unidad: `Planchas (${prod.sheetWidthMm || 3200}x${prod.sheetHeightMm || 1600}x${thicknessLabel})`,
          Detalles: `Área neta útil: ${ctBOM.totalNetAreaM2.toFixed(2)} m² | Aprovechamiento est.: ${ctBOM.efficiencyPercent}% (${piecesCount} pieza${piecesCount > 1 ? 's' : ''}: ${mainPiecesDesc})`
        });

        // Adhesivo / Sellador técnico específico según material
        if (prod.materialType === 'solid_surface') {
          // Krion Solid Surface: Adhesivo bicomponente acrílico para juntas imperceptibles
          hardware.push({
            Categoria: 'Insumos',
            Item: 'Adhesivo Bicomponente Krion® / Solid Surface (Tubo 250ml al tono)',
            Cantidad: Math.max(1, Math.ceil(ctBOM.totalLinearEdgeM * 0.35)),
            Unidad: 'Cartuchos',
            Detalles: 'Pegado químico homogéneo sin poros ni juntas visibles (Norma MC.2.02 Sanitaria)'
          });
          hardware.push({
            Categoria: 'Insumos',
            Item: 'Sellador Elastomérico Fungicida Aséptico (Silicona Sanitaria)',
            Cantidad: 1,
            Unidad: 'Cartucho',
            Detalles: 'Sellado perimetral posterior y estanqueidad contra muro'
          });
        } else if (prod.materialType === 'quarzo' || prod.materialType === 'sinterizado') {
          hardware.push({
            Categoria: 'Insumos',
            Item: 'Adhesivo Epóxico Bicomponente Tenax / Qstone (Color al Tono)',
            Cantidad: Math.max(1, Math.ceil(ctBOM.totalLinearEdgeM * 0.3)),
            Unidad: 'Latas / Kits',
            Detalles: 'Unión estructural estanca de tramos y pegado de faldones/ingletes'
          });
          hardware.push({
            Categoria: 'Insumos',
            Item: 'Silicona Neutra Sanitaria Antihongos',
            Cantidad: 1,
            Unidad: 'Cartucho',
            Detalles: 'Sellado elástico junta de dilatación respaldo-muro'
          });
        } else if (prod.materialType === 'hpl_compact' || prod.materialType === 'postformado') {
          hardware.push({
            Categoria: 'Insumos',
            Item: 'Sellador Polímero MS Híbrido Sanitario Estanco',
            Cantidad: 1,
            Unidad: 'Cartucho',
            Detalles: 'Fijación sobre bastidor/módulos y sellado hermético perimetral'
          });
        }

        // Calados / Mecanizados si existen en la cubierta
        if (ctBOM.cutouts && ctBOM.cutouts.length > 0) {
          ctBOM.cutouts.forEach(c => {
            const isSink = c.type === 'sink';
            hardware.push({
              Categoria: 'Quincallería',
              Item: isSink ? `Lavaplatos Bajo Cubierta (${c.modelName})` : `Encimera (${c.modelName})`,
              Cantidad: 1,
              Unidad: 'Unidades',
              Detalles: `Mecanizado en plancha: Calado CNC ${c.cutoutWidthMm}x${c.cutoutDepthMm}mm con cantos pulidos`
            });
          });
        }
      }
    }

    // 0.5 Tapacantos (+10% merma) desglosados por cada decorativo
    Object.values(cantosFrontByColor).forEach(item => {
      if (item.meters > 0) {
        hardware.push({
          Categoria: 'Insumos',
          Item: `Tapacanto PVC Puertas y Frentes (22x${state.edgeBandingThicknessFronts.toFixed(2)}mm)`,
          Cantidad: Math.ceil(item.meters * 1.10),
          Unidad: 'Metros Lineales',
          Detalles: `Terminación perimetral frentes (${item.name})`
        });
      }
    });

    Object.values(cantosStructByColor).forEach(item => {
      if (item.meters > 0) {
        hardware.push({
          Categoria: 'Insumos',
          Item: `Tapacanto PVC Estructura (22x${state.edgeBandingThicknessCabinets.toFixed(2)}mm)`,
          Cantidad: Math.ceil(item.meters * 1.10),
          Unidad: 'Metros Lineales',
          Detalles: `Cantos frontales e interiores de gabinetes (${item.name})`
        });
      }
    });

    let totalHinges = 0;
    let totalDrawers = 0;
    const slidesByNL: Record<number, number> = {};
    
    let totalStructureScrews = 0;
    let totalStructureMinifix = 0;
    let totalStructureDowels = 0;
    
    let totalDrawerScrews = 0;
    let totalDrawerMinifix = 0;
    let totalDrawerDowels = 0;
    
    let builtInOvensCount = 0;
    let builtInMicrowavesCount = 0;
    let portableMicrowavesCount = 0;
    let stoveFd90Count = 0;
    let fridgeSBSCount = 0;
    let hoodConic90Count = 0;
    let plantDecoCount = 0;
    let dishwasherCount = 0;
    let wallCabinetsCount = 0;
    let liftUpPistonsCount = 0;
    let zeroProtrusionHingesCount = 0;
    let biFoldInterHingesCount = 0;
    let biFoldPostHingesCount = 0;
    let extraCornerLLegsCount = 0;
    let ventGrillesCount = 0;
    
    const baseCabinets = cabinets.filter(c => c.type === 'base' || c.type === 'island' || c.type === 'tall');
    
    cabinets.forEach(cab => {
        if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) {
            if (cab.variant === 'deco_stove') stoveFd90Count += 1;
            else if (cab.variant === 'deco_fridge') fridgeSBSCount += 1;
            else if (cab.variant === 'deco_hood') hoodConic90Count += 1;
            else if (cab.variant === 'deco_plant') plantDecoCount += 1;
            else if (cab.variant === 'deco_dishwasher') dishwasherCount += 1;
            return;
        }

        if (cab.type === 'wall') {
            wallCabinetsCount += 1;
        }

        // Fijaciones estructurales por módulo
        const fixPoints = cab.type === 'tall' ? 36 : (cab.type === 'wall' ? 16 : 20);
        if (state.assemblyType === 'minifix') {
            totalStructureMinifix += fixPoints;
            totalStructureDowels += fixPoints * 2; // 2 tarugos por cada perno minifix de apoyo
        } else {
            totalStructureScrews += fixPoints;
            totalStructureDowels += 8; // Guías de tarugo para alineación
        }

        // Bisagras y Sistemas Elevadores
        if (cab.variant === '1_door' || cab.variant === '1_door_1_drawer' || cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind' || cab.variant?.startsWith('wall_corner_blind')) {
            totalHinges += 2;
        } else if (cab.variant === 'hospital_meson_1door') {
            totalHinges += 3; // 3 bisagras 90° de alto tráfico con amortiguador para puerta clínica de 90cm
        } else if (cab.variant === '2_doors') {
            totalHinges += 4;
        } else if (cab.variant === 'wall_lift_up') {
            liftUpPistonsCount += 2;
        } else if (cab.variant === 'wall_lift_up_double') {
            liftUpPistonsCount += 4;
        } else if (cab.variant === 'wall_microwave_niche') {
            liftUpPistonsCount += 2;
            portableMicrowavesCount += 1;
        } else if (cab.variant === 'tall_1_door') {
            totalHinges += 4;
        } else if (cab.variant === 'tall_2_doors') {
            totalHinges += 8;
        } else if (cab.variant === 'tall_split_2_doors') {
            totalHinges += 6; // 2 inferior + 4 superior
        } else if (cab.variant === 'tall_oven_micro' || cab.variant === 'tall_oven_vent') {
            totalHinges += 4; // 2 inferior + 2 superior
            builtInOvensCount += 1;
            builtInMicrowavesCount += 1;
            if (cab.variant === 'tall_oven_vent') {
                ventGrillesCount += 1;
            }
        } else if (cab.variant === 'tall_microwave_niche') {
            totalHinges += 5; // 2 inferior + 3 superior
            portableMicrowavesCount += 1;
        } else if (cab.variant === 'tall_inner_drawers') {
            zeroProtrusionHingesCount += 5; // Bisagras 155° codo cero p/ apertura completa sin interferencia con cajones
        } else if (cab.variant === 'corner_l' || cab.variant === 'base_corner_l') {
            biFoldInterHingesCount += 2; // Bisagras intermedias entre hojas bi-fold
            biFoldPostHingesCount += 2;  // Bisagras gran angular 170° a lateral
            extraCornerLLegsCount += 1;  // Pata central de refuerzo en rincón
        }
        
        // Cajones y Especieros Extraíbles
        let cabDrawers = 0;
        if (cab.variant === '4_drawers') cabDrawers = 4;
        if (cab.variant === '2_pot_drawers') cabDrawers = 2;
        if (cab.variant === '1_door_1_drawer') cabDrawers = 1;
        if (cab.variant === 'sink_u_drawer') cabDrawers = 2;
        if (cab.variant === 'tall_inner_drawers') cabDrawers = 4;
        if (cab.variant === 'spice_rack') cabDrawers = 1;

        if (cabDrawers > 0) {
            totalDrawers += cabDrawers;
            const innerDepthMm = (cab.depth - 5) * 10;
            const nl = getNominalSlideLength(innerDepthMm);
            slidesByNL[nl] = (slidesByNL[nl] || 0) + cabDrawers;

            // Armado de cajones
            if (state.drawerAssemblyType === 'minifix') {
                totalDrawerMinifix += cabDrawers * 8;
                totalDrawerDowels += cabDrawers * 8;
            } else {
                totalDrawerScrews += cabDrawers * 8; // Tornillos 4x40mm o 4x50mm
            }
        }
    });

    // 1. HERRAJES DE ARMADO (Minifix, Tarugos, Tornillos)
    if (state.assemblyType === 'minifix' || totalDrawerMinifix > 0) {
        const isHafele = state.drawerHardware === 'Hafele';
        const totalMinifix = totalStructureMinifix + totalDrawerMinifix;
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele ? 'Pernos Häfele Minifix + Cajas Excéntricas Häfele Minifix 15' : 'Pernos Minifix + Cajas Excéntricas 15mm',
            Cantidad: totalMinifix,
            Unidad: 'Juegos',
            Detalles: `Estructura (${totalStructureMinifix}) + Cajones (${totalDrawerMinifix})`
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tarugos de Madera 8x30mm',
            Cantidad: totalStructureDowels + totalDrawerDowels,
            Unidad: 'Unidades',
            Detalles: 'Encastre y alineación estructural mecanizada'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tapas Adhesivas Embellecedoras para Minifix (Ø15mm)',
            Cantidad: totalMinifix,
            Unidad: 'Unidades',
            Detalles: 'Ocultamiento estético de cajas excéntricas'
        });
    }

    if (state.assemblyType === 'spax' || totalDrawerScrews > 0) {
        if (totalStructureScrews > 0) {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tornillos Soberbio / Spax 4x50mm',
                Cantidad: totalStructureScrews,
                Unidad: 'Unidades',
                Detalles: 'Armado general de gabinetes y módulos'
            });
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tapas Adhesivas p/Tornillos',
                Cantidad: totalStructureScrews,
                Unidad: 'Unidades',
                Detalles: 'Tapa-tornillos al tono de la melamina'
            });
        }
        if (totalDrawerScrews > 0) {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tornillos Spax 4x40mm (Cajas de Cajón)',
                Cantidad: totalDrawerScrews,
                Unidad: 'Unidades',
                Detalles: 'Fijación de laterales y frentes/traseras de cajón'
            });
        }
        if (totalStructureDowels > 0 && state.assemblyType === 'spax') {
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tarugos de Madera 8x30mm (Guías)',
                Cantidad: totalStructureDowels,
                Unidad: 'Unidades',
                Detalles: 'Guías de centrado previo a atornillado'
            });
        }
    }

    // Tornillos de fijación frente de cajón
    if (totalDrawers > 0) {
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Frente de Cajón 4x30mm',
            Cantidad: totalDrawers * 4,
            Unidad: 'Unidades',
            Detalles: '4 tornillos por frente exterior'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Correderas a Lateral 3.5x16mm',
            Cantidad: totalDrawers * 12,
            Unidad: 'Unidades',
            Detalles: 'Fijación técnica de guías telescópicas'
        });
    }

    // 2. CORREDERAS DE CAJÓN (Quincallería con especificación y NL)
    Object.keys(slidesByNL).forEach(nlStr => {
        const nl = Number(nlStr);
        const qty = slidesByNL[nl];
        hardware.push({
            Categoria: 'Quincallería',
            Item: `${hwSpec.slideName} ${nl}mm (NL)`,
            Cantidad: qty,
            Unidad: 'Pares',
            Detalles: `Montaje bajo fondo para profundidad ${nl + 50}mm`
        });
    });

    const isHafele = kState.drawerHardware === 'Hafele';

    // 3. BISAGRAS Y SISTEMAS ELEVADORES (Quincallería)
    if (totalHinges > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele 
                ? 'Bisagras Cazoleta Häfele Metalla 310/500 110° Rectas (Cierre Suave con Freno Integrado)'
                : 'Bisagras Cazoleta 35mm Rectas (Cierre Suave)',
            Cantidad: totalHinges,
            Unidad: 'Unidades',
            Detalles: isHafele 
                ? 'Puertas exteriores; incluye placa base en cruz Häfele con regulación 3D excéntrica'
                : 'Puertas exteriores de gabinetes y despensas'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Bisagras 3.5x16mm',
            Cantidad: totalHinges * 4,
            Unidad: 'Unidades',
            Detalles: 'Para cazoleta y base de montaje'
        });
    }

    // Soportes de Repisa Interior (Pitones Niquelados Ø5mm)
    const totalShelvesCount = allParts
        .filter(p => p.name.startsWith('Repisa'))
        .reduce((sum, p) => sum + p.qty, 0);

    if (totalShelvesCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Soportes de Repisa Niquelados Ø5mm (Pitones con Retén/Goma)',
            Cantidad: totalShelvesCount * 4,
            Unidad: 'Unidades',
            Detalles: `Montaje y fijación regulable de repisas interiores (${totalShelvesCount} repisas x 4 soportes)`
        });
    }

    if (zeroProtrusionHingesCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele
                ? 'Bisagras Häfele Metalla 155° Codo Cero con Cierre Suave (Apertura Libre Gavetero)'
                : 'Bisagras Especiales 155°/165° Codo Cero (Apertura Libre Gavetero)',
            Cantidad: zeroProtrusionHingesCount,
            Unidad: 'Unidades',
            Detalles: 'Permite apertura de puerta a 155° dejando paso libre al 100% de los cajones interiores sin rozamiento'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Bisagras 3.5x16mm',
            Cantidad: zeroProtrusionHingesCount * 4,
            Unidad: 'Unidades',
            Detalles: 'Para bases y cazoletas de bisagra 155° codo cero'
        });
    }

    if (biFoldInterHingesCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele 
                ? 'Bisagras Rincón Häfele Bi-Fold Articuladas (Puerta Plegable Esquinero)'
                : 'Bisagras Rincón Bi-Fold Articuladas (Puerta Plegable Esquinero)',
            Cantidad: biFoldInterHingesCount,
            Unidad: 'Unidades',
            Detalles: 'Unión intermedia articulada entre las 2 hojas bi-fold del mueble esquinero en L'
        });
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele 
                ? 'Bisagras Gran Ángulo Häfele 165° Cierre Suave (Anclaje a Mueble)'
                : 'Bisagras Gran Ángulo 170° Cierre Suave (Anclaje a Mueble)',
            Cantidad: biFoldPostHingesCount,
            Unidad: 'Unidades',
            Detalles: 'Fijación de la hoja principal del mueble en L al lateral de la estructura'
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Bisagras Bi-Fold 3.5x16mm',
            Cantidad: (biFoldInterHingesCount + biFoldPostHingesCount) * 4,
            Unidad: 'Unidades',
            Detalles: 'Fijación de bisagras de rincón y gran ángulo'
        });
    }

    if (ventGrillesCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Rejilla de Ventilación Técnica Aluminio Anodizado (Ranurada Convección)',
            Cantidad: ventGrillesCount,
            Unidad: 'Unidades',
            Detalles: 'Ventilación técnica para torre de hornos empotrados y flujo convectivo'
        });
    }

    if (liftUpPistonsCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele 
                ? 'Sistema Elevable Häfele Free Flap / Free Fold (Amortiguación Soft-Close Multiposición)'
                : 'Pistones a Gas / Sistema Elevador Aventos (100N / Cierre Suave)',
            Cantidad: liftUpPistonsCount,
            Unidad: 'Unidades',
            Detalles: `${liftUpPistonsCount / 2} juego(s) p/ puertas abatibles superiores de muebles aéreos`
        });
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Fijación Sistema Elevador 3.5x16mm',
            Cantidad: liftUpPistonsCount * 4,
            Unidad: 'Unidades',
            Detalles: 'Anclaje a lateral y cara interior de puerta'
        });
    }

    // 4. COLGADORES PARA MUEBLES AÉREOS (Murales)
    if (wallCabinetsCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: isHafele 
                ? 'Colgadores Regulables Ocultos Häfele p/ Mueble Aéreo (Regulación 3D / 130kg por par)'
                : 'Colgadores Regulables Ocultos p/ Mueble Aéreo (Juego Izq/Der)',
            Cantidad: wallCabinetsCount,
            Unidad: 'Juegos',
            Detalles: 'Capacidad 130kg por par con regulación 3D'
        });
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Riel de Suspensión Metálico p/ Muro (Tira de Anclaje)',
            Cantidad: wallCabinetsCount,
            Unidad: 'Unidades',
            Detalles: 'Fijación a muro estructural'
        });
    }

    // 5. PATAS REGULABLES PARA MUEBLES BASE E ISLAS / BASTIDOR METÁLICO HOSPITALARIO
    const isHospitalMode = kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame';
    if (baseCabinets.length > 0) {
        if (isHospitalMode) {
            // Norma MC.2.02 SACYR: Perfil tubular de acero FE 30x50x1.5mm esmaltado blanco + patines reguladores
            // Bancada continua unificada e independiente: Criterio normativo por longitud total (L):
            // L <= 900 mm: 2 patas | 901-1900 mm: 3 patas | 1901-2500 mm: 4 patas | > 2500 mm: vanos <= 800mm
            let totalLinearSteelMm = 0;
            let totalLegPoints = 0;
            const legHeightMm = (kState.socleHeight || 30) * 10;
            const sortedBases = [...baseCabinets].sort((a, b) => (a.position?.[0] ?? 0) - (b.position?.[0] ?? 0));

            // Agrupar corridas continuas
            const runs: { lengthMm: number; depthMm: number; count: number }[] = [];
            let curRunLen = 0;
            let curRunDepth = 600;
            let curRunCount = 0;
            let prevEnd: number | null = null;

            for (const cab of sortedBases) {
                const cabW = Math.round(cab.width * 10);
                const cabD = Math.round((cab.depth || 60) * 10);
                const cabLeft = (cab.position?.[0] ?? 0) * 10 - cabW / 2;
                const cabRight = cabLeft + cabW;

                if (prevEnd !== null && Math.abs(cabLeft - prevEnd) > 40) {
                    if (curRunCount > 0) {
                        runs.push({ lengthMm: curRunLen, depthMm: curRunDepth, count: curRunCount });
                    }
                    curRunLen = cabW;
                    curRunDepth = cabD;
                    curRunCount = 1;
                } else {
                    curRunLen += cabW;
                    curRunDepth = Math.max(curRunDepth, cabD);
                    curRunCount++;
                }
                prevEnd = cabRight;
            }
            if (curRunCount > 0) {
                runs.push({ lengthMm: curRunLen, depthMm: curRunDepth, count: curRunCount });
            }

            for (const run of runs) {
                const L = run.lengthMm;
                const D = run.depthMm;
                let numLegs = 2;
                if (L <= 900) {
                    numLegs = 2;
                } else if (L <= 1900) {
                    numLegs = 3;
                } else if (L <= 2500) {
                    numLegs = 4;
                } else {
                    numLegs = 4 + Math.ceil((L - 2500) / 800);
                }
                totalLegPoints += numLegs * 2; // Frontales y traseras
                // 2 largueros longitudinales + numLegs travesaños transversales + numLegs*2 fustes verticales
                totalLinearSteelMm += (2 * L) + (numLegs * Math.max(100, D - 60)) + (numLegs * 2 * Math.max(100, legHeightMm - 44));
            }

            const runsCount = Math.max(1, runs.length);
            const totalLegs = Math.max(4, totalLegPoints);
            const linearSteelMm = Math.max(3000, totalLinearSteelMm);
            const steelBars6m = Math.max(1, Math.ceil((linearSteelMm * 1.1) / 6000));
            hardware.push({
                Categoria: 'Estructura Metálica',
                Item: 'Perfil Tubular FE 30x50x1.5mm Esmaltado Blanco (Barra 6m)',
                Cantidad: steelBars6m,
                Unidad: 'Barras',
                Detalles: `Estructura autoportante unificada según Plano Independiente MC.2.02 (${runsCount} bancada${runsCount > 1 ? 's' : ''} continua${runsCount > 1 ? 's' : ''}). Total: ${(linearSteelMm / 1000).toFixed(2)} m lineales de perfil tubular.`
            });
            hardware.push({
                Categoria: 'Quincallería',
                Item: 'Patín Regulador Nivelador Metálico Sanitario M10',
                Cantidad: totalLegs,
                Unidad: 'Unidades',
                Detalles: `Patines reguladores para apoyo y nivelación de estructura tubular independiente (${totalLegs} puntos de apoyo con base de goma antideslizante lavable).`
            });
        } else {
            const totalLegs = (baseCabinets.length * 4) + extraCornerLLegsCount;
            hardware.push({
                Categoria: 'Quincallería',
                Item: 'Patas Regulables 10-15cm para Mueble Base',
                Cantidad: totalLegs,
                Unidad: 'Unidades',
                Detalles: `Soporte nivelable de gabinetes inferiores${extraCornerLLegsCount > 0 ? ` (incluye ${extraCornerLLegsCount} pata central de rincón en L)` : ''}`
            });
            hardware.push({
                Categoria: 'Insumos',
                Item: 'Tornillos Fijación Patas Regulables 3.5x16mm',
                Cantidad: totalLegs * 4,
                Unidad: 'Unidades',
                Detalles: '4 tornillos por base de pata'
            });
        }
    }

    // 5.1 QUINCALLERÍA CLÍNICA ESPECIALIZADA (Ficha MC.2.02 SACYR)
    const hospitalMesonWithDrawersCount = cabinets.filter(c => c.variant === 'hospital_meson_3drawers' || c.hasLock).length;
    if (hospitalMesonWithDrawersCount > 0) {
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Cerradura Trampa ANVER (Control Insumos / Medicamentos)',
            Cantidad: hospitalMesonWithDrawersCount,
            Unidad: 'Unidades',
            Detalles: 'Cerradura trampa de alta seguridad montada en cajón superior (Ficha Técnica MC.2.02 SACYR)'
        });
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Corredera Telescópica 500mm sin cierre suave Ducasse (Cajones A-B)',
            Cantidad: hospitalMesonWithDrawersCount * 2,
            Unidad: 'Pares',
            Detalles: 'Guías telescópicas pesadas Ducasse 500mm para cajones A y B'
        });
        hardware.push({
            Categoria: 'Quincallería',
            Item: 'Corredera Telescópica 500mm con cierre suave Häfele (Cajón C)',
            Cantidad: hospitalMesonWithDrawersCount,
            Unidad: 'Pares',
            Detalles: 'Guías telescópicas pesadas Häfele 500mm con amortiguador integrado para gaveta inferior C'
        });
    }

    // 6. ELECTRODOMÉSTICOS Y DECORACIÓN
    if (builtInOvensCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Horno Eléctrico Empotrable 60cm', Cantidad: builtInOvensCount, Unidad: 'Unidades', Detalles: 'Nicho torre 60cm' });
    if (builtInMicrowavesCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Microondas Empotrado con Marco de Acero', Cantidad: builtInMicrowavesCount, Unidad: 'Unidades', Detalles: 'Nicho torre 38cm' });
    if (portableMicrowavesCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Microondas Portátil / Sobremesa 25L', Cantidad: portableMicrowavesCount, Unidad: 'Unidades', Detalles: 'Nicho abierto' });
    if (stoveFd90Count > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Cocina FDV FS UNIQUE 90 (Acero Inox - 5 Quemadores + Horno 107L)', Cantidad: stoveFd90Count, Unidad: 'Unidades', Detalles: 'SAP 13297' });
    if (fridgeSBSCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Refrigerador FDV SBS SIGNATURE 2.0 513L (Dark Inox)', Cantidad: fridgeSBSCount, Unidad: 'Unidades', Detalles: 'SAP 16692' });
    if (dishwasherCount > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Lavavajillas FDV Active 12C Silver (12 Cubiertos - Libre Instalación / Bajo Cubierta)', Cantidad: dishwasherCount, Unidad: 'Unidades', Detalles: 'SAP 15598 (Alto 845mm / 820mm sin tapa, Ancho 598mm, Fondo 600mm)' });
    if (hoodConic90Count > 0) hardware.push({ Categoria: 'Equipamiento', Item: 'Campana FDV New Conic 90 (Acero Inox - 780 m3/h - 3 Velocidades)', Cantidad: hoodConic90Count, Unidad: 'Unidades', Detalles: 'SAP 16309 (Ancho 898mm, Fondo 500mm, Iluminación LED 2x2W)' });
    if (plantDecoCount > 0) hardware.push({ Categoria: 'Decoración', Item: 'Planta Decorativa Interior con Macetero y Soporte de Madera', Cantidad: plantDecoCount, Unidad: 'Unidades', Detalles: 'Ambientación 3D' });

    // 7. ZÓCALO Y PERFILERÍA OPTIMIZADA A TIRAS DE 3000mm (3m)
    if (kState.showSocle && baseCabinets.length > 0) {
        const socleH = kState.socleHeight ?? 10;
        const socleSystem = calculateSocleSystem(baseCabinets, kState.walls, kState.roomConfig?.vertices, kState.socleFinish, socleH);
        const frontLengthMm = socleSystem.pieces.reduce((acc, p) => acc + p.length, 0) * 10;
        const lateralLengthMm = socleSystem.laterals.reduce((acc, l) => acc + l.depth, 0) * 10;
        const totalLinearLengthMm = frontLengthMm + lateralLengthMm;

        const straightJointsCount = socleSystem.straightJoints.length;
        const cornerJoints90Count = socleSystem.corners.length;
        const exposedFlanksCount = socleSystem.laterals.length;
        const socleStrips = Math.max(1, Math.ceil((totalLinearLengthMm * 1.05) / 3000));
        const socleFinishLabel = kState.socleFinish === 'black' ? 'Negro Mate' : 'Aluminio Satinado';

        hardware.push({
            Categoria: 'Zócalos',
            Item: `Zócalo de PVC/Aluminio con Sello de Agua (${socleFinishLabel} - Tira 3000mm / 3m)`,
            Cantidad: socleStrips,
            Unidad: 'Tiras',
            Detalles: `Protección hidrófuga perimetral ${socleH}cm en acabado ${socleFinishLabel}. Optimizado a tiras comerciales continuas de 3m (${(totalLinearLengthMm/1000).toFixed(2)} m lineales)`
        });
        if (straightJointsCount > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Perfil Unión Recta 180° para Zócalo (Empalme >3m)',
                Cantidad: straightJointsCount,
                Unidad: 'Unidades',
                Detalles: 'Continuidad técnica en tramos lineales superiores a 3000mm'
            });
        }
        if (cornerJoints90Count > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Conector Esquinero 90° para Zócalo',
                Cantidad: cornerJoints90Count,
                Unidad: 'Unidades',
                Detalles: 'Encuentros frontales y retornos en esquinas expuestas'
            });
        }
        if (exposedFlanksCount > 0) {
            hardware.push({
                Categoria: 'Zócalos',
                Item: 'Terminal / Tapa Final de Zócalo (Remate a Pared)',
                Cantidad: exposedFlanksCount,
                Unidad: 'Unidades',
                Detalles: 'Cierre lateral hermético hacia muro estructural'
            });
        }
        const totalClips = (baseCabinets.length * 2) + exposedFlanksCount;
        hardware.push({
            Categoria: 'Zócalos',
            Item: 'Pinzas / Clips de Fijación Zócalo a Pata',
            Cantidad: totalClips,
            Unidad: 'Unidades',
            Detalles: 'Enganche a presión sobre patas niveladoras'
        });
    }

    // 7. SISTEMA PERFIL GOLA (Provelcar x175 / x176) O TIRADORES CONVENCIONALES (GLOBALES Y POR MÓDULO)
    if (kState.golaSystem && kState.golaSystem !== 'none') {
        const golaRes = calculateGolaSystem(cabinets, kState.golaSystem);
        if (golaRes.hardwareItems.length > 0) {
            hardware.push(...golaRes.hardwareItems);
        }
    }

    // Desglose de tiradores por mueble (respetando configuración independiente o global heredada)
    const isGolaActive = kState.golaSystem && kState.golaSystem !== 'none';
    const handlesMap: Record<string, { item: string; details: string; count: number; screwCount: number }> = {};
    const kutzAsaCutsByFinish: Record<string, { finishName: string; cuts: number[] }> = {};

    const getCabinetHandlesCount = (cab: CabinetType): number => {
        if (cab.type === 'decoration' || cab.variant?.startsWith('deco_') || cab.variant === 'open' || cab.variant === 'wall_open' || cab.variant === 'tall_open' || cab.variant?.includes('wine_rack') || cab.variant === 'hospital_niche_open') {
            return 0;
        }
        const v = cab.variant || (cab.width > 60 ? '2_doors' : '1_door');
        if (v === 'hospital_meson_3drawers') {
            return 3;
        }
        if (v === 'hospital_meson_1door') {
            return 1;
        }
        if (v === '1_door' || v === 'spice_rack' || v === 'sink_1_door' || v === 'wall_1_door' || v === 'tall_1_door' || v === 'wall_lift_up' || v === 'wall_microwave_niche' || v === 'corner_l' || v === 'wall_corner_l' || v?.startsWith('corner_blind') || v === 'corner_blind' || v?.startsWith('wall_corner_blind')) {
            return 1;
        }
        if (v === '2_doors' || v === '1_door_1_drawer' || v === '2_drawers' || v === 'sink_2_doors' || v === 'sink_2_drawers_u' || v === 'wall_2_doors' || v === 'wall_lift_up_double' || v === 'tall_2_doors' || v === 'tall_split_2_doors' || v === 'tall_oven_micro' || v === 'tall_oven_vent' || v === 'tall_microwave_niche') {
            return 2;
        }
        if (v === '3_drawers' || v === '1_drawer_2_pot_drawers') {
            return 3;
        }
        if (v === 'tall_2_doors_4_drawers' || v === 'tall_6_drawers') {
            return 6;
        }
        return 1;
    };

    const getCabinetKutzCutsMm = (cab: CabinetType): number[] => {
        const v = cab.variant || (cab.width > 60 ? '2_doors' : '1_door');
        const singleW = Math.max(100, Math.round((cab.width - 0.6) * 10));
        const doubleDoorW = Math.max(100, Math.round(((cab.width - 0.9) / 2) * 10));

        if (v === 'hospital_meson_3drawers' || v === '3_drawers' || v === '1_drawer_2_pot_drawers') {
            return [singleW, singleW, singleW];
        }
        if (v === '4_drawers') {
            return [singleW, singleW, singleW, singleW];
        }
        if (v === '2_drawers' || v === '2_pot_drawers' || v === 'sink_2_drawers_u') {
            return [singleW, singleW];
        }
        if (v === '2_doors' || v === 'wall_2_doors' || v === 'tall_2_doors' || v === 'sink_2_doors') {
            return [doubleDoorW, doubleDoorW];
        }
        if (v === 'tall_split_2_doors' || v === 'tall_oven_micro' || v === 'tall_oven_vent' || v === 'tall_microwave_niche' || v === '1_door_1_drawer') {
            return [singleW, singleW];
        }
        if (v === 'tall_2_doors_4_drawers') {
            return [doubleDoorW, doubleDoorW, singleW, singleW, singleW, singleW];
        }
        if (v === 'tall_6_drawers') {
            return [singleW, singleW, singleW, singleW, singleW, singleW];
        }
        return [singleW];
    };

    cabinets.forEach(cab => {
        if (cab.type === 'decoration' || cab.variant?.startsWith('deco_')) return;
        const isBaseOrIsland = cab.type === 'base' || cab.type === 'island';
        // En sistema Gola, los muebles base/isla no llevan tiradores frontales
        if (isGolaActive && isBaseOrIsland) return;

        const count = getCabinetHandlesCount(cab);
        if (count <= 0) return;

        const hConfig = cab.handleConfig || kState.handleConfig;
        if (!hConfig || hConfig.model === 'none') return;

        const modelItem = HANDLE_CATALOG.find(m => m.id === hConfig.model);
        const modelName = modelItem?.name || 'Tirador Estándar';
        const finishKey = hConfig.finish || 'anodizado_inox';
        const finishName = (FINISH_LABELS[finishKey]) ? FINISH_LABELS[finishKey] : 'Anodizado Inox';

        if (hConfig.model === 'kutz_asa') {
            // Perfil continuo KUTZ: acotado al largo total de frentes para optimización a barras de 3000mm
            const cuts = getCabinetKutzCutsMm(cab);
            if (!kutzAsaCutsByFinish[finishKey]) {
                kutzAsaCutsByFinish[finishKey] = { finishName, cuts: [] };
            }
            kutzAsaCutsByFinish[finishKey].cuts.push(...cuts);
            return;
        }

        const lengthStr = (hConfig.lengthMm && hConfig.lengthMm > 0) ? `${hConfig.lengthMm}mm` : 'Punto Único';
        const key = `${hConfig.model}_${finishKey}_${hConfig.lengthMm || 0}`;

        const itemName = `Tirador / Manilla ${modelName} (${lengthStr} - ${finishName})`;
        const holeMultiplier = modelItem?.holeCount ?? 2;

        if (!handlesMap[key]) {
            handlesMap[key] = {
                item: itemName,
                details: `Fijación frontal/posterior ${modelItem?.isRearMount ? 'pestaña' : 'estándar'} para frentes y puertas`,
                count: 0,
                screwCount: 0
            };
        }
        handlesMap[key].count += count;
        handlesMap[key].screwCount += count * (holeMultiplier || 2);
    });

    // 7.1 Agregar Perfil Asa Corrida KUTZ Optimizado a Barras Comerciales de 3000mm (3m)
    Object.entries(kutzAsaCutsByFinish).forEach(([_, group]) => {
        if (group.cuts.length === 0) return;
        const barLengthMm = 3000;
        const sawKerfMm = 4;
        const sortedCuts = [...group.cuts].sort((a, b) => b - a);
        const bars: number[] = [];
        const totalLinearMm = group.cuts.reduce((s, c) => s + c, 0);

        for (const cut of sortedCuts) {
            let placed = false;
            for (let i = 0; i < bars.length; i++) {
                if (bars[i] + cut + sawKerfMm <= barLengthMm) {
                    bars[i] += cut + sawKerfMm;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                bars.push(cut);
            }
        }

        const totalBars = Math.max(1, bars.length);
        hardware.push({
            Categoria: 'Tiradores',
            Item: `Perfil Tirador Asa Corrida KUTZ 12/18 (${group.finishName} - Barra 3000mm / 3m)`,
            Cantidad: totalBars,
            Unidad: 'Barras',
            Detalles: `Optimización de corte en barras de 3.00 m (${(totalLinearMm / 1000).toFixed(2)} m lineales netos, ${group.cuts.length} cortes a medida total de frentes). Requiere mecanizado de rebaje 2×15mm en tablero 18mm.`
        });

        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos Autorroscantes 3.5x15mm para Perfil KUTZ',
            Cantidad: group.cuts.length * 4,
            Unidad: 'Unidades',
            Detalles: 'Fijación de pestaña posterior embutida sobre rebaje de frentes'
        });
    });

    let totalHandleScrews = 0;
    Object.values(handlesMap).forEach(h => {
        if (h.count > 0) {
            hardware.push({
                Categoria: 'Tiradores',
                Item: h.item,
                Cantidad: h.count,
                Unidad: 'Unidades',
                Detalles: h.details
            });
            totalHandleScrews += h.screwCount;
        }
    });

    if (totalHandleScrews > 0) {
        hardware.push({
            Categoria: 'Insumos',
            Item: 'Tornillos M4 x 22mm para Tiradores',
            Cantidad: totalHandleScrews,
            Unidad: 'Unidades',
            Detalles: 'Fijación posterior para frentes de 15/18mm'
        });
    }

    return hardware;
}

export function calculateKitchenBoardNesting(
  cabinets: CabinetType[],
  multiplier: number = 1,
  rawThickness: number = 1.8,
  customTextures: any[] = []
): (BoardResult & { label: string; materialName: string; materialCategory: string; thicknessMm: number; patternIndex?: number; patternCount?: number; slabIndicesRange?: string; totalPatternCount?: number })[] {
  const thicknessMm = Math.round((rawThickness >= 1.2 ? rawThickness : 1.8) * 10);
  const allParts = generateKitchenPartsList(cabinets);
  const boardGroups: Record<string, {
    key: string;
    label: string;
    materialCategory: 'doors' | 'structure' | 'backs' | 'hpl';
    materialName: string;
    color: string;
    thicknessMm: number;
    w: number;
    h: number;
    parts: NestingPart[];
  }> = {};

  const getColorName = (colorVal?: string) => {
    if (!colorVal) return 'Melamina Blanca';
    if (colorVal.startsWith('data:')) {
      const found = customTextures?.find((t: any) => t.url === colorVal);
      return found?.name || 'Textura Personalizada';
    }
    if (colorVal.startsWith('#')) {
      return DEFAULT_MELAMINE_NAMES[colorVal.toUpperCase()] || `Color ${colorVal}`;
    }
    const found = customTextures?.find((t: any) => t.url === colorVal);
    if (found) return found.name;
    const parts = colorVal.split('/');
    return parts[parts.length - 1].replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  };

  allParts.forEach((p, pIdx) => {
    const isFront = (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')) &&
                    !p.name.toLowerCase().includes('contrafrente') &&
                    !p.name.toLowerCase().includes('amarre') &&
                    !p.name.toLowerCase().includes('caja');
    const isBack = p.thickness === 3 || p.thickness === 3.5 || p.material === 'Melamina Fondo' || (p.name.includes('Fondo') && !p.name.includes('Soporte')) || (p.name.includes('Trasera') && !p.name.includes('Barra') && !p.name.includes('Caja Cajón'));
    const isHPL = isFront && (p.isHpl !== undefined ? p.isHpl : isHplFinish(p.material, undefined, cabinets.find(c => c.id === p.moduleId)));
    const partQty = p.qty * multiplier;

    let groupKey = '';
    let label = '';
    let materialCategory: 'doors' | 'structure' | 'backs' | 'hpl' = 'structure';
    let w = 2440;
    let h = 1830;
    let thick = thicknessMm;
    const matName = getColorName(p.material);

    if (isBack) {
      groupKey = `BACKS_${p.material || 'mdf3mm'}`;
      label = `PLANCHA DUROLAC / MDF 3MM (FONDOS Y TRASERAS) - COLOR: ${matName}${multiplier > 1 ? ` [LOTE ${multiplier} UN]` : ''}`;
      materialCategory = 'backs';
      thick = 3;
    } else if (isFront) {
      if (isHPL) {
        groupKey = `HPL_DOORS_${p.material || 'abet'}`;
        label = `PLANCHA LAMINADO HPL PUERTAS Y FRENTES 0.9MM (ABET LAMINATI) - COLOR: ${matName}${multiplier > 1 ? ` [LOTE ${multiplier} UN]` : ''}`;
        materialCategory = 'hpl';
        w = 3050;
        h = 1300;
        thick = 0.9;
      } else {
        groupKey = `MEL_DOORS_${p.material}`;
        label = `PLANCHA MELAMINA PUERTAS Y FRENTES ${thicknessMm}MM - COLOR: ${matName}${multiplier > 1 ? ` [LOTE ${multiplier} UN]` : ''}`;
        materialCategory = 'doors';
      }
    } else {
      groupKey = `MEL_STRUCT_${p.material}`;
      label = `PLANCHA MELAMINA ESTRUCTURA Y CAJONES ${thicknessMm}MM - COLOR: ${matName}${multiplier > 1 ? ` [LOTE ${multiplier} UN]` : ''}`;
      materialCategory = 'structure';
    }

    if (!boardGroups[groupKey]) {
      boardGroups[groupKey] = {
        key: groupKey,
        label,
        materialCategory,
        materialName: isHPL ? `${matName} (Laminado HPL)` : matName,
        color: p.material || '#FFFFFF',
        thicknessMm: thick,
        w,
        h,
        parts: []
      };
    }

    const isWoodGrain = p.material?.includes('roble') || p.material?.includes('nogal') || p.material?.includes('madera') || p.material?.includes('hickory') || p.material?.includes('wood');
    const allowRotation = isBack ? true : !isWoodGrain;

    if (isHPL) {
      boardGroups[groupKey].parts.push({
        id: `p-hpl-${pIdx}-${p.name}`,
        name: `${p.name} (HPL +1cm refilado)`,
        width: Math.round(p.width) + 10,
        length: Math.round(p.length) + 10,
        color: p.material || '#FFFFFF',
        qty: partQty,
        edgeL1: false,
        edgeL2: false,
        edgeW1: false,
        edgeW2: false,
        allowRotation: false
      });

      const subKey = 'MDF_CRUDO_SUSTRATO_18MM';
      if (!boardGroups[subKey]) {
        boardGroups[subKey] = {
          key: subKey,
          label: `PLANCHA MDF CRUDO 18MM (SUSTRATO BASE PUERTAS Y FRENTES HPL)${multiplier > 1 ? ` [LOTE ${multiplier} UN]` : ''}`,
          materialCategory: 'doors',
          materialName: 'MDF Crudo 18mm (Sustrato Base)',
          color: '#E2D9C8',
          thicknessMm: 18,
          w: 2440,
          h: 1830,
          parts: []
        };
      }
      boardGroups[subKey].parts.push({
        id: `p-mdf-${pIdx}-${p.name}`,
        name: `${p.name} (Sustrato MDF 18mm)`,
        width: Math.round(p.width),
        length: Math.round(p.length),
        color: '#E2D9C8',
        qty: partQty,
        edgeL1: false,
        edgeL2: false,
        edgeW1: false,
        edgeW2: false,
        allowRotation: true
      });
    } else {
      boardGroups[groupKey].parts.push({
        id: `p-${pIdx}-${p.name}`,
        name: p.name,
        width: Math.round(p.width),
        length: Math.round(p.length),
        color: p.material || '#FFFFFF',
        qty: partQty,
        edgeL1: isBack ? false : !!p.edgeL1,
        edgeL2: isBack ? false : !!p.edgeL2,
        edgeW1: isBack ? false : !!p.edgeW1,
        edgeW2: isBack ? false : !!p.edgeW2,
        allowRotation
      });
    }
  });

  const boardResults: (BoardResult & { label: string; materialName: string; materialCategory: string; thicknessMm: number })[] = [];
  const groupOrder = ['hpl', 'doors', 'structure', 'backs'];
  const sortedGroups = Object.values(boardGroups).sort((a, b) => {
    return groupOrder.indexOf(a.materialCategory) - groupOrder.indexOf(b.materialCategory);
  });

  let boardSeqId = 1;
  sortedGroups.forEach(group => {
    const res = optimizeNesting(group.parts, group.w, group.h, 3.2, 15);
    res.forEach(b => {
      boardResults.push({
        ...b,
        id: boardSeqId++,
        label: group.label,
        materialName: group.materialName,
        materialCategory: group.materialCategory,
        thicknessMm: group.thicknessMm
      });
    });
  });

  return groupIdenticalBoardPatterns(boardResults) as any;
}

