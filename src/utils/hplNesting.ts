import { ABET_SHEET_FORMATS, HplSheetFormat, HplThickness } from '../store/hplBathroomStore';

export interface HplPartToCut {
  id: string;
  pieceType: 'door' | 'pilaster' | 'divider' | 'urinal' | 'top_rail';
  name: string;
  cubicleName?: string;
  width: number;  // mm
  height: number; // mm
  thickness: HplThickness;
  qty: number;
  colorName: string;
  allowRotation?: boolean;
}

export interface PlacedHplPart {
  id: string;
  originalPartId: string;
  name: string;
  pieceType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  thickness: number;
}

export interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HplSheetResult {
  sheetIndex: number;
  sheetId: string;
  format: HplSheetFormat;
  thickness: HplThickness;
  placedParts: PlacedHplPart[];
  freeRects: FreeRect[];
  usedAreaM2: number;
  totalAreaM2: number;
  wastePercentage: number;
  efficiencyPercentage: number;
}

export interface HplNestingResult {
  selectedFormat: HplSheetFormat;
  sheets: HplSheetResult[];
  totalSheets: number;
  totalPartsCount: number;
  totalHplAreaUsedM2: number;
  totalSheetAreaM2: number;
  globalEfficiencyPct: number;
  globalWastePct: number;
  byThickness: {
    thickness: HplThickness;
    sheetCount: number;
    partsCount: number;
    usedAreaM2: number;
    sheetsAreaM2: number;
  }[];
}

/**
 * 2D Guillotine Strip-Based Bin Packing for HPL Panels (Beam saw / Panel saw / Escuadradora)
 */
export function runHplNesting(
  parts: HplPartToCut[],
  preferredFormat: HplSheetFormat,
  kerf = 4.0, // Espesor disco corte CNC / escuadradora
  margin = 15 // Margen perimetral de refilado de placa
): HplSheetResult[] {
  // 1. Agrupar piezas por espesor (cada espesor debe ir en placas separadas)
  const partsByThickness = new Map<HplThickness, HplPartToCut[]>();
  parts.forEach((p) => {
    const list = partsByThickness.get(p.thickness) || [];
    list.push(p);
    partsByThickness.set(p.thickness, list);
  });

  const allSheets: HplSheetResult[] = [];
  let globalSheetCounter = 1;

  partsByThickness.forEach((thickParts, thick) => {
    // Expandir piezas por cantidad
    const items: {
      id: string;
      originalPartId: string;
      name: string;
      pieceType: string;
      w: number;
      h: number;
      thickness: HplThickness;
      allowRotation: boolean;
    }[] = [];

    thickParts.forEach((p) => {
      for (let i = 0; i < p.qty; i++) {
        items.push({
          id: `${p.id}_${i + 1}`,
          originalPartId: p.id,
          name: p.qty > 1 ? `${p.name} (${i + 1}/${p.qty})` : p.name,
          pieceType: p.pieceType,
          w: Math.round(p.width),
          h: Math.round(p.height),
          thickness: p.thickness,
          allowRotation: p.allowRotation !== false,
        });
      }
    });

    if (items.length === 0) return;

    const usableW = preferredFormat.length - 2 * margin;
    const usableH = preferredFormat.width - 2 * margin;

    interface HplStripSegment {
      item: typeof items[0];
      rotated: boolean;
      w: number;
      h: number;
    }

    interface HplStrip {
      stripDim: number;
      usedLength: number;
      segments: HplStripSegment[];
    }

    const buildHplStrips = (sortedItems: typeof items, orientation: 'horizontal' | 'vertical') => {
      const stripMaxLen = orientation === 'horizontal' ? usableW : usableH;
      const maxStripDim = orientation === 'horizontal' ? usableH : usableW;
      const strips: HplStrip[] = [];
      const remaining = [...sortedItems];

      const getVariants = (item: typeof items[0]) => {
        const list: { primaryDim: number; lengthDim: number; rotated: boolean }[] = [];
        if (orientation === 'horizontal') {
          if (item.h <= maxStripDim && item.w <= stripMaxLen) list.push({ primaryDim: item.h, lengthDim: item.w, rotated: false });
          if (item.allowRotation && item.w <= maxStripDim && item.h <= stripMaxLen) list.push({ primaryDim: item.w, lengthDim: item.h, rotated: true });
        } else {
          if (item.w <= maxStripDim && item.h <= stripMaxLen) list.push({ primaryDim: item.w, lengthDim: item.h, rotated: false });
          if (item.allowRotation && item.h <= maxStripDim && item.w <= stripMaxLen) list.push({ primaryDim: item.h, lengthDim: item.w, rotated: true });
        }
        return list;
      };

      while (remaining.length > 0) {
        let bestStripIdx = -1;
        let bestItemIdx = -1;
        let bestVariant: { primaryDim: number; lengthDim: number; rotated: boolean } | null = null;
        let bestFitScore = Infinity;

        for (let s = 0; s < strips.length; s++) {
          const strip = strips[s];
          const avail = stripMaxLen - (strip.usedLength > 0 ? strip.usedLength + kerf : 0);

          for (let i = 0; i < remaining.length; i++) {
            const item = remaining[i];
            const vars = getVariants(item);
            for (const v of vars) {
              if (v.lengthDim <= avail && v.primaryDim <= strip.stripDim) {
                const wasteDiff = strip.stripDim - v.primaryDim;
                if (wasteDiff / strip.stripDim <= 0.35) {
                  const score = wasteDiff * 1000 + (stripMaxLen - (strip.usedLength + v.lengthDim));
                  if (score < bestFitScore) {
                    bestFitScore = score;
                    bestStripIdx = s;
                    bestItemIdx = i;
                    bestVariant = v;
                  }
                }
              }
            }
          }
        }

        if (bestStripIdx !== -1 && bestItemIdx !== -1 && bestVariant) {
          const strip = strips[bestStripIdx];
          const item = remaining.splice(bestItemIdx, 1)[0];
          strip.segments.push({
            item,
            rotated: bestVariant.rotated,
            w: orientation === 'horizontal' ? (bestVariant.rotated ? item.h : item.w) : (bestVariant.rotated ? item.h : item.w),
            h: orientation === 'horizontal' ? (bestVariant.rotated ? item.w : item.h) : (bestVariant.rotated ? item.w : item.h)
          });
          strip.usedLength += (strip.usedLength > 0 ? kerf : 0) + bestVariant.lengthDim;
          continue;
        }

        const first = remaining.shift()!;
        const vars = getVariants(first);
        if (vars.length === 0) continue;
        const chosen = vars[0];

        strips.push({
          stripDim: chosen.primaryDim,
          usedLength: chosen.lengthDim,
          segments: [
            {
              item: first,
              rotated: chosen.rotated,
              w: orientation === 'horizontal' ? (chosen.rotated ? first.h : first.w) : (chosen.rotated ? first.h : first.w),
              h: orientation === 'horizontal' ? (chosen.rotated ? first.w : first.h) : (chosen.rotated ? first.w : first.h)
            }
          ]
        });
      }

      strips.sort((a, b) => b.stripDim - a.stripDim);
      const sheetStrips: { strip: HplStrip; offset: number }[][] = [];

      for (const strip of strips) {
        let placed = false;
        for (let b = 0; b < sheetStrips.length; b++) {
          const current = sheetStrips[b];
          const usedDim = current.reduce((sum, s) => sum + s.strip.stripDim + kerf, 0);
          if (usedDim + strip.stripDim <= maxStripDim) {
            const offset = current.length === 0 ? margin : current[current.length - 1].offset + current[current.length - 1].strip.stripDim + kerf;
            current.push({ strip, offset });
            placed = true;
            break;
          }
        }
        if (!placed) {
          sheetStrips.push([{ strip, offset: margin }]);
        }
      }

      const sheets: HplSheetResult[] = [];
      sheetStrips.forEach((placedStrips) => {
        const placedParts: PlacedHplPart[] = [];
        let usedAreaM2 = 0;

        for (const ps of placedStrips) {
          let pos = margin;
          for (const seg of ps.strip.segments) {
            const px = orientation === 'horizontal' ? pos : ps.offset;
            const py = orientation === 'horizontal' ? ps.offset : pos;
            const pw = seg.w;
            const ph = seg.h;

            placedParts.push({
              id: seg.item.id,
              originalPartId: seg.item.originalPartId,
              name: seg.item.name,
              pieceType: seg.item.pieceType,
              x: px,
              y: py,
              w: pw,
              h: ph,
              rotated: seg.rotated,
              thickness: seg.item.thickness
            });

            usedAreaM2 += (pw * ph) / 1_000_000;
            pos += (orientation === 'horizontal' ? pw : ph) + kerf;
          }
        }

        const totalAreaM2 = (preferredFormat.length * preferredFormat.width) / 1_000_000;
        const effPct = Math.round((usedAreaM2 / totalAreaM2) * 1000) / 10;

        sheets.push({
          sheetIndex: globalSheetCounter++,
          sheetId: `Placa ${thick}mm #${globalSheetCounter - 1}`,
          format: preferredFormat,
          thickness: thick,
          placedParts,
          freeRects: [],
          usedAreaM2: Math.round(usedAreaM2 * 1000) / 1000,
          totalAreaM2,
          wastePercentage: Math.max(0, Math.round((100 - effPct) * 10) / 10),
          efficiencyPercentage: effPct
        });
      });

      return sheets;
    };

    // Ordenar y ejecutar mejor orientación
    const sorted = [...items].sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const hResult = buildHplStrips(sorted, 'horizontal');
    globalSheetCounter -= hResult.length; // reset counter for comparison
    const vResult = buildHplStrips(sorted, 'vertical');

    const chosen = (hResult.length <= vResult.length) ? hResult : vResult;
    // Fix IDs
    chosen.forEach((sh, idx) => {
      sh.sheetIndex = globalSheetCounter + idx;
      sh.sheetId = `Placa ${thick}mm #${sh.sheetIndex}`;
    });
    globalSheetCounter += chosen.length;

    allSheets.push(...chosen);
  });

  return allSheets;
}

/**
 * Optimiza y encuentra automáticamente el mejor formato Abet Laminati para el conjunto de piezas
 */
export function getOptimizedHplNesting(
  parts: HplPartToCut[],
  chosenFormatId: string,
  autoOptimize: boolean
): HplNestingResult {
  let bestFormat = ABET_SHEET_FORMATS.find((f) => f.id === chosenFormatId) || ABET_SHEET_FORMATS[1];
  let bestSheets: HplSheetResult[] = [];

  if (autoOptimize && parts.length > 0) {
    let bestWasteScore = Infinity;

    for (const format of ABET_SHEET_FORMATS) {
      const sheets = runHplNesting(parts, format);
      const totalSheetArea = sheets.reduce((acc, s) => acc + s.totalAreaM2, 0);
      const totalUsedArea = sheets.reduce((acc, s) => acc + s.usedAreaM2, 0);
      const wasteArea = totalSheetArea - totalUsedArea;

      // Ponderar: menos placas totales y menor desperdicio
      const score = sheets.length * 1000 + wasteArea;
      if (score < bestWasteScore) {
        bestWasteScore = score;
        bestFormat = format;
        bestSheets = sheets;
      }
    }
  } else {
    bestSheets = runHplNesting(parts, bestFormat);
  }

  const totalSheets = bestSheets.length;
  const totalPartsCount = bestSheets.reduce((acc, s) => acc + s.placedParts.length, 0);
  const totalHplAreaUsedM2 = Math.round(bestSheets.reduce((acc, s) => acc + s.usedAreaM2, 0) * 100) / 100;
  const totalSheetAreaM2 = Math.round(bestSheets.reduce((acc, s) => acc + s.totalAreaM2, 0) * 100) / 100;
  const globalEfficiencyPct = totalSheetAreaM2 > 0 ? Math.round((totalHplAreaUsedM2 / totalSheetAreaM2) * 1000) / 10 : 0;
  const globalWastePct = Math.round((100 - globalEfficiencyPct) * 10) / 10;

  // Resumen por espesor
  const thickMap = new Map<HplThickness, { sheetCount: number; partsCount: number; usedAreaM2: number; sheetsAreaM2: number }>();
  bestSheets.forEach((s) => {
    const entry = thickMap.get(s.thickness) || { sheetCount: 0, partsCount: 0, usedAreaM2: 0, sheetsAreaM2: 0 };
    entry.sheetCount += 1;
    entry.partsCount += s.placedParts.length;
    entry.usedAreaM2 += s.usedAreaM2;
    entry.sheetsAreaM2 += s.totalAreaM2;
    thickMap.set(s.thickness, entry);
  });

  const byThickness: {
    thickness: HplThickness;
    sheetCount: number;
    partsCount: number;
    usedAreaM2: number;
    sheetsAreaM2: number;
  }[] = [];

  thickMap.forEach((val, t) => {
    byThickness.push({
      thickness: t,
      sheetCount: val.sheetCount,
      partsCount: val.partsCount,
      usedAreaM2: Math.round(val.usedAreaM2 * 100) / 100,
      sheetsAreaM2: Math.round(val.sheetsAreaM2 * 100) / 100,
    });
  });

  return {
    selectedFormat: bestFormat,
    sheets: bestSheets,
    totalSheets,
    totalPartsCount,
    totalHplAreaUsedM2,
    totalSheetAreaM2,
    globalEfficiencyPct,
    globalWastePct,
    byThickness,
  };
}
