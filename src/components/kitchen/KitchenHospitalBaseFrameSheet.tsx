import React from 'react';
import { useKitchenStore, CabinetType } from '../../store/kitchenStore';
import { detectContinuousCabinetRuns, ContinuousRunInfo } from '../../utils/countertopNesting';

interface KitchenHospitalBaseFrameSheetProps {
  pageNum: number;
}

/**
 * LÁMINA TÉCNICA DE FABRICACIÓN DE BASTIDOR METÁLICO TUBULAR SANITARIO (NORMA MC.2.02 SACYR)
 * 
 * Plano de herrería independiente de los cascos de melamina:
 * - Vistas Técnicas Ortogonales (Planta, Elevación Frontal, Corte Lateral).
 * - Criterio estricto de cantidad de patas por longitud total (L):
 *   * L <= 900 mm: 2 pórticos
 *   * 901 <= L <= 1900 mm: 3 pórticos equidistantes
 *   * 1901 <= L <= 2500 mm: 4 pórticos equidistantes
 *   * L > 2500 mm: vanos máximos de 800 mm
 * - Tabla de despiece de perfiles FE 30x50x1.5mm, cortes a 90° y patines niveladores M10.
 */
export const KitchenHospitalBaseFrameSheet: React.FC<KitchenHospitalBaseFrameSheetProps> = ({ pageNum }) => {
  const {
    cabinets,
    countertopConfig,
    walls,
    architecturalElements,
    roomConfig,
    socleHeight,
    hospitalFrameFinish = 'white',
    unitQuantityMultiplier = 1,
  } = useKitchenStore();

  const baseCabinets = React.useMemo(() => {
    return cabinets.filter(
      (c) => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_')
    );
  }, [cabinets]);

  const finishInfo = React.useMemo(() => {
    switch (hospitalFrameFinish) {
      case 'inox':
        return {
          materialName: 'Acero Inoxidable AISI 304 Quirúrgico',
          profileName: 'Perfil Tubular Inox 30×50×1.5mm',
          treatment: 'Pulido satinado sanitario grano 240, pasivado químico anticorrosivo.',
          shortBadge: 'INOX AISI 304',
          specNote: 'Terminación: Acero Inoxidable AISI 304 satinado sanitario, soldadura TIG con respaldo de gas argón purgado.',
        };
      case 'white':
        return {
          materialName: 'Acero Tubular FE 30×50 Electropintado Blanco',
          profileName: 'FE 30×50×1.5mm',
          treatment: 'Tratamiento fosfatizado + Pintura electrostática epóxica al horno Blanco Puro RAL 9010.',
          shortBadge: 'BLANCO EPÓXICO',
          specNote: 'Terminación: Pintura electrostática en polvo termoendurecible horneada a 200°C, color Blanco Epóxico Sanitario RAL 9010.',
        };
      case 'light_gray':
        return {
          materialName: 'Acero Tubular FE 30×50 Electropintado Gris Claro',
          profileName: 'FE 30×50×1.5mm',
          treatment: 'Tratamiento fosfatizado + Pintura electrostática epóxica al horno Gris Claro Sanitario RAL 7035.',
          shortBadge: 'GRIS CLARO',
          specNote: 'Terminación: Pintura electrostática en polvo termoendurecible horneada a 200°C, color Gris Claro Sanitario RAL 7035.',
        };
      case 'black':
        return {
          materialName: 'Acero Tubular FE 30×50 Electropintado Negro Mate',
          profileName: 'FE 30×50×1.5mm',
          treatment: 'Tratamiento fosfatizado + Pintura electrostática epóxica al horno Negro Mate RAL 9005.',
          shortBadge: 'NEGRO MATE',
          specNote: 'Terminación: Pintura electrostática en polvo termoendurecible horneada a 200°C, color Negro Mate texturado RAL 9005.',
        };
      default:
        return {
          materialName: 'Acero Tubular FE 30×50 Electropintado Blanco',
          profileName: 'FE 30×50×1.5mm',
          treatment: 'Tratamiento fosfatizado + Pintura electrostática epóxica al horno Blanco Puro RAL 9010.',
          shortBadge: 'BLANCO EPÓXICO',
          specNote: 'Terminación: Pintura electrostática en polvo termoendurecible horneada a 200°C, color Blanco Epóxico Sanitario RAL 9010.',
        };
    }
  }, [hospitalFrameFinish]);

  const runs: ContinuousRunInfo[] = React.useMemo(() => {
    if (baseCabinets.length === 0) return [];
    return detectContinuousCabinetRuns(
      baseCabinets,
      countertopConfig,
      walls,
      architecturalElements,
      roomConfig
    );
  }, [baseCabinets, countertopConfig, walls, architecturalElements, roomConfig]);

  if (runs.length === 0) return null;

  const legsHeightMm = (socleHeight || 30) * 10; // e.g. 300 mm libres a piso
  const tubeWidthMm = 30; // 30x50 perfil tubular
  const tubeDepthMm = 50;
  const footHeightMm = 14; // Altura del patín sanitario M10
  const postHeightMm = Math.max(100, legsHeightMm - tubeWidthMm - footHeightMm); // Altura neta del tubo vertical

  return (
    <div className="blueprint-page border border-black/10 flex flex-col justify-between p-8 bg-white relative font-sans select-none">
      {/* 1. ENCABEZADO TÉCNICO DE LA LÁMINA */}
      <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-3">
        <div>
          <div className="text-[10px] font-bold text-sky-700 uppercase tracking-widest flex items-center gap-2">
            <span>NORMATIVA HOSPITALARIA SACYR / MC.2.02</span>
            <span>•</span>
            <span>PLANO DE HERRERÍA Y SOLDADURA</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-0.5">
            Lámina de Fabricación: Bastidor Tubular Metálico Continuo
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Estructura autoportante unificada en {finishInfo.profileName} ({finishInfo.shortBadge}) + patines reguladores sanitarios M10 a {legsHeightMm}mm del suelo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unitQuantityMultiplier > 1 && (
            <div className="border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded text-center">
              <div className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider">LOTE A FABRICAR</div>
              <div className="font-mono font-black text-sm text-emerald-900 leading-tight mt-0.5">{unitQuantityMultiplier} UNIDADES</div>
            </div>
          )}
          <div className="border border-sky-600 bg-sky-50/80 px-3.5 py-1.5 rounded text-center">
            <div className="text-[8px] font-bold text-sky-800 uppercase tracking-wider">ACABADO / MATERIAL</div>
            <div className="font-mono font-black text-sm text-sky-900 leading-tight mt-0.5">{finishInfo.shortBadge}</div>
          </div>
          <div className="border border-slate-700 bg-slate-50 px-3.5 py-1.5 rounded text-center">
            <div className="text-[8px] font-bold text-slate-800 uppercase tracking-wider">CÓDIGO DE ELEMENTO</div>
            <div className="font-mono font-black text-xl text-slate-900 leading-none mt-0.5">MC.2.02-EST</div>
          </div>
        </div>
      </div>

      {/* 2. CONTENIDO PRINCIPAL: VISTAS TÉCNICAS Y DESPIECE DE HERRERÍA */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {runs.map((run, rIdx) => {
          const totalLengthMm = run.totalLengthMm;
          const depthMm = run.depthMm || 600;

          // Criterio estricto de cantidad de patas por longitud total continuo
          let numLegs = 2;
          if (totalLengthMm <= 900) {
            numLegs = 2;
          } else if (totalLengthMm <= 1900) {
            numLegs = 3;
          } else if (totalLengthMm <= 2500) {
            numLegs = 4;
          } else {
            numLegs = 4 + Math.ceil((totalLengthMm - 2500) / 800);
          }

          // Cálculo de ejes de patas equidistantes
          const legSpacingMm = (totalLengthMm - 60) / (numLegs - 1);
          const legCentersMm: number[] = [];
          for (let i = 0; i < numLegs; i++) {
            legCentersMm.push(30 + i * legSpacingMm);
          }

          // Despiece de herrería para esta bancada
          const longitudinalTubeQty = 2;
          const longitudinalTubeLen = totalLengthMm;
          const crossbarQty = numLegs;
          const crossbarLen = depthMm - (tubeDepthMm * 2);
          const verticalLegQty = numLegs * 2; // Frontales y traseras
          const verticalLegLen = postHeightMm;
          const levelersQty = numLegs * 2;

          const totalLinearM = (
            (longitudinalTubeQty * longitudinalTubeLen) +
            (crossbarQty * crossbarLen) +
            (verticalLegQty * verticalLegLen)
          ) / 1000;

          const totalLinearMBatch = totalLinearM * unitQuantityMultiplier;
          const commercialBars6mBatch = Math.max(1, Math.ceil((totalLinearMBatch * 1.1) / 6));

          // Escala SVG para ajuste armónico dentro del recuadro (Planta + Elevación Frontal + Vista Lateral)
          const svgW = 1020;
          const svgH = 330;
          
          // Cálculo de escala paramétrica para encuadre diédrico perfecto
          const maxAvailableRunW = 680;
          const scale = Math.min(maxAvailableRunW / totalLengthMm, 95 / depthMm, 0.32);

          const drawW = totalLengthMm * scale;
          const drawD = depthMm * scale;
          const drawH = legsHeightMm * scale;
          const drawTubeW = Math.max(2.5, tubeWidthMm * scale);
          const drawBeamH = Math.max(2.5, tubeWidthMm * scale);
          const drawFootH = Math.max(2.5, footHeightMm * scale);

          const startX = 65;
          const plantaY = 32;
          const elevY = plantaY + drawD + 55;
          const latX = Math.min(svgW - drawD - 55, Math.max(startX + drawW + 55, 760));

          return (
            <div key={`run-sheet-${run.id}-${rIdx}`} className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between">
              
              {/* Header de la bancada */}
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 mb-2">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                  BANCADA BASTIDOR CONTINUO #{rIdx + 1}: L = {totalLengthMm} mm × P = {depthMm} mm × H = {legsHeightMm} mm
                </span>
                <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {numLegs} LÍNEAS DE APOYO ({numLegs * 2} PATAS TOTALES: {numLegs} FRONTALES + {numLegs} TRASERAS)
                </span>
              </div>

              {/* VISTAS TÉCNICAS SVG ORTOGONALES (PLANTA, ELEVACIÓN FRONTAL Y VISTA LATERAL) */}
              <div className="w-full flex items-center justify-center bg-slate-50/50 rounded border border-slate-100 py-1">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-h-[300px]">
                  
                  {/* ============================================================ */}
                  {/* VISTA 1: VISTA EN PLANTA DEL BASTIDOR METÁLICO (SUPERIOR)    */}
                  {/* ============================================================ */}
                  <g transform={`translate(${startX}, ${plantaY})`}>
                    {/* Título de Vista */}
                    <text x={-45} y={drawD / 2 + 3} fontSize="8.5" fontWeight="900" fill="#0f172a" letterSpacing="0.06em">
                      PLANTA
                    </text>
                    <text x={-45} y={drawD / 2 + 12} fontSize="6.5" fontWeight="bold" fill="#64748b">
                      (SUP)
                    </text>

                    {/* Marco Exterior de Largueros Longitudinales */}
                    {/* Larguero Trasero */}
                    <rect x={0} y={0} width={drawW} height={drawTubeW} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.1" />
                    {/* Larguero Frontal */}
                    <rect x={0} y={drawD - drawTubeW} width={drawW} height={drawTubeW} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.1" />

                    {/* Travesaños transversales en cada eje de pata */}
                    {legCentersMm.map((xMm, i) => {
                      const xPos = xMm * scale;
                      return (
                        <g key={`crossbar-${i}`}>
                          <rect
                            x={xPos - drawTubeW / 2}
                            y={drawTubeW}
                            width={drawTubeW}
                            height={drawD - (drawTubeW * 2)}
                            fill="#e2e8f0"
                            stroke="#334155"
                            strokeWidth="0.8"
                          />
                          {/* Orificios para fijación a cascos de melamina Ø6mm */}
                          <circle cx={xPos} cy={drawD * 0.25} r={2.2} fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
                          <circle cx={xPos} cy={drawD * 0.75} r={2.2} fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
                          {/* Eje punteado de correspondencia hacia elevación */}
                          <line x1={xPos} y1={drawD} x2={xPos} y2={drawD + 35} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3,3" />
                        </g>
                      );
                    })}

                    {/* Cota Ancho Total Planta (Superior) */}
                    <line x1={0} y1={-12} x2={drawW} y2={-12} stroke="#d946ef" strokeWidth="1.0" />
                    <line x1={0} y1={-16} x2={0} y2={0} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawW} y1={-16} x2={drawW} y2={0} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={-3} y1={-15} x2={3} y2={-9} stroke="#d946ef" strokeWidth="1.3" />
                    <line x1={drawW - 3} y1={-15} x2={drawW + 3} y2={-9} stroke="#d946ef" strokeWidth="1.3" />
                    <text x={drawW / 2} y={-16} fontSize="9.5" fontWeight="900" fill="#d946ef" textAnchor="middle" fontFamily="monospace">
                      L = {totalLengthMm} mm
                    </text>

                    {/* Cota Fondo Total Planta (Derecha) */}
                    <line x1={drawW + 14} y1={0} x2={drawW + 14} y2={drawD} stroke="#d946ef" strokeWidth="1.0" />
                    <line x1={drawW} y1={0} x2={drawW + 18} y2={0} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawW} y1={drawD} x2={drawW + 18} y2={drawD} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawW + 11} y1={-3} x2={drawW + 17} y2={3} stroke="#d946ef" strokeWidth="1.3" />
                    <line x1={drawW + 11} y1={drawD - 3} x2={drawW + 17} y2={drawD + 3} stroke="#d946ef" strokeWidth="1.3" />
                    <text x={drawW + 20} y={drawD / 2 + 3} fontSize="9" fontWeight="900" fill="#d946ef" fontFamily="monospace">
                      P = {depthMm} mm
                    </text>
                  </g>

                  {/* ============================================================ */}
                  {/* VISTA 2: VISTA EN ELEVACIÓN FRONTAL                          */}
                  {/* ============================================================ */}
                  <g transform={`translate(${startX}, ${elevY})`}>
                    {/* Título de Vista */}
                    <text x={-45} y={drawH / 2 + 3} fontSize="8.5" fontWeight="900" fill="#0f172a" letterSpacing="0.06em">
                      ELEVACIÓN
                    </text>
                    <text x={-45} y={drawH / 2 + 12} fontSize="6.5" fontWeight="bold" fill="#64748b">
                      (FRONTAL)
                    </text>

                    {/* Línea de N.P.T. (+0.00) a Piso */}
                    <line x1={-25} y1={drawH} x2={drawW + 25} y2={drawH} stroke="#0f172a" strokeWidth="1.2" />
                    <text x={-24} y={drawH + 9} fontSize="6.5" fontWeight="bold" fill="#64748b">N.P.T. ±0.00</text>

                    {/* Larguero superior continuo (FE 30x50mm) */}
                    <rect x={0} y={0} width={drawW} height={drawBeamH} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.1" />

                    {/* Patas verticales con patines reguladores M10 */}
                    {legCentersMm.map((xMm, i) => {
                      const xPos = xMm * scale;
                      const postH = Math.max(8, drawH - drawBeamH - drawFootH);
                      return (
                        <g key={`elev-leg-${i}`}>
                          {/* Fuste tubular vertical FE 30x50mm */}
                          <rect
                            x={xPos - drawTubeW / 2}
                            y={drawBeamH}
                            width={drawTubeW}
                            height={postH}
                            fill="#e2e8f0"
                            stroke="#334155"
                            strokeWidth="0.8"
                          />
                          {/* Vástago roscado y collarín regulador M10 */}
                          <rect
                            x={xPos - drawTubeW * 0.6}
                            y={drawH - drawFootH}
                            width={drawTubeW * 1.2}
                            height={drawFootH * 0.55}
                            fill="#94a3b8"
                            stroke="#475569"
                            strokeWidth="0.5"
                          />
                          {/* Base de apoyo sanitario de goma / patín */}
                          <rect
                            x={xPos - drawTubeW * 0.9}
                            y={drawH - drawFootH * 0.45}
                            width={drawTubeW * 1.8}
                            height={drawFootH * 0.45}
                            fill="#0f172a"
                            rx="0.5"
                          />
                          {/* Eje vertical de pata */}
                          <line x1={xPos} y1={-4} x2={xPos} y2={drawH + 12} stroke="#0284c7" strokeWidth="0.5" strokeDasharray="3,2" />
                        </g>
                      );
                    })}

                    {/* Cotas entre ejes de patas (Vanos equidistantes) */}
                    {legCentersMm.slice(0, -1).map((xMm, i) => {
                      const nextXMm = legCentersMm[i + 1];
                      const x1 = xMm * scale;
                      const x2 = nextXMm * scale;
                      const spanDist = Math.round(nextXMm - xMm);
                      return (
                        <g key={`span-dim-${i}`}>
                          <line x1={x1} y1={drawH + 16} x2={x2} y2={drawH + 16} stroke="#0284c7" strokeWidth="0.8" />
                          <line x1={x1} y1={drawH + 12} x2={x1} y2={drawH + 20} stroke="#0284c7" strokeWidth="0.7" />
                          <line x1={x2} y1={drawH + 12} x2={x2} y2={drawH + 20} stroke="#0284c7" strokeWidth="0.7" />
                          <line x1={x1 - 2} y1={drawH + 18} x2={x1 + 2} y2={drawH + 14} stroke="#0284c7" strokeWidth="1.1" />
                          <line x1={x2 - 2} y1={drawH + 18} x2={x2 + 2} y2={drawH + 14} stroke="#0284c7" strokeWidth="1.1" />
                          <text x={(x1 + x2) / 2} y={drawH + 25} fontSize="7.5" fontWeight="bold" fill="#0284c7" textAnchor="middle" fontFamily="monospace">
                            {spanDist} mm
                          </text>
                        </g>
                      );
                    })}

                    {/* Cota Altura Total Libre a Piso H=300mm */}
                    <line x1={drawW + 14} y1={0} x2={drawW + 14} y2={drawH} stroke="#d946ef" strokeWidth="1.0" />
                    <line x1={drawW} y1={0} x2={drawW + 18} y2={0} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawW} y1={drawH} x2={drawW + 18} y2={drawH} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawW + 11} y1={-3} x2={drawW + 17} y2={3} stroke="#d946ef" strokeWidth="1.3" />
                    <line x1={drawW + 11} y1={drawH - 3} x2={drawW + 17} y2={drawH + 3} stroke="#d946ef" strokeWidth="1.3" />
                    <text x={drawW + 20} y={drawH / 2 + 3} fontSize="9" fontWeight="900" fill="#d946ef" fontFamily="monospace">
                      H = {legsHeightMm} mm
                    </text>
                  </g>

                  {/* ============================================================ */}
                  {/* VISTA 3: VISTA LATERAL / CORTE TRANSVERSAL PÓRTICO           */}
                  {/* ============================================================ */}
                  <g transform={`translate(${latX}, ${elevY})`}>
                    {/* Título de Vista Lateral */}
                    <text x={drawD / 2} y={-14} fontSize="8.5" fontWeight="900" fill="#0f172a" textAnchor="middle" letterSpacing="0.06em">
                      VISTA LATERAL
                    </text>
                    <text x={drawD / 2} y={-5} fontSize="6.5" fontWeight="bold" fill="#64748b" textAnchor="middle">
                      CORTE TRANSVERSAL
                    </text>

                    {/* Línea de N.P.T. Lateral */}
                    <line x1={-10} y1={drawH} x2={drawD + 15} y2={drawH} stroke="#0f172a" strokeWidth="1.2" />

                    {/* Travesaño Superior de Amarre (FE 30x50mm) */}
                    <rect x={0} y={0} width={drawD} height={drawBeamH} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.1" />

                    {/* Fuste Vertical Trasero */}
                    <rect
                      x={0}
                      y={drawBeamH}
                      width={drawTubeW}
                      height={Math.max(8, drawH - drawBeamH - drawFootH)}
                      fill="#e2e8f0"
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    {/* Patín Trasero */}
                    <rect
                      x={-drawTubeW * 0.1}
                      y={drawH - drawFootH}
                      width={drawTubeW * 1.2}
                      height={drawFootH * 0.55}
                      fill="#94a3b8"
                      stroke="#475569"
                      strokeWidth="0.5"
                    />
                    <rect
                      x={-drawTubeW * 0.4}
                      y={drawH - drawFootH * 0.45}
                      width={drawTubeW * 1.8}
                      height={drawFootH * 0.45}
                      fill="#0f172a"
                      rx="0.5"
                    />

                    {/* Fuste Vertical Delantero */}
                    <rect
                      x={drawD - drawTubeW}
                      y={drawBeamH}
                      width={drawTubeW}
                      height={Math.max(8, drawH - drawBeamH - drawFootH)}
                      fill="#e2e8f0"
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    {/* Patín Delantero */}
                    <rect
                      x={drawD - drawTubeW - drawTubeW * 0.1}
                      y={drawH - drawFootH}
                      width={drawTubeW * 1.2}
                      height={drawFootH * 0.55}
                      fill="#94a3b8"
                      stroke="#475569"
                      strokeWidth="0.5"
                    />
                    <rect
                      x={drawD - drawTubeW - drawTubeW * 0.4}
                      y={drawH - drawFootH * 0.45}
                      width={drawTubeW * 1.8}
                      height={drawFootH * 0.45}
                      fill="#0f172a"
                      rx="0.5"
                    />

                    {/* Indicación Muro / Frente */}
                    <text x={0} y={drawH + 10} fontSize="6" fontWeight="bold" fill="#64748b">MURO</text>
                    <text x={drawD} y={drawH + 10} fontSize="6" fontWeight="bold" fill="#64748b" textAnchor="end">FRENTE</text>

                    {/* Cota Profundidad Lateral */}
                    <line x1={0} y1={drawH + 18} x2={drawD} y2={drawH + 18} stroke="#d946ef" strokeWidth="0.9" />
                    <line x1={0} y1={drawH + 14} x2={0} y2={drawH + 22} stroke="#d946ef" strokeWidth="0.7" />
                    <line x1={drawD} y1={drawH + 14} x2={drawD} y2={drawH + 22} stroke="#d946ef" strokeWidth="0.7" />
                    <text x={drawD / 2} y={drawH + 26} fontSize="7.5" fontWeight="bold" fill="#d946ef" textAnchor="middle" fontFamily="monospace">
                      {depthMm} mm
                    </text>
                  </g>

                </svg>
              </div>

              {/* 3. TABLA DE DESPIECE DE HERRERÍA Y MATERIALES */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Despiece de Cortes y Materiales (Herrería Clínica / SACYR)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {unitQuantityMultiplier > 1 ? (
                      <>Acero Lote ({unitQuantityMultiplier} un): <strong className="text-slate-900 font-mono">{totalLinearMBatch.toFixed(2)} m</strong> • Barras 6m: <strong className="text-slate-900 font-mono">{commercialBars6mBatch} un</strong> <span className="text-slate-400">({totalLinearM.toFixed(2)}m/mueble)</span></>
                    ) : (
                      <>Total lineal acero: <strong className="text-slate-900 font-mono">{totalLinearM.toFixed(2)} m</strong> • Barras 6m: <strong className="text-slate-900 font-mono">{commercialBars6mBatch} un</strong></>
                    )}
                  </span>
                </div>

                <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-1 px-2 border-r border-slate-200">Pieza / Perfil</th>
                      <th className="py-1 px-2 border-r border-slate-200">Sección / Material</th>
                      <th className="py-1 px-1.5 border-r border-slate-200 text-center">Cant. Unit.</th>
                      {unitQuantityMultiplier > 1 && (
                        <th className="py-1 px-1.5 border-r border-slate-200 text-center bg-emerald-50 text-emerald-900">Total (x{unitQuantityMultiplier})</th>
                      )}
                      <th className="py-1 px-2 border-r border-slate-200 text-right">Largo Unit.</th>
                      <th className="py-1 px-2 border-r border-slate-200 text-right">Total Lineal</th>
                      <th className="py-1 px-2">Corte / Acabado / Especificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="py-1 px-2 font-bold border-r border-slate-200">Larguero Longitudinal Frontal y Trasero</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{finishInfo.profileName}</td>
                      <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center">{longitudinalTubeQty}</td>
                      {unitQuantityMultiplier > 1 && (
                        <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center text-emerald-700 bg-emerald-50/50 font-mono">{longitudinalTubeQty * unitQuantityMultiplier}</td>
                      )}
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{longitudinalTubeLen} mm</td>
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{(((longitudinalTubeQty * unitQuantityMultiplier) * longitudinalTubeLen) / 1000).toFixed(2)} m</td>
                      <td className="py-1 px-2 text-slate-600">Corte a 90° escuadra. Tubo continuo sin empalmes. {finishInfo.treatment}</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-1 px-2 font-bold border-r border-slate-200">Travesaños Transversales de Amarre</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{finishInfo.profileName}</td>
                      <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center">{crossbarQty}</td>
                      {unitQuantityMultiplier > 1 && (
                        <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center text-emerald-700 bg-emerald-50/50 font-mono">{crossbarQty * unitQuantityMultiplier}</td>
                      )}
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{crossbarLen} mm</td>
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{(((crossbarQty * unitQuantityMultiplier) * crossbarLen) / 1000).toFixed(2)} m</td>
                      <td className="py-1 px-2 text-slate-600">Soldadura continua pulida a ras. Perforación Ø6mm para fijación.</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-bold border-r border-slate-200">Fustes Verticales de Pata Tubular</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{finishInfo.profileName}</td>
                      <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center">{verticalLegQty}</td>
                      {unitQuantityMultiplier > 1 && (
                        <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center text-emerald-700 bg-emerald-50/50 font-mono">{verticalLegQty * unitQuantityMultiplier}</td>
                      )}
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{verticalLegLen} mm</td>
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">{(((verticalLegQty * unitQuantityMultiplier) * verticalLegLen) / 1000).toFixed(2)} m</td>
                      <td className="py-1 px-2 text-slate-600">Base sellada con pletina electrosoldada y tuerca embutida M10.</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-1 px-2 font-bold border-r border-slate-200">Patín Regulador Sanitario Nivelador</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">Rosca M10 × 40mm</td>
                      <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center text-sky-700">{levelersQty}</td>
                      {unitQuantityMultiplier > 1 && (
                        <td className="py-1 px-1.5 font-bold border-r border-slate-200 text-center text-emerald-700 bg-emerald-50/50 font-mono">{levelersQty * unitQuantityMultiplier}</td>
                      )}
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">H=14 (+15) mm</td>
                      <td className="py-1 px-2 font-mono text-right border-r border-slate-200">—</td>
                      <td className="py-1 px-2 text-slate-600">Vástago de acero M10 con base cilíndrica de goma antideslizante lavable.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Especificaciones Técnicas y Normativa de Taller */}
              <div className="mt-2.5 p-2 bg-slate-50 rounded border border-slate-200 text-[9px] text-slate-600 flex justify-between items-center">
                <div>
                  <strong className="text-slate-900">NOTAS DE TALLER: </strong>
                  1. Soldadura continua bajo atmósfera controlada sin porosidad.
                  2. Todas las aristas y cordones exteriores deben quedar enrasados y desbastados con disco abrasivo grano 120/240.
                  3. {finishInfo.specNote}
                </div>
                <div className="text-right shrink-0 ml-4 font-mono font-bold text-slate-700">
                  DESPEJE SANITARIO: {legsHeightMm} mm N.P.T.
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 4. CAJETÍN TÉCNICO AL PIE DE PÁGINA */}
      <div className="border-2 border-slate-900 mt-3 p-2 bg-slate-50/50 flex justify-between items-center text-[10px]">
        <div>
          <span className="font-bold text-slate-900 uppercase">PROYECTO:</span> MOBILIARIO CLÍNICO MODULAR SACYR / MC.2.02 {unitQuantityMultiplier > 1 ? `(LOTE: ${unitQuantityMultiplier} UNIDADES IDÉNTICAS)` : ''}
        </div>
        <div className="flex gap-6 font-mono font-medium text-slate-700">
          <span>ESCALA: 1:20 / S.E.</span>
          <span>UNIDAD: mm</span>
          <span>FECHA: {new Date().toLocaleDateString('es-CL')}</span>
          <span className="font-bold text-slate-900">LÁMINA: EST-01 (PÁG. {pageNum})</span>
        </div>
      </div>
    </div>
  );
};
