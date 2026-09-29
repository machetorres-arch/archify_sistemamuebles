import * as THREE from 'three';

/**
 * Geometría y formas 2D extruidas paramétricas oficiales para el Sistema de Perfiles Gola Provelcar:
 * - Provelcar x175: Tirador Gola Superior "Tipo J" (aloja pestaña superior bajo cubierta y curva cóncava ergonómica).
 * - Provelcar x176: Tirador Gola Intermedio "Tipo C / U" (para paso entre cajones superpuestos).
 */

const golaJGeomCache = new Map<number, THREE.BufferGeometry>();
const golaCGeomCache = new Map<number, THREE.BufferGeometry>();

/**
 * Sección transversal oficial del Perfil Gola Tipo J Provelcar x175 (en cm):
 * Plano 2D: X = profundidad hacia el interior del mueble (0 a 2.6cm), Y = altura relativa a la cara superior del mueble (0 a -5.7cm).
 */
export function createProvelcarX175Shape(): THREE.Shape {
  const shape = new THREE.Shape();
  const t = 0.15; // Espesor pared de aluminio extruido: 1.5mm

  // 1. Pestaña superior horizontal de fijación bajo cubierta:
  // Desde el borde frontal (1mm retranqueado) hasta el fondo del rebaje mecanizado en el lateral (26mm)
  shape.moveTo(0.1, 0);
  shape.lineTo(2.6, 0);

  // 2. Columna vertical posterior (apoya contra la pared trasera del destaje CNC):
  shape.lineTo(2.6, -3.8);

  // 3. Curva ergonómica J (seno cóncavo para entrada de dedos):
  // Desciende suavemente hacia el punto más bajo del canal
  shape.bezierCurveTo(
    2.6, -4.8,
    2.0, -5.5,
    1.3, -5.5
  );

  // Sube y avanza hacia la pestaña frontal que abraza el remate de la puerta
  shape.bezierCurveTo(
    0.7, -5.5,
    0.35, -4.6,
    0.35, -3.3
  );

  // 4. Labio superior frontal con borde redondeado / suave al tacto:
  shape.bezierCurveTo(
    0.35, -3.15,
    0.5, -3.15,
    0.5, -3.3
  );

  // 5. Contorno interior (offset de espesor t = 1.5mm):
  shape.lineTo(0.5, -3.6);

  // Curva interior cóncava:
  shape.bezierCurveTo(
    0.5, -4.4,
    0.8, -5.35,
    1.3, -5.35
  );
  shape.bezierCurveTo(
    1.9, -5.35,
    2.45, -4.7,
    2.45, -3.8
  );

  // Cara interior de la columna vertical posterior:
  shape.lineTo(2.45, -t);

  // Cara inferior de la pestaña superior:
  shape.lineTo(0.1, -t);

  shape.closePath();
  return shape;
}

/**
 * Sección transversal oficial del Perfil Gola Tipo C / U Provelcar x176 (en cm):
 * Centrado en Y = 0 (rebaje CNC de 68mm alto x 26mm fondo).
 */
export function createProvelcarX176Shape(): THREE.Shape {
  const shape = new THREE.Shape();
  const t = 0.15; // Espesor 1.5mm

  // Labio superior frontal:
  shape.moveTo(0.35, 2.8);

  // Curva cóncava superior hacia el fondo del mueble:
  shape.bezierCurveTo(
    0.35, 2.0,
    0.9, 1.4,
    1.4, 1.4
  );
  shape.bezierCurveTo(
    2.0, 1.4,
    2.6, 1.8,
    2.6, 2.4
  );

  // Espina vertical posterior de fijación:
  shape.lineTo(2.6, -2.4);

  // Curva cóncava inferior hacia adelante:
  shape.bezierCurveTo(
    2.6, -1.8,
    2.0, -1.4,
    1.4, -1.4
  );
  shape.bezierCurveTo(
    0.9, -1.4,
    0.35, -2.0,
    0.35, -2.8
  );

  // Labio inferior con remate redondeado:
  shape.bezierCurveTo(
    0.35, -2.95,
    0.5, -2.95,
    0.5, -2.8
  );

  // Contorno interior:
  shape.bezierCurveTo(
    0.5, -2.1,
    1.0, -1.55,
    1.4, -1.55
  );
  shape.bezierCurveTo(
    1.9, -1.55,
    2.45, -1.9,
    2.45, -2.4
  );

  // Cara interior de la espina posterior:
  shape.lineTo(2.45, 2.4);

  shape.bezierCurveTo(
    2.45, 1.9,
    1.9, 1.55,
    1.4, 1.55
  );
  shape.bezierCurveTo(
    1.0, 1.55,
    0.5, 2.1,
    0.5, 2.8
  );

  shape.bezierCurveTo(
    0.5, 2.95,
    0.35, 2.95,
    0.35, 2.8
  );

  shape.closePath();
  return shape;
}

/**
 * Obtiene o crea la geometría 3D extruida de Provelcar x175 para un ancho de tramo dado.
 */
export function getProvelcarX175Geometry(span: number): THREE.BufferGeometry {
  const key = Math.round(span * 10) / 10;
  let geom = golaJGeomCache.get(key);
  if (!geom) {
    const shape = createProvelcarX175Shape();
    geom = new THREE.ExtrudeGeometry(shape, {
      depth: span,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 16
    });
    geom.computeVertexNormals();
    golaJGeomCache.set(key, geom);
  }
  return geom;
}

/**
 * Obtiene o crea la geometría 3D extruida de Provelcar x176 para un ancho de tramo dado.
 */
export function getProvelcarX176Geometry(span: number): THREE.BufferGeometry {
  const key = Math.round(span * 10) / 10;
  let geom = golaCGeomCache.get(key);
  if (!geom) {
    const shape = createProvelcarX176Shape();
    geom = new THREE.ExtrudeGeometry(shape, {
      depth: span,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 16
    });
    geom.computeVertexNormals();
    golaCGeomCache.set(key, geom);
  }
  return geom;
}
