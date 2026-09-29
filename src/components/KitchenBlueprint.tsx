import React, { useState } from 'react';
import { Printer, Download, X, HelpCircle, FileText, CheckCircle2, Loader2, QrCode, Cpu, FileSpreadsheet, DollarSign, Edit3 } from 'lucide-react';
import { useStore } from '../store';
import { useKitchenStore, CabinetType } from '../store/kitchenStore';
import { analyzeRoomWalls } from '../utils/roomGeometry';
import { getCabinetBox2D } from '../utils/kitchenCollision';
import { Part } from '../utils/manufacturing';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS, getResolvedCabinetShelfElevations, isCabinetWithDoors, isCabinetWithSplitDoors, isHplFinish } from '../utils/kitchenManufacturing';
import { optimizeNesting, NestingPart, BoardResult, groupIdenticalBoardPatterns } from '../utils/nesting';
import { exportKitchenPDF } from '../utils/kitchenPdfGenerator';
import { exportBlueprintDomToPdf } from '../utils/blueprintPdfExport';
import { exportKitchenToExcel } from '../utils/kitchenExcelGenerator';
import { KitchenB2BQuoteModal } from './kitchen/KitchenB2BQuoteModal';
import { getFriendlyColorName } from '../utils/colorNames';
import { generateCountertopPieces } from '../utils/countertopNesting';
import { calculateCncMachiningForPart } from '../utils/kitchenCncMachining';
import { downloadPartDxfFile, downloadAllPartsDxf, downloadKitchenDxfZip } from '../utils/kitchenCncDxf';
import { exportKitchenLabelsPDF } from '../utils/kitchenLabelsPdfGenerator';
import { KitchenMepBlueprintSheet } from './kitchen/KitchenMepBlueprintSheet';
import { KitchenHospitalBaseFrameSheet } from './kitchen/KitchenHospitalBaseFrameSheet';

export function KitchenBlueprint() {
  const state = useStore();
  const kState = useKitchenStore();
  const [isExportingA3, setIsExportingA3] = useState(false);
  const [isExportingLabels, setIsExportingLabels] = useState(false);
  const [isExportingDxf, setIsExportingDxf] = useState(false);
  const [isB2BQuoteOpen, setIsB2BQuoteOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  // Estados persistentes para datos de proyecto y cliente
  const [projectName, setProjectName] = useState(() => localStorage.getItem('arquify_project_name') || 'PROYECTO COCINA ARQUIFY');
  const [clientName, setClientName] = useState(() => localStorage.getItem('arquify_client_name') || 'CLIENTE PARTICULAR');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  const [tempClientName, setTempClientName] = useState(clientName);

  if (!state.isPrinting) return null;

  const handleExportLabels = async () => {
    setIsExportingLabels(true);
    try {
      await exportKitchenLabelsPDF(kState.cabinets, state);
    } catch (err) {
      console.error('Error exportando etiquetas:', err);
      alert('Ocurrió un error al compilar las etiquetas de producción.');
    } finally {
      setIsExportingLabels(false);
    }
  };

  const handleExportAllDxf = async () => {
    setIsExportingDxf(true);
    try {
      const realCabs = kState.cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));
      const allParts = generateKitchenPartsList(realCabs);
      
      const getTypeName = (cab: CabinetType) => {
        if (cab.type === 'wall') return 'AEREO';
        if (cab.type === 'tall') return 'TORRE';
        if (cab.type === 'island') return 'ISLA';
        return 'BASE';
      };

      const groups = realCabs.map((cab, index) => {
        const cabParts = allParts.filter(p => p.moduleId === cab.id);
        const tagPrefix = cab.type === 'wall' ? 'A' : cab.type === 'tall' ? 'T' : cab.type === 'island' ? 'I' : 'B';
        const identTag = `${tagPrefix}-${index + 1}`;
        const typeName = getTypeName(cab);
        const wCm = Math.round(cab.width);
        const hCm = Math.round(cab.height);
        const dCm = Math.round(cab.depth);
        const numStr = (index + 1).toString().padStart(2, '0');
        const folderName = `${numStr}_MUEBLE_${typeName}_${wCm}x${hCm}x${dCm}cm_${identTag}`;

        const cncParts = cabParts.map(p => {
          return calculateCncMachiningForPart(
            p, 
            cab, 
            state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar', 
            state.assemblyType === 'minifix' ? 'minifix' : 'spax', 
            kState.golaSystem,
            kState.handleConfig
          );
        });

        return {
          folderName,
          cabinetTag: identTag,
          cabinetName: `${typeName} ${wCm}x${hCm}x${dCm}cm`,
          parts: cncParts
        };
      }).filter(g => g.parts.length > 0);

      await downloadKitchenDxfZip(groups, 'Cocina_Modular_Planos_CNC');
    } catch (err) {
      console.error('Error exportando paquete DXF:', err);
      alert('Ocurrió un error al compilar el paquete ZIP de archivos DXF.');
    } finally {
      setIsExportingDxf(false);
    }
  };

  const handleExportA3 = async () => {
    setIsExportingA3(true);
    setGeneratedPdfUrl(null);
    try {
      const url = await exportBlueprintDomToPdf('planos_fabricacion_cocina_A3.pdf', (curr, tot) => {
        setExportProgress({ current: curr, total: tot });
      });
      if (url) {
        setGeneratedPdfUrl(url);
      } else {
        alert('No se pudieron compilar las láminas A3. Puedes usar el botón "Imprimir" (Guardar como PDF) o la "Ficha Técnica PDF (Despiece / BOM)".');
      }
    } catch (err) {
      console.error('Error al exportar planos A3 en PDF', err);
      alert('Ocurrió un detalle al generar el archivo. También puedes utilizar el botón "Imprimir / Guardar".');
    } finally {
      setIsExportingA3(false);
      setExportProgress(null);
    }
  };

  let allParts: Part[] = [];
  try {
    allParts = generateKitchenPartsList(kState.cabinets);
  } catch (e: any) {
    console.error('Kitchen Blueprint error:', e);
  }
  
  const hwSpec = HARDWARE_SPECS[state.drawerHardware || 'Provelcar'] || HARDWARE_SPECS.Provelcar;
  const hardwareList = generateKitchenHardwareList(kState.cabinets);
  const rawThick = state.thickness || 1.8;
  const thicknessMm = Math.round((rawThick >= 1.2 ? rawThick : 1.8) * 10);
  const halfThickness = Number((thicknessMm / 2).toFixed(1));

  // Filtrar muebles reales (no decorativos)
  const realCabinets = kState.cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));

  // Agrupar piezas por gabinete y paginar
  const printPages: { 
    cab: CabinetType; 
    index: number; 
    identTag: string;
    parts: Part[]; 
    isContinuation: boolean; 
    pageSubIndex: number; 
    totalModPages: number;
    moduleParts: Part[];
  }[] = [];
  
  realCabinets.forEach((cab, index) => {
    const cabParts = allParts.filter(p => p.moduleId === cab.id);
    
    // Tag de identificación de etiqueta (A-1, B-1, T-1, etc.)
    const tagPrefix = cab.type === 'wall' ? 'A' : cab.type === 'tall' ? 'T' : cab.type === 'island' ? 'I' : 'B';
    const identTag = `${tagPrefix}-${index + 1}`;

    // Agrupar piezas únicas consolidando piezas idénticas de cajones (ej. Lateral Cajón (1), (2)... con mismas dimensiones)
    const uniqueParts: Part[] = [];
    cabParts.forEach(p => {
      // Normalizar nombre base quitando índice de cajón "(1)", "(2)" para agrupar piezas idénticas
      const baseName = p.name.replace(/\s*\(\d+\)/g, '').replace(/\(Cab \d+ [^)]+\)/g, '').trim();
      const existing = uniqueParts.find(up => {
        const upBaseName = up.name.replace(/\s*\(\d+\)/g, '').replace(/\(Cab \d+ [^)]+\)/g, '').trim();
        return (upBaseName === baseName || up.name === p.name) && 
          Math.abs(up.length - p.length) < 1 && 
          Math.abs(up.width - p.width) < 1 && 
          up.material === p.material &&
          up.thickness === p.thickness;
      });
      if (existing) {
        existing.qty += p.qty;
      } else {
        uniqueParts.push({ ...p, name: baseName || p.name });
      }
    });

    const partsPerPage = 8;
    const totalPages = Math.max(1, Math.ceil(uniqueParts.length / partsPerPage));
    
    for (let i = 0; i < totalPages; i++) {
      printPages.push({
        cab,
        index,
        identTag,
        parts: uniqueParts.slice(i * partsPerPage, (i + 1) * partsPerPage),
        isContinuation: i > 0,
        pageSubIndex: i + 1,
        totalModPages: totalPages,
        moduleParts: cabParts
      });
    }
  });

  // Helper para nombre de color
  const getColorName = (colorVal?: string) => getFriendlyColorName(colorVal, state.customTextures);

  // Nesting (Optimización de corte agrupada por material / sustrato)
  interface BoardGroupDef {
    key: string;
    label: string;
    materialCategory: 'doors' | 'structure' | 'backs' | 'hpl';
    materialName: string;
    color: string;
    thicknessMm: number;
    w: number;
    h: number;
    parts: NestingPart[];
  }

  const boardGroups: Record<string, BoardGroupDef> = {};
  const multiplier = kState.unitQuantityMultiplier || 1;

  allParts.forEach((p, pIdx) => {
    const isFront = (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')) &&
                    !p.name.toLowerCase().includes('contrafrente') &&
                    !p.name.toLowerCase().includes('amarre') &&
                    !p.name.toLowerCase().includes('caja');
    const isBack = p.thickness === 3 || p.thickness === 3.5 || p.material === 'Melamina Fondo' || (p.name.includes('Fondo') && !p.name.includes('Soporte')) || (p.name.includes('Trasera') && !p.name.includes('Barra') && !p.name.includes('Caja Cajón'));
    const isHPL = isFront && (p.isHpl !== undefined ? p.isHpl : isHplFinish(p.material, undefined, kState.cabinets.find(c => c.id === p.moduleId)));
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
      // 1. Plancha HPL Abet Laminati (3050 x 1300 mm): corte con sobremedida de +1 cm (+10 mm) en largo y ancho
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
        allowRotation: false // Respetar orientación de diseño en laminado Abet
      });

      // 2. Plancha MDF Crudo 18mm (Sustrato Base): corte a la medida final del mueble
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
        allowRotation: true // MDF crudo desnudo no tiene veta direccional, optimización libre para máxima eficiencia
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

  const groupedBoardResults = groupIdenticalBoardPatterns(boardResults);
  const boardPagesCount = groupedBoardResults.length;

  const ctBOM = generateCountertopPieces(kState.cabinets, kState.countertopConfig, kState.qstoneCatalog, kState.islandBackConfig, kState.walls, kState.architecturalElements, kState.roomConfig, multiplier);
  const stonePagesCount = (kState.countertopConfig?.enabled && ctBOM && ctBOM.pieces.length > 0) ? ctBOM.slabsLayout.length : 0;
  const hasMepPage = kState.mepPoints && kState.mepPoints.length > 0;
  const mepPagesCount = hasMepPage ? 1 : 0;
  const hasHospitalFramePage = (kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame') && kState.cabinets.some(c => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_'));
  const hospitalFramePagesCount = hasHospitalFramePage ? 1 : 0;

  // Paginación limpia de la lista de materiales e insumos (BOM) para evitar desborde en láminas A3
  const effectiveHardwareList = hardwareList.map(hw => {
    const isKerf = hw.Categoria === 'Mecanizado';
    const isCountertopSlab = hw.Categoria === 'Cubiertas' || (hw.Item.toLowerCase().includes('plancha cubierta') && ctBOM);
    const isCountertopGlue = hw.Categoria === 'Insumos' && (hw.Item.toLowerCase().includes('adhesivo bicomponente') || hw.Item.toLowerCase().includes('adhesivo epóxico')) && ctBOM;
    const isCountertopSealant = hw.Categoria === 'Insumos' && (hw.Item.toLowerCase().includes('sellador elastomérico') || hw.Item.toLowerCase().includes('silicona')) && ctBOM;
    const isBoard = hw.Categoria === 'Tableros';

    let finalQty = hw.Cantidad;
    let finalDetails = hw.Detalles || '';

    if (isCountertopSlab && ctBOM) {
      finalQty = Math.max(1, ctBOM.slabsCount);
      finalDetails = `Área neta útil: ${ctBOM.totalNetAreaM2.toFixed(2)} m² | Aprovechamiento est.: ${ctBOM.efficiencyPercent}% (${ctBOM.slabsLayout.map(s => s.patternCount && s.patternCount > 1 ? `${s.patternCount}x Patrón #${s.slabIndex}` : `Patrón #${s.slabIndex}`).join(' + ')})${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
    } else if (isCountertopGlue && ctBOM) {
      finalQty = Math.max(1, Math.ceil(ctBOM.totalLinearEdgeM * 0.35));
      finalDetails = `Pegado químico homogéneo sin poros ni juntas visibles (${ctBOM.totalLinearEdgeM.toFixed(1)} m lineales pulidos)${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
    } else if (isCountertopSealant && ctBOM) {
      finalQty = Math.max(1, Math.ceil(multiplier * 0.5));
      finalDetails = `Sellado perimetral posterior y estanqueidad contra muro${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
    } else if (isBoard) {
      const itemLower = hw.Item.toLowerCase();
      const decorMatch = hw.Item.match(/\(([^)]+)\)/);
      const decorFilter = decorMatch ? decorMatch[1].trim().toLowerCase() : '';

      const matchingPatterns = groupedBoardResults.filter(b => {
        const matLower = (b.materialName || '').toLowerCase();
        if (itemLower.includes('puertas') || itemLower.includes('frentes')) {
          if (itemLower.includes('mdf crudo') || itemLower.includes('sustrato')) {
            return matLower.includes('sustrato') || matLower.includes('mdf crudo');
          }
          if (itemLower.includes('hpl') || itemLower.includes('laminado')) {
            return b.materialCategory === 'hpl' && (!decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower));
          }
          if (b.materialCategory === 'doors') {
            return !decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower);
          }
          return false;
        }
        if (itemLower.includes('traseras') || itemLower.includes('fondos') || itemLower.includes('durolac')) {
          return b.materialCategory === 'backs';
        }
        if (itemLower.includes('estructura') || itemLower.includes('cajones')) {
          if (b.materialCategory === 'structure') {
            return !decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower);
          }
          return false;
        }
        return false;
      });

      if (matchingPatterns.length > 0) {
        const totalBoardsFromNesting = matchingPatterns.reduce((sum, p) => sum + (p.patternCount || 1), 0);
        finalQty = Math.max(1, totalBoardsFromNesting);

        const totalPlacedAreaM2 = matchingPatterns.reduce((sum, pat) => {
          const patArea = (pat.placedParts || []).reduce((a, pt) => a + (pt.w * pt.h), 0) / 1000000;
          return sum + (patArea * (pat.patternCount || 1));
        }, 0);

        const totalSheetsAreaM2 = matchingPatterns.reduce((sum, pat) => {
          const sheetArea = (pat.w * pat.h) / 1000000;
          return sum + (sheetArea * (pat.patternCount || 1));
        }, 0);

        const weightedEfficiency = totalSheetsAreaM2 > 0 ? ((totalPlacedAreaM2 / totalSheetsAreaM2) * 100).toFixed(1) : '0';
        const patternsStr = matchingPatterns.map(s => s.patternCount && s.patternCount > 1 ? `${s.patternCount}x Patrón #${s.patternIndex}` : `Patrón #${s.patternIndex}`).join(' + ');

        finalDetails = `Área neta: ${totalPlacedAreaM2.toFixed(2)} m² | Aprovechamiento est.: ${weightedEfficiency}% (${patternsStr})${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
      } else {
        if (typeof hw.Cantidad === 'number') {
          finalQty = Math.ceil(hw.Cantidad * multiplier);
        }
        if (finalDetails && multiplier > 1) {
          finalDetails = `${finalDetails} [Lote x${multiplier} un]`;
        }
      }
    } else if (!isKerf) {
      if (typeof hw.Cantidad === 'number') {
        finalQty = hw.Cantidad * multiplier;
      }
      if (finalDetails && multiplier > 1) {
        finalDetails = `${finalDetails} [Lote x${multiplier} un]`;
      }
    }

    return {
      ...hw,
      Cantidad: finalQty,
      Detalles: finalDetails
    };
  });

  const BOM_ITEMS_PER_PAGE = 15;
  const bomPagesCount = Math.max(1, Math.ceil(effectiveHardwareList.length / BOM_ITEMS_PER_PAGE));

  const totalDocPages = 1 + mepPagesCount + hospitalFramePagesCount + printPages.length + boardPagesCount + stonePagesCount + bomPagesCount;

  const getCabinetTypeName = (cab: CabinetType) => {
    if (cab.type === 'wall') return 'MUEBLE AÉREO / MURAL';
    if (cab.type === 'tall') return 'MUEBLE TORRE / DESPENSA';
    if (cab.type === 'island') return 'MUEBLE ISLA';
    return 'MUEBLE BASE';
  };

  /**
   * Renderizado Paramétrico Vectorial SVG Unificado por Pieza (Cotas, Tapacantos, Mecanizados)
   * Escala y centra matemáticamente la pieza y sus cotas dentro del viewBox SVG.
   * Calibrado para que la pieza y cotas ocupen ~80% del recuadro disponible con tipografías legibles (mínimo 9-11pt).
   */
  const renderUnifiedPartSVG = (part: Part, cab: CabinetType) => {
    const isFrenteCajon = part.name.includes("Frente Cajón");
    // En despiece industrial estándar, length es la dimensión longitudinal (ancho del frente de cajón) y width es la altura
    // Para visualización técnica horizontal en plano: pw debe ser la dimensión horizontal y pl la vertical
    const pw = Math.round(isFrenteCajon && part.length > part.width ? part.length : part.width);
    const pl = Math.round(isFrenteCajon && part.length > part.width ? part.width : part.length);
    const baseDim = Math.max(pw, pl, 200);

    const isLateral = part.name.includes("Lateral") && !part.name.includes("Cajón");
    const isPiso = part.name.includes("Piso") || (part.name.includes("Base") && !part.name.includes("Soporte Horno"));
    const isTecho = part.name.includes("Techo");
    const isBarraAmarre = part.name.includes("Barra") || part.name.includes("Amarre");
    const isRepisa = part.name.includes("Repisa") || part.name.includes("Divisor");
    const isPuerta = part.name.includes("Puerta");
    const isLateralCajon = part.name.includes("Lateral Cajón");

    const isMinifix = state.assemblyType === 'minifix';

    // Detección de mecanizados por cara para cálculo de paddings
    const hasTopMachining = isLateral || isFrenteCajon || ((isPiso || isTecho || isBarraAmarre) && isMinifix);
    const hasLeftMachining = isPuerta || isLateral || isFrenteCajon || isLateralCajon || ((isPiso || isTecho || isBarraAmarre) && isMinifix);

    const vMax = Math.max(pw, pl, 300);

    // Tipografía CAD nítida y calibrada para lámina A3 según norma ISO 128 / DIN
    const fSizeCotaGeneral = Math.max(32, Math.min(52, Math.round(vMax * 0.068)));
    // En piezas angostas (barras 100mm, laterales cajón) se ajusta proporcionalmente para no desbordar
    const fSizeCotaHoriz = Math.min(fSizeCotaGeneral, Math.max(24, Math.round(pw * 0.22)));
    const fSizeCotaVert = fSizeCotaGeneral;
    // Cota técnica de mecanizados (34, 32, 50, 15, 22.5, 9.5) - mínimo garantizado 22px
    const fSizeSm = Math.max(22, Math.min(34, Math.round(vMax * 0.048)));

    // Espesores de trazo normalizados (plumas técnicas de contorno, medio y auxiliar)
    const strokeThick = Math.max(2.4, Math.round(vMax * 0.0055));
    const strokeMed = Math.max(1.7, Math.round(vMax * 0.0038));
    const strokeThin = Math.max(1.2, Math.round(vMax * 0.0024));
    const haloWidth = Math.max(3.2, strokeMed * 2.0);

    const isNarrowPiece = isBarraAmarre || pw < 280;

    const isFrontPiece = part.name.includes("Puerta") || part.name.includes("Frente") || part.name.includes("Panel Ciego") || part.name.includes("Tapa");
    const isThickEdge = isFrontPiece ? (state.edgeBandingThicknessFronts || 2.0) >= 1.0 : (state.edgeBandingThicknessCabinets || 0.5) >= 1.0;
    const edgeColor = isThickEdge ? "#e11d48" : "#f97316";

    const COLOR_MAGENTA = "#c026d3"; // Cotas Generales de Corte (Magenta puro alta saturación)
    const COLOR_MINIFIX = "#15803d"; // Perforación Minifix Ø15/Ø8
    const COLOR_TARUGO = "#b91c1c";  // Perforación Tarugo Ø8x30
    const COLOR_SPAX = "#1d4ed8";    // Perforación Tornillo Spax Ø5
    const COLOR_DETALLE = "#1e40af"; // Cotas de Ejes y Perforaciones (Azul técnico alto contraste)
    const COLOR_CANAL = "#7e22ce";   // Canal Durolac

    // CÁLCULO RIGUROSO DE PADDINGS PARA EVITAR CORTES DE COTAS Y TEXTOS EN A3
    const padT = hasTopMachining 
      ? (isMinifix ? Math.max(88, Math.round(vMax * 0.18)) : Math.max(72, Math.round(vMax * 0.14))) 
      : Math.max(42, Math.round(vMax * 0.08));

    const padL = hasLeftMachining 
      ? Math.max(88, Math.round(vMax * 0.18)) 
      : Math.max(42, Math.round(vMax * 0.08));

    // Espacio inferior (padB): cotas de detalle + Cota General + Altura de texto
    const distB = isLateral ? Math.max(58, Math.round(vMax * 0.12)) : Math.max(48, Math.round(vMax * 0.10));
    const cotaBottomY = pl + distB;
    const padB = (cotaBottomY - pl) + fSizeCotaHoriz * 1.4 + 18;

    // Espacio derecho (padR): Cota General Vertical + Texto Rotado
    const distR = Math.max(48, Math.round(vMax * 0.10));
    const cotaRightX = pw + distR;
    const padR = (cotaRightX - pw) + fSizeCotaVert * 1.4 + 18;

    const viewBoxW = pw + padL + padR;
    const viewBoxH = pl + padT + padB;

    return (
      <svg 
        viewBox={`-${padL} -${padT} ${viewBoxW} ${viewBoxH}`} 
        className="w-full h-[225px] max-h-[240px] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 1. Superficie de la Pieza */}
        <rect 
          x={0} 
          y={0} 
          width={pw} 
          height={pl} 
          fill="#faf8f5" 
          stroke="#0f172a" 
          strokeWidth={strokeThick} 
        />

        {/* 2. Tapacantos en Bordes con Distintivo de Rombo */}
        {part.edgeW1 && (
          <g>
            <line x1={0} y1={0} x2={pw} y2={0} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw / 2},-${strokeThick * 2} ${pw / 2 + 5},-${strokeThick * 2 - 5} ${pw / 2},-${strokeThick * 2 - 10} ${pw / 2 - 5},-${strokeThick * 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeW2 && (
          <g>
            <line x1={0} y1={pl} x2={pw} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw / 2},${pl + strokeThick * 2} ${pw / 2 + 5},${pl + strokeThick * 2 + 5} ${pw / 2},${pl + strokeThick * 2 + 10} ${pw / 2 - 5},${pl + strokeThick * 2 + 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeL1 && (
          <g>
            <line x1={0} y1={0} x2={0} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`-${strokeThick * 2},${pl / 2} -${strokeThick * 2 - 5},${pl / 2 + 5} -${strokeThick * 2 - 10},${pl / 2} -${strokeThick * 2 - 5},${pl / 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
        {part.edgeL2 && (
          <g>
            <line x1={pw} y1={0} x2={pw} y2={pl} stroke={edgeColor} strokeWidth={strokeThick * 2} />
            <polygon points={`${pw + strokeThick * 2},${pl / 2} ${pw + strokeThick * 2 + 5},${pl / 2 + 5} ${pw + strokeThick * 2 + 10},${pl / 2} ${pw + strokeThick * 2 + 5},${pl / 2 - 5}`} fill={edgeColor} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}

        {/* 3. Cota General Horizontal Inferior (Magenta) - Nítida con Halo Blanco Antidesenfoque */}
        <g>
          <line x1={0} y1={cotaBottomY} x2={pw} y2={cotaBottomY} stroke={COLOR_MAGENTA} strokeWidth={strokeMed} />
          <line x1={0} y1={pl + 3} x2={0} y2={cotaBottomY + 6} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={pw} y1={pl + 3} x2={pw} y2={cotaBottomY + 6} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={-5} y1={cotaBottomY + 5} x2={5} y2={cotaBottomY - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <line x1={pw - 5} y1={cotaBottomY + 5} x2={pw + 5} y2={cotaBottomY - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <text 
            x={pw / 2} 
            y={cotaBottomY + fSizeCotaHoriz * 0.95 + 4} 
            fontSize={fSizeCotaHoriz} 
            fill={COLOR_MAGENTA} 
            stroke="#ffffff"
            strokeWidth={haloWidth}
            paintOrder="stroke fill"
            strokeLinejoin="round"
            fontWeight="900" 
            fontFamily="monospace"
            textAnchor="middle"
            textRendering="geometricPrecision"
          >
            {pw}
          </text>
        </g>

        {/* 4. Cota General Vertical Derecha (Magenta) - Nítida con Halo Blanco */}
        <g>
          <line x1={cotaRightX} y1={0} x2={cotaRightX} y2={pl} stroke={COLOR_MAGENTA} strokeWidth={strokeMed} />
          <line x1={pw + 3} y1={0} x2={cotaRightX + 6} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={pw + 3} y1={pl} x2={cotaRightX + 6} y2={pl} stroke={COLOR_MAGENTA} strokeWidth={strokeThin} strokeDasharray="4,2" />
          <line x1={cotaRightX - 5} y1={5} x2={cotaRightX + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <line x1={cotaRightX - 5} y1={pl + 5} x2={cotaRightX + 5} y2={pl - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeMed * 1.5} />
          <text 
            x={cotaRightX + fSizeCotaVert * 0.95 + 4} 
            y={pl / 2} 
            fontSize={fSizeCotaVert} 
            fill={COLOR_MAGENTA} 
            stroke="#ffffff"
            strokeWidth={haloWidth}
            paintOrder="stroke fill"
            strokeLinejoin="round"
            fontWeight="900" 
            fontFamily="monospace"
            textAnchor="middle"
            textRendering="geometricPrecision"
            transform={`rotate(90 ${cotaRightX + fSizeCotaVert * 0.95 + 4} ${pl / 2})`}
          >
            {pl}
          </text>
        </g>

        {/* 5. Mecanizados y Perforaciones Técnicas con Tipografía Grande y Definida */}
        {isLateral && (
          <g key="machining-lateral">
            {/* Canal Trasera / Durolac */}
            <line x1={pw - 15} y1={0} x2={pw - 15} y2={pl} stroke={COLOR_CANAL} strokeWidth={strokeMed} strokeDasharray="5,3" />
            <line x1={pw - 19} y1={0} x2={pw - 19} y2={pl} stroke={COLOR_CANAL} strokeWidth={strokeThin} strokeDasharray="5,3" />
            {/* Cota Canal Durolac a 15mm */}
            <line x1={pw - 15} y1={pl + 24} x2={pw} y2={pl + 24} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <line x1={pw - 15} y1={pl + 3} x2={pw - 15} y2={pl + 30} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <line x1={pw} y1={pl + 3} x2={pw} y2={pl + 30} stroke={COLOR_CANAL} strokeWidth={strokeThin} />
            <text x={pw - 7.5} y={pl + 20} fontSize={fSizeSm} fill={COLOR_CANAL} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {isMinifix ? (
              <g>
                {/* Perforaciones Minifix + Tarugo */}
                {[halfThickness, pl - halfThickness].map((yPos, i) => (
                  <g key={i}>
                    <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth={strokeThin} />
                    <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                    <circle cx={pw - 50} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill={COLOR_MINIFIX} stroke="#065f46" strokeWidth={strokeThin} />
                    <circle cx={pw - 82} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                  </g>
                ))}
                {/* Cotas Minifix Frontal: Tier 1 a 34mm, Tier 2 a 32mm */}
                <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>

                {/* Cotas Minifix Trasero: 50mm y 32mm */}
                <line x1={pw - 50} y1={-padT * 0.36} x2={pw} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw - 50} y1={-padT * 0.48} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw} y1={-padT * 0.48} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={pw - 25} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                {/* Cota vertical de canto: halfThickness desde bordes superior e inferior */}
                <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <line x1={-padL * 0.38} y1={pl - halfThickness} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl - halfThickness} x2={34} y2={pl - halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={pl - halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
              </g>
            ) : (
              <g>
                {/* Perforaciones Tornillo Soberbio Spax Ø5 */}
                {[halfThickness, pl - halfThickness].map((yPos, i) => (
                  <g key={i}>
                    <circle cx={50} cy={yPos} r={Math.max(5, Math.round(vMax * 0.014))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    <line x1={44} y1={yPos} x2={56} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                    <line x1={50} y1={yPos - 6} x2={50} y2={yPos + 6} stroke="#ffffff" strokeWidth={strokeThin} />
                    <circle cx={pw - 50} cy={yPos} r={Math.max(5, Math.round(vMax * 0.014))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    <line x1={pw - 56} y1={yPos} x2={pw - 44} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                    <line x1={pw - 50} y1={yPos - 6} x2={pw - 50} y2={yPos + 6} stroke="#ffffff" strokeWidth={strokeThin} />
                  </g>
                ))}
                {/* Cotas Horizontales Perforaciones Tornillos a 50mm */}
                <line x1={0} y1={-padT * 0.38} x2={50} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={50} y1={-padT * 0.50} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                <line x1={pw - 50} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw - 50} y1={-padT * 0.50} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={pw - 25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                {/* Cotas Verticales Perforaciones Tornillos: halfThickness */}
                <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={halfThickness} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <line x1={-padL * 0.38} y1={pl - halfThickness} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl - halfThickness} x2={50} y2={pl - halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={pl - halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>

                <text x={64} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.9)} fill={COLOR_SPAX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø5</text>
              </g>
            )}

            {/* Rebajes / Destajes CNC para Paso Continuo de Riel Gola (L Superior y C Intermedio) */}
            {((kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island')) && (
              <g key="cnc-machining-gola">
                {/* Rebaje Gola L Superior: 58mm alto x 26mm fondo en esquina frontal superior */}
                <rect 
                  x={0} 
                  y={0} 
                  width={26} 
                  height={58} 
                  fill="#fef3c7" 
                  stroke="#d97706" 
                  strokeWidth={strokeMed} 
                  strokeDasharray="4,2" 
                />
                <line x1={0} y1={0} x2={26} y2={58} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />
                <line x1={0} y1={58} x2={26} y2={0} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />

                {/* Cota fondo de rebaje: 26mm */}
                <line x1={0} y1={58 + 14} x2={26} y2={58 + 14} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={0} y1={58 + 7} x2={0} y2={58 + 21} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26} y1={58 + 7} x2={26} y2={58 + 21} stroke="#d97706" strokeWidth={strokeThin} />
                <text x={13} y={58 + 27} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">26</text>

                {/* Cota alto de rebaje: 58mm */}
                <line x1={26 + 14} y1={0} x2={26 + 14} y2={58} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26 + 7} y1={0} x2={26 + 21} y2={0} stroke="#d97706" strokeWidth={strokeThin} />
                <line x1={26 + 7} y1={58} x2={26 + 21} y2={58} stroke="#d97706" strokeWidth={strokeThin} />
                <text x={26 + 26} y={34} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="start" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">58</text>

                {/* Etiqueta CNC */}
                <text x={38} y={20} fontSize={Math.round(fSizeSm * 0.7)} fill="#b45309" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">CNC: REBAJE GOLA L 58x26</text>

                {/* Rebaje Gola C Intermedio si corresponde a cajoneras */}
                {(cab.variant === '1_door_1_drawer' || cab.variant === '2_pot_drawers' || cab.variant === '4_drawers' || part.notes?.includes('Gola C')) && (
                  (() => {
                    const golaCY = Math.round(pl * 0.35);
                    return (
                      <g key="cnc-gola-c">
                        <rect 
                          x={0} 
                          y={golaCY - 34} 
                          width={26} 
                          height={68} 
                          fill="#fef3c7" 
                          stroke="#d97706" 
                          strokeWidth={strokeMed} 
                          strokeDasharray="4,2" 
                        />
                        <line x1={0} y1={golaCY - 34} x2={26} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />
                        <line x1={0} y1={golaCY + 34} x2={26} y2={golaCY - 34} stroke="#d97706" strokeWidth={strokeThin * 0.7} strokeDasharray="2,2" />

                        {/* Cota alto 68mm */}
                        <line x1={26 + 14} y1={golaCY - 34} x2={26 + 14} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <line x1={26 + 7} y1={golaCY - 34} x2={26 + 21} y2={golaCY - 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <line x1={26 + 7} y1={golaCY + 34} x2={26 + 21} y2={golaCY + 34} stroke="#d97706" strokeWidth={strokeThin} />
                        <text x={26 + 26} y={golaCY + 6} fontSize={Math.round(fSizeSm * 0.8)} fill="#d97706" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="start" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">68</text>

                        {/* Etiqueta CNC */}
                        <text x={38} y={golaCY - 16} fontSize={Math.round(fSizeSm * 0.7)} fill="#b45309" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">CNC: REBAJE GOLA C 68x26</text>
                      </g>
                    );
                  })()
                )}
              </g>
            )}

            {/* Perforaciones para Soportes de Repisas Regulables (Pitones Ø5mm) con Evasión Anti-Colisión */}
            {isCabinetWithDoors(cab) && (() => {
              const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
              if (!shelfElevations || shelfElevations.length === 0) return null;

              const xFrontHole = 37;
              const xRearHole = Math.max(xFrontHole + 120, pw - 50);

              return (
                <g key="shelf-support-drilling">
                  {shelfElevations.map((elev, sIdx) => {
                    const elevMm = Math.round(elev * 10);
                    const yHole = pl - elevMm;
                    if (yHole <= 30 || yHole >= pl - 30) return null;

                    return (
                      <g key={`shelf-hole-${sIdx}`}>
                        {/* Línea de eje horizontal de apoyo */}
                        <line 
                          x1={xFrontHole - 12} 
                          y1={yHole} 
                          x2={xRearHole + 12} 
                          y2={yHole} 
                          stroke="#0284c7" 
                          strokeWidth={strokeThin * 0.75} 
                          strokeDasharray="4,2" 
                        />

                        {/* Perforación Frontal Ø5 */}
                        <circle 
                          cx={xFrontHole} 
                          cy={yHole} 
                          r={Math.max(4.5, Math.round(vMax * 0.012))} 
                          fill="#0284c7" 
                          stroke="#0369a1" 
                          strokeWidth={strokeThin} 
                        />
                        <line x1={xFrontHole - 5} y1={yHole} x2={xFrontHole + 5} y2={yHole} stroke="#ffffff" strokeWidth={strokeThin} />
                        <line x1={xFrontHole} y1={yHole - 5} x2={xFrontHole} y2={yHole + 5} stroke="#ffffff" strokeWidth={strokeThin} />

                        {/* Perforación Trasera Ø5 */}
                        <circle 
                          cx={xRearHole} 
                          cy={yHole} 
                          r={Math.max(4.5, Math.round(vMax * 0.012))} 
                          fill="#0284c7" 
                          stroke="#0369a1" 
                          strokeWidth={strokeThin} 
                        />
                        <line x1={xRearHole - 5} y1={yHole} x2={xRearHole + 5} y2={yHole} stroke="#ffffff" strokeWidth={strokeThin} />
                        <line x1={xRearHole} y1={yHole - 5} x2={xRearHole} y2={yHole + 5} stroke="#ffffff" strokeWidth={strokeThin} />

                        {/* Etiqueta Técnica de Mecanizado */}
                        <text 
                          x={(xFrontHole + xRearHole) / 2} 
                          y={yHole - 6} 
                          fontSize={Math.round(fSizeSm * 0.72)} 
                          fill="#0284c7" 
                          stroke="#ffffff" 
                          strokeWidth={haloWidth} 
                          paintOrder="stroke fill" 
                          strokeLinejoin="round" 
                          textAnchor="middle" 
                          fontWeight="900" 
                          fontFamily="monospace" 
                          textRendering="geometricPrecision"
                        >
                          {isCabinetWithSplitDoors(cab) 
                            ? (elevMm <= 700 ? `2x Ø5 SOP. REPISA INF (H=${elevMm})` : `2x Ø5 SOP. REPISA SUP (H=${elevMm})`)
                            : `2x Ø5 SOPORTE REPISA (H=${elevMm})`}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </g>
        )}

        {/* Perforaciones en Piso / Techo / Barra de Amarre / Repisa */}
        {(isPiso || isTecho || isBarraAmarre || isRepisa) && (
          <g key="machining-horizontal">
            {isNarrowPiece ? (
              // PIEZA ESTRECHA (Barra de amarre pw <= 280mm): 1 solo conjunto de ensamble sin solapamiento
              isMinifix ? (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={34} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      {pw >= 85 && (
                        <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                      )}
                    </g>
                  ))}
                  {/* Cota Tier 1: 34mm */}
                  <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                  {/* Cota Tier 2: 32mm al tarugo si la pieza tiene al menos 85mm de ancho */}
                  {pw >= 85 && (
                    <>
                      <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                      <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>
                    </>
                  )}

                  {/* Cota vertical 9.5mm a centro Minifix */}
                  <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
                  <text x={isNarrowPiece ? pw - 4 : 46} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.85)} fill={COLOR_MINIFIX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textAnchor={isNarrowPiece ? "end" : "start"} textRendering="geometricPrecision">Ø15</text>
                </>
              ) : (
                <>
                  {/* Spax en barra estrecha: 1 solo tornillo centrado a pw/2 */}
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={pw / 2} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                      <line x1={pw / 2 - 5} y1={yPos} x2={pw / 2 + 5} y2={yPos} stroke="#ffffff" strokeWidth={strokeThin} />
                      <line x1={pw / 2} y1={yPos - 5} x2={pw / 2} y2={yPos + 5} stroke="#ffffff" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  <line x1={0} y1={-padT * 0.38} x2={pw / 2} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw / 2} y1={-padT * 0.50} x2={pw / 2} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw / 4} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{Math.round(pw / 2)}</text>
                </>
              )
            ) : (
              // PIEZA ANCHA (Piso, Techo, Repisa pw > 280mm): Ensamble frontal y trasero
              isMinifix ? (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={34} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={34} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      <circle cx={66} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(6, Math.round(vMax * 0.016))} fill="none" stroke={COLOR_MINIFIX} strokeWidth={strokeMed} strokeDasharray="3,2" />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(3, Math.round(vMax * 0.008))} fill={COLOR_MINIFIX} />
                      <circle cx={pw - 82} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_TARUGO} stroke="#991b1b" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  {/* Frontal: 34 y 32 */}
                  <line x1={0} y1={-padT * 0.36} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.48} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.48} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={17} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">34</text>

                  <line x1={34} y1={-padT * 0.72} x2={66} y2={-padT * 0.72} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={34} y1={-padT * 0.84} x2={34} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={66} y1={-padT * 0.84} x2={66} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={50} y={-padT * 0.72 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">32</text>

                  {/* Trasero: 50 y 32 */}
                  <line x1={pw - 50} y1={-padT * 0.36} x2={pw} y2={-padT * 0.36} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw - 50} y1={-padT * 0.48} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw} y1={-padT * 0.48} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw - 25} y={-padT * 0.36 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                  {/* Cota vertical 9.5mm a centro Minifix */}
                  <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={-padL * 0.50} y1={halfThickness} x2={34} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={-padL * 0.62} y={halfThickness / 2 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">{halfThickness}</text>
                  <text x={46} y={halfThickness + fSizeSm * 0.38} fontSize={Math.round(fSizeSm * 0.9)} fill={COLOR_MINIFIX} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø15</text>
                </>
              ) : (
                <>
                  {[halfThickness, pl - halfThickness].map((yPos, i) => (
                    <g key={i}>
                      <circle cx={50} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                      <circle cx={pw - 50} cy={yPos} r={Math.max(4.5, Math.round(vMax * 0.012))} fill={COLOR_SPAX} stroke="#1e40af" strokeWidth={strokeThin} />
                    </g>
                  ))}
                  <line x1={0} y1={-padT * 0.38} x2={50} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={50} y1={-padT * 0.50} x2={50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>

                  <line x1={pw - 50} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw - 50} y1={-padT * 0.50} x2={pw - 50} y2={halfThickness} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                  <text x={pw - 25} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">50</text>
                </>
              )
            )}
          </g>
        )}

        {/* Cazoletas de Bisagra en Puertas */}
        {isPuerta && (
          <g key="machining-door">
            {[90, pl - 90].map((hy, idx) => (
              <g key={idx}>
                <circle cx={22.5} cy={hy} r={Math.max(16, Math.round(vMax * 0.040))} fill="none" stroke="#ea580c" strokeWidth={strokeMed} strokeDasharray="3,2" />
                <circle cx={22.5} cy={hy} r={Math.max(3.5, Math.round(vMax * 0.010))} fill="#ea580c" />
                <line x1={12} y1={hy} x2={33} y2={hy} stroke="#ea580c" strokeWidth={strokeThin} />
                <line x1={22.5} y1={hy - 10} x2={22.5} y2={hy + 10} stroke="#ea580c" strokeWidth={strokeThin} />
                <text x={48} y={hy + fSizeSm * 0.35} fontSize={fSizeSm} fill="#ea580c" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Ø35</text>
              </g>
            ))}
            {/* Cota horizontal eje a 22.5mm */}
            <line x1={0} y1={90 - 32} x2={22.5} y2={90 - 32} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={0} y1={90 - 40} x2={0} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={22.5} y1={90 - 40} x2={22.5} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={11.25} y={90 - 35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">22.5</text>

            {/* Cotas verticales eje a 90mm de extremos */}
            <line x1={-padL * 0.40} y1={0} x2={-padL * 0.40} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={90} x2={22.5} y2={90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.65} y={45} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision" transform={`rotate(-90 -${padL * 0.65} 45)`}>90</text>

            <line x1={-padL * 0.40} y1={pl - 90} x2={-padL * 0.40} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={pl - 90} x2={22.5} y2={pl - 90} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.52} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.65} y={pl - 45} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision" transform={`rotate(-90 -${padL * 0.65} ${pl - 45})`}>90</text>

            {/* Perforaciones de Tirador en Puerta (lado opuesto a bisagras - Cotas limpias sin colisión) */}
            {(() => {
              const hConf = kState.handleConfig;
              const isGola = kState.golaSystem !== 'none';
              if (isGola || !hConf || hConf.model === 'none') return null;

              const isSingleHole = hConf.model === 'balin' || hConf.model === 'berlin';
              const isRearPestana = hConf.model === 'ce' || hConf.model === 'oslo';
              const handleX = pw - 45;
              const handleCenterY = 70;

              if (isRearPestana) {
                return (
                  <g key="door-handle-pestana">
                    <line x1={pw - 120} y1={6} x2={pw} y2={6} stroke="#2563eb" strokeWidth={strokeMed} strokeDasharray="4,2" />
                    <text x={pw - 60} y={24} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Tirador Pestaña Trasero</text>
                  </g>
                );
              }

              if (isSingleHole) {
                return (
                  <g key="door-handle-single">
                    <circle cx={handleX} cy={handleCenterY} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={handleX - 8} y1={handleCenterY} x2={handleX + 8} y2={handleCenterY} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={handleX} y1={handleCenterY - 8} x2={handleX} y2={handleCenterY + 8} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    {/* Cota horizontal 45mm hacia el canto */}
                    <line x1={handleX} y1={handleCenterY - 18} x2={pw} y2={handleCenterY - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX} y1={handleCenterY - 24} x2={handleX} y2={handleCenterY - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={pw} y1={handleCenterY - 24} x2={pw} y2={handleCenterY - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                    <text x={handleX + 22.5} y={handleCenterY - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">45</text>
                    {/* Cota vertical 70mm interior (sin invadir el exterior derecho) */}
                    <line x1={handleX - 25} y1={0} x2={handleX - 25} y2={handleCenterY} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX - 30} y1={0} x2={pw} y2={0} stroke="#2563eb" strokeWidth={strokeThin} />
                    <line x1={handleX - 30} y1={handleCenterY} x2={handleX} y2={handleCenterY} stroke="#2563eb" strokeWidth={strokeThin} />
                    <text x={handleX - 32} y={38} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">70</text>
                    {/* Etiqueta hacia el interior */}
                    <text x={handleX - 10} y={handleCenterY + 20} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">Ø4.5 Pomo</text>
                  </g>
                );
              }

              const hLen = hConf.lengthMm || 128;
              const y1 = handleCenterY;
              const y2 = handleCenterY + hLen;
              const cotaX = handleX - 25;
              const cotaY70X = handleX - 48;

              return (
                <g key="door-handle-double">
                  {/* Taladros Pasantes Ø4.5 */}
                  <circle cx={handleX} cy={y1} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <circle cx={handleX} cy={y2} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  {/* Cruz de centro */}
                  <line x1={handleX - 6} y1={y1} x2={handleX + 6} y2={y1} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1 - 6} x2={handleX} y2={y1 + 6} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX - 6} y1={y2} x2={handleX + 6} y2={y2} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y2 - 6} x2={handleX} y2={y2 + 6} stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1} x2={handleX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} strokeDasharray="3,2" />

                  {/* Cota entre ejes de tirador hacia el INTERIOR (despejada de bordes y cotas exteriores) */}
                  <line x1={cotaX} y1={y1} x2={cotaX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaX - 5} y1={y1} x2={handleX} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaX - 5} y1={y2} x2={handleX} y2={y2} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={cotaX - 7} y={(y1 + y2) / 2 + 4} fontSize={Math.round(fSizeSm * 0.9)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="900" fontFamily="monospace">{hLen}</text>

                  {/* Cota horizontal 45mm superior */}
                  <line x1={handleX} y1={y1 - 18} x2={pw} y2={y1 - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={handleX} y1={y1 - 24} x2={handleX} y2={y1 - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={pw} y1={y1 - 24} x2={pw} y2={y1 - 12} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={handleX + 22.5} y={y1 - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">45</text>

                  {/* Cota vertical 70mm al canto superior (interna) */}
                  <line x1={cotaY70X} y1={0} x2={cotaY70X} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaY70X - 5} y1={0} x2={pw} y2={0} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cotaY70X - 5} y1={y1} x2={cotaX} y2={y1} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={cotaY70X - 7} y={38} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">70</text>

                  {/* Etiqueta técnica orientada al interior para evitar desborde */}
                  <text x={handleX - 10} y={y2 + 22} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="end" fontWeight="bold">2x Ø4.5 Tirador</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Frentes de Cajón: Perforaciones de fijación y tirador */}
        {isFrenteCajon && (
          <g key="machining-frente-cajon">
            {/* Ejes de fijación caja cajón a 15mm */}
            <line x1={15} y1={0} x2={15} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
            <line x1={pw - 15} y1={0} x2={pw - 15} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
            <circle cx={15} cy={35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={15} cy={pl - 35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={pw - 15} cy={35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
            <circle cx={pw - 15} cy={pl - 35} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />

            {/* Cota horizontal 15mm superior izquierda */}
            <line x1={0} y1={-padT * 0.38} x2={15} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={15} y1={-padT * 0.50} x2={15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={7.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {/* Cota horizontal 15mm superior derecha */}
            <line x1={pw - 15} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={pw - 15} y1={-padT * 0.50} x2={pw - 15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={pw - 7.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">15</text>

            {/* Cota vertical 35mm a tornillo */}
            <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <line x1={-padL * 0.50} y1={35} x2={15} y2={35} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
            <text x={-padL * 0.62} y={18 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">35</text>

            {/* Perforaciones de Tirador Paramétrico */}
            {(() => {
              const hConf = kState.handleConfig;
              const isGola = kState.golaSystem !== 'none';
              if (isGola || !hConf || hConf.model === 'none') return null;

              const isSingleHole = hConf.model === 'balin' || hConf.model === 'berlin';
              const isRearPestana = hConf.model === 'ce' || hConf.model === 'oslo';
              const cy = pl / 2;

              if (isRearPestana) {
                return (
                  <g key="cajon-handle-pestana">
                    <line x1={pw / 2 - 100} y1={6} x2={pw / 2 + 100} y2={6} stroke="#2563eb" strokeWidth={strokeMed} strokeDasharray="4,2" />
                    <text x={pw / 2} y={22} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Tirador Pestaña Superior</text>
                  </g>
                );
              }

              if (isSingleHole) {
                return (
                  <g key="cajon-handle-single">
                    <circle cx={pw / 2} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={pw / 2 - 8} y1={cy} x2={pw / 2 + 8} y2={cy} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <line x1={pw / 2} y1={cy - 8} x2={pw / 2 + 8} y2={cy} stroke="#1d4ed8" strokeWidth={strokeThin} />
                    <text x={pw / 2} y={cy + 18} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">Ø4.5 Tirador Botón</text>
                  </g>
                );
              }

              const hLen = hConf.lengthMm || 128;
              if (pw < hLen + 40) return null;

              const cx1 = pw / 2 - hLen / 2;
              const cx2 = pw / 2 + hLen / 2;

              return (
                <g key="cajon-handle-double">
                  <circle cx={cx1} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <circle cx={cx2} cy={cy} r={Math.max(4.5, Math.round(vMax * 0.012))} fill="#2563eb" stroke="#1d4ed8" strokeWidth={strokeThin} />
                  <line x1={cx1} y1={cy} x2={cx2} y2={cy} stroke="#2563eb" strokeWidth={strokeThin} strokeDasharray="4,2" />
                  {/* Cota horizontal entre centros */}
                  <line x1={cx1} y1={cy - 18} x2={cx2} y2={cy - 18} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cx1} y1={cy - 24} x2={cx1} y2={cy} stroke="#2563eb" strokeWidth={strokeThin} />
                  <line x1={cx2} y1={cy - 24} x2={cx2} y2={cy} stroke="#2563eb" strokeWidth={strokeThin} />
                  <text x={pw / 2} y={cy - 22} fontSize={Math.round(fSizeSm * 0.85)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="900" fontFamily="monospace">{hLen}</text>
                  <text x={pw / 2} y={cy + 18} fontSize={Math.round(fSizeSm * 0.8)} fill="#2563eb" stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" textAnchor="middle" fontWeight="bold">2x Ø4.5 Tirador ({hLen}mm)</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Laterales de Cajón: Perforaciones para corredera y ensamble */}
        {isLateralCajon && (
          <g key="machining-lateral-cajon">
            {pl >= pw ? (
              // Pieza orientada con profundidad longitudinal en Y
              <g>
                <line x1={pw - 25} y1={15} x2={pw - 25} y2={pl - 15} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
                <circle cx={pw - 25} cy={37} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
                <circle cx={pw - 25} cy={pl - 37} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />

                {/* Cota horizontal 25mm al borde inferior */}
                <line x1={pw - 25} y1={-padT * 0.38} x2={pw} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw - 25} y1={-padT * 0.50} x2={pw - 25} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={pw} y1={-padT * 0.50} x2={pw} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={pw - 12.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">25</text>

                {/* Cota vertical 37mm */}
                <line x1={-padL * 0.38} y1={0} x2={-padL * 0.38} y2={37} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={0} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={37} x2={pw - 25} y2={37} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={18.5 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">37</text>

                {/* Texto sobre el eje con espacio suficiente */}
                <text 
                  x={pw - 32} 
                  y={pl / 2} 
                  fontSize={Math.round(fSizeSm * 0.85)} 
                  fill={COLOR_DETALLE} 
                  stroke="#ffffff" 
                  strokeWidth={haloWidth} 
                  paintOrder="stroke fill" 
                  strokeLinejoin="round" 
                  textAnchor="middle" 
                  fontWeight="900" 
                  fontFamily="monospace" 
                  textRendering="geometricPrecision"
                  transform={`rotate(-90 ${pw - 32} ${pl / 2})`}
                >
                  Eje Corredera Ø4
                </text>
              </g>
            ) : (
              // Pieza orientada con profundidad longitudinal en X
              <g>
                <line x1={15} y1={pl - 25} x2={pw - 15} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} strokeDasharray="4,2" />
                <circle cx={37} cy={pl - 25} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />
                <circle cx={pw - 37} cy={pl - 25} r={Math.max(4, Math.round(vMax * 0.012))} fill={COLOR_SPAX} />

                {/* Cota horizontal 37mm */}
                <line x1={0} y1={-padT * 0.38} x2={37} y2={-padT * 0.38} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={0} y1={-padT * 0.50} x2={0} y2={0} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={37} y1={-padT * 0.50} x2={37} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={18.5} y={-padT * 0.38 - 6} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">37</text>

                {/* Cota vertical 25mm eje corredera */}
                <line x1={-padL * 0.38} y1={pl - 25} x2={-padL * 0.38} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl - 25} x2={37} y2={pl - 25} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <line x1={-padL * 0.50} y1={pl} x2={0} y2={pl} stroke={COLOR_DETALLE} strokeWidth={strokeThin} />
                <text x={-padL * 0.62} y={pl - 12 + fSizeSm * 0.35} fontSize={fSizeSm} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">25</text>
                <text x={pw / 2} y={pl - 32} fontSize={Math.round(fSizeSm * 0.85)} fill={COLOR_DETALLE} stroke="#ffffff" strokeWidth={haloWidth} paintOrder="stroke fill" strokeLinejoin="round" textAnchor="middle" fontWeight="900" fontFamily="monospace" textRendering="geometricPrecision">Eje Corredera Ø4</text>
              </g>
            )}
          </g>
        )}
      </svg>
    );
  };

  /**
   * Renderizado Paramétrico de las 3 Vistas Ortogonales del Módulo (Planta, Frontal, Lateral)
   * 100% Vectorial SVG con cotas magenta arquitectónicas y líneas de extensión sin cortes.
   */
  const renderCabinetOrthographicViews = (cab: CabinetType) => {
    const cabW = Math.round(cab.width * 10);
    const cabD = Math.round(cab.depth * 10);
    const cabH = Math.round(cab.height * 10);

    const legsH = (cab.type === 'base' || cab.type === 'tall' || cab.type === 'island') ? ((kState.socleHeight ?? 10) * 10) : 0;
    const bodyH = cabH - legsH;

    // VISTA DE PLANTA: cotas en TOP (Ancho) y RIGHT (Profundidad)
    const baseDimP = Math.max(cabW, cabD, 400);
    const padLeftP = Math.max(25, Math.round(cabW * 0.05));
    const padTopP = Math.max(75, Math.round(cabD * 0.16));
    const padRightP = Math.max(130, Math.round(cabW * 0.22));
    const padBottomP = Math.max(25, Math.round(cabD * 0.05));
    const fSizeP = Math.max(28, Math.round(baseDimP * 0.075));
    const strokeP = Math.max(1.5, baseDimP * 0.0035);

    // VISTAS ELEVACIÓN UNIFICADAS (FRONTAL Y LATERAL): Escala diédrica 1:1 idéntica (ISO 128 / DIN)
    const isHospitalBase = (kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame') && (cab.type === 'base' || cab.type === 'island');
    const drawCabH = isHospitalBase ? bodyH : cabH;
    const isTall = cab.type === 'tall';
    const viewGap = Math.max(160, Math.round(cabW * 0.25));
    const totalElevW = cabW + viewGap + cabD;
    const padLeftElev = Math.max(150, Math.round(drawCabH * (isTall ? 0.08 : 0.20)));
    const padRightElev = Math.max(150, Math.round(drawCabH * (isTall ? 0.08 : 0.20)));
    const padTopElev = isTall ? Math.max(220, Math.round(Math.max(cabW, cabD) * 0.40)) : Math.max(140, Math.round(Math.max(cabW, cabD) * 0.28));
    const padBottomElev = Math.max(45, Math.round(drawCabH * (isTall ? 0.03 : 0.06)));
    
    // Tamaño de fuente escalado para legibilidad perfecta en plano A3
    // En torres de H=2150, el texto debe ser de 75-90px para ser nítido e inequívoco
    const fSizeElev = isTall ? 80 : Math.max(34, Math.round(Math.max(cabW, cabH, cabD) * 0.08));
    const fSizeTitles = isTall ? 50 : Math.max(20, Math.round(Math.max(cabW, cabH, cabD) * 0.055));
    const strokeElev = Math.max(2.0, Math.max(totalElevW, isTall ? cabH * 0.5 : cabH) * 0.0032);

    const COLOR_MAGENTA = "#d946ef";

    const isBaseGola = (kState.golaSystem === 'aluminum' || kState.golaSystem === 'black') && (cab.type === 'base' || cab.type === 'island');
    const hasGolaC = isBaseGola && (cab.variant === '1_door_1_drawer' || cab.variant === '2_pot_drawers' || cab.variant === '4_drawers' || cab.variant === '2_drawers_1_pot' || cab.variant === 'sink_u_drawer');
    const golaColorHex = kState.golaSystem === 'black' ? '#18181b' : '#94a3b8';

    // Cálculo dinámico de altura útil y posición milimétrica exacta del perfil Gola C
    const golaAvailH = Math.max(20, bodyH - 35 - 40);
    let golaCY_lat = Math.round(bodyH * 0.35);
    const drH_2pot = Math.round(golaAvailH / 2);
    const drH_4dr = Math.round(golaAvailH / 4);
    const drH_1d1dr = Math.min(145, Math.round(bodyH * 0.22));

    if (cab.variant === '2_pot_drawers' || cab.variant === 'sink_u_drawer') {
      golaCY_lat = Math.round(35 + drH_2pot + 20);
    } else if (cab.variant === '4_drawers') {
      golaCY_lat = Math.round(35 + drH_4dr * 2 + 20);
    } else if (cab.variant === '1_door_1_drawer') {
      golaCY_lat = Math.round(35 + drH_1d1dr + 20);
    } else if (cab.variant === '2_drawers_1_pot') {
      const topDrH = Math.round(golaAvailH * 0.25);
      golaCY_lat = Math.round(35 + topDrH * 2 + 20);
    }

    return (
      <div className="flex flex-col justify-between items-center w-full h-full py-1 gap-2">
        {/* VISTA DE PLANTA */}
        <div className="flex flex-col items-center w-full shrink-0">
          <div className="text-[11px] font-black tracking-widest text-slate-800 mb-1 uppercase">
            VISTA DE PLANTA
          </div>
          <svg 
            viewBox={`-${padLeftP} -${padTopP} ${cabW + padLeftP + padRightP} ${cabD + padTopP + padBottomP}`}
            className="w-full h-[150px] max-h-[160px] overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect x={0} y={0} width={cabW} height={cabD} fill="#f8fafc" stroke="#0f172a" strokeWidth={strokeP * 1.5} />
            <line x1={0} y1={0} x2={cabW} y2={cabD} stroke="#94a3b8" strokeWidth={strokeP * 0.6} strokeDasharray="4,4" />
            <line x1={0} y1={cabD} x2={cabW} y2={0} stroke="#94a3b8" strokeWidth={strokeP * 0.6} strokeDasharray="4,4" />

            {/* Riel Gola en Vista de Planta (Paso de lado a lado continuo) */}
            {isBaseGola && (
              <g>
                <rect x={0} y={cabD - 26} width={cabW} height={26} fill={golaColorHex} opacity={0.65} stroke="#0f172a" strokeWidth={strokeP * 0.8} />
                <text x={cabW / 2} y={cabD - 10} fontSize={Math.max(13, fSizeP * 0.4)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">CANAL GOLA CONTINUO</text>
              </g>
            )}
            
            {/* Cota Ancho Superior */}
            <line x1={0} y1={-padTopP * 0.42} x2={cabW} y2={-padTopP * 0.42} stroke={COLOR_MAGENTA} strokeWidth={strokeP} />
            <line x1={0} y1={-padTopP * 0.52} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW} y1={-padTopP * 0.52} x2={cabW} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={-5} y1={-padTopP * 0.42 + 5} x2={5} y2={-padTopP * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <line x1={cabW - 5} y1={-padTopP * 0.42 + 5} x2={cabW + 5} y2={-padTopP * 0.42 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <text 
              x={cabW / 2} 
              y={-padTopP * 0.42 - 8} 
              fontSize={fSizeP} 
              fill={COLOR_MAGENTA} 
              stroke="#ffffff"
              strokeWidth={strokeP * 2}
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontWeight="900" 
              fontFamily="monospace" 
              textAnchor="middle"
              textRendering="geometricPrecision"
            >
              {cabW} mm
            </text>
            
            {/* Cota Profundidad Derecha */}
            <line x1={cabW + padRightP * 0.42} y1={0} x2={cabW + padRightP * 0.42} y2={cabD} stroke={COLOR_MAGENTA} strokeWidth={strokeP} />
            <line x1={cabW} y1={0} x2={cabW + padRightP * 0.52} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW} y1={cabD} x2={cabW + padRightP * 0.52} y2={cabD} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 0.8} />
            <line x1={cabW + padRightP * 0.42 - 5} y1={5} x2={cabW + padRightP * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <line x1={cabW + padRightP * 0.42 - 5} y1={cabD + 5} x2={cabW + padRightP * 0.42 + 5} y2={cabD - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeP * 1.6} />
            <text 
              x={cabW + padRightP * 0.42 + fSizeP * 0.65 + 4} 
              y={cabD / 2} 
              fontSize={fSizeP} 
              fill={COLOR_MAGENTA} 
              stroke="#ffffff"
              strokeWidth={strokeP * 2}
              paintOrder="stroke fill"
              strokeLinejoin="round"
              fontWeight="900" 
              fontFamily="monospace" 
              textAnchor="middle" 
              textRendering="geometricPrecision"
              transform={`rotate(90 ${cabW + padRightP * 0.42 + fSizeP * 0.65 + 4} ${cabD / 2})`}
            >
              {cabD}
            </text>
          </svg>
        </div>

        {/* VISTAS ELEVACIÓN UNIFICADAS: FRONTAL Y LATERAL A ESCALA IDÉNTICA 1:1 */}
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0">
          <svg 
            viewBox={`-${padLeftElev} -${padTopElev} ${totalElevW + padLeftElev + padRightElev} ${drawCabH + padTopElev + padBottomElev}`}
            className="w-full h-[470px] max-h-[510px] overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Títulos de Vistas Superiores Desacoplados de las Cotas (Norma ISO/DIN) */}
            <text x={cabW / 2} y={-padTopElev * 0.72} fontSize={fSizeTitles} fill="#0f172a" fontWeight="900" textAnchor="middle" letterSpacing="0.08em">VISTA FRONTAL</text>
            <text x={cabW + viewGap + cabD / 2} y={-padTopElev * 0.72} fontSize={fSizeTitles} fill="#0f172a" fontWeight="900" textAnchor="middle" letterSpacing="0.08em">VISTA LATERAL</text>

            {/* Líneas de Correspondencia Proyectiva Diédrica (ISO 128) */}
            <line x1={cabW} y1={0} x2={cabW + viewGap} y2={0} stroke="#cbd5e1" strokeWidth={strokeElev * 0.7} strokeDasharray="4,4" />
            <line x1={cabW} y1={bodyH} x2={cabW + viewGap} y2={bodyH} stroke="#cbd5e1" strokeWidth={strokeElev * 0.7} strokeDasharray="4,4" />
            {legsH > 0 && !isHospitalBase && (
              <line x1={cabW} y1={cabH} x2={cabW + viewGap} y2={cabH} stroke="#94a3b8" strokeWidth={strokeElev * 0.9} strokeDasharray="3,3" />
            )}

            {/* ======================================================== */}
            {/* 1. VISTA FRONTAL (X = 0 hasta cabW)                       */}
            {/* ======================================================== */}
            <g>
              <rect x={0} y={0} width={cabW} height={bodyH} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 1.5} />
              
              {/* Perfiles Gola L y Gola C en Vista Frontal */}
              {isBaseGola && (
                <g>
                  <rect x={0} y={0} width={cabW} height={35} fill={golaColorHex} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                  <text x={cabW / 2} y={23} fontSize={Math.max(14, fSizeElev * 0.42)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">RIEL GOLA L (CONTINUO)</text>
                </g>
              )}
              {hasGolaC && (
                <g>
                  <rect x={0} y={golaCY_lat - 20} width={cabW} height={40} fill={golaColorHex} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                  <text x={cabW / 2} y={golaCY_lat + 6} fontSize={Math.max(14, fSizeElev * 0.42)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="bold" textAnchor="middle" fontFamily="monospace">RIEL GOLA C (CONTINUO)</text>
                </g>
              )}
              {legsH > 0 && !isHospitalBase && (
                <g>
                  <rect x={15} y={bodyH} width={cabW - 30} height={legsH} fill="#e2e8f0" stroke="#475569" strokeWidth={strokeElev} />
                  <rect x={35} y={bodyH} width={25} height={legsH} fill="#94a3b8" />
                  <rect x={cabW - 60} y={bodyH} width={25} height={legsH} fill="#94a3b8" />
                  <text x={cabW / 2} y={bodyH + legsH * 0.65} fontSize={Math.max(18, fSizeElev * 0.55)} fill="#475569" fontWeight="bold" textAnchor="middle">ZÓCALO H={legsH}</text>
                </g>
              )}
              {isHospitalBase && (
                <g>
                  <line x1={0} y1={bodyH} x2={cabW} y2={bodyH} stroke="#0284c7" strokeWidth={strokeElev * 1.2} />
                  <text x={cabW / 2} y={bodyH + 26} fontSize={Math.max(12, fSizeElev * 0.38)} fill="#0284c7" fontWeight="bold" textAnchor="middle">
                    CASCO P/ BASTIDOR METÁLICO (LÁMINA EST-01)
                  </text>
                </g>
              )}

              {/* Frentes / Puertas / Cajones según tipología exacta */}
              {cab.variant === 'hospital_meson_3drawers' ? (
                (() => {
                  const hA = Math.round(bodyH * 0.28);
                  const hB = Math.round(bodyH * 0.28);
                  const hC = bodyH - hA - hB;
                  return (
                    <g>
                      {/* Cajón A Superior con Cerradura ANVER */}
                      <rect x={0} y={0} width={cabW} height={hA} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 0.9} />
                      <text x={cabW / 2 - 15} y={hA * 0.62} fontSize={Math.max(14, fSizeElev * 0.44)} fill="#0f172a" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CAJÓN A (ANVER)</text>
                      {/* Símbolo Cerradura Trampa ANVER */}
                      <circle cx={cabW - 25} cy={hA / 2} r={7} fill="#e2e8f0" stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                      <line x1={cabW - 25} y1={hA / 2 - 4} x2={cabW - 25} y2={hA / 2 + 4} stroke="#0f172a" strokeWidth={strokeElev} />
                      
                      {/* Cajón B Intermedio */}
                      <rect x={0} y={hA} width={cabW} height={hB} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 0.9} />
                      <text x={cabW / 2} y={hA + hB * 0.62} fontSize={Math.max(14, fSizeElev * 0.44)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CAJÓN B (DUCASSE)</text>
                      
                      {/* Cajón C Inferior */}
                      <rect x={0} y={hA + hB} width={cabW} height={hC} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 0.9} />
                      <text x={cabW / 2} y={hA + hB + hC * 0.62} fontSize={Math.max(14, fSizeElev * 0.44)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CAJÓN C (HÄFELE SOFT)</text>
                    </g>
                  );
                })()
              ) : cab.variant === 'hospital_meson_1door' ? (
                <g>
                  {/* Puerta 1 Hoja con Perfil KUTZ */}
                  <rect x={0} y={0} width={cabW} height={bodyH} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 1.2} />
                  {/* Perfil Tirador Asa Corrida KUTZ 12/18 en el canto superior */}
                  <rect x={10} y={2} width={cabW - 20} height={14} fill="#cbd5e1" stroke="#475569" strokeWidth={strokeElev * 0.8} rx={2} />
                  <text x={cabW / 2} y={12} fontSize={Math.max(11, fSizeElev * 0.32)} fill="#0f172a" fontWeight="bold" textAnchor="middle">ASA CORRIDA KUTZ 12/18</text>
                  {/* Proyección Diédrica de Apertura Batiente */}
                  <path d={`M 0 ${bodyH / 2} L ${cabW} 0 L ${cabW} ${bodyH} Z`} fill="none" stroke="#0284c7" strokeWidth={strokeElev * 0.8} strokeDasharray="5,5" />
                  <text x={cabW / 2} y={bodyH * 0.55} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#0284c7" fontWeight="bold" textAnchor="middle">1 PUERTA CLÍNICA (90cm)</text>
                </g>
              ) : cab.variant === 'hospital_niche_open' ? (
                <g>
                  {/* Nicho Abierto 300 mm con 2 repisas vistas */}
                  <rect x={0} y={0} width={cabW} height={bodyH} fill="#f8fafc" stroke="#0f172a" strokeWidth={strokeElev * 1.2} />
                  <rect x={15} y={bodyH * 0.33} width={cabW - 30} height={18} fill="#e2e8f0" stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                  <rect x={15} y={bodyH * 0.66} width={cabW - 30} height={18} fill="#e2e8f0" stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                  <text x={cabW / 2} y={bodyH * 0.20} fontSize={Math.max(12, fSizeElev * 0.38)} fill="#475569" fontWeight="bold" textAnchor="middle">NICHO CLÍNICO</text>
                  <text x={cabW / 2} y={bodyH * 0.52} fontSize={Math.max(11, fSizeElev * 0.34)} fill="#64748b" textAnchor="middle">INSUMOS</text>
                  <text x={cabW / 2} y={bodyH * 0.85} fontSize={Math.max(11, fSizeElev * 0.34)} fill="#64748b" textAnchor="middle">DISPENSADOR</text>
                </g>
              ) : cab.variant === '4_drawers' ? (
                isBaseGola ? (
                  <g>
                    {/* Cajón 1 (Superior) */}
                    <text x={cabW / 2} y={35 + drH_4dr * 0.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 1</text>
                    
                    {/* Línea divisoria Cajón 1 / Cajón 2 */}
                    <line x1={0} y1={35 + drH_4dr} x2={cabW} y2={35 + drH_4dr} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    
                    {/* Cajón 2 */}
                    <text x={cabW / 2} y={35 + drH_4dr * 1.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 2</text>
                    
                    {/* Gola C se ubica entre 35 + drH_4dr*2 y 35 + drH_4dr*2 + 40 */}
                    
                    {/* Cajón 3 */}
                    <text x={cabW / 2} y={35 + drH_4dr * 2 + 40 + drH_4dr * 0.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 3</text>
                    
                    {/* Línea divisoria Cajón 3 / Cajón 4 */}
                    <line x1={0} y1={35 + drH_4dr * 3 + 40} x2={cabW} y2={35 + drH_4dr * 3 + 40} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    
                    {/* Cajón 4 (Inferior) */}
                    <text x={cabW / 2} y={35 + drH_4dr * 3 + 40 + (bodyH - (35 + drH_4dr * 3 + 40)) * 0.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 4</text>
                  </g>
                ) : (
                  Array.from({ length: 4 }).map((_, di) => {
                    const dy = (bodyH / 4) * di;
                    const dh = bodyH / 4;
                    return (
                      <g key={di}>
                        {di > 0 && <line x1={0} y1={dy} x2={cabW} y2={dy} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />}
                        <text x={cabW / 2} y={dy + dh * 0.6} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón {di + 1}</text>
                      </g>
                    );
                  })
                )
              ) : cab.variant === '2_pot_drawers' || cab.variant === 'sink_u_drawer' ? (
                isBaseGola ? (
                  <g>
                    {/* Ollero 1 (Superior) */}
                    <text x={cabW / 2} y={35 + drH_2pot * 0.58} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón Ollero 1</text>
                    
                    {/* Gola C se ubica entre 35 + drH_2pot y 35 + drH_2pot + 40 */}
                    
                    {/* Ollero 2 (Inferior) */}
                    <text x={cabW / 2} y={35 + drH_2pot + 40 + (bodyH - (35 + drH_2pot + 40)) * 0.58} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón Ollero 2</text>
                  </g>
                ) : (
                  <g>
                    <line x1={0} y1={bodyH / 2} x2={cabW} y2={bodyH / 2} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    <text x={cabW / 2} y={bodyH * 0.28} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón Ollero 1</text>
                    <text x={cabW / 2} y={bodyH * 0.78} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón Ollero 2</text>
                  </g>
                )
              ) : cab.variant === '2_drawers_1_pot' ? (
                isBaseGola ? (
                  (() => {
                    const topDrH = Math.round(golaAvailH * 0.25);
                    return (
                      <g>
                        <text x={cabW / 2} y={35 + topDrH * 0.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 1</text>
                        <line x1={0} y1={35 + topDrH} x2={cabW} y2={35 + topDrH} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                        <text x={cabW / 2} y={35 + topDrH * 1.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 2</text>
                        <text x={cabW / 2} y={35 + topDrH * 2 + 40 + (bodyH - (35 + topDrH * 2 + 40)) * 0.58} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón Ollero</text>
                      </g>
                    );
                  })()
                ) : (
                  <g>
                    <line x1={0} y1={bodyH * 0.25} x2={cabW} y2={bodyH * 0.25} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    <line x1={0} y1={bodyH * 0.5} x2={cabW} y2={bodyH * 0.5} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    <text x={cabW / 2} y={bodyH * 0.15} fontSize={Math.max(14, fSizeElev * 0.42)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón 1</text>
                    <text x={cabW / 2} y={bodyH * 0.40} fontSize={Math.max(14, fSizeElev * 0.42)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón 2</text>
                    <text x={cabW / 2} y={bodyH * 0.78} fontSize={Math.max(16, fSizeElev * 0.48)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón Ollero</text>
                  </g>
                )
              ) : cab.variant === '1_door_1_drawer' ? (
                isBaseGola ? (
                  <g>
                    {/* Cajón Superior */}
                    <text x={cabW / 2} y={35 + drH_1d1dr * 0.6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Cajón 1</text>
                    
                    {/* Gola C se ubica entre 35 + drH_1d1dr y 35 + drH_1d1dr + 40 */}
                    
                    {/* Puerta Inferior con diagonal de apertura */}
                    {(() => {
                      const yDoorT = 35 + drH_1d1dr + 40;
                      const yDoorMid = (yDoorT + bodyH) / 2;
                      return (
                        <g>
                          <path d={`M 0 ${yDoorMid} L ${cabW} ${yDoorT} L ${cabW} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                          <text x={cabW / 2} y={yDoorMid + 6} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#c026d3" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Puerta</text>
                        </g>
                      );
                    })()}
                  </g>
                ) : (
                  <g>
                    <line x1={0} y1={150} x2={cabW} y2={150} stroke="#0f172a" strokeWidth={strokeElev * 0.8} />
                    <text x={cabW / 2} y={90} fontSize={Math.max(15, fSizeElev * 0.45)} fill="#64748b" textAnchor="middle" fontFamily="monospace">Cajón 1</text>
                    <path d={`M 0 ${(150 + bodyH) / 2} L ${cabW} 150 L ${cabW} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                  </g>
                )
              ) : cab.variant === 'spice_rack' ? (
                <g>
                  <text x={cabW / 2} y={bodyH / 2} fontSize={Math.max(12, fSizeElev * 0.35)} fill="#ea580c" fontWeight="bold" textAnchor="middle" fontFamily="monospace" transform={`rotate(-90 ${cabW / 2} ${bodyH / 2})`}>ESPECIERO EXTRAÍBLE</text>
                </g>
              ) : cab.variant === '2_doors' || cab.variant === 'wall_2_doors' || cab.variant === 'tall_2_doors' ? (
                (() => {
                  const yDoorT = isBaseGola ? 35 : 0;
                  const yDoorMid = (yDoorT + bodyH) / 2;
                  return (
                    <g>
                      <line x1={cabW / 2} y1={yDoorT} x2={cabW / 2} y2={bodyH} stroke="#0f172a" strokeWidth={strokeElev} />
                      <path d={`M 0 ${yDoorMid} L ${cabW / 2} ${yDoorT} L ${cabW / 2} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                      <path d={`M ${cabW} ${yDoorMid} L ${cabW / 2} ${yDoorT} L ${cabW / 2} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                    </g>
                  );
                })()
              ) : isTall ? (
                <g stroke="#0f172a" strokeWidth="0.7">
                  <line x1={0} y1={bodyH * 0.3} x2={cabW} y2={bodyH * 0.3} />
                  <line x1={0} y1={bodyH * 0.7} x2={cabW} y2={bodyH * 0.7} />
                  <text x={cabW / 2} y={bodyH * 0.52} fontSize={Math.max(14, fSizeElev * 0.42)} fill="#ea580c" fontWeight="bold" textAnchor="middle">
                    HORNO EMPOTRADO
                  </text>
                  <path d={`M 0 ${bodyH * 0.15} L ${cabW} 0 L ${cabW} ${bodyH * 0.3} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                  <path d={`M 0 ${bodyH * 0.85} L ${cabW} ${bodyH * 0.7} L ${cabW} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                </g>
              ) : (
                (() => {
                  const yDoorT = isBaseGola ? 35 : 0;
                  const yDoorMid = (yDoorT + bodyH) / 2;
                  return (
                    <path d={`M 0 ${yDoorMid} L ${cabW} ${yDoorT} L ${cabW} ${bodyH} Z`} fill="none" stroke="#c026d3" strokeWidth={strokeElev * 0.8} strokeDasharray="4,4" />
                  );
                })()
              )}

              {/* Repisas Interiores en Vista Frontal */}
              {isCabinetWithDoors(cab) && (() => {
                const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
                const thickMm = (state.thickness || 1.8) * 10;
                const sideThickMm = (state.thickness || 1.8) * 10;
                return shelfElevations.map((elev, sIdx) => {
                  const elevMm = Math.round(elev * 10);
                  const yShelf = bodyH - elevMm - thickMm / 2;
                  return (
                    <g key={`front-shelf-${sIdx}`}>
                      <line 
                        x1={sideThickMm} 
                        y1={yShelf + thickMm / 2} 
                        x2={cabW - sideThickMm} 
                        y2={yShelf + thickMm / 2} 
                        stroke="#0284c7" 
                        strokeWidth={strokeElev * 0.8} 
                        strokeDasharray="4,3" 
                      />
                    </g>
                  );
                });
              })()}

              {/* Cota Ancho Superior Frontal */}
              <line x1={0} y1={-padTopElev * 0.38} x2={cabW} y2={-padTopElev * 0.38} stroke={COLOR_MAGENTA} strokeWidth={strokeElev} />
              <line x1={0} y1={-padTopElev * 0.48} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
              <line x1={cabW} y1={-padTopElev * 0.48} x2={cabW} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
              <line x1={-5} y1={-padTopElev * 0.38 + 5} x2={5} y2={-padTopElev * 0.38 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
              <line x1={cabW - 5} y1={-padTopElev * 0.38 + 5} x2={cabW + 5} y2={-padTopElev * 0.38 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
              <text 
                x={cabW / 2} 
                y={-padTopElev * 0.38 - 8} 
                fontSize={fSizeElev} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeElev * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle"
                textRendering="geometricPrecision"
              >
                {cabW}
              </text>
              
              {/* Cota Alto Izquierda Frontal */}
              <line x1={-padLeftElev * 0.42} y1={0} x2={-padLeftElev * 0.42} y2={drawCabH} stroke={COLOR_MAGENTA} strokeWidth={strokeElev} />
              <line x1={-padLeftElev * 0.52} y1={0} x2={0} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
              <line x1={-padLeftElev * 0.52} y1={drawCabH} x2={0} y2={drawCabH} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
              <line x1={-padLeftElev * 0.42 - 5} y1={5} x2={-padLeftElev * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
              <line x1={-padLeftElev * 0.42 - 5} y1={drawCabH + 5} x2={-padLeftElev * 0.42 + 5} y2={drawCabH - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
              <text 
                x={-padLeftElev * 0.42 - fSizeElev * 0.55 - 4} 
                y={drawCabH / 2} 
                fontSize={fSizeElev} 
                fill={COLOR_MAGENTA} 
                stroke="#ffffff"
                strokeWidth={strokeElev * 2}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fontWeight="900" 
                fontFamily="monospace" 
                textAnchor="middle" 
                textRendering="geometricPrecision"
                transform={`rotate(-90 ${-padLeftElev * 0.42 - fSizeElev * 0.55 - 4} ${drawCabH / 2})`}
              >
                {drawCabH}
              </text>
            </g>

            {/* ======================================================== */}
            {/* 2. VISTA LATERAL (X = latX hasta latX + cabD)            */}
            {/* ======================================================== */}
            {(() => {
              const latX = cabW + viewGap;
              return (
                <g>
                  <rect x={latX} y={0} width={cabD} height={bodyH} fill="#ffffff" stroke="#0f172a" strokeWidth={strokeElev * 1.5} />
                  <rect x={latX + 15} y={0} width={4} height={bodyH} fill="#9333ea" />
                  <text x={latX + 17} y={bodyH / 2} fontSize={Math.max(14, fSizeElev * 0.45)} fill="#9333ea" fontWeight="bold" transform={`rotate(-90 ${latX + 17} ${bodyH / 2})`} textAnchor="middle">DUROLAC</text>

                  {/* Destaje CNC y Perfil Gola L Superior en Lateral */}
                  {isBaseGola && (
                    <g>
                      <rect x={latX + cabD - 26} y={0} width={26} height={58} fill="#fef3c7" stroke="#d97706" strokeWidth={strokeElev} strokeDasharray="3,2" />
                      <path 
                        d={`M ${latX + cabD - 1} 0 L ${latX + cabD - 26} 0 L ${latX + cabD - 26} 38 Q ${latX + cabD - 26} 55 ${latX + cabD - 13} 55 Q ${latX + cabD - 3.5} 55 ${latX + cabD - 3.5} 33 L ${latX + cabD - 5} 33 Q ${latX + cabD - 5} 53.5 ${latX + cabD - 13} 53.5 Q ${latX + cabD - 24.5} 53.5 ${latX + cabD - 24.5} 38 L ${latX + cabD - 24.5} 1.5 L ${latX + cabD - 1} 1.5 Z`} 
                        fill={golaColorHex} 
                        stroke="#0f172a" 
                        strokeWidth={strokeElev * 0.8} 
                      />
                      <line x1={latX + cabD - 26} y1={68} x2={latX + cabD} y2={68} stroke="#d97706" strokeWidth={strokeElev * 0.8} />
                      <text x={latX + cabD - 13} y={80} fontSize={Math.max(13, fSizeElev * 0.38)} fill="#d97706" fontWeight="bold" textAnchor="middle" fontFamily="monospace">26</text>
                      
                      <line x1={latX + cabD - 36} y1={0} x2={latX + cabD - 36} y2={58} stroke="#d97706" strokeWidth={strokeElev * 0.8} />
                      <text x={latX + cabD - 40} y={34} fontSize={Math.max(13, fSizeElev * 0.38)} fill="#d97706" fontWeight="bold" textAnchor="end" fontFamily="monospace">58</text>
                      <text x={latX + cabD - 13} y={22} fontSize={Math.max(11, fSizeElev * 0.34)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="900" textAnchor="middle">GOLA L</text>
                    </g>
                  )}

                  {/* Destaje CNC y Perfil Gola C Intermedio en Lateral */}
                  {hasGolaC && (
                    <g>
                      <rect x={latX + cabD - 26} y={golaCY_lat - 34} width={26} height={68} fill="#fef3c7" stroke="#d97706" strokeWidth={strokeElev} strokeDasharray="3,2" />
                      <path 
                        d={`M ${latX + cabD - 3.5} ${golaCY_lat - 28} Q ${latX + cabD - 9} ${golaCY_lat - 14} ${latX + cabD - 26} ${golaCY_lat - 24} L ${latX + cabD - 26} ${golaCY_lat + 24} Q ${latX + cabD - 9} ${golaCY_lat + 14} ${latX + cabD - 3.5} ${golaCY_lat + 28} L ${latX + cabD - 5} ${golaCY_lat + 28} Q ${latX + cabD - 10} ${golaCY_lat + 15.5} ${latX + cabD - 24.5} ${golaCY_lat + 24} L ${latX + cabD - 24.5} ${golaCY_lat - 24} Q ${latX + cabD - 10} ${golaCY_lat - 15.5} ${latX + cabD - 5} ${golaCY_lat - 28} Z`} 
                        fill={golaColorHex} 
                        stroke="#0f172a" 
                        strokeWidth={strokeElev * 0.8} 
                      />
                      <line x1={latX + cabD - 36} y1={golaCY_lat - 34} x2={latX + cabD - 36} y2={golaCY_lat + 34} stroke="#d97706" strokeWidth={strokeElev * 0.8} />
                      <text x={latX + cabD - 40} y={golaCY_lat + 5} fontSize={Math.max(13, fSizeElev * 0.38)} fill="#d97706" fontWeight="bold" textAnchor="end" fontFamily="monospace">68</text>
                      <text x={latX + cabD - 13} y={golaCY_lat + 5} fontSize={Math.max(11, fSizeElev * 0.34)} fill={kState.golaSystem === 'black' ? '#ffffff' : '#0f172a'} fontWeight="900" textAnchor="middle">GOLA C</text>
                    </g>
                  )}

                  {/* Repisas Interiores y Soportes en Vista Lateral */}
                  {isCabinetWithDoors(cab) && (() => {
                    const shelfElevations = getResolvedCabinetShelfElevations(cab, state.thickness);
                    const thickMm = (state.thickness || 1.8) * 10;
                    return shelfElevations.map((elev, sIdx) => {
                      const elevMm = Math.round(elev * 10);
                      const yShelf = bodyH - elevMm - thickMm / 2;
                      return (
                        <g key={`lat-shelf-${sIdx}`}>
                          <rect 
                            x={latX + 25} 
                            y={yShelf} 
                            width={cabD - 45} 
                            height={thickMm} 
                            fill="#cbd5e1" 
                            stroke="#0284c7" 
                            strokeWidth={strokeElev * 0.7} 
                          />
                          <circle cx={latX + 37} cy={yShelf + thickMm} r={3} fill="#0284c7" />
                          <circle cx={latX + cabD - 45} cy={yShelf + thickMm} r={3} fill="#0284c7" />
                          <text 
                            x={latX + cabD / 2} 
                            y={yShelf - 4} 
                            fontSize={Math.max(10, fSizeElev * 0.32)} 
                            fill="#0284c7" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            fontFamily="monospace"
                          >
                            REPISA (H={elevMm})
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Frentes / Puertas en Vista Lateral (Respetando el vano de agarre del Riel Gola) */}
                  {isBaseGola && hasGolaC ? (
                    <g>
                      {/* Frente Superior (deja libre Gola L y Gola C) */}
                      <rect 
                        x={latX + cabD - 18} 
                        y={35} 
                        width={18} 
                        height={Math.max(10, (golaCY_lat - 20) - 35)} 
                        fill="#f97316" 
                        stroke="#ea580c" 
                        strokeWidth={strokeElev * 0.8} 
                      />
                      {/* Frente Inferior (deja libre Gola C) */}
                      <rect 
                        x={latX + cabD - 18} 
                        y={golaCY_lat + 20} 
                        width={18} 
                        height={Math.max(10, bodyH - (golaCY_lat + 20))} 
                        fill="#f97316" 
                        stroke="#ea580c" 
                        strokeWidth={strokeElev * 0.8} 
                      />
                    </g>
                  ) : (
                    <rect 
                      x={latX + cabD - 18} 
                      y={isBaseGola ? 35 : 0} 
                      width={18} 
                      height={isBaseGola ? bodyH - 35 : bodyH} 
                      fill="#f97316" 
                      stroke="#ea580c" 
                      strokeWidth={strokeElev * 0.8} 
                    />
                  )}
                  
                  {/* Zócalo Lateral / Bastidor Metálico */}
                  {legsH > 0 && !isHospitalBase && (
                    <g>
                      <rect x={latX + 15} y={bodyH} width={cabD - 30} height={legsH} fill="#e2e8f0" stroke="#475569" strokeWidth={strokeElev} />
                      <text x={latX + cabD / 2} y={bodyH + legsH * 0.65} fontSize={Math.max(18, fSizeElev * 0.55)} fill="#475569" fontWeight="bold" textAnchor="middle">ZÓCALO</text>
                    </g>
                  )}
                  {isHospitalBase && (
                    <g>
                      <line x1={latX} y1={bodyH} x2={latX + cabD} y2={bodyH} stroke="#0284c7" strokeWidth={strokeElev * 1.2} />
                      <text x={latX + cabD / 2} y={bodyH + 26} fontSize={Math.max(12, fSizeElev * 0.38)} fill="#0284c7" fontWeight="bold" textAnchor="middle">
                        MONTAJE SOBRE BASTIDOR TUBULAR
                      </text>
                    </g>
                  )}

                  {/* Cota Profundidad Superior Lateral */}
                  <line x1={latX} y1={-padTopElev * 0.38} x2={latX + cabD} y2={-padTopElev * 0.38} stroke={COLOR_MAGENTA} strokeWidth={strokeElev} />
                  <line x1={latX} y1={-padTopElev * 0.48} x2={latX} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
                  <line x1={latX + cabD} y1={-padTopElev * 0.48} x2={latX + cabD} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
                  <line x1={latX - 5} y1={-padTopElev * 0.38 + 5} x2={latX + 5} y2={-padTopElev * 0.38 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
                  <line x1={latX + cabD - 5} y1={-padTopElev * 0.38 + 5} x2={latX + cabD + 5} y2={-padTopElev * 0.38 - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
                  <text 
                    x={latX + cabD / 2} 
                    y={-padTopElev * 0.38 - 8} 
                    fontSize={fSizeElev} 
                    fill={COLOR_MAGENTA} 
                    stroke="#ffffff"
                    strokeWidth={strokeElev * 2}
                    paintOrder="stroke fill"
                    strokeLinejoin="round"
                    fontWeight="900" 
                    fontFamily="monospace" 
                    textAnchor="middle" 
                    textRendering="geometricPrecision"
                  >
                    {cabD}
                  </text>
                  
                  {/* Cota Alto Derecha Lateral (Balanceada y exacta) */}
                  <line x1={latX + cabD + padRightElev * 0.42} y1={0} x2={latX + cabD + padRightElev * 0.42} y2={drawCabH} stroke={COLOR_MAGENTA} strokeWidth={strokeElev} />
                  <line x1={latX + cabD} y1={0} x2={latX + cabD + padRightElev * 0.52} y2={0} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
                  <line x1={latX + cabD} y1={drawCabH} x2={latX + cabD + padRightElev * 0.52} y2={drawCabH} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 0.8} />
                  <line x1={latX + cabD + padRightElev * 0.42 - 5} y1={5} x2={latX + cabD + padRightElev * 0.42 + 5} y2={-5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
                  <line x1={latX + cabD + padRightElev * 0.42 - 5} y1={drawCabH + 5} x2={latX + cabD + padRightElev * 0.42 + 5} y2={drawCabH - 5} stroke={COLOR_MAGENTA} strokeWidth={strokeElev * 1.6} />
                  <text 
                    x={latX + cabD + padRightElev * 0.42 + fSizeElev * 0.65 + 4} 
                    y={drawCabH / 2} 
                    fontSize={fSizeElev} 
                    fill={COLOR_MAGENTA} 
                    stroke="#ffffff"
                    strokeWidth={strokeElev * 2}
                    paintOrder="stroke fill"
                    strokeLinejoin="round"
                    fontWeight="900" 
                    fontFamily="monospace" 
                    textAnchor="middle" 
                    textRendering="geometricPrecision"
                    transform={`rotate(90 ${latX + cabD + padRightElev * 0.42 + fSizeElev * 0.65 + 4} ${drawCabH / 2})`}
                  >
                    {drawCabH}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    );
  };

  type TitleBlockSheetType = 'architectural' | 'cabinet' | 'nesting' | 'countertop' | 'bom';

  /**
   * Title Block Inferior Modular con Nomenclatura Técnica y Especificaciones adaptadas por lámina (ISO 128 / NCh)
   */
  const BlueprintTitleBlock = ({ 
    pageNum, 
    title, 
    cab, 
    identTag,
    customContent,
    sheetType = 'cabinet',
    isContinuation,
    pageSubIndex,
    totalModPages
  }: { 
    pageNum: number; 
    title: string; 
    cab?: CabinetType; 
    identTag?: string;
    customContent?: string;
    sheetType?: TitleBlockSheetType;
    isContinuation?: boolean;
    pageSubIndex?: number;
    totalModPages?: number;
  }) => {
    const isMultiSheet = totalModPages && totalModPages > 1;

    return (
      <div className="absolute bottom-4 left-4 right-4 h-24 border-2 border-black flex text-[9px] bg-white z-30 shadow-xs">
        {/* Columna 1: Datos de Proyecto */}
        <div className="w-[28%] border-r-2 border-black p-2 flex flex-col justify-between">
          <div>
            <div className="font-bold text-sm text-slate-900 tracking-tight truncate">{projectName}</div>
            <div className="text-slate-600 mt-0.5 text-[8.5px] truncate">
              <span className="font-bold text-black">CLIENTE:</span> {clientName}
            </div>
            <div className="text-slate-600 text-[8.5px] truncate">
              <span className="font-bold text-black">LÁMINA:</span> {title}
            </div>
            <div className="text-slate-600 text-[8.5px] truncate">
              <span className="font-bold text-black">CONTENIDO:</span>{' '}
              {customContent || (() => {
                if (!cab) return 'OPTIMIZACIÓN & LISTADO';
                const isHospBaseCab = (kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame') && (cab.type === 'base' || cab.type === 'island');
                const dispH = isHospBaseCab ? Math.round(cab.height - (kState.socleHeight ?? 30)) : cab.height;
                const baseNote = isHospBaseCab ? ' [CASCO S/ BASTIDOR]' : '';
                return `${getCabinetTypeName(cab)}${baseNote} (${cab.width}x${dispH}x${cab.depth} cm)${isMultiSheet ? ` [PARTE ${pageSubIndex}/${totalModPages}]` : ''}`;
              })()}
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-1 text-[8px] text-slate-500">
            <span>DIBUJANTE: ARQUIFY BIM CAD</span>
            <span>FECHA: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Columna 2: Observaciones & Especificaciones Técnicas Adaptadas por Contexto */}
        <div className="w-[30%] border-r-2 border-black p-2 flex flex-col justify-between">
          {sheetType === 'architectural' ? (
            <div>
              <div className="font-bold text-black uppercase tracking-wider mb-1 text-[8.5px]">
                {kState.projectMode === 'hospital' ? 'ESPECIFICACIONES CLÍNICAS & ARQUITECTURA' : 'ESPECIFICACIONES ARQUITECTÓNICAS'}
              </div>
              <div className="text-slate-700 leading-tight space-y-0.5 text-[8px]">
                {kState.projectMode === 'hospital' ? (
                  <>
                    <div>• <strong className="text-black">NORMATIVA:</strong> Ficha Técnica MC.2.02 SACYR • Mobiliario Clínico</div>
                    <div>• <strong className="text-black">BASTIDOR SANITARIO:</strong> Tubular FE 30x50x1.5mm h=300 mm libres del suelo</div>
                    <div>• <strong className="text-black">NIVEL CUBIERTA:</strong> N.P.T. +0.90 m | Krion Solid Surface 12mm</div>
                  </>
                ) : (
                  <>
                    <div>• <strong className="text-black">ALTURA CIELO-PISO:</strong> 2200 mm | Zócalo H={(kState.socleHeight ?? 10) * 10} mm</div>
                    <div>• <strong className="text-black">NIVEL CUBIERTA:</strong> N.P.T. +0.90 m | Faldón e=20-40 mm</div>
                    <div>• <strong className="text-black">REPLANTEO:</strong> Verificar plomos, escuadras y puntos MEP en obra</div>
                  </>
                )}
              </div>
            </div>
          ) : sheetType === 'nesting' ? (
            <div>
              <div className="font-bold text-black uppercase tracking-wider mb-1 text-[8.5px]">PARÁMETROS DE SECCIONADO & CORTE</div>
              <div className="text-slate-700 leading-tight space-y-0.5 text-[8px]">
                <div>• <strong className="text-black">ESPESOR SIERRA (KERF):</strong> 3.2 mm (Disco con incisor)</div>
                <div>• <strong className="text-black">REFILADO PERIMETRAL:</strong> 15 mm mínimo por lado</div>
                <div>• <strong className="text-black">SENTIDO DE VETA:</strong> Longitudinal en frentes y tapas vistas</div>
              </div>
            </div>
          ) : sheetType === 'countertop' ? (
            <div>
              <div className="font-bold text-black uppercase tracking-wider mb-1 text-[8.5px]">
                {kState.projectMode === 'hospital' ? 'ESPECIFICACIONES DE CUBIERTA SANITARIA' : 'ESPECIFICACIONES DE MARMOLERÍA'}
              </div>
              <div className="text-slate-700 leading-tight space-y-0.5 text-[8px]">
                {kState.projectMode === 'hospital' ? (
                  <>
                    <div>• <strong className="text-black">MATERIAL:</strong> Krion Solid Surface Snow White / HPL Compacto 12mm</div>
                    <div>• <strong className="text-black">TERMINACIÓN:</strong> Canto macizo 12mm pulido sanitario sin filo</div>
                    <div>• <strong className="text-black">ASEPSIA:</strong> Superficie no porosa, sin uniones perceptibles</div>
                  </>
                ) : (
                  <>
                    <div>• <strong className="text-black">ESPESOR CUBIERTA:</strong> {kState.countertopConfig?.thicknessMm || 20} mm | Cuarzo QStone</div>
                    <div>• <strong className="text-black">TERMINACIÓN:</strong> {kState.countertopConfig?.apronType === 'mitred' ? 'Faldón ingleteado 45°' : 'Canto pulido recto biselado'}</div>
                    <div>• <strong className="text-black">TRASFOROS:</strong> Plantilla física p/ encimera y lavaplatos</div>
                  </>
                )}
              </div>
            </div>
          ) : sheetType === 'bom' ? (
            <div>
              <div className="font-bold text-black uppercase tracking-wider mb-1 text-[8.5px]">
                {kState.projectMode === 'hospital' ? 'CÓMPUTO MÉTRICO & HERRAJES CLÍNICOS' : 'CÓMPUTO MÉTRICO & HERRAJES'}
              </div>
              <div className="text-slate-700 leading-tight space-y-0.5 text-[8px]">
                {kState.projectMode === 'hospital' ? (
                  <>
                    <div>• <strong className="text-black">BASTIDOR FE:</strong> Perfil tubular FE 30x50x1.5mm esmaltado blanco h=300mm</div>
                    <div>• <strong className="text-black">QUINCALLERÍA:</strong> Cerradura Trampa ANVER + Tirador Perfil KUTZ 12/18</div>
                    <div>• <strong className="text-black">CORREDERAS:</strong> Ducasse telescópicas A-B + Häfele cierre suave C</div>
                  </>
                ) : (
                  <>
                    <div>• <strong className="text-black">SISTEMA ARMADO:</strong> {state.assemblyType === 'minifix' ? 'Minifix Ø15 + Tarugo Ø8' : 'Tornillo Soberbio Spax 5x50'}</div>
                    <div>• <strong className="text-black">FACTOR MERMA:</strong> +5% en perfiles, tiradores y zócalos</div>
                    <div>• <strong className="text-black">CORREDERAS:</strong> {state.drawerHardware} con cierre amortiguado</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-bold text-black uppercase tracking-wider mb-1 text-[8.5px]">
                {kState.projectMode === 'hospital' ? 'OBSERVACIONES CLÍNICAS MC.2.02' : 'OBSERVACIONES & TAPACANTOS'}
              </div>
              {kState.projectMode === 'hospital' ? (
                <div className="text-slate-700 leading-tight space-y-0.5 text-[8px]">
                  <div>• <strong className="text-black">CAJAS:</strong> MDF 15mm laminado blanco 2 caras con TC PVC 22x0.45mm</div>
                  <div>• <strong className="text-black">FRENTES:</strong> MDF 18mm laminado blanco 2 caras con TC PVC 22x2.0mm PUR</div>
                  <div>• <strong className="text-black">ADHESIVO:</strong> Poliuretano Reactivo (PUR) estanco anti-humedad</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5 text-slate-700 text-[8px]">
                    <div className="w-2.5 h-2.5 rotate-45 bg-orange-500 border border-black shadow-xs shrink-0"></div>
                    <span><strong className="text-black">TC PVC 22x{(state.edgeBandingThicknessCabinets || 0.45).toFixed(2)} MM:</strong> Estructura y frentes interiores</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 text-[8px]">
                    <div className="w-2.5 h-2.5 rotate-45 bg-rose-600 border border-black shadow-xs shrink-0"></div>
                    <span><strong className="text-black">TC PVC 22x{(state.edgeBandingThicknessFronts || 2.0).toFixed(2)} MM:</strong> Puertas y frentes vistos</span>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="text-[8px] text-slate-500 border-t border-slate-200 pt-0.5">
            {sheetType === 'architectural' ? (
              <span>Normativa: <strong>ISO 128 / NCh Arquitectura</strong></span>
            ) : sheetType === 'nesting' ? (
              <span>Algoritmo: <strong>Guillotina 2D CAD/CAM</strong></span>
            ) : sheetType === 'countertop' ? (
              <span>Logística: <strong>Largo máx. continuo 2.50m</strong></span>
            ) : sheetType === 'bom' ? (
              <span>Lista Maestra: <strong>Consolidado de Producción</strong></span>
            ) : (
              <span>Correderas: <strong>{state.drawerHardware}</strong> • Ranura durolac 4x7.5mm a 15mm</span>
            )}
          </div>
        </div>

        {/* Columna 3: Simbología Técnica Contextual */}
        <div className="w-[24%] border-r-2 border-black p-2 flex flex-col justify-between bg-slate-50/50">
          {sheetType === 'architectural' ? (
            <>
              <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
                SIMBOLOGÍA DE PLANTA
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-green-600 bg-green-50 text-green-700 font-bold text-[6px] flex items-center justify-center">A</span>
                  <span className="font-bold text-slate-800">MURO / VISTA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#c026d3]"></span>
                  <span className="font-bold text-[#c026d3]">COTA ALTURA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#0f172a]"></span>
                  <span className="font-bold text-slate-900">COTA TOTAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#e11d48]"></span>
                  <span className="font-bold text-[#e11d48]">NIVEL P.T.</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-3 h-0.5 bg-slate-500 border-t border-dashed border-slate-700"></span>
                  <span className="font-bold text-slate-600">PROYECCIÓN AÉREOS</span>
                </div>
              </div>
            </>
          ) : sheetType === 'nesting' ? (
            <>
              <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
                CONVENCIONES DE CORTE
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-amber-600 bg-amber-50"></span>
                  <span className="font-bold text-amber-800">PIEZA ÚTIL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-200 border border-slate-400"></span>
                  <span className="font-bold text-slate-600">RETAZO / MERMA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-orange-500"></span>
                  <span className="font-bold text-orange-600">LÍNEA CORTE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 bg-rose-600"></span>
                  <span className="font-bold text-rose-700">TAPACANTO</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="font-mono text-[7px] text-slate-500">DIRECCIÓN VETA ↔ LONGITUDINAL</span>
                </div>
              </div>
            </>
          ) : sheetType === 'countertop' ? (
            <>
              <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
                PIEZAS PÉTREAS QSTONE
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-500"></span>
                  <span className="font-bold text-amber-900">CUBIERTA / ISLA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-500"></span>
                  <span className="font-bold text-rose-900">FALDÓN FRONTAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-purple-100 border border-purple-500"></span>
                  <span className="font-bold text-purple-900">CASCADA LATERAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-100 border border-sky-500"></span>
                  <span className="font-bold text-sky-900">RESPALDO MURO</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-2.5 h-2.5 bg-slate-200 border border-slate-400"></span>
                  <span className="font-bold text-slate-600">RETAJO APROVECHABLE</span>
                </div>
              </div>
            </>
          ) : sheetType === 'bom' ? (
            <>
              <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
                CONTROL DE FABRICACIÓN
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                <div><span className="text-slate-500">ESTADO:</span> <strong className="text-emerald-700">APROBADO</strong></div>
                <div><span className="text-slate-500">REVISIÓN:</span> <strong className="text-slate-900">REV. A</strong></div>
                <div><span className="text-slate-500">TOLERANCIA:</span> <strong>±0.5 mm</strong></div>
                <div><span className="text-slate-500">NORMA:</span> <strong>ISO 128</strong></div>
                <div className="col-span-2 pt-0.5 border-t border-slate-200 text-slate-600 font-mono text-[7px]">LISTA VINCULADA AL BOM</div>
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-black uppercase tracking-widest text-[8.5px] border-b border-black/20 pb-0.5 mb-1">
                NOMENCLATURA DE COTAS
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#d946ef]"></span>
                  <span className="font-bold text-[#d946ef]">GENERAL</span>
                </div>
                {state.assemblyType === 'minifix' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                      <span className="font-bold text-[#16a34a]">MINIFIX</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
                      <span className="font-bold text-[#dc2626]">TARUGO</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
                    <span className="font-bold text-[#2563eb]">TORNILLO</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-2 h-2 rounded-xs bg-[#2563eb]"></span>
                  <span className="font-bold text-[#2563eb]">DETALLES / EJES</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Columna 4: Tag de Identificación & Escala */}
        <div className="w-[18%] p-2 flex flex-col justify-between items-end bg-white">
          <div className="w-full flex justify-between items-start">
            <div className="text-left">
              <div className="text-[7.5px] text-slate-400 font-bold uppercase">IDENT. ETIQ.</div>
              <div className="font-mono font-black text-xl text-rose-600 border border-rose-500/30 px-2 py-0.5 rounded bg-rose-50/50">
                {identTag || `P-${pageNum}`}
              </div>
            </div>
            <div className="text-right text-[8px]">
              <div><strong>LÁMINA:</strong> {String(pageNum).padStart(2, '0')} / {String(totalDocPages).padStart(2, '0')}</div>
              <div><strong>ESCALA:</strong> {sheetType === 'architectural' ? '1:50 (A3)' : 'S.E (A3)'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bellota font-bold text-xl lowercase text-orange-600 tracking-tight select-none">arquify</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-800 text-black flex flex-col overflow-hidden">
      {/* Header Superior Fijo Integrado (Opción 1) */}
      <header className="sticky top-0 left-0 right-0 z-40 print:hidden w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Identificación y Título */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 border-r border-slate-700 pr-3">
            <FileText size={16} className="text-orange-500 shrink-0" />
            <span className="tracking-wider uppercase">PLANOS DE FABRICACIÓN</span>
          </div>
          <span className="hidden xl:inline-block text-[11px] text-slate-400 font-medium">
            Láminas Técnicas A3 &middot; Despiece CNC &middot; BOM
          </span>
        </div>

        {/* Acciones Técnicas y Exportaciones */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Principal: Descargar Planos Completos A3 en PDF */}
          <button 
            onClick={handleExportA3}
            disabled={isExportingA3}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar y descargar todos los planos y despieces en formato A3 de alta resolución"
          >
            {isExportingA3 ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Generando ({exportProgress ? `${exportProgress.current}/${exportProgress.total}` : '...'})</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Planos PDF (A3)</span>
              </>
            )}
          </button>

          {generatedPdfUrl && (
            <a
              href={generatedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="planos_fabricacion_cocina_A3.pdf"
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 animate-pulse cursor-pointer"
              title="Haz clic para abrir o descargar directamente el PDF generado"
            >
              <Download size={14} />
              <span>PDF Listo</span>
            </a>
          )}

          {/* Botón Secundario: Ficha Técnica PDF Directo */}
          <button 
            onClick={() => exportKitchenPDF(kState.cabinets, state)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar archivo PDF con despiece de corte, resumen de cubicación y herrajes"
          >
            <FileText size={14} />
            <span>Ficha (BOM)</span>
          </button>

          {/* Botón CAD/CAM: Exportar Excel de Corte y Materiales */}
          <button 
            onClick={exportKitchenToExcel}
            className="bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar planilla Excel CAD/CAM para seccionadoras y centros de corte"
          >
            <FileSpreadsheet size={14} />
            <span>Excel CAD/CAM</span>
          </button>

          {/* Botón Industria 4.0: Etiquetas de Producción con Código QR */}
          <button 
            onClick={handleExportLabels}
            disabled={isExportingLabels}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar hoja de etiquetas adhesivas de corte y mecanizado con código QR y cantos"
          >
            {isExportingLabels ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <QrCode size={14} />
            )}
            <span>Etiquetas QR</span>
          </button>

          {/* Botón Industria 4.0: Exportar Paquete DXF para CNC */}
          <button 
            onClick={handleExportAllDxf}
            disabled={isExportingDxf}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Descargar paquete ZIP con subcarpetas por mueble y archivos DXF con capas CNC para centros de corte"
          >
            {isExportingDxf ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Cpu size={14} />
            )}
            <span>DXF CNC</span>
          </button>
        </div>

        {/* Lado Derecho: Comercial, Imprimir y Cerrar */}
        <div className="flex items-center gap-2">
          {/* Botón Comercial: Cotización Dual B2B & Retail */}
          <button 
            onClick={() => setIsB2BQuoteOpen(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg font-bold uppercase text-[11px] tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/30"
            title="Abrir cotizador comercial B2B & Retail con desglose de costos y márgenes"
          >
            <DollarSign size={14} />
            <span>Cotización B2B / Retail</span>
          </button>

          {/* Botón: Personalizar Datos de Proyecto y Cliente */}
          <button 
            onClick={() => {
              setTempProjectName(projectName);
              setTempClientName(clientName);
              setIsEditingInfo(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Personalizar Nombre de Proyecto y Cliente para el membrete/cajetín de las láminas"
          >
            <Edit3 size={13} className="text-orange-400" />
            <span className="truncate max-w-[140px] hidden md:inline">{projectName}</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            title="Imprimir"
          >
            <Printer size={14} />
          </button>

          <button 
            onClick={() => state.setIsPrinting(false)}
            className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
            title="Cerrar vista de planos (Esc)"
          >
            <X size={15} />
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {/* Modal para Editar Proyecto y Cliente */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl text-white">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-orange-400">
              <Edit3 size={18} />
              <span>Membrete Técnico de Láminas</span>
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Proyecto:</label>
                <input 
                  type="text" 
                  value={tempProjectName} 
                  onChange={(e) => setTempProjectName(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-hidden focus:border-orange-500"
                  placeholder="Ej: COCINA RESIDENCIAL LAS CONDES"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cliente / Propietario:</label>
                <input 
                  type="text" 
                  value={tempClientName} 
                  onChange={(e) => setTempClientName(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-hidden focus:border-orange-500"
                  placeholder="Ej: FAMILIA PÉREZ GONZÁLEZ"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setIsEditingInfo(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const p = tempProjectName.trim() || 'PROYECTO COCINA ARQUIFY';
                  const c = tempClientName.trim() || 'CLIENTE PARTICULAR';
                  setProjectName(p);
                  setClientName(c);
                  localStorage.setItem('arquify_project_name', p);
                  localStorage.setItem('arquify_client_name', c);
                  setIsEditingInfo(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs cursor-pointer"
              >
                Guardar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor con Scroll para las Láminas A3 */}
      <div className="flex-1 overflow-auto bg-neutral-800 print-only-container">

      <style>{`
        @media screen { 
           .print-only-container { display: flex; flex-direction: column; background: #525252; padding: 2rem; align-items: center; gap: 2rem; } 
           .blueprint-page { 
             background: white; 
             width: 420mm; 
             min-width: 420mm; 
             max-width: 420mm; 
             height: 297mm; 
             min-height: 297mm; 
             max-height: 297mm; 
             flex-shrink: 0; 
             position: relative; 
             box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
             box-sizing: border-box;
           }
        }
        @media print {
          body * { visibility: hidden; }
          .print-only-container, .print-only-container * { visibility: visible; }
          .print-only-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; display: block; background: white !important; }
          .blueprint-page { 
            width: 420mm; 
            height: 297mm; 
            min-height: 297mm;
            max-height: 297mm;
            position: relative; 
            page-break-after: always; 
            page-break-inside: avoid;
            overflow: hidden; 
            box-sizing: border-box;
          }
          @page { size: A3 landscape; margin: 0; }
        }
      `}</style>

      {/* 1. LÁMINA 1: PLANO GENERAL DEL PROYECTO, ELEVACIONES, DETALLES Y EETT (100% DINÁMICO) */}
      {(() => {
        const vertices = kState.roomConfig?.vertices || [];
        const wallSegments = vertices.length >= 3 ? analyzeRoomWalls(vertices) : [];

        // Calcular Bounding Box del plano de la habitación y gabinetes en cm
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (vertices.length > 0) {
          vertices.forEach(v => {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
          });
        } else {
          minX = -250; maxX = 250; minY = -200; maxY = 200;
        }

        realCabinets.forEach(c => {
          minX = Math.min(minX, c.position[0] - c.width / 2);
          maxX = Math.max(maxX, c.position[0] + c.width / 2);
          minY = Math.min(minY, c.position[2] - c.depth / 2);
          maxY = Math.max(maxY, c.position[2] + c.depth / 2);
        });

        // Margen de 60 cm para encuadre seguro y holgura para cotas exteriores
        minX -= 60; maxX += 60; minY -= 60; maxY += 60;
        const spanX = Math.max(160, maxX - minX);
        const spanY = Math.max(140, maxY - minY);

        // Mapeo a SVG de Planta (520 x 280)
        const svgW = 520;
        const svgH = 280;
        const scale2D = Math.min(svgW / spanX, svgH / spanY);
        const offsetX = (svgW - spanX * scale2D) / 2;
        const offsetY = (svgH - spanY * scale2D) / 2;

        const toSvgX = (xCm: number) => offsetX + (xCm - minX) * scale2D;
        const toSvgY = (yCm: number) => offsetY + (yCm - minY) * scale2D;

        // Calcular gabinetes proyectados en cada muro para las elevaciones
        const activeWallsData = wallSegments.map(wall => {
          const S = wall.start;
          const E = wall.end;
          const L = wall.length;
          if (L < 1) return { wall, cabinetsOnWall: [] };

          const ux = (E.x - S.x) / L;
          const uy = (E.y - S.y) / L;
          const nx = -uy;
          const ny = ux;

          const cabsOnWall = realCabinets.map(cab => {
            const cx = cab.position[0];
            const cz = cab.position[2];

            // Distancia a lo largo del muro (desde start)
            const t = (cx - S.x) * ux + (cz - S.y) * uy;
            // Distancia perpendicular al eje del muro
            const d = Math.abs((cx - S.x) * nx + (cz - S.y) * ny);

            // Umbral de proximidad al muro
            if (d <= cab.depth + 60 && t >= -cab.width / 2 - 10 && t <= L + cab.width / 2 + 10) {
              return {
                cab,
                t,
                offsetMm: Math.round((t - cab.width / 2) * 10),
                widthMm: Math.round(cab.width * 10),
                heightMm: Math.round(cab.height * 10),
                yBottomMm: Math.round((cab.position[1] - cab.height / 2) * 10),
              };
            }
            return null;
          }).filter(Boolean) as {
            cab: CabinetType;
            t: number;
            offsetMm: number;
            widthMm: number;
            heightMm: number;
            yBottomMm: number;
          }[];

          // Ordenar gabinetes por su posición a lo largo del muro
          cabsOnWall.sort((a, b) => a.t - b.t);

          return { wall, cabinetsOnWall: cabsOnWall };
        });

        // Filtrar ÚNICAMENTE los muros que tienen muebles colocados (cero vistas en blanco)
        let wallsWithCabs = activeWallsData.filter(w => w.cabinetsOnWall.length > 0);

        // Si ningún muro tiene muebles detectados por proximidad, asociar los muebles al muro principal
        if (wallsWithCabs.length === 0 && wallSegments.length > 0) {
          const mainWall = wallSegments[0];
          let runningOffsetMm = 100;
          const cabsOnMain = realCabinets.map(cab => {
            const item = {
              cab,
              t: runningOffsetMm / 10 + cab.width / 2,
              offsetMm: runningOffsetMm,
              widthMm: Math.round(cab.width * 10),
              heightMm: Math.round(cab.height * 10),
              yBottomMm: Math.round((cab.position[1] - cab.height / 2) * 10),
            };
            runningOffsetMm += Math.round(cab.width * 10);
            return item;
          });
          wallsWithCabs = [{ wall: mainWall, cabinetsOnWall: cabsOnMain }];
        }

        // Mostrar solo los muros con muebles reales (máximo 3 para la lámina)
        const displayWalls = wallsWithCabs.slice(0, 3);
        const colSpanClass = displayWalls.length === 1 ? 'col-span-12' : displayWalls.length === 2 ? 'col-span-6' : 'col-span-4';

        return (
          <div className="blueprint-page border border-black/30 flex flex-col justify-between p-6 pb-28 bg-white relative overflow-hidden font-sans select-none">
            
            {/* ENCABEZADO SUPERIOR */}
            <div className="flex justify-between items-start h-[34px] border-b-2 border-slate-900 pb-1 mb-1">
              <div>
                <div className="text-[14px] font-black text-slate-900 tracking-tight uppercase leading-none font-sans flex items-center gap-2">
                  <span>PROYECTO COCINA MODULAR ARQUIFY</span>
                </div>
                <div className="text-[10px] font-bold text-slate-600 tracking-tight uppercase mt-0.5 leading-none">
                  PLANTA GENERAL Y ELEVACIONES ({realCabinets.length} {realCabinets.length === 1 ? 'MÓDULO' : 'MÓDULOS'})
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-500 font-mono font-medium">
                ARQUIFY CAD / SISTEMA INTERIORISMO CORPORATIVO
              </div>
            </div>

            {/* SECTOR SUPERIOR: VISTA PLANTA GENERAL (ARQUITECTURA) - ALTO CONTROLADO 290px */}
            <div className="w-full h-[290px] border-b border-slate-300 pb-2 relative flex flex-col items-center justify-center">
              <div className="absolute top-1 left-1 z-10">
                <span className="text-[8.5px] font-bold text-slate-800 uppercase tracking-wider bg-white/95 border border-slate-300 px-2.5 py-0.5 rounded shadow-2xs">
                  VISTA PLANTA GENERAL (ARQUITECTURA)
                </span>
              </div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full max-h-[280px]">
                  {/* Polígono de Suelo de la Habitación */}
                  {vertices.length >= 3 && (
                    <polygon
                      points={vertices.map(v => `${toSvgX(v.x)},${toSvgY(v.y)}`).join(' ')}
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="4.5"
                      strokeLinejoin="miter"
                    />
                  )}

                  {/* Cotas y Muros Perimetrales */}
                  {(() => {
                    const roomCenterSvgX = vertices.length > 0 ? toSvgX(vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length) : svgW / 2;
                    const roomCenterSvgY = vertices.length > 0 ? toSvgY(vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length) : svgH / 2;

                    return wallSegments.map((wall, wIdx) => {
                      const x1 = toSvgX(wall.start.x);
                      const y1 = toSvgY(wall.start.y);
                      const x2 = toSvgX(wall.end.x);
                      const y2 = toSvgY(wall.end.y);
                      const mx = (x1 + x2) / 2;
                      const my = (y1 + y2) / 2;

                      // Vector normal exterior para la cota
                      const dx = x2 - x1;
                      const dy = y2 - y1;
                      const len = Math.hypot(dx, dy);
                      let normX = len > 0 ? -dy / len : 0;
                      let normY = len > 0 ? dx / len : 0;

                      // Forzar dirección exterior respecto al centro geométrico del recinto
                      const toCenterX = roomCenterSvgX - mx;
                      const toCenterY = roomCenterSvgY - my;
                      if (normX * toCenterX + normY * toCenterY > 0) {
                        normX = -normX;
                        normY = -normY;
                      }

                      const cotaDist = 16;
                      const cx1 = x1 + normX * cotaDist;
                      const cy1 = y1 + normY * cotaDist;
                      const cx2 = x2 + normX * cotaDist;
                      const cy2 = y2 + normY * cotaDist;
                      const cmx = mx + normX * (cotaDist + 4);
                      const cmy = my + normY * (cotaDist + 4);

                    return (
                      <g key={wIdx}>
                        {/* Línea de Cota Exterior Total */}
                        <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="#334155" strokeWidth="0.8" />
                        <line x1={cx1 - normX * 3.5} y1={cy1 - normY * 3.5} x2={cx1 + normX * 3.5} y2={cy1 + normY * 3.5} stroke="#334155" strokeWidth="0.8" />
                        <line x1={cx2 - normX * 3.5} y1={cy2 - normY * 3.5} x2={cx2 + normX * 3.5} y2={cy2 + normY * 3.5} stroke="#334155" strokeWidth="0.8" />
                        <text
                          x={cmx}
                          y={cmy + 3}
                          fontSize="7.5"
                          fontWeight="bold"
                          fill="#0f172a"
                          textAnchor="middle"
                        >
                          {Math.round(wall.length * 10)}
                        </text>

                        {/* Símbolo de Muro / Vista (Ⓐ, Ⓑ, Ⓒ...) con flecha hacia el interior */}
                        <g transform={`translate(${mx - normX * 14}, ${my - normY * 14})`}>
                          <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#16a34a" strokeWidth="1.2" />
                          <text x="0" y="2.5" fontSize="7.5" fontWeight="bold" fill="#16a34a" textAnchor="middle">
                            {wall.label}
                          </text>
                        </g>
                      </g>
                    );
                  });
                })()}

                  {/* Renderizado de MUEBLES REALES en Planta con Sub-Cotas */}
                  {realCabinets.map((cab, cIdx) => {
                    const box = getCabinetBox2D(cab);
                    const svgCorners = box.corners.map(([cx, cz]) => [toSvgX(cx), toSvgY(cz)]);
                    const pointsStr = svgCorners.map(([sx, sy]) => `${sx},${sy}`).join(' ');

                    const isWall = cab.type === 'wall';
                    const isTall = cab.type === 'tall';
                    const isIsland = cab.type === 'island';
                    const centerSvgX = toSvgX(cab.position[0]);
                    const centerSvgY = toSvgY(cab.position[2]);

                    // Etiqueta técnica según tipología
                    let label = `M.B ${Math.round(cab.width * 10)}`;
                    if (isWall) label = `M.A ${Math.round(cab.width * 10)}`;
                    else if (isTall) label = `TORRE ${Math.round(cab.width * 10)}`;
                    else if (isIsland) label = `ISLA ${Math.round(cab.width * 10)}`;
                    else if (cab.variant === '4_drawers' || cab.variant === '2_pot_drawers') label = `CAJ ${Math.round(cab.width * 10)}`;

                    return (
                      <g key={cIdx}>
                        {/* Polígono del Módulo */}
                        <polygon
                          points={pointsStr}
                          fill={isWall ? '#ffffff' : isTall ? '#f8fafc' : '#ffffff'}
                          stroke={isWall ? '#64748b' : '#0f172a'}
                          strokeWidth={isWall ? '1' : '1.3'}
                          strokeDasharray={isWall ? '3,2' : undefined}
                        />

                        {/* Si es Torre / Despensa: Diagonales X */}
                        {isTall && svgCorners.length === 4 && (
                          <g stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2,2">
                            <line x1={svgCorners[0][0]} y1={svgCorners[0][1]} x2={svgCorners[2][0]} y2={svgCorners[2][1]} />
                            <line x1={svgCorners[1][0]} y1={svgCorners[1][1]} x2={svgCorners[3][0]} y2={svgCorners[3][1]} />
                          </g>
                        )}

                        {/* Etiqueta del Módulo */}
                        <text
                          x={centerSvgX}
                          y={centerSvgY + 2.5}
                          fontSize="6.5"
                          fontWeight="bold"
                          fill={isWall ? '#64748b' : '#16a34a'}
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

            {/* SECTOR MEDIO E INFERIOR: VISTAS FRONTALES DE LOS MUROS ACTIVOS - ESCALA UNIFICADA ISO/DIN */}
            <div className="grid grid-cols-12 gap-3 flex-1 pt-1.5 pb-1 items-stretch overflow-hidden">
              {(() => {
                const isSingle = displayWalls.length === 1;
                // Viewbox de elevación adaptativo para llenar la cuadrícula armónicamente
                const elevW = isSingle ? 750 : displayWalls.length === 2 ? 460 : 360;
                const elevH = 260;
                const elevPadX = isSingle ? 50 : 35;
                const elevPadY = 20;
                const groundY = elevH - 35;
                const maxH = 2400; // mm

                // Escala Única Normalizada (Norma ISO 128 / DIN) para mantener rigurosa correspondencia geométrica en todas las vistas
                const maxWallLenMm = Math.max(1200, ...displayWalls.map(w => Math.round(w.wall.length * 10)));
                const commonElevScaleX = (elevW - elevPadX * 2) / maxWallLenMm;
                const commonElevScaleY = (groundY - elevPadY) / maxH;
                const commonElevScale = Math.min(commonElevScaleX, commonElevScaleY);

                return displayWalls.map((wData, wIdx) => {
                  const wall = wData.wall;
                  const cabs = wData.cabinetsOnWall;
                  const wallLenMm = Math.max(1200, Math.round(wall.length * 10));
                  const elevScale = commonElevScale;

                  const wallDrawW = wallLenMm * elevScale;
                  const wallStartX = (elevW - wallDrawW) / 2;
                  const socleHMm = (kState.socleHeight ?? 10) * 10;
                  const socleScaleH = socleHMm * elevScale;

                  return (
                    <div key={wIdx} className={`${colSpanClass} border border-slate-200 p-2.5 rounded flex flex-col justify-between bg-white relative h-full`}>
                      <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-green-600 text-green-600 font-bold text-[8px] flex items-center justify-center">
                            {wall.label}
                          </span>
                          <span className="text-[8.5px] font-black text-slate-900 tracking-wider">
                            VISTA FRONTAL {wall.label}
                          </span>
                        </div>
                        <span className="text-[7.5px] font-mono text-slate-500">L = {wallLenMm} mm</span>
                      </div>

                      {/* Dibujo Elevación SVG Dinámica con Escala Común Normalizada */}
                      <div className="flex-1 flex items-center justify-center overflow-hidden py-1">
                        <svg viewBox={`0 0 ${elevW} ${elevH}`} className="w-full h-full max-h-[380px]">
                          {/* Línea de Suelo (+0.00) */}
                          <line x1="8" y1={groundY} x2={elevW - 8} y2={groundY} stroke="#0f172a" strokeWidth="1.2" />
                          <text x="10" y={groundY + 10} fontSize="7" fill="#64748b">0.00</text>

                          {/* Muro Trasero de Fondo */}
                          <rect
                            x={wallStartX}
                            y={groundY - 2200 * elevScale}
                            width={wallDrawW}
                            height={2200 * elevScale}
                            fill="#f8fafc"
                            stroke="#cbd5e1"
                            strokeWidth="0.8"
                          />

                          {/* Línea de Zócalo General de Muro (h = socleHMm) */}
                          <rect
                            x={wallStartX}
                            y={groundY - socleScaleH}
                            width={wallDrawW}
                            height={socleScaleH}
                            fill="#f1f5f9"
                            stroke="#cbd5e1"
                            strokeWidth="0.6"
                          />

                          {/* Detección y Renderizado de Bancada Metálica Continua Hospitalaria (Norma MC.2.02 SACYR) */}
                          {(() => {
                            const isHospitalMode = kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame';
                            if (!isHospitalMode) return null;

                            const baseCabs = cabs
                              .filter(c => c.cab.type === 'base' || c.cab.type === 'island')
                              .sort((a, b) => a.offsetMm - b.offsetMm);

                            if (baseCabs.length === 0) return null;

                            // Agrupar módulos base contiguos (dentro de 40mm de holgura)
                            const baseRuns: { startMm: number; endMm: number; seamsMm: number[] }[] = [];
                            let curRun: { startMm: number; endMm: number; seamsMm: number[] } | null = null;
                            for (const b of baseCabs) {
                              if (!curRun) {
                                curRun = { startMm: b.offsetMm, endMm: b.offsetMm + b.widthMm, seamsMm: [] };
                              } else {
                                if (Math.abs(b.offsetMm - curRun.endMm) <= 40) {
                                  curRun.seamsMm.push(b.offsetMm);
                                  curRun.endMm = b.offsetMm + b.widthMm;
                                } else {
                                  baseRuns.push(curRun);
                                  curRun = { startMm: b.offsetMm, endMm: b.offsetMm + b.widthMm, seamsMm: [] };
                                }
                              }
                            }
                            if (curRun) baseRuns.push(curRun);

                            const legsHMm = socleHMm;
                            const legsH = legsHMm * elevScale;
                            const bodyBottomY = groundY - legsH;
                            const beamHMm = 30; // Perfil tubular FE 30x50mm
                            const beamH = Math.max(2.5, beamHMm * elevScale);
                            const tubeWMm = 30; // Fuste vertical 30mm
                            const tubeW = Math.max(2.5, tubeWMm * elevScale);
                            const footHMm = 14;
                            const footH = Math.max(1.5, footHMm * elevScale);
                            const footWMm = 48;
                            const footW = Math.max(4, footWMm * elevScale);

                            return (
                              <g name="hospital-continuous-base-elevation">
                                {baseRuns.map((r, rIdx) => {
                                  const rLeftX = wallStartX + r.startMm * elevScale;
                                  const rW = (r.endMm - r.startMm) * elevScale;
                                  const runLengthMm = r.endMm - r.startMm;
                                  let numLegs = 2;
                                  if (runLengthMm <= 900) {
                                    numLegs = 2;
                                  } else if (runLengthMm <= 1900) {
                                    numLegs = 3;
                                  } else if (runLengthMm <= 2500) {
                                    numLegs = 4;
                                  } else {
                                    numLegs = 4 + Math.ceil((runLengthMm - 2500) / 800);
                                  }
                                  const startLegX = rLeftX + 25 * elevScale;
                                  const endLegX = rLeftX + rW - 25 * elevScale - tubeW;
                                  const legXs: number[] = [];
                                  for (let li = 0; li < numLegs; li++) {
                                    legXs.push(startLegX + ((endLegX - startLegX) * li) / (numLegs - 1));
                                  }
                                  const legPostH = Math.max(2, legsH - beamH - footH);
                                  const legPostY = bodyBottomY + beamH;

                                  return (
                                    <g key={`hosp-elev-run-${rIdx}`}>
                                      {/* 1. Larguero Longitudinal Continuo Frontal (FE 30x50mm blanco esmaltado) */}
                                      <rect
                                        x={rLeftX}
                                        y={bodyBottomY}
                                        width={rW}
                                        height={beamH}
                                        fill="#f1f5f9"
                                        stroke="#1e293b"
                                        strokeWidth="1.0"
                                      />

                                      {/* 2. Patas Tubulares Verticales Compartidas con Patines Reguladores M10 */}
                                      {legXs.map((lx, lIdx) => (
                                        <g key={`hosp-elev-leg-${lIdx}`}>
                                          {/* Fuste tubular vertical */}
                                          <rect
                                            x={lx}
                                            y={legPostY}
                                            width={tubeW}
                                            height={legPostH}
                                            fill="#e2e8f0"
                                            stroke="#334155"
                                            strokeWidth="0.6"
                                          />
                                          {/* Collarín regulador metálico */}
                                          <rect
                                            x={lx - (footW * 0.7 - tubeW) / 2}
                                            y={groundY - footH}
                                            width={footW * 0.7}
                                            height={footH * 0.65}
                                            fill="#94a3b8"
                                            stroke="#475569"
                                            strokeWidth="0.4"
                                          />
                                          {/* Base de apoyo sanitario de goma */}
                                          <rect
                                            x={lx - (footW - tubeW) / 2}
                                            y={groundY - footH * 0.35}
                                            width={footW}
                                            height={footH * 0.35}
                                            fill="#0f172a"
                                            rx="0.5"
                                          />
                                        </g>
                                      ))}

                                      {/* Rótulo técnico normativo sobre la bancada continua */}
                                      <text
                                        x={rLeftX + rW / 2}
                                        y={bodyBottomY + legsH * 0.58}
                                        fontSize={Math.max(7.5, 11 * elevScale)}
                                        fill="#0284c7"
                                        fontWeight="900"
                                        textAnchor="middle"
                                        letterSpacing="0.05em"
                                      >
                                        BASTIDOR TUBULAR CONTINUO ACERO FE 30x50 (H=300mm s/MC.2.02)
                                      </text>
                                    </g>
                                  );
                                })}
                              </g>
                            );
                          })()}

                          {/* Renderizado de los Módulos Reales en la Elevación */}
                          {cabs.map((cItem, ci) => {
                            const cab = cItem.cab;
                            const isTall = cab.type === 'tall';
                            const isWall = cab.type === 'wall';
                            const isBase = cab.type === 'base' || cab.type === 'island';
                            const isHospitalMode = kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame';
                            const hasSocle = isBase || isTall;

                            const legsHMm = hasSocle ? socleHMm : 0;
                            const legsH = legsHMm * elevScale;

                            const cLeftX = wallStartX + Math.max(0, cItem.offsetMm * elevScale);
                            const cW = cItem.widthMm * elevScale;
                            const cH = cItem.heightMm * elevScale;
                            const cBottomY = groundY - (cItem.yBottomMm * elevScale);
                            const cTopY = hasSocle ? (groundY - cH) : (cBottomY - cH);
                            const bodyH = hasSocle ? (cH - legsH) : cH;
                            const bodyBottomY = cTopY + bodyH;

                            return (
                              <g key={ci}>
                                {/* Zócalo y Patas Regulables bajo el Módulo (Norma ISO/DIN) - Solo si no es bastidor hospitalario continuo */}
                                {hasSocle && legsH > 0 && (!isHospitalMode || isTall) && (
                                  <g>
                                    {/* Franja de zócalo continuo bajo el mueble */}
                                    <rect
                                      x={cLeftX}
                                      y={bodyBottomY}
                                      width={cW}
                                      height={legsH}
                                      fill="#e2e8f0"
                                      stroke="#475569"
                                      strokeWidth="0.8"
                                    />
                                    {/* Patas técnicas retranqueadas */}
                                    <rect
                                      x={cLeftX + Math.max(2.5, cW * 0.08)}
                                      y={bodyBottomY}
                                      width={Math.max(2, cW * 0.04)}
                                      height={legsH}
                                      fill="#94a3b8"
                                      stroke="#475569"
                                      strokeWidth="0.4"
                                    />
                                    <rect
                                      x={cLeftX + cW - Math.max(2.5, cW * 0.08) - Math.max(2, cW * 0.04)}
                                      y={bodyBottomY}
                                      width={Math.max(2, cW * 0.04)}
                                      height={legsH}
                                      fill="#94a3b8"
                                      stroke="#475569"
                                      strokeWidth="0.4"
                                    />
                                  </g>
                                )}

                                {/* Caja Principal del Módulo (Casco) */}
                                <rect
                                  x={cLeftX}
                                  y={cTopY}
                                  width={cW}
                                  height={bodyH}
                                  fill="#ffffff"
                                  stroke="#0f172a"
                                  strokeWidth="1.2"
                                />

                              {/* Si es Base: Cubierta Superior (+0.90) con Respaldo en Rojo */}
                              {isBase && (
                                <g>
                                  <rect
                                    x={cLeftX - 1}
                                    y={cTopY - 4}
                                    width={cW + 2}
                                    height={4}
                                    fill="#fecdd3"
                                    stroke="#e11d48"
                                    strokeWidth="0.8"
                                  />
                                </g>
                              )}

                              {/* Detalles de Frentes / Puertas / Cajones sobre el cuerpo del mueble */}
                              {cab.variant === '4_drawers' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.25} x2={cLeftX + cW} y2={cTopY + bodyH * 0.25} />
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.5} x2={cLeftX + cW} y2={cTopY + bodyH * 0.5} />
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.75} x2={cLeftX + cW} y2={cTopY + bodyH * 0.75} />
                                </g>
                              ) : cab.variant === '2_pot_drawers' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.5} x2={cLeftX + cW} y2={cTopY + bodyH * 0.5} />
                                </g>
                              ) : cab.variant === '2_doors' || cab.variant === 'wall_2_doors' || cab.variant === 'tall_2_doors' ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX + cW / 2} y1={cTopY} x2={cLeftX + cW / 2} y2={bodyBottomY} />
                                  {/* Diagonales de apertura */}
                                  <path d={`M ${cLeftX} ${cTopY + bodyH / 2} L ${cLeftX + cW / 2} ${cTopY} L ${cLeftX + cW / 2} ${bodyBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                  <path d={`M ${cLeftX + cW} ${cTopY + bodyH / 2} L ${cLeftX + cW / 2} ${cTopY} L ${cLeftX + cW / 2} ${bodyBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                </g>
                              ) : isTall ? (
                                <g stroke="#0f172a" strokeWidth="0.7">
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.3} x2={cLeftX + cW} y2={cTopY + bodyH * 0.3} />
                                  <line x1={cLeftX} y1={cTopY + bodyH * 0.7} x2={cLeftX + cW} y2={cTopY + bodyH * 0.7} />
                                </g>
                              ) : (
                                <g>
                                  {/* Puerta 1 hoja con diagonal */}
                                  <path d={`M ${cLeftX} ${cTopY + bodyH / 2} L ${cLeftX + cW} ${cTopY} L ${cLeftX + cW} ${bodyBottomY} Z`} fill="none" stroke="#c026d3" strokeWidth="0.6" />
                                </g>
                              )}

                              {/* Cota de Ancho del Módulo */}
                              <g stroke="#000" strokeWidth="0.6">
                                <line x1={cLeftX} y1={cTopY - 6} x2={cLeftX + cW} y2={cTopY - 6} />
                                <line x1={cLeftX} y1={cTopY - 10} x2={cLeftX} y2={cTopY - 2} />
                                <line x1={cLeftX + cW} y1={cTopY - 10} x2={cLeftX + cW} y2={cTopY - 2} />
                                <text x={cLeftX + cW / 2} y={cTopY - 8} fontSize="7" fontWeight="bold" fill="#000" stroke="none" textAnchor="middle">
                                  {cItem.widthMm}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Cota de Altura Total Muro a la Izquierda (h=2200) */}
                        <g stroke="#c026d3" strokeWidth="0.7">
                          <line x1={wallStartX - 10} y1={groundY} x2={wallStartX - 10} y2={groundY - 2200 * elevScale} />
                          <line x1={wallStartX - 14} y1={groundY} x2={wallStartX - 6} y2={groundY} />
                          <line x1={wallStartX - 14} y1={groundY - 2200 * elevScale} x2={wallStartX - 6} y2={groundY - 2200 * elevScale} />
                          <text
                            x={wallStartX - 16}
                            y={groundY - 1100 * elevScale}
                            fontSize="7.5"
                            fontWeight="bold"
                            fill="#c026d3"
                            stroke="none"
                            textAnchor="middle"
                            transform={`rotate(-90 ${wallStartX - 16} ${groundY - 1100 * elevScale})`}
                          >
                            2200
                          </text>
                        </g>

                        {/* Cota de Altura de Zócalo a la Izquierda */}
                        <g stroke="#475569" strokeWidth="0.6">
                          <line x1={wallStartX - 3} y1={groundY} x2={wallStartX - 3} y2={groundY - socleScaleH} />
                          <line x1={wallStartX - 5.5} y1={groundY} x2={wallStartX - 0.5} y2={groundY} />
                          <line x1={wallStartX - 5.5} y1={groundY - socleScaleH} x2={wallStartX - 0.5} y2={groundY - socleScaleH} />
                          <text
                            x={wallStartX - 6}
                            y={groundY - socleScaleH / 2 + 2}
                            fontSize="5.5"
                            fontWeight="bold"
                            fill="#334155"
                            stroke="none"
                            textAnchor="end"
                          >
                            {socleHMm}
                          </text>
                        </g>

                        {/* Indicador de Nivel +0.90 Cubierta y Nivel Zócalo */}
                        <text x={wallStartX + wallDrawW + 6} y={groundY - 900 * elevScale + 3} fontSize="6" fill="#e11d48" fontWeight="bold">
                          +0.90
                        </text>
                        <text x={wallStartX + wallDrawW + 6} y={groundY - socleScaleH + 2} fontSize="5" fill="#475569" fontWeight="bold">
                          +{(socleHMm / 1000).toFixed(2)}
                        </text>

                        {/* Cota de Largo Total del Muro Inferior */}
                        <g stroke="#000" strokeWidth="0.7">
                          <line x1={wallStartX} y1={groundY + 18} x2={wallStartX + wallDrawW} y2={groundY + 18} />
                          <line x1={wallStartX} y1={groundY + 14} x2={wallStartX} y2={groundY + 22} />
                          <line x1={wallStartX + wallDrawW} y1={groundY + 14} x2={wallStartX + wallDrawW} y2={groundY + 22} />
                          <text x={wallStartX + wallDrawW / 2} y={groundY + 28} fontSize="7.5" fontWeight="bold" fill="#000" stroke="none" textAnchor="middle">
                            {wallLenMm}
                          </text>
                        </g>
                      </svg>
                    </div>

                    <div className="text-[7px] text-slate-500 border-t border-slate-100 pt-0.5 flex justify-between">
                      <span>Zócalo H={socleHMm} mm | Murales con puertas y anclajes</span>
                      <span className="font-bold text-slate-700">Costados / Casco: {getColorName(state.structureColor)}</span>
                    </div>
                  </div>
                );
              });
            })()}
            </div>

            {/* VIÑETA ARQUITECTÓNICA INFERIOR ESTANDARIZADA (EN LA BASE EXACTA DE LA HOJA) */}
            <BlueprintTitleBlock 
              pageNum={1} 
              title="PROYECTO COCINA MODULAR ARQUIFY" 
              identTag="PL-01" 
              customContent="PLANTA GENERAL Y ELEVACIONES" 
              sheetType="architectural"
            />

          </div>
        );
      })()}

      {/* LÁMINA TÉCNICA DE INSTALACIONES MEP (AGUA, DESAGÜE, GAS, FUERZA) */}
      {hasMepPage && (
        <KitchenMepBlueprintSheet pageNum={2} />
      )}

      {/* LÁMINA TÉCNICA DE FABRICACIÓN DE BASTIDOR METÁLICO TUBULAR SANITARIO (NORMA MC.2.02 SACYR) */}
      {hasHospitalFramePage && (
        <KitchenHospitalBaseFrameSheet pageNum={2 + mepPagesCount} />
      )}

      {/* 2. LÁMINAS TÉCNICAS DE FABRICACIÓN POR MÓDULO (Estilo Plano de Referencia) */}
      {printPages.map((page, pIdx) => {
        const pageNum = pIdx + 2 + mepPagesCount + hospitalFramePagesCount;
        const cab = page.cab;

        // Escala consistente para el despiece de piezas del módulo
        const maxDimInModule = Math.max(...page.moduleParts.map(p => Math.max(p.length, p.width)), 600);
        const partScale = 220 / maxDimInModule;

        // Escala para las 3 vistas arquitectónicas del módulo
        const totalW = cab.width + cab.depth;
        const totalH = cab.depth + cab.height;
        const viewScale = Math.min(260 / totalW, 440 / totalH, 2.2);

        const legsH = (cab.type === 'base' || cab.type === 'tall' || cab.type === 'island') ? (kState.socleHeight ?? 10) : 0;
        const bodyH = cab.height - legsH;
        const isHospBase = (kState.projectMode === 'hospital' || kState.hospitalBaseType === 'metal_frame') && (cab.type === 'base' || cab.type === 'island');

        return (
          <div key={pIdx} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 bg-white relative">
            
            {/* Header del Módulo */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div>
                <div className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  NV-{cab.id.slice(0, 5).toUpperCase()} - COCINA MODULAR
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  {getCabinetTypeName(cab)} {page.identTag} {isHospBase ? `(CASCO: ${cab.width} x ${bodyH} x ${cab.depth} cm)` : `(${cab.width} x ${cab.height} x ${cab.depth} cm)`}
                </h2>
                <div className="flex gap-4 text-xs text-slate-600 mt-1 font-medium items-center flex-wrap">
                  <span><strong>Estructura:</strong> {getColorName(cab.structureColor || state.structureColor)} {thicknessMm}mm</span>
                  {(() => {
                    const isDrawerOnlyCabinet = (cab.variant?.includes('drawer') || cab.variant === 'hospital_meson_3drawers') && !isCabinetWithDoors(cab);
                    const activeFrontColor = isDrawerOnlyCabinet ? (cab.drawerFrontColor || state.drawerFrontColor || cab.doorColor || state.doorColor) : (cab.doorColor || state.doorColor);
                    const activeFrontMat = isDrawerOnlyCabinet ? (cab.drawerFrontMaterial || state.drawerFrontMaterial || 'melamina') : (cab.doorMaterial || state.doorMaterial);
                    const isFrontHpl = isHplFinish(activeFrontColor, activeFrontMat, isDrawerOnlyCabinet ? undefined : cab);
                    return (
                      <span><strong>Frentes:</strong> {isFrontHpl ? `${getColorName(activeFrontColor)} (HPL 0.9mm + Sustrato MDF 18mm)` : `${getColorName(activeFrontColor)} ${thicknessMm}mm`}</span>
                    );
                  })()}
                  <span><strong>Trasera:</strong> Durolac 3.5mm</span>
                  {isHospBase && (
                    <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-bold text-[11px]">
                      Base: Bastidor Tubular Continuo (Ver Plano Independiente EST-01)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="border-2 border-rose-600 bg-rose-50 px-4 py-1.5 rounded-md text-center shadow-xs">
                  <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">IDENT. ETIQ</div>
                  <div className="font-mono font-black text-2xl text-rose-600 leading-none mt-0.5">{page.identTag}</div>
                </div>
              </div>
            </div>

            {/* Contenido Principal: Vistas 3D a la Izquierda + Despiece a la Derecha */}
            <div className="flex-1 grid grid-cols-12 gap-8 pb-32 overflow-hidden items-start pt-2">
              
              {/* COLUMNA IZQUIERDA: 3 VISTAS DEL MÓDULO (Planta, Frontal, Lateral) */}
              <div className="col-span-4 border-r-2 border-slate-300 pr-4 flex flex-col justify-between items-center py-1 h-full">
                {renderCabinetOrthographicViews(cab)}
              </div>

              {/* COLUMNA DERECHA: DESPIECE TÉCNICO Y PERFORACIONES PARAMÉTRICAS */}
              <div className="col-span-8 flex flex-col justify-between">
                
                {/* Cuadrícula de Piezas */}
                <div className="grid grid-cols-4 gap-x-4 gap-y-4 items-start pr-2 pt-1">
                  {page.parts.map((part, pSubIdx) => (
                    <div key={pSubIdx} className="flex flex-col items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      {/* Cabecera de la Pieza */}
                      <div className="w-full flex flex-col items-center mb-1.5 justify-center">
                        <div className="text-xs font-black text-slate-900 uppercase tracking-tight text-center leading-tight line-clamp-1 max-w-full">
                          {part.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded font-mono font-black tracking-wide">
                            {part.qty} UN {multiplier > 1 ? `(LOTE: ${part.qty * multiplier})` : ''}
                          </span>
                          <span className="text-[11px] text-slate-800 font-mono font-black">
                            {(part.name.includes('Puerta') || part.name.includes('Frente')) && !part.name.toLowerCase().includes('contrafrente') && (part.isHpl !== undefined ? part.isHpl : isHplFinish(part.material, cab.doorMaterial || state.doorMaterial))
                              ? '18mm (HPL s/ MDF 18mm)'
                              : `${Number(part.thickness.toFixed(1))}mm`}
                          </span>
                        </div>
                      </div>

                      {/* Contenedor Gráfico de la Pieza a Escala Vectorial SVG */}
                      <div className="w-full flex items-center justify-center p-0.5">
                        {renderUnifiedPartSVG(part, cab)}
                      </div>

                      {/* Botón CNC DXF por pieza individual */}
                      <button
                        onClick={() => {
                          const cncPart = calculateCncMachiningForPart(
                            part, 
                            cab, 
                            state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar', 
                            state.assemblyType === 'minifix' ? 'minifix' : 'spax', 
                            kState.golaSystem,
                            kState.handleConfig
                          );
                          downloadPartDxfFile(cncPart);
                        }}
                        className="print:hidden mt-2 px-2.5 py-1 bg-slate-800 hover:bg-orange-600 active:scale-95 text-white rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title={`Descargar archivo DXF CNC para ${part.name}`}
                      >
                        <Download size={10} />
                        <span>DXF CNC</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* DETALLES TÉCNICOS AMPLIADOS (Callouts al pie según plano de referencia) */}
                <div className="grid grid-cols-4 gap-3 bg-slate-50/95 p-3 rounded-lg border border-slate-200 mt-4">
                  {/* Detalle 1: Canal Durolac */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-13 h-13 rounded-full border-2 border-purple-500 bg-white flex items-center justify-center shrink-0 shadow-xs p-1">
                      <svg viewBox="0 0 50 50" className="w-full h-full">
                        <rect x="5" y="10" width="40" height="30" fill="#f8fafc" stroke="#334155" strokeWidth="1.4"/>
                        <rect x="26" y="10" width="8" height="18" fill="#f3e8ff" stroke="#9333ea" strokeWidth="1.4" strokeDasharray="1,1"/>
                        <line x1="26" y1="34" x2="34" y2="34" stroke="#2563eb" strokeWidth="1.2"/>
                      </svg>
                    </div>
                    <div className="text-xs text-slate-800 leading-tight">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-purple-700 uppercase">DETALLE 1</span>
                        <span className="bg-purple-100 text-purple-800 font-mono font-bold text-[9px] px-1 rounded border border-purple-200">4mm</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">CANAL TRASERA</div>
                      <div className="text-slate-600 font-medium text-[9.5px]">A 15mm • Prof. 7.5mm</div>
                    </div>
                  </div>

                  {/* Detalle 2: Ensamble Minifix o Tornillo */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-13 h-13 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center shrink-0 shadow-xs p-1">
                      <svg viewBox="0 0 50 50" className="w-full h-full">
                        {state.assemblyType === 'minifix' ? (
                          <>
                            <circle cx="25" cy="25" r="14" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.4"/>
                            <circle cx="25" cy="25" r="4.5" fill="#16a34a"/>
                            <line x1="9" y1="25" x2="41" y2="25" stroke="#16a34a" strokeWidth="1"/>
                          </>
                        ) : (
                          <>
                            <circle cx="25" cy="25" r="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5"/>
                            <line x1="18" y1="18" x2="32" y2="32" stroke="#2563eb" strokeWidth="1.4"/>
                            <line x1="18" y1="32" x2="32" y2="18" stroke="#2563eb" strokeWidth="1.4"/>
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="text-xs text-slate-800 leading-tight">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-emerald-700 uppercase">DETALLE 2</span>
                        <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-[9px] px-1 rounded border border-emerald-200">
                          {state.assemblyType === 'minifix' ? 'Ø15 Minifix' : 'Ø5 Tornillo'}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">ENSAMBLE ESTRUCTURAL</div>
                      <div className="text-slate-600 font-medium text-[9.5px]">
                        {state.assemblyType === 'minifix' ? 'Minifix 34mm + Tarugo' : 'Soberbio 5x50 a 50mm'}
                      </div>
                    </div>
                  </div>

                  {/* Detalle 3: Cazoleta Bisagra */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-13 h-13 rounded-full border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 shadow-xs p-1">
                      <svg viewBox="0 0 50 50" className="w-full h-full">
                        <circle cx="25" cy="25" r="16" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.4" strokeDasharray="2,2"/>
                        <circle cx="25" cy="25" r="4.5" fill="#ea580c"/>
                        <line x1="25" y1="4" x2="25" y2="46" stroke="#ea580c" strokeWidth="0.9" strokeDasharray="1,1"/>
                      </svg>
                    </div>
                    <div className="text-xs text-slate-800 leading-tight">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-orange-700 uppercase">DETALLE 3</span>
                        <span className="bg-orange-100 text-orange-800 font-mono font-bold text-[9px] px-1 rounded border border-orange-200">Ø35mm</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">CAZOLETA BISAGRA</div>
                      <div className="text-slate-600 font-medium text-[9.5px]">Eje a 22.5mm • A 90mm ext.</div>
                    </div>
                  </div>

                  {/* Detalle 4: Soportes de Repisa / Pitón Ø5 */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-13 h-13 rounded-full border-2 border-sky-500 bg-white flex items-center justify-center shrink-0 shadow-xs p-1">
                      <svg viewBox="0 0 50 50" className="w-full h-full">
                        <circle cx="25" cy="25" r="7" fill="#0284c7" stroke="#0369a1" strokeWidth="1.4"/>
                        <line x1="16" y1="25" x2="34" y2="25" stroke="#ffffff" strokeWidth="1"/>
                        <line x1="25" y1="16" x2="25" y2="34" stroke="#ffffff" strokeWidth="1"/>
                      </svg>
                    </div>
                    <div className="text-xs text-slate-800 leading-tight">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-sky-700 uppercase">DETALLE 4</span>
                        <span className="bg-sky-100 text-sky-800 font-mono font-bold text-[9px] px-1 rounded border border-sky-200">Ø5mm</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">SOPORTE REPISA</div>
                      <div className="text-slate-600 font-medium text-[9.5px]">Pernos anti-vuelco</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* TitleBlock de la Lámina Técnica */}
            <BlueprintTitleBlock 
              pageNum={pageNum} 
              title={`PLANOS DE FABRICACIÓN: ${getCabinetTypeName(cab)}`} 
              cab={cab}
              identTag={page.identTag}
              sheetType="cabinet"
              isContinuation={page.isContinuation}
              pageSubIndex={page.pageSubIndex}
              totalModPages={page.totalModPages}
            />

          </div>
        );
      })}

      {/* 3. PLANOS DE OPTIMIZACIÓN DE CORTE (NESTING) */}
      {groupedBoardResults.map((board, bIndex) => {
        const pageNum = 1 + mepPagesCount + hospitalFramePagesCount + printPages.length + bIndex + 1;
        const isPatternBatch = board.patternCount && board.patternCount > 1;

        return (
          <div key={'board-' + bIndex} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 pb-32 bg-white relative">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                    {board.label}
                  </span>
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Patrón #{bIndex + 1} de {groupedBoardResults.length} {board.totalPatternCount ? `(${board.totalPatternCount} planchas totales)` : ''}
                  </span>
                  {isPatternBatch && (
                    <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded bg-orange-600 text-white shadow-xs">
                      ★ {board.patternCount} PLANCHAS IDÉNTICAS ({board.slabIndicesRange})
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  Esquema de Corte & Optimización <span className="text-orange-500">#{bIndex + 1}</span> {isPatternBatch ? <span className="text-orange-600 font-black text-lg">[x{board.patternCount} UNIDADES IDÉNTICAS]</span> : ''}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Material: <span className="font-bold text-slate-800">{board.materialName}</span> • Formato: <span className="font-mono font-bold text-slate-800">{board.w} x {board.h} x {board.thicknessMm} mm</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Aprovechamiento</p>
                <p className="font-mono text-xl font-bold text-emerald-600">{(100 - board.wastePercentage).toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center my-auto">
              <svg 
                viewBox={`-20 -20 ${board.w + 40} ${board.h + 40}`} 
                className="w-full max-w-[880px] max-h-[500px] bg-slate-100 border-2 border-slate-800 rounded shadow-md"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Plancha Base */}
                <rect x={0} y={0} width={board.w} height={board.h} fill="#f8fafc" stroke="#334155" strokeWidth={3} />
                
                {board.placedParts.map((bp, pi) => {
                  const fontSize = Math.max(16, Math.min(bp.w / 9, bp.h / 4, 34));
                  return (
                    <g key={pi}>
                      <rect
                        x={bp.x}
                        y={bp.y}
                        width={bp.w}
                        height={bp.h}
                        fill="#ffffff"
                        stroke="#1e293b"
                        strokeWidth={1.5}
                      />
                      {/* Tapacantos visuales */}
                      {bp.edgeTop && <line x1={bp.x} y1={bp.y + 2} x2={bp.x + bp.w} y2={bp.y + 2} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeBottom && <line x1={bp.x} y1={bp.y + bp.h - 2} x2={bp.x + bp.w} y2={bp.y + bp.h - 2} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeLeft && <line x1={bp.x + 2} y1={bp.y} x2={bp.x + 2} y2={bp.y + bp.h} stroke="#f97316" strokeWidth={4} />}
                      {bp.edgeRight && <line x1={bp.x + bp.w - 2} y1={bp.y} x2={bp.x + bp.w - 2} y2={bp.y + bp.h} stroke="#f97316" strokeWidth={4} />}

                      {bp.h > 40 && bp.w > 60 && (
                        <>
                          <text
                            x={bp.x + bp.w / 2}
                            y={bp.y + bp.h / 2 - (bp.h > 75 ? fontSize * 0.35 : 0)}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {bp.name.replace(/\(Cab \d+ [^)]+\)/, '')}
                          </text>
                          {bp.h > 75 && (
                            <text
                              x={bp.x + bp.w / 2}
                              y={bp.y + bp.h / 2 + fontSize * 0.9}
                              textAnchor="middle"
                              fontSize={fontSize * 0.8}
                              fontFamily="monospace"
                              fontWeight="bold"
                              fill="#ea580c"
                            >
                              {bp.w} x {bp.h} mm
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2 shrink-0">
              <div className="flex gap-8">
                <p><span className="font-bold text-black">Formato Plancha:</span> {board.w} x {board.h} mm</p>
                <p><span className="font-bold text-black">Espesor Hoja Sierra:</span> 3.2 mm</p>
                <p><span className="font-bold text-black">Margen Refilado:</span> 15 mm</p>
              </div>
              <div>
                <span className="font-bold text-black">Total Piezas Plancha:</span> {board.placedParts.length} un.
              </div>
            </div>

            <BlueprintTitleBlock 
              pageNum={pageNum} 
              title={`OPTIMIZACIÓN CORTE: ${board.label}`}
              identTag={`OPT-${bIndex + 1}`}
              customContent={`PATRÓN #${bIndex + 1} DE ${groupedBoardResults.length} ${isPatternBatch ? `[x${board.patternCount} PLANCHAS (${board.slabIndicesRange})]` : `(PLANCHA #${board.id})`} - ${board.materialName} ${board.thicknessMm}mm`}
              sheetType="nesting"
            />
          </div>
        );
      })}

      {/* 3.1. PLANOS DE OPTIMIZACIÓN DE CORTE EN PLANCHA CUBIERTAS */}
      {kState.countertopConfig?.enabled && ctBOM && ctBOM.slabsLayout.map((slab, sIndex) => {
        const pageNum = 1 + mepPagesCount + hospitalFramePagesCount + printPages.length + boardPagesCount + sIndex + 1;
        const bType = kState.countertopConfig.buildingType === 'edificio' ? 'Edificio (máx 2000 mm)' : 'Casa (máx 2500 mm)';
        const isPatternBatch = slab.patternCount && slab.patternCount > 1;
        const padX = Math.round(slab.slabWidthMm * 0.02);
        const padY = Math.round(slab.slabHeightMm * 0.04);
        const vbW = slab.slabWidthMm + padX * 2;
        const vbH = slab.slabHeightMm + padY * 2;

        return (
          <div key={'qstone-slab-' + sIndex} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 pb-32 bg-white relative">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Marmolería & Cubiertas
                  </span>
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                    Patrón #{sIndex + 1} de {ctBOM.slabsLayout.length} {slab.totalPatternCount ? `(${slab.totalPatternCount} planchas totales)` : ''}
                  </span>
                  {isPatternBatch && (
                    <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded bg-orange-600 text-white shadow-xs">
                      ★ {slab.patternCount} PLANCHAS IDÉNTICAS ({slab.slabIndicesRange})
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                  Esquema de Corte & Optimización en Plancha <span className="text-amber-600">#{slab.slabIndex}</span> {isPatternBatch ? <span className="text-orange-600 font-black text-lg">[x{slab.patternCount} UNIDADES IDÉNTICAS]</span> : ''}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                  Material: <span className="font-bold text-slate-800">{ctBOM.product.name}</span> • Espesor: <span className="font-bold text-slate-800">{ctBOM.product.thicknessMm} mm</span> • Criterio Logístico: <span className="font-bold text-amber-700">{bType}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Aprovechamiento</p>
                <p className="font-mono text-xl font-bold text-emerald-600">{slab.efficiencyPercent}%</p>
                <p className="text-[10px] text-slate-500 font-mono">Útil: {slab.usedAreaM2} m² | Retazo: {slab.offcutAreaM2} m²</p>
              </div>
            </div>

            <div className="w-full flex items-center justify-center my-auto">
              <svg
                viewBox={`${-padX} ${-padY} ${vbW} ${vbH}`}
                className="w-full max-w-[940px] max-h-[460px] bg-slate-50 border-2 border-slate-800 rounded shadow-md"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Plancha Base con formato real paramétrico */}
                <rect x={0} y={0} width={slab.slabWidthMm} height={slab.slabHeightMm} fill="#f1f5f9" stroke="#1e293b" strokeWidth={4} />

                {/* Margen de despunte perimetral de fábrica (10mm) */}
                <rect x={10} y={10} width={slab.slabWidthMm - 20} height={slab.slabHeightMm - 20} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="16,8" />

                {/* Piezas Anidadas */}
                {slab.pieces.map((p, pIdx) => {
                  let fillColor = '#fef3c7'; // amber-100
                  let strokeColor = '#d97706'; // amber-600
                  if (p.type === 'apron') {
                    fillColor = '#ffedd5'; // orange-100
                    strokeColor = '#ea580c'; // orange-600
                  } else if (p.type === 'backsplash') {
                    fillColor = '#e0f2fe'; // sky-100
                    strokeColor = '#0284c7'; // sky-600
                  } else if (p.type === 'waterfall') {
                    fillColor = '#f3e8ff'; // purple-100
                    strokeColor = '#9333ea'; // purple-600
                  }

                  const fontSize = Math.max(20, Math.min(p.widthMm / 16, p.lengthMm / 4, 46));

                  return (
                    <g key={pIdx}>
                      <rect
                        x={p.x}
                        y={p.y}
                        width={p.widthMm}
                        height={p.lengthMm}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={3}
                      />

                      {/* Calado de lavaplatos o encimera en líneas punteadas */}
                      {p.hasCutout && p.widthMm > 600 && p.lengthMm > 350 && (
                        <g>
                          <rect
                            x={p.x + (p.widthMm - (p.hasCutout === 'sink' ? 695 : 550)) / 2}
                            y={p.y + (p.lengthMm - (p.hasCutout === 'sink' ? 400 : 470)) / 2}
                            width={p.hasCutout === 'sink' ? 695 : 550}
                            height={p.hasCutout === 'sink' ? 400 : 470}
                            fill="#ffffff"
                            stroke="#dc2626"
                            strokeWidth={3}
                            strokeDasharray="12,8"
                          />
                          <text
                            x={p.x + p.widthMm / 2}
                            y={p.y + p.lengthMm / 2 + 8}
                            textAnchor="middle"
                            fontSize={24}
                            fontWeight="bold"
                            fill="#dc2626"
                          >
                            {p.hasCutout === 'sink' ? 'CALADO ENCASTRE LAVAPLATOS' : 'CALADO ENCIMERA'}
                          </text>
                        </g>
                      )}

                      {/* Identificación y medidas de la pieza */}
                      {p.widthMm > 150 && p.lengthMm > 40 && (
                        <>
                          <text
                            x={p.x + p.widthMm / 2}
                            y={p.y + p.lengthMm / 2 - (p.lengthMm > 90 ? fontSize * 0.35 : 0)}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {p.pieceId}
                          </text>
                          {p.lengthMm > 90 && (
                            <text
                              x={p.x + p.widthMm / 2}
                              y={p.y + p.lengthMm / 2 + fontSize * 0.85}
                              textAnchor="middle"
                              fontSize={fontSize * 0.75}
                              fontFamily="monospace"
                              fontWeight="bold"
                              fill="#b45309"
                            >
                              {p.widthMm} x {p.lengthMm} mm
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2 shrink-0">
              <div className="flex gap-8">
                <p><span className="font-bold text-black">Formato Plancha:</span> {slab.slabWidthMm} x {slab.slabHeightMm} mm</p>
                <p><span className="font-bold text-black">Espesor Disco Diamante:</span> Kerf 3.5 mm</p>
                <p><span className="font-bold text-black">Despunte Perimetral:</span> 10 mm</p>
                <p><span className="font-bold text-black">Criterio Logístico:</span> {bType}</p>
                {isPatternBatch && (
                  <p><span className="font-bold text-orange-600">Repetición en Lote:</span> {slab.patternCount} planchas</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-600"></span><span>Cubierta</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-200 border border-orange-600"></span><span>Faldón</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-200 border border-sky-600"></span><span>Respaldo</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-200 border border-purple-600"></span><span>Cascada</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-600 border-dashed"></span><span>Encastre</span></div>
              </div>
            </div>

            <BlueprintTitleBlock 
              pageNum={pageNum} 
              title={`OPTIMIZACIÓN CUBIERTA ${ctBOM.product.name.toUpperCase()}: PLANCHA #${slab.slabIndex}${isPatternBatch ? ` (x${slab.patternCount} UN)` : ''}`}
              identTag={`QS-${slab.slabIndex}${isPatternBatch ? ` (x${slab.patternCount})` : ''}`}
              customContent={`${ctBOM.product.name}${isPatternBatch ? ` • LOTE ${slab.patternCount} PLANCHAS (${slab.slabIndicesRange})` : ''}`}
              sheetType="countertop"
            />
          </div>
        );
      })}
      
      {/* 4. LISTADO CONSOLIDADO DE MATERIALES E INSUMOS (BOM) PAGINADO */}
      {(() => {
        const bomChunks: typeof effectiveHardwareList[] = [];
        for (let i = 0; i < effectiveHardwareList.length; i += BOM_ITEMS_PER_PAGE) {
          bomChunks.push(effectiveHardwareList.slice(i, i + BOM_ITEMS_PER_PAGE));
        }
        if (bomChunks.length === 0) {
          bomChunks.push([]);
        }

        const baseBomPageNum = 1 + mepPagesCount + hospitalFramePagesCount + printPages.length + boardPagesCount + stonePagesCount;

        return bomChunks.map((chunk, bomIdx) => {
          const currentPageNum = baseBomPageNum + bomIdx + 1;
          const isMultiPage = bomChunks.length > 1;
          const bomTag = isMultiPage ? `BOM-${String(bomIdx + 1).padStart(2, '0')}` : 'BOM-01';

          return (
            <div key={`bom-page-${bomIdx}`} className="blueprint-page border border-black/10 flex flex-col justify-between p-8 bg-white relative">
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-3 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      CÓMPUTO MÉTRICO & HERRAJES {isMultiPage ? `(PARTE ${bomIdx + 1} DE ${bomChunks.length})` : ''}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                    Listado Consolidado de Materiales e Insumos <span className="text-orange-500">(BOM)</span> {multiplier > 1 ? `[LOTE: ${multiplier} UNIDADES]` : ''}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                    Sistema: {state.assemblyType === 'minifix' ? 'Minifix + Tarugo 8x30' : 'Soberbio / Spax 5x50'} • Correderas: {state.drawerHardware} • Tableros Formato Estándar
                  </p>
                </div>
                {isMultiPage && (
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                      Ítems {bomIdx * BOM_ITEMS_PER_PAGE + 1} - {Math.min((bomIdx + 1) * BOM_ITEMS_PER_PAGE, effectiveHardwareList.length)} de {effectiveHardwareList.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden mb-28">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]">
                      <th className="p-2 border-b-2 border-slate-300 w-[12%]">Categoría</th>
                      <th className="p-2 border-b-2 border-slate-300 w-[30%]">Ítem / Componente</th>
                      <th className="p-2 border-b-2 border-slate-300 text-center w-[10%]">Cantidad</th>
                      <th className="p-2 border-b-2 border-slate-300 text-center w-[10%]">Unidad</th>
                      <th className="p-2 border-b-2 border-slate-300 w-[38%]">Detalles de Aplicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((hw, idx) => {
                      const catColors: Record<string, string> = {
                        Tableros: 'bg-amber-100 text-amber-900',
                        Cubiertas: 'bg-emerald-100 text-emerald-900',
                        Insumos: 'bg-sky-100 text-sky-900',
                        Quincallería: 'bg-blue-100 text-blue-900',
                        'Estructura Metálica': 'bg-slate-200 text-slate-900',
                        Zócalos: 'bg-teal-100 text-teal-900',
                        Tiradores: 'bg-indigo-100 text-indigo-900',
                        Equipamiento: 'bg-purple-100 text-purple-900',
                        Decoración: 'bg-pink-100 text-pink-900'
                      };
                      const badgeClass = catColors[hw.Categoria] || 'bg-slate-100 text-slate-800';

                      return (
                        <tr key={idx} className="border-b border-slate-200 even:bg-slate-50/50">
                          <td className="p-2">
                            <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${badgeClass}`}>
                              {hw.Categoria || 'General'}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-slate-800">{hw.Item}</td>
                          <td className="p-2 text-center font-mono font-bold text-slate-900">{hw.Cantidad}</td>
                          <td className="p-2 text-center text-slate-500">{hw.Unidad}</td>
                          <td className="p-2 text-slate-600 text-[11px] leading-snug">{hw.Detalles || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <BlueprintTitleBlock 
                pageNum={currentPageNum} 
                title={`LISTADO CONSOLIDADO DE MATERIALES E INSUMOS (BOM)${isMultiPage ? ` [${bomIdx + 1}/${bomChunks.length}]` : ''}`} 
                identTag={bomTag}
                customContent={`CÓMPUTO MÉTRICO, HERRAJES Y FIJACIONES${isMultiPage ? ` (HOJA ${bomIdx + 1} DE ${bomChunks.length})` : ''}`}
                sheetType="bom"
              />
            </div>
          );
        });
      })()}
      </div>

      {/* Modal de PDF Listo para Descargar */}
      {generatedPdfUrl && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">¡Planos A3 Generados con Éxito!</h3>
              <p className="text-slate-600 text-sm mt-2">Su documento PDF de fabricación está listo. Puedes descargarlo directamente o abrirlo en una pestaña nueva.</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (!generatedPdfUrl) return;
                  const link = document.createElement('a');
                  link.href = generatedPdfUrl;
                  link.download = 'planos_fabricacion_cocina_A3.pdf';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  setTimeout(() => {
                    if (link.parentNode) document.body.removeChild(link);
                  }, 500);
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer text-base"
              >
                <Download size={20} />
                <span>Descargar Archivo PDF</span>
              </button>

              <a
                href={generatedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <FileText size={16} />
                <span>Abrir / Ver PDF en Nueva Pestaña</span>
              </a>

              <button
                type="button"
                onClick={() => setGeneratedPdfUrl(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-6 rounded-2xl transition-all cursor-pointer text-sm"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cotización Dual B2B & Retail integrado */}
      <KitchenB2BQuoteModal
        isOpen={isB2BQuoteOpen}
        onClose={() => setIsB2BQuoteOpen(false)}
      />

    </div>
  );
}
