import React, { useState, useEffect, useMemo } from 'react';
import { useKitchenStore, CabinetType, getCabinetLabel } from '../store/kitchenStore';
import { useStore } from '../store';
import { TexturesSection } from '../components/TexturesSection';
import { KitchenBlueprint } from '../components/KitchenBlueprint';
import { exportKitchenToExcel } from '../utils/kitchenExcelGenerator';
import { exportKitchenLabelsPDF } from '../utils/kitchenLabelsPdfGenerator';
import { isHplFinish } from '../utils/kitchenManufacturing';
import { FileSpreadsheet, FileText, RotateCcw, QrCode, Loader2 } from 'lucide-react';
import { KitchenScene } from '../components/kitchen/KitchenScene';
import { RoomPlannerModal } from '../components/kitchen/RoomPlannerModal';
import { ResetConfirmModal } from '../components/kitchen/ResetConfirmModal';
import { RoomFinishesSection } from '../components/kitchen/RoomFinishesSection';
import { IslandBackPanelConfigSection } from '../components/kitchen/IslandBackPanelConfigSection';
import { KitchenModuleContextMenu } from '../components/kitchen/KitchenModuleContextMenu';
import { SaveProjectModal } from '../components/common/SaveProjectModal';
import { CountertopConfigModal } from '../components/kitchen/CountertopConfigModal';
import { GolaRegruesoIncompatibilityModal } from '../components/kitchen/GolaRegruesoIncompatibilityModal';
import { KitchenB2BQuoteModal } from '../components/kitchen/KitchenB2BQuoteModal';
import { calculatePolygonArea } from '../utils/roomGeometry';
import { KitchenMepPanel } from '../components/kitchen/KitchenMepPanel';
import { detectMepClashes } from '../utils/mepClashDetection';
import { resolvePlacement, getCabinetSpecsFromTool, findSmartWallPlacement } from '../utils/kitchenCollision';
import { ArrowLeft, Box, Square, Move3D, PenTool, LayoutGrid, Trash2, RotateCw, Undo2, Redo2, Flame, Refrigerator, Flower2, Utensils, Info, Sparkles, Maximize2, Layers, Palette, ListOrdered, Save, Columns, Sliders, Sun, Moon, Wine, Wrench, DollarSign, ChevronDown, ChevronRight, Globe, Check, ShieldCheck } from 'lucide-react';
import { HandlesSection } from '../components/kitchen/HandlesSection';
import { HANDLE_CATALOG } from '../types/handle';

export const KRION_COLORS = [
  { id: 'krion-snow-white-12', name: 'Blanco', sub: '1100 Snow White EAST', colorHex: '#FFFFFF', border: 'border-slate-300' },
  { id: 'krion-grey-12', name: 'Gris', sub: '6902 Light Grey', colorHex: '#9EA3A8', border: 'border-slate-400' },
  { id: 'krion-green-12', name: 'Verde', sub: '4601 Green / Sage', colorHex: '#4A6B56', border: 'border-emerald-700' },
  { id: 'krion-red-12', name: 'Rojo', sub: '6401 Red Fire', colorHex: '#9E2A2B', border: 'border-rose-700' },
];

export const HOSPITAL_COUNTERTOPS = [
  {
    id: 'krion-snow-white-12',
    name: '1. Krion Solid Surface 12mm',
    sub: 'Porcelanosa Solid Surface • Sin poro ni juntas • Sanitario',
    badge: 'Norma SACYR',
    colorHex: '#FFFFFF',
    isKrion: true,
  },
  {
    id: 'hpl-compact-snow-12',
    name: '2. HPL Fenólico Compacto 12mm',
    sub: 'Resina fenólica maciza lavable • Núcleo negro • Químico',
    badge: 'Antimicrobiano',
    colorHex: '#F8FAFC',
    isKrion: false,
  },
  {
    id: 'postformado-clinico-30',
    name: '3. Postformado Sanitario 30mm',
    sub: 'Curvatura frontal continua R9 con goterón sellado',
    badge: 'Fácil Asepsia',
    colorHex: '#F1F5F9',
    isKrion: false,
  },
];

export const HOSPITAL_FRAME_FINISHES = [
  { id: 'inox' as const, name: 'Acero Inox', sub: 'AISI 304 Quirúrgico', colorDot: 'bg-slate-300 border-slate-400' },
  { id: 'white' as const, name: 'Blanco', sub: 'Electropintado', colorDot: 'bg-white border-slate-300' },
  { id: 'light_gray' as const, name: 'Gris Claro', sub: 'Electropintado', colorDot: 'bg-slate-400 border-slate-500' },
  { id: 'black' as const, name: 'Negro Mate', sub: 'Electropintado', colorDot: 'bg-zinc-900 border-zinc-700' },
];

const sectionTitle = "text-xs uppercase tracking-wider text-orange-400 font-bold mb-3 mt-4 first:mt-0";
const labelClass = "text-xs uppercase tracking-wider text-slate-300 font-semibold";
const btnClass = "w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-center cursor-pointer hover:border-orange-500/50 hover:bg-white/10 transition-colors text-xs font-medium text-slate-300";
const activeBtnClass = "w-full py-2 px-3 bg-orange-500/20 border border-orange-500 rounded-lg text-center cursor-pointer text-orange-400 transition-colors text-xs font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]";

export const DIMENSION_LEVEL_DATA: Record<number, { title: string; desc: string }> = {
  1: { title: '1. Cotas Generales', desc: 'Largo total de corrida, alto, prof. y dist. Cubierta-Aéreo' },
  2: { title: '2. Módulos', desc: 'Ancho individual de cada cuerpo' },
  3: { title: '3. Frentes', desc: 'Puertas y frentes ciegos' },
  4: { title: '4. Cajoneras e Interiores', desc: 'Alturas de frentes de cajón y repisas' },
  5: { title: '5. Identificación Módulos', desc: 'N° y nombre de muebles (MOD • Nombre)' },
  6: { title: '6. Medidas Espaciales', desc: 'Muros, vanos, pilares, distancia Cubierta-Aéreo y paso Isla-Base' },
};

const ToggleBtn = ({ active, onClick, label, isLight, icon }: { active: boolean, onClick: () => void, label: string, isLight?: boolean, icon?: React.ReactNode }) => (
  <button 
    onClick={onClick} 
    className={
      active 
        ? isLight
          ? "w-full py-2.5 px-3.5 bg-orange-500 text-black border border-orange-600 rounded-xl text-center cursor-pointer transition-all text-xs font-bold shadow-xs flex items-center justify-center gap-2"
          : "w-full py-2.5 px-3.5 bg-orange-500/20 border border-orange-500 text-orange-400 rounded-xl text-center cursor-pointer transition-all text-xs font-bold shadow-[0_0_12px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2" 
        : isLight 
          ? "w-full py-2.5 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 shadow-xs flex items-center justify-center gap-2"
          : "w-full py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-center cursor-pointer hover:border-white/20 hover:bg-white/[0.08] transition-all text-xs font-medium text-slate-300 flex items-center justify-center gap-2"
    }
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span>{label}</span>
  </button>
);

const SliderControl = ({ label, value, min, max, step = 1, unit = "", onChange, isLight }: { label: string, value: number, min: number, max: number, step?: number, unit?: string, onChange: (val: number) => void, isLight?: boolean }) => (
  <div className="flex flex-col gap-1.5 mb-3">
    <div className={`flex justify-between items-center text-xs ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
      <span className={isLight ? "font-bold text-slate-900" : "font-semibold"}>{label}</span>
      <span className={`font-mono font-bold text-xs ${isLight ? 'text-orange-600' : 'text-orange-500'}`}>{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value || 0} 
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
        isLight ? 'bg-slate-300' : 'bg-white/10'
      }`}
    />
  </div>
);

export function ProductionBatchConfigSection({ isLight }: { isLight: boolean }) {
  const {
    unitQuantityMultiplier = 1,
    setUnitQuantityMultiplier,
  } = useKitchenStore();

  return (
    <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
      isLight ? 'bg-orange-50/50 border-orange-200/80 shadow-xs' : 'bg-orange-950/15 border-orange-500/20'
    }`}>
      <div className="flex justify-between items-center text-xs">
        <span className={`font-bold flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
          <span>Cantidad a Fabricar (Lote)</span>
        </span>
        <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md whitespace-nowrap ${
          isLight ? 'bg-orange-100 text-orange-900 border border-orange-300' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        }`}>
          {unitQuantityMultiplier} {unitQuantityMultiplier === 1 ? 'mueble' : 'muebles'}
        </span>
      </div>

      {/* Stepper + Input + Quick Chips */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center border rounded-lg overflow-hidden shrink-0 shadow-xs ${
          isLight ? 'bg-white border-slate-300' : 'bg-black/40 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => setUnitQuantityMultiplier(Math.max(1, unitQuantityMultiplier - 1))}
            className={`w-8 h-8 flex items-center justify-center font-bold text-base transition-colors cursor-pointer ${
              isLight ? 'text-slate-700 hover:bg-slate-100 active:bg-slate-200' : 'text-slate-200 hover:bg-white/10 active:bg-white/20'
            }`}
            title="Disminuir 1 unidad"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={500}
            value={unitQuantityMultiplier}
            onChange={(e) => setUnitQuantityMultiplier(parseInt(e.target.value, 10) || 1)}
            className={`w-12 h-8 text-center font-mono font-bold text-sm bg-transparent outline-none ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          />
          <button
            type="button"
            onClick={() => setUnitQuantityMultiplier(Math.min(500, unitQuantityMultiplier + 1))}
            className={`w-8 h-8 flex items-center justify-center font-bold text-base transition-colors cursor-pointer ${
              isLight ? 'text-slate-700 hover:bg-slate-100 active:bg-slate-200' : 'text-slate-200 hover:bg-white/10 active:bg-white/20'
            }`}
            title="Aumentar 1 unidad"
          >
            +
          </button>
        </div>

        {/* Presets Rápidos: x10, x25, x50 */}
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {[10, 25, 50].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setUnitQuantityMultiplier(qty)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center border cursor-pointer ${
                unitQuantityMultiplier === qty
                  ? 'bg-orange-500 text-black border-orange-500 shadow-sm font-extrabold'
                  : isLight
                    ? 'bg-white border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 text-slate-700'
                    : 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-white/10 text-slate-300'
              }`}
            >
              x{qty}
            </button>
          ))}
        </div>
      </div>
      <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
        Multiplica automáticamente el despiece, planchas, bastidores y cotización B2B sin saturar las hojas del plano PDF.
      </p>
    </div>
  );
}

export function HospitalBaseFrameConfigSection({ isLight }: { isLight: boolean }) {
  const {
    socleHeight,
    setSocleHeight,
    hospitalFrameFinish = 'white',
    setHospitalFrameFinish,
  } = useKitchenStore();

  const currentHeight = socleHeight ?? 30;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Control de Altura de Patas */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className={isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}>
            Altura de Patas / Despeje
          </span>
          <span className={`font-mono font-bold text-xs whitespace-nowrap ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
            {currentHeight} cm <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({currentHeight * 10} mm)</span>
          </span>
        </div>

        {/* Presets Rápidos */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { val: 15, label: '15 cm', sub: 'Compacto' },
            { val: 20, label: '20 cm', sub: 'Estándar' },
            { val: 30, label: '30 cm', sub: 'MC.2.02' },
            { val: 35, label: '35 cm', sub: 'Carros' },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setSocleHeight(item.val)}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center border cursor-pointer ${
                currentHeight === item.val
                  ? 'bg-orange-500 text-black border-orange-500 shadow-sm font-extrabold'
                  : isLight
                    ? 'bg-white border-slate-200 hover:border-orange-400 hover:bg-slate-50 text-slate-700'
                    : 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span className="leading-tight">{item.label}</span>
              <span className={`text-[9px] font-normal leading-tight mt-0.5 ${currentHeight === item.val ? 'text-slate-950 font-semibold' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {item.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Slider continuo */}
        <div className="pt-1">
          <input
            type="range"
            min={10}
            max={45}
            step={1}
            value={currentHeight}
            onChange={(e) => setSocleHeight(Number(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
              isLight ? 'bg-slate-300' : 'bg-white/10'
            }`}
            title="Ajuste fino de altura de patas (10 - 45 cm)"
          />
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
            <span>10 cm</span>
            <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
              Norma SACYR: 30 cm
            </span>
            <span>45 cm</span>
          </div>
        </div>
      </div>

      {/* 2. Selector de Material y Acabado de Estructura */}
      <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
        <label className={`text-xs block ${isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}`}>
          Material y Acabado de Estructura
        </label>
        <div className="grid grid-cols-2 gap-2">
          {HOSPITAL_FRAME_FINISHES.map((f) => {
            const isSelected = hospitalFrameFinish === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setHospitalFrameFinish(f.id)}
                className={`p-2.5 rounded-lg text-left transition-all flex items-center gap-2.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-black border-orange-500 shadow-sm font-bold'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-orange-400 hover:bg-slate-50 text-slate-700'
                      : 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-white/10 text-slate-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border shrink-0 ${f.colorDot}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold leading-tight truncate">{f.name}</span>
                  <span className={`text-[10px] leading-tight truncate ${isSelected ? 'text-slate-900 font-semibold' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {f.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HospitalCountertopConfigSection({ isLight, onOpenFullModal }: { isLight: boolean; onOpenFullModal: () => void }) {
  const { countertopConfig, setCountertopConfig, qstoneCatalog } = useKitchenStore();

  const isKrionActive = countertopConfig.selectedProductId?.startsWith('krion-') || 
    qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId)?.materialType === 'solid_surface';

  const currentProduct = qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId) || qstoneCatalog[0];
  const regrueso = countertopConfig.regruesoCm || 0;
  const bsMode = countertopConfig.backsplashMode;
  const bsHeight = bsMode === 'full_height' ? 55 : (countertopConfig.backsplashHeightCm || 5);

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. Selector de Material Clínico */}
      <div>
        <div className="flex justify-between items-center text-xs tracking-wider mb-2">
          <span className={isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}>
            Material de Cubierta Clínica
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
            isLight ? 'bg-orange-100 text-orange-800' : 'bg-orange-500/20 text-orange-300'
          }`}>
            {isKrionActive ? 'Solid Surface 12mm' : currentProduct.materialType === 'hpl_compact' ? 'HPL 12mm' : 'Postformado 30mm'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {HOSPITAL_COUNTERTOPS.map((mat) => {
            const isSelected = isKrionActive && mat.isKrion ? true : countertopConfig.selectedProductId === mat.id;
            return (
              <button
                key={mat.id}
                type="button"
                onClick={() => {
                  setCountertopConfig({
                    enabled: true,
                    selectedProductId: mat.id,
                  });
                }}
                className={`p-2 rounded-lg text-left transition-all flex items-center justify-between border cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-black border-orange-500 shadow-sm font-bold'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-orange-400 text-slate-700'
                      : 'bg-white/5 border-white/10 hover:border-orange-500/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full border shrink-0"
                    style={{ backgroundColor: mat.colorHex }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight truncate">{mat.name}</span>
                    <span className={`text-[9px] leading-tight truncate ${isSelected ? 'text-slate-900 font-semibold' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {mat.sub}
                    </span>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-black shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Opciones Específicas de KRION® (Colores, Regrueso 1-5cm, Respaldo y Laterales) */}
      {isKrionActive && (
        <div className={`p-3 rounded-xl border space-y-3 ${
          isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-orange-950/20 border-orange-500/20'
        }`}>
          {/* Paleta de Colores Krion */}
          <div>
            <div className="flex justify-between items-center text-xs tracking-wider mb-1.5">
              <span className={isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}>
                Color de KRION® (Colección Esencial)
              </span>
              <span className={`font-mono text-[10px] font-bold ${isLight ? 'text-orange-800' : 'text-orange-300'}`}>
                {KRION_COLORS.find(c => c.id === countertopConfig.selectedProductId)?.name || 'Blanco'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {KRION_COLORS.map((kc) => {
                const isColorSelected = countertopConfig.selectedProductId === kc.id;
                return (
                  <button
                    key={kc.id}
                    type="button"
                    onClick={() => setCountertopConfig({ selectedProductId: kc.id, enabled: true })}
                    className={`p-1.5 rounded-lg text-left transition-all flex items-center gap-2 border cursor-pointer ${
                      isColorSelected
                        ? 'bg-orange-500 text-black border-orange-600 shadow-sm font-bold'
                        : isLight
                          ? 'bg-white border-slate-200 hover:border-orange-400 text-slate-700'
                          : 'bg-black/40 border-white/10 hover:border-orange-400 text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border shrink-0 ${kc.border}`}
                      style={{ backgroundColor: kc.colorHex }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold leading-tight">{kc.name}</span>
                      <span className={`text-[8.5px] truncate ${isColorSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                        {kc.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regrueso Frontal (1 a 5 cm) */}
          <div className="pt-2 border-t border-orange-200 dark:border-orange-500/30">
            <div className="flex justify-between items-center text-xs tracking-wider mb-1.5">
              <span className={isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}>
                Regrueso Frontal (Faldón)
              </span>
              <span className={`font-mono font-bold text-xs ${isLight ? 'text-orange-800' : 'text-orange-400'}`}>
                {regrueso === 0 ? '0 cm (Plancha 12mm)' : `${regrueso} cm`}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1 mb-1.5">
              {[0, 1, 2, 3, 4, 5].map((rVal) => (
                <button
                  key={rVal}
                  type="button"
                  onClick={() => setCountertopConfig({ regruesoCm: rVal })}
                  className={`py-1 rounded text-xs font-bold transition-all text-center border cursor-pointer ${
                    regrueso === rVal
                      ? 'bg-orange-500 text-black border-orange-500 shadow-sm'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-orange-400 text-slate-700'
                        : 'bg-black/30 border-white/10 hover:border-orange-400 text-slate-300'
                  }`}
                >
                  {rVal}cm
                </button>
              ))}
            </div>
            <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              * Mantiene holgura y descontado automático de puertas/cajones según normas de fabricación.
            </p>
          </div>

          {/* Respaldo Trasero y Laterales Sincronizados */}
          <div className="pt-2 border-t border-orange-200 dark:border-orange-500/30 space-y-2">
            <div className="flex justify-between items-center text-xs tracking-wider">
              <span className={isLight ? "font-bold text-slate-800" : "font-semibold text-slate-200"}>
                Respaldo Trasero (Copete)
              </span>
              <span className={`font-mono font-bold text-xs ${isLight ? 'text-orange-800' : 'text-orange-400'}`}>
                {bsMode === 'none' ? 'Sin Respaldo' : `${bsHeight} cm`}
              </span>
            </div>

            {/* Presets Rápidos Respaldo */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'Sin Respaldo', val: 0, mode: 'none' as const },
                { label: '5 cm', val: 5, mode: 'standard_5cm' as const },
                { label: '10 cm', val: 10, mode: 'custom' as const },
                { label: '15 cm', val: 15, mode: 'custom' as const },
                { label: '20 cm', val: 20, mode: 'custom' as const },
                { label: '30 cm', val: 30, mode: 'custom' as const },
                { label: '55 cm', val: 55, mode: 'full_height' as const },
              ].map((p) => {
                const isSelected = p.val === 0 ? bsMode === 'none' : bsMode !== 'none' && bsHeight === p.val;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (p.val === 0) {
                        setCountertopConfig({ backsplashMode: 'none' });
                      } else {
                        setCountertopConfig({ backsplashMode: p.mode, backsplashHeightCm: p.val });
                      }
                    }}
                    className={`py-1 px-1 rounded text-[10.5px] font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-black border-orange-500 shadow-sm'
                        : isLight
                          ? 'bg-white border-slate-200 hover:border-orange-400 text-slate-700'
                          : 'bg-black/30 border-white/10 hover:border-orange-400 text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Laterales Izquierdo y Derecho Sincronizados */}
            {bsMode !== 'none' && (
              <div className={`p-2 rounded-lg border space-y-1.5 ${
                isLight ? 'bg-white border-orange-200' : 'bg-black/40 border-white/10'
              }`}>
                <span className={`text-[10.5px] font-bold block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Laterales con Misma Altura ({bsHeight} cm):
                </span>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={countertopConfig.backsplashLeft ?? false}
                      onChange={(e) => setCountertopConfig({ backsplashLeft: e.target.checked })}
                      className="rounded text-orange-600 accent-orange-500"
                    />
                    <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}>
                      Lateral Izq. ({bsHeight}cm)
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={countertopConfig.backsplashRight ?? false}
                      onChange={(e) => setCountertopConfig({ backsplashRight: e.target.checked })}
                      className="rounded text-orange-600 accent-orange-500"
                    />
                    <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}>
                      Lateral Der. ({bsHeight}cm)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón Acceso a Configurador Completo & Nesting */}
      <button
        type="button"
        onClick={onOpenFullModal}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
      >
        <Sparkles size={14} />
        <span>Configuración Avanzada & Nesting</span>
      </button>
    </div>
  );
}

export function KitchenConfigurator({ onNavigate }: { onNavigate: () => void }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('arquify_kitchen_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('arquify_kitchen_theme', nextTheme);
    } catch {
      // ignore
    }
  };

  const isLight = theme === 'light';

  const { viewMode, setViewMode, toolMode, setToolMode, cabinets, addCabinet, activeCabinetId, updateCabinet, removeCabinet, setActiveCabinet, applyGlobalTexture, showSocle, setShowSocle, socleFinish, setSocleFinish, socleHeight, setSocleHeight, roomConfig, setRoomPlannerOpen, walls, architecturalElements, activeArchElementId, addArchitecturalElement, updateArchitecturalElement, removeArchitecturalElement, setActiveArchElement, golaSystem, setGolaSystem, countertopConfig, setCountertopConfig, qstoneCatalog, islandBackConfig, setIslandBackConfig, mepPoints, handleConfig, undo, redo, canUndo, canRedo, projectMode, setProjectMode, hospitalBaseType, setHospitalBaseType, hospitalFrameFinish = 'white', setHospitalFrameFinish } = useKitchenStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    gola: false,
    socle: false,
    handles: true,
    tapacantos: false,
    assembly: false,
    view: false,
  });

  const effectiveWalls = useMemo(() => {
    return walls && walls.length > 0 ? walls : (roomConfig?.vertices && roomConfig.vertices.length >= 3 ? roomConfig.vertices.map((v, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      return { id: `wall_v_${i}`, start: [v.x, v.y] as [number, number], end: [next.x, next.y] as [number, number], thickness: 20, height: 240 };
    }) : []);
  }, [walls, roomConfig]);

  const handleInsertModule = (tool: string) => {
    setViewMode('3d');

    if (tool.startsWith('place_arch_')) {
      setToolMode(tool as any);
      return;
    }

    const state = useKitchenStore.getState();
    const currentCabinets = state.cabinets;
    const effectiveWalls = state.walls && state.walls.length > 0 ? state.walls : (state.roomConfig?.vertices && state.roomConfig.vertices.length >= 3 ? state.roomConfig.vertices.map((v, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      return { id: `wall_v_${i}`, start: [v.x, v.y] as [number, number], end: [next.x, next.y] as [number, number], thickness: 20, height: 240 };
    }) : []);

    const specs = getCabinetSpecsFromTool(tool, currentCabinets);
    const newId = `cab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const placement = findSmartWallPlacement(
      specs,
      currentCabinets,
      effectiveWalls,
      state.roomConfig?.vertices,
      state.architecturalElements
    );

    state.addCabinet({
      id: newId,
      name: specs.name,
      type: specs.type,
      variant: specs.variant,
      width: specs.width,
      height: specs.height,
      depth: specs.depth,
      position: placement.position,
      rotation: placement.rotation,
      material: currentCabinets[0]?.material || 'melamina_blanco',
      shelfCount: specs.type === 'wall' ? 2 : (specs.type === 'tall' ? 4 : 1),
      openAction: false,
    });

    state.setActiveCabinet(newId);
    state.setToolMode('select');
  };

  const [moduleAccordions, setModuleAccordions] = useState<Record<string, boolean>>({
    bases: true,
    torres: false,
    murales: false,
    isla: false,
    arch: false,
    deco: false,
  });

  const toggleModuleAccordion = (key: string) => {
    setModuleAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCountertopModalOpen, setIsCountertopModalOpen] = useState(false);
  const [isB2BQuoteOpen, setIsB2BQuoteOpen] = useState(false);
  const [isExportingLabels, setIsExportingLabels] = useState(false);
  const [leftTab, setLeftTab] = useState<'modules' | 'placed'>('modules');
  const [rightTab, setRightTab] = useState<'module' | 'materials' | 'engineering' | 'mep'>('module');
  const [showIndividualMaterial, setShowIndividualMaterial] = useState(false);
  const globalState = useStore();
  const currentAreaM2 = calculatePolygonArea(roomConfig?.vertices || []);
  const activeArchElement = architecturalElements.find(el => el.id === activeArchElementId);

  const mepClashes = React.useMemo(() => {
    return detectMepClashes(mepPoints, cabinets, countertopConfig);
  }, [mepPoints, cabinets, countertopConfig]);

  const handleExportLabels = async () => {
    setIsExportingLabels(true);
    try {
      await exportKitchenLabelsPDF(cabinets, globalState);
    } catch (err) {
      console.error('Error al exportar etiquetas', err);
      alert('Error al generar las etiquetas de producción.');
    } finally {
      setIsExportingLabels(false);
    }
  };

  // Requisito: Cuando se carguen los muebles, las cotas deben iniciar apagadas
  useEffect(() => {
    useStore.setState({ showDimensions: false });
  }, []);

  // Auto-switch right tab to 'module' when an item is selected
  useEffect(() => {
    if (activeCabinetId || activeArchElementId) {
      setRightTab('module');
    }
  }, [activeCabinetId, activeArchElementId]);

  // Keyboard shortcut listener: Delete or Backspace to delete individual active cabinet or arch element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeCabinetId) {
        e.preventDefault();
        removeCabinet(activeCabinetId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && activeArchElementId) {
        e.preventDefault();
        removeArchitecturalElement(activeArchElementId);
      } else if (e.key === 'Escape') {
        setActiveCabinet(null);
        setActiveArchElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCabinetId, activeArchElementId, removeCabinet, removeArchitecturalElement, setActiveCabinet, setActiveArchElement]);

  const handleTextureSelect = (url: string, mat: string) => {
    // Protección estricta: Piedras y cuarzos Qstone aplican ÚNICAMENTE a cubiertas
    const isStone =
      mat === 'cuarzo' ||
      mat === 'sinterizado' ||
      mat === 'granito' ||
      mat === 'marmol' ||
      qstoneCatalog.some((p) => p.textureUrl === url || p.id === url || (p.colorHex === url && !url.startsWith('#')));

    if (isStone) {
      const matchedProd =
        qstoneCatalog.find((p) => p.textureUrl === url || p.id === url) || qstoneCatalog[0];
      if (matchedProd) {
        setCountertopConfig({ selectedProductId: matchedProd.id, enabled: true });
      }
      return;
    }

    if (!activeCabinetId) return;
    const part = globalState.targetPart;
    const activeCabinet = cabinets.find((c) => c.id === activeCabinetId);
    const urlLower = url.toLowerCase();
    const effectiveMat: 'melamina' | 'hpl' = (mat === 'hpl' || urlLower.includes('abet') || urlLower.includes('laminati') || urlLower.includes('fiore') || urlLower.includes('broccato')) ? 'hpl' : (mat as any);

    if (part === 'all') {
      updateCabinet(activeCabinetId, {
        structureColor: url, structureMaterial: effectiveMat,
        doorColor: url, doorMaterial: effectiveMat,
        drawerFrontColor: url, drawerFrontMaterial: effectiveMat,
        drawerInnerColor: url, drawerInnerMaterial: effectiveMat,
        shelfColor: url, shelfMaterial: effectiveMat,
        backColor: url, backMaterial: effectiveMat,
        socleColor: url, socleMaterial: effectiveMat,
        leftCoverPanel: activeCabinet?.leftCoverPanel?.enabled ? { ...activeCabinet.leftCoverPanel, color: url, material: effectiveMat } : undefined,
        rightCoverPanel: activeCabinet?.rightCoverPanel?.enabled ? { ...activeCabinet.rightCoverPanel, color: url, material: effectiveMat } : undefined,
      });
    } else if (part === 'structure') {
      updateCabinet(activeCabinetId, { structureColor: url, structureMaterial: effectiveMat });
    } else if (part === 'doors') {
      updateCabinet(activeCabinetId, { doorColor: url, doorMaterial: effectiveMat });
    } else if (part === 'drawerFronts') {
      updateCabinet(activeCabinetId, { drawerFrontColor: url, drawerFrontMaterial: effectiveMat });
    } else if (part === 'drawerInner') updateCabinet(activeCabinetId, { drawerInnerColor: url, drawerInnerMaterial: effectiveMat });
    else if (part === 'shelves') updateCabinet(activeCabinetId, { shelfColor: url, shelfMaterial: effectiveMat });
    else if (part === 'back') updateCabinet(activeCabinetId, { backColor: url, backMaterial: effectiveMat });
    else if (part === 'socle') updateCabinet(activeCabinetId, { socleColor: url, socleMaterial: effectiveMat });
    else if (part === 'coverPanels') {
      updateCabinet(activeCabinetId, {
        leftCoverPanel: activeCabinet?.leftCoverPanel?.enabled ? { ...activeCabinet.leftCoverPanel, color: url, material: mat as any } : undefined,
        rightCoverPanel: activeCabinet?.rightCoverPanel?.enabled ? { ...activeCabinet.rightCoverPanel, color: url, material: mat as any } : undefined,
      });
    } else if (part === 'leftCoverPanel') {
      updateCabinet(activeCabinetId, {
        leftCoverPanel: {
          enabled: true,
          extendToFloor: activeCabinet?.leftCoverPanel?.extendToFloor ?? false,
          color: url,
          material: mat as any,
          thickness: activeCabinet?.leftCoverPanel?.thickness,
        }
      });
    } else if (part === 'rightCoverPanel') {
      updateCabinet(activeCabinetId, {
        rightCoverPanel: {
          enabled: true,
          extendToFloor: activeCabinet?.rightCoverPanel?.extendToFloor ?? false,
          color: url,
          material: mat as any,
          thickness: activeCabinet?.rightCoverPanel?.thickness,
        }
      });
    }
  };

  const handleGlobalTextureSelect = (url: string, mat: string) => {
    // Protección estricta: Piedras y cuarzos Qstone aplican ÚNICAMENTE a cubiertas
    const isStone =
      mat === 'cuarzo' ||
      mat === 'sinterizado' ||
      mat === 'granito' ||
      mat === 'marmol';

    if (isStone) {
      const matchedProd =
        qstoneCatalog.find((p) => p.textureUrl === url || p.id === url) || qstoneCatalog[0];
      if (matchedProd) {
        setCountertopConfig({ selectedProductId: matchedProd.id, enabled: true });
      }
      return;
    }

    const currentTargetPart = useStore.getState().targetPart;
    const urlLower = url.toLowerCase();
    const effectiveMat: 'melamina' | 'hpl' = (mat === 'hpl' || isHplFinish(url, mat as any) || urlLower.includes('abet') || urlLower.includes('laminati') || urlLower.includes('fiore') || urlLower.includes('broccato')) ? 'hpl' : 'melamina';

    if (currentTargetPart === 'islandBack') {
      setIslandBackConfig({
        enabled: true,
        materialType: 'decorative',
        decorativeColor: url,
        decorativeMaterial: effectiveMat,
      });
      return;
    }

    applyGlobalTexture(currentTargetPart, url, effectiveMat);

    const s = useStore.getState();
    if (currentTargetPart === 'structure' || currentTargetPart === 'all') {
      s.setStructureColor(url);
      s.setStructureMaterial(effectiveMat);
    }
    if (currentTargetPart === 'doors' || currentTargetPart === 'all') {
      s.setDoorColor(url);
      s.setDoorMaterial(effectiveMat);
    }
    if (currentTargetPart === 'drawerFronts' || currentTargetPart === 'all') {
      s.setDrawerFrontColor(url);
      s.setDrawerFrontMaterial(effectiveMat);
    }
    if (currentTargetPart === 'drawerInner' || currentTargetPart === 'all') {
      s.setDrawerInnerColor(url);
      s.setDrawerInnerMaterial(effectiveMat as any);
    }
    if (currentTargetPart === 'shelves' || currentTargetPart === 'all') {
      s.setShelfColor(url);
      s.setShelfMaterial(effectiveMat as any);
    }
    if (currentTargetPart === 'back' || currentTargetPart === 'all') {
      s.setBackColor(url);
    }
    if (currentTargetPart === 'socle' || currentTargetPart === 'all') {
      s.setSocleColor(url);
      s.setSocleMaterial(effectiveMat as any);
    }
  };

  const activeCabinet = cabinets.find(c => c.id === activeCabinetId);

  return (
    <div className={`flex flex-col h-screen w-screen font-sans overflow-hidden transition-colors ${isLight ? 'bg-[#f8fafc] text-slate-800' : 'bg-[#0A0A0A] text-slate-200'}`}>
      {/* Planos de Fabricación y Despiece CAD/CAM */}
      <KitchenBlueprint />

      {/* Modal de Configuración y Dibujo de Estancia */}
      <RoomPlannerModal />

      {/* Modal de Confirmación para Reiniciar y Partir de Cero */}
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />

      <nav className={`flex items-center justify-between px-6 py-3.5 border-b backdrop-blur-md z-20 transition-colors ${
        isLight ? 'border-slate-200 bg-white/90 shadow-sm' : 'border-white/10 bg-black/60'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onNavigate} 
            className={`p-2 rounded-lg transition-colors border ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`} 
            title="Volver al Inicio"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-bellota text-2xl font-bold lowercase text-orange-500 tracking-tight select-none">arquify</span>
            <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/60 border-white/10'}`}>
              <button
                onClick={() => setProjectMode('hospital')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  projectMode === 'hospital'
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Hospitalario: Cuerpos clínicos MC.2.02, Krion 12mm, Asa Kutz, Bastidor FE 30x50 y cerraduras ANVER"
              >
                <span className="text-sm">🏥</span>
                <span>Hospitalario (MC.2.02)</span>
              </button>
              <button
                onClick={() => setProjectMode('residential')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  projectMode === 'residential'
                    ? 'bg-orange-500 text-black shadow-sm ring-1 ring-orange-400'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Residencial: Cocinas estándar, zócalos de melamina y cuarzo tradicional"
              >
                <span className="text-sm">🍳</span>
                <span>Cocina Residencial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Acceso directo a Área de Cocina, Vistas y Reinicio */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeCabinetId) setActiveCabinet(null);
              if (activeArchElementId) setActiveArchElement(null);
              setRoomPlannerOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm group ${
              isLight
                ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700'
                : 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-orange-300'
            }`}
          >
            <Maximize2 size={14} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <span>{projectMode === 'hospital' ? 'Recinto Clínico: ' : 'Área de cocina: '}<span className={`font-mono underline decoration-orange-500/50 underline-offset-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{roomConfig.type === 'rectangular' ? 'Rectangular' : roomConfig.type === 'l_shape' ? 'Forma L' : roomConfig.type === 'five_corners' ? '5 Esquinas' : roomConfig.type === 'u_shape' ? 'Forma U' : 'Diseño Libre'}</span> ({currentAreaM2.toFixed(2)} m²)</span>
          </button>

          <div className={`flex p-1 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/50 border-white/10'}`}>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === '2d' ? 'bg-orange-500 text-black' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Plano 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === '3d' ? 'bg-orange-500 text-black' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              Vista 3D
            </button>
          </div>

          {/* Botones Deshacer y Rehacer (Undo / Redo) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className={`flex items-center justify-center p-2 rounded-lg border transition-all shadow-sm ${
                canUndo()
                  ? isLight
                    ? 'bg-orange-50 hover:bg-orange-100 border-orange-400 text-orange-600 cursor-pointer active:scale-95 shadow-orange-500/10'
                    : 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/60 text-orange-400 hover:text-orange-300 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={canUndo() ? 'Deshacer última acción (Ctrl+Z)' : 'Sin acciones para deshacer'}
              aria-label="Deshacer"
            >
              <Undo2 size={16} strokeWidth={2.5} />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo()}
              className={`flex items-center justify-center p-2 rounded-lg border transition-all shadow-sm ${
                canRedo()
                  ? isLight
                    ? 'bg-orange-50 hover:bg-orange-100 border-orange-400 text-orange-600 cursor-pointer active:scale-95 shadow-orange-500/10'
                    : 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/60 text-orange-400 hover:text-orange-300 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={canRedo() ? 'Rehacer acción (Ctrl+Y / Ctrl+Shift+Z)' : 'Sin acciones para rehacer'}
              aria-label="Rehacer"
            >
              <Redo2 size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Botón selector de Modo Claro / Oscuro */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-400 hover:text-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-700" />}
            <span className="hidden md:inline">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <button
            onClick={() => setIsB2BQuoteOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-400 hover:text-amber-300'
            }`}
            title="Cotización Comercial Dual (Costo Fábrica B2B vs Venta Cliente Final)"
          >
            <DollarSign size={14} className="text-amber-500" />
            <span>Cotización B2B</span>
          </button>

          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-600/20 cursor-pointer"
            title="Guardar diseño actual en el Backoffice"
          >
            <Save size={14} />
            <span>Guardar Proyecto</span>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
            title="Borrar todo y partir de cero"
          >
            <RotateCcw size={14} />
            <span>Partir de Cero</span>
          </button>
        </div>
      </nav>
      <main className="flex flex-1 overflow-hidden relative">
         <div className={`w-72 shrink-0 border-r flex flex-col z-10 transition-colors shadow-2xl ${isLight ? 'bg-white border-slate-200 shadow-slate-200' : 'bg-zinc-900 border-white/10'}`}>
            <div className={`p-4 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
               <h3 className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Herramientas</h3>
               <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (activeCabinetId) setActiveCabinet(null);
                      if (activeArchElementId) setActiveArchElement(null);
                      setRoomPlannerOpen(true);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all bg-[#FACC15] text-black hover:bg-[#eab308] shadow-[0_0_15px_rgba(250,204,21,0.25)] cursor-pointer"
                  >
                    <Layers size={16} />
                    <div className="flex flex-col text-left">
                      <span>{projectMode === 'hospital' ? 'Recinto Clínico' : 'Área de Cocina'}</span>
                      <span className="text-[9px] text-zinc-800 font-normal font-mono">{currentAreaM2.toFixed(2)} m² • Muros y Cotas</span>
                    </div>
                  </button>

                  {/* En modo residencial: Cubiertas Qstone */}
                  {projectMode === 'residential' && (
                    <button
                      onClick={() => {
                        if (activeCabinetId) setActiveCabinet(null);
                        if (activeArchElementId) setActiveArchElement(null);
                        setIsCountertopModalOpen(true);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                        countertopConfig.enabled
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : isLight
                            ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <Sparkles size={16} className="text-amber-400 shrink-0" />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span>Cubiertas Qstone</span>
                          {countertopConfig.enabled && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          )}
                        </div>
                        <span className="text-[9px] font-normal text-slate-400 font-mono">
                          {countertopConfig.enabled
                            ? `${qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId)?.materialType === 'sinterizado' ? 'Sinterizado 12mm' : 'Cuarzo'} • Faldón ${countertopConfig.regruesoCm}cm`
                            : 'Cuarzos & Sinterizados • Nesting'}
                        </span>
                      </div>
                    </button>
                  )}

                  <ToolButton isLight={isLight} active={toolMode === 'draw_wall'} onClick={() => { if (activeCabinetId) setActiveCabinet(null); if (activeArchElementId) setActiveArchElement(null); setToolMode('draw_wall'); setViewMode('2d'); }} icon={<PenTool size={16}/>} label="Dibujar Tramo Muro" />
               </div>
            </div>

            {/* Pestañas Catálogo Módulos / En Escena */}
            <div className={`grid grid-cols-2 border-b p-2 gap-1.5 transition-colors ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/50'}`}>
              <button
                onClick={() => setLeftTab('modules')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'modules'
                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Box size={13} />
                <span>Módulos</span>
              </button>
              <button
                onClick={() => setLeftTab('placed')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'placed'
                    ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListOrdered size={13} />
                <span>Escena</span>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
               {leftTab === 'modules' ? (
                 <div className="flex flex-col gap-2">
                    {/* ENTORNO HOSPITALARIO: ÚNICAMENTE MÓDULOS HOSPITALARIOS Y ELEMENTOS ARQUITECTÓNICOS */}
                    {projectMode === 'hospital' ? (
                      <>
                        {/* 0. MÓDULOS HOSPITALARIOS / CLÍNICOS */}
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col gap-2 mb-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                              <span>🏥 Mobiliario Clínico (MC.2.02)</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">Norma SACYR</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            Bastidor metálico FE 30x50mm a 300mm de piso, cubierta Krion/HPL/Postformado y perfil tirador KUTZ.
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 mt-1">
                            <ToolButton 
                              isLight={isLight} 
                              active={toolMode === 'place_hospital_meson_3drawers'} 
                              onClick={() => handleInsertModule('place_hospital_meson_3drawers')} 
                              icon={<Box size={14} className="text-emerald-400"/>} 
                              label="Mesón 3 Cajones (ANVER 45cm)" 
                            />
                            <ToolButton 
                              isLight={isLight} 
                              active={toolMode === 'place_hospital_meson_2doors'} 
                              onClick={() => handleInsertModule('place_hospital_meson_2doors')} 
                              icon={<Box size={14} className="text-emerald-400"/>} 
                              label="Mesón 2 Puertas (KUTZ 90cm)" 
                            />
                            <ToolButton 
                              isLight={isLight} 
                              active={toolMode === 'place_hospital_meson_1door'} 
                              onClick={() => handleInsertModule('place_hospital_meson_1door')} 
                              icon={<Box size={14} className="text-emerald-400"/>} 
                              label="Mesón 1 Puerta (KUTZ 90cm)" 
                            />
                            <ToolButton 
                              isLight={isLight} 
                              active={toolMode === 'place_hospital_niche_open'} 
                              onClick={() => handleInsertModule('place_hospital_niche_open')} 
                              icon={<Box size={14} className="text-emerald-400"/>} 
                              label="Nicho Abierto Insumos (30cm)" 
                            />
                          </div>
                        </div>

                        {/* Elementos Arquitectónicos */}
                        <ModuleCategoryAccordion
                          id="arch"
                          title="Elementos Arquitectónicos"
                          count={3}
                          icon={<Columns size={14} />}
                          isOpen={moduleAccordions.arch !== false}
                          onToggle={() => toggleModuleAccordion('arch')}
                          hasActiveTool={['place_arch_door', 'place_arch_window', 'place_arch_pillar'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_door'} onClick={() => { setToolMode('place_arch_door'); setViewMode('3d'); }} icon={<Columns size={14}/>} label="Puerta" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_window'} onClick={() => { setToolMode('place_arch_window'); setViewMode('3d'); }} icon={<Square size={14}/>} label="Ventana" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_pillar'} onClick={() => { setToolMode('place_arch_pillar'); setViewMode('3d'); }} icon={<Maximize2 size={14}/>} label="Pilar / Muro Corto" />
                        </ModuleCategoryAccordion>
                      </>
                    ) : (
                      <>
                        {/* ENTORNO RESIDENCIAL: CATÁLOGO COMPLETO DE COCINAS RESIDENCIALES */}
                        {/* 1. Bases */}
                        <ModuleCategoryAccordion
                          id="bases"
                          title="1. Bases"
                          count={10}
                          icon={<Box size={14} />}
                          isOpen={!!moduleAccordions.bases}
                          onToggle={() => toggleModuleAccordion('bases')}
                          hasActiveTool={['place_base_1_door', 'place_base_1_door_1_drawer', 'place_base_2_doors', 'place_base_4_drawers', 'place_base_2_pot_drawers', 'place_base_sink_u_drawer', 'place_base_spice_rack', 'place_base_wine_rack', 'place_base_corner_blind', 'place_base_corner_l'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_1_door'} onClick={() => handleInsertModule('place_base_1_door')} icon={<Box size={14}/>} label="1 Puerta" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_1_door_1_drawer'} onClick={() => handleInsertModule('place_base_1_door_1_drawer')} icon={<Box size={14}/>} label="1 Pta + 1 Cajón" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_2_doors'} onClick={() => handleInsertModule('place_base_2_doors')} icon={<Box size={14}/>} label="2 Puertas" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_4_drawers'} onClick={() => handleInsertModule('place_base_4_drawers')} icon={<Box size={14}/>} label="4 Cajones" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_2_pot_drawers'} onClick={() => handleInsertModule('place_base_2_pot_drawers')} icon={<Box size={14}/>} label="2 Olleros" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_sink_u_drawer'} onClick={() => handleInsertModule('place_base_sink_u_drawer')} icon={<Box size={14}/>} label="Fregadero Cajón en U" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_spice_rack'} onClick={() => handleInsertModule('place_base_spice_rack')} icon={<Box size={14}/>} label="Especiero" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_wine_rack'} onClick={() => handleInsertModule('place_base_wine_rack')} icon={<Wine size={14}/>} label="Botellero Base" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_corner_blind'} onClick={() => handleInsertModule('place_base_corner_blind')} icon={<Box size={14}/>} label="Esquinero Ciego" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_base_corner_l'} onClick={() => handleInsertModule('place_base_corner_l')} icon={<Box size={14}/>} label="Esquinero en L (90x90)" />
                        </ModuleCategoryAccordion>

                        {/* 2. Torres & Despensas */}
                        <ModuleCategoryAccordion
                          id="torres"
                          title="2. Torres & Despensas"
                          count={9}
                          icon={<LayoutGrid size={14} />}
                          isOpen={!!moduleAccordions.torres}
                          onToggle={() => toggleModuleAccordion('torres')}
                          hasActiveTool={['place_tall_1_door', 'place_tall_split_2_doors', 'place_tall_oven_micro', 'place_tall_oven_vent', 'place_tall_inner_drawers', 'place_tall_microwave_niche', 'place_tall_open', 'place_tall_wine_rack', 'place_tall_2_doors'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_1_door'} onClick={() => handleInsertModule('place_tall_1_door')} icon={<LayoutGrid size={14}/>} label="1 Pta Larga (Repisas)" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_split_2_doors'} onClick={() => handleInsertModule('place_tall_split_2_doors')} icon={<LayoutGrid size={14}/>} label="2 Ptas (Línea Base + Alta)" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_oven_micro'} onClick={() => handleInsertModule('place_tall_oven_micro')} icon={<LayoutGrid size={14}/>} label="Torre Horno + Micro Empotrado" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_oven_vent'} onClick={() => handleInsertModule('place_tall_oven_vent')} icon={<LayoutGrid size={14}/>} label="Torre Hornos Vent. Técnica" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_inner_drawers'} onClick={() => handleInsertModule('place_tall_inner_drawers')} icon={<LayoutGrid size={14}/>} label="Despensa Cajones Interiores" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_microwave_niche'} onClick={() => handleInsertModule('place_tall_microwave_niche')} icon={<LayoutGrid size={14}/>} label="Nicho Micro Portátil" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_open'} onClick={() => handleInsertModule('place_tall_open')} icon={<LayoutGrid size={14}/>} label="Repisas a la Vista" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_wine_rack'} onClick={() => handleInsertModule('place_tall_wine_rack')} icon={<Wine size={14}/>} label="Botellero Despensa" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_tall_2_doors'} onClick={() => handleInsertModule('place_tall_2_doors')} icon={<LayoutGrid size={14}/>} label="Despensa 2 Puertas" />
                        </ModuleCategoryAccordion>

                        {/* 3. Murales & Aéreos */}
                        <ModuleCategoryAccordion
                          id="murales"
                          title="3. Murales & Aéreos"
                          count={8}
                          icon={<Square size={14} />}
                          isOpen={!!moduleAccordions.murales}
                          onToggle={() => toggleModuleAccordion('murales')}
                          hasActiveTool={['place_wall_1_door', 'place_wall_2_doors', 'place_wall_lift_up', 'place_wall_lift_up_double', 'place_wall_microwave_niche', 'place_wall_open', 'place_wall_corner_blind', 'place_wall_wine_rack'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_1_door'} onClick={() => handleInsertModule('place_wall_1_door')} icon={<Square size={14}/>} label="1. Aéreo 1 Puerta" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_2_doors'} onClick={() => handleInsertModule('place_wall_2_doors')} icon={<Square size={14}/>} label="2. Aéreo 2 Puertas" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_lift_up'} onClick={() => handleInsertModule('place_wall_lift_up')} icon={<Square size={14}/>} label="3. Pta Elevable Aventos" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_lift_up_double'} onClick={() => handleInsertModule('place_wall_lift_up_double')} icon={<Square size={14}/>} label="4. Doble Pta Elevable" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_microwave_niche'} onClick={() => handleInsertModule('place_wall_microwave_niche')} icon={<Square size={14}/>} label="5. Nicho Micro + Pta Sup" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_open'} onClick={() => handleInsertModule('place_wall_open')} icon={<Square size={14}/>} label="6. Repisas a la Vista" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_corner_blind'} onClick={() => handleInsertModule('place_wall_corner_blind')} icon={<Square size={14}/>} label="7. Aéreo Esquinero Ciego" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_wall_wine_rack'} onClick={() => handleInsertModule('place_wall_wine_rack')} icon={<Wine size={14}/>} label="8. Botellero Aéreo" />
                        </ModuleCategoryAccordion>

                        {/* 4. Isla */}
                        <ModuleCategoryAccordion
                          id="isla"
                          title="4. Muebles Isla"
                          count={6}
                          icon={<Layers size={14} />}
                          isOpen={!!moduleAccordions.isla}
                          onToggle={() => toggleModuleAccordion('isla')}
                          hasActiveTool={[
                            'place_island',
                            'place_island_4_drawers',
                            'place_island_2_drawers_1_pot',
                            'place_island_1_door',
                            'place_island_2_doors',
                            'place_island_wine_rack'
                          ].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_island'} onClick={() => handleInsertModule('place_island')} icon={<Box size={14}/>} label="Isla 2 Olleros" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_island_4_drawers'} onClick={() => handleInsertModule('place_island_4_drawers')} icon={<LayoutGrid size={14}/>} label="Isla 4 Cajones" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_island_2_drawers_1_pot'} onClick={() => handleInsertModule('place_island_2_drawers_1_pot')} icon={<LayoutGrid size={14}/>} label="Isla 2 Caj. + 1 Ollero" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_island_1_door'} onClick={() => handleInsertModule('place_island_1_door')} icon={<Square size={14}/>} label="Isla 1 Puerta" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_island_2_doors'} onClick={() => handleInsertModule('place_island_2_doors')} icon={<Columns size={14}/>} label="Isla 2 Puertas" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_island_wine_rack'} onClick={() => handleInsertModule('place_island_wine_rack')} icon={<Wine size={14}/>} label="Botellero Isla" />
                        </ModuleCategoryAccordion>

                        {/* 5. Elementos Arquitectónicos */}
                        <ModuleCategoryAccordion
                          id="arch"
                          title="5. Elementos Arquitectónicos"
                          count={3}
                          icon={<Columns size={14} />}
                          isOpen={!!moduleAccordions.arch}
                          onToggle={() => toggleModuleAccordion('arch')}
                          hasActiveTool={['place_arch_door', 'place_arch_window', 'place_arch_pillar'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_door'} onClick={() => { setToolMode('place_arch_door'); setViewMode('3d'); }} icon={<Columns size={14}/>} label="Puerta" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_window'} onClick={() => { setToolMode('place_arch_window'); setViewMode('3d'); }} icon={<Square size={14}/>} label="Ventana" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_arch_pillar'} onClick={() => { setToolMode('place_arch_pillar'); setViewMode('3d'); }} icon={<Maximize2 size={14}/>} label="Pilar / Muro Corto" />
                        </ModuleCategoryAccordion>

                        {/* 6. Decoración */}
                        <ModuleCategoryAccordion
                          id="deco"
                          title="6. Decoración"
                          count={5}
                          icon={<Sparkles size={14} />}
                          isOpen={!!moduleAccordions.deco}
                          onToggle={() => toggleModuleAccordion('deco')}
                          hasActiveTool={['place_deco_stove', 'place_deco_fridge', 'place_deco_hood', 'place_deco_plant', 'place_deco_dishwasher'].includes(toolMode)}
                          isLight={isLight}
                        >
                          <ToolButton isLight={isLight} active={toolMode === 'place_deco_stove'} onClick={() => handleInsertModule('place_deco_stove')} icon={<Flame size={14}/>} label="1. Cocina FDV 90" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_deco_fridge'} onClick={() => handleInsertModule('place_deco_fridge')} icon={<Refrigerator size={14}/>} label="2. Refrigerador SBS" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_deco_hood'} onClick={() => handleInsertModule('place_deco_hood')} icon={<Sparkles size={14}/>} label="3. Campana FDV Conic 90" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_deco_plant'} onClick={() => handleInsertModule('place_deco_plant')} icon={<Flower2 size={14}/>} label="4. Planta Interior" />
                          <ToolButton isLight={isLight} active={toolMode === 'place_deco_dishwasher'} onClick={() => handleInsertModule('place_deco_dishwasher')} icon={<Utensils size={14}/>} label="5. Lavavajillas FDV 12C" />
                        </ModuleCategoryAccordion>
                      </>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                     <div className={`text-[10px] uppercase font-bold tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                       Módulos en Escena ({cabinets.length})
                     </div>
                     {cabinets.length > 0 && (
                       <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Clic para editar o borrar</span>
                     )}
                   </div>

                   {cabinets.length === 0 ? (
                     <div className={`p-5 rounded-xl border text-center flex flex-col items-center gap-2.5 mt-2 ${
                       isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                     }`}>
                       <Box size={24} className={isLight ? "text-slate-400" : "text-zinc-500"} />
                       <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>No hay muebles cargados en la escena</p>
                       <button
                         onClick={() => setLeftTab('modules')}
                         className="mt-1 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-orange-500/40 transition-colors cursor-pointer"
                       >
                         Ver Catálogo de Módulos
                       </button>
                     </div>
                   ) : (
                     <div className="flex flex-col gap-2">
                       {cabinets.map((cab, idx) => {
                         const isSelected = cab.id === activeCabinetId;
                         const label = getCabinetLabel(cab, idx);
                         return (
                           <div
                             key={cab.id}
                             onClick={() => setActiveCabinet(isSelected ? null : cab.id)}
                             className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-2 ${
                               isSelected
                                 ? isLight
                                   ? 'bg-orange-50 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                   : 'bg-orange-500/15 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                 : isLight
                                   ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                                   : 'bg-[#18181b] border-white/10 hover:border-white/20 hover:bg-[#202024]'
                             }`}
                           >
                             <div className="flex items-center justify-between gap-2">
                               <div className="flex items-center gap-2 min-w-0">
                                 <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                                   isLight
                                     ? isSelected
                                       ? 'bg-orange-500 text-black border-orange-600'
                                       : 'bg-slate-100 border-slate-300 text-slate-700'
                                     : 'bg-black/50 border-white/10 text-orange-400'
                                 }`}>
                                   MOD {idx + 1}
                                 </span>
                                 <span className={`text-xs font-bold truncate ${
                                   isSelected
                                     ? isLight ? 'text-slate-900 font-extrabold' : 'text-white'
                                     : isLight ? 'text-slate-700 group-hover:text-slate-950' : 'text-zinc-200 group-hover:text-white'
                                 }`}>
                                   {label}
                                 </span>
                               </div>
                               <div className="flex items-center gap-1 shrink-0">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const currentRot = cab.rotation || 0;
                                     const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                                     updateCabinet(cab.id, { rotation: nextRot });
                                   }}
                                   title="Girar 90°"
                                   className={`p-1 rounded transition-colors ${
                                     isLight
                                       ? 'text-slate-400 hover:text-cyan-600 hover:bg-slate-100'
                                       : 'text-zinc-400 hover:text-cyan-400 hover:bg-white/5'
                                   }`}
                                 >
                                   <RotateCw size={13} />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     removeCabinet(cab.id);
                                   }}
                                   title="Eliminar este mueble"
                                   className={`p-1 rounded transition-colors ${
                                     isLight
                                       ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                       : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                                   }`}
                                 >
                                   <Trash2 size={13} />
                                 </button>
                               </div>
                             </div>

                             <div className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${
                               isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-zinc-400'
                             }`}>
                               <span>{cab.width} × {cab.height} × {cab.depth} cm</span>
                               <span className={`text-[9px] uppercase font-sans tracking-wider ${
                                 isLight ? 'text-slate-500' : 'text-zinc-500'
                               }`}>
                                 {cab.type === 'base' ? 'Base' : cab.type === 'tall' ? 'Torre' : cab.type === 'wall' ? 'Aéreo' : cab.type === 'island' ? 'Isla' : 'Equipamiento'}
                               </span>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
            </div>
         </div>
         <div className={`flex-1 min-w-0 relative transition-colors ${isLight ? 'bg-[#e2e8f0]' : 'bg-[#111]'}`}>
            <KitchenScene theme={theme} />
            {toolMode === 'draw_wall' && (
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-6 py-3 rounded-full border text-xs font-semibold pointer-events-none uppercase tracking-wider ${
                isLight ? 'bg-white/90 border-slate-300 text-slate-800 shadow-lg' : 'bg-black/80 border-white/10 text-slate-300'
              }`}>
                Haz clic en la grilla para iniciar un muro. Pulsa ESC para cancelar.
              </div>
            )}
            {(toolMode.startsWith('place_') || toolMode === 'move_active') && (
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-6 py-3 rounded-full border text-xs font-semibold pointer-events-none uppercase tracking-wider ${
                isLight ? 'bg-orange-100/90 border-orange-300 text-orange-950 shadow-lg' : 'bg-orange-500/20 border-orange-500/50 text-blue-200'
              }`}>
                {toolMode.startsWith('place_island') ? 'Mueve sobre el piso (imantación automática a islas y cuadrícula). Clic para fijar.' : 'Mueve el cursor sobre un muro para imantar. Clic para posicionar.'}
              </div>
            )}
         </div>
      
    <aside className={`relative z-20 w-96 md:w-[400px] xl:w-[420px] shrink-0 backdrop-blur-xl border-l h-full flex flex-col pointer-events-auto transition-colors shadow-2xl ${
      isLight ? 'bg-white/95 border-slate-200 shadow-slate-200 text-slate-800' : 'bg-black/70 border-white/10 text-slate-200'
    }`}>
      {/* Selector de Pestañas Superior */}
      <div className={`grid grid-cols-4 border-b p-2 gap-1.5 shrink-0 transition-colors ${
        isLight ? 'border-slate-200 bg-slate-100/70' : 'border-white/10 bg-black/60'
      }`}>
        <button
          onClick={() => setRightTab('module')}
          className={`relative flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            rightTab === 'module'
              ? isLight
                ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                : 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box size={14} className="shrink-0" />
          <span className="truncate">Módulo</span>
          {activeCabinetId && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-black animate-pulse" />
          )}
        </button>
        <button
          onClick={() => {
            if (activeCabinetId) setActiveCabinet(null);
            if (activeArchElementId) setActiveArchElement(null);
            setRightTab('materials');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            rightTab === 'materials'
              ? isLight
                ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                : 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette size={14} className="shrink-0" />
          <span className="truncate">Acabados</span>
        </button>
        <button
          onClick={() => {
            if (activeCabinetId) setActiveCabinet(null);
            if (activeArchElementId) setActiveArchElement(null);
            setRightTab('engineering');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            rightTab === 'engineering'
              ? isLight
                ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                : 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders size={14} className="shrink-0" />
          <span className="truncate">Herrajes</span>
        </button>
        <button
          onClick={() => {
            if (activeCabinetId) setActiveCabinet(null);
            if (activeArchElementId) setActiveArchElement(null);
            setRightTab('mep');
          }}
          className={`relative flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            rightTab === 'mep'
              ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
              : isLight
                ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Trazado MEP & Interferencias"
        >
          <Wrench size={14} className="shrink-0" />
          <span className="truncate">MEP</span>
          {mepClashes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-white animate-pulse">
              {mepClashes.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido Scrollable según Pestaña */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {rightTab === 'module' && (
          <div>
            {activeArchElementId && activeArchElement ? (
              <div className="mb-4">
                <h2 className={isLight ? "text-xs uppercase tracking-wider text-orange-600 font-bold mb-3 mt-4 first:mt-0" : sectionTitle}>Propiedades Arquitectónicas</h2>
                <div className={`p-4 rounded-xl flex flex-col gap-3 ${
                  isLight ? 'bg-slate-50 border border-slate-200 shadow-sm' : 'bg-white/5 border border-white/10 shadow-inner'
                }`}>
                  <div className={`flex justify-between items-center border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                    <h3 className={`text-xs uppercase tracking-wider font-bold truncate pr-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                      {activeArchElement.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setToolMode('move_active');
                          setViewMode('3d');
                        }}
                        className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Mover elemento"
                      >
                        <Move3D size={13} />
                        <span>Mover</span>
                      </button>
                      <button
                        onClick={() => {
                          const currentRot = activeArchElement.rotation || 0;
                          const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                          updateArchitecturalElement(activeArchElement.id, { rotation: nextRot });
                        }}
                        className="text-xs text-cyan-500 hover:text-cyan-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Girar 90°"
                      >
                        <RotateCw size={13} />
                        <span>Girar</span>
                      </button>
                      <button
                        onClick={() => setActiveArchElement(null)}
                        className={`text-xs flex items-center gap-1 font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Deseleccionar"
                      >
                        <span>Soltar</span>
                      </button>
                      <button
                        onClick={() => removeArchitecturalElement(activeArchElement.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid ${activeArchElement.type === 'pillar' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 p-2.5 rounded-lg border text-center ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'}`}>
                    <div>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Ancho</div>
                      <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.width} cm</div>
                    </div>
                    <div>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Alto</div>
                      <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.height} cm</div>
                    </div>
                    {activeArchElement.type === 'pillar' && (
                      <div>
                        <div className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Prof.</div>
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeArchElement.depth || 30} cm</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {(() => {
                      const currentArchWall = effectiveWalls.find(w => w.id === activeArchElement.wallId || `wall_${w.id}` === activeArchElement.wallId || w.id === `wall_${activeArchElement.wallId}`) || effectiveWalls[0];
                      const currentArchWallLen = currentArchWall ? Math.hypot(currentArchWall.end[0] - currentArchWall.start[0], currentArchWall.end[1] - currentArchWall.start[1]) : 300;
                      const maxArchOffset = Math.max(20, Math.floor(currentArchWallLen / 2 - activeArchElement.width / 2 - 2));

                      return (
                        <>
                          {effectiveWalls.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                Muro Asignado (Clic para reubicar)
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {effectiveWalls.map((w, idx) => {
                                  const isThisWall = currentArchWall?.id === w.id;
                                  const wLength = Math.round(Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]));
                                  return (
                                    <button
                                      key={w.id || idx}
                                      type="button"
                                      onClick={() => {
                                        const [x1, z1] = w.start;
                                        const [x2, z2] = w.end;
                                        const len = Math.hypot(x2 - x1, z2 - z1);
                                        const uX = (x2 - x1) / len;
                                        const uZ = (z2 - z1) / len;
                                        const pX = x1 + (len / 2) * uX;
                                        const pZ = z1 + (len / 2) * uZ;
                                        const rot = Math.atan2(x1 - x2, z1 - z2);
                                        updateArchitecturalElement(activeArchElement.id, {
                                          wallId: w.id,
                                          offset: 0,
                                          position: [pX, activeArchElement.elevation + activeArchElement.height / 2, pZ],
                                          rotation: rot,
                                        });
                                      }}
                                      className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                                        isThisWall
                                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                          : isLight
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                      }`}
                                    >
                                      <span>Muro {idx + 1}</span>
                                      <span className="text-[10px] opacity-75">{wLength} cm</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const isDoor = activeArchElement.type === 'door';
                            const isWindow = activeArchElement.type === 'window';
                            const wallMaxHeight = currentArchWall?.height || 240;

                            const widthMin = isDoor ? 50 : isWindow ? 20 : 10;
                            const widthMax = isDoor ? 120 : isWindow ? 300 : 150;

                            const heightMin = isDoor ? 210 : isWindow ? 20 : 50;
                            const heightMax = wallMaxHeight;

                            return (
                              <>
                                <SliderControl
                                  isLight={isLight}
                                  label="Ancho (cm)"
                                  value={activeArchElement.width}
                                  min={widthMin}
                                  max={widthMax}
                                  step={5}
                                  onChange={(val) => updateArchitecturalElement(activeArchElement.id, { width: val })}
                                />
                                <SliderControl
                                  isLight={isLight}
                                  label="Alto (cm)"
                                  value={activeArchElement.height}
                                  min={heightMin}
                                  max={heightMax}
                                  step={5}
                                  onChange={(val) => updateArchitecturalElement(activeArchElement.id, { height: val })}
                                />
                              </>
                            );
                          })()}

                          {/* Ajuste milimétrico de posición en el muro */}
                          <SliderControl
                            isLight={isLight}
                            label="Posición en Muro (Desplazamiento cm)"
                            value={Math.round(activeArchElement.offset || 0)}
                            min={-maxArchOffset}
                            max={maxArchOffset}
                            step={1}
                            onChange={(val) => updateArchitecturalElement(activeArchElement.id, { offset: val })}
                          />
                        </>
                      );
                    })()}

                    {activeArchElement.type === 'window' && (
                      <SliderControl
                        isLight={isLight}
                        label="Altura en Muro / Antepecho (cm)"
                        value={activeArchElement.elevation}
                        min={0}
                        max={180}
                        step={5}
                        onChange={(val) => updateArchitecturalElement(activeArchElement.id, { elevation: val })}
                      />
                    )}

                    {activeArchElement.type === 'pillar' && (
                      <SliderControl
                        isLight={isLight}
                        label="Largo / Profundidad (cm)"
                        value={activeArchElement.depth || 30}
                        min={10}
                        max={150}
                        step={5}
                        onChange={(val) => updateArchitecturalElement(activeArchElement.id, { depth: val })}
                      />
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setToolMode('move_active');
                          setViewMode('3d');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      >
                        <Move3D size={14} />
                        Reubicar / Mover
                      </button>
                      <button
                        onClick={() => setActiveArchElement(null)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                          isLight
                            ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        Deseleccionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeCabinetId && activeCabinet ? (
              <div className="mb-4">
                <KitchenModuleContextMenu
                  inline={true}
                  isLight={isLight}
                  onOpenIslandBack={() => setRightTab('materials')}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className={`p-4 rounded-2xl flex items-start gap-3.5 border transition-all ${
                  isLight ? 'bg-slate-50/80 border-slate-200 shadow-xs' : 'bg-white/[0.03] border-white/10'
                }`}>
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    <Info size={18} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Sin Módulo Seleccionado
                    </h4>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Haz clic en cualquier mueble en el visor 3D para ajustar sus dimensiones, variantes o rotación particular.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-white/[0.03] border-white/10'
                }`}>
                  <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                    Visualización de Escena
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <ToggleBtn isLight={isLight} active={globalState.showDimensions} onClick={globalState.toggleDimensions} label="Mostrar Cotas" />
                      {globalState.showDimensions && (
                        <div className={`mt-2 flex flex-col gap-2.5 p-3 rounded-xl border transition-all ${
                          isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800'
                        }`}>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={isLight ? "text-slate-900 uppercase tracking-wider text-[11px]" : "text-white uppercase tracking-wider text-[11px]"}>
                              {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.title || `Nivel ${globalState.dimensionLevel}`}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-500 dark:text-orange-400 font-mono font-bold border border-orange-500/30">
                              {globalState.dimensionLevel}/6
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={1} 
                            max={6} 
                            step={1}
                            value={globalState.dimensionLevel} 
                            onChange={(e) => globalState.setDimensionLevel(Number(e.target.value))}
                            className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all ${
                              isLight ? 'bg-slate-200' : 'bg-zinc-800'
                            }`}
                            title="Nivel de Detalle de Cotas"
                          />
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                            {DIMENSION_LEVEL_DATA[globalState.dimensionLevel]?.desc}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <ToggleBtn isLight={isLight} active={globalState.isTransparent} onClick={globalState.toggleTransparent} label="Modo Transparente (Rayos X)" />
                    </div>
                  </div>
                </div>

                {/* LOTE DE FABRICACIÓN / PRODUCCIÓN EN SERIE */}
                {projectMode === 'hospital' ? (
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-white/[0.03] border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs uppercase tracking-wider font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                        Lote de Fabricación
                      </h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase font-mono tracking-wide ${
                        isLight ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                      }`}>
                        Producción en Serie
                      </span>
                    </div>

                    <ProductionBatchConfigSection isLight={isLight} />

                    {/* Acceso a Configuración de Bastidor en Pestaña Herrajes */}
                    <div 
                      onClick={() => {
                        setRightTab('engineering');
                      }}
                      className={`mt-3 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isLight 
                          ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-xs' 
                          : 'bg-white/[0.03] border-white/10 hover:border-orange-500/50 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                          <Layers size={15} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            Bastidor Metálico FE 30x50
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Configurable en pestaña Herrajes (Despeje {socleHeight ?? 30} cm • {HOSPITAL_FRAME_FINISHES.find(f => f.id === hospitalFrameFinish)?.name || 'Blanco'})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                        <span>Ver en Herrajes</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs uppercase tracking-wider font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                        Sistemas y Perfilería Global
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Toda la Cocina</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {/* Tarjeta Zócalo */}
                      <div 
                        onClick={() => {
                          setRightTab('engineering');
                          setOpenAccordions(prev => ({ ...prev, socle: true }));
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isLight 
                            ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-xs' 
                            : 'bg-white/[0.03] border-white/10 hover:border-orange-500/50 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            showSocle 
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' 
                              : (isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-500')
                          }`}>
                            <Layers size={15} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              Zócalo Continuo
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {!showSocle 
                                ? 'Oculto / Desactivado' 
                                : `${socleFinish === 'black' ? 'Negro Mate' : 'Gris Satinado'} (${socleHeight ?? 10} cm)`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                          <span>Configurar</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>

                      {/* Tarjeta Sistema Gola */}
                      <div 
                        onClick={() => {
                          setRightTab('engineering');
                          setOpenAccordions(prev => ({ ...prev, gola: true }));
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isLight 
                            ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-xs' 
                            : 'bg-white/[0.03] border-white/10 hover:border-orange-500/50 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            golaSystem !== 'none' 
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' 
                              : (isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-500')
                          }`}>
                            <Sliders size={15} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              Sistema Riel Gola
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {golaSystem === 'none' 
                                ? 'Sin Gola (Tiradores convencionales)' 
                                : `Provelcar (${golaSystem === 'black' ? 'Negro' : 'Gris Satin'})`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                          <span>Configurar</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {rightTab === 'materials' && (
          <div className="flex flex-col gap-4">
            {/* Banner de Alcance: Proyecto Global */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              isLight
                ? 'bg-slate-100/90 border-slate-300 text-slate-700 shadow-xs'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={15} className="text-orange-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Alcance: Proyecto Global
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Aplica a toda la cocina y a módulos con herencia global
                  </span>
                </div>
              </div>
              {activeCabinetId && (
                <button
                  onClick={() => setRightTab('module')}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 cursor-pointer shrink-0"
                  title="Volver a configurar el módulo individual seleccionado"
                >
                  Ir al Módulo
                </button>
              )}
            </div>

            {/* SECCIÓN DE CUBIERTAS EN ACABADOS */}
            {projectMode === 'hospital' ? (
              <div className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
                isLight ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' : 'bg-emerald-950/20 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Sparkles size={16} />
                    <span>Cubierta Clínica & KRION® Solid Surface</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                    ISO 19712
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Solid surface bactericida atérmico sin juntas visibles. Ajuste de regrueso frontal (1 a 5 cm), respaldo posterior y laterales continuos.
                </p>
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-emerald-200' : 'bg-black/30 border-white/10'}`}>
                  <HospitalCountertopConfigSection 
                    isLight={isLight} 
                    onOpenFullModal={() => {
                      if (activeCabinetId) setActiveCabinet(null);
                      if (activeArchElementId) setActiveArchElement(null);
                      setIsCountertopModalOpen(true);
                    }} 
                  />
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                isLight ? 'bg-amber-50/60 border-amber-200 shadow-xs' : 'bg-amber-950/20 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Sparkles size={16} />
                    <span>Cubiertas Qstone (Cuarzo & Sinterizados)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeCabinetId) setActiveCabinet(null);
                      if (activeArchElementId) setActiveArchElement(null);
                      setIsCountertopModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-bold rounded-lg transition shadow-xs cursor-pointer"
                  >
                    Configurar Nesting
                  </button>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {countertopConfig.enabled
                    ? `${qstoneCatalog.find(p => p.id === countertopConfig.selectedProductId)?.materialType === 'sinterizado' ? 'Sinterizado 12mm' : 'Cuarzo'} activo • Faldón ${countertopConfig.regruesoCm}cm`
                    : 'Sin cubierta configurada. Haz clic en Configurar para habilitar despiece y nesting.'}
                </p>
              </div>
            )}

            <IslandBackPanelConfigSection isLight={isLight} />
            <RoomFinishesSection isLight={isLight} />
            <div className={`mt-2 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <TexturesSection 
                onSelectTexture={handleGlobalTextureSelect}
                title="Decorativos de Cocina (Global)"
                badgeText="Toda la Cocina"
                isLight={isLight}
              />
            </div>
          </div>
        )}

        {rightTab === 'engineering' && (
          <div className="flex flex-col gap-3">
            {/* Banner de Alcance: Herrajes Globales */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              isLight
                ? 'bg-slate-100/90 border-slate-300 text-slate-700 shadow-xs'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={15} className="text-orange-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Alcance: Herrajes Globales
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Define tiradores y sistema de apertura para toda la cocina
                  </span>
                </div>
              </div>
              {activeCabinetId && (
                <button
                  onClick={() => setRightTab('module')}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 cursor-pointer shrink-0"
                  title="Volver a configurar el módulo individual seleccionado"
                >
                  Ir al Módulo
                </button>
              )}
            </div>

            {/* ENTORNO RESIDENCIAL: 1. Sistema Gola y 1.1 Zócalo */}
            {projectMode === 'residential' && (
              <>
                {/* 1. Sistema de Apertura (Perfil Gola) */}
                <div className={`rounded-xl border overflow-hidden transition-all ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('gola')}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer select-none ${
                      openAccordions.gola 
                        ? (isLight ? 'bg-orange-50/50' : 'bg-white/[0.04]') 
                        : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        openAccordions.gola 
                          ? 'bg-orange-500 text-black shadow-sm' 
                          : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300')
                      }`}>
                        <Sliders size={14} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                        openAccordions.gola 
                          ? (isLight ? 'text-orange-600' : 'text-orange-400') 
                          : (isLight ? 'text-slate-800' : 'text-slate-200')
                      }`}>
                        Sistema de Apertura (Gola)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        openAccordions.gola
                          ? (isLight ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')
                          : (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                      }`}>
                        {golaSystem === 'none' ? 'Sin Gola' : golaSystem === 'black' ? 'Negro Mate' : 'Gris Satinado'}
                      </span>
                      {openAccordions.gola ? (
                        <ChevronDown size={16} className={isLight ? "text-orange-600" : "text-orange-400"} />
                      ) : (
                        <ChevronRight size={16} className={isLight ? "text-slate-400" : "text-slate-500"} />
                      )}
                    </div>
                  </button>

                  {openAccordions.gola && (
                    <div className={`p-3.5 border-t ${isLight ? 'border-slate-100 bg-slate-50/40' : 'border-white/5 bg-black/10'}`}>
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'none', label: 'Sin Gola', colorDot: null },
                            { id: 'aluminum', label: 'Gris Satinado', colorDot: 'bg-slate-300 border-slate-400' },
                            { id: 'black', label: 'Negro Mate', colorDot: 'bg-zinc-900 border-zinc-700' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setGolaSystem(opt.id as any)}
                              className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                golaSystem === opt.id
                                  ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                                  : isLight
                                    ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                              }`}
                            >
                              {opt.colorDot && (
                                <span className={`w-2.5 h-2.5 rounded-full border ${opt.colorDot}`} />
                              )}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                        <p className={`text-[11px] leading-relaxed mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {golaSystem === 'none'
                            ? 'Los muebles se fabrican con tiradores tradicionales estándar y frentes a cota completa.'
                            : `Perfil Provelcar x175 (L superior -35mm) y x176 (C intermedio 40mm) en acabado ${golaSystem === 'black' ? 'Negro Mate Anodizado' : 'Aluminio Gris Satinado / Claro'}. Descuenta alturas automáticamente y suprime tiradores convencionales.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.1 Zócalo & Perfilería de Piso */}
                <div className={`rounded-xl border overflow-hidden transition-all ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('socle')}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer select-none ${
                      openAccordions.socle 
                        ? (isLight ? 'bg-orange-50/50' : 'bg-white/[0.04]') 
                        : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        openAccordions.socle 
                          ? 'bg-orange-500 text-black shadow-sm' 
                          : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300')
                      }`}>
                        <Layers size={14} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                        openAccordions.socle 
                          ? (isLight ? 'text-orange-600' : 'text-orange-400') 
                          : (isLight ? 'text-slate-800' : 'text-slate-200')
                      }`}>
                        Zócalo & Perfilería
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        openAccordions.socle
                          ? (isLight ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')
                          : (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                      }`}>
                        {!showSocle ? 'Sin Zócalo' : `${socleFinish === 'black' ? 'Negro Mate' : 'Gris Satinado'} (${socleHeight ?? 10}cm)`}
                      </span>
                      {openAccordions.socle ? (
                        <ChevronDown size={16} className={isLight ? "text-orange-600" : "text-orange-400"} />
                      ) : (
                        <ChevronRight size={16} className={isLight ? "text-slate-400" : "text-slate-500"} />
                      )}
                    </div>
                  </button>

                  {openAccordions.socle && (
                    <div className={`p-3.5 border-t ${isLight ? 'border-slate-100 bg-slate-50/40' : 'border-white/5 bg-black/10'}`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            Mostrar Zócalo Continuo
                          </span>
                          <ToggleBtn
                            isLight={isLight}
                            active={showSocle}
                            onClick={() => setShowSocle(!showSocle)}
                            label={showSocle ? `Activo (${socleHeight ?? 10}cm)` : "Oculto"}
                          />
                        </div>

                        {showSocle && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                            <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>
                              Altura de Zócalo / Patas
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSocleHeight(10)}
                                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  (socleHeight ?? 10) === 10
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : isLight
                                      ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                                }`}
                              >
                                <span>10 cm (100 mm)</span>
                                <span className="text-[10px] font-normal lowercase opacity-80">Estándar Moderno</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSocleHeight(15)}
                                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  (socleHeight ?? 10) === 15
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : isLight
                                      ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                                }`}
                              >
                                <span>15 cm (150 mm)</span>
                                <span className="text-[10px] font-normal lowercase opacity-80">Estándar Europeo</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {showSocle && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                            <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>
                              Acabado de Zócalo & Conectores
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSocleFinish('aluminum')}
                                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                                  socleFinish === 'aluminum'
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : isLight
                                      ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400 shrink-0" />
                                Gris Satinado
                              </button>
                              <button
                                type="button"
                                onClick={() => setSocleFinish('black')}
                                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                                  socleFinish === 'black'
                                    ? 'bg-orange-500 text-black shadow-sm'
                                    : isLight
                                      ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500'
                                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700 shrink-0" />
                                Negro Mate
                              </button>
                            </div>
                            <p className={`text-[11px] leading-relaxed mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                              Perfil continuo estándar de 3000mm (3m) con sello de agua inferior en acabado {socleFinish === 'black' ? 'Negro Mate' : 'Aluminio Satinado / Gris Claro'}. Los esquineros 90° y empalmes 180° se calibran automáticamente en el render y cotización.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ENTORNO HOSPITALARIO: BASTIDOR METÁLICO CLÍNICO */}
            {projectMode === 'hospital' && (
              <div className="flex flex-col gap-3.5">
                <div className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
                  isLight ? 'bg-orange-50/40 border-orange-200 shadow-xs' : 'bg-orange-950/20 border-orange-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
                      <ShieldCheck size={16} />
                      <span>Bastidor Metálico Hospitalario (MC.2.02)</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-800 dark:text-orange-300 font-mono font-bold border border-orange-500/20">
                      Norma SACYR
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Estructura portante inferior en perfil tubular de acero FE 30x50 mm con pintura electrostática y despeje libre regulable para asepsia clínica y paso de carros.
                  </p>
                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-orange-200' : 'bg-black/30 border-white/10'}`}>
                    <HospitalBaseFrameConfigSection isLight={isLight} />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Tiradores & Pomos de Mueble */}
            <div className={`rounded-xl border overflow-hidden transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => toggleAccordion('handles')}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer select-none ${
                  openAccordions.handles 
                    ? (isLight ? 'bg-orange-50/50' : 'bg-white/[0.04]') 
                    : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    openAccordions.handles 
                      ? 'bg-orange-500 text-black shadow-sm' 
                      : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300')
                  }`}>
                    <Sparkles size={14} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                    openAccordions.handles 
                      ? (isLight ? 'text-orange-600' : 'text-orange-400') 
                      : (isLight ? 'text-slate-800' : 'text-slate-200')
                  }`}>
                    Tiradores & Pomos
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    openAccordions.handles
                      ? (isLight ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')
                      : (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                  }`}>
                    {golaSystem !== 'none'
                      ? 'Gola Activo'
                      : (HANDLE_CATALOG.find((h) => h.id === handleConfig?.model)?.name?.replace('Tirador ', '') || 'Sin Tirador')}
                  </span>
                  {openAccordions.handles ? (
                    <ChevronDown size={16} className={isLight ? "text-orange-600" : "text-orange-400"} />
                  ) : (
                    <ChevronRight size={16} className={isLight ? "text-slate-400" : "text-slate-500"} />
                  )}
                </div>
              </button>

              {openAccordions.handles && (
                <div className={`p-3.5 border-t ${isLight ? 'border-slate-100 bg-slate-50/40' : 'border-white/5 bg-black/10'}`}>
                  <HandlesSection isLight={isLight} />
                </div>
              )}
            </div>

            {/* 3. Tapacantos Industriales */}
            <div className={`rounded-xl border overflow-hidden transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => toggleAccordion('tapacantos')}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer select-none ${
                  openAccordions.tapacantos 
                    ? (isLight ? 'bg-orange-50/50' : 'bg-white/[0.04]') 
                    : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    openAccordions.tapacantos 
                      ? 'bg-orange-500 text-black shadow-sm' 
                      : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300')
                  }`}>
                    <Layers size={14} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                    openAccordions.tapacantos 
                      ? (isLight ? 'text-orange-600' : 'text-orange-400') 
                      : (isLight ? 'text-slate-800' : 'text-slate-200')
                  }`}>
                    Tapacantos Industriales
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    openAccordions.tapacantos
                      ? (isLight ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')
                      : (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                  }`}>
                    G:{globalState.edgeBandingThicknessCabinets} / F:{globalState.edgeBandingThicknessFronts} mm
                  </span>
                  {openAccordions.tapacantos ? (
                    <ChevronDown size={16} className={isLight ? "text-orange-600" : "text-orange-400"} />
                  ) : (
                    <ChevronRight size={16} className={isLight ? "text-slate-400" : "text-slate-500"} />
                  )}
                </div>
              </button>

              {openAccordions.tapacantos && (
                <div className={`p-3.5 border-t ${isLight ? 'border-slate-100 bg-slate-50/40' : 'border-white/5 bg-black/10'}`}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tapacanto Gabinetes (mm)</label>
                      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                        {[0.5, 1.0, 1.5, 2.0].map((t) => (
                          <button 
                            key={t}
                            onClick={() => globalState.setEdgeBandingThicknessCabinets(t as any)}
                            className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              globalState.edgeBandingThicknessCabinets === t 
                                ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                                : isLight
                                  ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                  : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                            }`}
                          >
                            {t.toFixed(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tapacanto Frentes (mm)</label>
                      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                        {[0.5, 1.0, 1.5, 2.0].map((t) => (
                          <button 
                            key={t}
                            onClick={() => globalState.setEdgeBandingThicknessFronts(t as any)}
                            className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              globalState.edgeBandingThicknessFronts === t 
                                ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                                : isLight
                                  ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                  : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                            }`}
                          >
                            {t.toFixed(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Armado y Sujeción */}
            <div className={`rounded-xl border overflow-hidden transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => toggleAccordion('assembly')}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer select-none ${
                  openAccordions.assembly 
                    ? (isLight ? 'bg-orange-50/50' : 'bg-white/[0.04]') 
                    : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    openAccordions.assembly 
                      ? 'bg-orange-500 text-black shadow-sm' 
                      : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300')
                  }`}>
                    <Wrench size={14} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                    openAccordions.assembly 
                      ? (isLight ? 'text-orange-600' : 'text-orange-400') 
                      : (isLight ? 'text-slate-800' : 'text-slate-200')
                  }`}>
                    Armado y Sujeción
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    openAccordions.assembly
                      ? (isLight ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')
                      : (isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                  }`}>
                    {globalState.assemblyType === 'spax' ? 'Soberbio/Spax' : 'Minifix'}
                  </span>
                  {openAccordions.assembly ? (
                    <ChevronDown size={16} className={isLight ? "text-orange-600" : "text-orange-400"} />
                  ) : (
                    <ChevronRight size={16} className={isLight ? "text-slate-400" : "text-slate-500"} />
                  )}
                </div>
              </button>

              {openAccordions.assembly && (
                <div className={`p-3.5 border-t ${isLight ? 'border-slate-100 bg-slate-50/40' : 'border-white/5 bg-black/10'}`}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Tipo de Ensamblaje Estructura</label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button 
                          onClick={() => globalState.setAssemblyType('spax')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.assemblyType === 'spax' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Soberbio / Spax
                        </button>
                        <button 
                          onClick={() => globalState.setAssemblyType('minifix')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.assemblyType === 'minifix' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Minifix
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Herrajes de Cajón</label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button 
                          onClick={() => globalState.setDrawerHardware('Provelcar')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.drawerHardware === 'Provelcar' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Provelcar
                        </button>
                        <button 
                          onClick={() => globalState.setDrawerHardware('Hafele')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.drawerHardware === 'Hafele' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Häfele
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className={isLight ? "text-xs uppercase tracking-wider text-slate-700 font-bold" : labelClass}>Armado de Cajón</label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button 
                          onClick={() => globalState.setDrawerAssemblyType('spax')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.drawerAssemblyType === 'spax' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Soberbio / Spax
                        </button>
                        <button 
                          onClick={() => globalState.setDrawerAssemblyType('minifix')}
                          className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            globalState.drawerAssemblyType === 'minifix' 
                              ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.25)]' 
                              : isLight
                                ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 shadow-sm'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          Minifix
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {rightTab === 'mep' && (
          <div className="h-full">
            <KitchenMepPanel isLight={isLight} />
          </div>
        )}
      </div>

      {/* Acceso Unificado a Planos y Documentación Técnica de Fabricación */}
      <div className={`p-3.5 border-t shrink-0 backdrop-blur-md transition-colors ${
        isLight ? 'border-slate-200 bg-slate-50/95 shadow-lg' : 'border-white/10 bg-black/90'
      }`}>
        <button 
          onClick={() => globalState.setIsPrinting(true)} 
          className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl transition-all text-xs uppercase tracking-wider font-bold shadow-lg shadow-orange-600/25 active:scale-[0.98] cursor-pointer"
          title="Abrir planos interactivos 2D/A3, despiece de corte, cotizaciones, etiquetas QR y archivos DXF para CNC"
        >
          <FileText size={16} />
          <span>Planos y Despiece de Fabricación</span>
        </button>
      </div>

    </aside>
   </main>

   {/* Modal Guardar Proyecto */}
   <SaveProjectModal
     isOpen={isSaveModalOpen}
     onClose={() => setIsSaveModalOpen(false)}
     projectType="kitchen"
     defaultName="Proyecto Cocina Arquify"
     estimatedCost={3800000}
     projectData={{
       cabinets,
       roomConfig,
       showSocle,
       structureColor: globalState.structureColor,
       doorColor: globalState.doorColor,
       thickness: globalState.thickness,
     }}
     onSaved={(id) => {
       console.log('Proyecto de cocina guardado con ID:', id);
     }}
   />

   {/* Modal Cubiertas Qstone */}
   <CountertopConfigModal
     isOpen={isCountertopModalOpen}
     onClose={() => setIsCountertopModalOpen(false)}
     isLight={isLight}
   />

   {/* Modal Popup Alerta Incompatibilidad Riel Gola vs Regrueso */}
   <GolaRegruesoIncompatibilityModal isLight={isLight} />

   {/* Modal Cotización Comercial Dual B2B (Fábrica vs Cliente PVP) */}
   <KitchenB2BQuoteModal
     isOpen={isB2BQuoteOpen}
     onClose={() => setIsB2BQuoteOpen(false)}
   />
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, isLight }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isLight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg text-xs uppercase tracking-wider transition-all border cursor-pointer ${
        active 
          ? 'bg-orange-500/20 border-orange-500 text-orange-500 font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]' 
          : isLight 
            ? 'bg-slate-100 border-slate-300 text-slate-900 font-bold hover:bg-slate-200 hover:text-black hover:border-slate-400 shadow-sm'
            : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200 font-semibold'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-orange-500' : isLight ? 'text-slate-800' : 'text-slate-400'}`}>{icon}</span>
      <span className="text-left leading-tight">{label}</span>
    </button>
  );
}

interface ModuleCategoryAccordionProps {
  id: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveTool: boolean;
  isLight: boolean;
  children: React.ReactNode;
}

function ModuleCategoryAccordion({
  title,
  count,
  icon,
  isOpen,
  onToggle,
  hasActiveTool,
  isLight,
  children,
}: ModuleCategoryAccordionProps) {
  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      hasActiveTool
        ? isLight
          ? 'border-orange-400 bg-orange-50/40 shadow-sm'
          : 'border-orange-500/50 bg-orange-950/10 shadow-sm'
        : isLight
          ? 'border-slate-200 bg-white'
          : 'border-white/10 bg-white/[0.02]'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${
          hasActiveTool
            ? isLight
              ? 'text-orange-800 bg-orange-100/70'
              : 'text-orange-400 bg-orange-500/20'
            : isLight
              ? 'text-slate-800 hover:bg-slate-50'
              : 'text-slate-200 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={hasActiveTool ? 'text-orange-500' : isLight ? 'text-slate-600' : 'text-slate-400'}>
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            hasActiveTool
              ? isLight ? 'bg-orange-200 text-orange-950 border border-orange-300' : 'bg-orange-500/40 text-orange-200 border border-orange-400/30'
              : isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-black/40 text-slate-400 border border-white/5'
          }`}>
            {count}
          </span>
          {isOpen ? <ChevronDown size={14} className="text-orange-500" /> : <ChevronRight size={14} className={isLight ? 'text-slate-400' : 'text-slate-500'} />}
        </div>
      </button>

      {isOpen && (
        <div className={`p-2 flex flex-col gap-1.5 border-t ${
          isLight ? 'border-slate-100 bg-slate-50/60' : 'border-white/5 bg-black/20'
        }`}>
          {children}
        </div>
      )}
    </div>
  );
}

