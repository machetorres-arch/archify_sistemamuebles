import React, { useRef, useState, useMemo } from 'react';
import { CabinetType, useKitchenStore, getCabinetLabel } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text, Billboard } from '@react-three/drei';
import { Board } from '../Board';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { getNominalSlideLength } from '../../utils/manufacturing';
import { getProvelcarX175Geometry, getProvelcarX176Geometry } from '../../utils/kitchenGola3D';
import { StoveFDVUnique90 } from './decoration/StoveFDVUnique90';
import { FridgeFDVSignatureSBS } from './decoration/FridgeFDVSignatureSBS';
import { PlantDecoration } from './decoration/PlantDecoration';
import { DishwasherFDVActive12C } from './decoration/DishwasherFDVActive12C';
import { KitchenHandle3D } from './KitchenHandle3D';
import { getResolvedCabinetShelfElevations } from '../../utils/kitchenManufacturing';

export function AssemblyJoint({
  position, 
  length, 
  axis, 
  pointing, 
  thickness,
  count = 2,
  overrideAssemblyType = undefined,
  edgeOffset = 5
}: {
  position: [number, number, number],
  length: number,
  axis: 'x' | 'y' | 'z',
  pointing: 'right' | 'left' | 'up' | 'down',
  thickness: number,
  count?: number,
  overrideAssemblyType?: 'spax' | 'minifix',
  edgeOffset?: number
}) {
  const isTransparent = useStore((state) => state.isTransparent);
  const globalAssemblyType = useStore((state) => state.assemblyType);
  const assemblyType = overrideAssemblyType || globalAssemblyType;
  if (!isTransparent) return null;

  const points = [];
  const start = -length / 2 + edgeOffset; 
  const end = length / 2 - edgeOffset;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    points.push(count === 1 ? 0 : start + i * step);
  }

  let rot: [number, number, number] = [0, 0, 0];
  if (pointing === 'left') rot = [0, Math.PI, 0];
  if (pointing === 'up') rot = [0, 0, Math.PI/2];
  if (pointing === 'down') rot = [0, 0, -Math.PI/2];

  return (
    <group position={position}>
      {points.map((p, i) => {
        const pPos: [number, number, number] = 
          axis === 'x' ? [p, 0, 0] : 
          axis === 'y' ? [0, p, 0] : 
          [0, 0, p];
          
        return (
          <group key={i} position={pPos} rotation={rot}>
            {assemblyType === 'spax' ? (
              <group>
                <mesh position={[-thickness, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.4, 0.4, 0.1, 12]} />
                  <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.5} />
                </mesh>
                <mesh position={[-thickness/2 + 1.25, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.15, 0.05, thickness + 2.5, 8]} />
                  <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.5} />
                </mesh>
              </group>
            ) : (
              <group>
                {/* Perno Minifix Acero Zincado */}
                <mesh position={[-thickness/2 + 0.75, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                  <cylinderGeometry args={[0.25, 0.25, thickness + 1.5, 8]} />
                  <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.5} />
                </mesh>
                {/* Caja Excéntrica 15mm Zamak */}
                <mesh position={[1.7, -thickness/2 + 0.25, 0]}>
                  <cylinderGeometry args={[0.75, 0.75, 0.5, 16]} />
                  <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.5} />
                </mesh>
                {/* Tarugo de Madera Estriada 8x30 */}
                <mesh position={[0.5, 0, 2.5]} rotation={[0, 0, -Math.PI/2]}>
                   <cylinderGeometry args={[0.4, 0.4, 3, 8]} />
                   <meshStandardMaterial color="#d4a373" roughness={0.9} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function AnimatedDrawer({ children, openZOffset, forceOpen }: { children: React.ReactNode, openZOffset: number, forceOpen?: boolean, onClickAction?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetZ = forceOpen ? openZOffset : 0;
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 4);
    }
  });

  return (
    <group 
      ref={groupRef}
    >
      {children}
    </group>
  );
}

export function AnimatedDoor({
  doorW,
  doorH,
  thickness,
  position,
  isRightHinge = false,
  colorProps,
  forceOpen,
  globalPosition,
  isUpper,
  handleConfig: propHandleConfig,
  maxAngle = Math.PI * 0.44,
}: {
  doorW: number;
  doorH: number;
  thickness: number;
  position: [number, number, number];
  isRightHinge?: boolean;
  colorProps: any;
  forceOpen?: boolean;
  onClickAction?: () => void;
  globalPosition?: [number, number, number];
  isUpper?: boolean;
  handleConfig?: import('../../types/handle').KitchenHandleConfig;
  maxAngle?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetRotation = forceOpen ? (isRightHinge ? maxAngle : -maxAngle) : 0;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, delta * 4);
    }
  });

  const hingeXOffset = isRightHinge ? doorW / 2 : -doorW / 2;
  const hingeDir = isRightHinge ? -1 : 1;

  const hingeYs = doorH > 180
    ? [-doorH / 2 + 10, -doorH / 6, doorH / 6, doorH / 2 - 10]
    : (doorH > 140
      ? [-doorH / 2 + 12, 0, doorH / 2 - 12]
      : [-doorH / 2 + 10, doorH / 2 - 10]);

  const { handleConfig: storeHandleConfig, golaSystem } = useKitchenStore();
  const handleConfig = propHandleConfig || storeHandleConfig;
  const isUpperResolved = isUpper !== undefined ? isUpper : ((globalPosition?.[1] ?? position[1]) > 135);
  const isPestana = handleConfig?.model === 'ce' || handleConfig?.model === 'oslo' || handleConfig?.model === 'kutz_asa';

  // Dimensiones del tirador para cálculo paramétrico de cotas
  const handleLenMm = handleConfig?.lengthMm ?? 128;
  const handleLenCm = handleLenMm / 10;
  const handleTotalLenCm = handleConfig?.model === 'madrid'
    ? (handleLenMm + 40) / 10
    : handleLenCm;

  // Para perfiles pestaña (Oslo, CE): se montan en el canto con holgura de 8mm respecto al borde de apertura
  const isKutzAsa = handleConfig?.model === 'kutz_asa';
  const pestanaMargin = 0.8;
  const effectivePestanaLen = Math.min(handleLenCm, Math.max(2, doorW - 1.6));
  const handleXPestana = isRightHinge
    ? (-doorW + pestanaMargin + effectivePestanaLen / 2)
    : (doorW - pestanaMargin - effectivePestanaLen / 2);

  // Para tiradores estándar (Madrid, Forza, Denver): centrados a 4.5 cm del canto de apertura
  // Para Kutz Asa Corrida: abarca el ancho total de la puerta (-hingeXOffset)
  const handleXStandard = isRightHinge ? -doorW + 4.5 : doorW - 4.5;
  const handleX = isKutzAsa ? -hingeXOffset : (isPestana ? handleXPestana : handleXStandard);

  // Posicionamiento vertical acotado paramétricamente para garantizar que NUNCA sobrepase la puerta
  let defaultHandleY = 0;
  if (isPestana) {
    // Al ras del canto superior (mueble bajo) o inferior (mueble aéreo)
    defaultHandleY = isUpperResolved ? -doorH / 2 : doorH / 2;
  } else if (doorH > 140) {
    // Puertas de despensero alto
    defaultHandleY = 0;
  } else if (isUpperResolved) {
    // Mueble aéreo: extremo inferior a 4.5 cm sobre el canto inferior
    const desiredCenter = -doorH / 2 + 4.5 + handleTotalLenCm / 2;
    const maxCenter = doorH / 2 - handleTotalLenCm / 2 - 1.5;
    defaultHandleY = Math.min(maxCenter, desiredCenter);
  } else {
    // Mueble bajo: extremo superior a 4.5 cm bajo el canto superior
    const desiredCenter = doorH / 2 - 4.5 - handleTotalLenCm / 2;
    const minCenter = -doorH / 2 + handleTotalLenCm / 2 + 1.5;
    defaultHandleY = Math.max(minCenter, desiredCenter);
  }

  // Si Gola está activo globalmente (aluminio o negro), se ocultan los tiradores en toda la cocina
  const isGolaBlocked = golaSystem !== 'none';
  const showHandle = !isGolaBlocked && handleConfig && handleConfig.model !== 'none';

  return (
    <group
      position={[position[0] + hingeXOffset, position[1], position[2] - thickness / 2]}
      ref={groupRef}
    >
      {/* Front Door Board */}
      <Board
        position={[-hingeXOffset, 0, thickness / 2]}
        args={[doorW, doorH, thickness]}
        {...colorProps}
        isFrontPanel={true}
        globalPosition={globalPosition}
      />

      {/* Tirador 3D */}
      {showHandle && (
        <group position={[handleX, defaultHandleY, thickness]}>
          <KitchenHandle3D
            config={handleConfig}
            orientation={isPestana ? 'horizontal' : 'vertical'}
            isDoor={true}
            isUpper={isUpperResolved}
            thickness={thickness}
            customLengthCm={isKutzAsa ? doorW : undefined}
          />
        </group>
      )}

      {/* Bisagras de Cazoleta (Euro Hinges 35mm) */}
      {hingeYs.map((y, idx) => (
        <group key={`hinge-${idx}`} position={[0, y, 0]}>
          {/* Base plate on side panel */}
          <mesh position={[hingeDir * 1.0, 0, -1.2]}>
            <boxGeometry args={[1.5, 2.5, 0.6]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Hinge arm */}
          <mesh position={[hingeDir * 1.6, 0, -0.4]}>
            <boxGeometry args={[2.8, 1.2, 0.4]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* 35mm cup on door inner face */}
          <mesh position={[hingeDir * 1.8, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.75, 1.75, 0.3, 16]} />
            <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function AnimatedBiFoldCornerLDoors({
  doorW,
  doorH,
  thickness,
  position,
  colorProps,
  forceOpen,
  onClickAction,
  safePos,
  isUpper,
  handleConfig: propHandleConfig,
}: {
  doorW: number;
  doorH: number;
  thickness: number;
  position: [number, number, number];
  colorProps: any;
  forceOpen?: boolean;
  onClickAction?: () => void;
  safePos: [number, number, number];
  isUpper?: boolean;
  handleConfig?: import('../../types/handle').KitchenHandleConfig;
}) {
  const door1Ref = useRef<THREE.Group>(null);
  const door2Ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // Puerta 1: anclada en el lateral derecho de la abertura.
    // Cerrada: 0 rad (cubre Face 1 en Z = 15).
    // Abierta: Gira hacia AFUERA / FRENTE (rotación positiva +Y) hacia el usuario (+Z).
    const targetRot1 = forceOpen ? Math.PI * 0.52 : 0;
    if (door1Ref.current) {
      door1Ref.current.rotation.y = THREE.MathUtils.lerp(door1Ref.current.rotation.y, targetRot1, delta * 5);
    }

    // Puerta 2: unida a Puerta 1 mediante bisagra bi-fold de rincón 135° en el vértice.
    // Cerrada: 0 rad (cubre Face 2 a escuadra de 90° en X = 15, extendiéndose a lo largo de +Z).
    // Abierta: Pliega hacia el frente solidaria a la Puerta 1 (-Math.PI * 0.48), quedando ambas proyectadas al frente exterior.
    const targetRot2 = forceOpen ? -Math.PI * 0.48 : 0;
    if (door2Ref.current) {
      door2Ref.current.rotation.y = THREE.MathUtils.lerp(door2Ref.current.rotation.y, targetRot2, delta * 5);
    }
  });

  const hingeYs = [-doorH / 2 + 12, doorH / 2 - 12];
  const { handleConfig: storeHandleConfig, golaSystem } = useKitchenStore();
  const handleConfig = propHandleConfig || storeHandleConfig;
  const isUpperCorner = isUpper !== undefined ? isUpper : ((safePos[1] + position[1]) > 135);
  const isPestana = handleConfig?.model === 'ce' || handleConfig?.model === 'oslo';

  const handleLenMm = handleConfig?.lengthMm ?? 128;
  const handleLenCm = handleLenMm / 10;
  const handleTotalLenCm = handleConfig?.model === 'madrid'
    ? (handleLenMm + 40) / 10
    : handleLenCm;

  const pestanaMargin = 0.8;
  const effectivePestanaLen = Math.min(handleLenCm, Math.max(2, doorW - 1.6));
  const handleCornerZ = isPestana
    ? (doorW - pestanaMargin - effectivePestanaLen / 2)
    : (doorW - 4.5);

  let handleCornerY = 0;
  if (isPestana) {
    handleCornerY = isUpperCorner ? -doorH / 2 : doorH / 2;
  } else if (doorH > 140) {
    handleCornerY = 0;
  } else if (isUpperCorner) {
    const desiredCenter = -doorH / 2 + 4.5 + handleTotalLenCm / 2;
    const maxCenter = doorH / 2 - handleTotalLenCm / 2 - 1.5;
    handleCornerY = Math.min(maxCenter, desiredCenter);
  } else {
    const desiredCenter = doorH / 2 - 4.5 - handleTotalLenCm / 2;
    const minCenter = -doorH / 2 + handleTotalLenCm / 2 + 1.5;
    handleCornerY = Math.max(minCenter, desiredCenter);
  }

  const isGolaBlocked = golaSystem !== 'none';
  const showHandle = !isGolaBlocked && handleConfig && handleConfig.model !== 'none';

  return (
    <group
      position={position}
    >
      {/* Grupo Articulado Hoja 1 (Pivote en Lateral Derecho) */}
      <group ref={door1Ref}>
        {/* Tablero Puerta 1 */}
        <Board
          position={[-doorW / 2, 0, 0]}
          args={[doorW, doorH, thickness]}
          {...colorProps}
          isFrontPanel={true}
          globalPosition={[safePos[0] + position[0] - doorW / 2, safePos[1] + position[1], safePos[2] + position[2]]}
        />

        {/* Bisagras Blum 170° gran apertura en lateral */}
        {hingeYs.map((hy, idx) => (
          <group key={`hinge-base-${idx}`} position={[0, hy, 0]}>
            <mesh position={[0.8, 0, -thickness / 2 - 0.4]}>
              <boxGeometry args={[1.6, 2.8, 0.6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 1.8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Grupo Articulado Hoja 2 (Bisagra de Rincón 135° Blum en la esquina) */}
        <group position={[-doorW, 0, 0]}>
          {/* Herraje Bisagra Bi-Fold de rincón en la unión entre hojas */}
          {hingeYs.map((hy, idx) => (
            <group key={`hinge-bifold-${idx}`} position={[0, hy, 0]}>
              <mesh position={[0.2, 0, -thickness / 2]}>
                <boxGeometry args={[1.2, 2.4, 0.5]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 1.6]} />
                <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}

          <group ref={door2Ref}>
            {/* Tablero Puerta 2 */}
            <Board
              position={[thickness / 2, 0, doorW / 2]}
              args={[thickness, doorH, doorW]}
              {...colorProps}
              isFrontPanel={true}
              globalPosition={[safePos[0] + position[0] - doorW, safePos[1] + position[1], safePos[2] + position[2] + doorW / 2]}
            />
            {showHandle && (
              <group position={[thickness + 0.1, handleCornerY, handleCornerZ]} rotation={[0, Math.PI / 2, 0]}>
                <KitchenHandle3D
                  config={handleConfig}
                  orientation={isPestana ? 'horizontal' : 'vertical'}
                  isDoor={true}
                  isUpper={isUpperCorner}
                  thickness={thickness}
                />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

export function AnimatedLiftUpDoor({
  doorW,
  doorH,
  thickness,
  position,
  colorProps,
  forceOpen,
  onClickAction,
  globalPosition,
  innerDepth = 30,
  handleConfig: propHandleConfig,
}: {
  doorW: number;
  doorH: number;
  thickness: number;
  position: [number, number, number];
  colorProps: any;
  forceOpen?: boolean;
  onClickAction?: () => void;
  globalPosition?: [number, number, number];
  innerDepth?: number;
  handleConfig?: import('../../types/handle').KitchenHandleConfig;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetRotation = forceOpen ? -Math.PI * 0.45 : 0;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation, delta * 4);
    }
  });

  const topHingeY = doorH / 2;
  const { handleConfig: storeHandleConfig, golaSystem } = useKitchenStore();
  const handleConfig = propHandleConfig || storeHandleConfig;
  const isPestana = handleConfig?.model === 'ce' || handleConfig?.model === 'oslo';
  const isGolaBlocked = golaSystem !== 'none';
  const showHandle = !isGolaBlocked && handleConfig && handleConfig.model !== 'none';

  return (
    <group
      position={[position[0], position[1] + topHingeY, position[2] - thickness / 2]}
      ref={groupRef}
    >
      {/* Front Door Board */}
      <Board
        position={[0, -topHingeY, thickness / 2]}
        args={[doorW, doorH, thickness]}
        {...colorProps}
        isFrontPanel={true}
        globalPosition={globalPosition}
      />

      {/* Tirador 3D */}
      {showHandle && (
        <group position={[0, -doorH + (isPestana ? 0 : 4.0), thickness]}>
          <KitchenHandle3D
            config={handleConfig}
            orientation="horizontal"
            isDoor={true}
            isUpper={true}
            thickness={thickness}
          />
        </group>
      )}

      {/* Bisagras Superiores / Herrajes Elevadores Aventos / Pistones a Gas */}
      {[-doorW / 2 + 5, doorW / 2 - 5].map((x, idx) => (
        <group key={`top-hinge-${idx}`} position={[x, 0, 0]}>
          {/* Base de fijación superior */}
          <mesh position={[0, -0.6, -1.2]}>
            <boxGeometry args={[1.8, 1.2, 1.6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Brazo elevador cilíndrico / pistón */}
          <mesh position={[0, -doorH * 0.35, -0.6]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, doorH * 0.55, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -doorH * 0.2, -0.4]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, doorH * 0.35, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function HoodFDVConic90({ width = 89.8, height = 70, depth = 50 }: { width?: number; height?: number; depth?: number }) {
  // Dimensiones según Ficha Técnica FDV New Conic 90 780M3H (SAP 16309):
  // Ancho 898mm (89.8cm), Fondo 500mm (50.0cm), Alto Cuerpo Piramidal 275mm (27.5cm)
  // Labio perimetral inferior 40mm (4.0cm), Chimenea Telescópica 219mm x 182mm (21.9 x 18.2 cm)
  const bodyW = width;
  const bodyD = depth;
  const bodyH = 27.5;
  const lipH = 4.0;
  const chimneyW = 21.9;
  const chimneyD = 18.2;
  const chimneyH = Math.max(18, height - bodyH);

  const topW = chimneyW + 1.6;
  const topD = chimneyD + 1.4;

  // Geometría paramétrica del cuerpo cónico / piramidal truncado exacto
  const pyramidGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    const v = {
      bl_bot: [-bodyW / 2, lipH, -bodyD / 2],
      br_bot: [bodyW / 2, lipH, -bodyD / 2],
      fr_bot: [bodyW / 2, lipH, bodyD / 2],
      fl_bot: [-bodyW / 2, lipH, bodyD / 2],
      bl_top: [-topW / 2, bodyH, -bodyD / 2],
      br_top: [topW / 2, bodyH, -bodyD / 2],
      fr_top: [topW / 2, bodyH, -bodyD / 2 + topD],
      fl_top: [-topW / 2, bodyH, -bodyD / 2 + topD],
    };

    const positions: number[] = [];

    // Función auxiliar para agregar cuadrilátero con normales precisas
    const addQuad = (p1: number[], p2: number[], p3: number[], p4: number[]) => {
      positions.push(...p1, ...p2, ...p3);
      positions.push(...p1, ...p3, ...p4);
    };

    // 1. Cara Frontal Inclinada hacia atrás
    addQuad(v.fl_bot, v.fr_bot, v.fr_top, v.fl_top);
    // 2. Cara Lateral Derecha Inclinada hacia el centro
    addQuad(v.fr_bot, v.br_bot, v.br_top, v.fr_top);
    // 3. Cara Posterior Vertical (apoyada contra la pared)
    addQuad(v.br_bot, v.bl_bot, v.bl_top, v.br_top);
    // 4. Cara Lateral Izquierda Inclinada hacia el centro
    addQuad(v.bl_bot, v.fl_bot, v.fl_top, v.bl_top);
    // 5. Cubierta Superior que abraza la base de la chimenea
    addQuad(v.bl_top, v.fl_top, v.fr_top, v.br_top);

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }, [bodyW, bodyD, bodyH, lipH, topW, topD]);

  return (
    <group position={[0, -height / 2, 0]}>
      {/* 1. Labio inferior perimetral (Frente vertical de acero inoxidable de 4cm) */}
      <mesh position={[0, lipH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, lipH, bodyD]} />
        <meshStandardMaterial color="#d0d5da" metalness={0.32} roughness={0.4} />
      </mesh>

      {/* Bisel inferior decorativo */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[bodyW + 0.2, 0.2, bodyD + 0.2]} />
        <meshStandardMaterial color="#c0c5cb" metalness={0.3} roughness={0.38} />
      </mesh>

      {/* 2. Cuerpo Piramidal de Acero Inoxidable (Tronco de pirámide continuo) */}
      <mesh geometry={pyramidGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#d0d5da" metalness={0.32} roughness={0.4} />
      </mesh>

      {/* 3. Panel de Control Frontal (Pulsadores / Touch Soft-Touch y display) */}
      <group position={[0, lipH / 2, bodyD / 2 + 0.05]}>
        <mesh>
          <planeGeometry args={[bodyW * 0.42, lipH * 0.65]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Marca FDV sutil */}
        <Text
          position={[-bodyW * 0.14, 0, 0.02]}
          fontSize={1.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          FDV
        </Text>

        {/* Botones de control (Luz, V1, V2, V3, Power) */}
        {[-3.6, -1.8, 0, 1.8, 3.6].map((x, i) => (
          <group key={`btn-${i}`} position={[x + 4.5, 0, 0.02]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <circleGeometry args={[0.22, 16]} />
              <meshStandardMaterial
                color={i === 2 ? '#38bdf8' : '#ffffff'}
                emissive={i === 2 ? '#0284c7' : '#475569'}
                emissiveIntensity={i === 2 ? 0.9 : 0.3}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. Base Inferior: Filtros de Aluminio Multicapa Modulares con pestillos */}
      {[-bodyW / 3 + 3, 0, bodyW / 3 - 3].map((x, idx) => (
        <group key={`filter-${idx}`} position={[x, 0.1, 0]}>
          {/* Marco perimetral del filtro */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bodyW / 3.4, bodyD - 5]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Malla multicapa de aluminio */}
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bodyW / 3.65, bodyD - 7]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.4} />
          </mesh>
          {/* Pestillo ergonómico de liberación rápida */}
          <mesh position={[0, -0.1, -bodyD / 2 + 6]}>
            <boxGeometry args={[3.2, 0.4, 1.6]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* 5. Iluminación LED Inferior (2 x LED 2W Spots cálidos) */}
      {[-bodyW / 3 + 2, bodyW / 3 - 2].map((x, idx) => (
        <group key={`led-${idx}`} position={[x, -0.1, -bodyD / 2 + 4.5]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.3, 20]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.15, 20]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.95} />
          </mesh>
        </group>
      ))}

      {/* 6. Chimenea Telescópica de Acero Inoxidable (Tramo inferior + tramo superior extensible) */}
      <group position={[0, bodyH, -bodyD / 2 + chimneyD / 2]}>
        {/* Tramo inferior de chimenea */}
        <mesh position={[0, (chimneyH * 0.55) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[chimneyW, chimneyH * 0.55, chimneyD]} />
          <meshStandardMaterial color="#d0d5da" metalness={0.32} roughness={0.4} />
        </mesh>

        {/* Tramo superior telescópico deslizable */}
        <mesh position={[0, chimneyH * 0.5 + (chimneyH * 0.5) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[chimneyW - 0.2, chimneyH * 0.5, chimneyD - 0.1]} />
          <meshStandardMaterial color="#d0d5da" metalness={0.32} roughness={0.4} />
        </mesh>

        {/* Junta / Collarín decorativo entre tramos */}
        <mesh position={[0, chimneyH * 0.52, 0]}>
          <boxGeometry args={[chimneyW + 0.4, 1.2, chimneyD + 0.3]} />
          <meshStandardMaterial color="#b0b6bc" metalness={0.3} roughness={0.38} />
        </mesh>

        {/* Rejillas de ventilación lateral y frontal superiores */}
        <mesh position={[0, chimneyH - 3.5, chimneyD / 2 + 0.05]}>
          <planeGeometry args={[chimneyW * 0.72, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[-chimneyW / 2 - 0.05, chimneyH - 3.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[chimneyD * 0.6, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[chimneyW / 2 + 0.05, chimneyH - 3.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[chimneyD * 0.6, 2.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

export function BuiltInOven({ width, height, depth }: { width: number; height: number; depth: number }) {
  return (
    <group position={[0, 0, depth / 2]}>
      {/* Horno Carcasa Interior Insertable */}
      <mesh position={[0, 0, -depth / 2 + 1]}>
        <boxGeometry args={[width - 1.0, height - 1.0, depth - 2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>

      {/* Marco Exterior Inox Frontal */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[width, height, 1.2]} />
        <meshStandardMaterial color="#b5bac1" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Cristal Frontal Templado Negro */}
      <mesh position={[0, -height * 0.12, 0.9]}>
        <boxGeometry args={[width - 3.5, height * 0.65, 0.3]} />
        <meshStandardMaterial color="#080808" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Visor de Cristal Interior con Parrilla */}
      <mesh position={[0, -height * 0.12, 0.92]}>
        <boxGeometry args={[width - 8, height * 0.45, 0.2]} />
        <meshStandardMaterial color="#1c1917" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -height * 0.14, 0.93]}>
        <boxGeometry args={[width - 12, 1.2, 0.2]} />
        <meshStandardMaterial color="#cccccc" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Panel Superior Digital de Control */}
      <mesh position={[0, height / 2 - (height * 0.22) / 2 - 1.0, 0.9]}>
        <boxGeometry args={[width - 3.5, height * 0.20, 0.3]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Pantalla Display LED Naranja / Reloj */}
      <mesh position={[0, height / 2 - (height * 0.22) / 2 - 1.0, 1.1]}>
        <boxGeometry args={[14, 4, 0.1]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Dígitos luminosos LED */}
      <mesh position={[-2.4, height / 2 - (height * 0.22) / 2 - 1.0, 1.16]}>
        <boxGeometry args={[4.2, 1.8, 0.05]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[2.8, height / 2 - (height * 0.22) / 2 - 1.0, 1.16]}>
        <boxGeometry args={[3.6, 1.8, 0.05]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Diales Giratorios Metálicos */}
      <mesh position={[-width / 2 + 6, height / 2 - (height * 0.22) / 2 - 1.0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 1.0, 24]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[width / 2 - 6, height / 2 - (height * 0.22) / 2 - 1.0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 1.0, 24]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Tirador Frontal Horizontal Inox */}
      <mesh position={[0, height / 2 - height * 0.28, 2.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, width - 8, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.15} />
      </mesh>
      <mesh position={[-width / 2 + 6, height / 2 - height * 0.28, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[width / 2 - 6, height / 2 - height * 0.28, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function BuiltInMicrowave({ width, height, depth }: { width: number; height: number; depth: number }) {
  return (
    <group position={[0, 0, depth / 2]}>
      {/* Cuerpo Inserción */}
      <mesh position={[0, 0, -depth / 2 + 1]}>
        <boxGeometry args={[width - 1.0, height - 1.0, depth - 2]} />
        <meshStandardMaterial color="#18181b" roughness={0.7} />
      </mesh>

      {/* Marco Trim Kit Inox Frontal */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[width, height, 1.0]} />
        <meshStandardMaterial color="#b5bac1" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Puerta de Cristal Oscuro */}
      <mesh position={[-width * 0.12, 0, 0.9]}>
        <boxGeometry args={[width * 0.68, height - 3.5, 0.3]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.92} roughness={0.1} />
      </mesh>

      {/* Panel Táctil Lateral */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, 0, 0.9]}>
        <boxGeometry args={[width * 0.20, height - 3.5, 0.3]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Display LED Microondas */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, height / 2 - 5, 1.1]}>
        <boxGeometry args={[8, 3.2, 0.1]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, height / 2 - 5, 1.16]}>
        <boxGeometry args={[5.2, 1.8, 0.05]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Botón Pulsador de Apertura */}
      <mesh position={[width / 2 - (width * 0.22) / 2 - 1.2, -height / 2 + 4.5, 1.2]}>
        <boxGeometry args={[7, 3, 0.4]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function PortableMicrowave({ width, height, depth }: { width: number; height: number; depth: number }) {
  const mwWidth = Math.min(48, width - 4);
  const mwHeight = 28;
  const mwDepth = 36;
  return (
    <group position={[0, mwHeight / 2 + 0.6, 0]}>
      {/* 4 Patitas de Goma Antideslizantes */}
      {[-mwWidth / 2 + 3, mwWidth / 2 - 3].map((px) =>
        [-mwDepth / 2 + 3, mwDepth / 2 - 3].map((pz) => (
          <mesh key={`foot-${px}-${pz}`} position={[px, -mwHeight / 2 - 0.3, pz]}>
            <cylinderGeometry args={[1.0, 1.0, 0.6, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Chasis Principal Metálico de Sobremesa */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[mwWidth, mwHeight, mwDepth]} />
        <meshStandardMaterial color="#27272a" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Rejilla de Ventilación Lateral */}
      <mesh position={[-mwWidth / 2 - 0.1, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[12, 18]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Marco Frontal */}
      <mesh position={[0, 0, mwDepth / 2 + 0.2]}>
        <boxGeometry args={[mwWidth - 0.8, mwHeight - 0.8, 0.6]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Ventana de Cristal Templado de Puerta */}
      <mesh position={[-mwWidth * 0.14, 0, mwDepth / 2 + 0.6]}>
        <boxGeometry args={[mwWidth * 0.64, mwHeight - 4, 0.3]} />
        <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Plato Giratorio Interior visible */}
      <mesh position={[-mwWidth * 0.14, -mwHeight / 2 + 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[10, 10, 0.4, 24]} />
        <meshStandardMaterial color="#e4e4e7" transparent opacity={0.6} roughness={0.2} />
      </mesh>

      {/* Tirador Vertical de la Puerta */}
      <mesh position={[-mwWidth * 0.14 + (mwWidth * 0.64) / 2 - 2, 0, mwDepth / 2 + 1.8]}>
        <cylinderGeometry args={[0.4, 0.4, mwHeight - 10, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Panel de Control Lateral Derecho */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, 0, mwDepth / 2 + 0.6]}>
        <boxGeometry args={[mwWidth * 0.22, mwHeight - 4, 0.3]} />
        <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Display LED */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, mwHeight / 2 - 4.5, mwDepth / 2 + 0.8]}>
        <boxGeometry args={[6.5, 2.8, 0.1]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, mwHeight / 2 - 4.5, mwDepth / 2 + 0.86]}>
        <boxGeometry args={[4.2, 1.6, 0.05]} />
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Dial Giratorio Cromado */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, -1, mwDepth / 2 + 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.8, 20]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Botones de Inicio / Parada */}
      <mesh position={[mwWidth / 2 - (mwWidth * 0.24) / 2 - 1.2, -mwHeight / 2 + 5, mwDepth / 2 + 0.8]}>
        <boxGeometry args={[5.5, 2.0, 0.2]} />
        <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

interface CabinetProps extends CabinetType {
  index?: number;
}

export function Cabinet({ id, type, variant, width, height, depth, position, rotation, color, structureColor, doorColor, drawerFrontColor, drawerInnerColor, shelfColor, backColor, socleColor, structureMaterial, doorMaterial, drawerFrontMaterial, drawerInnerMaterial, shelfMaterial, backMaterial, socleMaterial, grainDirection, grainElements, hplBalancer, isOpen, openElements, index, shelvesCount, shelvesCountLower, shelvesCountUpper, handleConfig: propHandleConfig, leftCoverPanel, rightCoverPanel }: CabinetProps) {
   const { activeCabinetId, setActiveCabinet, setDraggingCabinetId, setToolMode, showSocle, socleHeight, cabinets, viewMode, golaSystem, countertopConfig, qstoneCatalog, setOpenElement, handleConfig: storeHandleConfig, projectMode, hospitalBaseType } = useKitchenStore();
   const handleConfig = propHandleConfig || storeHandleConfig;

   // Sanitización estricta: Piedras y cuarzos Qstone aplican ÚNICAMENTE a la cubierta.
   // Si por error se asignó una textura de piedra a un gabinete, revertir al color base de melamina.
   const isStoneUrl = (u?: string) => {
     if (!u) return false;
     return qstoneCatalog?.some((q) => q.textureUrl === u || q.id === u || (q.colorHex === u && !u.startsWith('#')));
   };

   const safeStructureColor = isStoneUrl(structureColor) ? undefined : structureColor;
   const safeDoorColor = isStoneUrl(doorColor) ? undefined : doorColor;
   const safeDrawerFrontColor = isStoneUrl(drawerFrontColor) ? undefined : drawerFrontColor;
   const safeColor = isStoneUrl(color) ? undefined : color;

   const cStructure = safeStructureColor || safeColor || '#f8fafc';
   const cDoors = safeDoorColor || safeColor || '#f8fafc';
   const cDrawers = safeDrawerFrontColor || safeColor || '#f8fafc';
   const cInner = drawerInnerColor || safeColor || '#f8fafc';
   const cBack = backColor || safeColor || '#f8fafc';
   const cSocle = socleColor || '#111';
   const cabinetIndex = typeof index === 'number' ? index : cabinets.findIndex((c) => c.id === id);
   const isBaseOrIsland = type === 'base' || type === 'island';
   const isGolaActive = (golaSystem === 'aluminum' || golaSystem === 'black') && isBaseOrIsland;
   const golaColor = golaSystem === 'black' ? '#18181b' : '#e2e8f0';
   const golaMetalness = golaSystem === 'black' ? 0.25 : 0.45;
   const golaRoughness = golaSystem === 'black' ? 0.70 : 0.28;

   // Cálculo paramétrico de regrueso y holgura de faldón de cubierta
   const activeProduct = countertopConfig?.enabled && isBaseOrIsland
      ? (qstoneCatalog?.find((p) => p.id === countertopConfig.selectedProductId) || qstoneCatalog?.[0])
      : null;
   const stoneThicknessCm = (activeProduct?.thicknessMm || 20) / 10;
   const rawRegruesoCm = (countertopConfig?.enabled && isBaseOrIsland) ? (countertopConfig.regruesoCm || 0) : 0;
   const regruesoDeduct = isGolaActive
      ? Math.max(0, rawRegruesoCm - 3.5)
      : (rawRegruesoCm > 0 ? (Math.max(0, rawRegruesoCm - stoneThicknessCm) + (rawRegruesoCm > stoneThicknessCm ? 0.3 : 0)) : 0);
   const showDimensions = useStore((s) => s.showDimensions);
   const dimensionLevel = useStore((s) => s.dimensionLevel);
   const isGolaGloballyActive = golaSystem === 'aluminum' || golaSystem === 'black';
   const showHandle = !isGolaGloballyActive && handleConfig && handleConfig.model !== 'none';
   const isPestanaHandle = handleConfig?.model === 'ce' || handleConfig?.model === 'oslo' || handleConfig?.model === 'kutz_asa';
   const isActive = activeCabinetId === id;
   const is2D = viewMode === '2d';

   const isElementOpen = (key: string) => {
      return openElements?.[key] ?? isOpen ?? false;
   };

   // Criterio Planimétrico BIM: Detección de extremos libres de fila / batería
   const safeRot = Number(rotation) || 0;
   const safePos: [number, number, number] = [
      Number(position?.[0]) || 0,
      Number(position?.[1]) || 0,
      Number(position?.[2]) || 0,
   ];
   const cos = Math.cos(safeRot);
   const sin = Math.sin(safeRot);

   const leftFlankWorld: [number, number] = [
      safePos[0] + (-width / 2) * cos,
      safePos[2] - (-width / 2) * sin,
   ];
   const rightFlankWorld: [number, number] = [
      safePos[0] + (width / 2) * cos,
      safePos[2] - (width / 2) * sin,
   ];

   const isFloorCabinet = type !== 'wall';

   const leftNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false; // distinto nivel (piso vs aéreo)
      const cSafeRot = Number(c.rotation) || 0;
      const cCos = Math.cos(cSafeRot);
      const cSin = Math.sin(cSafeRot);
      const cPos = c.position || [0, 0, 0];
      const cRight: [number, number] = [
         cPos[0] + (c.width / 2) * cCos,
         cPos[2] - (c.width / 2) * cSin,
      ];
      const cLeft: [number, number] = [
         cPos[0] + (-c.width / 2) * cCos,
         cPos[2] - (-c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(leftFlankWorld[0] - cRight[0], leftFlankWorld[1] - cRight[1]);
      const d2 = Math.hypot(leftFlankWorld[0] - cLeft[0], leftFlankWorld[1] - cLeft[1]);
      const dCorner = Math.hypot(leftFlankWorld[0] - cPos[0], leftFlankWorld[1] - cPos[2]);
      return d1 < 5 || d2 < 5 || dCorner < (c.width / 2 + 5);
   });

   const rightNeighbor = cabinets.find((c) => {
      if (c.id === id) return false;
      const cIsFloor = c.type !== 'wall';
      if (isFloorCabinet !== cIsFloor) return false;
      const cSafeRot = Number(c.rotation) || 0;
      const cCos = Math.cos(cSafeRot);
      const cSin = Math.sin(cSafeRot);
      const cPos = c.position || [0, 0, 0];
      const cLeft: [number, number] = [
         cPos[0] + (-c.width / 2) * cCos,
         cPos[2] - (-c.width / 2) * cSin,
      ];
      const cRight: [number, number] = [
         cPos[0] + (c.width / 2) * cCos,
         cPos[2] - (c.width / 2) * cSin,
      ];
      const d1 = Math.hypot(rightFlankWorld[0] - cLeft[0], rightFlankWorld[1] - cLeft[1]);
      const d2 = Math.hypot(rightFlankWorld[0] - cRight[0], rightFlankWorld[1] - cRight[1]);
      const dCorner = Math.hypot(rightFlankWorld[0] - cPos[0], rightFlankWorld[1] - cPos[2]);
      return d1 < 5 || d2 < 5 || dCorner < (c.width / 2 + 5);
   });

   const hasNeighborLeft = Boolean(leftNeighbor);
   const hasNeighborRight = Boolean(rightNeighbor);

   // Cota de alto: Se dibuja únicamente en el extremo izquierdo libre, o en el extremo derecho si el izquierdo está tapado, o cuando está seleccionado
   const showHeightDimension = (!leftNeighbor) || isActive || (leftNeighbor && height > leftNeighbor.height + 5);

   // Cota de profundidad: Se dibuja únicamente en el extremo exterior libre derecho (o cuando está seleccionado)
   const showDepthDimension = (!rightNeighbor) || isActive;

   const getPieceGrain = (key: string) => {
      return grainElements?.[key] ?? grainDirection ?? 'vertical';
   };

   const parseColor = (val: string, mat?: 'melamina' | 'hpl', grainKey?: string) => {
      const isTex = !val.startsWith('#');
      return {
         color: isTex ? '#ffffff' : val,
         textureUrl: isTex ? val : undefined,
         materialType: mat,
         grainDirection: grainKey ? getPieceGrain(grainKey) : grainDirection,
         hplBalancerOverride: hplBalancer
      };
   };

   const thickness = 1.5;

   const isWhiteDrawerFinish = (c?: string) => {
      if (!c) return true;
      const lower = c.toLowerCase().trim();
      return (
         lower === '#ffffff' ||
         lower === '#fff' ||
         lower === '#f8fafc' ||
         lower === '#f3f4f6' ||
         lower === '#e5e7eb' ||
         lower === '#dddddd' ||
         lower === 'white' ||
         lower === 'blanco' ||
         lower.includes('blanco') ||
         lower.includes('white')
      );
   };

   const drawerBottomThick = thickness;
   const drawerBottomProps = parseColor(cInner, drawerInnerMaterial);

   // Riel Gola Continuo (Provelcar 300cm):
   // Pasa continuo a lo ancho completo del gabinete (-width/2 a +width/2) alojándose perfectamente
   // en los rebajes CNC de los laterales sin interrupciones ni desfaces visuales.
   const golaSpan = width;
   const golaCenterX = 0;

   const isBaseOrTall = type === 'base' || type === 'tall' || type === 'island';
   const legsHeight = isBaseOrTall ? (socleHeight ?? 10) : 0;
   const cabH = height - legsHeight;
   const innerW = width - (thickness * 2);
   const gap = 0.3; // 3mm de cantería
   const isKutzAsaGlobal = handleConfig?.model === 'kutz_asa';
   const kutzGapY = isKutzAsaGlobal ? 1.0 : gap; // 10mm de luz entre frentes para asa corrida
   const faldonDrop = (countertopConfig?.enabled && isBaseOrIsland) ? Math.max(0, rawRegruesoCm - stoneThicknessCm) : 0;
   const kutzTopDeduct = (isBaseOrIsland && isKutzAsaGlobal)
      ? (faldonDrop + 3.2)
      : (isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0));
   const frontZ = depth/2 + thickness/2;
   const effectiveVariant = variant || (width > 60 ? '2_doors' : '1_door');

   const renderParametricBody = () => {
      // 1. Renderizado de Elementos de Decoración & Electrodomésticos Especializados
      if (type === 'decoration' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_hood' || variant === 'deco_plant' || variant === 'deco_dishwasher') {
         if (variant === 'deco_stove') {
            return <StoveFDVUnique90 width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_fridge') {
            return <FridgeFDVSignatureSBS width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_hood') {
            return <HoodFDVConic90 width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_plant') {
            return <PlantDecoration width={width} height={height} depth={depth} />;
         }
         if (variant === 'deco_dishwasher') {
            return <DishwasherFDVActive12C width={width} height={height} depth={depth} />;
         }
      }

      const renderCoverPanels = () => {
         const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
         const hasFronts = !isWineRack && variant !== 'open' && variant !== 'tall_open' && variant !== 'wall_open';
         const coverDepth = (hasFronts || isWineRack) ? depth + thickness : depth;
         const coverZ = (hasFronts || isWineRack) ? thickness / 2 : 0;

         return (
            <>
               {leftCoverPanel?.enabled && (() => {
                  const coverThick = leftCoverPanel.thickness || thickness;
                  const coverExtend = leftCoverPanel.extendToFloor && isBaseOrTall;
                  const coverH = coverExtend ? height : cabH;
                  const coverY = coverExtend ? height / 2 : legsHeight + cabH / 2;
                  const coverColor = leftCoverPanel.color || cDoors;
                  const coverMat = leftCoverPanel.material || doorMaterial;
                  const effectiveCoverDepth = leftCoverPanel.depth || coverDepth;
                  const effectiveCoverZ = leftCoverPanel.depth 
                     ? ((depth / 2 + ((hasFronts || isWineRack) ? thickness : 0)) - effectiveCoverDepth / 2) 
                     : coverZ;
                  const xPos = -width / 2 - coverThick / 2;
                  return (
                     <Board
                        key="cover-panel-left"
                        position={[xPos, coverY, effectiveCoverZ]}
                        args={[coverThick, coverH, effectiveCoverDepth]}
                        {...parseColor(coverColor, coverMat, 'leftCover')}
                     />
                  );
               })()}
               {rightCoverPanel?.enabled && (() => {
                  const coverThick = rightCoverPanel.thickness || thickness;
                  const coverExtend = rightCoverPanel.extendToFloor && isBaseOrTall;
                  const coverH = coverExtend ? height : cabH;
                  const coverY = coverExtend ? height / 2 : legsHeight + cabH / 2;
                  const coverColor = rightCoverPanel.color || cDoors;
                  const coverMat = rightCoverPanel.material || doorMaterial;
                  const effectiveCoverDepth = rightCoverPanel.depth || coverDepth;
                  const effectiveCoverZ = rightCoverPanel.depth 
                     ? ((depth / 2 + ((hasFronts || isWineRack) ? thickness : 0)) - effectiveCoverDepth / 2) 
                     : coverZ;
                  const xPos = width / 2 + coverThick / 2;
                  return (
                     <Board
                        key="cover-panel-right"
                        position={[xPos, coverY, effectiveCoverZ]}
                        args={[coverThick, coverH, effectiveCoverDepth]}
                        {...parseColor(coverColor, coverMat, 'rightCover')}
                     />
                  );
               })()}
            </>
         );
      };

      const renderFronts = () => {
         if (variant === 'open') return null;
         
          const renderUndermountDrawer = (keyPrefix: string, yPos: number, drawerH: number, colorProps: any, drawerKey = 'drawer-0') => {
            const innerDepthMm = (depth - 1.5) * 10;
            const nominalLength = getNominalSlideLength(innerDepthMm) / 10; // cm
            const drawerBoxLength = nominalLength - 1.0; // SKL = NL - 10mm
            
            const drawerBoxZCenter = depth/2 - drawerBoxLength/2;
            const slideZCenter = depth/2 - nominalLength/2;
            
            // SKW = LW - 49mm (PDF spec)
            const skw = innerW - 4.9; 
            const sideHeight = Math.max(10, drawerH - 3);
            const yBoxCenter = yPos;
            const yBoxBottom = yBoxCenter - sideHeight/2;
            const yBottomPanel = yBoxBottom + 1.2;
            
            const slideH = 3.5;
            const ySlide = yBoxCenter - sideHeight * 0.1;
            
            return (
               <group key={keyPrefix}>
                  {/* Rieles Telescópicos Fijos (Adosados a los laterales interiores del mueble) */}
                  <mesh position={[-innerW/2 + 0.45, ySlide, slideZCenter]}>
                     <boxGeometry args={[0.55, slideH, nominalLength]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
                  </mesh>
                  <mesh position={[innerW/2 - 0.45, ySlide, slideZCenter]}>
                     <boxGeometry args={[0.55, slideH, nominalLength]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
                  </mesh>

                  <AnimatedDrawer 
                     openZOffset={drawerBoxLength - 3} 
                     forceOpen={isElementOpen(drawerKey)}
                     onClickAction={() => setOpenElement(id, drawerKey, !isElementOpen(drawerKey))}
                  >
                     {/* Drawer Front */}
                     <Board position={[0, yBoxCenter, frontZ]} args={[width - gap*2, drawerH, thickness]} {...colorProps} isFrontPanel={true} globalPosition={[position[0] + 0, position[1] + yBoxCenter, position[2] + frontZ]} />

                     {/* Tirador Cajón 3D */}
                     {showHandle && (
                       <group position={[0, yBoxCenter + (isPestanaHandle ? drawerH / 2 : (drawerH > 22 ? drawerH * 0.15 : 0)), frontZ + thickness / 2]}>
                         <KitchenHandle3D 
                           config={handleConfig} 
                           orientation="horizontal" 
                           isUpper={false} 
                           thickness={thickness}
                           customLengthCm={handleConfig?.model === 'kutz_asa' ? (width - gap * 2) : undefined}
                         />
                       </group>
                     )}
                     
                     {/* Drawer Box (Sides, Back, Front Contrafrente, Bottom) */}
                     <Board position={[-skw/2 + thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[skw/2 - thickness/2, yBoxCenter, drawerBoxZCenter]} args={[thickness, sideHeight, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[0, yBoxCenter + 0.6, drawerBoxZCenter - drawerBoxLength/2 + thickness/2]} args={[skw - thickness*2, sideHeight - 1.2, thickness]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[0, yBoxCenter + 0.6, drawerBoxZCenter + drawerBoxLength/2 - thickness/2]} args={[skw - thickness*2, sideHeight - 1.2, thickness]} {...parseColor(cInner, drawerInnerMaterial)} />
                     <Board position={[0, yBottomPanel + drawerBottomThick / 2, drawerBoxZCenter]} args={[skw - thickness*2, drawerBottomThick, drawerBoxLength - thickness*2]} {...drawerBottomProps} />
                     
                     {/* Uniones del Cajón a la Trasera y al Contrafrente */}
                     <AssemblyJoint position={[-skw/2 + thickness, yBoxCenter, drawerBoxZCenter - drawerBoxLength/2 + thickness]} length={sideHeight} axis="y" pointing="right" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />
                     <AssemblyJoint position={[skw/2 - thickness, yBoxCenter, drawerBoxZCenter - drawerBoxLength/2 + thickness]} length={sideHeight} axis="y" pointing="left" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />
                     <AssemblyJoint position={[-skw/2 + thickness, yBoxCenter, drawerBoxZCenter + drawerBoxLength/2 - thickness]} length={sideHeight} axis="y" pointing="right" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />
                     <AssemblyJoint position={[skw/2 - thickness, yBoxCenter, drawerBoxZCenter + drawerBoxLength/2 - thickness]} length={sideHeight} axis="y" pointing="left" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />

                     {/* Rieles Telescópicos Móviles (Solidarios al costado exterior del cajón) */}
                     <group position={[-skw/2 - 0.35, ySlide, drawerBoxZCenter]}>
                        <mesh position={[0, 0, 0]}>
                           <boxGeometry args={[0.45, slideH - 0.8, drawerBoxLength]} />
                           <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
                        </mesh>
                        <mesh position={[-0.05, 0, 0]}>
                           <boxGeometry args={[0.2, 0.5, drawerBoxLength]} />
                           <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
                        </mesh>
                     </group>
                     <group position={[skw/2 + 0.35, ySlide, drawerBoxZCenter]}>
                        <mesh position={[0, 0, 0]}>
                           <boxGeometry args={[0.45, slideH - 0.8, drawerBoxLength]} />
                           <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
                        </mesh>
                        <mesh position={[0.05, 0, 0]}>
                           <boxGeometry args={[0.2, 0.5, drawerBoxLength]} />
                           <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
                        </mesh>
                     </group>
                  </AnimatedDrawer>
               </group>
            );
         };

         const renderSinkUDrawer = (yPos: number, drawerH: number, colorProps: any, drawerKey = 'drawer-0') => {
            const innerDepthMm = (depth - 1.5) * 10;
            const nominalLength = getNominalSlideLength(innerDepthMm) / 10; // cm
            const drawerBoxLength = nominalLength - 1.0;
            const drawerBoxZCenter = depth / 2 - drawerBoxLength / 2;
            const slideZCenter = depth / 2 - nominalLength / 2;
            const skw = innerW - 4.9;
            const sideHeight = Math.max(10, drawerH - 4);
            const yBoxCenter = yPos;
            const yBoxBottom = yBoxCenter - sideHeight / 2;
            const yBottomPanel = yBoxBottom + 1.2;

            // Dimensiones del calado central en U para salvar el sifón sanitario
            const uCutoutW = Math.min(32, Math.max(22, width * 0.32));
            const wingW = (skw - uCutoutW) / 2;
            const uCutoutLength = Math.max(16, drawerBoxLength - 12);
            const frontBandLength = drawerBoxLength - uCutoutLength;

            const slideH = 3.5;
            const ySlide = yBoxCenter - sideHeight * 0.1;

            return (
               <group key="sink-u-drawer">
                  {/* Rieles Telescópicos Fijos (Adosados a los laterales interiores del mueble) */}
                  <mesh position={[-innerW / 2 + 0.45, ySlide, slideZCenter]}>
                     <boxGeometry args={[0.55, slideH, nominalLength]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
                  </mesh>
                  <mesh position={[innerW / 2 - 0.45, ySlide, slideZCenter]}>
                     <boxGeometry args={[0.55, slideH, nominalLength]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
                  </mesh>

                  {/* Sifón Sanitario 3D en el vano posterior del mueble (tubos cromados/PVC) */}
                  <group position={[0, legsHeight + cabH * 0.62, -depth / 2 + 16]}>
                     {/* Tubo vertical de desagüe superior */}
                     <mesh position={[0, 4.5, 0]}>
                        <cylinderGeometry args={[2.1, 2.1, 8, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
                     </mesh>
                     {/* Vaso sifón botella registrable */}
                     <mesh position={[0, -1.8, 0]}>
                        <cylinderGeometry args={[3.2, 3.2, 8.5, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
                     </mesh>
                     {/* Caño horizontal a muro */}
                     <mesh position={[0, -0.2, -6.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[1.9, 1.9, 13, 16]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.25} />
                     </mesh>
                     {/* Embellecedor roseta en muro */}
                     <mesh position={[0, -0.2, -13]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[3.8, 3.8, 0.8, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                     </mesh>
                  </group>

                  <AnimatedDrawer 
                     openZOffset={drawerBoxLength - 3} 
                     forceOpen={isElementOpen(drawerKey)}
                     onClickAction={() => setOpenElement(id, drawerKey, !isElementOpen(drawerKey))}
                  >
                     {/* Frente de Melamina Exterior */}
                     <Board
                        position={[0, yBoxCenter, frontZ]}
                        args={[width - gap * 2, drawerH, thickness]}
                        {...colorProps}
                        isFrontPanel={true}
                        globalPosition={[position[0], position[1] + yBoxCenter, position[2] + frontZ]}
                     />

                     {/* Tirador Cajón U 3D */}
                     {showHandle && (
                       <group position={[0, yBoxCenter + (isPestanaHandle ? drawerH / 2 : (drawerH > 22 ? drawerH * 0.15 : 0)), frontZ + thickness / 2]}>
                         <KitchenHandle3D 
                           config={handleConfig} 
                           orientation="horizontal" 
                           isUpper={false} 
                           thickness={thickness}
                           customLengthCm={handleConfig?.model === 'kutz_asa' ? (width - gap * 2) : undefined}
                         />
                       </group>
                     )}

                     {/* Costados exteriores del cajón */}
                     <Board
                        position={[-skw / 2 + thickness / 2, yBoxCenter, drawerBoxZCenter]}
                        args={[thickness, sideHeight, drawerBoxLength]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />
                     <Board
                        position={[skw / 2 - thickness / 2, yBoxCenter, drawerBoxZCenter]}
                        args={[thickness, sideHeight, drawerBoxLength]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />

                     {/* Traseras individuales de cada ala (izquierda y derecha) */}
                     <Board
                        position={[-skw / 2 + wingW / 2, yBoxCenter, drawerBoxZCenter - drawerBoxLength / 2 + thickness / 2]}
                        args={[wingW, sideHeight, thickness]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />
                     <Board
                        position={[skw / 2 - wingW / 2, yBoxCenter, drawerBoxZCenter - drawerBoxLength / 2 + thickness / 2]}
                        args={[wingW, sideHeight, thickness]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />

                     {/* Paredes divisorias interiores que conforman el calado en U */}
                     <Board
                        position={[-uCutoutW / 2 + thickness / 2, yBoxCenter, drawerBoxZCenter - frontBandLength / 2]}
                        args={[thickness, sideHeight, uCutoutLength]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />
                     <Board
                        position={[uCutoutW / 2 - thickness / 2, yBoxCenter, drawerBoxZCenter - frontBandLength / 2]}
                        args={[thickness, sideHeight, uCutoutLength]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />

                     {/* Contrafrente frontal continuo del cajón en U */}
                     <Board
                        position={[0, yBoxCenter + 0.6, drawerBoxZCenter + drawerBoxLength / 2 - thickness / 2]}
                        args={[skw - thickness * 2, sideHeight - 1.2, thickness]}
                        {...parseColor(cInner, drawerInnerMaterial)}
                     />

                     {/* Uniones del Cajón al Contrafrente */}
                     <AssemblyJoint position={[-skw / 2 + thickness, yBoxCenter, drawerBoxZCenter + drawerBoxLength / 2 - thickness]} length={sideHeight} axis="y" pointing="right" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />
                     <AssemblyJoint position={[skw / 2 - thickness, yBoxCenter, drawerBoxZCenter + drawerBoxLength / 2 - thickness]} length={sideHeight} axis="y" pointing="left" thickness={thickness} count={1} overrideAssemblyType={useStore.getState().drawerAssemblyType} />

                     {/* Fondo de Cajón con forma en U (alas y unión frontal) */}
                     <Board
                        position={[-skw / 2 + wingW / 2, yBottomPanel + drawerBottomThick / 2, drawerBoxZCenter]}
                        args={[wingW, drawerBottomThick, drawerBoxLength]}
                        {...drawerBottomProps}
                     />
                     <Board
                        position={[skw / 2 - wingW / 2, yBottomPanel + drawerBottomThick / 2, drawerBoxZCenter]}
                        args={[wingW, drawerBottomThick, drawerBoxLength]}
                        {...drawerBottomProps}
                     />
                     <Board
                        position={[0, yBottomPanel + drawerBottomThick / 2, drawerBoxZCenter + drawerBoxLength / 2 - frontBandLength / 2]}
                        args={[uCutoutW, drawerBottomThick, frontBandLength]}
                        {...drawerBottomProps}
                     />

                     {/* Rieles Telescópicos Móviles (Solidarios al costado exterior del cajón) */}
                     <group position={[-skw / 2 - 0.35, ySlide, drawerBoxZCenter]}>
                        <mesh position={[0, 0, 0]}>
                           <boxGeometry args={[0.45, slideH - 0.8, drawerBoxLength]} />
                           <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
                        </mesh>
                        <mesh position={[-0.05, 0, 0]}>
                           <boxGeometry args={[0.2, 0.5, drawerBoxLength]} />
                           <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
                        </mesh>
                     </group>
                     <group position={[skw / 2 + 0.35, ySlide, drawerBoxZCenter]}>
                        <mesh position={[0, 0, 0]}>
                           <boxGeometry args={[0.45, slideH - 0.8, drawerBoxLength]} />
                           <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
                        </mesh>
                        <mesh position={[0.05, 0, 0]}>
                           <boxGeometry args={[0.2, 0.5, drawerBoxLength]} />
                           <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
                        </mesh>
                     </group>
                  </AnimatedDrawer>
               </group>
            );
         };
         
         const renderShelfWithJoints = (yPos: number, keySuffix: string | number) => (
            <group key={`shelf-${keySuffix}`}>
               <Board position={[0, yPos, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial, 'shelf')} />
               <AssemblyJoint position={[-innerW/2, yPos, 0]} length={depth - 2} axis="z" pointing="right" thickness={thickness} count={2} />
               <AssemblyJoint position={[innerW/2, yPos, 0]} length={depth - 2} axis="z" pointing="left" thickness={thickness} count={2} />
            </group>
         );

         const renderGolaL = () => (
            <group key="gola-l-profile">
               {/* Perfil Gola Superior Tipo J Provelcar x175 Oficial */}
               <mesh 
                  geometry={getProvelcarX175Geometry(golaSpan)} 
                  position={[-golaSpan / 2, legsHeight + cabH, depth / 2]} 
                  rotation={[0, Math.PI / 2, 0]}
                  castShadow
               >
                  <meshStandardMaterial color={golaColor} metalness={golaMetalness} roughness={golaRoughness} side={THREE.DoubleSide} />
               </mesh>
            </group>
         );

         const renderGolaC = (yPos: number) => (
            <group key={`gola-c-profile-${yPos}`}>
               {/* Perfil Gola Intermedio Tipo C / U Provelcar x176 Oficial */}
               <mesh 
                  geometry={getProvelcarX176Geometry(golaSpan)} 
                  position={[-golaSpan / 2, yPos, depth / 2]} 
                  rotation={[0, Math.PI / 2, 0]}
                  castShadow
               >
                  <meshStandardMaterial color={golaColor} metalness={golaMetalness} roughness={golaRoughness} side={THREE.DoubleSide} />
               </mesh>
            </group>
         );
         
           if (effectiveVariant === '1_door' || effectiveVariant === 'tall_1_door') {
            const doorW = width - gap*2;
            const topDeduct = kutzTopDeduct;
            const gapY = isKutzAsaGlobal ? kutzGapY : gap;
            const doorH = Math.max(10, cabH - topDeduct - (isKutzAsaGlobal ? gapY : gap*2));
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gapY + doorH/2);
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  <AnimatedDoor
                     position={[0, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={type === 'wall'}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Interiores Paramétricas con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`1d-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `1d-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
               </>
            );
         }

          if (effectiveVariant === 'tall_split_2_doors') {
            const baseH = 70;
            const lowerDoorH = baseH - gap*2;
            const upperDoorH = (cabH - baseH) - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const upperY = legsHeight + baseH + gap + upperDoorH/2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     onClickAction={() => setOpenElement(id, 'door-lower', !isElementOpen('door-lower'))}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {renderShelfWithJoints(legsHeight + baseH, 'div')}
                  <AnimatedDoor
                     position={[0, upperY, frontZ]}
                     doorW={width - gap*2}
                     doorH={upperDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={true}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-upper')}
                     forceOpen={isElementOpen('door-upper')}
                     onClickAction={() => setOpenElement(id, 'door-upper', !isElementOpen('door-upper'))}
                     globalPosition={[position[0], position[1] + upperY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Interiores Paramétricas con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount, shelvesCountLower, shelvesCountUpper };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`split-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `split-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
               </>
            );
         }

         if (effectiveVariant === 'tall_oven_micro') {
            const baseH = 70;
            const ovenH = 60;
            const microH = 38;
            const topStart = baseH + ovenH + microH;
            const topH = Math.max(10, cabH - topStart);
            const lowerDoorH = baseH - gap*2;
            const topDoorH = topH - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const ovenY = legsHeight + baseH + ovenH/2;
            const microY = legsHeight + baseH + ovenH + microH/2;
            const topY = legsHeight + topStart + gap + topDoorH/2;
            const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount, shelvesCountLower, shelvesCountUpper };
            const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);

            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     onClickAction={() => setOpenElement(id, 'door-lower', !isElementOpen('door-lower'))}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Dinámicas en Puerta Inferior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e < baseH).map((elev, sIdx) => (
                     <React.Fragment key={`oven-micro-low-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `oven-micro-low-${sIdx}`)}
                     </React.Fragment>
                  ))}
                  <Board position={[0, legsHeight + baseH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, ovenY, 0]}>
                     <BuiltInOven width={innerW + 1.4} height={ovenH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + baseH + ovenH, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, microY, 0]}>
                     <BuiltInMicrowave width={innerW + 1.4} height={microH - 0.6} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + topStart, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        isUpper={true}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                        forceOpen={isElementOpen('door-top')}
                        onClickAction={() => setOpenElement(id, 'door-top', !isElementOpen('door-top'))}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                        handleConfig={handleConfig}
                     />
                  )}
                  {/* Repisas Dinámicas en Puerta Superior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e > topStart).map((elev, sIdx) => (
                     <React.Fragment key={`oven-micro-up-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `oven-micro-up-${sIdx}`)}
                     </React.Fragment>
                  ))}
               </>
            );
         }

         if (effectiveVariant === 'tall_microwave_niche') {
            const baseH = 70;
            const nicheH = 45;
            const topStart = baseH + nicheH;
            const topH = Math.max(10, cabH - topStart);
            const lowerDoorH = baseH - gap*2;
            const topDoorH = topH - gap*2;
            const lowerY = legsHeight + gap + lowerDoorH/2;
            const nicheShelfY = legsHeight + baseH;
            const topY = legsHeight + topStart + gap + topDoorH/2;
            const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount, shelvesCountLower, shelvesCountUpper };
            const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);

            return (
               <>
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap*2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     onClickAction={() => setOpenElement(id, 'door-lower', !isElementOpen('door-lower'))}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Dinámicas en Puerta Inferior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e < baseH).map((elev, sIdx) => (
                     <React.Fragment key={`micro-niche-low-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `micro-niche-low-${sIdx}`)}
                     </React.Fragment>
                  ))}
                  <Board position={[0, nicheShelfY, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <group position={[0, nicheShelfY + thickness/2, 0]}>
                     <PortableMicrowave width={innerW} height={nicheH} depth={depth - 4} />
                  </group>
                  <Board position={[0, legsHeight + topStart, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap*2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        isUpper={true}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                        forceOpen={isElementOpen('door-top')}
                        onClickAction={() => setOpenElement(id, 'door-top', !isElementOpen('door-top'))}
                        globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                        handleConfig={handleConfig}
                     />
                  )}
                  {/* Repisas Dinámicas en Puerta Superior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e > topStart).map((elev, sIdx) => (
                     <React.Fragment key={`micro-niche-up-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `micro-niche-up-${sIdx}`)}
                     </React.Fragment>
                  ))}
               </>
            );
         }

         if (effectiveVariant === 'tall_open' || (type === 'tall' && (effectiveVariant === 'open' || !effectiveVariant))) {
            return (
               <>
                  <Board position={[0, legsHeight + cabH * 0.17, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.34, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.51, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.68, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + cabH * 0.85, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
               </>
            );
         }

         if (effectiveVariant === 'spice_rack') {
            const innerDepthMm = (depth - 1.5) * 10;
            const nominalLength = getNominalSlideLength(innerDepthMm) / 10;
            const cartDepth = nominalLength - 1.0;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap * 2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH / 2);
            
            const cartW = Math.max(8, innerW - 2.6);
            const cartH = Math.max(30, cabH - 12);
            const cartZCenter = depth / 2 - cartDepth / 2;
            const slideZCenter = depth / 2 - nominalLength / 2;
            
            const cartBottomY = legsHeight + thickness + 1.2;
            const midShelfY = cartBottomY + cartH * 0.48;
            const guardH = 6.0;
            const isElongatedHandle = handleConfig?.model === 'madrid' || handleConfig?.model === 'forza' || handleConfig?.model === 'denver';
            const handleOrientation = isElongatedHandle ? 'vertical' : 'horizontal';
            const handleY = isPestanaHandle ? (doorY + doorH / 2) : (doorY + doorH * 0.28);
            
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  {/* Rieles / Correderas telescópicas fijadas a los laterales interiores del mueble */}
                  <mesh position={[-innerW / 2 + 0.6, cartBottomY + 1.6, slideZCenter]}>
                     <boxGeometry args={[1.2, 3.2, nominalLength]} />
                     <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
                  </mesh>
                  <mesh position={[innerW / 2 - 0.6, cartBottomY + 1.6, slideZCenter]}>
                     <boxGeometry args={[1.2, 3.2, nominalLength]} />
                     <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
                  </mesh>
                  {cabH > 55 && (
                     <>
                        <mesh position={[-innerW / 2 + 0.6, midShelfY + 1.6, slideZCenter]}>
                           <boxGeometry args={[1.2, 3.2, nominalLength]} />
                           <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
                        </mesh>
                        <mesh position={[innerW / 2 - 0.6, midShelfY + 1.6, slideZCenter]}>
                           <boxGeometry args={[1.2, 3.2, nominalLength]} />
                           <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
                        </mesh>
                     </>
                  )}

                  {/* Carro extraíble animado completo */}
                  <AnimatedDrawer 
                     openZOffset={cartDepth - 3} 
                     forceOpen={isElementOpen('drawer-0')}
                     onClickAction={() => setOpenElement(id, 'drawer-0', !isElementOpen('drawer-0'))}
                  >
                     {/* Frente Exterior de Melamina */}
                     <Board 
                        position={[0, doorY, frontZ]} 
                        args={[width - gap * 2, doorH, thickness]} 
                        {...parseColor(cDoors, doorMaterial, 'drawer-0')} 
                        isFrontPanel={true} 
                        globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]} 
                     />
                     
                     {/* Tirador en orientación vertical si es alargado */}
                     {showHandle && (
                       <group position={[0, handleY, frontZ + thickness / 2]}>
                         <KitchenHandle3D 
                           config={handleConfig} 
                           orientation={handleConfig?.model === 'kutz_asa' ? 'horizontal' : handleOrientation} 
                           isUpper={false} 
                           thickness={thickness}
                           customLengthCm={handleConfig?.model === 'kutz_asa' ? (width - gap * 2) : undefined}
                         />
                       </group>
                     )}

                     {/* Correderas móviles unidas al carro de melamina */}
                     <mesh position={[-cartW / 2 - 0.45, cartBottomY + 1.6, cartZCenter]}>
                        <boxGeometry args={[0.9, 2.8, cartDepth]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
                     </mesh>
                     <mesh position={[cartW / 2 + 0.45, cartBottomY + 1.6, cartZCenter]}>
                        <boxGeometry args={[0.9, 2.8, cartDepth]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
                     </mesh>
                     {cabH > 55 && (
                        <>
                           <mesh position={[-cartW / 2 - 0.45, midShelfY + 1.6, cartZCenter]}>
                              <boxGeometry args={[0.9, 2.8, cartDepth]} />
                              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
                           </mesh>
                           <mesh position={[cartW / 2 + 0.45, midShelfY + 1.6, cartZCenter]}>
                              <boxGeometry args={[0.9, 2.8, cartDepth]} />
                              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
                           </mesh>
                        </>
                     )}

                     {/* BASTIDOR DE MELAMINA DEL CARRO ESPECÍFICO (Misma melamina de cajones cInner) */}
                     {/* 1. Base / Piso Inferior del Carro */}
                     <Board 
                        position={[0, cartBottomY + thickness / 2, cartZCenter]} 
                        args={[cartW, thickness, cartDepth]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 2. Montante / Trasera Vertical Posterior del Carro */}
                     <Board 
                        position={[0, cartBottomY + cartH / 2, cartZCenter - cartDepth / 2 + thickness / 2]} 
                        args={[cartW, cartH, thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 3. Barandillas Laterales Inferiores de Melamina */}
                     <Board 
                        position={[-cartW / 2 + thickness / 2, cartBottomY + guardH / 2 + thickness, cartZCenter]} 
                        args={[thickness, guardH, cartDepth]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />
                     <Board 
                        position={[cartW / 2 - thickness / 2, cartBottomY + guardH / 2 + thickness, cartZCenter]} 
                        args={[thickness, guardH, cartDepth]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 4. Amarre / Contrafrente Frontal Inferior de Fijación al Frente Exterior */}
                     <Board 
                        position={[0, cartBottomY + guardH / 2 + thickness, cartZCenter + cartDepth / 2 - thickness / 2]} 
                        args={[cartW - thickness * 2, guardH, thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 5. Repisa Intermedia de Melamina */}
                     <Board 
                        position={[0, midShelfY + thickness / 2, cartZCenter + thickness / 2]} 
                        args={[cartW, thickness, cartDepth - thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 6. Barandillas Laterales Intermedias de Melamina */}
                     <Board 
                        position={[-cartW / 2 + thickness / 2, midShelfY + guardH / 2 + thickness, cartZCenter + thickness / 2]} 
                        args={[thickness, guardH, cartDepth - thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />
                     <Board 
                        position={[cartW / 2 - thickness / 2, midShelfY + guardH / 2 + thickness, cartZCenter + thickness / 2]} 
                        args={[thickness, guardH, cartDepth - thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* 7. Amarre / Contrafrente Frontal Intermedio de Fijación al Frente Exterior */}
                     <Board 
                        position={[0, midShelfY + guardH / 2 + thickness, cartZCenter + cartDepth / 2 - thickness / 2]} 
                        args={[cartW - thickness * 2, guardH, thickness]} 
                        {...parseColor(cInner, drawerInnerMaterial)} 
                     />

                     {/* Varillas Cromadas de Protección / Contención Perimetral */}
                     <mesh position={[-cartW / 2 + 1.2, cartBottomY + guardH + 4, cartZCenter]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.25, 0.25, cartDepth - 2, 12]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                     </mesh>
                     <mesh position={[cartW / 2 - 1.2, cartBottomY + guardH + 4, cartZCenter]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.25, 0.25, cartDepth - 2, 12]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                     </mesh>
                     <mesh position={[-cartW / 2 + 1.2, midShelfY + guardH + 4, cartZCenter + thickness / 2]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.25, 0.25, cartDepth - 4, 12]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                     </mesh>
                     <mesh position={[cartW / 2 - 1.2, midShelfY + guardH + 4, cartZCenter + thickness / 2]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.25, 0.25, cartDepth - 4, 12]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                     </mesh>

                     {/* Botellas de Aceite y Vinagre en Nivel Inferior */}
                     {[-cartDepth * 0.25, 0, cartDepth * 0.25].map((zOffset, bIdx) => (
                        <group key={`spice-oil-bot-${bIdx}`} position={[0, cartBottomY + thickness + 11, cartZCenter + zOffset]}>
                           <mesh position={[0, 0, 0]}>
                              <cylinderGeometry args={[2.4, 2.4, 16, 16]} />
                              <meshStandardMaterial color={bIdx === 0 ? '#1e3a1e' : (bIdx === 1 ? '#451a03' : '#14532d')} roughness={0.2} metalness={0.2} />
                           </mesh>
                           <mesh position={[0, 9.5, 0]}>
                              <cylinderGeometry args={[1.0, 2.4, 3, 16]} />
                              <meshStandardMaterial color={bIdx === 0 ? '#1e3a1e' : (bIdx === 1 ? '#451a03' : '#14532d')} roughness={0.2} metalness={0.2} />
                           </mesh>
                           <mesh position={[0, 12, 0]}>
                              <cylinderGeometry args={[0.9, 0.9, 2.5, 16]} />
                              <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
                           </mesh>
                        </group>
                     ))}

                     {/* Frascos de Especias en Nivel Superior */}
                     {[-cartDepth * 0.32, -cartDepth * 0.11, cartDepth * 0.11, cartDepth * 0.32].map((zOffset, fIdx) => (
                        <group key={`spice-jar-${fIdx}`} position={[0, midShelfY + thickness + 5, cartZCenter + zOffset]}>
                           <mesh position={[0, 0, 0]}>
                              <cylinderGeometry args={[2.0, 2.0, 7.5, 16]} />
                              <meshStandardMaterial color="#f8fafc" roughness={0.1} transparent opacity={0.7} />
                           </mesh>
                           <mesh position={[0, -0.5, 0]}>
                              <cylinderGeometry args={[1.85, 1.85, 6, 16]} />
                              <meshStandardMaterial color={['#b45309', '#dc2626', '#15803d', '#ca8a04'][fIdx % 4]} roughness={0.7} />
                           </mesh>
                           <mesh position={[0, 4.3, 0]}>
                              <cylinderGeometry args={[2.05, 2.05, 1.2, 16]} />
                              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                           </mesh>
                        </group>
                     ))}
                  </AnimatedDrawer>
               </>
            );
         }
         
           if (effectiveVariant === '2_doors' || effectiveVariant === 'tall_2_doors') {
            const doorW = (width - gap*3) / 2;
            const topDeduct = kutzTopDeduct;
            const gapY = isKutzAsaGlobal ? kutzGapY : gap;
            const doorH = Math.max(10, cabH - topDeduct - (isKutzAsaGlobal ? gapY : gap*2));
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gapY + doorH/2);
            const leftDoorX = -width/2 + gap + doorW/2;
            const rightDoorX = width/2 - gap - doorW/2;
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  <AnimatedDoor
                     key="door-left"
                     position={[leftDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={type === 'wall'}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0] + leftDoorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  <AnimatedDoor
                     key="door-right"
                     position={[rightDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={true}
                     isUpper={type === 'wall'}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-1')}
                     forceOpen={isElementOpen('door-1')}
                     onClickAction={() => setOpenElement(id, 'door-1', !isElementOpen('door-1'))}
                     globalPosition={[position[0] + rightDoorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Interiores Paramétricas con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`2d-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `2d-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
               </>
            );
         }
         
         if (effectiveVariant === '1_door_1_drawer') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const drawerH = Math.max(8, 14.5 - golaRegruesoDeduct);
               const yTopFront = legsHeight + cabH - 3.5 - gap - golaRegruesoDeduct;
               const yBoxCenter = yTopFront - drawerH / 2;
               const yGolaC = yTopFront - drawerH - gap - 2.0;
               const doorH = Math.max(15, cabH - 3.5 - drawerH - 4.0 - gap * 4 - golaRegruesoDeduct);
               const yDoorCenter = legsHeight + gap + doorH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     <AnimatedDoor
                        position={[0, yDoorCenter, frontZ]}
                        doorW={width - gap*2}
                        doorH={doorH}
                        thickness={thickness}
                        isRightHinge={false}
                        isUpper={false}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                        forceOpen={isElementOpen('door-0')}
                        onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                        globalPosition={[position[0], position[1] + yDoorCenter, position[2] + frontZ]}
                        handleConfig={handleConfig}
                     />
                     
                     {(() => {
                        const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                        const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                        return shelfElevations.map((elev, sIdx) => (
                           <React.Fragment key={`1d1dr-gola-shelf-${sIdx}`}>
                              {renderShelfWithJoints(legsHeight + elev, `1d1dr-gola-shelf-${sIdx}`)}
                           </React.Fragment>
                        ));
                     })()}
                     {renderUndermountDrawer('d1', yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  </>
               );
            }
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const drawerH = Math.max(8, 15 - (isKutzAsaGlobal ? 0 : deduct));
            const doorH = Math.max(15, cabH - drawerH - deduct - gapY * (isKutzAsaGlobal ? 2 : 3));
            const yDoorCenter = legsHeight + gapY + doorH / 2;
            const yBoxCenter = legsHeight + gapY + doorH + gapY + drawerH / 2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, yDoorCenter, frontZ]}
                     doorW={width - gap*2}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0], position[1] + yDoorCenter, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Divisor fijo bajo el cajón */}
                  <Board position={[0, legsHeight + gapY + doorH + gapY, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`1d1dr-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `1d1dr-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
                  {renderUndermountDrawer('d1', yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
               </>
            );
         }
         
         if (effectiveVariant === '4_drawers') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5 - golaRegruesoDeduct);
               const drawerH = availH / 4;
               const yGolaC = legsHeight + gap + (drawerH + gap) * 2 + 2.0;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {[0,1,2,3].map(i => {
                       const yBoxCenter = legsHeight + gap + drawerH/2 + i*(drawerH + gap) + (i >= 2 ? 4.0 : 0);
                       return renderUndermountDrawer('d' + i, yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, `drawer-${3 - i}`), `drawer-${3 - i}`);
                     })}
                  </>
               );
            }
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const availH = Math.max(20, cabH - deduct - gapY * (isKutzAsaGlobal ? 4 : 5));
            const drawerH = availH / 4;
            return (
               <>
                  {[0,1,2,3].map(i => {
                    const yBoxCenter = legsHeight + gapY + drawerH/2 + i*(drawerH + gapY);
                    return renderUndermountDrawer('d' + i, yBoxCenter, drawerH, parseColor(cDrawers, drawerFrontMaterial, `drawer-${3 - i}`), `drawer-${3 - i}`);
                  })}
               </>
            );
         }
         
          if (effectiveVariant === '2_pot_drawers') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3 - golaRegruesoDeduct);
               const drawerH = availH / 2;
               const yLower = legsHeight + gap + drawerH / 2;
               const yGolaC = legsHeight + gap + drawerH + 2.0;
               const yUpper = legsHeight + gap + drawerH + 4.0 + gap + drawerH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {renderUndermountDrawer('p0', yLower, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                     {renderUndermountDrawer('p1', yUpper, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                  </>
               );
            }
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const availH = Math.max(20, cabH - deduct - gapY * (isKutzAsaGlobal ? 2 : 3));
            const drawerH = availH / 2;
            const yLower = legsHeight + gapY + drawerH / 2;
            const yUpper = legsHeight + gapY + drawerH + gapY + drawerH / 2;
            return (
               <>
                  {renderUndermountDrawer('p0', yLower, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  {renderUndermountDrawer('p1', yUpper, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
               </>
            );
         }

         if (effectiveVariant === 'hospital_meson_3drawers') {
            // Módulo Cajonero Hospitalario MC.2.02: 3 cajones (A, B y C) según plano CAD
            // A (superior): h~16.0cm + Cerradura trampa ANVER + Tirador Kutz
            // B (medio): h~16.0cm + Tirador Kutz
            // C (inferior): h~21.6cm + Tirador Kutz
            // Luz vertical entre frentes = 10mm (1.0cm) / Luz superior = 32mm (3.2cm)
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const availableH = Math.max(30, cabH - deduct - gapY * 3);
            // Proporción normada del plano: A=160, B=160, C=216 -> 160+160+216=536
            const hA = Math.max(10, Math.round(availableH * (160 / 536) * 10) / 10);
            const hB = Math.max(10, Math.round(availableH * (160 / 536) * 10) / 10);
            const hC = availableH - hA - hB;
            const yC = legsHeight + gapY + hC / 2;
            const yB = legsHeight + gapY + hC + gapY + hB / 2;
            const yA = legsHeight + gapY + hC + gapY + hB + gapY + hA / 2;
            return (
               <>
                  {/* Cajón C inferior (Corredera Häfele cierre suave) */}
                  {renderUndermountDrawer('p0', yC, hC, parseColor(cDrawers, drawerFrontMaterial, 'drawer-c'), 'drawer-c')}
                  {/* Cajón B intermedio (Corredera Ducasse sin cierre suave) */}
                  {renderUndermountDrawer('d1', yB, hB, parseColor(cDrawers, drawerFrontMaterial, 'drawer-b'), 'drawer-b')}
                  {/* Cajón A superior (Corredera Ducasse + Cerradura Trampa ANVER) */}
                  <group>
                     {renderUndermountDrawer('d2', yA, hA, parseColor(cDrawers, drawerFrontMaterial, 'drawer-a'), 'drawer-a')}
                     {/* Cerradura Trampa ANVER en cara frontal derecha superior */}
                     <mesh position={[width / 2 - 4.5, yA + hA / 2 - 3.2, frontZ + thickness / 2 + 0.15]}>
                        <cylinderGeometry args={[0.9, 0.9, 0.3, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                     </mesh>
                     {/* Bocallave / ranura trampa */}
                     <mesh position={[width / 2 - 4.5, yA + hA / 2 - 3.2, frontZ + thickness / 2 + 0.32]}>
                        <boxGeometry args={[0.2, 0.6, 0.05]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.9} />
                     </mesh>
                  </group>
               </>
            );
         }

         if (effectiveVariant === 'hospital_meson_1door') {
            const doorW = width - gap * 2;
            const topDeduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const doorH = Math.max(10, cabH - topDeduct - gapY);
            const doorY = legsHeight + gapY + doorH / 2;
            return (
               <>
                  <AnimatedDoor
                     position={[0, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-hosp')}
                     forceOpen={isElementOpen('door-hosp')}
                     onClickAction={() => setOpenElement(id, 'door-hosp', !isElementOpen('door-hosp'))}
                     globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig || { model: 'kutz_asa', finish: 'anodizado_inox', lengthMm: width * 10, orientation: 'horizontal' }}
                  />
                  {/* Repisas interiores paramétricas con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`hosp-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `hosp-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
               </>
            );
         }

         if (effectiveVariant === 'hospital_meson_2doors') {
            const doorW = (width - gap * 3) / 2;
            const topDeduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const doorH = Math.max(10, cabH - topDeduct - gapY);
            const doorY = legsHeight + gapY + doorH / 2;
            const leftDoorX = -width / 2 + gap + doorW / 2;
            const rightDoorX = width / 2 - gap - doorW / 2;
            return (
               <>
                  <AnimatedDoor
                     key="hosp-door-left"
                     position={[leftDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0] + leftDoorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig || { model: 'kutz_asa', finish: 'anodizado_inox', lengthMm: doorW * 10, orientation: 'horizontal' }}
                  />
                  <AnimatedDoor
                     key="hosp-door-right"
                     position={[rightDoorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={true}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-1')}
                     forceOpen={isElementOpen('door-1')}
                     onClickAction={() => setOpenElement(id, 'door-1', !isElementOpen('door-1'))}
                     globalPosition={[position[0] + rightDoorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig || { model: 'kutz_asa', finish: 'anodizado_inox', lengthMm: doorW * 10, orientation: 'horizontal' }}
                  />
                  {/* Repisas interiores paramétricas con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <React.Fragment key={`hosp-2d-shelf-${sIdx}`}>
                           {renderShelfWithJoints(legsHeight + elev, `hosp-2d-shelf-${sIdx}`)}
                        </React.Fragment>
                     ));
                  })()}
               </>
            );
         }

         if (effectiveVariant === 'hospital_niche_open') {
            // Nicho Abierto 300 mm sin puerta para insumos clínicos (0 a 4 repisas)
            const count = shelvesCount !== undefined ? shelvesCount : 2;
            if (count <= 0) return null;
            const step = cabH / (count + 1);
            return (
               <>
                  {Array.from({ length: count }, (_, sIdx) => (
                     <React.Fragment key={`niche-shelf-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + (sIdx + 1) * step, `niche-shelf-${sIdx}`)}
                     </React.Fragment>
                  ))}
               </>
            );
         }

         if (effectiveVariant === '2_drawers_1_pot') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 4 - golaRegruesoDeduct);
               const lowerH = availH * 0.5;
               const upperH = availH * 0.25;
               const yLower = legsHeight + gap + lowerH / 2;
               const yGolaC = legsHeight + gap + lowerH + 2.0;
               const yMid = legsHeight + gap + lowerH + 4.0 + gap + upperH / 2;
               const yTop = legsHeight + gap + lowerH + 4.0 + gap + upperH + gap + upperH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {renderUndermountDrawer('p0', yLower, lowerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                     {renderUndermountDrawer('d1', yMid, upperH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                     {renderUndermountDrawer('d2', yTop, upperH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-2'), 'drawer-2')}
                  </>
               );
            }
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const availableH = Math.max(20, cabH - deduct - gapY * (isKutzAsaGlobal ? 3 : 4));
            const lowerH = Math.round(availableH * 0.5 * 10) / 10;
            const upperH = (availableH - lowerH) / 2;
            const yLower = legsHeight + gapY + lowerH / 2;
            const yMid = legsHeight + gapY + lowerH + gapY + upperH / 2;
            const yTop = legsHeight + gapY + lowerH + gapY + upperH + gapY + upperH / 2;
            return (
               <>
                  {renderUndermountDrawer('p0', yLower, lowerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  {renderUndermountDrawer('d1', yMid, upperH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                  {renderUndermountDrawer('d2', yTop, upperH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-2'), 'drawer-2')}
               </>
            );
         }

         if (effectiveVariant === 'sink_u_drawer') {
            if (isGolaActive) {
               const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
               const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3 - golaRegruesoDeduct);
               const drawerH = availH / 2;
               const yLower = legsHeight + gap + drawerH / 2;
               const yGolaC = legsHeight + gap + drawerH + 2.0;
               const yUpper = legsHeight + gap + drawerH + 4.0 + gap + drawerH / 2;
               return (
                  <>
                     {renderGolaL()}
                     {renderGolaC(yGolaC)}
                     {renderUndermountDrawer('p0', yLower, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                     {renderSinkUDrawer(yUpper, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
                  </>
               );
            }
            const deduct = kutzTopDeduct;
            const gapY = kutzGapY;
            const availH = Math.max(20, cabH - deduct - gapY * (isKutzAsaGlobal ? 2 : 3));
            const drawerH = availH / 2;
            const yLower = legsHeight + gapY + drawerH / 2;
            const yUpper = legsHeight + gapY + drawerH + gapY + drawerH / 2;
            return (
               <>
                  {renderUndermountDrawer('p0', yLower, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-1'), 'drawer-1')}
                  {renderSinkUDrawer(yUpper, drawerH, parseColor(cDrawers, drawerFrontMaterial, 'drawer-0'), 'drawer-0')}
               </>
            );
         }

         if (effectiveVariant === 'corner_blind_right' || effectiveVariant === 'corner_blind_left' || effectiveVariant === 'corner_blind') {
            const isRight = effectiveVariant !== 'corner_blind_left';
            const blindW = Math.max(35, width / 2);
            const stripW = 6.5; // Regleta de ajuste frontal traslapada de 65 mm (evita colisiones con tiradores a 90°)
            const doorW = width - blindW - gap * 2;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const gapY = isKutzAsaGlobal ? kutzGapY : gap;
            const doorH = Math.max(10, cabH - topDeduct - (isKutzAsaGlobal ? gapY : gap * 2));
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gapY + doorH / 2);
            
            const blindX = isRight ? (width / 2 - blindW / 2) : (-width / 2 + blindW / 2);
            const postX = isRight ? (width / 2 - blindW + thickness / 2) : (-width / 2 + blindW - thickness / 2);
            const doorX = isRight ? (-width / 2 + gap + doorW / 2) : (width / 2 - gap - doorW / 2);
            // Regleta traslapada: montada sobre el panel ciego con solape de 2cm
            const stripX = isRight ? (width / 2 - blindW + stripW / 2 - 2.0) : (-width / 2 + blindW - stripW / 2 + 2.0);
            
            return (
               <>
                  {isGolaActive && renderGolaL()}
                  {/* Panel Ciego Frontal Fijo (recesado por detrás de la regleta) */}
                  <Board
                     position={[blindX, doorY, frontZ - thickness / 2]}
                     args={[blindW, doorH, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'blind')}
                     isFrontPanel={false}
                     globalPosition={[position[0] + blindX, position[1] + doorY, position[2] + frontZ - thickness / 2]}
                  />

                  {/* Regleta de Ajuste Frontal Traslapada de 65 mm */}
                  <Board
                     position={[stripX, doorY, frontZ + thickness / 2]}
                     args={[stripW, doorH, thickness]}
                     {...parseColor(cDoors, doorMaterial, 'adjustment_strip')}
                     isFrontPanel={true}
                     globalPosition={[position[0] + stripX, position[1] + doorY, position[2] + frontZ + thickness / 2]}
                  />

                  {/* Poste / Regleta Vertical de Amarre Interior */}
                  <Board
                     position={[postX, legsHeight + cabH / 2, isGolaActive ? depth / 2 - 2.8 - 5 : depth / 2 - 5]}
                     args={[thickness, cabH, 10]}
                     {...parseColor(cStructure, structureMaterial)}
                  />

                  {/* Puerta Frontal Batiente Abrible con Bisagras de Cazoleta en el lado exterior */}
                  <AnimatedDoor
                     position={[doorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={!isRight}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0] + doorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />

                  {/* Repisa Interior Transversal Paramétrica con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <Board
                           key={`cb-shelf-${sIdx}`}
                           position={[0, legsHeight + elev, 0]}
                           args={[innerW, thickness, depth - 4]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     ));
                  })()}
               </>
            );
         }

         if (effectiveVariant === 'wall_corner_blind_right' || effectiveVariant === 'wall_corner_blind_left' || effectiveVariant === 'wall_corner_blind') {
            const isRight = effectiveVariant !== 'wall_corner_blind_left';
            const stripW = 5.5; // 55 mm según detalle técnico del PDF
            const doorW = width - stripW - gap * 3;
            const doorH = cabH - gap * 2;
            const doorY = legsHeight + gap + doorH / 2;

            const stripX = isRight ? (width / 2 - stripW / 2 - gap) : (-width / 2 + stripW / 2 + gap);
            const returnX = isRight ? (width / 2 - stripW + thickness / 2) : (-width / 2 + stripW - thickness / 2);
            const doorX = isRight ? (-width / 2 + gap + doorW / 2) : (width / 2 - gap - doorW / 2);

            return (
               <>
                  {/* Tapa Esquinero Frontal (Regleta exterior de esquina) */}
                  <Board
                     position={[stripX, doorY, frontZ]}
                     args={[stripW, doorH, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'corner_strip')}
                     isFrontPanel={false}
                     globalPosition={[position[0] + stripX, position[1] + doorY, position[2] + frontZ]}
                  />

                  {/* Regleta Retorno / Pieza de Unión L Interior según lámina técnica PDF */}
                  <Board
                     position={[returnX, doorY, frontZ - stripW / 2 - thickness / 2]}
                     args={[thickness, doorH, stripW]}
                     {...parseColor(cStructure, structureMaterial, 'corner_return')}
                     isFrontPanel={false}
                  />

                  {/* Puerta Batiente con bisagras en el extremo exterior opuesto */}
                  <AnimatedDoor
                     position={[doorX, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={!isRight}
                     isUpper={true}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     onClickAction={() => setOpenElement(id, 'door-0', !isElementOpen('door-0'))}
                     globalPosition={[position[0] + doorX, position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                  />

                  {/* Repisas Interiores Regulables con Anti-Colisión */}
                  {(() => {
                     const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount };
                     const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);
                     return shelfElevations.map((elev, sIdx) => (
                        <Board
                           key={`wcb-shelf-${sIdx}`}
                           position={[0, legsHeight + elev, 0]}
                           args={[innerW, thickness, depth - 4]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     ));
                  })()}
               </>
            );
         }

         if (effectiveVariant === 'wine_rack' || effectiveVariant === 'base_wine_rack' || effectiveVariant === 'wall_wine_rack' || effectiveVariant === 'tall_wine_rack' || effectiveVariant === 'island_wine_rack') {
            // Opción A: Fabricación a disco (escuadradora/panelera) con frente enrasado a plomo con puertas/cajones
            const frontPlaneZ = depth / 2 + thickness;
            const usefulDepth = Math.min(depth - 2, 32); // Fondo útil para botellas estándar 32cm
            const falseBackZ = frontPlaneZ - usefulDepth - thickness / 2;
            const cellsZ = frontPlaneZ - usefulDepth / 2;

            // Cálculo paramétrico de columnas: Mínimo 10.5 cm libres por botella, máximo 5 corridas
            const minClearance = 10.5;
            const maxColsPossible = Math.floor((innerW + thickness) / (minClearance + thickness));
            const cols = Math.min(5, Math.max(1, maxColsPossible));
            const colWidth = (innerW - (cols - 1) * thickness) / cols;

            // Filas según altura del mueble (~12.5 cm por corrida de botella)
            const availableH = cabH - thickness * 2;
            const rows = Math.max(2, Math.floor(availableH / 12.5));
            const rowHeight = (availableH - (rows - 1) * thickness) / rows;

            const bottles: { x: number; y: number; key: string }[] = [];
            for (let c = 0; c < cols; c++) {
               const bX = -innerW / 2 + c * (colWidth + thickness) + colWidth / 2;
               for (let r = 0; r < rows; r++) {
                  const bY = legsHeight + thickness + r * (rowHeight + thickness) + rowHeight / 2;
                  bottles.push({ x: bX, y: bY, key: `bot-${c}-${r}` });
               }
            }

            return (
               <>
                  {/* Fondo Falso Vertical Estructural a 32cm útiles del frente */}
                  <Board
                     position={[0, legsHeight + cabH / 2, falseBackZ]}
                     args={[innerW, cabH - thickness * 2, thickness]}
                     {...parseColor(cStructure, structureMaterial, 'false_back')}
                  />

                  {/* Divisores Verticales de Celdas (entre columnas) */}
                  {cols > 1 && Array.from({ length: cols - 1 }).map((_, i) => {
                     const divX = -innerW / 2 + (i + 1) * (colWidth + thickness) - thickness / 2;
                     return (
                        <Board
                           key={`wine-vdiv-${i}`}
                           position={[divX, legsHeight + cabH / 2, cellsZ]}
                           args={[thickness, cabH - thickness * 2, usefulDepth]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     );
                  })}

                  {/* Repisas Horizontales de Celdas (entre filas) */}
                  {rows > 1 && Array.from({ length: rows - 1 }).map((_, j) => {
                     const divY = legsHeight + thickness + (j + 1) * (rowHeight + thickness) - thickness / 2;
                     return (
                        <Board
                           key={`wine-hdiv-${j}`}
                           position={[0, divY, cellsZ]}
                           args={[innerW, thickness, usefulDepth]}
                           {...parseColor(shelfColor || cStructure, shelfMaterial)}
                        />
                     );
                  })}

                  {/* Botellas de Vino 3D en los nichos */}
                  {bottles.map(b => (
                     <group key={b.key} position={[b.x, b.y, cellsZ]} rotation={[Math.PI / 2, 0, 0]}>
                        {/* Cuerpo de botella cilíndrica */}
                        <mesh position={[0, 0, 0]}>
                           <cylinderGeometry args={[3.6, 3.6, 17, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Hombro cónico */}
                        <mesh position={[0, 10, 0]}>
                           <cylinderGeometry args={[1.5, 3.6, 3, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Cuello */}
                        <mesh position={[0, 13.5, 0]}>
                           <cylinderGeometry args={[1.35, 1.35, 4, 14]} />
                           <meshStandardMaterial color="#1a2f1a" roughness={0.2} metalness={0.15} />
                        </mesh>
                        {/* Cápsula de botella burdeos */}
                        <mesh position={[0, 14.8, 0]}>
                           <cylinderGeometry args={[1.4, 1.4, 2.4, 14]} />
                           <meshStandardMaterial color="#7f1d1d" roughness={0.3} metalness={0.7} />
                        </mesh>
                     </group>
                  ))}
               </>
            );
         }

         if (effectiveVariant === 'wall_lift_up') {
            const doorW = width - gap * 2;
            const doorH = cabH - gap * 2;
            return (
               <>
                  <AnimatedLiftUpDoor
                     position={[0, legsHeight + cabH / 2, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lift')}
                     forceOpen={isElementOpen('door-lift')}
                     globalPosition={[position[0], position[1] + legsHeight + cabH / 2, position[2] + frontZ]}
                     innerDepth={depth - 2}
                     handleConfig={handleConfig}
                  />
                  {cabH > 50 && renderShelfWithJoints(legsHeight + cabH / 2, 'wlu1')}
               </>
            );
         }

         if (effectiveVariant === 'wall_lift_up_double') {
            const sectionH = (cabH - gap * 3) / 2;
            const lowerDoorH = sectionH;
            const upperDoorH = sectionH;
            const lowerY = legsHeight + gap + lowerDoorH / 2;
            const upperY = legsHeight + gap + lowerDoorH + gap + upperDoorH / 2;
            return (
               <>
                  <AnimatedLiftUpDoor
                     key="lift-lower"
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[position[0], position[1] + lowerY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                     handleConfig={handleConfig}
                  />
                  {/* Divisor horizontal fijo */}
                  {renderShelfWithJoints(legsHeight + lowerDoorH + gap * 1.5, 'wlud_div')}
                  <AnimatedLiftUpDoor
                     key="lift-upper"
                     position={[0, upperY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={upperDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-upper')}
                     forceOpen={isElementOpen('door-upper')}
                     globalPosition={[position[0], position[1] + upperY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                     handleConfig={handleConfig}
                  />
               </>
            );
         }

         if (effectiveVariant === 'wall_microwave_niche') {
            const nicheH = 38;
            const topH = Math.max(20, cabH - nicheH - gap * 2);
            const topDoorH = topH - gap * 2;
            const topY = legsHeight + nicheH + gap + topDoorH / 2;
            return (
               <>
                  {/* Divisor repisa sobre el nicho */}
                  {renderShelfWithJoints(legsHeight + nicheH, 'wmn_div')}
                  {/* Microondas portátil de sobremesa en el nicho inferior */}
                  <group position={[0, legsHeight + 2, 0]}>
                     <PortableMicrowave width={width - 4} height={nicheH - 4} depth={depth - 3} />
                  </group>
                  {/* Puerta superior elevable */}
                  <AnimatedLiftUpDoor
                     position={[0, topY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={topDoorH}
                     thickness={thickness}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                     forceOpen={isElementOpen('door-top')}
                     globalPosition={[position[0], position[1] + topY, position[2] + frontZ]}
                     innerDepth={depth - 2}
                     handleConfig={handleConfig}
                  />
                  {topH > 45 && renderShelfWithJoints(legsHeight + nicheH + topH / 2, 'wmn_top_shelf')}
               </>
            );
         }

         if (effectiveVariant === 'corner_l') {
            // Módulo esquinero en L articulado (900x900 mm)
            // Puertas bi-fold articuladas a 90°
            const doorW = 30 - gap * 2;
            const topDeduct = isGolaActive ? 3.5 : (isBaseOrIsland ? regruesoDeduct : 0);
            const doorH = Math.max(10, cabH - topDeduct - gap * 2);
            const doorY = isGolaActive ? (legsHeight + (cabH - topDeduct)/2) : (legsHeight + gap + doorH / 2);
            const isLOpen = isElementOpen('door-0') || isElementOpen('door-1') || isElementOpen('door-l');
            
            return (
               <group key="corner-l-fronts">
                  {isGolaActive && renderGolaL()}
                  {/* Repisa interior en L continua retranqueada */}
                  <group position={[0, legsHeight + cabH / 2, 0]}>
                     <Board position={[-15, 0, -1]} args={[width - 30 - 2, thickness, depth - 4]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                     <Board position={[29, 0, -15]} args={[30 - 2, thickness, depth - 30 - 4]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  </group>

                  {/* Puertas Bi-Fold Articuladas de 90° con cinemática precisa Blum */}
                  <AnimatedBiFoldCornerLDoors
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     position={[width / 2 - gap, doorY, 15 + thickness / 2]}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isLOpen}
                     onClickAction={() => setOpenElement(id, 'door-0', !isLOpen)}
                     safePos={safePos}
                     isUpper={type === 'wall'}
                     handleConfig={handleConfig}
                  />
               </group>
            );
         }

         if (effectiveVariant === 'tall_oven_vent') {
            const baseH = 70;
            const ovenH = 60;
            const microH = 38;
            const topStart = baseH + ovenH + microH;
            const topH = Math.max(10, cabH - topStart);
            const lowerDoorH = baseH - gap * 2;
            const topDoorH = topH - gap * 2;
            const lowerY = legsHeight + gap + lowerDoorH / 2;
            const ovenY = legsHeight + baseH + ovenH / 2;
            const microY = legsHeight + baseH + ovenH + microH / 2;
            const topY = legsHeight + topStart + gap + topDoorH / 2;
            
            // Retranqueo técnico de 50mm para chimenea térmica: repisas interiores tienen 5cm menos de fondo
            const ventDepth = depth - 5;
            const ventZ = 2.5; // desplazado hacia el frente para dejar el vano de 50mm atrás
            const cabObj: CabinetType = { id, type, variant, width, height, depth, position, rotation, color, shelvesCount, shelvesCountLower, shelvesCountUpper };
            const shelfElevations = getResolvedCabinetShelfElevations(cabObj, thickness);

            return (
               <>
                  {/* Puerta inferior despensero */}
                  <AnimatedDoor
                     position={[0, lowerY, frontZ]}
                     doorW={width - gap * 2}
                     doorH={lowerDoorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-lower')}
                     forceOpen={isElementOpen('door-lower')}
                     globalPosition={[safePos[0], safePos[1] + lowerY, safePos[2] + frontZ]}
                     handleConfig={handleConfig}
                  />
                  {/* Repisas Dinámicas en Puerta Inferior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e < baseH).map((elev, sIdx) => (
                     <React.Fragment key={`oven-vent-low-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `oven-vent-low-${sIdx}`)}
                     </React.Fragment>
                  ))}
                  
                  {/* Base soporte horno con Rejilla de Ventilación Técnica Frontal */}
                  <Board position={[0, legsHeight + baseH, ventZ]} args={[innerW, thickness, ventDepth]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  
                  {/* Rejilla de Ventilación Técnica Frontal en aluminio anodizado ranurado */}
                  <group position={[0, legsHeight + baseH - 1.8, frontZ - 0.8]}>
                     <mesh castShadow>
                        <boxGeometry args={[innerW, 3.6, 1.2]} />
                        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.18} />
                     </mesh>
                     {/* Ranuras oscuras de convección */}
                     {[-innerW * 0.35, -innerW * 0.18, 0, innerW * 0.18, innerW * 0.35].map((sx, sIdx) => (
                        <mesh key={`slot-${sIdx}`} position={[sx, 0, 0.65]}>
                           <boxGeometry args={[innerW * 0.12, 1.2, 0.2]} />
                           <meshStandardMaterial color="#09090b" roughness={0.9} />
                        </mesh>
                     ))}
                  </group>

                  {/* Horno empotrado */}
                  <group position={[0, ovenY, ventZ]}>
                     <BuiltInOven width={innerW + 1.4} height={ovenH - 0.6} depth={ventDepth - 2} />
                  </group>
                  
                  {/* Divisor horno/microondas con holgura de convección */}
                  <Board position={[0, legsHeight + baseH + ovenH, ventZ]} args={[innerW, thickness, ventDepth]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  
                  {/* Microondas empotrado */}
                  <group position={[0, microY, ventZ]}>
                     <BuiltInMicrowave width={innerW + 1.4} height={microH - 0.6} depth={ventDepth - 2} />
                  </group>
                  
                  {/* Techo del nicho torre con holgura de convección */}
                  <Board position={[0, legsHeight + topStart, ventZ]} args={[innerW, thickness, ventDepth]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  
                  {topDoorH > 10 && (
                     <AnimatedDoor
                        position={[0, topY, frontZ]}
                        doorW={width - gap * 2}
                        doorH={topDoorH}
                        thickness={thickness}
                        isRightHinge={false}
                        isUpper={true}
                        colorProps={parseColor(cDoors, doorMaterial, 'door-top')}
                        forceOpen={isElementOpen('door-top')}
                        globalPosition={[safePos[0], safePos[1] + topY, safePos[2] + frontZ]}
                        handleConfig={handleConfig}
                     />
                  )}
                  {/* Repisas Dinámicas en Puerta Superior (Anti-Colisión) */}
                  {shelfElevations.filter(e => e > topStart).map((elev, sIdx) => (
                     <React.Fragment key={`oven-vent-up-${sIdx}`}>
                        {renderShelfWithJoints(legsHeight + elev, `oven-vent-up-${sIdx}`)}
                     </React.Fragment>
                  ))}
               </>
            );
         }

         if (effectiveVariant === 'tall_inner_drawers') {
            const doorW = width - gap * 2;
            const doorH = cabH - gap * 2;
            const doorY = legsHeight + gap + doorH / 2;
            
            // 4 gavetas interiores (gavetas inglesas)
            const drawerInnerH = 14;
            const innerDrawersCount = 4;
            const innerDepthMm = (depth - 1.5) * 10;
            const nominalLength = getNominalSlideLength(innerDepthMm) / 10;
            const drawerBoxLength = nominalLength - 1.0;
            const drawerBoxZCenter = depth / 2 - drawerBoxLength / 2 - 3.5;
            const skw = innerW - 4.9;

            return (
               <>
                  {/* Puerta Exterior Única de Gran Altura con bisagras gran angular 165° */}
                  <AnimatedDoor
                     position={[0, doorY, frontZ]}
                     doorW={doorW}
                     doorH={doorH}
                     thickness={thickness}
                     isRightHinge={false}
                     isUpper={false}
                     colorProps={parseColor(cDoors, doorMaterial, 'door-0')}
                     forceOpen={isElementOpen('door-0')}
                     globalPosition={[position[0], position[1] + doorY, position[2] + frontZ]}
                     handleConfig={handleConfig}
                     maxAngle={Math.PI * 0.5}
                  />

                  {/* 4 Gavetas Interiores Extraíbles con uñero ergonómico calado */}
                  {Array.from({ length: innerDrawersCount }).map((_, idx) => {
                     const yCenter = legsHeight + 86 - idx * 24;
                     const drawerKey = `drawer-${idx}`;
                     const isDoorOpen = isElementOpen('door-0');
                     const isOpenThis = isDoorOpen && isElementOpen(drawerKey);
                     
                     return (
                         <group key={`inner-drw-${idx}`} visible={isDoorOpen}>
                           {/* Correderas fijas ancladas a los costados */}
                           <mesh position={[-innerW / 2 + 1.225, yCenter - drawerInnerH / 2 + 0.6, drawerBoxZCenter]}>
                              <boxGeometry args={[2.45, 1.2, nominalLength]} />
                              <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.2} />
                           </mesh>
                           <mesh position={[innerW / 2 - 1.225, yCenter - drawerInnerH / 2 + 0.6, drawerBoxZCenter]}>
                              <boxGeometry args={[2.45, 1.2, nominalLength]} />
                              <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.2} />
                           </mesh>

                           <AnimatedDrawer 
                              openZOffset={drawerBoxLength - 2} 
                              forceOpen={isOpenThis}
                              onClickAction={() => setOpenElement(id, drawerKey, !isElementOpen(drawerKey))}
                           >
                              {/* Frente Interior de Melamina con uñero ergonómico */}
                              <group position={[0, yCenter, frontZ - 3.5]}>
                                 <Board
                                    position={[0, 0, 0]}
                                    args={[skw, drawerInnerH, thickness]}
                                    {...parseColor(cDrawers, drawerFrontMaterial, `inner-${idx}`)}
                                 />
                                 {/* Uñero ergonómico en el centro superior */}
                                 <mesh position={[0, drawerInnerH / 2 - 2, 0]}>
                                    <boxGeometry args={[14, 2.8, thickness + 0.3]} />
                                    <meshStandardMaterial color="#1e293b" roughness={0.7} />
                                 </mesh>
                              </group>

                              {/* Caja del Cajón Interior */}
                              <Board position={[-skw / 2 + thickness / 2, yCenter, drawerBoxZCenter]} args={[thickness, drawerInnerH - 2, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                              <Board position={[skw / 2 - thickness / 2, yCenter, drawerBoxZCenter]} args={[thickness, drawerInnerH - 2, drawerBoxLength]} {...parseColor(cInner, drawerInnerMaterial)} />
                              <Board position={[0, yCenter + 0.6, drawerBoxZCenter - drawerBoxLength / 2 + thickness / 2]} args={[skw - thickness * 2, drawerInnerH - 3.2, thickness]} {...parseColor(cInner, drawerInnerMaterial)} />
                              <Board position={[0, yCenter - drawerInnerH / 2 + 1.35, drawerBoxZCenter]} args={[skw - thickness * 2, 0.3, drawerBoxLength - thickness * 2]} color="#dddddd" />
                           </AnimatedDrawer>
                        </group>
                     );
                  })}

                  {/* Repisas Superiores Despensa */}
                  <Board position={[0, legsHeight + 115, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + 150, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
                  <Board position={[0, legsHeight + 180, 0]} args={[innerW, thickness, depth - 2]} {...parseColor(shelfColor || cStructure, shelfMaterial)} />
               </>
            );
         }

         if (effectiveVariant === 'wall_open' || (type === 'wall' && (effectiveVariant === 'open' || !effectiveVariant))) {
            return (
               <>
                  {renderShelfWithJoints(legsHeight + cabH * 0.33, 'wo1')}
                  {renderShelfWithJoints(legsHeight + cabH * 0.66, 'wo2')}
               </>
            );
         }
         return null;
      };

      return (
         <group position={[0, -height/2, 0]}>
            {effectiveVariant === 'corner_l' ? (
               <>
                  {/* 6 Patas niveladoras bajo los vértices de la L */}
                  <mesh position={[-width/2 + 6, legsHeight/2, -depth/2 + 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 6, legsHeight/2, -depth/2 + 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[-width/2 + 6, legsHeight/2, depth/2 - 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 6, legsHeight/2, 15 - 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[15 - 6, legsHeight/2, depth/2 - 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[15 - 6, legsHeight/2, 15 - 6]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>

                  {/* Piso en L formado por dos tableros sin traslape */}
                  <Board position={[-15, legsHeight + thickness/2, 0]} args={[width - 30, thickness, depth]} {...parseColor(cStructure, structureMaterial, 'bottom')} />
                  <Board position={[30, legsHeight + thickness/2, -15]} args={[30, thickness, depth - 30]} {...parseColor(cStructure, structureMaterial, 'bottom')} />

                  {/* Trasera posterior (muro fondo) */}
                  <Board position={[0, legsHeight + cabH/2, -depth/2 + thickness/2]} args={[width, cabH, thickness]} {...parseColor(cBack, backMaterial, 'back')} />
                  {/* Trasera lateral izquierda (muro perpendicular) */}
                  <Board position={[-width/2 + thickness/2, legsHeight + cabH/2, thickness/2]} args={[thickness, cabH, depth - thickness]} {...parseColor(cBack, backMaterial, 'back')} />

                  {/* Lateral derecho (ensamble a mueble contiguo de 60cm fondo) */}
                  <Board position={[width/2 - thickness/2, legsHeight + cabH/2, -15 + thickness/2]} args={[thickness, cabH, depth - 30 - thickness]} {...parseColor(cStructure, structureMaterial, 'right')} />
                  {/* Lateral frontal izquierdo (ensamble a mueble contiguo de 60cm fondo) */}
                  <Board position={[-15 + thickness/2, legsHeight + cabH/2, depth/2 - thickness/2]} args={[width - 30 - thickness, cabH, thickness]} {...parseColor(cStructure, structureMaterial, 'left')} />

                  {/* Amarres superiores estructurales */}
                  <Board position={[0, height - thickness/2, -depth/2 + 5]} args={[width - thickness*2, thickness, 10]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  <Board position={[-width/2 + 5, height - thickness/2, 0]} args={[10, thickness, depth - thickness*2]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  <Board position={[30, height - thickness/2, 15 - 5]} args={[30 - thickness, thickness, 10]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  <Board position={[15 - 5, height - thickness/2, 30]} args={[10, thickness, 30 - thickness]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  {/* Escuadra superior de amarre de cubierta en rincón */}
                  <Board position={[15 - 5, height - thickness/2, 15 - 5]} args={[10, thickness, 10]} {...parseColor(cStructure, structureMaterial, 'top')} />

                  {renderFronts()}
                  {renderCoverPanels()}
               </>
            ) : (
               <>
            {isBaseOrTall && !((projectMode === 'hospital' || hospitalBaseType === 'metal_frame') && (type === 'base' || type === 'island')) && (
               <>
                  <mesh position={[-width/2 + 3, legsHeight/2, depth/2 - 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 3, legsHeight/2, depth/2 - 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[-width/2 + 3, legsHeight/2, -depth/2 + 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  <mesh position={[width/2 - 3, legsHeight/2, -depth/2 + 5]} castShadow>
                     <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                     <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  {/* Pata central si el ancho es mayor a 60cm */}
                  {width > 60 && (
                     <mesh position={[0, legsHeight/2, 0]} castShadow>
                        <cylinderGeometry args={[1.5, 1.5, legsHeight]} />
                        <meshStandardMaterial color="#111" roughness={0.8} />
                     </mesh>
                  )}
               </>
            )}
            
            {/* Renderizado de Laterales con Rebaje CNC para paso continuo de Riel Gola */}
            {(() => {
               const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
               const renderLateral = (isLeft: boolean) => {
                  const xPos = isLeft ? -width/2 + thickness/2 : width/2 - thickness/2;
                  const key = isLeft ? 'left' : 'right';

                  // Opción A: Botellero con laterales prolongados a escuadra (corte a disco) para enrasar a plomo con puertas/cajones contiguos
                  if (isWineRack) {
                     const wineDepth = depth + thickness;
                     const wineZ = thickness / 2;
                     return (
                        <Board 
                           key={`lat-${key}`}
                           position={[xPos, legsHeight + cabH/2, wineZ]} 
                           args={[thickness, cabH, wineDepth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />
                     );
                  }

                  // Si Gola no está activo o es un lateral exterior visto (extremo de corrida), el lateral se mantiene cerrado y completo al ras
                  const isExposedFlank = isLeft ? !hasNeighborLeft : !hasNeighborRight;
                  if (!isGolaActive || isExposedFlank) {
                     return (
                        <Board 
                           key={`lat-${key}`}
                           position={[xPos, legsHeight + cabH/2, 0]} 
                           args={[thickness, cabH, depth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />
                     );
                  }

                  // Lateral con Gola activo: Destaje CNC para paso continuo del riel Gola L (y Gola C si aplica)
                  const notchDepth = 2.8;
                  const notchLHeight = 5.8;
                  const backDepth = depth - notchDepth;
                  const zBack = -depth/2 + backDepth/2;
                  const zFront = depth/2 - notchDepth/2;

                  let effVariant = variant;
                  if (!effVariant) {
                     effVariant = width > 60 ? '2_doors' : '1_door';
                  }
                  const myHasGolaC = effVariant === '1_door_1_drawer' || effVariant === '2_pot_drawers' || effVariant === '4_drawers';
                  const hasGolaC = myHasGolaC;

                  const effGolaCVariant = effVariant;
                  let yGolaC = 0;
                  if (effGolaCVariant === '1_door_1_drawer') {
                     const drawerH = 14.5;
                     yGolaC = legsHeight + cabH - 3.5 - drawerH - 2.0;
                  } else if (effGolaCVariant === '2_pot_drawers') {
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3);
                     const drawerH = availH / 2;
                     yGolaC = legsHeight + gap + drawerH + 2.0;
                  } else if (effGolaCVariant === '4_drawers') {
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5);
                     const drawerH = availH / 4;
                     yGolaC = legsHeight + gap + (drawerH + gap) * 2 + 2.0;
                  }

                  const notchCHeight = 6.8;

                  return (
                     <group key={`lateral-${key}`}>
                        {/* Cuerpo trasero completo a toda la altura */}
                        <Board 
                           position={[xPos, legsHeight + cabH/2, zBack]} 
                           args={[thickness, cabH, backDepth]} 
                           {...parseColor(cStructure, structureMaterial, key)} 
                        />

                        {/* Cuerpo frontal con rebajes CNC para paso libre y continuo del perfil Gola */}
                        {!hasGolaC ? (
                           <Board 
                              position={[xPos, legsHeight + (cabH - notchLHeight)/2, zFront]} 
                              args={[thickness, cabH - notchLHeight, notchDepth]} 
                              {...parseColor(cStructure, structureMaterial, key)} 
                           />
                        ) : (
                           (() => {
                              const yCBottom = yGolaC - notchCHeight/2;
                              const yCTop = yGolaC + notchCHeight/2;
                              const yLBottom = legsHeight + cabH - notchLHeight;
                              const lowerH = Math.max(2, yCBottom - legsHeight);
                              const middleH = Math.max(2, yLBottom - yCTop);
                              return (
                                 <>
                                    <Board 
                                       position={[xPos, legsHeight + lowerH/2, zFront]} 
                                       args={[thickness, lowerH, notchDepth]} 
                                       {...parseColor(cStructure, structureMaterial, key)} 
                                    />
                                    <Board 
                                       position={[xPos, yCTop + middleH/2, zFront]} 
                                       args={[thickness, middleH, notchDepth]} 
                                       {...parseColor(cStructure, structureMaterial, key)} 
                                    />
                                 </>
                              );
                           })()
                        )}
                     </group>
                  );
               };

               return (
                  <>
                     {renderLateral(true)}
                     {renderLateral(false)}
                  </>
               );
            })()}
            {(() => {
               const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
               const botDepth = isWineRack ? depth + thickness : depth;
               const botZ = isWineRack ? thickness / 2 : 0;
               const isBaseOrIslandCab = type === 'base' || type === 'island';
               const standardBackH = isBaseOrIslandCab ? (cabH - thickness) : (cabH - thickness * 2);
               const standardBackY = isBaseOrIslandCab ? (legsHeight + thickness + standardBackH / 2) : (legsHeight + cabH / 2);
               return (
                  <>
                     <Board position={[0, legsHeight + thickness/2, botZ]} args={[innerW, thickness, botDepth]} {...parseColor(cStructure, structureMaterial, 'bottom')} />
                     {effectiveVariant === 'tall_oven_vent' ? (
                        <>
                           {/* Trasera despensa inferior */}
                           <Board position={[0, legsHeight + (70 - thickness)/2, -depth/2 + thickness/2]} args={[innerW, 70 - thickness, thickness]} {...parseColor(cBack, backMaterial, 'back')} />
                           {/* Trasera despensa superior (el tramo de hornos queda abierto para la chimenea de 50mm) */}
                           {cabH > 170 && (
                              <Board position={[0, legsHeight + 168 + (cabH - 168 - thickness)/2, -depth/2 + thickness/2]} args={[innerW, Math.max(5, cabH - 168 - thickness), thickness]} {...parseColor(cBack, backMaterial, 'back')} />
                           )}
                        </>
                     ) : (
                        <Board position={[0, standardBackY, -depth/2 + thickness/2]} args={[innerW, standardBackH, thickness]} {...parseColor(cBack, backMaterial, 'back')} />
                     )}
                     
                     {/* Uniones estructurales de Base a Laterales */}
                     <AssemblyJoint position={[-innerW/2, legsHeight + thickness/2, botZ]} length={botDepth} axis="z" pointing="right" thickness={thickness} count={2} />
                     <AssemblyJoint position={[innerW/2, legsHeight + thickness/2, botZ]} length={botDepth} axis="z" pointing="left" thickness={thickness} count={2} />
                  </>
               );
            })()}
            {type === 'base' || type === 'island' ? (
               <>
                  {(() => {
                     const isWineRack = variant?.includes('wine_rack') || variant === 'base_wine_rack' || variant === 'wall_wine_rack' || variant === 'tall_wine_rack' || variant === 'island_wine_rack';
                     const frontRailZ = isWineRack ? depth/2 + thickness - 5 : (isGolaActive ? depth/2 - 2.8 - 5 : depth/2 - 5);
                     return (
                        <>
                           <Board 
                              position={[0, height - thickness/2, frontRailZ]} 
                              args={[innerW, thickness, 10]} 
                              {...parseColor(cStructure, structureMaterial, 'top')} 
                           />
                           <Board position={[0, height - 5, -depth/2 + thickness * 1.5]} args={[innerW, 10, thickness]} {...parseColor(cStructure, structureMaterial, 'top')} />
                           {/* Amarres frontales y traseros a laterales */}
                           <AssemblyJoint 
                              position={[-innerW/2, height - thickness/2, frontRailZ]} 
                              length={10} axis="z" pointing="right" thickness={thickness} count={1} 
                           />
                           <AssemblyJoint 
                              position={[innerW/2, height - thickness/2, frontRailZ]} 
                              length={10} axis="z" pointing="left" thickness={thickness} count={1} 
                           />
                        </>
                     );
                  })()}
                  <AssemblyJoint position={[-innerW/2, height - 5, -depth/2 + thickness * 1.5]} length={10} axis="y" pointing="right" thickness={thickness} count={1} />
                  <AssemblyJoint position={[innerW/2, height - 5, -depth/2 + thickness * 1.5]} length={10} axis="y" pointing="left" thickness={thickness} count={1} />
               </>
            ) : (
               <>
                  <Board position={[0, height - thickness/2, 0]} args={[innerW, thickness, depth]} {...parseColor(cStructure, structureMaterial, 'top')} />
                  {/* Techo a laterales */}
                  <AssemblyJoint position={[-innerW/2, height - thickness/2, 0]} length={depth} axis="z" pointing="right" thickness={thickness} count={2} />
                  <AssemblyJoint position={[innerW/2, height - thickness/2, 0]} length={depth} axis="z" pointing="left" thickness={thickness} count={2} />
               </>
            )}
            {renderFronts()}
            {renderCoverPanels()}

            {/* BASTIDOR METÁLICO HOSPITALARIO CONTINUO: Se genera unificado en KitchenHospitalBaseFrame3D */}
            {false && (projectMode === 'hospital' || hospitalBaseType === 'metal_frame') && isBaseOrTall && legsHeight > 5 && (
               <group name="hospital-metal-frame" position={[0, 0, 0]}>
                  {/* Travesaños horizontales superior e inferior del bastidor (Perfil FE 30x50mm en blanco) */}
                  <mesh position={[0, legsHeight - 1.5, depth / 2 - 2.5]}>
                     <boxGeometry args={[width, 3, 5]} />
                     <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, legsHeight - 1.5, -depth / 2 + 2.5]}>
                     <boxGeometry args={[width, 3, 5]} />
                     <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.3} />
                  </mesh>

                  {/* Patas tubulares verticales FE 30x50 con patín regulador */}
                  {[-width / 2 + 2.5, width / 2 - 2.5].map((xP, legIdx) => (
                     <React.Fragment key={`hosp-leg-${legIdx}`}>
                        {/* Pata Frontal */}
                        <group position={[xP, 0, depth / 2 - 2.5]}>
                           <mesh position={[0, legsHeight / 2, 0]}>
                              <boxGeometry args={[3.0, legsHeight, 5.0]} />
                              <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.3} />
                           </mesh>
                           {/* Patín regulador sanitario cilíndrico */}
                           <mesh position={[0, 1.0, 0]}>
                              <cylinderGeometry args={[2.0, 2.0, 1.2, 16]} />
                              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
                           </mesh>
                           <mesh position={[0, 0.2, 0]}>
                              <cylinderGeometry args={[2.4, 2.4, 0.4, 16]} />
                              <meshStandardMaterial color="#334155" roughness={0.7} />
                           </mesh>
                        </group>
                        {/* Pata Trasera */}
                        <group position={[xP, 0, -depth / 2 + 2.5]}>
                           <mesh position={[0, legsHeight / 2, 0]}>
                              <boxGeometry args={[3.0, legsHeight, 5.0]} />
                              <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.3} />
                           </mesh>
                           {/* Patín regulador */}
                           <mesh position={[0, 1.0, 0]}>
                              <cylinderGeometry args={[2.0, 2.0, 1.2, 16]} />
                              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
                           </mesh>
                           <mesh position={[0, 0.2, 0]}>
                              <cylinderGeometry args={[2.4, 2.4, 0.4, 16]} />
                              <meshStandardMaterial color="#334155" roughness={0.7} />
                           </mesh>
                        </group>
                     </React.Fragment>
                  ))}
               </group>
            )}
            </>
            )}
         </group>
      );
   };

   // Renderizado de cotas con el mismo criterio exacto de Closets
   const renderDimensions = () => {
      if (!showDimensions) return null;

      const isCornerBlind = variant?.startsWith('corner_blind') || variant === 'corner_blind' || variant?.startsWith('wall_corner_blind');
      const isWineRack = variant?.includes('wine_rack');
      const doorCount = variant === '2_doors' ? 2 : (variant === '1_door' || variant === 'spice_rack' || isCornerBlind ? 1 : 0);
      const doorW = doorCount === 2 
         ? (width - gap*3) / 2 
         : (variant?.startsWith('wall_corner_blind')
            ? (width - 5.5 - gap*3)
            : (isCornerBlind ? (width - Math.max(35, width/2) - gap*2) : (width - gap*2)));
      const doorH = variant === '1_door_1_drawer' ? cabH - 15 - gap*3 : cabH - gap*2;

      return (
         <group renderOrder={999}>
            {/* --- NIVEL 1 / GLOBAL: Ancho, Alto, Profundidad y Rótulo de Piso --- */}
            {/* Ancho Total (Top Tier) */}
            <group position={[0, height / 2 + 7, depth / 2]}>
               <Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Line points={[[-width / 2, -2.5, 0], [-width / 2, 2.5, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Line points={[[width / 2, -2.5, 0], [width / 2, 2.5, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
               <Text position={[0, 4, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(width.toFixed(1))} cm</Text>
            </group>

            {/* Alto Total (Left Tier) - Solo en extremo libre izquierdo o cuando está seleccionado */}
            {showHeightDimension && (
               <group position={[-width / 2 - 10, 0, depth / 2]}>
                  <Line points={[[0, -height / 2, 0], [0, height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, -height / 2, 0], [2.5, -height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, height / 2, 0], [2.5, height / 2, 0]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Text position={[-4, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(height.toFixed(1))} cm</Text>
               </group>
            )}

            {/* Profundidad Total (Right Tier) - Solo en extremo libre derecho o cuando está seleccionado */}
            {showDepthDimension && (
               <group position={[width / 2 + 10, -height / 2 + 2, 0]}>
                  <Line points={[[0, 0, -depth / 2], [0, 0, depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, 0, -depth / 2], [2.5, 0, -depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Line points={[[-2.5, 0, depth / 2], [2.5, 0, depth / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
                  <Text position={[3, 4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(depth.toFixed(1))} cm</Text>
               </group>
            )}

            {/* Rótulo en el piso - Se muestra cuando está seleccionado o en vista 2D o si es módulo aislado */}
            {(isActive || is2D || (!leftNeighbor && !rightNeighbor)) && (
               <Text 
                  position={[0, -height / 2 + 0.1, depth / 2 + 16]} 
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={6.5} 
                  color="#f97316" 
                  anchorX="center" 
                  anchorY="bottom"
                  outlineWidth={0.5}
                  outlineColor="#000000"
                  material-depthTest={false}
                  material-toneMapped={false}
                  renderOrder={1000}
               >
                  {variant === 'deco_stove' ? 'COCINA FDV 90' :
                   variant === 'deco_fridge' ? 'REFRIGERADOR SBS' :
                   variant === 'deco_plant' ? 'PLANTA INTERIOR' :
                   variant === 'deco_dishwasher' ? 'LAVAVAJILLAS 12C' :
                   variant?.startsWith('wall_corner_blind') ? 'AÉREO ESQUINERO' :
                   variant?.includes('wine_rack') ? 'BOTELLERO' :
                   (variant ? variant.replace(/_/g, ' ').toUpperCase() : type.toUpperCase())}
               </Text>
            )}

            {/* Si es elemento de decoración o electrodoméstico fijo, omitir cotas de carpintería interna */}
            {type === 'decoration' || variant === 'deco_stove' || variant === 'deco_fridge' || variant === 'deco_plant' || variant === 'deco_dishwasher' ? null : (
               <>
                  {/* --- NIVEL >= 2: Cotas de Módulo (Azul) --- */}
                  {dimensionLevel >= 2 && (
               <group position={[0, -height / 2 + (legsHeight > 0 ? legsHeight / 2 : 1.5), depth / 2 + 8]}>
                  <Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Line points={[[-width / 2, -1.5, 0], [-width / 2, 1.5, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Line points={[[width / 2, -1.5, 0], [width / 2, 1.5, 0]]} color="#3b82f6" lineWidth={1.5} depthTest={false} renderOrder={999} />
                  <Text position={[0, 2, 0]} fontSize={5} color="#3b82f6" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Number(width.toFixed(1))} cm</Text>
               </group>
            )}

            {/* --- NIVEL >= 3: Cotas de Puertas (Rosado) --- */}
            {dimensionLevel >= 3 && (doorCount > 0 || variant === '1_door_1_drawer') && (
               <>
                  {isCornerBlind ? (
                     (() => {
                        const isRight = variant !== 'corner_blind_left';
                        const blindW = Math.max(35, width / 2);
                        const cDoorW = width - blindW - gap * 2;
                        const blindX = isRight ? (width / 2 - blindW / 2) : (-width / 2 + blindW / 2);
                        const doorX = isRight ? (-width / 2 + gap + cDoorW / 2) : (width / 2 - gap - cDoorW / 2);
                        return (
                           <>
                              {/* Cota Puerta */}
                              <group position={[doorX, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                                 <Line points={[[-cDoorW / 2, 0, 0], [cDoorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[-cDoorW / 2, -2, 0], [-cDoorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[cDoorW / 2, -2, 0], [cDoorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>Pta {cDoorW.toFixed(1)}</Text>
                              </group>
                              {/* Cota Panel Ciego */}
                              <group position={[blindX, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                                 <Line points={[[-blindW / 2, 0, 0], [blindW / 2, 0, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[-blindW / 2, -2, 0], [-blindW / 2, 2, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Line points={[[blindW / 2, -2, 0], [blindW / 2, 2, 0]]} color="#94a3b8" lineWidth={1.5} depthTest={false} renderOrder={999} />
                                 <Text position={[0, 3, 0]} fontSize={4.5} color="#94a3b8" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>Ciego {blindW.toFixed(1)}</Text>
                              </group>
                           </>
                        );
                     })()
                  ) : doorCount === 2 ? (
                     <>
                        {/* Puerta Izquierda */}
                        <group position={[-width/4, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Puerta Derecha */}
                        <group position={[width/4, -height/2 + legsHeight + cabH/2 + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Alto de Puerta */}
                        {(!leftNeighbor || isActive) && (
                           <group position={[-width / 2 - 5, -height / 2 + legsHeight + cabH/2, frontZ + 2]}>
                              <Line points={[[0, -doorH / 2, 0], [0, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, -doorH / 2, 0], [2, -doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, doorH / 2, 0], [2, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Text position={[-3, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorH.toFixed(1)}</Text>
                           </group>
                        )}
                     </>
                  ) : (
                     <>
                        {/* Ancho Puerta Simple */}
                        <group position={[0, -height/2 + legsHeight + (variant === '1_door_1_drawer' ? gap + doorH/2 : cabH/2) + doorH/2 + 5, frontZ + 2]}>
                           <Line points={[[-doorW / 2, 0, 0], [doorW / 2, 0, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[-doorW / 2, -2, 0], [-doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Line points={[[doorW / 2, -2, 0], [doorW / 2, 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                           <Text position={[0, 3, 0]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorW.toFixed(1)}</Text>
                        </group>
                        {/* Alto Puerta Simple */}
                        {(!leftNeighbor || isActive) && (
                           <group position={[-width / 2 - 5, -height / 2 + legsHeight + (variant === '1_door_1_drawer' ? gap + doorH/2 : cabH/2), frontZ + 2]}>
                              <Line points={[[0, -doorH / 2, 0], [0, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, -doorH / 2, 0], [2, -doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Line points={[[-2, doorH / 2, 0], [2, doorH / 2, 0]]} color="#ec4899" lineWidth={1.5} depthTest={false} renderOrder={999} />
                              <Text position={[-3, 0, 0]} rotation={[0, 0, Math.PI/2]} fontSize={4.5} color="#ec4899" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{doorH.toFixed(1)}</Text>
                           </group>
                        )}
                     </>
                  )}
               </>
            )}

            {/* --- NIVEL >= 4: Cotas de Frentes de Cajón (Verde Esmeralda) --- */}
            {dimensionLevel >= 4 && (() => {
               const drawerFronts: Array<{ yCenter: number; frontH: number }> = [];
               const effVar = effectiveVariant;

               if (effVar === '1_door_1_drawer') {
                  if (isGolaActive) {
                     const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
                     const drawerH = Math.max(8, 14.5 - golaRegruesoDeduct);
                     const yTopFront = legsHeight + cabH - 3.5 - gap - golaRegruesoDeduct;
                     const yBoxCenter = yTopFront - drawerH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yBoxCenter, frontH: drawerH });
                  } else {
                     const deduct = isBaseOrIsland ? regruesoDeduct : 0;
                     const drawerH = Math.max(8, 15 - deduct);
                     const doorH = cabH - 15 - gap * 3;
                     const yBoxCenter = legsHeight + gap * 2 + doorH + drawerH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yBoxCenter, frontH: drawerH });
                  }
               } else if (effVar === '4_drawers') {
                  if (isGolaActive) {
                     const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 5 - golaRegruesoDeduct);
                     const drawerH = availH / 4;
                     for (let i = 0; i < 4; i++) {
                        const yBoxCenter = legsHeight + gap + drawerH / 2 + i * (drawerH + gap) + (i >= 2 ? 4.0 : 0);
                        drawerFronts.push({ yCenter: -height / 2 + yBoxCenter, frontH: drawerH });
                     }
                  } else {
                     const deduct = isBaseOrIsland ? regruesoDeduct : 0;
                     const baseDrawerH = (cabH - gap * 5) / 4;
                     const topDrawerH = Math.max(8, baseDrawerH - deduct);
                     for (let i = 0; i < 4; i++) {
                        const currentH = i === 3 ? topDrawerH : baseDrawerH;
                        const yBoxCenter = i === 3
                           ? legsHeight + gap + 3 * (baseDrawerH + gap) + topDrawerH / 2
                           : legsHeight + gap + baseDrawerH / 2 + i * (baseDrawerH + gap);
                        drawerFronts.push({ yCenter: -height / 2 + yBoxCenter, frontH: currentH });
                     }
                  }
               } else if (effVar === '2_pot_drawers') {
                  if (isGolaActive) {
                     const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3 - golaRegruesoDeduct);
                     const drawerH = availH / 2;
                     const yLower = legsHeight + gap + drawerH / 2;
                     const yUpper = legsHeight + gap + drawerH + 4.0 + gap + drawerH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: drawerH });
                     drawerFronts.push({ yCenter: -height / 2 + yUpper, frontH: drawerH });
                  } else {
                     const deduct = isBaseOrIsland ? regruesoDeduct : 0;
                     const baseH = (cabH - gap * 3) / 2;
                     const lowerH = baseH;
                     const upperH = Math.max(10, baseH - deduct);
                     const yLower = legsHeight + gap + lowerH / 2;
                     const yUpper = legsHeight + gap + lowerH + gap + upperH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: lowerH });
                     drawerFronts.push({ yCenter: -height / 2 + yUpper, frontH: upperH });
                  }
               } else if (effVar === '2_drawers_1_pot') {
                  if (isGolaActive) {
                     const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 4 - golaRegruesoDeduct);
                     const lowerH = availH * 0.5;
                     const upperH = availH * 0.25;
                     const yLower = legsHeight + gap + lowerH / 2;
                     const yMid = legsHeight + gap + lowerH + 4.0 + gap + upperH / 2;
                     const yTop = legsHeight + gap + lowerH + 4.0 + gap + upperH + gap + upperH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: lowerH });
                     drawerFronts.push({ yCenter: -height / 2 + yMid, frontH: upperH });
                     drawerFronts.push({ yCenter: -height / 2 + yTop, frontH: upperH });
                  } else {
                     const deduct = isBaseOrIsland ? regruesoDeduct : 0;
                     const availableH = cabH - gap * 4;
                     const lowerH = Math.round(availableH * 0.5 * 10) / 10;
                     const upperBaseH = (availableH - lowerH) / 2;
                     const topDrawerH = Math.max(8, upperBaseH - deduct);
                     const midDrawerH = upperBaseH;
                     const yLower = legsHeight + gap + lowerH / 2;
                     const yMid = legsHeight + gap + lowerH + gap + midDrawerH / 2;
                     const yTop = legsHeight + gap + lowerH + gap + midDrawerH + gap + topDrawerH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: lowerH });
                     drawerFronts.push({ yCenter: -height / 2 + yMid, frontH: midDrawerH });
                     drawerFronts.push({ yCenter: -height / 2 + yTop, frontH: topDrawerH });
                  }
               } else if (effVar === 'sink_u_drawer') {
                  if (isGolaActive) {
                     const golaRegruesoDeduct = Math.max(0, rawRegruesoCm - 3.5);
                     const availH = Math.max(20, cabH - 3.5 - 4.0 - gap * 3 - golaRegruesoDeduct);
                     const drawerH = availH / 2;
                     const yLower = legsHeight + gap + drawerH / 2;
                     const yUpper = legsHeight + gap + drawerH + 4.0 + gap + drawerH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: drawerH });
                     drawerFronts.push({ yCenter: -height / 2 + yUpper, frontH: drawerH });
                  } else {
                     const deduct = isBaseOrIsland ? regruesoDeduct : 0;
                     const baseH = (cabH - gap * 3) / 2;
                     const lowerH = baseH;
                     const upperH = Math.max(10, baseH - deduct);
                     const yLower = legsHeight + gap + lowerH / 2;
                     const yUpper = legsHeight + gap + lowerH + gap + upperH / 2;
                     drawerFronts.push({ yCenter: -height / 2 + yLower, frontH: lowerH });
                     drawerFronts.push({ yCenter: -height / 2 + yUpper, frontH: upperH });
                  }
               }

               if (drawerFronts.length === 0) return null;

               const isEndCabinet = !rightNeighbor || isActive;
               const posX = isEndCabinet ? (width / 2 + 5) : (width / 2 - 3.5);
               const textOffset = isEndCabinet ? 3.5 : -3.5;
               const textAnchor = isEndCabinet ? 'left' : 'right';

               return (
                  <>
                     {drawerFronts.map((df, idx) => (
                        <group key={`dim-drawer-front-${idx}`} position={[posX, df.yCenter, frontZ + 2]}>
                           <Line points={[[0, -df.frontH / 2, 0], [0, df.frontH / 2, 0]]} color="#10b981" lineWidth={1.6} depthTest={false} renderOrder={999} />
                           <Line points={[[-1.5, -df.frontH / 2, 0], [1.5, -df.frontH / 2, 0]]} color="#10b981" lineWidth={1.6} depthTest={false} renderOrder={999} />
                           <Line points={[[-1.5, df.frontH / 2, 0], [1.5, df.frontH / 2, 0]]} color="#10b981" lineWidth={1.6} depthTest={false} renderOrder={999} />
                           <Text
                              position={[textOffset, 0, 0]}
                              fontSize={4.6}
                              color="#10b981"
                              anchorX={textAnchor}
                              anchorY="middle"
                              material-depthTest={false}
                              material-toneMapped={false}
                              renderOrder={1000}
                           >
                              {df.frontH.toFixed(1)} cm
                           </Text>
                        </group>
                     ))}
                  </>
               );
            })()}

            {/* --- NIVEL >= 4: Cotas de Interiores / Repisas (Morado) --- */}
            {dimensionLevel >= 4 && (
               <group position={[0, -height / 2 + legsHeight + cabH / 2, frontZ + 2]}>
                  <Line points={[[0, -cabH / 4, 0], [0, cabH / 4, 0]]} color="#8b5cf6" lineWidth={1} depthTest={false} renderOrder={999} />
                  <Text position={[3, 0, 0]} fontSize={4} color="#8b5cf6" anchorX="left" anchorY="middle" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{(cabH / 2).toFixed(1)}</Text>
               </group>
            )}

            {/* --- NIVEL >= 5: Identificación BIM de Módulos (N° y Nombre idéntico al Menú de Escena) --- */}
            {dimensionLevel >= 5 && cabinetIndex >= 0 && !isActive && (
               <group position={[0, height / 2 + 10, 0]} renderOrder={1000}>
                  {/* Línea conectora hacia la cubierta / cuerpo del mueble */}
                  <Line points={[[0, 0, 0], [0, -8, 0]]} color="#38bdf8" lineWidth={1.6} dashed dashScale={1} depthTest={false} renderOrder={999} />

                  {/* Badge Flotante con Orientación Billboard hacia la Cámara */}
                  <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                     {(() => {
                        const cabLabel = getCabinetLabel({ type, variant, width, height, depth }, cabinetIndex);
                        const fullText = `MOD ${cabinetIndex + 1} • ${cabLabel}`;
                        const badgeW = Math.max(30, fullText.length * 2.3 + 8);
                        return (
                           <group>
                              {/* Placa de fondo de alto contraste */}
                              <mesh position={[0, 0, -0.05]} renderOrder={999}>
                                 <planeGeometry args={[badgeW, 9]} />
                                 <meshBasicMaterial color="#1e293b" transparent opacity={0.92} depthTest={false} />
                              </mesh>

                              {/* Borde perimetral técnico */}
                              <Line
                                 points={[
                                    [-badgeW / 2, -4.5, 0], [badgeW / 2, -4.5, 0],
                                    [badgeW / 2, 4.5, 0], [-badgeW / 2, 4.5, 0],
                                    [-badgeW / 2, -4.5, 0]
                                 ]}
                                 color="#0284c7"
                                 lineWidth={1.8}
                                 depthTest={false}
                                 renderOrder={1000}
                              />

                              {/* Texto Identificador Exacto del Menú de Escena */}
                              <Text
                                 position={[0, 0, 0.05]}
                                 fontSize={4.6}
                                 color="#f8fafc"
                                 anchorX="center"
                                 anchorY="middle"
                                 fontWeight="bold"
                                 outlineWidth={0.4}
                                 outlineColor="#000000"
                                 material-depthTest={false}
                                 material-toneMapped={false}
                                 renderOrder={1001}
                              >
                                 {fullText}
                              </Text>
                           </group>
                        );
                     })()}
                  </Billboard>
               </group>
            )}
            </>
            )}
         </group>
      );
   };

   const isDecoration = type === 'decoration' || variant?.startsWith('deco_');

   const renderSelectionHighlight = () => {
      if (!isActive) return null;
      const highlightColor = isDecoration ? "#38bdf8" : "#f97316";
      const glowColor = isDecoration ? "#0284c7" : "#ea580c";
      const badgeTextColor = isDecoration ? "#38bdf8" : "#fb923c";

      const hw = width / 2;
      const hh = height / 2;
      const hd = depth / 2;
      const bracketLen = Math.max(3, Math.min(8, width * 0.18, height * 0.18, depth * 0.18));

      // 8 esquinas para vértices CAD
      const corners: [number, number, number][] = [
        [-hw, -hh, -hd],
        [hw, -hh, -hd],
        [-hw, hh, -hd],
        [hw, hh, -hd],
        [-hw, -hh, hd],
        [hw, -hh, hd],
        [-hw, hh, hd],
        [hw, hh, hd],
      ];

      return (
        <group name="active-cabinet-highlight" renderOrder={950}>
          {/* 1. Volumetría translúcida envolvente con aristas definidas */}
          <mesh renderOrder={950}>
            <boxGeometry args={[width + 0.8, height + 0.8, depth + 0.8]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.16}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
            <Edges scale={1.0} color={highlightColor} threshold={15} renderOrder={951} />
          </mesh>

          {/* 2. Vértices / Brackets CAD 3D en las 8 esquinas */}
          {corners.map(([cx, cy, cz], idx) => {
            const sx = cx < 0 ? 1 : -1;
            const sy = cy < 0 ? 1 : -1;
            const sz = cz < 0 ? 1 : -1;
            return (
              <group key={`bracket-${idx}`} position={[cx, cy, cz]} renderOrder={999}>
                <Line
                  points={[[0, 0, 0], [sx * bracketLen, 0, 0]]}
                  color={highlightColor}
                  lineWidth={3.5}
                  depthTest={false}
                  renderOrder={1000}
                />
                <Line
                  points={[[0, 0, 0], [0, sy * bracketLen, 0]]}
                  color={highlightColor}
                  lineWidth={3.5}
                  depthTest={false}
                  renderOrder={1000}
                />
                <Line
                  points={[[0, 0, 0], [0, 0, sz * bracketLen]]}
                  color={highlightColor}
                  lineWidth={3.5}
                  depthTest={false}
                  renderOrder={1000}
                />
              </group>
            );
          })}

          {/* 3. Huella proyectada en piso (Ground Footprint / Halo) */}
          <group position={[0, -height / 2 + 0.15, 0]} renderOrder={960}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={960}>
              <planeGeometry args={[width + 3, depth + 3]} />
              <meshBasicMaterial
                color={highlightColor}
                transparent
                opacity={0.24}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Line
              points={[
                [-hw - 1.5, 0, -hd - 1.5],
                [hw + 1.5, 0, -hd - 1.5],
                [hw + 1.5, 0, hd + 1.5],
                [-hw - 1.5, 0, hd + 1.5],
                [-hw - 1.5, 0, -hd - 1.5],
              ]}
              color={highlightColor}
              lineWidth={2.6}
              depthTest={false}
              renderOrder={962}
            />
            {[
              [-hw - 1.5, -hd - 1.5],
              [hw + 1.5, -hd - 1.5],
              [hw + 1.5, hd + 1.5],
              [-hw - 1.5, hd + 1.5],
            ].map(([px, pz], pIdx) => (
              <group key={`floor-cross-${pIdx}`} position={[px, 0.05, pz]}>
                <Line points={[[-2, 0, 0], [2, 0, 0]]} color="#ffffff" lineWidth={2} depthTest={false} renderOrder={965} />
                <Line points={[[0, 0, -2], [0, 0, 2]]} color="#ffffff" lineWidth={2} depthTest={false} renderOrder={965} />
              </group>
            ))}
          </group>

          {/* 4. Badge Flotante "MÓDULO ACTIVO" con dimensiones */}
          {cabinetIndex >= 0 && (
            <group position={[0, height / 2 + 12, 0]} renderOrder={1005}>
              <Line
                points={[[0, 0, 0], [0, -10, 0]]}
                color={highlightColor}
                lineWidth={2}
                dashed
                dashScale={1.2}
                depthTest={false}
                renderOrder={1004}
              />
              <Billboard follow={true}>
                {(() => {
                  const cabLabel = getCabinetLabel({ type, variant, width, height, depth }, cabinetIndex);
                  const headerText = `MOD ${cabinetIndex + 1} • ${cabLabel}`;
                  const dimText = `${width.toFixed(0)} × ${height.toFixed(0)} × ${depth.toFixed(0)} cm`;
                  const badgeW = Math.max(34, Math.max(headerText.length, dimText.length) * 2.2 + 8);
                  return (
                    <group>
                      <mesh position={[0, 0, -0.05]} renderOrder={1004}>
                        <planeGeometry args={[badgeW, 12]} />
                        <meshBasicMaterial color="#090d16" transparent opacity={0.94} depthTest={false} />
                      </mesh>
                      <Line
                        points={[
                          [-badgeW / 2, -6, 0],
                          [badgeW / 2, -6, 0],
                          [badgeW / 2, 6, 0],
                          [-badgeW / 2, 6, 0],
                          [-badgeW / 2, -6, 0],
                        ]}
                        color={highlightColor}
                        lineWidth={2.2}
                        depthTest={false}
                        renderOrder={1005}
                      />
                      <Text
                        position={[0, 2.2, 0.05]}
                        fontSize={4.4}
                        color={badgeTextColor}
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        outlineWidth={0.4}
                        outlineColor="#000000"
                        material-depthTest={false}
                        material-toneMapped={false}
                        renderOrder={1006}
                      >
                        {headerText}
                      </Text>
                      <Text
                        position={[0, -2.5, 0.05]}
                        fontSize={3.5}
                        color="#e2e8f0"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.3}
                        outlineColor="#000000"
                        material-depthTest={false}
                        material-toneMapped={false}
                        renderOrder={1006}
                      >
                        {dimText}
                      </Text>
                    </group>
                  );
                })()}
              </Billboard>
            </group>
          )}
        </group>
      );
   };

   return (
     <group
       position={safePos}
       rotation={[0, safeRot, 0]}
       onPointerDown={(e) => {
          if (e.button !== 0) return;
          const currentTool = useKitchenStore.getState().toolMode;
          if (currentTool.startsWith('place_') || currentTool === 'move_active') {
            return;
          }
          e.stopPropagation();
          setActiveCabinet(id);
          setDraggingCabinetId(id);
        }}
        onPointerUp={(e) => {
          const currentDragging = useKitchenStore.getState().draggingCabinetId;
          if (currentDragging === id) {
            setDraggingCabinetId(null);
          }
        }}
     >
       {renderParametricBody()}
       {renderSelectionHighlight()}
       {renderDimensions()}
     </group>
   );
}
