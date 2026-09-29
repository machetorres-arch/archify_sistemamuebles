import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WallType, useKitchenStore } from '../../store/kitchenStore';
import { useStore } from '../../store';
import { Edges, Line, Text } from '@react-three/drei';
import { getWallInwardNormal } from '../../utils/kitchenCollision';
import { ArchitecturalDoor } from './ArchitecturalDoor';
import { ArchitecturalWindow } from './ArchitecturalWindow';

export function Wall({ id, start, end, thickness, height }: WallType & { id?: string }) {
   const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
   const cx = (start[0] + end[0]) / 2;
   const cz = (start[1] + end[1]) / 2;
   const rotY = Math.atan2(start[0] - end[0], start[1] - end[1]);
   const showDimensions = useStore((s) => s.showDimensions);
   const wallColor = useKitchenStore((s) => s.wallColor) || '#E2E8F0';
   const viewMode = useKitchenStore((s) => s.viewMode);
   const roomConfig = useKitchenStore((s) => s.roomConfig);
   const architecturalElements = useKitchenStore((s) => s.architecturalElements);
   const activeArchElementId = useKitchenStore((s) => s.activeArchElementId);
   const setActiveArchElement = useKitchenStore((s) => s.setActiveArchElement);
   const setDraggingArchElementId = useKitchenStore((s) => s.setDraggingArchElementId);
   const toolMode = useKitchenStore((s) => s.toolMode);

   const groupRef = useRef<THREE.Group>(null);
   const wallBodyRef = useRef<THREE.Group>(null);

   const wallElements = useMemo(() => {
      return architecturalElements.filter(el => {
         if (id && (el.wallId === id || el.wallId === `wall_${id}` || `wall_${el.wallId}` === id)) return true;
         const dist = Math.hypot(el.position[0] - cx, el.position[2] - cz);
         return !el.wallId && dist < length / 2 + 30;
      });
   }, [architecturalElements, id, cx, cz, length]);

   const wallOpenings = useMemo(() => {
      return wallElements.filter(el => el.type === 'door' || el.type === 'window');
   }, [wallElements]);

   const wallSegments = useMemo(() => {
      if (wallOpenings.length === 0) return null;

      const effectiveColor = viewMode === '2d' ? '#334155' : wallColor;
      const effectiveEdgeColor = viewMode === '2d' ? '#0f172a' : '#94a3b8';

      // Sort openings along local Z (centerZ = -offset)
      const sorted = [...wallOpenings]
         .map(el => {
            const centerZ = -(el.offset || 0);
            const halfW = el.width / 2;
            return {
               el,
               centerZ,
               halfW,
               zStart: Math.max(-length / 2, centerZ - halfW),
               zEnd: Math.min(length / 2, centerZ + halfW),
               elev: el.elevation || 0,
               openingH: el.height,
            };
         })
         .sort((a, b) => a.zStart - b.zStart);

      const elements: React.ReactNode[] = [];
      let currentZ = -length / 2;

      sorted.forEach((op, idx) => {
         // Solid wall segment before opening
         if (op.zStart > currentZ + 0.1) {
            const segLen = op.zStart - currentZ;
            const segCenterZ = currentZ + segLen / 2;
            elements.push(
               <mesh key={`solid-${idx}`} position={[0, 0, segCenterZ]} castShadow receiveShadow>
                  <boxGeometry args={[thickness, height, segLen]} />
                  <meshStandardMaterial color={effectiveColor} roughness={0.85} metalness={0.05} />
                  <Edges scale={1} threshold={15} color={effectiveEdgeColor} />
               </mesh>
            );
         }

         // Under window sill (antepecho)
         const opLen = op.zEnd - Math.max(currentZ, op.zStart);
         if (opLen > 0.1) {
            const opCenterZ = (Math.max(currentZ, op.zStart) + op.zEnd) / 2;

            if (op.el.type === 'window' && op.elev > 0.1) {
               elements.push(
                  <mesh key={`under-${idx}`} position={[0, -height / 2 + op.elev / 2, opCenterZ]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, op.elev, opLen]} />
                     <meshStandardMaterial color={effectiveColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color={effectiveEdgeColor} />
                  </mesh>
               );
            }

            // Above door/window lintel (dintel)
            const topSpace = height - (op.elev + op.openingH);
            if (topSpace > 0.1) {
               elements.push(
                  <mesh key={`over-${idx}`} position={[0, height / 2 - topSpace / 2, opCenterZ]} castShadow receiveShadow>
                     <boxGeometry args={[thickness, topSpace, opLen]} />
                     <meshStandardMaterial color={effectiveColor} roughness={0.85} metalness={0.05} />
                     <Edges scale={1} threshold={15} color={effectiveEdgeColor} />
                  </mesh>
               );
            }
         }

         currentZ = Math.max(currentZ, op.zEnd);
      });

      // Tail solid wall segment
      if (currentZ < length / 2 - 0.1) {
         const segLen = length / 2 - currentZ;
         const segCenterZ = currentZ + segLen / 2;
         elements.push(
            <mesh key="solid-tail" position={[0, 0, segCenterZ]} castShadow receiveShadow>
               <boxGeometry args={[thickness, height, segLen]} />
               <meshStandardMaterial color={effectiveColor} roughness={0.85} metalness={0.05} />
               <Edges scale={1} threshold={15} color={effectiveEdgeColor} />
            </mesh>
         );
      }

      return elements;
   }, [wallOpenings, length, thickness, height, wallColor, viewMode]);

   // Vector normal hacia el interior de la habitación
   const inwardNormal = useMemo(() => {
      const poly = roomConfig?.vertices?.map(v => [v.x, v.y] as [number, number]) || [];
      return getWallInwardNormal(start[0], start[1], end[0], end[1], poly);
   }, [start, end, roomConfig]);

   // Ocultación dinámica inteligente (Camera Occlusion / Cutaway Wall)
   useFrame(({ camera }) => {
      if (!wallBodyRef.current) return;
      
      if (viewMode === '2d') {
         wallBodyRef.current.visible = true;
         return;
      }

      const camX = camera.position.x;
      const camZ = camera.position.z;
      const vCamX = camX - cx;
      const vCamZ = camZ - cz;

      const dot = vCamX * inwardNormal[0] + vCamZ * inwardNormal[1];
      wallBodyRef.current.visible = dot > -5;
   });

   return (
     <group ref={groupRef} name="wallGroup" position={[cx, height/2, cz]} rotation={[0, rotY, 0]}>
       <group ref={wallBodyRef} name="wallBodyGroup">
         {wallOpenings.length === 0 ? (
           <mesh name="wall" castShadow receiveShadow>
             <boxGeometry args={[thickness, height, length]} />
             <meshStandardMaterial color={viewMode === '2d' ? '#334155' : wallColor} roughness={0.85} metalness={0.05} />
             <Edges scale={1} threshold={15} color={viewMode === '2d' ? '#0f172a' : '#94a3b8'} />
           </mesh>
         ) : (
           <group name="segmentedWall">
             {wallSegments}
           </group>
         )}
       </group>

       {wallElements.map((el) => {
         if (toolMode === 'move_active' && el.id === activeArchElementId) return null;
         const isSelected = el.id === activeArchElementId;
         const yLocal = el.elevation + el.height / 2 - height / 2;
         const zLocal = el.offset !== undefined ? -el.offset : 0;
         const elDepth = el.type === 'pillar' ? (el.depth ?? thickness) : thickness;
         const inwardSign = (-(end[1] - start[1]) * inwardNormal[0] + (end[0] - start[0]) * inwardNormal[1]) >= 0 ? 1 : -1;
         const pillarZ = el.type === 'pillar' ? (inwardSign * (elDepth - thickness) / 2) : 0;

         return (
           <group
             key={el.id}
             position={[pillarZ, yLocal, zLocal]}
             rotation={[0, Math.PI / 2, 0]}
             onClick={(e) => {
               e.stopPropagation();
               setActiveArchElement(el.id);
             }}
             onPointerDown={(e) => {
               e.stopPropagation();
               if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                 e.nativeEvent.stopImmediatePropagation();
               }
               setActiveArchElement(el.id);
               setDraggingArchElementId(el.id);
             }}
            >
              {el.type === 'door' && (
                <ArchitecturalDoor
                  width={el.width}
                  height={el.height}
                  depth={elDepth}
                  isSelected={isSelected}
                  viewMode={viewMode}
                  isOpen={el.isOpen}
                  hingeSide={el.hingeSide}
                />
              )}
             {el.type === 'window' && (
               <ArchitecturalWindow
                 width={el.width}
                 height={el.height}
                 depth={elDepth}
                 isSelected={isSelected}
                 viewMode={viewMode}
                 isOpen={el.isOpen}
               />
             )}

             {el.type === 'pillar' && (
               <group name="archRealPillar">
                 <mesh castShadow receiveShadow position={[0, 0, pillarZ]}>
                   <boxGeometry args={[el.width, el.height, elDepth]} />
                   <meshStandardMaterial color={wallColor || '#cbd5e1'} roughness={0.7} metalness={0.05} />
                   <Edges scale={1} threshold={15} color={isSelected ? '#0284c7' : '#64748b'} />
                 </mesh>

                  {/* Representacion 2D de Pilar: Aspa estructural en X */}
                  {viewMode === "2d" && (
                    <group renderOrder={1005} position={[0, el.height / 2 + 2, pillarZ]}>
                      <Line points={[[-el.width / 2, 0, -elDepth / 2], [el.width / 2, 0, elDepth / 2]]} color="#64748b" lineWidth={1.5} depthTest={false} material-toneMapped={false} />
                      <Line points={[[-el.width / 2, 0, elDepth / 2], [el.width / 2, 0, -elDepth / 2]]} color="#64748b" lineWidth={1.5} depthTest={false} material-toneMapped={false} />
                    </group>
                  )}
               </group>
             )}

             {isSelected && (
               <group position={[0, -el.height / 2 + 0.5, pillarZ]}>
                 <mesh position={[0, 0, (elDepth + 1.6) / 2]}>
                   <boxGeometry args={[el.width + 2, 0.4, 0.8]} />
                   <meshBasicMaterial color="#0284c7" />
                 </mesh>
                 <mesh position={[0, 0, -(elDepth + 1.6) / 2]}>
                   <boxGeometry args={[el.width + 2, 0.4, 0.8]} />
                   <meshBasicMaterial color="#0284c7" />
                 </mesh>
                 <mesh position={[-(el.width + 1.6) / 2, 0, 0]}>
                   <boxGeometry args={[0.8, 0.4, elDepth + 0.8]} />
                   <meshBasicMaterial color="#0284c7" />
                 </mesh>
                 <mesh position={[(el.width + 1.6) / 2, 0, 0]}>
                   <boxGeometry args={[0.8, 0.4, elDepth + 0.8]} />
                   <meshBasicMaterial color="#0284c7" />
                 </mesh>
               </group>
             )}
           </group>
         );
       })}

       {showDimensions && (
         <group position={[0, height / 2 + 10, 0]} renderOrder={999}>
           <Line points={[[0, 0, -length / 2], [0, 0, length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Line points={[[-3, 0, -length / 2], [3, 0, -length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Line points={[[-3, 0, length / 2], [3, 0, length / 2]]} color="#f97316" lineWidth={2} depthTest={false} renderOrder={999} />
           <Text position={[0, 4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={7} color="#f97316" anchorX="center" anchorY="bottom" material-depthTest={false} material-toneMapped={false} renderOrder={1000}>{Math.round(length)} cm</Text>
         </group>
       )}
     </group>
   );
}
