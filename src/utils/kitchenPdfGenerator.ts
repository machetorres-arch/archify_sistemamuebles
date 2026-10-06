import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CabinetType, useKitchenStore } from '../store/kitchenStore';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS, isHplFinish, calculateKitchenBoardNesting } from './kitchenManufacturing';
import { generateCountertopPieces, detectContinuousCabinetRuns } from './countertopNesting';
import { renderArquifyPdfLogo } from './pdfLogo';
import { getFriendlyColorName } from './colorNames';

export { getFriendlyColorName };

export function exportKitchenPDF(cabinets: CabinetType[], state: any, filename = 'ficha_tecnica_cocina.pdf') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = new Date().toLocaleDateString('es-CL');

  const realCabinets = cabinets.filter(c => c.type !== 'decoration' && !c.variant?.startsWith('deco_'));
  const allParts = generateKitchenPartsList(cabinets);
  const hardwareList = generateKitchenHardwareList(cabinets);
  const hwKey = (state.drawerHardware === 'Hafele' ? 'Hafele' : 'Provelcar') as keyof typeof HARDWARE_SPECS;
  const hwSpec = HARDWARE_SPECS[hwKey] || HARDWARE_SPECS.Provelcar;
  const rawThick = state.thickness || 1.8;
  const thicknessMm = Math.round((rawThick >= 1.2 ? rawThick : 1.8) * 10);
  const customTextures = state.customTextures || [];
  const kStore = useKitchenStore.getState();
  const multiplier = kStore.unitQuantityMultiplier || 1;

  // ==========================================
  // PÁGINA 1: PORTADA TÉCNICA Y RESUMEN GENERAL
  // ==========================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  renderArquifyPdfLogo(doc, 14, 14, 22);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PLANOS DE FABRICACIÓN, DESPIECE CAD/CAM & CUBICACIÓN', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Fecha: ${dateStr} | Versión: 2.4-BIM Cocina`, 135, 21);

  let yPos = 38;

  // Cuadro de Resumen Ejecutivo
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, 182, 44, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  const summaryTitle = multiplier > 1 
    ? `ESPECIFICACIONES TÉCNICAS GENERALES (LOTE: ${multiplier} UNIDADES IDÉNTICAS)` 
    : 'ESPECIFICACIONES TÉCNICAS GENERALES';
  doc.text(summaryTitle, 20, yPos + 6.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const baseCount = realCabinets.filter(c => c.type === 'base').length;
  const wallCount = realCabinets.filter(c => c.type === 'wall').length;
  const tallCount = realCabinets.filter(c => c.type === 'tall').length;
  const islandCount = realCabinets.filter(c => c.type === 'island').length;

  const tcCab = (state.edgeBandingThicknessCabinets || 0.45).toFixed(2);
  const tcFront = (state.edgeBandingThicknessFronts || 2.0).toFixed(2);
  
  if (multiplier > 1) {
    doc.text(`• Lote a Fabricar: ${multiplier} conjuntos idénticos (${realCabinets.length * multiplier} módulos totales en producción)`, 20, yPos + 13.5);
    doc.text(`• Tipología por Conjunto: ${realCabinets.length} unid. (Bajos: ${baseCount}, Aéreos: ${wallCount}, Torres: ${tallCount}, Islas: ${islandCount})`, 20, yPos + 19.5);
    doc.text(`• Espesor Melamina Estructura: ${thicknessMm} mm (Tapacanto PVC 22x${tcCab} mm)`, 20, yPos + 25.5);
    const frontSpecDesc = state.doorMaterial === 'hpl'
      ? `${thicknessMm} mm (Sustrato MDF ${thicknessMm}mm + HPL Abet 0.9mm)`
      : `${thicknessMm} mm (Tapacanto PVC 22x${tcFront} mm alto impacto)`;
    doc.text(`• Frentes y Puertas: ${frontSpecDesc}`, 20, yPos + 31.5);
    doc.text(`• Herrajes & Guías: ${hwSpec.slideName} (Descuento SKL: -${hwSpec.drawerLengthDeduction} mm)`, 20, yPos + 37.5);
  } else {
    doc.text(`• Total Módulos: ${realCabinets.length} unid. (Bajos: ${baseCount}, Aéreos: ${wallCount}, Torres: ${tallCount}, Islas: ${islandCount})`, 20, yPos + 13.5);
    doc.text(`• Espesor Melamina Estructura: ${thicknessMm} mm (Tapacanto PVC 22x${tcCab} mm)`, 20, yPos + 19.5);
    const frontSpecDesc = state.doorMaterial === 'hpl'
      ? `${thicknessMm} mm (Sustrato MDF ${thicknessMm}mm + HPL Abet 0.9mm)`
      : `${thicknessMm} mm (Tapacanto PVC 22x${tcFront} mm alto impacto)`;
    doc.text(`• Frentes y Puertas: ${frontSpecDesc}`, 20, yPos + 25.5);
    doc.text(`• Traseras y Fondos de Cajón: Durolac / MDF 3.5 mm ranurado a 15 mm`, 20, yPos + 31.5);
    doc.text(`• Sistema de Herrajes: ${hwSpec.slideName} (Holgura SKW: -${hwSpec.slideClearanceTotal} mm, Descuento SKL: -${hwSpec.drawerLengthDeduction} mm)`, 20, yPos + 37.5);
  }

  yPos += 50;

  // TABLA 1: Listado de Módulos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RELACIÓN DE GABINETES Y MÓDULOS DEL PROYECTO', 14, yPos);

  const isHospitalFrameActive = (state.projectMode === 'hospital' || state.hospitalBaseType === 'metal_frame');
  const socleHCm = (state.socleHeight || 30);

  const cabRows = realCabinets.map((c, i) => {
    const tagPrefix = c.type === 'wall' ? 'A' : c.type === 'tall' ? 'T' : c.type === 'island' ? 'I' : 'B';
    const tag = `${tagPrefix}-${i + 1}`;
    const typeLabel = c.type === 'base' ? 'Módulo Bajo' : c.type === 'wall' ? 'Módulo Aéreo' : c.type === 'tall' ? 'Torre/Despensa' : 'Isla';
    const isBaseOrIsl = c.type === 'base' || c.type === 'island';
    const variantLabel = c.variant ? c.variant.replace(/_/g, ' ') : 'Estándar';
    const doorCol = getFriendlyColorName(c.doorColor || state.doorColor, customTextures);
    const structCol = getFriendlyColorName(c.structureColor || state.structureColor, customTextures);
    const dimLabel = (isHospitalFrameActive && isBaseOrIsl)
      ? `${c.width} x ${Math.round(c.height - socleHCm)} x ${c.depth} cm (Casco)`
      : `${c.width} x ${c.height} x ${c.depth} cm`;
    const cfgLabel = (isHospitalFrameActive && isBaseOrIsl)
      ? `${variantLabel} (s/ Bastidor MC.2.02)`
      : variantLabel;
    return [
      tag,
      typeLabel,
      dimLabel,
      cfgLabel,
      doorCol,
      structCol
    ];
  });

  autoTable(doc, {
    startY: yPos + 4,
    head: [['Tag', 'Tipo', 'Dimensiones (An x Al x Pr)', 'Configuración', 'Color Puertas', 'Color Cuerpo']],
    body: cabRows,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 34 },
      4: { cellWidth: 31 },
      5: { cellWidth: 31 }
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PÁGINA 2: DESPIECE COMPLETO DE PIEZAS (CAD/CAM)
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const despieceTitle = multiplier > 1
    ? `2. PLANILLA DE DESPIECE TÉCNICO Y TAPACANTOS (LOTE: ${multiplier} UNIDADES)`
    : '2. PLANILLA DE DESPIECE TÉCNICO Y TAPACANTOS (PIEZAS DE CORTE)';
  doc.text(despieceTitle, 14, 11);

  const partsRows = allParts.map((p, idx) => [
    `${idx + 1}`,
    p.name.replace(/\(Cab \d+ [^)]+\)/, ''),
    multiplier > 1 ? `${p.qty * multiplier} (${p.qty}/u)` : `${p.qty}`,
    p.length.toFixed(1),
    p.width.toFixed(1),
    `${Math.round(p.thickness)} mm`,
    p.edgeL1 || p.edgeL2 ? 'Largo' : '-',
    p.edgeW1 || p.edgeW2 ? 'Ancho' : '-',
    p.notes || 'Estándar'
  ]);

  autoTable(doc, {
    startY: 22,
    head: [['#', 'Nombre Pieza', multiplier > 1 ? `Cant. (x${multiplier})` : 'Cant.', 'Largo (mm)', 'Ancho (mm)', 'Espesor', 'TC Largo', 'TC Ancho', 'Mecanizado / Notas']],
    body: partsRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 19 }
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PÁGINA 3: RESUMEN DE OPTIMIZACIÓN (NESTING)
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const nestingTitle = multiplier > 1
    ? `3. RESUMEN DE CUBICACIÓN Y PLANCHAS PARA LOTE DE ${multiplier} UNIDADES (NESTING 2D)`
    : '3. RESUMEN DE CUBICACIÓN Y OPTIMIZACIÓN DE PLANCHAS (NESTING 2D)';
  doc.text(nestingTitle, 14, 11);

  // Calcular cubicación agrupada multiplicada por lote
  const isPartHpl = (p: any) => p.isHpl !== undefined ? p.isHpl : isHplFinish(p.material, undefined, cabinets.find(c => c.id === p.moduleId));
  const hplParts = allParts.filter(p => isPartHpl(p));
  const structParts = allParts.filter(p => !isPartHpl(p) && p.thickness >= 15 && (!p.name.includes('Puerta') && !p.name.includes('Frente') && !p.name.includes('Panel Ciego') || p.name.toLowerCase().includes('contrafrente')));
  const doorParts = allParts.filter(p => !isPartHpl(p) && p.thickness >= 15 && (p.name.includes('Puerta') || p.name.includes('Frente') || p.name.includes('Panel Ciego')) && !p.name.toLowerCase().includes('contrafrente'));
  const backParts = allParts.filter(p => !isPartHpl(p) && (p.thickness < 15 || p.name.includes('Fondo') || p.name.includes('Trasera')));

  const structM2 = (structParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0)) * multiplier;
  const doorM2 = (doorParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0)) * multiplier;
  const backM2 = (backParts.reduce((acc, p) => acc + (p.length * p.width * p.qty) / 1000000, 0)) * multiplier;

  const sheetMelM2 = (2.50 * 1.83); // 4.575 m²
  const sheetDurolacM2 = (2.44 * 1.83); // 4.465 m²

  const structSheets = Math.ceil((structM2 * 1.15) / sheetMelM2) || 1;
  const doorSheets = Math.ceil((doorM2 * 1.15) / sheetMelM2) || (doorParts.length > 0 ? 1 : 0);
  const backSheets = Math.ceil((backM2 * 1.12) / sheetDurolacM2) || (backParts.length > 0 ? 1 : 0);

  const isHPLActive = hplParts.length > 0;
  const sheetHplM2 = (3.05 * 1.30); // 3.965 m²
  const hplAreaM2 = (hplParts.reduce((acc, p) => acc + (((p.length + 10) * (p.width + 10) * (p.qty * 2)) / 1000000), 0)) * multiplier;
  const hplSheets = Math.ceil((hplAreaM2 * 1.15) / sheetHplM2) || (hplParts.length > 0 ? 1 : 0);
  const mdfSustratoM2 = (hplParts.reduce((acc, p) => acc + ((p.length * p.width * p.qty) / 1000000), 0)) * multiplier;
  const mdfSustratoSheets = Math.ceil((mdfSustratoM2 * 1.18) / sheetDurolacM2) || (hplParts.length > 0 ? 1 : 0);

  const kState = useKitchenStore.getState();
  const ctBOM = kState.countertopConfig?.enabled
    ? generateCountertopPieces(cabinets, kState.countertopConfig, kState.qstoneCatalog, kState.islandBackConfig, kState.walls, kState.architecturalElements, kState.roomConfig, multiplier)
    : null;

  const ctPiecesBatchCount = (ctBOM?.pieces?.length || 0) * (multiplier > 1 ? multiplier : 1);
  const ctNetAreaBatchM2 = (ctBOM?.totalNetAreaM2 || 0);
  const ctSlabsBatchCount = (ctBOM?.slabsCount || 1);

  const nestingSummary = [
    ['Melamina Estructura y Cajones', `${thicknessMm} mm`, '2500 x 1830 mm', `${structParts.reduce((a, b) => a + b.qty, 0) * multiplier} unid.`, `${structM2.toFixed(2)} m²`, `${structSheets} planchas`, `${Math.min(92, Math.round((structM2 / (structSheets * sheetMelM2)) * 100))}%`],
    ...(isHPLActive
      ? [
          ['Laminado HPL (Abet Laminati 2 Caras)', '0.9 mm', '3050 x 1300 mm', `${hplParts.reduce((a, b) => a + b.qty, 0) * multiplier} unid.`, `${hplAreaM2.toFixed(2)} m²`, `${hplSheets} planchas`, hplSheets > 0 ? `${Math.min(92, Math.round((hplAreaM2 / (hplSheets * sheetHplM2)) * 100))}%` : '-'],
          ['MDF Crudo Sustrato Base HPL', '18 mm', '2440 x 1830 mm', `${hplParts.reduce((a, b) => a + b.qty, 0) * multiplier} unid.`, `${mdfSustratoM2.toFixed(2)} m²`, `${mdfSustratoSheets} planchas`, mdfSustratoSheets > 0 ? `${Math.min(92, Math.round((mdfSustratoM2 / (mdfSustratoSheets * sheetDurolacM2)) * 100))}%` : '-'],
        ]
      : (doorParts.length > 0 ? [
          ['Melamina Puertas y Frentes', `${thicknessMm} mm`, '2500 x 1830 mm', `${doorParts.reduce((a, b) => a + b.qty, 0) * multiplier} unid.`, `${doorM2.toFixed(2)} m²`, `${doorSheets} planchas`, doorSheets > 0 ? `${Math.min(92, Math.round((doorM2 / (doorSheets * sheetMelM2)) * 100))}%` : '-'],
        ] : [])
    ),
    ['Durolac / MDF Traseras y Fondos', '3.5 mm', '2440 x 1830 mm', `${backParts.reduce((a, b) => a + b.qty, 0) * multiplier} unid.`, `${backM2.toFixed(2)} m²`, `${backSheets} planchas`, backSheets > 0 ? `${Math.min(94, Math.round((backM2 / (backSheets * sheetDurolacM2)) * 100))}%` : '-'],
    ...(ctBOM && ctBOM.pieces.length > 0
      ? [
          [
            `Cubierta ${ctBOM.product.name}`,
            `${ctBOM.product.thicknessMm} mm`,
            `${ctBOM.product.sheetWidthMm || 3200} x ${ctBOM.product.sheetHeightMm || 1600} mm`,
            `${ctPiecesBatchCount} unid.`,
            `${ctNetAreaBatchM2.toFixed(2)} m²`,
            `${ctSlabsBatchCount} plancha${ctSlabsBatchCount > 1 ? 's' : ''}`,
            `${ctBOM.efficiencyPercent}%`
          ]
        ]
      : []
    )
  ];

  autoTable(doc, {
    startY: 24,
    head: [['Material / Sustrato', 'Espesor', 'Formato Plancha', 'Piezas', 'Área Neta', 'Planchas Est.', 'Rendimiento']],
    body: nestingSummary,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 12;

  // TABLA 4: QUINCALLERÍA Y HERRAJES (BOM)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const hwTitle = multiplier > 1
    ? `4. LISTADO CONSOLIDADO DE HERRAJES Y FIJACIONES (LOTE: ${multiplier} UNIDADES)`
    : '4. LISTADO CONSOLIDADO DE QUINCALLERÍA, HERRAJES Y FIJACIONES (BOM)';
  doc.text(hwTitle, 14, nextY);

  const groupedBoards = calculateKitchenBoardNesting(cabinets, multiplier, rawThick, customTextures);

  const hwRows = hardwareList.map(h => {
    const isCountertopSlab = h.Categoria === 'Cubiertas' || (h.Item.toLowerCase().includes('plancha cubierta') && ctBOM);
    const isCountertopGlue = h.Categoria === 'Insumos' && (h.Item.toLowerCase().includes('adhesivo bicomponente') || h.Item.toLowerCase().includes('adhesivo epóxico')) && ctBOM;
    const isCountertopSealant = h.Categoria === 'Insumos' && (h.Item.toLowerCase().includes('sellador elastomérico') || h.Item.toLowerCase().includes('silicona')) && ctBOM;
    const isBoard = h.Categoria === 'Tableros';

    let finalQty = h.Cantidad * multiplier;
    let qtyLabel = multiplier > 1 ? `${finalQty} ${h.Unidad} (${h.Cantidad}/u)` : `${h.Cantidad} ${h.Unidad}`;
    let finalDetails = h.Detalles;

    if (isCountertopSlab && ctBOM) {
      finalQty = Math.max(1, ctBOM.slabsCount);
      qtyLabel = `${finalQty} ${h.Unidad}`;
      finalDetails = `Área neta útil: ${ctBOM.totalNetAreaM2.toFixed(2)} m² | Aprovechamiento est.: ${ctBOM.efficiencyPercent}% (${ctBOM.slabsLayout.map(s => s.patternCount && s.patternCount > 1 ? `${s.patternCount}x Patrón #${s.slabIndex}` : `Patrón #${s.slabIndex}`).join(' + ')})${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
    } else if (isBoard && groupedBoards.length > 0) {
      const itemLower = h.Item.toLowerCase();
      const decorMatch = h.Item.match(/\(([^)]+)\)/);
      const decorFilter = decorMatch ? decorMatch[1].trim().toLowerCase() : '';

      const matchingPatterns = groupedBoards.filter(b => {
        const matLower = (b.materialName || '').toLowerCase();
        if (itemLower.includes('mdf crudo') || itemLower.includes('sustrato')) {
          return matLower.includes('sustrato') || matLower.includes('mdf crudo');
        }
        if (itemLower.includes('hpl') || itemLower.includes('laminado')) {
          return b.materialCategory === 'hpl' && (!decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower));
        }
        if (itemLower.includes('traseras') || itemLower.includes('fondos') || itemLower.includes('durolac')) {
          return b.materialCategory === 'backs';
        }
        if (itemLower.includes('puertas') && itemLower.includes('estructura')) {
          return (b.materialCategory === 'structure' || b.materialCategory === 'doors') && (!decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower));
        }
        if (itemLower.includes('puertas') || itemLower.includes('frentes')) {
          if (b.materialCategory === 'doors' || (b.materialCategory === 'structure' && (b.label || '').includes('PUERTAS'))) {
            return !decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower);
          }
          return false;
        }
        if (itemLower.includes('estructura') || itemLower.includes('cajones') || itemLower.includes('melamina')) {
          if (b.materialCategory === 'structure' || b.materialCategory === 'doors') {
            return !decorFilter || matLower.includes(decorFilter) || decorFilter.includes(matLower);
          }
          return false;
        }
        return false;
      });

      if (matchingPatterns.length > 0) {
        const totalBoardsFromNesting = matchingPatterns.reduce((sum, p) => sum + (p.patternCount || 1), 0);
        finalQty = Math.max(1, totalBoardsFromNesting);
        qtyLabel = `${finalQty} ${h.Unidad}`;

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
      }
    } else if (isCountertopGlue && ctBOM) {
      finalQty = Math.max(1, Math.ceil(ctBOM.totalLinearEdgeM * 0.35));
      qtyLabel = `${finalQty} ${h.Unidad}`;
    } else if (isCountertopSealant && ctBOM) {
      finalQty = Math.max(1, Math.ceil(multiplier * 0.5));
      qtyLabel = `${finalQty} ${h.Unidad}`;
    }

    return [
      h.Categoria,
      h.Item,
      qtyLabel,
      finalDetails
    ];
  });

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Categoría', 'Ítem / Herraje', multiplier > 1 ? `Cantidad (x${multiplier})` : 'Cantidad', 'Especificación Técnica']],
    body: hwRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 52 },
      2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 76 }
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PÁGINA: PLANO INDEPENDIENTE DE ESTRUCTURA Y BASTIDOR DE PATAS (MC.2.02 SACYR)
  // =========================================================================
  const baseCabsForFrame = realCabinets.filter(c => c.type === 'base' || c.type === 'island');
  if (isHospitalFrameActive && baseCabsForFrame.length > 0) {
    const kStoreState = useKitchenStore.getState();
    const frameRuns = detectContinuousCabinetRuns(
      baseCabsForFrame,
      kStoreState.countertopConfig,
      kStoreState.walls,
      kStoreState.architecturalElements,
      kStoreState.roomConfig
    );

    if (frameRuns.length > 0) {
      doc.addPage('a4', 'l'); // 297 x 210 mm Landscape

      // Encabezado superior
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 24, 'F');

      renderArquifyPdfLogo(doc, 14, 11, 18);

      doc.setTextColor(248, 250, 252);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANO DE FABRICACIÓN: BASTIDOR METÁLICO TUBULAR CONTINUO (NORMATIVA MC.2.02 SACYR)', 14, 16);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text('Estructura autoportante unificada en perfil tubular FE 30x50x1.5mm esmaltado epóxico blanco al horno + patines sanitarios M10 a 300mm del suelo', 14, 21);

      // Barra de resumen de normativa y criterio de patas
      const barY = 27;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, barY, 269, 10, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('CRITERIO NORMATIVO DE PATAS:', 18, barY + 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('• < 900 mm: 2 patas | • 901 a 1900 mm: 3 patas | • 1901 a 2500 mm: 4 patas | • > 2500 mm: vanos <= 800 mm (Criterio unificado al margen de cantidad de muebles)', 72, barY + 6.5);

      // Renderizar la primera bancada continua
      const run = frameRuns[0];
      const totalLen = run.totalLengthMm;
      const depthVal = run.depthMm || 600;
      const socleHMmVal = (state.socleHeight || 30) * 10;

      let numLegs = 2;
      if (totalLen <= 900) {
        numLegs = 2;
      } else if (totalLen <= 1900) {
        numLegs = 3;
      } else if (totalLen <= 2500) {
        numLegs = 4;
      } else {
        numLegs = 4 + Math.ceil((totalLen - 2500) / 800);
      }

      // Cálculo de ejes de patas equidistantes
      const legSpacing = (totalLen - 60) / (numLegs - 1);
      const legCenters: number[] = [];
      for (let li = 0; li < numLegs; li++) {
        legCenters.push(30 + li * legSpacing);
      }

      // Dibujo esquemático en el PDF (Planta y Elevación)
      const drawScale = Math.min(230 / totalLen, 0.12);
      const dw = totalLen * drawScale;
      const dd = depthVal * drawScale;
      const dh = socleHMmVal * drawScale;
      const originX = 24;
      const plantaTopY = 44;
      const elevTopY = plantaTopY + dd + 18;

      // 1. PLANTA DEL BASTIDOR
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('VISTA EN PLANTA (ESTRUCTURA DE PERFILES)', originX, plantaTopY - 3);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);
      doc.rect(originX, plantaTopY, dw, dd, 'FD');

      // Travesaños en cada eje de pata
      doc.setDrawColor(2, 132, 199);
      doc.setFillColor(224, 242, 254);
      for (const lc of legCenters) {
        const lx = originX + lc * drawScale;
        doc.rect(lx - 1.5, plantaTopY, 3, dd, 'FD');
      }

      // Cota de longitud en planta
      doc.setDrawColor(217, 70, 239); // magenta
      doc.setFontSize(6.5);
      doc.setTextColor(192, 38, 211);
      doc.line(originX, plantaTopY + dd + 3, originX + dw, plantaTopY + dd + 3);
      doc.text(`${totalLen} mm`, originX + dw / 2 - 6, plantaTopY + dd + 7);

      // 2. ELEVACIÓN DEL BASTIDOR
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('VISTA EN ELEVACIÓN FRONTAL (LÍNEA DE PÓRTICOS Y PATINES M10)', originX, elevTopY - 3);

      // Línea de NPT
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(originX - 5, elevTopY + dh, originX + dw + 5, elevTopY + dh);
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('N.P.T. ±0.00', originX + dw + 7, elevTopY + dh + 1);

      // Larguero superior FE 30x50
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);
      doc.rect(originX, elevTopY, dw, Math.max(2, 30 * drawScale), 'FD');

      // Patas verticales con patines reguladores
      for (let li = 0; li < legCenters.length; li++) {
        const lx = originX + legCenters[li] * drawScale;
        // Fuste vertical
        doc.setFillColor(226, 232, 240);
        doc.setDrawColor(51, 65, 85);
        doc.rect(lx - 1.5, elevTopY + Math.max(2, 30 * drawScale), 3, Math.max(4, dh - Math.max(2, 30 * drawScale) - 2), 'FD');
        // Patín regulador M10
        doc.setFillColor(15, 23, 42);
        doc.rect(lx - 2.5, elevTopY + dh - 1.8, 5, 1.8, 'F');
      }

      // Cotas entre patas
      for (let li = 0; li < legCenters.length - 1; li++) {
        const x1 = originX + legCenters[li] * drawScale;
        const x2 = originX + legCenters[li + 1] * drawScale;
        const distMm = Math.round(legCenters[li + 1] - legCenters[li]);
        doc.setDrawColor(2, 132, 199);
        doc.line(x1, elevTopY + dh + 4, x2, elevTopY + dh + 4);
        doc.setFontSize(5.5);
        doc.setTextColor(2, 132, 199);
        doc.text(`${distMm} mm`, (x1 + x2) / 2 - 5, elevTopY + dh + 7);
      }

      // Cota de altura NPT a base
      doc.setDrawColor(217, 70, 239);
      doc.line(originX - 8, elevTopY, originX - 8, elevTopY + dh);
      doc.setFontSize(6);
      doc.setTextColor(192, 38, 211);
      doc.text(`H=${socleHMmVal}`, originX - 22, elevTopY + dh / 2 + 1.5);

      // 3. TABLA DE DESPIECE DE HERRERÍA
      const longTubeLen = totalLen;
      const crossbarLen = depthVal - 60;
      const postLen = Math.max(100, socleHMmVal - 44);
      const totalSteelMUnit = ((2 * longTubeLen) + (numLegs * crossbarLen) + (numLegs * 2 * postLen)) / 1000;
      const totalSteelMBatch = totalSteelMUnit * multiplier;
      const bars6m = Math.max(1, Math.ceil((totalSteelMBatch * 1.1) / 6));

      const frameHwRows = [
        ['Larguero Longitudinal Frontal y Trasero', 'FE 30×50×1.5mm', multiplier > 1 ? `${2 * multiplier} (2/u)` : '2', `${longTubeLen} mm`, `${(((2 * multiplier) * longTubeLen) / 1000).toFixed(2)} m`, 'Tubo continuo sin empalmes. Corte a 90°.'],
        ['Travesaño Transversal de Amarre', 'FE 30×50×1.5mm', multiplier > 1 ? `${numLegs * multiplier} (${numLegs}/u)` : `${numLegs}`, `${crossbarLen} mm`, `${(((numLegs * multiplier) * crossbarLen) / 1000).toFixed(2)} m`, 'Soldadura MIG continua pulida. Perforación Ø6mm.'],
        ['Fuste Tubular Vertical de Pata', 'FE 30×50×1.5mm', multiplier > 1 ? `${numLegs * 2 * multiplier} (${numLegs * 2}/u)` : `${numLegs * 2}`, `${postLen} mm`, `${(((numLegs * 2 * multiplier) * postLen) / 1000).toFixed(2)} m`, 'Pletina electrosoldada con tuerca embutida M10.'],
        ['Patín Regulador Nivelador Sanitario M10', 'Rosca M10×40mm', multiplier > 1 ? `${numLegs * 2 * multiplier} (${numLegs * 2}/u)` : `${numLegs * 2}`, 'H=14 mm', '—', 'Vástago de acero zincado con goma antideslizante lavable.']
      ];

      autoTable(doc, {
        startY: elevTopY + dh + 13,
        head: [['Pieza / Elemento Estructural', 'Perfil / Sección', multiplier > 1 ? `Cant. (x${multiplier})` : 'Cant.', 'Largo Unit.', multiplier > 1 ? 'Total Lote' : 'Total Lineal', 'Especificación Técnica / Soldadura']],
        body: frameHwRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6.5, cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 97 }
        },
        margin: { left: 14, right: 14 }
      });

      // Pie con especificaciones de taller
      const lastTableY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const notesLine = multiplier > 1
        ? `NOTAS DE HERRERÍA: Lote de ${multiplier} bastidores • Total lineal acero: ${totalSteelMBatch.toFixed(2)} m (${bars6m} barras de 6m) [${totalSteelMUnit.toFixed(2)} m/mueble] • Soldadura MIG perimetral continua pulida a ras • Esmalte epóxico al horno RAL 9010 • Despeje sanitario: 300 mm.`
        : `NOTAS DE HERRERÍA: Total lineal estimado: ${totalSteelMBatch.toFixed(2)} m (${bars6m} barras de 6m) • Soldadura MIG perimetral continua pulida a ras • Esmalte epóxico blanco sanitario al horno RAL 9010 • Despeje sanitario libre a piso: 300 mm.`;
      doc.text(notesLine, 14, Math.min(202, lastTableY + 7));
    }
  }

  // =========================================================================
  // PÁGINA: MARMOLERÍA TÉCNICA QSTONE (CUARZO & SINTERIZADO), CORTE & ENCASTRES
  // =========================================================================
  if (kStore.countertopConfig?.enabled && ctBOM && ctBOM.pieces.length > 0) {
    doc.addPage('a4', 'p');

    // Header superior
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 28, 'F');

    renderArquifyPdfLogo(doc, 14, 13, 20);

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ESPECIFICACIONES DE MARMOLERÍA, DESPIECE Y OPTIMIZACIÓN (QSTONE)', 14, 21);

    doc.setFontSize(8);
    doc.setTextColor(251, 191, 36); // amber-400
    doc.text(`Proveedor: Qstone | Material: ${ctBOM.product.name} (${ctBOM.product.thicknessMm} mm)`, 105, 20);

    let ctY = 36;

    // Cuadro resumen de producto
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, ctY, 182, 38, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PARÁMETROS TÉCNICOS DE INSTALACIÓN Y FABRICACIÓN', 18, ctY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const isSint = ctBOM.product.materialType === 'sinterizado';
    const regrueso = kStore.countertopConfig.regruesoCm;
    const bType = kStore.countertopConfig.buildingType === 'edificio' ? 'Edificio (máx 200 cm)' : 'Casa (máx 250 cm)';

    doc.text(`• Material: ${ctBOM.product.name} | Espesor: ${ctBOM.product.thicknessMm} mm | Formato Plancha: ${(ctBOM.product.sheetWidthMm/10)} x ${(ctBOM.product.sheetHeightMm/10)} cm`, 18, ctY + 12);
    doc.text(`• Criterio Estructural: ${isSint ? 'SINTERIZADO 12mm -> Requiere Tapa Continua de Melamina Completa en módulos base' : 'CUARZO -> Sistema tradicional con barras de amarre superior 10cm'}`, 18, ctY + 17);
    doc.text(`• Faldón / Regrueso Delantero: ${regrueso > 0 ? `${regrueso} cm (con deducción automática en altura de primer frente de cajón)` : 'Sin regrueso (0 cm)'}`, 18, ctY + 22);
    doc.text(`• Respaldo Muro: ${kStore.countertopConfig.backsplashMode === 'standard_5cm' ? 'Zócalo estándar 50 mm' : kStore.countertopConfig.backsplashMode === 'full_height' ? 'Revestimiento completo hasta muebles aéreos' : 'Sin respaldo'} | Uniones: Ortogonales a 90°`, 18, ctY + 27);
    doc.text(`• Logística: ${bType} | Corte con disco diamantado (Kerf 3.5 mm) | Remates: ${kStore.countertopConfig.waterfallLeft ? 'Cascada Izq [x] ' : ''}${kStore.countertopConfig.waterfallRight ? 'Cascada Der [x]' : ''}`, 18, ctY + 32);

    // Tabla de Despiece de Marmolería
    ctY = ctY + 44;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DESPIECE TÉCNICO DE PIEZAS DE PIEDRA (DISCO KERF 3.5 mm)', 14, ctY);

    const pieceRows = ctBOM.pieces.map(p => [
      p.id,
      p.name,
      `${p.lengthMm} mm`,
      `${p.widthMm} mm`,
      `${p.thicknessMm} mm`,
      `${p.areaM2.toFixed(3)} m²`,
      `${p.edgePolishingM.toFixed(2)} m`
    ]);

    autoTable(doc, {
      startY: ctY + 3,
      head: [['Cód', 'Descripción de Pieza', 'Largo', 'Ancho', 'Esp.', 'Área Neta', 'Canto Pulido']],
      body: pieceRows,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 64 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    let nextCtY = (doc as any).lastAutoTable.finalY + 8;

    // Resumen de Nesting y Presupuesto
    const nestingStoneRows = [
      ['Área Neta Requerida (Cubiertas y faldones)', `${ctBOM.totalNetAreaM2} m²`],
      ['Planchas Qstone Estimadas (3200 x 1600 mm, 5.12 m²/plancha)', `${ctBOM.slabsCount} unid. (${ctBOM.grossBilledM2} m² brutos)`],
      ['Rendimiento de Aprovechamiento Nesting (Kerf 3.5mm)', `${ctBOM.efficiencyPercent} %`],
      ['Total Metros Lineales de Canto Pulido', `${ctBOM.totalLinearEdgeM} m lineales`],
      ['Perforaciones y Encastres (Lavaplatos / Encimera)', `${ctBOM.cutouts.length} unidades (${ctBOM.cutouts.map(c => c.modelName).join(', ') || 'Ninguno'})`],
      ['Valor Material Qstone', `$${ctBOM.materialCostClp.toLocaleString('es-CL')} CLP ($${ctBOM.product.priceM2Clp.toLocaleString('es-CL')}/m²)`],
      ['Valor Estimado Elaboración, Pulido & Encastres', `$${ctBOM.fabricationCostClp.toLocaleString('es-CL')} CLP`],
      ['PRESUPUESTO TOTAL ESTIMADO CUBIERTA', `$${ctBOM.totalCostClp.toLocaleString('es-CL')} CLP`]
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RESUMEN DE OPTIMIZACIÓN DE CORTE (NESTING) & PRESUPUESTO QSTONE', 14, nextCtY);

    autoTable(doc, {
      startY: nextCtY + 3,
      head: [['Concepto Técnico / Rendimiento', 'Detalle']],
      body: nestingStoneRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 82, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    // PÁGINA GRÁFICA DE OPTIMIZACIÓN DE CORTE EN PLANCHA
    if (ctBOM.slabsLayout && ctBOM.slabsLayout.length > 0) {
      for (const slab of ctBOM.slabsLayout) {
        doc.addPage('a4', 'l'); // Landscape 297 x 210 mm
        const isPatternBatch = slab.patternCount && slab.patternCount > 1;

        // Encabezado superior
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 297, 24, 'F');

        renderArquifyPdfLogo(doc, 14, 11, 18);

        doc.setTextColor(248, 250, 252);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`PLANO DE OPTIMIZACIÓN DE CORTE (${slab.slabWidthMm} x ${slab.slabHeightMm} mm) - PATRÓN #${slab.slabIndex} ${isPatternBatch ? `[x${slab.patternCount} PLANCHAS IDÉNTICAS]` : `DE ${ctBOM.slabsCount}`}`, 14, 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(251, 191, 36);
        doc.text(`Material: ${ctBOM.product.name} (${ctBOM.product.thicknessMm} mm) | Criterio: ${kStore.countertopConfig.buildingType === 'edificio' ? 'Edificio (máx 200cm)' : 'Casa (máx 250cm)'} | Kerf: 3.5mm`, 125, 18);

        // Barra informativa de rendimiento
        const infoY = 28;
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, infoY, 269, 12, 1.5, 1.5, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rendimiento Plancha: ${slab.efficiencyPercent}%`, 18, infoY + 7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Área Utilizada: ${slab.usedAreaM2} m²`, 75, infoY + 7.5);
        doc.text(`• Retazo Aprovechable: ${slab.offcutAreaM2} m²`, 130, infoY + 7.5);
        if (isPatternBatch) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(234, 88, 12);
          doc.text(`• Lote: ${slab.patternCount} planchas (${slab.slabIndicesRange})`, 190, infoY + 7.5);
        } else {
          doc.text(`• Total Piezas: ${slab.pieces.length} unidades`, 195, infoY + 7.5);
        }

        // Área gráfica de la plancha (Escala dinámica ajustada al formato real)
        const slabMaxW = 250;
        const slabMaxH = 130;
        const scale = Math.min(slabMaxW / slab.slabWidthMm, slabMaxH / slab.slabHeightMm);
        const slabDrawW = slab.slabWidthMm * scale;
        const slabDrawH = slab.slabHeightMm * scale;
        const slabOriginX = 14 + (269 - slabDrawW) / 2;
        const slabOriginY = 46 + (135 - slabDrawH) / 2;

        // Fondo de plancha (Retazo / Descarte)
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.8);
        doc.rect(slabOriginX, slabOriginY, slabDrawW, slabDrawH, 'FD');

        // Margen de despunte perimetral (10mm)
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(slabOriginX + 10 * scale, slabOriginY + 10 * scale, (slab.slabWidthMm - 20) * scale, (slab.slabHeightMm - 20) * scale, 'D');
        doc.setLineDashPattern([], 0); // Reset dash

        // Cotas perimetrales de la plancha
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`${slab.slabWidthMm} mm`, slabOriginX + slabDrawW / 2 - 8, slabOriginY - 2);
        doc.text(`${slab.slabHeightMm} mm`, slabOriginX - 14, slabOriginY + slabDrawH / 2);

        // Renderizar piezas colocadas
        for (const p of slab.pieces) {
          const px = slabOriginX + p.x * scale;
          const py = slabOriginY + p.y * scale;
          const pw = p.widthMm * scale;
          const ph = p.lengthMm * scale;

          // Color según tipo de pieza
          if (p.type === 'slab') {
            doc.setFillColor(254, 243, 199); // amber-100
            doc.setDrawColor(217, 119, 6);   // amber-600
          } else if (p.type === 'apron') {
            doc.setFillColor(255, 237, 213); // orange-100
            doc.setDrawColor(234, 88, 12);   // orange-600
          } else if (p.type === 'backsplash') {
            doc.setFillColor(224, 242, 254); // sky-100
            doc.setDrawColor(2, 132, 199);   // sky-600
          } else {
            doc.setFillColor(243, 232, 255); // purple-100
            doc.setDrawColor(147, 51, 234);  // purple-600
          }

          doc.setLineWidth(0.4);
          doc.rect(px, py, pw, ph, 'FD');

          // Si contiene encastre de lavaplatos o encimera, dibujar el hueco en líneas discontinuas
          if (p.hasCutout && pw > 25 && ph > 20) {
            const cutW = (p.hasCutout === 'sink' ? 695 : 550) * scale;
            const cutD = (p.hasCutout === 'sink' ? 400 : 470) * scale;
            const cutX = px + (pw - cutW) / 2;
            const cutY = py + (ph - cutD) / 2;

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(220, 38, 38); // red-600
            doc.setLineWidth(0.3);
            doc.setLineDashPattern([1, 1], 0);
            doc.rect(cutX, cutY, cutW, cutD, 'FD');
            doc.setLineDashPattern([], 0);

            doc.setFontSize(5);
            doc.setTextColor(185, 28, 28);
            doc.setFont('helvetica', 'bold');
            doc.text(p.hasCutout === 'sink' ? 'CALADO LAVAPLATOS' : 'CALADO ENCIMERA', cutX + 1.5, cutY + cutD / 2 + 1.5);
          }

          // Etiqueta de la pieza
          if (pw > 14 && ph > 6) {
            doc.setFontSize(ph < 10 || pw < 20 ? 5 : 6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            const labelText = p.pieceId;
            doc.text(labelText, px + 2, py + (ph < 10 ? ph / 2 + 1.5 : 4.5));

            if (ph >= 12 && pw >= 24) {
              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(71, 85, 105);
              doc.text(`${p.widthMm} x ${p.lengthMm} mm`, px + 2, py + 8.5);
            }
          }
        }

        // Leyenda inferior de colores
        const legendY = 175;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('LEYENDA TÉCNICA:', 28, legendY + 4);

        const legendItems = [
          { label: 'Cubierta Horizontal', fill: [254, 243, 199], stroke: [217, 119, 6] },
          { label: 'Faldón / Regrueso', fill: [255, 237, 213], stroke: [234, 88, 12] },
          { label: 'Respaldo / Zócalo', fill: [224, 242, 254], stroke: [2, 132, 199] },
          { label: 'Pata Cascada', fill: [243, 232, 255], stroke: [147, 51, 234] },
          { label: 'Encastre / Calado', fill: [255, 255, 255], stroke: [220, 38, 38] },
        ];

        let legX = 65;
        for (const item of legendItems) {
          doc.setFillColor(item.fill[0], item.fill[1], item.fill[2]);
          doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
          doc.setLineWidth(0.3);
          doc.rect(legX, legendY, 5, 5, 'FD');

          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.text(item.label, legX + 7, legendY + 3.8);

          legX += 40;
        }

        // Pie de página con normas de corte CNC
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('NOTAS DE CORTE: Espesor de corte por disco de diamante (Kerf) = 3.5 mm • Cortes ortogonales a 90° con puente CNC • Rectificación y pulido perimetral según despiece.', 28, 190);
      }
    }
  }

  // Guardar documento
  doc.save(filename);
}
