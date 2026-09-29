import { useStore } from '../store';
import { useKitchenStore, CabinetType } from '../store/kitchenStore';
import { useAdminStore, ManufacturingRateConfig, SupplyItem } from '../store/adminStore';
import { generateKitchenPartsList, generateKitchenHardwareList } from './kitchenManufacturing';
import { generateCountertopPieces } from './countertopNesting';

export interface B2BQuoteItem {
  category: 'tableros' | 'tapacantos' | 'herrajes' | 'manufactura' | 'cubierta' | 'armado';
  name: string;
  detail: string;
  qty: number;
  unit: string;
  unitCostClp: number;
  totalCostClp: number;
}

export interface ClientQuoteItem {
  id: string;
  category: string;
  title: string;
  description: string;
  totalClp: number;
}

export interface DualQuoteCalculation {
  // Metadatos y métricas de producción
  netPanelsAreaM2: number;
  partsCount: number;
  cabinetsCount: number;
  boardCountEstimated: number;
  edgeBandingTotalMeters: number;

  // Parámetros de manufactura
  manufacturingRatePerM2: number;
  enablePreAssembly: boolean;
  preAssemblyRatePerCabinet: number;

  // Desglose de Costos B2B (Costo directo para el Arquitecto / Diseñador)
  b2bItems: B2BQuoteItem[];
  subtotalMaterialsClp: number;
  subtotalHardwareClp: number;
  subtotalEdgeBandingClp: number;
  subtotalManufacturingClp: number; // m² netos * tarifa
  subtotalPreAssemblyClp: number;
  subtotalCountertopClp: number;
  
  totalB2BNetoClp: number;
  ivaB2BClp: number;
  totalB2BBrutoClp: number;

  // Desglose de Venta al Cliente Final (PVP)
  designerMarginPercent: number;
  designerAdditionalFeeClp: number;
  clientItems: ClientQuoteItem[];
  totalPvpNetoClp: number;
  ivaPvpClp: number;
  totalPvpBrutoClp: number;
  designerProfitClp: number;
}

export function calculateKitchenDualQuote(customMarginPercent?: number, customAdditionalFee?: number): DualQuoteCalculation {
  const kState = useKitchenStore.getState();
  const state = useStore.getState();
  const adminState = useAdminStore.getState();

  const cabinets = kState.cabinets;
  const rates = adminState.manufacturingRates;
  const supplies = adminState.supplies || [];

  const designerMarginPercent = customMarginPercent !== undefined 
    ? customMarginPercent 
    : (rates.defaultDesignerMarginPercent || 35);
  const designerAdditionalFeeClp = customAdditionalFee || 0;
  const multiplier = kState.unitQuantityMultiplier || 1;

  // 1. Generar despiece de producción
  const parts = generateKitchenPartsList(cabinets);
  const hardwareList = generateKitchenHardwareList(cabinets);

  // 2. M² NETOS DE PANELES MANUFACTURADOS (SIN MERMAS)
  let baseNetPanelsAreaM2 = 0;
  let basePartsCount = 0;
  let baseThinEdgeMm = 0;
  let baseThickEdgeMm = 0;

  parts.forEach((p) => {
    const areaPieceM2 = (p.length * p.width * p.qty) / 1000000;
    baseNetPanelsAreaM2 += areaPieceM2;
    basePartsCount += p.qty;

    const edgeMm = 
      (p.edgeL1 ? p.length : 0) +
      (p.edgeL2 ? p.length : 0) +
      (p.edgeW1 ? p.width : 0) +
      (p.edgeW2 ? p.width : 0);
    const totalEdgeMm = edgeMm * p.qty;
    const isFront = p.name.toLowerCase().includes('puerta') || 
                    p.name.toLowerCase().includes('frente') ||
                    p.name.toLowerCase().includes('tirador');
    if (isFront) {
      baseThickEdgeMm += totalEdgeMm;
    } else {
      baseThinEdgeMm += totalEdgeMm;
    }
  });

  // Redondeo a 2 decimales y escalado por multiplicador de lote
  const netPanelsAreaM2 = Math.round(baseNetPanelsAreaM2 * multiplier * 100) / 100;
  const partsCount = basePartsCount * multiplier;
  const cabinetsCount = cabinets.length * multiplier;

  // 3. COSTO DE MANUFACTURA INDUSTRIAL (Área neta * tarifa de backoffice)
  const manufacturingRatePerM2 = rates.manufacturingPricePerM2 || 14500;
  const subtotalManufacturingClp = Math.round(netPanelsAreaM2 * manufacturingRatePerM2);

  // 4. PRE-ARMADO / ENSAMBLE EN FÁBRICA
  const preAssemblyRatePerCabinet = rates.preAssemblyPricePerCabinet || 8500;
  const subtotalPreAssemblyClp = rates.enablePreAssembly ? cabinetsCount * preAssemblyRatePerCabinet : 0;

  // 5. COSTO DE TABLEROS & MELAMINA
  // En base al área y factor de aprovechamiento estándar de nesting (82%)
  const sheetUsefulM2 = 4.57 * 0.82; // ~3.75 m² útiles por plancha 1.83x2.50
  const boardCountEstimated = Math.max(1, Math.ceil(netPanelsAreaM2 / sheetUsefulM2));

  // Buscar precio de melamina en catálogo de insumos
  const melaminaSupply = supplies.find((s) => s.id === 'mel-18-diseno' || s.id === 'mel-18-blanco' || s.category === 'melamina');
  const boardPriceClp = melaminaSupply ? melaminaSupply.priceClp : 38500;
  const subtotalMaterialsClp = boardCountEstimated * boardPriceClp;

  // 6. COSTO DE TAPACANTOS (con 10% de merma de aplicación)
  const thinMeters = Math.round(((baseThinEdgeMm * multiplier) / 1000) * 1.1);
  const thickMeters = Math.round(((baseThickEdgeMm * multiplier) / 1000) * 1.1);
  const edgeBandingTotalMeters = thinMeters + thickMeters;

  const thinSupply = supplies.find((s) => s.id === 'canto-pvc-05');
  const thickSupply = supplies.find((s) => s.id === 'canto-pvc-20');
  const thinPrice = thinSupply ? thinSupply.priceClp : 320;
  const thickPrice = thickSupply ? thickSupply.priceClp : 750;

  const subtotalEdgeBandingClp = (thinMeters * thinPrice) + (thickMeters * thickPrice);

  // 7. COSTO DE HERRAJES & ACCESORIOS
  let subtotalHardwareClp = 0;
  const b2bHardwareItems: B2BQuoteItem[] = [];

  hardwareList.forEach((hw) => {
    const itemLower = hw.Item.toLowerCase();
    const catLower = hw.Categoria.toLowerCase();

    // Los tableros y planchas se cuantifican y cotizan en la categoría de tableros
    if (catLower === 'tableros' || itemLower.includes('plancha')) {
      return;
    }

    let unitPrice = 1800; // precio base por defecto

    if (itemLower.includes('bisagra') || catLower.includes('bisagra')) {
      const match = supplies.find((s) => s.id.includes('bisagra') || s.name.toLowerCase().includes('bisagra'));
      unitPrice = match ? match.priceClp : 2850;
    } else if (itemLower.includes('corredera') || catLower.includes('corredera')) {
      const match = supplies.find((s) => s.id.includes('corredera') || s.name.toLowerCase().includes('corredera'));
      unitPrice = match ? match.priceClp : 12500;
    } else if (itemLower.includes('pata') || itemLower.includes('nivelador')) {
      const match = supplies.find((s) => s.id.includes('pata') || s.name.toLowerCase().includes('pata'));
      unitPrice = match ? match.priceClp : 950;
    } else if (itemLower.includes('tirador') || itemLower.includes('gola') || catLower.includes('tirador')) {
      unitPrice = 7500;
    } else if (itemLower.includes('minifix') || itemLower.includes('perno') || itemLower.includes('tornillo')) {
      unitPrice = 180;
    }

    const itemQtyTotal = hw.Cantidad * multiplier;
    const itemTotal = itemQtyTotal * unitPrice;
    subtotalHardwareClp += itemTotal;

    b2bHardwareItems.push({
      category: 'herrajes',
      name: hw.Item,
      detail: `${hw.Categoria}${hw.Detalles ? ` - ${hw.Detalles}` : ''}${multiplier > 1 ? ` (${hw.Cantidad}/u)` : ''}`,
      qty: itemQtyTotal,
      unit: hw.Unidad || 'un',
      unitCostClp: unitPrice,
      totalCostClp: itemTotal,
    });
  });

  // 8. CUBIERTA QSTONE / GRANITO (Si está habilitada)
  let subtotalCountertopClp = 0;
  let countertopDetails = 'No incluye cubierta de piedra';

  if (kState.countertopConfig?.enabled) {
    try {
      const ctBOM = generateCountertopPieces(
        cabinets,
        kState.countertopConfig,
        kState.qstoneCatalog,
        kState.islandBackConfig,
        kState.walls,
        kState.architecturalElements,
        kState.roomConfig,
        multiplier
      );
      if (ctBOM && ctBOM.totalCostClp > 0) {
        subtotalCountertopClp = ctBOM.totalCostClp;
        countertopDetails = `${ctBOM.pieces.length * multiplier} tramos (${ctBOM.slabsCount} planchas totales)`;
      }
    } catch (e) {
      console.warn('Error calculando cubierta en cotización B2B:', e);
    }
  }

  // 9. CONSTRUCCIÓN DE LA LISTA B2B
  const b2bItems: B2BQuoteItem[] = [
    {
      category: 'tableros',
      name: 'Tableros Melamina Estándar / Diseño (1.83 x 2.50 m)',
      detail: `Cálculo para ${netPanelsAreaM2.toFixed(1)} m² netos de piezas (~${boardCountEstimated} planchas)`,
      qty: boardCountEstimated,
      unit: 'Planchas',
      unitCostClp: boardPriceClp,
      totalCostClp: subtotalMaterialsClp,
    },
    {
      category: 'tapacantos',
      name: 'Tapacantos PVC (0.45 mm / 2.0 mm) con Adhesivo',
      detail: `${thinMeters}m canto delgado + ${thickMeters}m canto frontal grueso`,
      qty: edgeBandingTotalMeters,
      unit: 'Metros',
      unitCostClp: Math.round(subtotalEdgeBandingClp / Math.max(1, edgeBandingTotalMeters)),
      totalCostClp: subtotalEdgeBandingClp,
    },
    ...b2bHardwareItems,
    {
      category: 'manufactura',
      name: 'Servicio de Manufactura CNC, Corte & Canteado',
      detail: `${netPanelsAreaM2.toFixed(1)} m² de paneles netos manufacturados (sin mermas) a $${manufacturingRatePerM2.toLocaleString('es-CL')}/m²`,
      qty: netPanelsAreaM2,
      unit: 'm² neto',
      unitCostClp: manufacturingRatePerM2,
      totalCostClp: subtotalManufacturingClp,
    },
  ];

  if (rates.enablePreAssembly && subtotalPreAssemblyClp > 0) {
    b2bItems.push({
      category: 'armado',
      name: 'Servicio de Pre-Armado y Escuadrado en Taller',
      detail: `Armado de ${cabinetsCount} módulos previo a entrega`,
      qty: cabinetsCount,
      unit: 'Módulos',
      unitCostClp: preAssemblyRatePerCabinet,
      totalCostClp: subtotalPreAssemblyClp,
    });
  }

  if (subtotalCountertopClp > 0) {
    b2bItems.push({
      category: 'cubierta',
      name: 'Cubierta Qstone / Piedra Sintetizada',
      detail: countertopDetails,
      qty: 1,
      unit: 'Global',
      unitCostClp: subtotalCountertopClp,
      totalCostClp: subtotalCountertopClp,
    });
  }

  // TOTAL B2B
  const totalB2BNetoClp = subtotalMaterialsClp + subtotalEdgeBandingClp + subtotalHardwareClp + subtotalManufacturingClp + subtotalPreAssemblyClp + subtotalCountertopClp;
  const ivaB2BClp = Math.round(totalB2BNetoClp * 0.19);
  const totalB2BBrutoClp = totalB2BNetoClp + ivaB2BClp;

  // 10. GENERACIÓN DE COTIZACIÓN COMERCIAL CLIENTE FINAL (PVP)
  // El margen del diseñador se aplica sobre el costo B2B neto
  // PVP = Costo B2B * (1 + margin/100) + additionalFee
  const marginMultiplier = 1 + (designerMarginPercent / 100);
  const basePvpMaterialsAndMfg = Math.round((subtotalMaterialsClp + subtotalEdgeBandingClp + subtotalManufacturingClp) * marginMultiplier);
  const basePvpHardware = Math.round(subtotalHardwareClp * marginMultiplier);
  const basePvpCountertop = subtotalCountertopClp > 0 ? Math.round(subtotalCountertopClp * marginMultiplier) : 0;
  const basePvpAssembly = subtotalPreAssemblyClp > 0 ? Math.round(subtotalPreAssemblyClp * marginMultiplier) : 0;

  const clientItems: ClientQuoteItem[] = [
    {
      id: 'pvp-1',
      category: 'Mobiliario a Medida',
      title: 'Muebles de Cocina Integrados (Bases, Murales & Columnas)',
      description: `Fabricación integral de ${cabinetsCount} módulos en tableros de melamina de alta densidad (${netPanelsAreaM2.toFixed(1)} m² de paneles). Canteado perimetral con adhesivo termofusible y mecanizados de ensamble de precisión milimétrica.`,
      totalClp: basePvpMaterialsAndMfg,
    },
    {
      id: 'pvp-2',
      category: 'Herrajes Europeos',
      title: 'Sistemas de Movimiento, Correderas y Bisagras Soft-Close',
      description: 'Herrajes técnicos con amortiguación integrada, sistemas de cajón de extracción suave, patas regulables y accesorios de armado oculto.',
      totalClp: basePvpHardware,
    },
  ];

  if (basePvpCountertop > 0) {
    clientItems.push({
      id: 'pvp-3',
      category: 'Superficie de Trabajo',
      title: 'Cubierta Técnica en Cuarzo / Piedra Sinterizada Qstone',
      description: `Suministro, dimensionado CNC y pulido perimetral de cubiertas según plano de distribución (${countertopDetails}).`,
      totalClp: basePvpCountertop,
    });
  }

  if (basePvpAssembly > 0 || designerAdditionalFeeClp > 0) {
    const serviceTotal = basePvpAssembly + designerAdditionalFeeClp;
    clientItems.push({
      id: 'pvp-4',
      category: 'Servicios Profesionales',
      title: 'Gestión Técnica, Pre-Armado e Instalación Especializada',
      description: 'Supervisión del proyecto, pre-armado y escuadrado en taller, coordinación logística y montaje en obra por maestros calificados.',
      totalClp: serviceTotal,
    });
  }

  const totalPvpNetoClp = clientItems.reduce((acc, it) => acc + it.totalClp, 0);
  const ivaPvpClp = Math.round(totalPvpNetoClp * 0.19);
  const totalPvpBrutoClp = totalPvpNetoClp + ivaPvpClp;
  const designerProfitClp = totalPvpNetoClp - totalB2BNetoClp;

  return {
    netPanelsAreaM2,
    partsCount,
    cabinetsCount,
    boardCountEstimated,
    edgeBandingTotalMeters,
    manufacturingRatePerM2,
    enablePreAssembly: rates.enablePreAssembly,
    preAssemblyRatePerCabinet,

    b2bItems,
    subtotalMaterialsClp,
    subtotalHardwareClp,
    subtotalEdgeBandingClp,
    subtotalManufacturingClp,
    subtotalPreAssemblyClp,
    subtotalCountertopClp,

    totalB2BNetoClp,
    ivaB2BClp,
    totalB2BBrutoClp,

    designerMarginPercent,
    designerAdditionalFeeClp,
    clientItems,
    totalPvpNetoClp,
    ivaPvpClp,
    totalPvpBrutoClp,
    designerProfitClp,
  };
}
