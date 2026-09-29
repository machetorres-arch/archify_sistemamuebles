import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { useKitchenStore } from '../store/kitchenStore';
import { DoubleSide } from 'three';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface BoardProps {
  textureUrl?: string;
  materialType?: 'melamina' | 'hpl';
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
  transparent?: boolean;
  opacity?: number;
  isFrontPanel?: boolean; // NUEVO: Identificador de veta continua
  grainDirection?: 'vertical' | 'horizontal';
  hplBalancerOverride?: boolean;
  globalPosition?: [number, number, number];
}

export function Board({ position, args, color, textureUrl, materialType, transparent, opacity, isFrontPanel, grainDirection, hplBalancerOverride, globalPosition }: BoardProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  // Obtenemos módulos para saber el ancho total del mueble y anclar la textura globalmente (World-Space)
  const closetModules = useStore(state => state.modules);
  const kitchenCabinets = useKitchenStore(state => state.cabinets);
  const totalWidth = closetModules.length > 0 
    ? closetModules.reduce((sum, m) => sum + m.width, 0)
    : kitchenCabinets.reduce((sum, m) => sum + m.width, 0);

  useEffect(() => {
    let currentTexture: THREE.Texture | null = null;
    let isActive = true;

    if (textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(textureUrl, (tex) => {
        if (!isActive) {
          tex.dispose();
          return;
        }
        
        const clonedTex = tex.clone();
        clonedTex.wrapS = THREE.MirroredRepeatWrapping;
        clonedTex.wrapT = THREE.MirroredRepeatWrapping;
        
        const img = clonedTex.image;
        const imgAspect = img && img.width > 0 ? (img.height / img.width) : 1;
        
        const realWidthCm = materialType === "hpl" ? 120 : 100;
        const realHeightCm = realWidthCm * imgAspect;
        
        let mapWidth = args[0];
        let mapHeight = args[1];
        
        if (args[2] > args[1] && args[0] > args[1]) {
           mapWidth = args[0];
           mapHeight = args[2];
        }
        
        if (args[2] > args[0] && args[1] > args[0]) {
           mapWidth = args[2];
           mapHeight = args[1];
        }

        clonedTex.repeat.set(mapWidth / realWidthCm, mapHeight / realHeightCm);
        
        if (materialType === "hpl" && isFrontPanel) {
          
          // For closet, it is -totalWidth / 2. For kitchen, maybe we can just use a fixed 0, 
          // or find the min X of all cabinets.
          let closetLeftX = -totalWidth / 2;
          if (kitchenCabinets.length > 0 && closetModules.length === 0) {
             const minX = Math.min(...kitchenCabinets.map(c => (c.position?.[0] ?? 0) - c.width/2));
             closetLeftX = isFinite(minX) ? minX : -totalWidth / 2;
          }

          const closetBottomY = 10;
          const actualX = globalPosition ? globalPosition[0] : position[0];
          const actualY = globalPosition ? globalPosition[1] : position[1];
          const boardLeftX = actualX - args[0] / 2;
          const boardBottomY = actualY - args[1] / 2;
          const offsetX = (boardLeftX - closetLeftX) / realWidthCm;
          const offsetY = (boardBottomY - closetBottomY) / realHeightCm;
          clonedTex.offset.set(offsetX, offsetY);
        } else if (materialType === "hpl" && mapWidth > mapHeight) {
           clonedTex.rotation = Math.PI / 2;
        }

        if (grainDirection === "horizontal") {
           clonedTex.rotation = Math.PI / 2;
           clonedTex.center.set(0.5, 0.5);
           clonedTex.repeat.set(mapHeight / realWidthCm, mapWidth / realHeightCm);
        }

        clonedTex.needsUpdate = true;
        
        setTexture((prev) => {
          if (prev) prev.dispose();
          return clonedTex;
        });
        currentTexture = clonedTex;
      });
    } else {
      setTexture((prev) => {
        if (prev) prev.dispose();
        return null;
      });
    }

    return () => {
      isActive = false;
      if (currentTexture) currentTexture.dispose();
    };
  }, [textureUrl, materialType, args[0], args[1], args[2], position[0], position[1], position[2], totalWidth, isFrontPanel, grainDirection, globalPosition]);

  const storeColor = useStore((state) => state.structureColor);
  const isTransparentGlobal = useStore((state) => state.isTransparent);
  
  const finalColor = color || storeColor;
  const isTransp = transparent || isTransparentGlobal;
  const currentOpacity = isTransparentGlobal ? 0.3 : (opacity !== undefined ? opacity : 1);

  
  const storeHplBalancer = useStore((state) => state.hplBalancer);
  const hplBalancer = hplBalancerOverride !== undefined ? hplBalancerOverride : storeHplBalancer;
  
  // Create array of 6 materials
  const baseMatProps = {
    color: texture ? '#ffffff' : finalColor,
    map: texture,
    side: DoubleSide,
    transparent: isTransp,
    opacity: currentOpacity,
    roughness: 0.8,
    depthWrite: !isTransp,
  };

  const whiteMatProps = {
    color: '#ffffff',
    map: null,
    side: DoubleSide,
    transparent: isTransp,
    opacity: currentOpacity,
    roughness: 0.8,
    depthWrite: !isTransp,
  };

  let trascaraFace = -1;
  
  if (materialType === 'hpl' && hplBalancer) {
    // Heuristic to find the inner face
    if (args[0] < args[1] && args[0] < args[2]) {
      // Side wall (thickness along X)
      trascaraFace = position[0] < 0 ? 0 : 1; // Left side inner is +X (0), right side inner is -X (1)
    } else if (args[1] < args[0] && args[1] < args[2]) {
      // Horizontal panel (thickness along Y)
      // Height is usually ~200. Center is ~100.
      trascaraFace = position[1] > 100 ? 3 : 2; // Top panel inner is -Y (3), bottom panel inner is +Y (2)
    } else if (args[2] < args[0] && args[2] < args[1]) {
      // Front/Back panel (thickness along Z)
      trascaraFace = position[2] > 0 ? 5 : 4; // Front door inner is -Z (5), back panel inner is +Z (4)
    }
    
    // Override for doors/fronts if they use isFrontPanel
    if (isFrontPanel) {
      trascaraFace = 5;
    }
  }

  const faces = [0, 1, 2, 3, 4, 5];
  
  return (
    <mesh position={position} castShadow={!isTransp} receiveShadow={!isTransp}>
      <boxGeometry args={args} />
      {faces.map((idx) => {
        const props = idx === trascaraFace ? whiteMatProps : baseMatProps;
        return (
          <meshStandardMaterial 
            key={`${idx}-${texture ? texture.uuid : (props.color || 'solid')}-${idx === trascaraFace}`}
            attach={`material-${idx}`}
            color={props.color}
            map={props.map}
            side={props.side}
            transparent={props.transparent}
            opacity={props.opacity}
            roughness={props.roughness}
            depthWrite={props.depthWrite}
          />
        );
      })}
      {isTransparentGlobal && <Edges scale={1} threshold={15} color="#555555" />}
    </mesh>
  );
}
