import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useKitchenStore, CabinetType } from '../../store/kitchenStore';
import { detectContinuousCabinetRuns, ContinuousRunInfo } from '../../utils/countertopNesting';

/**
 * BASTIDOR METÁLICO HOSPITALARIO CONTINUO UNIFICADO (Norma MC.2.02 SACYR)
 * 
 * Reemplaza las estructuras de patas individuales por un único bastidor de acero tubular
 * continuo autoportante (FE 30x50x1.5mm esmaltado blanco al horno):
 * - Largueros longitudinales continuos frontales y traseros.
 * - Travesaños transversales en los extremos y debajo de cada junta entre cascos.
 * - Patas verticales compartidas con patín regulador sanitario M10 a 300mm del suelo,
 *   eliminando por completo las patas duplicadas en las uniones.
 */
export function KitchenHospitalBaseFrame3D() {
  const {
    projectMode,
    hospitalBaseType,
    hospitalFrameFinish = 'white',
    cabinets,
    socleHeight,
    countertopConfig,
    walls,
    architecturalElements,
    roomConfig,
  } = useKitchenStore();

  const isHospital = projectMode === 'hospital' || hospitalBaseType === 'metal_frame';

  const frameMaterialProps = useMemo(() => {
    switch (hospitalFrameFinish) {
      case 'inox':
        return { color: '#e2e8f0', metalness: 0.45, roughness: 0.25 };
      case 'white':
        return { color: '#ffffff', metalness: 0.05, roughness: 0.25 };
      case 'light_gray':
        return { color: '#cbd5e1', metalness: 0.1, roughness: 0.35 };
      case 'black':
        return { color: '#1e293b', metalness: 0.15, roughness: 0.45 };
      default:
        return { color: '#ffffff', metalness: 0.05, roughness: 0.25 };
    }
  }, [hospitalFrameFinish]);

  const baseCabinets = useMemo(() => {
    if (!isHospital) return [];
    return cabinets.filter(
      (c) => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_')
    );
  }, [isHospital, cabinets]);

  // Detección unificada de corridas continuas
  const runs: ContinuousRunInfo[] = useMemo(() => {
    if (!isHospital || baseCabinets.length === 0) return [];
    return detectContinuousCabinetRuns(
      baseCabinets,
      countertopConfig,
      walls,
      architecturalElements,
      roomConfig
    );
  }, [isHospital, baseCabinets, countertopConfig, walls, architecturalElements, roomConfig]);

  if (!isHospital || baseCabinets.length === 0 || runs.length === 0) {
    return null;
  }

  const legsHeight = socleHeight || 30; // 30cm = 300mm libres norma hospitalaria MC.2.02

  return (
    <group name="hospital-continuous-base-chassis">
      {runs.map((run) => {
        const totalLengthCm = run.totalLengthMm / 10;
        const depthCm = run.depthMm / 10;
        const centerPos: [number, number, number] = [
          run.centerWorld[0],
          0,
          run.centerWorld[2],
        ];
        const rotY = run.rotation || 0;

        // Criterio normativo de cantidad de patas por largo total continuo (independiente de cantidad de gabinetes):
        // < 900 mm: 2 pórticos
        // 901 - 1900 mm: 3 pórticos
        // 1901 - 2500 mm: 4 pórticos
        // > 2500 mm: vanos máximos de 800mm
        const totalMm = run.totalLengthMm;
        let numLegs = 2;
        if (totalMm <= 900) {
          numLegs = 2;
        } else if (totalMm <= 1900) {
          numLegs = 3;
        } else if (totalMm <= 2500) {
          numLegs = 4;
        } else {
          numLegs = 4 + Math.ceil((totalMm - 2500) / 800);
        }

        // Posiciones equidistantes a lo largo del bastidor
        const startX = -totalLengthCm / 2 + 2.5;
        const endX = totalLengthCm / 2 - 2.5;
        const legXPositions: number[] = [];
        for (let i = 0; i < numLegs; i++) {
          legXPositions.push(startX + ((endX - startX) * i) / (numLegs - 1));
        }

        // Travesaños transversales de refuerzo ubicados en cada eje de pata y en los extremos
        const crossbarXPositions = legXPositions;

        // Altura del fuste vertical de la pata (descontando el perfil superior de 3cm y el patín de 1.4cm)
        const footHeight = 1.4;
        const upperBeamBottom = Math.max(footHeight + 5, legsHeight - 3.0);
        const postH = upperBeamBottom - footHeight;
        const postCenterY = footHeight + postH / 2;

        return (
          <group
            key={`hosp-frame-run-${run.id}`}
            position={centerPos}
            rotation={[0, rotY, 0]}
          >
            {/* 1. LARGUERO LONGITUDINAL FRONTAL CONTINUO (FE 30x50mm) */}
            <mesh position={[0, legsHeight - 1.5, depthCm / 2 - 2.5]}>
              <boxGeometry args={[totalLengthCm, 3.0, 5.0]} />
              <meshStandardMaterial
                {...frameMaterialProps}
              />
            </mesh>

            {/* 2. LARGUERO LONGITUDINAL TRASERO CONTINUO (FE 30x50mm) */}
            <mesh position={[0, legsHeight - 1.5, -depthCm / 2 + 2.5]}>
              <boxGeometry args={[totalLengthCm, 3.0, 5.0]} />
              <meshStandardMaterial
                {...frameMaterialProps}
              />
            </mesh>

            {/* 3. TRAVESAÑOS TRANSVERSALES DE AMARRE (En extremos y bajo las juntas de cascos) */}
            {crossbarXPositions.map((cbX, cbIdx) => (
              <mesh
                key={`hosp-cb-${cbIdx}`}
                position={[cbX, legsHeight - 1.5, 0]}
              >
                <boxGeometry args={[3.0, 3.0, Math.max(10, depthCm - 5.0)]} />
                <meshStandardMaterial
                  {...frameMaterialProps}
                />
              </mesh>
            ))}

            {/* 4. PATAS VERTICALES COMPARTIDAS CON PATÍN REGULADOR SANITARIO M10 */}
            {legXPositions.map((legX, legIdx) => (
              <React.Fragment key={`hosp-leg-pair-${legIdx}`}>
                {/* Pata Frontal */}
                <group position={[legX, 0, depthCm / 2 - 2.5]}>
                  {/* Fuste de acero FE 30x50mm */}
                  <mesh position={[0, postCenterY, 0]}>
                    <boxGeometry args={[3.0, postH, 5.0]} />
                    <meshStandardMaterial
                      {...frameMaterialProps}
                    />
                  </mesh>
                  {/* Collarín metálico del patín regulador */}
                  <mesh position={[0, 0.9, 0]}>
                    <cylinderGeometry args={[2.0, 2.0, 1.0, 16]} />
                    <meshStandardMaterial
                      color="#cbd5e1"
                      metalness={0.9}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Base de apoyo sanitario de goma antideslizante */}
                  <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[2.4, 2.4, 0.4, 16]} />
                    <meshStandardMaterial
                      color="#334155"
                      roughness={0.8}
                    />
                  </mesh>
                </group>

                {/* Pata Trasera */}
                <group position={[legX, 0, -depthCm / 2 + 2.5]}>
                  {/* Fuste de acero FE 30x50mm */}
                  <mesh position={[0, postCenterY, 0]}>
                    <boxGeometry args={[3.0, postH, 5.0]} />
                    <meshStandardMaterial
                      {...frameMaterialProps}
                    />
                  </mesh>
                  {/* Collarín metálico del patín regulador */}
                  <mesh position={[0, 0.9, 0]}>
                    <cylinderGeometry args={[2.0, 2.0, 1.0, 16]} />
                    <meshStandardMaterial
                      color="#cbd5e1"
                      metalness={0.9}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Base de apoyo sanitario */}
                  <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[2.4, 2.4, 0.4, 16]} />
                    <meshStandardMaterial
                      color="#334155"
                      roughness={0.8}
                    />
                  </mesh>
                </group>
              </React.Fragment>
            ))}
          </group>
        );
      })}
    </group>
  );
}
