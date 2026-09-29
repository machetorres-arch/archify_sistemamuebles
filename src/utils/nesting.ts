// Industrial Guillotine Strip-Based Cutting Optimizer (2-Stage & 3-Stage Beam Saw / Panel Saw / Escuadradora)

export interface NestingPart {
  id: string;
  name: string;
  width: number;
  length: number;
  qty: number;
  color: string;
  edgeL1: boolean;
  edgeL2: boolean;
  edgeW1: boolean;
  edgeW2: boolean;
  allowRotation?: boolean;
}

export interface PlacedPart {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  edgeTop: boolean;
  edgeBottom: boolean;
  edgeLeft: boolean;
  edgeRight: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardResult {
  id: number;
  color: string;
  w: number;
  h: number;
  placedParts: PlacedPart[];
  freeRects: Rect[];
  usedArea: number;
  totalArea: number;
  wastePercentage: number;
  patternIndex?: number;
  patternCount?: number;
  slabIndicesRange?: string;
  totalPatternCount?: number;
}

interface ItemToPlace {
  id: string;
  name: string;
  w: number;
  h: number;
  eL1: boolean;
  eL2: boolean;
  eW1: boolean;
  eW2: boolean;
  allowRotation: boolean;
}

interface StripSegment {
  item: ItemToPlace;
  rotated: boolean;
  w: number;
  h: number;
  subItem?: ItemToPlace;
  subRotated?: boolean;
  subW?: number;
  subH?: number;
}

interface CuttingStrip {
  stripDim: number; // Height for horizontal strip, Width for vertical strip
  usedLength: number; // Length occupied along strip
  segments: StripSegment[];
}

/**
 * Optimiza el corte en planchas asegurando estrictamente cortes guillotina continuos (pasantes)
 * ejecutables en seccionadoras de paquete (Selco, Holzma, Giben), paneleras verticales y escuadradoras.
 */
export function optimizeNesting(
  parts: NestingPart[],
  boardW = 2440,
  boardH = 1830,
  kerf = 3.2,
  margin = 15
): BoardResult[] {
  // 1. Expandir piezas según cantidad solicitada
  const baseItems: ItemToPlace[] = [];
  parts.forEach((p) => {
    for (let i = 0; i < p.qty; i++) {
      baseItems.push({
        id: `${p.id}-${i}`,
        name: p.name,
        w: Math.round(p.length),
        h: Math.round(p.width),
        eL1: p.edgeL1,
        eL2: p.edgeL2,
        eW1: p.edgeW1,
        eW2: p.edgeW2,
        allowRotation: p.allowRotation ?? true
      });
    }
  });

  if (baseItems.length === 0) return [];

  const usableW = boardW - 2 * margin;
  const usableH = boardH - 2 * margin;

  // Helper para simular corte por fajas (Horizontal o Vertical)
  const buildStripsAndPack = (
    items: ItemToPlace[],
    orientation: 'horizontal' | 'vertical',
    allowStrapStacking = true,
    maxWasteRatioPerStrip = 0.35
  ): BoardResult[] => {
    const stripMaxLen = orientation === 'horizontal' ? usableW : usableH;
    const maxStripDim = orientation === 'horizontal' ? usableH : usableW;

    const strips: CuttingStrip[] = [];
    const remainingItems = [...items];

    // Función auxiliar para determinar orientaciones válidas de una pieza
    const getOrientations = (item: ItemToPlace) => {
      const variants: { primaryDim: number; lengthDim: number; rotated: boolean }[] = [];
      
      if (orientation === 'horizontal') {
        // En franja horizontal: primaryDim es la altura (H), lengthDim es el ancho (W)
        if (item.h <= maxStripDim && item.w <= stripMaxLen) {
          variants.push({ primaryDim: item.h, lengthDim: item.w, rotated: false });
        }
        if (item.allowRotation && item.w <= maxStripDim && item.h <= stripMaxLen) {
          variants.push({ primaryDim: item.w, lengthDim: item.h, rotated: true });
        }
      } else {
        // En franja vertical: primaryDim es el ancho (W), lengthDim es la altura (H)
        if (item.w <= maxStripDim && item.h <= stripMaxLen) {
          variants.push({ primaryDim: item.w, lengthDim: item.h, rotated: false });
        }
        if (item.allowRotation && item.h <= maxStripDim && item.w <= stripMaxLen) {
          variants.push({ primaryDim: item.h, lengthDim: item.w, rotated: true });
        }
      }
      return variants;
    };

    while (remainingItems.length > 0) {
      // 1. Intentar ubicar el ítem en una franja existente (Best Fit)
      let bestStripIdx = -1;
      let bestItemIdx = -1;
      let bestVariant: { primaryDim: number; lengthDim: number; rotated: boolean } | null = null;
      let bestFitScore = Infinity;

      for (let s = 0; s < strips.length; s++) {
        const strip = strips[s];
        const availableLen = stripMaxLen - (strip.usedLength > 0 ? strip.usedLength + kerf : 0);

        for (let i = 0; i < remainingItems.length; i++) {
          const item = remainingItems[i];
          const variants = getOrientations(item);

          for (const v of variants) {
            // La pieza cabe en longitud
            if (v.lengthDim <= availableLen) {
              // Ajuste a la altura/ancho de la franja
              if (v.primaryDim <= strip.stripDim) {
                const wasteDiff = strip.stripDim - v.primaryDim;
                const wastePct = wasteDiff / strip.stripDim;

                if (wastePct <= maxWasteRatioPerStrip) {
                  // Priorizar ajuste exacto (wasteDiff === 0)
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
      }

      // Si encontramos un encaje en franja existente
      if (bestStripIdx !== -1 && bestItemIdx !== -1 && bestVariant) {
        const strip = strips[bestStripIdx];
        const item = remainingItems.splice(bestItemIdx, 1)[0];

        const pw = orientation === 'horizontal' ? (bestVariant.rotated ? item.h : item.w) : (bestVariant.rotated ? item.h : item.w);
        const ph = orientation === 'horizontal' ? (bestVariant.rotated ? item.w : item.h) : (bestVariant.rotated ? item.w : item.h);

        strip.segments.push({
          item,
          rotated: bestVariant.rotated,
          w: pw,
          h: ph
        });
        strip.usedLength += (strip.usedLength > 0 ? kerf : 0) + bestVariant.lengthDim;
        continue;
      }

      // 2. Si no cupo en franjas existentes con buen ajuste, abrir NUEVA franja con la pieza más grande disponible
      const firstItem = remainingItems.shift()!;
      const variants = getOrientations(firstItem);
      if (variants.length === 0) {
        // Pieza mayor al formato útil de la plancha
        continue;
      }

      // Elegir la variante que mejor preserve la veta o maximice la longitud
      let chosenVariant = variants[0];
      if (variants.length > 1) {
        chosenVariant = variants.reduce((prev, curr) => (curr.primaryDim > prev.primaryDim ? curr : prev));
      }

      const newStrip: CuttingStrip = {
        stripDim: chosenVariant.primaryDim,
        usedLength: chosenVariant.lengthDim,
        segments: [
          {
            item: firstItem,
            rotated: chosenVariant.rotated,
            w: orientation === 'horizontal' ? (chosenVariant.rotated ? firstItem.h : firstItem.w) : (chosenVariant.rotated ? firstItem.h : firstItem.w),
            h: orientation === 'horizontal' ? (chosenVariant.rotated ? firstItem.w : firstItem.h) : (chosenVariant.rotated ? firstItem.w : firstItem.h)
          }
        ]
      };

      strips.push(newStrip);
    }

    // 3. Empaquetar franjas maestras en planchas (1D Guillotine Bin Packing)
    const boards: BoardResult[] = [];

    // Ordenar franjas por dimensión para cortes continuos y ordenados de taller
    strips.sort((a, b) => b.stripDim - a.stripDim);

    interface PlacedStripOnBoard {
      strip: CuttingStrip;
      offset: number;
    }

    const boardStrips: PlacedStripOnBoard[][] = [];

    for (const strip of strips) {
      let placed = false;

      for (let b = 0; b < boardStrips.length; b++) {
        const currentStrips = boardStrips[b];
        const usedDim = currentStrips.reduce((sum, s) => sum + s.strip.stripDim + kerf, 0);

        if (usedDim + strip.stripDim <= maxStripDim) {
          const offset = currentStrips.length === 0 ? margin : currentStrips[currentStrips.length - 1].offset + currentStrips[currentStrips.length - 1].strip.stripDim + kerf;
          currentStrips.push({ strip, offset });
          placed = true;
          break;
        }
      }

      if (!placed) {
        boardStrips.push([{ strip, offset: margin }]);
      }
    }

    // 4. Convertir franjas posicionadas a BoardResults geométricos con PlacedParts
    boardStrips.forEach((placedStrips, bIdx) => {
      const placedParts: PlacedPart[] = [];
      let boardUsedArea = 0;

      for (const ps of placedStrips) {
        const strip = ps.strip;
        let currentPos = margin;

        for (const seg of strip.segments) {
          const item = seg.item;
          let px = 0;
          let py = 0;
          const pw = seg.w;
          const ph = seg.h;

          if (orientation === 'horizontal') {
            px = currentPos;
            py = ps.offset;
          } else {
            px = ps.offset;
            py = currentPos;
          }

          let eT = false, eB = false, eL = false, eR = false;
          if (seg.rotated) {
            eT = item.eW1; eB = item.eW2; eL = item.eL1; eR = item.eL2;
          } else {
            eT = item.eL1; eB = item.eL2; eL = item.eW1; eR = item.eW2;
          }

          placedParts.push({
            id: item.id,
            name: item.name,
            x: px,
            y: py,
            w: pw,
            h: ph,
            rotated: seg.rotated,
            edgeTop: eT,
            edgeBottom: eB,
            edgeLeft: eL,
            edgeRight: eR
          });

          boardUsedArea += (pw * ph);
          currentPos += (orientation === 'horizontal' ? pw : ph) + kerf;
        }
      }

      const totalArea = boardW * boardH;
      const wastePercentage = Math.max(0, 100 - ((boardUsedArea / totalArea) * 100));

      boards.push({
        id: bIdx + 1,
        color: parts[0]?.color || '#ffffff',
        w: boardW,
        h: boardH,
        placedParts,
        freeRects: [],
        usedArea: boardUsedArea,
        totalArea,
        wastePercentage
      });
    });

    return boards;
  };

  // 2. Torneo Multi-Estrategia Guillotina
  // Se prueban múltiples órdenes de piezas y cortes horizontales/verticales
  const sortingStrategies: { name: string; fn: (a: ItemToPlace, b: ItemToPlace) => number }[] = [
    {
      name: 'CommonDimensionClustering',
      fn: (a, b) => {
        const minA = Math.min(a.w, a.h);
        const minB = Math.min(b.w, b.h);
        if (minB !== minA) return minB - minA;
        return (b.w * b.h) - (a.w * a.h);
      }
    },
    {
      name: 'LongestSideDesc',
      fn: (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || (b.w * b.h) - (a.w * a.h)
    },
    {
      name: 'AreaDesc',
      fn: (a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h)
    },
    {
      name: 'HeightDesc',
      fn: (a, b) => b.h - a.h || b.w - a.w
    },
    {
      name: 'WidthDesc',
      fn: (a, b) => b.w - a.w || b.h - a.h
    }
  ];

  let bestBoards: BoardResult[] | null = null;
  let minBoardCount = Infinity;
  let minAverageWaste = Infinity;

  for (const strategy of sortingStrategies) {
    const sorted = [...baseItems].sort(strategy.fn);

    for (const orientation of ['horizontal', 'vertical'] as const) {
      for (const wasteTolerance of [0.20, 0.35, 0.50]) {
        const result = buildStripsAndPack(sorted, orientation, true, wasteTolerance);
        if (result.length === 0) continue;

        const avgWaste = result.reduce((acc, b) => acc + b.wastePercentage, 0) / result.length;

        if (
          result.length < minBoardCount ||
          (result.length === minBoardCount && avgWaste < minAverageWaste)
        ) {
          bestBoards = result;
          minBoardCount = result.length;
          minAverageWaste = avgWaste;
        }
      }
    }
  }

  return bestBoards || [];
}

/**
 * Agrupa planchas idénticas de corte para no saturar con decenas de láminas repetidas,
 * manteniendo trazabilidad técnica, conteos consolidados para fabricación y rangos de planchas.
 */
export function groupIdenticalBoardPatterns<T extends BoardResult>(boards: T[]): T[] {
  if (boards.length === 0) return [];

  const patterns: { key: string; boards: T[] }[] = [];

  for (const b of boards) {
    const sortedParts = [...b.placedParts].sort(
      (p1, p2) => (p1.y - p2.y) || (p1.x - p2.x) || (p1.w - p2.w) || (p1.h - p2.h) || p1.name.localeCompare(p2.name)
    );
    const partsSignature = sortedParts.map(p => 
      `${Math.round(p.x)}_${Math.round(p.y)}_${Math.round(p.w)}_${Math.round(p.h)}_${p.rotated ? 1 : 0}_${p.name}_${p.edgeTop ? 1 : 0}${p.edgeBottom ? 1 : 0}${p.edgeLeft ? 1 : 0}${p.edgeRight ? 1 : 0}`
    ).join('|');

    const cat = (b as any).materialCategory || '';
    const matName = (b as any).materialName || '';
    const key = `${b.w}x${b.h}|${cat}|${matName}|${partsSignature}`;

    const existing = patterns.find(p => p.key === key);
    if (existing) {
      existing.boards.push(b);
    } else {
      patterns.push({ key, boards: [b] });
    }
  }

  const grouped: T[] = [];
  let patternIdx = 1;

  for (const p of patterns) {
    const count = p.boards.length;
    const firstBoard = p.boards[0];
    const cat = (firstBoard as any).materialCategory;
    const totalCatBoards = boards.filter(b => (b as any).materialCategory === cat).length;
    const indices = p.boards.map(b => b.id);
    const rangeStr = count > 1
      ? `Planchas #${indices[0]} a #${indices[indices.length - 1]} (x${count} un)`
      : `Plancha #${indices[0]}`;

    grouped.push({
      ...firstBoard,
      patternIndex: patternIdx,
      patternCount: count,
      slabIndicesRange: rangeStr,
      totalPatternCount: totalCatBoards || boards.length,
    });
    patternIdx++;
  }

  return grouped;
}


