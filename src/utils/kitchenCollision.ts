import { CabinetType, ArchitecturalElement } from '../store/kitchenStore';

export interface Box2D {
  corners: [number, number][]; // 4 corners in XZ
  center: [number, number];
  axes: [number, number][]; // 2 normalized normal axes
  width: number;
  depth: number;
  rotation: number;
  yMin: number;
  yMax: number;
}

export function getCabinetBox2D(
  cab: {
    position: [number, number, number];
    width: number;
    depth: number;
    height: number;
    rotation?: number;
    type?: string;
  }
): Box2D {
  const rot = Number(cab.rotation) || 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = Number(cab.position?.[0]) || 0;
  const cz = Number(cab.position?.[2]) || 0;
  const width = Number(cab.width) || 60;
  const depth = Number(cab.depth) || 60;
  const height = Number(cab.height) || 80;
  const hw = width / 2;
  const hd = depth / 2;

  // Local corners relative to center: (-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)
  const localCorners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const corners: [number, number][] = localCorners.map(([lx, lz]) => [
    cx + lx * cos + lz * sin,
    cz + lx * sin - lz * cos,
  ]);

  const axes: [number, number][] = [
    [cos, sin],
    [-sin, cos],
  ];

  const cy = Number(cab.position?.[1]) || (height / 2);
  const yMin = cy - height / 2;
  const yMax = cy + height / 2;

  return {
    corners,
    center: [cx, cz],
    axes,
    width,
    depth,
    rotation: rot,
    yMin,
    yMax,
  };
}

export function getWallBox2D(wall: {
  start: [number, number];
  end: [number, number];
  thickness?: number;
  height?: number;
}): Box2D {
  const [x1, z1] = wall.start;
  const [x2, z2] = wall.end;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const thickness = wall.thickness || 20;
  const height = wall.height || 250;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;

  const rot = Math.atan2(dx, dz);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const hw = thickness / 2;
  const hd = length / 2;

  const localCorners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const corners: [number, number][] = localCorners.map(([lx, lz]) => [
    cx + lx * cos + lz * sin,
    cz + lx * sin - lz * cos,
  ]);

  const axes: [number, number][] = [
    [cos, sin],
    [-sin, cos],
  ];

  return {
    corners,
    center: [cx, cz],
    axes,
    width: thickness,
    depth: length,
    rotation: rot,
    yMin: 0,
    yMax: height,
  };
}

export function getPolygonSignedArea(poly: [number, number][]): number {
  if (!poly || poly.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    area += (p1[0] * p2[1] - p2[0] * p1[1]);
  }
  return area / 2;
}

export function getWallInwardNormal(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  roomPoly: [number, number][] = []
): [number, number] {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const wallLen = Math.hypot(dx, dz);
  if (wallLen < 0.0001) return [0, 1];

  const uX = dx / wallLen;
  const uZ = dz / wallLen;

  let nX = -uZ;
  let nZ = uX;

  if (roomPoly && roomPoly.length >= 3) {
    const signedArea = getPolygonSignedArea(roomPoly);
    if (signedArea < 0) {
      nX = uZ;
      nZ = -uX;
    }

    // Comprobación local con punto de prueba perpendicular al punto medio del muro
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const testDist = 2.0;
    const isCandidateInside = isPointInPolygon(midX + nX * testDist, midZ + nZ * testDist, roomPoly);
    const isOppositeInside = isPointInPolygon(midX - nX * testDist, midZ - nZ * testDist, roomPoly);

    if (!isCandidateInside && isOppositeInside) {
      nX = -nX;
      nZ = -nZ;
    }
  }

  return [nX, nZ];
}

export function getPillarBox2D(
  el: ArchitecturalElement,
  walls: any[] = [],
  roomPoly: [number, number][] = []
): Box2D {
  const width = Number(el.width) || 40;
  const height = Number(el.height) || 240;
  const depth = Number(el.depth) || 20;
  const elevation = Number(el.elevation) || 0;

  let cx = Number(el.position?.[0]) || 0;
  let cz = Number(el.position?.[2]) || 0;
  let rot = Number(el.rotation) || 0;

  let uX = 1;
  let uZ = 0;
  let nX = 0;
  let nZ = 1;

  const wall = el.wallId ? walls.find((w) => w.id === el.wallId) : null;
  if (wall) {
    const [x1, z1] = wall.start;
    const [x2, z2] = wall.end;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const wLen = Math.hypot(dx, dz);
    if (wLen > 1) {
      uX = dx / wLen;
      uZ = dz / wLen;
      const normal = getWallInwardNormal(x1, z1, x2, z2, roomPoly);
      nX = normal[0];
      nZ = normal[1];

      const wMidX = (x1 + x2) / 2;
      const wMidZ = (z1 + z2) / 2;
      const offset = Number(el.offset) || 0;

      const pWallX = wMidX + offset * uX;
      const pWallZ = wMidZ + offset * uZ;

      const wallThick = wall.thickness || 20;
      const shiftNormal = Math.max(0, (depth - wallThick) / 2);

      cx = pWallX + nX * shiftNormal;
      cz = pWallZ + nZ * shiftNormal;

      rot = Math.atan2(nX, nZ);
    }
  } else {
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    uX = cosR;
    uZ = sinR;
    nX = -sinR;
    nZ = cosR;
  }

  const hw = width / 2;
  const hd = depth / 2;

  const corners: [number, number][] = [
    [cx - hw * uX - hd * nX, cz - hw * uZ - hd * nZ],
    [cx + hw * uX - hd * nX, cz + hw * uZ - hd * nZ],
    [cx + hw * uX + hd * nX, cz + hw * uZ + hd * nZ],
    [cx - hw * uX + hd * nX, cz - hw * uZ + hd * nZ],
  ];

  const axes: [number, number][] = [
    [uX, uZ],
    [nX, nZ],
  ];

  return {
    corners,
    center: [cx, cz],
    axes,
    width,
    depth,
    rotation: rot,
    yMin: elevation,
    yMax: elevation + height,
  };
}

export function getPillarsBox2D(
  elements: ArchitecturalElement[] = [],
  walls: any[] = [],
  roomPoly: [number, number][] = []
): Box2D[] {
  if (!elements || elements.length === 0) return [];
  return elements
    .filter((el) => el.type === 'pillar')
    .map((el) => getPillarBox2D(el, walls, roomPoly));
}

export function checkOBBCollision(
  boxA: Box2D,
  boxB: Box2D,
  margin = 0.5
): { colliding: boolean; overlap: number; mtvAxis: [number, number] | null } {
  // Check vertical overlap first
  const vOverlap = Math.min(boxA.yMax, boxB.yMax) - Math.max(boxA.yMin, boxB.yMin);
  if (vOverlap <= 5) {
    return { colliding: false, overlap: 0, mtvAxis: null };
  }

  const axes = [...boxA.axes, ...boxB.axes];
  let minOverlap = Infinity;
  let smallestAxis: [number, number] | null = null;

  for (const axis of axes) {
    // Project boxA corners onto axis
    let minA = Infinity;
    let maxA = -Infinity;
    for (const c of boxA.corners) {
      const proj = c[0] * axis[0] + c[1] * axis[1];
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    // Project boxB corners onto axis
    let minB = Infinity;
    let maxB = -Infinity;
    for (const c of boxB.corners) {
      const proj = c[0] * axis[0] + c[1] * axis[1];
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    // Check interval overlap
    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= margin) {
      // Separating axis found -> No collision
      return { colliding: false, overlap: 0, mtvAxis: null };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      // Ensure axis points from boxB toward boxA
      const centerAProj = boxA.center[0] * axis[0] + boxA.center[1] * axis[1];
      const centerBProj = boxB.center[0] * axis[0] + boxB.center[1] * axis[1];
      if (centerAProj < centerBProj) {
        smallestAxis = [-axis[0], -axis[1]];
      } else {
        smallestAxis = [axis[0], axis[1]];
      }
    }
  }

  return { colliding: true, overlap: minOverlap, mtvAxis: smallestAxis };
}

// Algoritmo Ray-Casting para comprobar si un punto (x, z) está dentro del polígono de la habitación
export function isPointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  if (!poly || poly.length < 3) return true;
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 0.00000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calcula la distancia euclidiana y el punto más cercano sobre un segmento [A, B]
export function getClosestPointOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { point: [number, number]; t: number; dist: number } {
  const abX = bx - ax;
  const abZ = bz - az;
  const abLen2 = abX * abX + abZ * abZ;
  if (abLen2 === 0) {
    const d = Math.hypot(px - ax, pz - az);
    return { point: [ax, az], t: 0, dist: d };
  }
  const apX = px - ax;
  const apZ = pz - az;
  const t = Math.max(0, Math.min(1, (apX * abX + apZ * abZ) / abLen2));
  const cx = ax + t * abX;
  const cz = az + t * abZ;
  return { point: [cx, cz], t, dist: Math.hypot(px - cx, pz - cz) };
}

// Comprueba si una caja 2D de mueble está completamente dentro del polígono de la habitación
export function isBoxInsidePolygon(
  box: Box2D,
  poly: [number, number][],
  tolerance = 1.0
): boolean {
  if (!poly || poly.length < 3) return true;
  if (!isPointInPolygon(box.center[0], box.center[1], poly)) return false;

  for (const [cx, cz] of box.corners) {
    if (!isPointInPolygon(cx, cz, poly)) {
      let minDist = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        const proj = getClosestPointOnSegment(cx, cz, p1[0], p1[1], p2[0], p2[1]);
        if (proj.dist < minDist) minDist = proj.dist;
      }
      if (minDist > tolerance) return false;
    }
  }
  return true;
}

/**
 * Constrains a candidate cabinet position strictly inside the room boundary and away from wall cores.
 */
export function constrainInsideRoomAndWalls(
  pos: [number, number, number],
  rot: number,
  cabWidth: number,
  cabDepth: number,
  cabHeight: number,
  walls: any[] = [],
  roomPoly: [number, number][] = [],
  architecturalElements: ArchitecturalElement[] = []
): [number, number, number] {
  let [cx, cy, cz] = pos;

  if (roomPoly.length < 3 && (!walls || walls.length === 0)) {
    return [cx, cy, cz];
  }

  // Iterate relaxation steps to ensure no corner penetrates walls or exits the room boundary
  for (let iter = 0; iter < 4; iter++) {
    const box = getCabinetBox2D({
      position: [cx, cy, cz],
      width: cabWidth,
      depth: cabDepth,
      height: cabHeight,
      rotation: rot,
    });

    // 1. Constrain against actual wall segments (finite segments)
    if (walls && walls.length > 0) {
      for (const w of walls) {
        const x1 = w.start[0];
        const z1 = w.start[1];
        const x2 = w.end[0];
        const z2 = w.end[1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const wallLen = Math.hypot(dx, dz);
        if (wallLen < 1) continue;

        const uX = dx / wallLen;
        const uZ = dz / wallLen;
        const thickness = w.thickness || 20;

        // Inward normal pointing into the room
        const [nX, nZ] = getWallInwardNormal(x1, z1, x2, z2, roomPoly);

        // Check if any corner penetrates THIS finite wall segment
        for (const [px, pz] of box.corners) {
          const s = (px - x1) * uX + (pz - z1) * uZ;
          // Only apply if the point is within this finite wall segment span
          if (s >= -2 && s <= wallLen + 2) {
            const distFromWallLine = (px - x1) * nX + (pz - z1) * nZ;
            const requiredDist = thickness / 2 + 0.1;
            if (distFromWallLine < requiredDist) {
              const push = requiredDist - distFromWallLine;
              cx += push * nX;
              cz += push * nZ;
            }
          }
        }
      }
    }

    // 2. Clamp corners inside room polygon
    if (roomPoly.length >= 3) {
      const currentBox = getCabinetBox2D({
        position: [cx, cy, cz],
        width: cabWidth,
        depth: cabDepth,
        height: cabHeight,
        rotation: rot,
      });

      for (const [cpx, cpz] of currentBox.corners) {
        if (!isPointInPolygon(cpx, cpz, roomPoly)) {
          let closestDist = Infinity;
          let closestPt: [number, number] = [cpx, cpz];
          let edgeStart: [number, number] = [0, 0];
          let edgeEnd: [number, number] = [0, 0];

          for (let i = 0; i < roomPoly.length; i++) {
            const p1 = roomPoly[i];
            const p2 = roomPoly[(i + 1) % roomPoly.length];
            const cp = getClosestPointOnSegment(cpx, cpz, p1[0], p1[1], p2[0], p2[1]);
            if (cp.dist < closestDist) {
              closestDist = cp.dist;
              closestPt = cp.point;
              edgeStart = p1;
              edgeEnd = p2;
            }
          }

          const [edgeNormalX, edgeNormalZ] = getWallInwardNormal(
            edgeStart[0],
            edgeStart[1],
            edgeEnd[0],
            edgeEnd[1],
            roomPoly
          );

          // Push the point directly back across the edge into the room interior
          const pushX = (closestPt[0] - cpx) + edgeNormalX * 0.5;
          const pushZ = (closestPt[1] - cpz) + edgeNormalZ * 0.5;
          cx += pushX;
          cz += pushZ;
          break;
        }
      }
    }

    // 3. Constrain against architectural pillars (act as structural obstacles)
    if (architecturalElements && architecturalElements.length > 0) {
      const pillarBoxes = getPillarsBox2D(architecturalElements, walls, roomPoly);
      for (const pBox of pillarBoxes) {
        const curBox = getCabinetBox2D({
          position: [cx, cy, cz],
          width: cabWidth,
          depth: cabDepth,
          height: cabHeight,
          rotation: rot,
        });
        const col = checkOBBCollision(curBox, pBox, 0.2);
        if (col.colliding && col.mtvAxis && col.overlap > 0.05) {
          cx += col.mtvAxis[0] * (col.overlap + 0.1);
          cz += col.mtvAxis[1] * (col.overlap + 0.1);
        }
      }
    }
  }

  return [cx, cy, cz];
}

/**
 * Re-snaps and clamps all cabinets when the room dimensions, shape or vertices change.
 * Ensures every cabinet stays strictly within the interior boundary and snaps to the nearest wall.
 */
export function repositionCabinetsOnRoomChange(
  cabinets: CabinetType[],
  walls: any[],
  roomConfig?: any
): CabinetType[] {
  if (!cabinets || cabinets.length === 0) return [];

  const vertices = roomConfig?.vertices || [];
  let roomPoly: [number, number][] = [];
  if (vertices.length >= 3) {
    roomPoly = vertices.map((v: any) => [v.x, v.y]);
  } else if (walls && walls.length >= 3) {
    roomPoly = walls.map((w: any) => [w.start[0], w.start[1]]);
  }

  const wallBoundTypes = new Set(['base', 'wall', 'tall']);

  return cabinets.map((cab) => {
    const isWallBound =
      wallBoundTypes.has(cab.type) ||
      cab.variant === 'deco_hood' ||
      cab.variant === 'deco_stove' ||
      cab.variant === 'deco_fridge' ||
      cab.variant === 'deco_dishwasher';

    if (isWallBound && walls && walls.length > 0) {
      let bestWall: any = null;
      let bestDist = Infinity;
      let bestS = 0;
      let bestNormal: [number, number] = [0, 1];
      let bestWallLen = 0;

      for (const w of walls) {
        const x1 = w.start[0];
        const z1 = w.start[1];
        const x2 = w.end[0];
        const z2 = w.end[1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const wallLen = Math.hypot(dx, dz);
        if (wallLen < 1) continue;

        const uX = dx / wallLen;
        const uZ = dz / wallLen;

        const [nX, nZ] = getWallInwardNormal(x1, z1, x2, z2, roomPoly);

        const s = (cab.position[0] - x1) * uX + (cab.position[2] - z1) * uZ;
        const sClamped = Math.max(cab.width / 2 + 0.5, Math.min(wallLen - cab.width / 2 - 0.5, s));
        const projX = x1 + sClamped * uX;
        const projZ = z1 + sClamped * uZ;
        const dist = Math.hypot(cab.position[0] - projX, cab.position[2] - projZ);

        if (dist < bestDist) {
          bestDist = dist;
          bestWall = w;
          bestS = sClamped;
          bestNormal = [nX, nZ];
          bestWallLen = wallLen;
        }
      }

      if (bestWall) {
        const wallThickness = bestWall.thickness || roomConfig?.wallThickness || 20;
        const flushDist = wallThickness / 2 + cab.depth / 2;
        const rot = Math.atan2(bestNormal[0], bestNormal[1]);
        const uX = (bestWall.end[0] - bestWall.start[0]) / bestWallLen;
        const uZ = (bestWall.end[1] - bestWall.start[1]) / bestWallLen;
        const newX = bestWall.start[0] + bestS * uX + flushDist * bestNormal[0];
        const newZ = bestWall.start[1] + bestS * uZ + flushDist * bestNormal[1];

        let newY = cab.position[1];
        if (
          cab.type === 'base' ||
          cab.type === 'tall' ||
          cab.type === 'island' ||
          cab.variant === 'deco_stove' ||
          cab.variant === 'deco_fridge' ||
          cab.variant === 'deco_dishwasher' ||
          cab.variant === 'deco_plant'
        ) {
          newY = cab.height / 2;
        } else if (cab.type === 'wall') {
          newY = cab.position[1] || 140 + cab.height / 2;
        } else if (cab.variant === 'deco_hood') {
          newY = cab.position[1] || 145 + cab.height / 2;
        }

        const constrainedPos = constrainInsideRoomAndWalls(
          [newX, newY, newZ],
          rot,
          cab.width,
          cab.depth,
          cab.height,
          walls,
          roomPoly
        );

        return {
          ...cab,
          position: constrainedPos,
          rotation: rot,
        };
      }
    }

    const constrainedPos = constrainInsideRoomAndWalls(
      cab.position,
      cab.rotation || 0,
      cab.width,
      cab.depth,
      cab.height,
      walls,
      roomPoly
    );

    return {
      ...cab,
      position: constrainedPos,
    };
  });
}

export function isCandidateValid(
  candidate: {
    position: [number, number, number];
    width: number;
    depth: number;
    height: number;
    rotation?: number;
    type?: string;
  },
  existingCabinets: CabinetType[],
  walls: any[] = [],
  ignoreId?: string | null,
  roomPoly: [number, number][] = [],
  architecturalElements: ArchitecturalElement[] = []
): boolean {
  const candBox = getCabinetBox2D(candidate);

  // 1. Validar colisión contra otros muebles
  for (const cab of existingCabinets) {
    if (ignoreId && cab.id === ignoreId) continue;
    const otherBox = getCabinetBox2D(cab);
    const result = checkOBBCollision(candBox, otherBox, 0.8);
    if (result.colliding) {
      return false;
    }
  }

  // 2. Validar colisión contra tabiques/muros
  for (const wall of walls) {
    const wallBox = getWallBox2D(wall);
    const result = checkOBBCollision(candBox, wallBox, 0.8);
    if (result.colliding) {
      return false;
    }
  }

  // 3. Validar colisión contra pilares arquitectónicos
  if (architecturalElements && architecturalElements.length > 0) {
    const pillarBoxes = getPillarsBox2D(architecturalElements, walls, roomPoly);
    for (const pBox of pillarBoxes) {
      const result = checkOBBCollision(candBox, pBox, 0.5);
      if (result.colliding) {
        return false;
      }
    }
  }

  // 4. Validar que el mueble quede dentro del polígono interior de la cocina
  if (roomPoly.length >= 3) {
    if (!isBoxInsidePolygon(candBox, roomPoly, 1.5)) {
      return false;
    }
  }

  return true;
}

export function resolveCabinetsAgainstPillars(
  cabinets: CabinetType[],
  elements: ArchitecturalElement[] = [],
  walls: any[] = [],
  roomPoly: [number, number][] = []
): CabinetType[] {
  const pillarBoxes = getPillarsBox2D(elements, walls, roomPoly);
  if (pillarBoxes.length === 0) return cabinets;

  return cabinets.map((cab) => {
    let [cx, cy, cz] = cab.position;
    const rot = cab.rotation || 0;
    let modified = false;

    // Detect if cabinet is flush against a wall
    let wallDir: [number, number] | null = null;
    let wallInward: [number, number] | null = null;
    let wallStartPt: [number, number] | null = null;
    let wallLength = 0;
    let flushDist = 0;

    for (const w of walls) {
      const [wx1, wz1] = w.start;
      const [wx2, wz2] = w.end;
      const wLen = Math.hypot(wx2 - wx1, wz2 - wz1);
      if (wLen < 1) continue;
      const [nX, nZ] = getWallInwardNormal(wx1, wz1, wx2, wz2, roomPoly);
      const distNormal = Math.abs((cx - wx1) * nX + (cz - wz1) * nZ);
      const wallThick = w.thickness || 20;
      const expectedFlush = wallThick / 2 + cab.depth / 2;
      if (distNormal < expectedFlush + 15) {
        wallDir = [(wx2 - wx1) / wLen, (wz2 - wz1) / wLen];
        wallInward = [nX, nZ];
        wallStartPt = [wx1, wz1];
        wallLength = wLen;
        flushDist = expectedFlush;
        break;
      }
    }

    for (let iter = 0; iter < 5; iter++) {
      let collided = false;
      const cabBox = getCabinetBox2D({
        position: [cx, cy, cz],
        width: cab.width,
        depth: cab.depth,
        height: cab.height,
        rotation: rot,
      });

      for (const pBox of pillarBoxes) {
        const col = checkOBBCollision(cabBox, pBox, 0.2);
        if (col.colliding && col.mtvAxis && col.overlap > 0.05) {
          collided = true;
          modified = true;

          if (wallDir && wallStartPt && wallInward) {
            // Push along the wall direction to remain tight to the wall
            const sCab = (cx - wallStartPt[0]) * wallDir[0] + (cz - wallStartPt[1]) * wallDir[1];
            
            // Calculate true projected range of pillar along wallDir
            let pMin = Infinity;
            let pMax = -Infinity;
            for (const c of pBox.corners) {
              const sProj = (c[0] - wallStartPt[0]) * wallDir[0] + (c[1] - wallStartPt[1]) * wallDir[1];
              if (sProj < pMin) pMin = sProj;
              if (sProj > pMax) pMax = sProj;
            }

            const pCenter = (pMin + pMax) / 2;
            const pushDir = sCab >= pCenter ? 1 : -1;
            let newS = pushDir > 0 ? (pMax + cab.width / 2 + 0.05) : (pMin - cab.width / 2 - 0.05);

            // Clamp to wall boundaries
            newS = Math.max(cab.width / 2 + 0.5, Math.min(wallLength - cab.width / 2 - 0.5, newS));
            cx = wallStartPt[0] + newS * wallDir[0] + flushDist * wallInward[0];
            cz = wallStartPt[1] + newS * wallDir[1] + flushDist * wallInward[1];
          } else {
            cx += col.mtvAxis[0] * (col.overlap + 0.2);
            cz += col.mtvAxis[1] * (col.overlap + 0.2);
          }
        }
      }
      if (!collided) break;
    }

    if (!modified) return cab;

    const constrained = constrainInsideRoomAndWalls(
      [cx, cy, cz],
      rot,
      cab.width,
      cab.depth,
      cab.height,
      walls,
      roomPoly,
      elements
    );

    return {
      ...cab,
      position: constrained,
    };
  });
}

export interface SnapAndCollisionResult {
  position: [number, number, number];
  rotation: number;
  isSnapped: boolean;
  isColliding: boolean;
}

export function resolvePlacement({
  mouseX,
  mouseZ,
  cabWidth,
  cabHeight,
  cabDepth,
  cabType,
  variant,
  customY,
  preferredRot = 0,
  cabinets,
  ignoreId = null,
  walls = [],
  roomVertices = [],
  architecturalElements = [],
}: {
  mouseX: number;
  mouseZ: number;
  cabWidth: number;
  cabHeight: number;
  cabDepth: number;
  cabType: string;
  variant?: string;
  customY?: number;
  preferredRot?: number;
  cabinets: CabinetType[];
  ignoreId?: string | null;
  walls?: any[];
  roomVertices?: { x: number; y: number }[];
  architecturalElements?: ArchitecturalElement[];
}): SnapAndCollisionResult {
  // Altura estándar según tipología o altura personalizada
  const defaultY =
    customY !== undefined
      ? customY
      : cabType === 'wall'
      ? 140 + cabHeight / 2
      : variant === 'deco_hood'
      ? 145 + cabHeight / 2
      : cabType === 'decoration' && variant === 'window'
      ? 90 + cabHeight / 2
      : cabHeight / 2;

  const otherCabinets = cabinets.filter((c) => !ignoreId || c.id !== ignoreId);

  // Polígono de la estancia (XZ)
  let roomPoly: [number, number][] = [];
  if (roomVertices && roomVertices.length >= 3) {
    roomPoly = roomVertices.map((v) => [v.x, v.y]);
  } else if (walls && walls.length >= 3) {
    roomPoly = walls.map((w) => [w.start[0], w.start[1]]);
  }

  // Centroide del polígono
  let roomCenterX = 0;
  let roomCenterZ = 0;
  if (roomPoly.length > 0) {
    let sumX = 0;
    let sumZ = 0;
    roomPoly.forEach(([vx, vz]) => {
      sumX += vx;
      sumZ += vz;
    });
    roomCenterX = sumX / roomPoly.length;
    roomCenterZ = sumZ / roomPoly.length;
  }

  // Construir lista efectiva de muros si vienen desde vertices de habitación
  let effectiveWalls = walls && walls.length > 0 ? walls : [];
  if (effectiveWalls.length === 0 && roomVertices && roomVertices.length >= 3) {
    effectiveWalls = [];
    const n = roomVertices.length;
    for (let i = 0; i < n; i++) {
      const vCur = roomVertices[i];
      const vNext = roomVertices[(i + 1) % n];
      effectiveWalls.push({
        id: `wall_v_${i}`,
        start: [vCur.x, vCur.y],
        end: [vNext.x, vNext.y],
        thickness: 20,
        height: 240,
      });
    }
  }

  const pillarBoxes = getPillarsBox2D(architecturalElements, effectiveWalls, roomPoly);

  // 1. Detección y atracción magnética a otros muebles adyacentes y pilares (Snapping Flanco a Flanco suave)
  const snapThreshold = cabType === 'island' ? 42 : 30;
  let bestSnap: { pos: [number, number, number]; rot: number; dist: number } | null = null;

  for (const cab of otherCabinets) {
    const rot = cab.rotation || 0;
    const isCornerBlind = cab.variant?.startsWith('corner_blind') || cab.variant === 'corner_blind';
    const isRightBlind = cab.variant !== 'corner_blind_left';

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const uX: [number, number] = [cos, sin];

    const rightDist = (cab.width + cabWidth) / 2;
    const leftDist = -(cab.width + cabWidth) / 2;

    const candidateRight: [number, number, number] = [
      cab.position[0] + rightDist * uX[0],
      defaultY,
      cab.position[2] + rightDist * uX[1],
    ];

    const candidateLeft: [number, number, number] = [
      cab.position[0] + leftDist * uX[0],
      defaultY,
      cab.position[2] + leftDist * uX[1],
    ];

    const distR = Math.hypot(mouseX - candidateRight[0], mouseZ - candidateRight[2]);
    if (distR < snapThreshold) {
      // Validate that candidate does not breach walls or pillars
      const constrained = constrainInsideRoomAndWalls(candidateRight, rot, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);
      const isCandValid = isCandidateValid({
        position: constrained,
        width: cabWidth,
        depth: cabDepth,
        height: cabHeight,
        rotation: rot,
        type: cabType,
      }, otherCabinets, walls, ignoreId, roomPoly, architecturalElements);

      if (isCandValid && (!bestSnap || distR < bestSnap.dist)) {
        bestSnap = { pos: constrained, rot, dist: distR };
      }
    }

    const distL = Math.hypot(mouseX - candidateLeft[0], mouseZ - candidateLeft[2]);
    if (distL < snapThreshold) {
      const constrained = constrainInsideRoomAndWalls(candidateLeft, rot, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);
      const isCandValid = isCandidateValid({
        position: constrained,
        width: cabWidth,
        depth: cabDepth,
        height: cabHeight,
        rotation: rot,
        type: cabType,
      }, otherCabinets, walls, ignoreId, roomPoly, architecturalElements);

      if (isCandValid && (!bestSnap || distL < bestSnap.dist)) {
        bestSnap = { pos: constrained, rot, dist: distL };
      }
    }

    // Acople ortogonal en esquineros ciegos
    if (isCornerBlind) {
      const blindW = Math.max(35, cab.width / 2);
      const localBlindOffsetX = isRightBlind ? cab.width / 2 - blindW / 2 : -cab.width / 2 + blindW / 2;
      const orthoRot = isRightBlind ? rot + Math.PI / 2 : rot - Math.PI / 2;
      const dockLocalZ = cab.depth / 2 + cabWidth / 2;

      const dockWorldX = cab.position[0] + (localBlindOffsetX * cos + dockLocalZ * sin);
      const dockWorldZ = cab.position[2] + (localBlindOffsetX * sin - dockLocalZ * cos);
      const distDock = Math.hypot(mouseX - dockWorldX, mouseZ - dockWorldZ);

      if (distDock < snapThreshold * 1.2) {
        const dockPos: [number, number, number] = [dockWorldX, defaultY, dockWorldZ];
        const constrained = constrainInsideRoomAndWalls(dockPos, orthoRot, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);
        if (!bestSnap || distDock < bestSnap.dist) {
          bestSnap = { pos: constrained, rot: orthoRot, dist: distDock };
        }
      }
    }

    // Detección de contacto magnético posterior (espalda con espalda) para islas
    if (cabType === 'island' && (cab.type === 'island' || cab.type === 'base')) {
      const backDist = (cab.depth + cabDepth) / 2;
      const backDockX = cab.position[0] - backDist * sin;
      const backDockZ = cab.position[2] + backDist * cos;
      
      // Candidato espalda con espalda mirando hacia afuera (rot + PI)
      const candBackOpposite: [number, number, number] = [
        backDockX,
        defaultY,
        backDockZ,
      ];
      const rotOpposite = (rot + Math.PI) % (Math.PI * 2);
      const distBackOpp = Math.hypot(mouseX - candBackOpposite[0], mouseZ - candBackOpposite[2]);

      if (distBackOpp < snapThreshold * 1.2) {
        const constrained = constrainInsideRoomAndWalls(candBackOpposite, rotOpposite, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);
        const isCandValid = isCandidateValid({
          position: constrained,
          width: cabWidth,
          depth: cabDepth,
          height: cabHeight,
          rotation: rotOpposite,
          type: cabType,
        }, otherCabinets, walls, ignoreId, roomPoly, architecturalElements);

        if (isCandValid && (!bestSnap || distBackOpp < bestSnap.dist)) {
          bestSnap = { pos: constrained, rot: rotOpposite, dist: distBackOpp };
        }
      }

      // Candidato espalda con trasera en misma orientación (rot)
      const candBackSame: [number, number, number] = [
        backDockX,
        defaultY,
        backDockZ,
      ];
      const distBackSame = Math.hypot(mouseX - candBackSame[0], mouseZ - candBackSame[2]);
      if (distBackSame < snapThreshold * 1.2) {
        const constrained = constrainInsideRoomAndWalls(candBackSame, rot, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);
        const isCandValid = isCandidateValid({
          position: constrained,
          width: cabWidth,
          depth: cabDepth,
          height: cabHeight,
          rotation: rot,
          type: cabType,
        }, otherCabinets, walls, ignoreId, roomPoly, architecturalElements);

        if (isCandValid && (!bestSnap || distBackSame < bestSnap.dist)) {
          bestSnap = { pos: constrained, rot, dist: distBackSame };
        }
      }
    }
  }

  // Snapping magnético lateral contra pilares arquitectónicos
  if (pillarBoxes.length > 0 && effectiveWalls.length > 0) {
    for (const pBox of pillarBoxes) {
      for (const w of effectiveWalls) {
        const x1 = w.start[0];
        const z1 = w.start[1];
        const x2 = w.end[0];
        const z2 = w.end[1];
        const wallLen = Math.hypot(x2 - x1, z2 - z1);
        if (wallLen < 15) continue;

        const uX = (x2 - x1) / wallLen;
        const uZ = (z2 - z1) / wallLen;
        const [nX, nZ] = getWallInwardNormal(x1, z1, x2, z2, roomPoly);

        let pMin = Infinity;
        let pMax = -Infinity;
        let nMin = Infinity;
        let nMax = -Infinity;
        for (const c of pBox.corners) {
          const sP = (c[0] - x1) * uX + (c[1] - z1) * uZ;
          if (sP < pMin) pMin = sP;
          if (sP > pMax) pMax = sP;
          const nP = (c[0] - x1) * nX + (c[1] - z1) * nZ;
          if (nP < nMin) nMin = nP;
          if (nP > nMax) nMax = nP;
        }

        const wallThick = w.thickness || 20;
        const flushDist = wallThick / 2 + cabDepth / 2;
        const wallRot = Math.atan2(nX, nZ);

        if (nMax > 0.5 && nMin < flushDist + cabDepth / 2 + 10) {
          const halfW = cabWidth / 2;
          const candidateSList = [pMax + halfW, pMin - halfW];

          for (const candS of candidateSList) {
            if (candS >= halfW + 0.5 && candS <= wallLen - halfW - 0.5) {
              const candX = x1 + candS * uX + flushDist * nX;
              const candZ = z1 + candS * uZ + flushDist * nZ;
              const dist = Math.hypot(mouseX - candX, mouseZ - candZ);

              if (dist < snapThreshold) {
                const candidatePos: [number, number, number] = [candX, defaultY, candZ];
                const isCandValid = isCandidateValid(
                  {
                    position: candidatePos,
                    width: cabWidth,
                    depth: cabDepth,
                    height: cabHeight,
                    rotation: wallRot,
                    type: cabType,
                  },
                  otherCabinets,
                  effectiveWalls,
                  ignoreId,
                  roomPoly,
                  architecturalElements
                );

                if (isCandValid && (!bestSnap || dist < bestSnap.dist)) {
                  bestSnap = { pos: candidatePos, rot: wallRot, dist };
                }
              }
            }
          }
        }
      }
    }
  }

  if (bestSnap) {
    return {
      position: bestSnap.pos,
      rotation: bestSnap.rot,
      isSnapped: true,
      isColliding: false,
    };
  }

  // 2. Detección y atracción magnética directa al muro para muebles
  // Los muebles base, despensa (tall), murales (wall) y electrodomésticos se anclan SIEMPRE a muro por su cara posterior
  const isWallBound =
    cabType === 'base' ||
    cabType === 'tall' ||
    cabType === 'wall' ||
    cabType === 'decoration' ||
    variant === 'deco_hood' ||
    variant === 'deco_stove' ||
    variant === 'deco_fridge' ||
    variant === 'deco_dishwasher';
  const wallSnapThreshold = isWallBound ? Infinity : (cabType === 'island' ? 0 : 50);
  let bestWallSnap: { pos: [number, number, number]; rot: number; dist: number; isColliding: boolean } | null = null;

  if (effectiveWalls.length > 0) {
    for (const w of effectiveWalls) {
      const x1 = w.start[0];
      const z1 = w.start[1];
      const x2 = w.end[0];
      const z2 = w.end[1];
      const wallLen = Math.hypot(x2 - x1, z2 - z1);
      if (wallLen < 15) continue;

      const uX = (x2 - x1) / wallLen;
      const uZ = (z2 - z1) / wallLen;

      // Inward normal pointing into the room
      const [nX, nZ] = getWallInwardNormal(x1, z1, x2, z2, roomPoly);

      // Proyectar ratón sobre el muro
      const s = (mouseX - x1) * uX + (mouseZ - z1) * uZ;
      const sClamped = Math.max(cabWidth / 2 + 0.5, Math.min(wallLen - cabWidth / 2 - 0.5, s));
      const wallThickness = w.thickness || 20;
      const isWallMountedDeco = variant === 'deco_hood' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_dishwasher';
      const flushDist = (cabType === 'decoration' && !isWallMountedDeco && variant !== 'deco_plant') ? 0 : (variant === 'deco_plant' ? 0 : wallThickness / 2 + cabDepth / 2);

      // La posición de enganche siempre queda exactamente en la cara interior del tabique
      let snapPosX = x1 + sClamped * uX + flushDist * nX;
      let snapPosZ = z1 + sClamped * uZ + flushDist * nZ;
      
      // La rotación asegura que la trasera (-Z) esté contra la pared y el frente (+Z) hacia la habitación
      const wallRot = Math.atan2(nX, nZ);

      // --- COMPROBACIÓN Y RESOLUCIÓN DE COLISIÓN RIGUROSA A LO LARGO DEL MURO (1D INTERVAL FREE GAP) ---
      // 1. Recolectar todos los muebles y pilares que comparten este tramo de muro y solapan verticalmente en altura
      const rawIntervals: [number, number][] = [];
      const candYMin = defaultY - cabHeight / 2;
      const candYMax = defaultY + cabHeight / 2;

      for (const otherCab of otherCabinets) {
        // Verificar si se solapan verticalmente (Y)
        const otherYMin = otherCab.position[1] - otherCab.height / 2;
        const otherYMax = otherCab.position[1] + otherCab.height / 2;
        if (Math.min(otherYMax, candYMax) - Math.max(otherYMin, candYMin) <= 2) {
          continue; // No chocan en altura (ej. aéreo sobre mueble base)
        }

        // Comprobar si el otro mueble está cerca de la línea del muro proyectando sus esquinas
        const otherBox = getCabinetBox2D(otherCab);
        let pMin = Infinity;
        let pMax = -Infinity;
        let nMin = Infinity;
        let nMax = -Infinity;

        for (const c of otherBox.corners) {
          const sProj = (c[0] - x1) * uX + (c[1] - z1) * uZ;
          if (sProj < pMin) pMin = sProj;
          if (sProj > pMax) pMax = sProj;
          const normProj = (c[0] - x1) * nX + (c[1] - z1) * nZ;
          if (normProj < nMin) nMin = normProj;
          if (normProj > nMax) nMax = normProj;
        }

        // Si el mueble intersecta la franja frontal del muro
        if (nMax > 0.5 && nMin < flushDist + cabDepth / 2 + 10) {
          rawIntervals.push([Math.max(0, pMin), Math.min(wallLen, pMax)]);
        }
      }

      // Incorporar pilares arquitectónicos como obstáculos físicos en el muro
      for (const pBox of pillarBoxes) {
        let pMin = Infinity;
        let pMax = -Infinity;
        let nMin = Infinity;
        let nMax = -Infinity;

        for (const c of pBox.corners) {
          const sProj = (c[0] - x1) * uX + (c[1] - z1) * uZ;
          if (sProj < pMin) pMin = sProj;
          if (sProj > pMax) pMax = sProj;
          const normProj = (c[0] - x1) * nX + (c[1] - z1) * nZ;
          if (normProj < nMin) nMin = normProj;
          if (normProj > nMax) nMax = normProj;
        }

        if (nMax > 0.5 && nMin < flushDist + cabDepth / 2 + 10) {
          rawIntervals.push([Math.max(0, pMin), Math.min(wallLen, pMax)]);
        }
      }

      // 2. Fusionar intervalos solapados o contiguos a lo largo del muro
      rawIntervals.sort((a, b) => a[0] - b[0]);
      const mergedIntervals: [number, number][] = [];
      for (const iv of rawIntervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push([iv[0], iv[1]]);
        } else {
          const prev = mergedIntervals[mergedIntervals.length - 1];
          if (iv[0] <= prev[1] + 0.1) {
            prev[1] = Math.max(prev[1], iv[1]);
          } else {
            mergedIntervals.push([iv[0], iv[1]]);
          }
        }
      }

      // 3. Extraer vanos libres continuos (Free Gaps) en el muro
      const freeGaps: [number, number][] = [];
      let currentEdge = 0.5;
      for (const [oStart, oEnd] of mergedIntervals) {
        if (oStart > currentEdge + 0.1) {
          freeGaps.push([currentEdge, Math.min(wallLen - 0.5, oStart)]);
        }
        currentEdge = Math.max(currentEdge, oEnd);
      }
      if (currentEdge < wallLen - 0.5 - 0.1) {
        freeGaps.push([currentEdge, wallLen - 0.5]);
      }

      // 4. Filtrar vanos donde quepa físicamente el ancho del módulo (capacidad >= cabWidth)
      const validGaps = freeGaps.filter(([gStart, gEnd]) => (gEnd - gStart) >= cabWidth - 0.05);

      let resolvedS = sClamped;
      let hasValidWallSlot = false;

      if (validGaps.length > 0) {
        hasValidWallSlot = true;
        let bestGapDist = Infinity;
        let bestGapS = sClamped;

        for (const [gStart, gEnd] of validGaps) {
          const minCenter = gStart + cabWidth / 2;
          const maxCenter = gEnd - cabWidth / 2;
          const clampedInGap = Math.max(minCenter, Math.min(maxCenter, s));
          const dist = Math.abs(s - clampedInGap);
          if (dist < bestGapDist) {
            bestGapDist = dist;
            bestGapS = clampedInGap;
          }
        }
        resolvedS = bestGapS;
      } else {
        // En caso de muro saturado sin vanos disponibles para este módulo
        hasValidWallSlot = false;
        resolvedS = sClamped;
      }

      snapPosX = x1 + resolvedS * uX + flushDist * nX;
      snapPosZ = z1 + resolvedS * uZ + flushDist * nZ;

      let snapCandidatePos: [number, number, number] = [snapPosX, defaultY, snapPosZ];
      snapCandidatePos = constrainInsideRoomAndWalls(snapCandidatePos, wallRot, cabWidth, cabDepth, cabHeight, effectiveWalls, roomPoly, architecturalElements);

      // Comprobar colisión volumétrica precisa OBB
      const finalCandBox = getCabinetBox2D({
        position: snapCandidatePos,
        width: cabWidth,
        depth: cabDepth,
        height: cabHeight,
        rotation: wallRot,
        type: cabType,
      });

      let isStillColliding = !hasValidWallSlot;
      if (!isStillColliding) {
        for (const otherCab of otherCabinets) {
          const otherBox = getCabinetBox2D(otherCab);
          if (checkOBBCollision(finalCandBox, otherBox, 0.4).colliding) {
            isStillColliding = true;
            break;
          }
        }
      }

      if (!isStillColliding) {
        for (const pBox of pillarBoxes) {
          if (checkOBBCollision(finalCandBox, pBox, 0.4).colliding) {
            isStillColliding = true;
            break;
          }
        }
      }

      const distToSnap = Math.hypot(mouseX - snapCandidatePos[0], mouseZ - snapCandidatePos[2]);

      if (distToSnap < wallSnapThreshold) {
        if (!bestWallSnap || (!isStillColliding && bestWallSnap.isColliding) || (distToSnap < bestWallSnap.dist && isStillColliding === bestWallSnap.isColliding)) {
          bestWallSnap = {
            pos: snapCandidatePos,
            rot: wallRot,
            dist: distToSnap,
            isColliding: isStillColliding,
          };
        }
      }
    }
  }

  if (bestWallSnap) {
    return {
      position: bestWallSnap.pos,
      rotation: bestWallSnap.rot,
      isSnapped: true,
      isColliding: bestWallSnap.isColliding,
    };
  }

  // 3. Posición libre: resolución de colisión OBB / SAT para evitar que los muebles se sobrepongan entre sí
  let candidatePos: [number, number, number] = [
    cabType === 'island' ? Math.round(mouseX / 5) * 5 : mouseX,
    defaultY,
    cabType === 'island' ? Math.round(mouseZ / 5) * 5 : mouseZ,
  ];
  const curRot = preferredRot;

  // Si no está snappeado, empujar fuera de cualquier colisión con otros muebles
  for (let iter = 0; iter < 6; iter++) {
    let hadCollision = false;
    const candBox = getCabinetBox2D({
      position: candidatePos,
      width: cabWidth,
      depth: cabDepth,
      height: cabHeight,
      rotation: curRot,
      type: cabType,
    });

    for (const otherCab of otherCabinets) {
      // Verificar solapamiento en altura
      const otherYMin = otherCab.position[1] - otherCab.height / 2;
      const otherYMax = otherCab.position[1] + otherCab.height / 2;
      const candYMin = defaultY - cabHeight / 2;
      const candYMax = defaultY + cabHeight / 2;
      if (Math.min(otherYMax, candYMax) - Math.max(otherYMin, candYMin) <= 2) {
        continue;
      }

      const otherBox = getCabinetBox2D(otherCab);
      const col = checkOBBCollision(candBox, otherBox, 0.2);
      if (col.colliding && col.mtvAxis && col.overlap > 0.05) {
        hadCollision = true;
        candidatePos[0] += col.mtvAxis[0] * (col.overlap + 0.1);
        candidatePos[2] += col.mtvAxis[1] * (col.overlap + 0.1);
        break;
      }
    }

    if (!hadCollision) break;
  }

  candidatePos = constrainInsideRoomAndWalls(candidatePos, curRot, cabWidth, cabDepth, cabHeight, walls, roomPoly, architecturalElements);

  // Verificación final de colisión
  const finalCandBox = getCabinetBox2D({
    position: candidatePos,
    width: cabWidth,
    depth: cabDepth,
    height: cabHeight,
    rotation: curRot,
    type: cabType,
  });

  let isColliding = false;
  for (const otherCab of otherCabinets) {
    const otherBox = getCabinetBox2D(otherCab);
    if (checkOBBCollision(finalCandBox, otherBox, 0.4).colliding) {
      isColliding = true;
      break;
    }
  }

  return {
    position: candidatePos,
    rotation: curRot,
    isSnapped: false,
    isColliding,
  };
}

export interface CabinetToolSpecs {
  type: 'base' | 'tall' | 'wall' | 'island' | 'decoration';
  variant: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  defaultY?: number;
}

export function getCabinetSpecsFromTool(toolMode: string, existingCabinets: any[] = []): CabinetToolSpecs {
  // Módulos Hospitalarios Especializados (Norma MC.2.02 SACYR)
  if (toolMode === 'place_hospital_meson_3drawers') {
    // 3 Cajones: A, B (Ducasse) y C (Häfele cierre suave) + Cerradura trampa ANVER
    return { type: 'base', variant: 'hospital_meson_3drawers', name: 'Mesón 3 Cajones (ANVER)', width: 45, height: 90, depth: 60 };
  }
  if (toolMode === 'place_hospital_meson_1door') {
    // Puerta batiente con asa corrida KUTZ 12/18 y 2 repisas
    return { type: 'base', variant: 'hospital_meson_1door', name: 'Mesón 1 Puerta (KUTZ)', width: 90, height: 90, depth: 60 };
  }
  if (toolMode === 'place_hospital_meson_2doors') {
    // 2 Puertas batientes con asas corridas KUTZ 12/18 y 2 repisas
    return { type: 'base', variant: 'hospital_meson_2doors', name: 'Mesón 2 Puertas (KUTZ)', width: 90, height: 90, depth: 60 };
  }
  if (toolMode === 'place_hospital_niche_open') {
    // Nicho abierto de 300 mm para insumos
    return { type: 'base', variant: 'hospital_niche_open', name: 'Nicho Abierto Clínico 30cm', width: 30, height: 90, depth: 60 };
  }

  // Bases
  if (toolMode.startsWith('place_base_')) {
    const v = toolMode.replace('place_base_', '');
    let w = 60;
    let d = 60;
    let name = 'Módulo Base';
    let variant = v;
    if (v === '1_door') { w = 60; name = 'Base 1 Puerta'; }
    else if (v === '1_door_1_drawer') { w = 60; name = 'Base 1 Pta + 1 Cajón'; }
    else if (v === '2_doors') { w = 80; name = 'Base 2 Puertas'; }
    else if (v === '4_drawers') { w = 80; name = 'Base 4 Cajones'; }
    else if (v === '2_pot_drawers') { w = 80; name = 'Base 2 Olleros'; }
    else if (v === 'sink_u_drawer') { w = 90; name = 'Fregadero Cajón en U'; }
    else if (v === 'spice_rack') { w = 15; name = 'Especiero Extraíble'; }
    else if (v === 'wine_rack') { w = 20; name = 'Botellero Base'; }
    else if (v === 'corner_blind') { w = 100; name = 'Esquinero Ciego'; variant = 'corner_blind_right'; }
    else if (v === 'corner_l') { w = 90; d = 90; name = 'Esquinero en L'; }
    return { type: 'base', variant, name, width: w, height: 80, depth: d };
  }

  // Torres
  if (toolMode.startsWith('place_tall')) {
    const raw = toolMode === 'place_tall' ? 'tall_1_door' : (toolMode.startsWith('place_tall_') ? toolMode.replace('place_', '') : toolMode);
    let w = 60;
    let name = 'Torre Despensa';
    if (raw === 'tall_1_door') { w = 60; name = 'Torre 1 Puerta Larga'; }
    else if (raw === 'tall_split_2_doors') { w = 60; name = 'Torre 2 Puertas'; }
    else if (raw === 'tall_oven_micro') { w = 60; name = 'Torre Horno + Microondas'; }
    else if (raw === 'tall_oven_vent') { w = 60; name = 'Torre Hornos Vent. Técnica'; }
    else if (raw === 'tall_inner_drawers') { w = 60; name = 'Torre Cajones Interiores'; }
    else if (raw === 'tall_microwave_niche') { w = 60; name = 'Torre Nicho Microondas'; }
    else if (raw === 'tall_open') { w = 60; name = 'Torre Repisas a la Vista'; }
    else if (raw === 'tall_wine_rack') { w = 30; name = 'Torre Botellero'; }
    else if (raw === 'tall_2_doors') { w = 80; name = 'Torre Despensa 2 Puertas'; }
    return { type: 'tall', variant: raw, name, width: w, height: 215, depth: 60 };
  }

  // Murales / Aéreos
  if (toolMode.startsWith('place_wall')) {
    const v = toolMode === 'place_wall' ? '2_doors' : toolMode.replace('place_wall_', '');
    let w = 60;
    let h = 70;
    let d = 35;
    let name = 'Módulo Aéreo';
    let variant = v;
    if (v === '1_door') { w = 60; name = 'Aéreo 1 Puerta'; }
    else if (v === '2_doors') { w = 80; name = 'Aéreo 2 Puertas'; }
    else if (v === 'lift_up') { variant = 'wall_lift_up'; w = 80; h = 40; name = 'Aéreo Puerta Elevable'; }
    else if (v === 'lift_up_double') { variant = 'wall_lift_up_double'; w = 80; h = 70; name = 'Aéreo Doble Elevable'; }
    else if (v === 'microwave_niche') { variant = 'wall_microwave_niche'; w = 60; h = 80; d = 38; name = 'Aéreo Nicho Microondas'; }
    else if (v === 'open') { variant = 'wall_open'; w = 60; h = 70; name = 'Aéreo Repisas a la Vista'; }
    else if (v === 'corner_blind') { variant = 'wall_corner_blind_right'; w = 70; h = 70; name = 'Aéreo Esquinero Ciego'; }
    else if (v === 'wine_rack') { variant = 'wall_wine_rack'; w = 20; h = 70; name = 'Aéreo Botellero'; }
    return { type: 'wall', variant, name, width: w, height: h, depth: d };
  }

  // Islas
  if (toolMode.startsWith('place_island')) {
    const existingIsland = existingCabinets.find((c: any) => c.type === 'island');
    const defaultIslandDepth = existingIsland?.depth || 80;
    const defaultIslandHeight = existingIsland?.height || 80;
    let v = '2_pot_drawers';
    let w = 90;
    let name = 'Isla 2 Olleros';
    if (toolMode === 'place_island_wine_rack') { v = 'wine_rack'; w = 25; name = 'Botellero Isla'; }
    else if (toolMode === 'place_island_4_drawers') { v = '4_drawers'; w = 80; name = 'Isla 4 Cajones'; }
    else if (toolMode === 'place_island_2_drawers_1_pot') { v = '2_drawers_1_pot'; w = 80; name = 'Isla 2 Cajones + 1 Ollero'; }
    else if (toolMode === 'place_island_1_door') { v = '1_door'; w = 60; name = 'Isla 1 Puerta'; }
    else if (toolMode === 'place_island_2_doors') { v = '2_doors'; w = 80; name = 'Isla 2 Puertas'; }
    return { type: 'island', variant: v, name, width: w, height: defaultIslandHeight, depth: defaultIslandDepth };
  }

  // Decoraciones / Equipamiento
  if (toolMode === 'place_deco_stove') return { type: 'decoration', variant: 'deco_stove', name: 'Cocina FDV 90', width: 90, height: 90, depth: 60 };
  if (toolMode === 'place_deco_fridge') return { type: 'decoration', variant: 'deco_fridge', name: 'Refrigerador SBS', width: 91, height: 177, depth: 67 };
  if (toolMode === 'place_deco_hood') return { type: 'decoration', variant: 'deco_hood', name: 'Campana FDV Conic 90', width: 89.8, height: 70, depth: 50 };
  if (toolMode === 'place_deco_plant') return { type: 'decoration', variant: 'deco_plant', name: 'Planta Interior', width: 40, height: 95, depth: 40 };
  if (toolMode === 'place_deco_dishwasher') return { type: 'decoration', variant: 'deco_dishwasher', name: 'Lavavajillas FDV 12C', width: 59.8, height: 84.5, depth: 60 };

  return { type: 'base', variant: '1_door', name: 'Módulo Base', width: 60, height: 80, depth: 60 };
}

/**
 * Busca de forma autónoma la ubicación paramétrica ideal y 100% libre de colisiones
 * para insertar un nuevo módulo en la cocina (evitando sobreposiciones de Aéreos sobre Torres,
 * o Despensas sobre Muebles Base).
 */
export function findSmartWallPlacement(
  specs: CabinetToolSpecs,
  currentCabinets: CabinetType[],
  walls: any[] = [],
  roomVertices: { x: number; y: number }[] = [],
  architecturalElements: ArchitecturalElement[] = []
): { position: [number, number, number]; rotation: number } {
  let roomPoly: [number, number][] = [];
  if (roomVertices && roomVertices.length >= 3) {
    roomPoly = roomVertices.map((v) => [v.x, v.y]);
  } else if (walls && walls.length >= 3) {
    roomPoly = walls.map((w) => [w.start[0], w.start[1]]);
  }

  let effectiveWalls = walls && walls.length > 0 ? walls : [];
  if (effectiveWalls.length === 0 && roomVertices && roomVertices.length >= 3) {
    effectiveWalls = roomVertices.map((v, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      return { id: `wall_v_${i}`, start: [v.x, v.y] as [number, number], end: [next.x, next.y] as [number, number], thickness: 20, height: 240 };
    });
  }

  const defaultY =
    specs.defaultY !== undefined
      ? specs.defaultY
      : specs.type === 'wall'
      ? 140 + specs.height / 2
      : specs.variant === 'deco_hood'
      ? 145 + specs.height / 2
      : specs.type === 'decoration' && specs.variant === 'window'
      ? 90 + specs.height / 2
      : specs.height / 2;

  // 1. ISLAS
  if (specs.type === 'island') {
    const islandCabinets = currentCabinets.filter((c) => c.type === 'island');
    if (islandCabinets.length > 0) {
      const lastIsland = islandCabinets[islandCabinets.length - 1];
      const rot = lastIsland.rotation || 0;
      const rightDist = (lastIsland.width + specs.width) / 2;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const targetPos: [number, number, number] = [
        lastIsland.position[0] + rightDist * cos,
        defaultY,
        lastIsland.position[2] + rightDist * sin,
      ];
      if (
        isCandidateValid(
          { position: targetPos, width: specs.width, depth: specs.depth, height: specs.height, rotation: rot, type: specs.type },
          currentCabinets,
          effectiveWalls,
          null,
          roomPoly,
          architecturalElements
        )
      ) {
        return { position: targetPos, rotation: rot };
      }
    }

    let centerX = 0;
    let centerZ = 0;
    if (roomPoly.length >= 3) {
      const xs = roomPoly.map((p) => p[0]);
      const zs = roomPoly.map((p) => p[1]);
      centerX = Math.round((Math.min(...xs) + Math.max(...xs)) / 2 / 5) * 5;
      centerZ = Math.round((Math.min(...zs) + Math.max(...zs)) / 2 / 5) * 5;
    }
    const result = resolvePlacement({
      mouseX: centerX,
      mouseZ: centerZ,
      cabWidth: specs.width,
      cabHeight: specs.height,
      cabDepth: specs.depth,
      cabType: specs.type,
      variant: specs.variant,
      customY: defaultY,
      preferredRot: 0,
      cabinets: currentCabinets,
      walls: effectiveWalls,
      roomVertices,
      architecturalElements,
    });
    return { position: result.position, rotation: result.rotation };
  }

  // 2. MUEBLES ADOSADOS A MUROS (BASE, TALL, WALL, DECORATION)
  if (effectiveWalls.length === 0) {
    const result = resolvePlacement({
      mouseX: 0,
      mouseZ: 0,
      cabWidth: specs.width,
      cabHeight: specs.height,
      cabDepth: specs.depth,
      cabType: specs.type,
      variant: specs.variant,
      customY: defaultY,
      preferredRot: 0,
      cabinets: currentCabinets,
      walls: effectiveWalls,
      roomVertices,
      architecturalElements,
    });
    return { position: result.position, rotation: result.rotation };
  }

  // Si es mueble AÉREO y ya existen aéreos, intentar acoplar lateralmente al último aéreo
  if (specs.type === 'wall') {
    const existingWalls = currentCabinets.filter((c) => c.type === 'wall');
    if (existingWalls.length > 0) {
      const lastWallCab = existingWalls[existingWalls.length - 1];
      const rot = lastWallCab.rotation || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const rightDist = (lastWallCab.width + specs.width) / 2;

      // Intentar a la derecha
      const candRight: [number, number, number] = [
        lastWallCab.position[0] + rightDist * cos,
        defaultY,
        lastWallCab.position[2] + rightDist * sin,
      ];
      if (
        isCandidateValid(
          { position: candRight, width: specs.width, depth: specs.depth, height: specs.height, rotation: rot, type: specs.type },
          currentCabinets,
          effectiveWalls,
          null,
          roomPoly,
          architecturalElements
        )
      ) {
        return { position: candRight, rotation: rot };
      }

      // Intentar a la izquierda
      const candLeft: [number, number, number] = [
        lastWallCab.position[0] - rightDist * cos,
        defaultY,
        lastWallCab.position[2] - rightDist * sin,
      ];
      if (
        isCandidateValid(
          { position: candLeft, width: specs.width, depth: specs.depth, height: specs.height, rotation: rot, type: specs.type },
          currentCabinets,
          effectiveWalls,
          null,
          roomPoly,
          architecturalElements
        )
      ) {
        return { position: candLeft, rotation: rot };
      }
    }
  }

  // Buscar el primer vano libre disponible en los muros que contenga espacio para este mueble
  for (const w of effectiveWalls) {
    const [x1, z1] = w.start;
    const [x2, z2] = w.end;
    const wallLen = Math.hypot(x2 - x1, z2 - z1);
    if (wallLen < specs.width + 1) continue;

    const uX = (x2 - x1) / wallLen;
    const uZ = (z2 - z1) / wallLen;
    const [nX, nZ] = getWallInwardNormal(x1, z1, x2, z2, roomPoly);
    const wallRot = Math.atan2(nX, nZ);
    const wallThickness = w.thickness || 20;
    const flushDist = wallThickness / 2 + specs.depth / 2;

    const rawIntervals: [number, number][] = [];
    const candYMin = defaultY - specs.height / 2;
    const candYMax = defaultY + specs.height / 2;

    // Obtener obstáculos verticales en este muro
    for (const otherCab of currentCabinets) {
      const otherYMin = otherCab.position[1] - otherCab.height / 2;
      const otherYMax = otherCab.position[1] + otherCab.height / 2;
      if (Math.min(otherYMax, candYMax) - Math.max(otherYMin, candYMin) <= 2) {
        continue;
      }

      const otherBox = getCabinetBox2D(otherCab);
      let pMin = Infinity;
      let pMax = -Infinity;
      let nMin = Infinity;
      let nMax = -Infinity;

      for (const c of otherBox.corners) {
        const sProj = (c[0] - x1) * uX + (c[1] - z1) * uZ;
        if (sProj < pMin) pMin = sProj;
        if (sProj > pMax) pMax = sProj;
        const normProj = (c[0] - x1) * nX + (c[1] - z1) * nZ;
        if (normProj < nMin) nMin = normProj;
        if (normProj > nMax) nMax = normProj;
      }

      if (nMax > 0.5 && nMin < flushDist + specs.depth / 2 + 10) {
        rawIntervals.push([Math.max(0, pMin), Math.min(wallLen, pMax)]);
      }
    }

    // Incorporar pilares
    const pillarBoxes = getPillarsBox2D(architecturalElements, effectiveWalls, roomPoly);
    for (const pBox of pillarBoxes) {
      let pMin = Infinity;
      let pMax = -Infinity;
      let nMin = Infinity;
      let nMax = -Infinity;

      for (const c of pBox.corners) {
        const sProj = (c[0] - x1) * uX + (c[1] - z1) * uZ;
        if (sProj < pMin) pMin = sProj;
        if (sProj > pMax) pMax = sProj;
        const normProj = (c[0] - x1) * nX + (c[1] - z1) * nZ;
        if (normProj < nMin) nMin = normProj;
        if (normProj > nMax) nMax = normProj;
      }

      if (nMax > 0.5 && nMin < flushDist + specs.depth / 2 + 10) {
        rawIntervals.push([Math.max(0, pMin), Math.min(wallLen, pMax)]);
      }
    }

    // Fusionar intervalos
    rawIntervals.sort((a, b) => a[0] - b[0]);
    const mergedIntervals: [number, number][] = [];
    for (const iv of rawIntervals) {
      if (mergedIntervals.length === 0) {
        mergedIntervals.push([iv[0], iv[1]]);
      } else {
        const prev = mergedIntervals[mergedIntervals.length - 1];
        if (iv[0] <= prev[1] + 0.1) {
          prev[1] = Math.max(prev[1], iv[1]);
        } else {
          mergedIntervals.push([iv[0], iv[1]]);
        }
      }
    }

    // Extraer vanos libres
    const freeGaps: [number, number][] = [];
    let currentEdge = 0.5;
    for (const [oStart, oEnd] of mergedIntervals) {
      if (oStart > currentEdge + 0.1) {
        freeGaps.push([currentEdge, Math.min(wallLen - 0.5, oStart)]);
      }
      currentEdge = Math.max(currentEdge, oEnd);
    }
    if (currentEdge < wallLen - 0.5 - 0.1) {
      freeGaps.push([currentEdge, wallLen - 0.5]);
    }

    // Filtrar vanos válidos
    const validGaps = freeGaps.filter(([gStart, gEnd]) => (gEnd - gStart) >= specs.width - 0.05);

    if (validGaps.length > 0) {
      // Para muebles aéreos, si hay muebles base en este muro, alinear con el inicio de los muebles base
      let preferredS = validGaps[0][0] + specs.width / 2;
      if (specs.type === 'wall') {
        const basesOnWall = currentCabinets.filter((c) => c.type === 'base');
        let minBaseS = Infinity;
        for (const b of basesOnWall) {
          const sB = (b.position[0] - x1) * uX + (b.position[2] - z1) * uZ;
          const leftB = sB - b.width / 2;
          if (leftB < minBaseS) minBaseS = leftB;
        }

        if (minBaseS < Infinity) {
          for (const [gStart, gEnd] of validGaps) {
            if (minBaseS >= gStart - 0.1 && minBaseS + specs.width <= gEnd + 0.1) {
              preferredS = Math.max(gStart + specs.width / 2, Math.min(gEnd - specs.width / 2, minBaseS + specs.width / 2));
              break;
            }
          }
        }
      }

      const candX = x1 + preferredS * uX + flushDist * nX;
      const candZ = z1 + preferredS * uZ + flushDist * nZ;
      const candPos: [number, number, number] = [candX, defaultY, candZ];

      if (
        isCandidateValid(
          { position: candPos, width: specs.width, depth: specs.depth, height: specs.height, rotation: wallRot, type: specs.type },
          currentCabinets,
          effectiveWalls,
          null,
          roomPoly,
          architecturalElements
        )
      ) {
        return { position: candPos, rotation: wallRot };
      }
    }
  }

  // Fallback con resolvePlacement
  const firstWall = effectiveWalls[0];
  const [wx1, wz1] = firstWall.start;
  const [wx2, wz2] = firstWall.end;
  const fallbackResult = resolvePlacement({
    mouseX: (wx1 + wx2) / 2,
    mouseZ: (wz1 + wz2) / 2,
    cabWidth: specs.width,
    cabHeight: specs.height,
    cabDepth: specs.depth,
    cabType: specs.type,
    variant: specs.variant,
    customY: defaultY,
    preferredRot: 0,
    cabinets: currentCabinets,
    walls: effectiveWalls,
    roomVertices,
    architecturalElements,
  });

  return { position: fallbackResult.position, rotation: fallbackResult.rotation };
}
