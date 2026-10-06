import * as XLSX from 'xlsx-js-style';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { generateKitchenPartsList, generateKitchenHardwareList, HARDWARE_SPECS, isHplFinish, calculateKitchenBoardNesting } from './kitchenManufacturing';
import { generateCountertopPieces, detectContinuousCabinetRuns } from './countertopNesting';
import { getFriendlyColorName } from './colorNames';

export const exportKitchenToExcel = () => {
  try {
    const state = useStore.getState();
    const kState = useKitchenStore.getState();
    const cabinets = kState.cabinets;
    const multiplier = kState.unitQuantityMultiplier || 1;
    const thickness = state.thickness;
    const kerf = 3.2; // mm
    const hplOversize = 10; // mm (1 cm más ancho y largo para prensado y posterior refilado en taller)
    const m2PorPlacaMDF = 2.44 * 1.83; // 4.4652 m²
    const m2PorPlacaHPL = 3.05 * 1.30; // 3.965 m²

    const parts = generateKitchenPartsList(cabinets);
    const hardware = generateKitchenHardwareList(cabinets);

    const getTextureName = (urlOrColor: string) => getFriendlyColorName(urlOrColor, state.customTextures);

    const dataPlacas: any[] = [];
    const dataHPL: any[] = [];
    const dataEdgeBanding: any[] = [];
    const edgeSummary: Record<string, { desc: string; decorName: string; metersNet: number; metersWaste: number; rollThickness: number }> = {};

    parts.forEach((p, idx) => {
      const isFront = (p.name.toLowerCase().includes('puerta') || p.name.toLowerCase().includes('frente') || p.name.toLowerCase().includes('panel ciego')) &&
                      !p.name.toLowerCase().includes('contrafrente') &&
                      !p.name.toLowerCase().includes('amarre') &&
                      !p.name.toLowerCase().includes('caja');
      const decorName = getTextureName(p.material);
      const isHPL = p.isHpl !== undefined ? p.isHpl : isHplFinish(p.material);
      const qtyBatch = p.qty * multiplier;

      const cab = cabinets.find(c => c.id === p.moduleId);
      const isBalancer = cab?.hplBalancer !== undefined ? cab.hplBalancer : state.hplBalancer;
      const substrateThick = cab?.hplSubstrateThickness || state.hplSubstrateThickness || 15;

      if (isHPL) {
        if (isBalancer) {
          // 1 lámina diseño + 1 lámina balancer blanco
          dataHPL.push({
            Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
            Pieza: `${p.name} (Cara Vista HPL +1cm refilado)`,
            Material: 'Laminado Alta Presión (Abet Laminati 0.9mm)',
            Decorativo: decorName,
            'Largo Corte HPL (mm)': (p.length + hplOversize).toFixed(1),
            'Ancho Corte HPL (mm)': (p.width + hplOversize).toFixed(1),
            'Espesor (mm)': '0.9',
            Cantidad: qtyBatch,
            Notas: `Lámina cara vista +1cm para prensado y posterior refilado${multiplier > 1 ? ` (Lote: ${multiplier} un)` : ''}`
          });
          dataHPL.push({
            Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
            Pieza: `${p.name} (Trascara Balancer Blanco +1cm)`,
            Material: 'Balancer Blanco Mecánico (0.9mm)',
            Decorativo: 'Balancer Blanco 0.9mm',
            'Largo Corte HPL (mm)': (p.length + hplOversize).toFixed(1),
            'Ancho Corte HPL (mm)': (p.width + hplOversize).toFixed(1),
            'Espesor (mm)': '0.9',
            Cantidad: qtyBatch,
            Notas: `Lámina de compensación anti-alabeo +1cm para prensado${multiplier > 1 ? ` (Lote: ${multiplier} un)` : ''}`
          });
        } else {
          dataHPL.push({
            Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
            Pieza: `${p.name} (HPL 2 Caras +1cm refilado)`,
            Material: 'Laminado Alta Presión (Abet Laminati 0.9mm)',
            Decorativo: decorName,
            'Largo Corte HPL (mm)': (p.length + hplOversize).toFixed(1),
            'Ancho Corte HPL (mm)': (p.width + hplOversize).toFixed(1),
            'Espesor (mm)': '0.9',
            Cantidad: qtyBatch * 2,
            Notas: `2 láminas HPL (ambas caras mismo diseño) +1cm para prensado y posterior refilado${multiplier > 1 ? ` (Lote: ${multiplier} un)` : ''}`
          });
        }
      }

      dataPlacas.push({
        Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
        Pieza: isHPL ? `${p.name} (Sustrato Base MDF ${substrateThick}mm)` : p.name,
        Material: isHPL ? `MDF Crudo Desnudo ${substrateThick}mm (Sustrato Base - Formato 2440 × 1520 mm)` : (p.thickness <= 4 ? 'Durolac / MDF 3mm' : 'Melamina Estándar'),
        Decorativo: isHPL ? (isBalancer ? `${decorName} + Balancer Blanco` : `${decorName} (HPL 2 Caras)`) : decorName,
        'Cortes Totales': qtyBatch,
        Cantidad: qtyBatch,
        'Largo (mm)': p.length.toFixed(1),
        'Ancho (mm)': p.width.toFixed(1),
        'Veta (Orientación)': isHPL ? 'Sin Veta (Libre)' : (p.grainDirection === 'horizontal' ? 'Horizontal' : 'Vertical'),
        'Espesor (mm)': isHPL ? substrateThick.toFixed(1) : p.thickness.toFixed(1),
        'Tapacanto Largo 1': p.edgeL1 ? 'Sí' : 'No',
        'Tapacanto Largo 2': p.edgeL2 ? 'Sí' : 'No',
        'Tapacanto Ancho 1': p.edgeW1 ? 'Sí' : 'No',
        'Tapacanto Ancho 2': p.edgeW2 ? 'Sí' : 'No',
        Notas: isHPL ? `Sustrato base MDF ${substrateThick}mm (Formato 2440 × 1520 mm) para prensado de ${decorName}` : (p.notes || (multiplier > 1 ? `Lote: ${multiplier} un (${p.qty}/mueble)` : ''))
      });

      // Tapacantos por pieza técnica
      const cantosL = (p.edgeL1 ? 1 : 0) + (p.edgeL2 ? 1 : 0);
      const cantosW = (p.edgeW1 ? 1 : 0) + (p.edgeW2 ? 1 : 0);
      const metersNet = (((cantosL * p.length) + (cantosW * p.width)) * qtyBatch) / 1000;

      if (metersNet > 0) {
        const edgeThick = isFront ? (state.edgeBandingThicknessFronts || 1.0) : (state.edgeBandingThicknessCabinets || 0.45);
        const tipoCanto = isFront ? `Tapacanto PVC 22x${edgeThick.toFixed(2)}mm Frentes` : `Tapacanto PVC 22x${edgeThick.toFixed(2)}mm Estructura`;

        dataEdgeBanding.push({
          Gabinete: p.notes?.includes('Cab') ? p.notes : `Gabinete ${(p.moduleIndex || 0) + 1}`,
          Pieza: p.name,
          'Ubicación / Tipo': isFront ? 'Frente / Puerta' : 'Casco / Estructura',
          'Color / Decorativo': decorName,
          'Espesor Canto (mm)': edgeThick.toFixed(2),
          'Largo (mm)': p.length.toFixed(1),
          'Ancho (mm)': p.width.toFixed(1),
          Cantidad: qtyBatch,
          'Largo 1': p.edgeL1 ? 'Sí' : '-',
          'Largo 2': p.edgeL2 ? 'Sí' : '-',
          'Ancho 1': p.edgeW1 ? 'Sí' : '-',
          'Ancho 2': p.edgeW2 ? 'Sí' : '-',
          'Metros Netos (m)': Number(metersNet.toFixed(2)),
          'Metros c/ Merma 10% (m)': Number((metersNet * 1.1).toFixed(2))
        });

        const sumKey = `${isFront ? 'FRONT' : 'STRUCT'}_${decorName}_${edgeThick}`;
        if (!edgeSummary[sumKey]) {
          edgeSummary[sumKey] = { desc: tipoCanto, decorName, metersNet: 0, metersWaste: 0, rollThickness: edgeThick };
        }
        edgeSummary[sumKey].metersNet += metersNet;
        edgeSummary[sumKey].metersWaste += metersNet * 1.1;
      }
    });

    // Panel Trasero Continuo de Isla (en Melamina o HPL decorativo)
    if (kState.islandBackConfig?.enabled && kState.islandBackConfig.materialType === 'decorative') {
      const runs = detectContinuousCabinetRuns(cabinets, kState.countertopConfig, kState.walls, kState.architecturalElements, kState.roomConfig);
      const islandRuns = runs.filter(r => r.type === 'island');
      const decorName = getTextureName(kState.islandBackConfig.decorativeColor);
      const isHPL = kState.islandBackConfig.decorativeMaterial === 'hpl';
      const socleGapMm = (kState.socleHeight ?? 10) * 10;

      islandRuns.forEach((run, rIdx) => {
        const totalLenMm = run.totalLengthMm;
        const hMm = kState.islandBackConfig.heightMode === 'to_floor' ? run.heightMm : (run.heightMm - socleGapMm);
        const maxLenMm = 2440;
        const segmentCount = Math.ceil(totalLenMm / maxLenMm);
        const segLenMm = totalLenMm / segmentCount;

        for (let s = 0; s < segmentCount; s++) {
          if (isHPL) {
            dataHPL.push({
              Gabinete: `Isla ${rIdx + 1}`,
              Pieza: `Panel Trasero Trasdosado (${segmentCount > 1 ? `Tramo ${s + 1}/${segmentCount}` : 'Monolítico'})`,
              Material: 'HPL / Laminado Alta Presión',
              Decorativo: decorName,
              'Largo Corte HPL (mm)': (segLenMm + hplOversize).toFixed(1),
              'Ancho Corte HPL (mm)': (hMm + hplOversize).toFixed(1),
              Cantidad: 1
            });
          }

          const islandSubstrateThick = useStore.getState().hplSubstrateThickness || 15;

          dataPlacas.push({
            Gabinete: `Isla ${rIdx + 1}`,
            Pieza: `Panel Trasero Trasdosado Isla (${segmentCount > 1 ? `Tramo ${s + 1}/${segmentCount}` : 'Monolítico'})`,
            Material: isHPL ? `MDF Desnudo ${islandSubstrateThick}mm (Sustrato HPL - Formato 2440 × 1520 mm)` : 'Melamina Estándar',
            Decorativo: decorName,
            'Cortes Totales': 1,
            Cantidad: 1,
            'Largo (mm)': segLenMm.toFixed(1),
            'Ancho (mm)': hMm.toFixed(1),
            'Veta (Orientación)': 'Horizontal',
            'Espesor (mm)': isHPL ? islandSubstrateThick.toFixed(1) : '18.0',
            'Tapacanto Largo 1': 'Sí',
            'Tapacanto Largo 2': 'Sí',
            'Tapacanto Ancho 1': 'Sí',
            'Tapacanto Ancho 2': 'Sí',
            Notas: `Revestimiento continuo isla (${kState.islandBackConfig.heightMode === 'to_floor' ? 'a piso' : 'con zócalo'})`
          });
        }
      });
    }

    // M² calculations
    const placasByMaterial: Record<string, { name: string; m2: number }> = {};
    dataPlacas.forEach(p => {
      const mat = p.Decorativo;
      if (!placasByMaterial[mat]) placasByMaterial[mat] = { name: mat, m2: 0 };
      placasByMaterial[mat].m2 += (parseFloat(p['Ancho (mm)']) * parseFloat(p['Largo (mm)']) * p.Cantidad) / 1000000;
    });

    const hplByDecorativo: Record<string, { name: string; m2: number }> = {};
    dataHPL.forEach(p => {
      const name = p.Decorativo;
      if (!hplByDecorativo[name]) hplByDecorativo[name] = { name, m2: 0 };
      hplByDecorativo[name].m2 += (parseFloat(p['Ancho Corte HPL (mm)']) * parseFloat(p['Largo Corte HPL (mm)']) * p.Cantidad) / 1000000;
    });

    // Metros de tapacanto calculados
    let cantosGabM = 0;
    let cantosFrentesM = 0;

    dataPlacas.forEach(p => {
      const isFront = p.Pieza.toLowerCase().includes('puerta') || p.Pieza.toLowerCase().includes('frente');
      let cantosL = 0;
      if (p['Tapacanto Largo 1'] === 'Sí') cantosL++;
      if (p['Tapacanto Largo 2'] === 'Sí') cantosL++;
      let cantosA = 0;
      if (p['Tapacanto Ancho 1'] === 'Sí') cantosA++;
      if (p['Tapacanto Ancho 2'] === 'Sí') cantosA++;

      const meters = (((cantosL * parseFloat(p['Largo (mm)'])) + (cantosA * parseFloat(p['Ancho (mm)']))) * p.Cantidad) / 1000;
      if (isFront) {
        cantosFrentesM += meters;
      } else {
        cantosGabM += meters;
      }
    });

    const cantosGabTotal = Math.ceil(cantosGabM * 1.1);
    const cantosFrentesTotal = Math.ceil(cantosFrentesM * 1.1);

    // BoM consolidado
    const dataBoM: any[] = [];
    const ctBOM = kState.countertopConfig?.enabled
      ? generateCountertopPieces(cabinets, kState.countertopConfig, kState.qstoneCatalog, kState.islandBackConfig, kState.walls, kState.architecturalElements, kState.roomConfig, multiplier)
      : null;

    // Mecanizado
    dataBoM.push({
      Categoria: 'Mecanizado',
      Item: 'Descuento de Sierra (Kerf de Corte)',
      Cantidad: kerf,
      Unidad: 'mm',
      Detalles: 'Espesor de sierra compensado en optimización de corte (Guillotina / Panelera)'
    });

    // Herrajes de armado, tableros, tapacantos e insumos calculados en generateKitchenHardwareList
    const groupedBoards = calculateKitchenBoardNesting(cabinets, multiplier, thickness, state.customTextures);

    hardware.forEach(h => {
      const isKerf = h.Categoria === 'Mecanizado';
      const isCountertopSlab = h.Categoria === 'Cubiertas' || (h.Item.toLowerCase().includes('plancha cubierta') && ctBOM);
      const isCountertopGlue = h.Categoria === 'Insumos' && (h.Item.toLowerCase().includes('adhesivo bicomponente') || h.Item.toLowerCase().includes('adhesivo epóxico')) && ctBOM;
      const isCountertopSealant = h.Categoria === 'Insumos' && (h.Item.toLowerCase().includes('sellador elastomérico') || h.Item.toLowerCase().includes('silicona')) && ctBOM;
      const isBoard = h.Categoria === 'Tableros';

      let finalQty = h.Cantidad;
      let finalDetails = h.Detalles || '';

      if (isCountertopSlab && ctBOM) {
        finalQty = Math.max(1, ctBOM.slabsCount);
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
          if (typeof h.Cantidad === 'number') {
            finalQty = Math.ceil(h.Cantidad * multiplier);
          }
          if (finalDetails && multiplier > 1) {
            finalDetails = `${finalDetails} [Lote x${multiplier} un (${h.Cantidad}/u)]`;
          }
        }
      } else if (isCountertopGlue && ctBOM) {
        finalQty = Math.max(1, Math.ceil(ctBOM.totalLinearEdgeM * 0.35));
        finalDetails = `Pegado químico homogéneo sin poros ni juntas visibles (${ctBOM.totalLinearEdgeM.toFixed(1)} m lineales)${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
      } else if (isCountertopSealant && ctBOM) {
        finalQty = Math.max(1, Math.ceil(multiplier * 0.5));
        finalDetails = `Sellado perimetral posterior y estanqueidad contra muro${multiplier > 1 ? ` [Lote x${multiplier} un]` : ''}`;
      } else if (!isKerf) {
        if (typeof h.Cantidad === 'number') {
          finalQty = isBoard ? Math.ceil(h.Cantidad * multiplier) : (h.Cantidad * multiplier);
        }
        if (finalDetails && multiplier > 1) {
          finalDetails = `${finalDetails} [Lote x${multiplier} un (${h.Cantidad}/u)]`;
        }
      }

      dataBoM.push({
        Categoria: h.Categoria || 'Herrajes',
        Item: h.Item,
        Cantidad: finalQty,
        Unidad: h.Unidad,
        Detalles: finalDetails
      });
    });

    // Añadir resumen consolidado al final de dataEdgeBanding
    if (Object.keys(edgeSummary).length > 0) {
      dataEdgeBanding.push({
        Gabinete: '--- RESUMEN CONSOLIDADO DE COMPRA ---',
        Pieza: '----------------------------------------',
        'Ubicación / Tipo': '----------------',
        'Color / Decorativo': '----------------',
        'Espesor Canto (mm)': '--',
        'Largo (mm)': '-',
        'Ancho (mm)': '-',
        Cantidad: '-',
        'Largo 1': '-',
        'Largo 2': '-',
        'Ancho 1': '-',
        'Ancho 2': '-',
        'Metros Netos (m)': 0,
        'Metros c/ Merma 10% (m)': 0
      });

      Object.values(edgeSummary).forEach(s => {
        dataEdgeBanding.push({
          Gabinete: 'TOTAL COMPRA',
          Pieza: s.desc,
          'Ubicación / Tipo': s.desc.includes('Frentes') ? 'Puertas/Frentes' : (s.desc.includes('Isla') ? 'Revestimiento Isla' : 'Cuerpo/Estructura'),
          'Color / Decorativo': s.decorName,
          'Espesor Canto (mm)': s.rollThickness.toFixed(2),
          'Largo (mm)': '-',
          'Ancho (mm)': '-',
          Cantidad: 1,
          'Largo 1': '-',
          'Largo 2': '-',
          'Ancho 1': '-',
          'Ancho 2': '-',
          'Metros Netos (m)': Number(s.metersNet.toFixed(2)),
          'Metros c/ Merma 10% (m)': Math.ceil(s.metersWaste)
        });
      });
    }

    const wb = XLSX.utils.book_new();
    const wsPlacas = XLSX.utils.json_to_sheet(dataPlacas);
    const wsBoM = XLSX.utils.json_to_sheet(dataBoM);
    const wsEdgeBanding = XLSX.utils.json_to_sheet(dataEdgeBanding);

    // Styling function
    const applyStyles = (ws: any, colWidths: number[]) => {
      if (!ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          fill: { patternType: 'solid', fgColor: { rgb: 'F97316' } }, // Orange 500
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } }
          }
        };
      }

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[address]) continue;
          ws[address].s = ws[address].s || {};
          ws[address].s.border = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          };
          ws[address].s.alignment = { vertical: 'center' };
        }
      }

      ws['!cols'] = colWidths.map(w => ({ wch: w }));
    };

    applyStyles(wsPlacas, [16, 28, 26, 24, 12, 10, 14, 14, 18, 14, 18, 18, 18, 18, 30]);
    applyStyles(wsBoM, [16, 52, 14, 24, 50]);
    applyStyles(wsEdgeBanding, [18, 32, 22, 26, 18, 14, 14, 10, 10, 10, 10, 10, 18, 22]);

    XLSX.utils.book_append_sheet(wb, wsPlacas, '1_Placas_y_Cortes');
    let sheetNum = 2;
    if (dataHPL.length > 0) {
      const wsHPL = XLSX.utils.json_to_sheet(dataHPL);
      applyStyles(wsHPL, [16, 32, 30, 24, 20, 20, 14, 10, 45]);
      XLSX.utils.book_append_sheet(wb, wsHPL, `${sheetNum}_Corte_HPL`);
      sheetNum++;
    }
    XLSX.utils.book_append_sheet(wb, wsBoM, `${sheetNum}_BOM_y_Herrajes`);
    sheetNum++;
    XLSX.utils.book_append_sheet(wb, wsEdgeBanding, `${sheetNum}_Metros_Tapacanto`);
    sheetNum++;

    // Cubiertas Qstone si aplica
    if (kState.countertopConfig?.enabled) {
      const ctBOM = generateCountertopPieces(cabinets, kState.countertopConfig, kState.qstoneCatalog, kState.islandBackConfig, kState.walls, kState.architecturalElements, kState.roomConfig);
      if (ctBOM && ctBOM.pieces.length > 0) {
        const dataStone = ctBOM.pieces.map(p => ({
          'Código': p.id,
          'Descripción Pieza': p.name,
          'Material': ctBOM.product.name,
          'Cantidad (Lote)': multiplier,
          'Largo (mm)': p.lengthMm,
          'Ancho (mm)': p.widthMm,
          'Espesor (mm)': p.thicknessMm,
          'Área Neta Total (m²)': Number((p.areaM2 * multiplier).toFixed(3)),
          'Canto Pulido Total (m)': Number((p.edgePolishingM * multiplier).toFixed(2)),
          'Notas de Taller': p.notes ? `${p.notes}${multiplier > 1 ? ` (x${multiplier} un)` : ''}` : (multiplier > 1 ? `Lote: ${multiplier} unidades` : '')
        }));

        const wsStone = XLSX.utils.json_to_sheet(dataStone);
        applyStyles(wsStone, [18, 36, 26, 14, 14, 14, 14, 18, 18, 38]);
        XLSX.utils.book_append_sheet(wb, wsStone, `${sheetNum}_Cubiertas_Qstone`);
      }
    }

    // Generar archivo Excel binario y forzar descarga por Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const filename = `Optimizacion_Cortes_Cocina${multiplier > 1 ? `_Lote_${multiplier}un` : ''}.xlsx`;

    const blobUrl = URL.createObjectURL(excelBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (e: any) {
    console.error('Error exportando Excel de cocina:', e);
  }
};
