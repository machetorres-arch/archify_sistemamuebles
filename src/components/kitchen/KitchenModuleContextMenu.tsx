import React, { useState } from 'react';
import { useKitchenStore, CabinetType } from '../../store/kitchenStore';
import { useStore, PartType } from '../../store';
import { useAdminStore } from '../../store/adminStore';
import { isCabinetWithDoors, getDefaultShelvesCount, isCabinetWithSplitDoors, getSplitCabinetShelvesCounts } from '../../utils/kitchenManufacturing';
import { SlidersHorizontal, X, RefreshCw, ArrowUpDown, ArrowLeftRight, RotateCw, Move3D, DoorOpen, DoorClosed, Layers, Trash2, Palette, Sparkles, Box, Info, Check, ShieldAlert, Sliders, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { HANDLE_CATALOG, FINISH_LABELS, FINISH_HEX, HandleModelId, HandleFinish, KitchenHandleConfig } from '../../types/handle';
import { IslandBackPanelConfigSection } from './IslandBackPanelConfigSection';
import { DottedDepthSlider } from './DottedDepthSlider';

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isLight: boolean;
}

function AccordionSection({
  id,
  title,
  icon: Icon,
  badge,
  isOpen,
  onToggle,
  children,
  isLight
}: AccordionSectionProps) {
  return (
    <div 
      id={`accordion-${id}`}
      className={`rounded-xl border transition-all overflow-hidden ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-white/[0.03] border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-2.5 text-left transition-colors cursor-pointer select-none ${
          isOpen
            ? (isLight ? 'bg-orange-50/60 border-b border-orange-100' : 'bg-white/[0.04] border-b border-white/5')
            : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]')
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <div className={`p-1 rounded-md shrink-0 ${
            isOpen
              ? 'bg-orange-500 text-black shadow-xs'
              : (isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-slate-300')
          }`}>
            <Icon size={13} />
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
            isOpen
              ? (isLight ? 'text-orange-700' : 'text-orange-400')
              : (isLight ? 'text-slate-800' : 'text-slate-200')
          }`}>
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {badge && (
            <div className="text-[10px]">
              {badge}
            </div>
          )}
          {isOpen ? (
            <ChevronDown size={14} className={isLight ? "text-orange-600" : "text-orange-400"} />
          ) : (
            <ChevronRight size={14} className={isLight ? "text-slate-400" : "text-slate-500"} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco', name: 'Masisa Blanco', url: '#FFFFFF' },
  { id: 'def_mas_negro', name: 'Masisa Negro', url: '#171717' },
  { id: 'def_abet_2831', name: 'Abet Broccato 2831', url: '/textures/abet-broccato-2831.svg' },
  { id: 'def_abet_2824', name: 'Abet Fiore Pop 2824', url: '/textures/abet-fiore-pop-2824.svg' },
  { id: 'def_wood_grain', name: 'Veta Madera Clara', url: '/textures/light-wood-grain.svg' }
];

export function KitchenModuleContextMenu({ 
  isLight: propIsLight,
  inline = true,
  onOpenIslandBack
}: { 
  isLight?: boolean; 
  inline?: boolean;
  onOpenIslandBack?: () => void;
} = {}) {
  const { 
    activeCabinetId, 
    cabinets, 
    updateCabinet, 
    removeCabinet, 
    setActiveCabinet, 
    setToolMode, 
    setViewMode, 
    handleConfig: globalHandleConfig, 
    golaSystem,
    setGolaSystem,
    islandBackConfig,
    setIslandBackConfig,
    countertopConfig
  } = useKitchenStore();
  const globalStore = useStore();
  const adminTextures = useAdminStore((s) => s.textures);
  const [targetZone, setTargetZone] = useState<PartType>('doors');
  const [selectedDoorSection, setSelectedDoorSection] = useState<'lower' | 'upper'>('lower');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dimensions: true,
    mechanisms: false,
    grain: false,
    shelves: false,
    handles: false,
    coverPanels: false,
    assembly: false,
    finishes: false,
    islandBack: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isLight = propIsLight !== undefined ? propIsLight : (() => {
    try {
      return localStorage.getItem('arquify_kitchen_theme') === 'light';
    } catch {
      return false;
    }
  })();

  if (!activeCabinetId) return null;
  const activeCabinet = cabinets.find(c => c.id === activeCabinetId);
  if (!activeCabinet) return null;

  const isDecoration = activeCabinet.type === 'decoration' || activeCabinet.variant?.startsWith('deco_');

  if (isDecoration) {
    const decoTitle =
      activeCabinet.variant === 'deco_hood'
        ? 'Campana FDV New Conic 90'
        : activeCabinet.variant === 'deco_stove'
        ? 'Cocina FDV FS Unique 90'
        : activeCabinet.variant === 'deco_fridge'
        ? 'Refrigerador FDV SBS'
        : activeCabinet.variant === 'deco_dishwasher'
        ? 'Lavavajillas FDV Active 12C'
        : activeCabinet.variant === 'deco_plant'
        ? 'Planta Decorativa'
        : 'Elemento de Equipamiento';

    return (
      <div className={`w-full border rounded-2xl overflow-hidden flex flex-col transition-all mb-4 ${
        inline
          ? isLight
            ? 'bg-white border-slate-200 shadow-sm text-slate-800'
            : 'bg-white/[0.04] border-white/10 shadow-lg text-white'
          : isLight
            ? 'absolute top-6 right-6 w-80 backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl shadow-slate-300 text-slate-800 z-50'
            : 'absolute top-6 right-6 w-80 backdrop-blur-xl bg-[#141416]/95 border-white/10 shadow-2xl shadow-black/80 text-white z-50'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/40'
        }`}>
          <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider truncate pr-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 animate-pulse"></span>
            <span className="truncate">{decoTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const currentRot = activeCabinet.rotation || 0;
                const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                updateCabinet(activeCabinet.id, { rotation: nextRot });
              }}
              className="text-xs text-cyan-500 hover:text-cyan-600 p-1 rounded font-semibold cursor-pointer"
              title="Girar 90°"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => setActiveCabinet(null)}
              className={`transition-colors p-1 rounded ${
                isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Deseleccionar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3.5">
          {/* Dimensiones */}
          <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl border text-center ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <div>
              <div className={`text-[9px] uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Ancho</div>
              <div className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.width} cm</div>
            </div>
            <div>
              <div className={`text-[9px] uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Alto</div>
              <div className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.height} cm</div>
            </div>
            <div>
              <div className={`text-[9px] uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Fondo</div>
              <div className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeCabinet.depth} cm</div>
            </div>
          </div>

          {/* Acciones principales: Mover y Girar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToolMode('move_active');
                setViewMode('3d');
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
            >
              <Move3D size={15} />
              Mover
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentRot = activeCabinet.rotation || 0;
                const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                updateCabinet(activeCabinet.id, { rotation: nextRot });
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 font-bold rounded-xl text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              <RotateCw size={15} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
              Girar 90°
            </button>
          </div>

          {/* Si es campana: regular elevación */}
          {activeCabinet.variant === 'deco_hood' && (
            <div className={`flex flex-col gap-2 p-2.5 border rounded-xl ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
            }`}>
              <div className={`flex justify-between items-center text-[10px] ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                <span className={`uppercase font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Elevación Base (piso)</span>
                <span className={`font-mono font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                  {Math.round(activeCabinet.position[1] - activeCabinet.height / 2)} cm
                </span>
              </div>
              <input
                type="range"
                min={120}
                max={170}
                step={2}
                value={Math.round(activeCabinet.position[1] - activeCabinet.height / 2)}
                onChange={(e) => {
                  const newBottom = Number(e.target.value);
                  updateCabinet(activeCabinet.id, {
                    position: [activeCabinet.position[0], newBottom + activeCabinet.height / 2, activeCabinet.position[2]]
                  });
                }}
                className={`w-full cursor-pointer accent-orange-500 ${isLight ? 'bg-slate-300' : ''}`}
              />
            </div>
          )}

          {/* Botón Eliminar */}
          <button
            onClick={() => removeCabinet(activeCabinet.id)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer border ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-sm'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            <Trash2 size={14} />
            Eliminar Equipamiento
          </button>
        </div>
      </div>
    );
  }

  const cabinetIndex = cabinets.findIndex(c => c.id === activeCabinetId);

  const handleOverride = (key: string, value: any) => {
    updateCabinet(activeCabinetId, { [key]: value });
  };

  const handleClearOverrides = () => {
    updateCabinet(activeCabinetId, {
      structureColor: undefined,
      doorColor: undefined,
      drawerFrontColor: undefined,
      drawerInnerColor: undefined,
      shelfColor: undefined,
      backColor: undefined,
      socleColor: undefined,
      leftCoverPanel: undefined,
      rightCoverPanel: undefined,
      structureMaterial: undefined,
      doorMaterial: undefined,
      drawerFrontMaterial: undefined,
      drawerInnerMaterial: undefined,
      shelfMaterial: undefined,
      backMaterial: undefined,
      socleMaterial: undefined,
      grainDirection: undefined,
      grainElements: undefined,
      hplBalancer: undefined,
      handleConfig: undefined,
      assemblyType: undefined,
      drawerAssemblyType: undefined,
      mountingType: undefined,
      isOpen: false,
      openElements: undefined
    });
  };

  const toggleGrain = (key: string) => {
    const newGrainElements = { ...(activeCabinet.grainElements || {}) };
    const current = newGrainElements[key] ?? activeCabinet.grainDirection ?? 'vertical';
    const next = current === 'vertical' ? 'horizontal' : 'vertical';

    newGrainElements[key] = next;
    updateCabinet(activeCabinetId, { grainElements: newGrainElements });
  };

  const getGrain = (key: string) => {
    return activeCabinet.grainElements?.[key] ?? activeCabinet.grainDirection ?? 'vertical';
  };

  const isElementOpen = (key: string) => {
    return activeCabinet.openElements?.[key] ?? activeCabinet.isOpen ?? false;
  };

  const toggleElementOpen = (key: string) => {
    const newOpenElements = { ...(activeCabinet.openElements || {}) };
    const current = isElementOpen(key);
    newOpenElements[key] = !current;
    updateCabinet(activeCabinetId, { openElements: newOpenElements });
  };

  const toggleAllOpen = () => {
    const currentAnyOpen = getElementsList().some(el => isElementOpen(el.id));
    const nextState = !currentAnyOpen;
    
    const newOpenElements: Record<string, boolean> = {};
    getElementsList().forEach(el => {
      newOpenElements[el.id] = nextState;
    });

    updateCabinet(activeCabinetId, { isOpen: nextState, openElements: newOpenElements });
  };

  const handleApplyTexture = (url: string, name: string) => {
    const nameLower = name.toLowerCase();
    const urlLower = url.toLowerCase();
    const isHPL = nameLower.includes('abet') || nameLower.includes('hpl') || nameLower.includes('laminati') || urlLower.includes('abet') || urlLower.includes('fiore') || urlLower.includes('broccato');
    const mat: 'melamina' | 'hpl' = isHPL ? 'hpl' : 'melamina';

    if (isHPL && activeCabinet.hplBalancer === undefined) {
      updateCabinet(activeCabinetId, { hplBalancer: true });
    }

    switch (targetZone) {
      case 'structure':
        updateCabinet(activeCabinetId, { structureColor: url, structureMaterial: mat });
        break;
      case 'doors':
        updateCabinet(activeCabinetId, { doorColor: url, doorMaterial: mat });
        break;
      case 'drawerFronts':
        updateCabinet(activeCabinetId, { drawerFrontColor: url, drawerFrontMaterial: mat });
        break;
      case 'drawerInner':
        updateCabinet(activeCabinetId, { drawerInnerColor: url, drawerInnerMaterial: mat });
        break;
      case 'shelves':
        updateCabinet(activeCabinetId, { shelfColor: url, shelfMaterial: mat });
        break;
      case 'back':
        updateCabinet(activeCabinetId, { backColor: url, backMaterial: mat });
        break;
      case 'socle':
        updateCabinet(activeCabinetId, { socleColor: url, socleMaterial: mat });
        break;
      case 'coverPanels':
        updateCabinet(activeCabinetId, {
          leftCoverPanel: activeCabinet.leftCoverPanel?.enabled ? {
            ...activeCabinet.leftCoverPanel,
            color: url,
            material: mat
          } : undefined,
          rightCoverPanel: activeCabinet.rightCoverPanel?.enabled ? {
            ...activeCabinet.rightCoverPanel,
            color: url,
            material: mat
          } : undefined
        });
        break;
      case 'leftCoverPanel':
        updateCabinet(activeCabinetId, {
          leftCoverPanel: {
            enabled: true,
            extendToFloor: activeCabinet.leftCoverPanel?.extendToFloor ?? false,
            color: url,
            material: mat,
            thickness: activeCabinet.leftCoverPanel?.thickness
          }
        });
        break;
      case 'rightCoverPanel':
        updateCabinet(activeCabinetId, {
          rightCoverPanel: {
            enabled: true,
            extendToFloor: activeCabinet.rightCoverPanel?.extendToFloor ?? false,
            color: url,
            material: mat,
            thickness: activeCabinet.rightCoverPanel?.thickness
          }
        });
        break;
    }
  };

  const approvedBackofficeTextures = (adminTextures || [])
    .filter((t) => t.active && (t.approvalStatus === 'approved' || !t.approvalStatus))
    .filter((t) => {
      const n = (t.name || '').toLowerCase();
      const b = (t.brand || '').toLowerCase();
      const p = (t.providerName || '').toLowerCase();
      return !n.includes('qstone') && !b.includes('qstone') && !p.includes('qstone') && !b.includes('sysprotec') && t.category !== 'piedras_marmoles';
    })
    .map((t) => ({
      id: t.id,
      name: t.name.toLowerCase().includes((t.brand || '').toLowerCase()) ? t.name : `${t.brand ? t.brand + ' ' : ''}${t.name}`,
      url: t.url || t.previewUrl || '#CCCCCC',
      brand: t.brand || t.providerName,
      providerName: t.providerName,
      category: t.category,
    }));

  const allTextures = [...DEFAULT_TEXTURES, ...approvedBackofficeTextures];
  const masisaTextures = allTextures.filter(t => {
    const n = (t.name || '').toLowerCase();
    const b = ((t as any).brand || '').toLowerCase();
    const p = ((t as any).providerName || '').toLowerCase();
    return n.includes('masisa') || b.includes('masisa') || p.includes('masisa');
  });
  const abetTextures = allTextures.filter(t => {
    const n = (t.name || '').toLowerCase();
    const b = ((t as any).brand || '').toLowerCase();
    const p = ((t as any).providerName || '').toLowerCase();
    return n.includes('abet') || b.includes('abet') || p.includes('abet') || n.includes('laminati') || n.includes('hpl') || (t as any).category === 'hpl_autor';
  });
  const otherTextures = allTextures.filter(t => {
    const n = (t.name || '').toLowerCase();
    const b = ((t as any).brand || '').toLowerCase();
    const p = ((t as any).providerName || '').toLowerCase();
    const isMas = n.includes('masisa') || b.includes('masisa') || p.includes('masisa');
    const isAb = n.includes('abet') || b.includes('abet') || p.includes('abet') || n.includes('laminati') || n.includes('hpl') || (t as any).category === 'hpl_autor';
    return !isMas && !isAb;
  });

  const variant = activeCabinet.variant || (activeCabinet.width > 60 ? '2_doors' : '1_door');
  const is4Drawers = variant === '4_drawers';
  const is2PotDrawers = variant === '2_pot_drawers';
  const is1Door1Drawer = variant === '1_door_1_drawer';
  const is2Doors = variant === '2_doors' || variant === 'tall_2_doors' || variant === 'wall_2_doors';
  const is1Door = variant === '1_door' || variant === 'wall_1_door' || variant === 'tall_1_door';
  const isSplit2Doors = variant === 'tall_split_2_doors';
  const isLiftUp = variant === 'wall_lift_up';
  const isLiftUpDouble = variant === 'wall_lift_up_double';
  const isOvenMicro = variant === 'tall_oven_micro';
  const isSpiceRack = variant === 'spice_rack';
  const isCornerBlind = variant === 'corner_blind' || variant === 'corner_blind_left' || variant === 'corner_blind_right' || variant?.startsWith('corner_blind') || variant?.startsWith('wall_corner_blind');

  const getElementsList = () => {
    const elements: { id: string; label: string; type: 'door' | 'drawer' }[] = [];
    if (is2Doors) {
      elements.push({ id: 'door-0', label: 'Puerta Izquierda', type: 'door' });
      elements.push({ id: 'door-1', label: 'Puerta Derecha', type: 'door' });
    } else if (is1Door || isCornerBlind) {
      const doorLabel = variant?.startsWith('wall_corner_blind')
        ? 'Puerta Esquinero Aéreo'
        : (isCornerBlind ? 'Puerta Esquinero' : 'Puerta Frontal');
      elements.push({ id: 'door-0', label: doorLabel, type: 'door' });
    } else if (isSplit2Doors) {
      elements.push({ id: 'door-upper', label: 'Puerta Superior', type: 'door' });
      elements.push({ id: 'door-lower', label: 'Puerta Inferior', type: 'door' });
    } else if (isLiftUpDouble) {
      elements.push({ id: 'door-upper', label: 'Pta. Elevable Sup.', type: 'door' });
      elements.push({ id: 'door-lower', label: 'Pta. Elevable Inf.', type: 'door' });
    } else if (variant === 'wall_microwave_niche') {
      elements.push({ id: 'door-top', label: 'Pta. Superior Elevable', type: 'door' });
    } else if (isLiftUp) {
      elements.push({ id: 'door-lift', label: 'Puerta Elevable', type: 'door' });
    } else if (variant === 'corner_l' || variant === 'base_corner_l') {
      elements.push({ id: 'door-0', label: 'Puerta Escuadra 1', type: 'door' });
      elements.push({ id: 'door-1', label: 'Puerta Escuadra 2', type: 'door' });
    } else if (variant === 'sink_u_drawer') {
      elements.push({ id: 'drawer-0', label: 'Cajón en U (Sifón)', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cacerolero Inferior', type: 'drawer' });
    } else if (variant === 'tall_inner_drawers') {
      elements.push({ id: 'door-0', label: 'Puerta Despensa 155°', type: 'door' });
      elements.push({ id: 'drawer-0', label: 'Cajón Interior 1 (Sup.)', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cajón Interior 2', type: 'drawer' });
      elements.push({ id: 'drawer-2', label: 'Cajón Interior 3', type: 'drawer' });
      elements.push({ id: 'drawer-3', label: 'Cajón Interior 4 (Inf.)', type: 'drawer' });
    } else if (isOvenMicro || variant === 'tall_oven_vent' || variant === 'tall_microwave_niche') {
      elements.push({ id: 'door-lower', label: 'Puerta Inferior', type: 'door' });
      elements.push({ id: 'door-top', label: 'Puerta Superior', type: 'door' });
    } else if (is1Door1Drawer) {
      elements.push({ id: 'drawer-0', label: 'Cajón Superior', type: 'drawer' });
      elements.push({ id: 'door-0', label: 'Puerta Inferior', type: 'door' });
    } else if (is4Drawers) {
      elements.push({ id: 'drawer-0', label: 'Cajón 1 (Superior)', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cajón 2', type: 'drawer' });
      elements.push({ id: 'drawer-2', label: 'Cajón 3', type: 'drawer' });
      elements.push({ id: 'drawer-3', label: 'Cajón 4 (Inferior)', type: 'drawer' });
    } else if (variant === 'hospital_meson_3drawers') {
      elements.push({ id: 'drawer-a', label: 'Cajón A (Sup. Cerradura)', type: 'drawer' });
      elements.push({ id: 'drawer-b', label: 'Cajón B (Intermedio)', type: 'drawer' });
      elements.push({ id: 'drawer-c', label: 'Cajón C (Inferior)', type: 'drawer' });
    } else if (variant === 'hospital_meson_1door') {
      elements.push({ id: 'door-hosp', label: 'Puerta Hospitalaria', type: 'door' });
    } else if (variant === '2_drawers_1_pot') {
      elements.push({ id: 'drawer-2', label: 'Cajón Superior', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cajón Medio', type: 'drawer' });
      elements.push({ id: 'drawer-0', label: 'Cacerolero Inferior', type: 'drawer' });
    } else if (is2PotDrawers) {
      elements.push({ id: 'drawer-0', label: 'Cacerolero Superior', type: 'drawer' });
      elements.push({ id: 'drawer-1', label: 'Cacerolero Inferior', type: 'drawer' });
    } else if (isSpiceRack) {
      elements.push({ id: 'drawer-0', label: 'Especiero Extraíble', type: 'drawer' });
    }
    return elements;
  };

  const interactiveElements = getElementsList();
  const hasInteractiveElements = !isDecoration && interactiveElements.length > 0;
  const hasDrawers = is4Drawers || is2PotDrawers || is1Door1Drawer || isSpiceRack || variant === 'sink_u_drawer' || variant === '2_drawers_1_pot' || variant === 'hospital_meson_3drawers' || variant === 'tall_inner_drawers';
  const anyElementOpen = interactiveElements.some(el => isElementOpen(el.id));

  const renderTextureButton = (tex: any) => {
    const is15 = tex.thicknessMm === 15;
    const is18 = tex.thicknessMm === 18;
    return (
      <div key={tex.id} className="relative group">
        <button 
          onClick={() => handleApplyTexture(tex.url, tex.name)}
          className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-colors w-full border cursor-pointer relative ${
            isLight
              ? 'bg-white border-slate-200 hover:border-orange-500 shadow-sm'
              : 'bg-white/5 border-white/10 hover:border-orange-500/60'
          }`}
          title={`${tex.name} ${tex.thicknessMm ? `[${tex.thicknessMm}mm]` : ''}`}
        >
          {tex.thicknessMm && (
            <span
              className={`absolute top-1 right-1 px-1 py-0.2 rounded text-[7px] font-mono font-extrabold uppercase shadow-xs z-10 ${
                is15
                  ? 'bg-blue-600 text-white'
                  : is18
                  ? 'bg-orange-500 text-black'
                  : 'bg-zinc-700 text-zinc-200'
              }`}
            >
              {tex.thicknessMm}mm
            </span>
          )}
          <div 
            className={`w-full aspect-square rounded-md border group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center ${
              isLight ? 'border-slate-300' : 'border-white/20'
            }`}
            style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
          />
          <span className={`text-[8px] uppercase tracking-wider truncate w-full text-center ${
            isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
          }`}>
            {tex.name.length > 14 ? tex.name.substring(0, 14) + '...' : tex.name}
          </span>
        </button>
      </div>
    );
  };

  const getModuleTitle = () => {
    if (activeCabinet.variant?.startsWith('corner_blind')) return 'Esquinero Ciego';
    if (activeCabinet.variant === 'tall_1_door') return 'Despensa 1 Puerta Larga';
    if (activeCabinet.variant === 'tall_split_2_doors') return 'Despensa 2 Puertas (Línea Base)';
    if (activeCabinet.variant === 'tall_oven_micro') return 'Torre Horno + Micro Empotrado';
    if (activeCabinet.variant === 'tall_microwave_niche') return 'Torre Nicho Micro Portátil';
    if (activeCabinet.variant === 'tall_open') return 'Despensa Abierta (Repisas)';
    if (activeCabinet.variant === 'tall_2_doors') return 'Despensa 2 Puertas Batientes';
    if (activeCabinet.variant === 'wall_1_door') return 'Mueble Aéreo 1 Puerta';
    if (activeCabinet.variant === 'wall_2_doors') return 'Mueble Aéreo 2 Puertas';
    if (activeCabinet.variant === 'wall_lift_up') return 'Aéreo Puerta Elevable Aventos';
    if (activeCabinet.variant === 'wall_lift_up_double') return 'Aéreo Doble Puerta Elevable';
    if (activeCabinet.variant === 'wall_microwave_niche') return 'Aéreo Nicho Micro + Puerta';
    if (activeCabinet.variant === 'wall_open') return 'Aéreo Repisas a la Vista';
    return activeCabinet.variant || activeCabinet.type;
  };

  return (
    <div className={`w-full border rounded-2xl overflow-hidden flex flex-col transition-all mb-4 ${
      inline
        ? isLight
          ? 'bg-slate-50/80 border-slate-200 shadow-sm text-slate-800'
          : 'bg-white/[0.04] border-white/10 shadow-lg text-white'
        : isLight
          ? 'absolute top-6 right-6 w-80 max-h-[calc(100vh-100px)] backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl shadow-slate-300 text-slate-800 z-50'
          : 'absolute top-6 right-6 w-80 max-h-[calc(100vh-100px)] backdrop-blur-xl bg-[#141416]/95 border-white/10 shadow-2xl shadow-black/80 text-white z-50'
    }`}>
      {/* Header integrado de Mueble Activo Individual */}
      <div className={`px-3.5 py-2.5 border-b flex flex-col gap-1.5 shrink-0 ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#161618]'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded font-mono font-black text-[10px] bg-orange-500 text-black shrink-0">
              MOD {cabinetIndex >= 0 ? cabinetIndex + 1 : '1'}
            </span>
            <span className={`truncate font-bold text-xs uppercase tracking-wide ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {getModuleTitle()}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasInteractiveElements && (
              <button 
                type="button"
                onClick={toggleAllOpen}
                title={anyElementOpen ? "Cerrar puertas y cajones del módulo" : "Abrir puertas y cajones del módulo"}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  anyElementOpen
                    ? isLight
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : isLight
                      ? 'text-slate-600 hover:text-orange-600 hover:bg-slate-200/80'
                      : 'text-zinc-400 hover:text-orange-400 hover:bg-white/10'
                }`}
              >
                {anyElementOpen ? <DoorClosed size={14} /> : <DoorOpen size={14} />}
              </button>
            )}
            <button 
              type="button"
              onClick={() => {
                const currentRot = activeCabinet.rotation || 0;
                const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                updateCabinet(activeCabinet.id, { rotation: nextRot });
              }}
              title="Girar 90°"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-cyan-600 hover:bg-slate-200/80' : 'text-zinc-400 hover:text-cyan-400 hover:bg-white/10'
              }`}
            >
              <RotateCw size={14} />
            </button>
            <button 
              type="button"
              onClick={() => {
                setToolMode('move_active');
                setViewMode('3d');
              }}
              title="Mover posición"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-orange-600 hover:bg-slate-200/80' : 'text-zinc-400 hover:text-orange-400 hover:bg-white/10'
              }`}
            >
              <Move3D size={14} />
            </button>
            <button 
              type="button"
              onClick={() => removeCabinet(activeCabinet.id)} 
              title="Eliminar Módulo"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-100' : 'text-zinc-400 hover:text-rose-400 hover:bg-white/10'
              }`}
            >
              <Trash2 size={14} />
            </button>
            <button 
              type="button"
              onClick={() => setActiveCabinet(null)} 
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs' 
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
              }`}
              title="Deseleccionar Módulo y volver a vista general"
            >
              <X size={12} />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Indicador de edición local en cabecera */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <span className={`font-bold uppercase tracking-wider ${isLight ? 'text-orange-700' : 'text-orange-400'}`}>
            Modo Individual
          </span>
          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            — Los cambios aplican solo a este mueble
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">

        {/* ACORDEÓN 1: DIMENSIONES Y POSICIÓN */}
        <AccordionSection
          id="dimensions"
          title="Dimensiones y Posición"
          icon={SlidersHorizontal}
          badge={
            <span className="font-mono text-orange-500 font-extrabold">
              {activeCabinet.width} × {activeCabinet.height} × {activeCabinet.depth} cm
            </span>
          }
          isOpen={openSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
          isLight={isLight}
        >
          {activeCabinet.type === 'wall' && (
            <div className={`flex flex-col gap-2 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
              <label className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Variante de Mueble Aéreo
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'wall_1_door', label: '1 Puerta' },
                  { id: 'wall_2_doors', label: '2 Puertas' },
                  { id: 'wall_lift_up', label: 'Pta Elevable' },
                  { id: 'wall_lift_up_double', label: 'Doble Elevable' },
                  { id: 'wall_microwave_niche', label: 'Nicho Micro' },
                  { id: 'wall_open', label: 'Repisas Vistas' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateCabinet(activeCabinet.id, { variant: t.id })}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      (activeCabinet.variant === t.id || (!activeCabinet.variant && t.id === 'wall_1_door'))
                        ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                        : isLight
                          ? 'bg-white text-slate-700 border border-slate-200 hover:border-orange-500'
                          : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeCabinet.variant?.startsWith('corner_blind') || activeCabinet.variant === 'corner_blind' || activeCabinet.variant?.startsWith('wall_corner_blind')) && (
            <div className={`flex flex-col gap-2 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
              <label className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Mano / Orientación Esquinero
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateCabinet(activeCabinet.id, { 
                    variant: activeCabinet.type === 'wall' ? 'wall_corner_blind_right' : 'corner_blind_right' 
                  })}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    (!activeCabinet.variant.endsWith('_left'))
                      ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                      : isLight
                        ? 'bg-white text-slate-700 border border-slate-200 hover:border-orange-500'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                  }`}
                >
                  Derecho (Ciego Der)
                </button>
                <button
                  type="button"
                  onClick={() => updateCabinet(activeCabinet.id, { 
                    variant: activeCabinet.type === 'wall' ? 'wall_corner_blind_left' : 'corner_blind_left' 
                  })}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    (activeCabinet.variant.endsWith('_left'))
                      ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                      : isLight
                        ? 'bg-white text-slate-700 border border-slate-200 hover:border-orange-500'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                  }`}
                >
                  Izquierdo (Ciego Izq)
                </button>
              </div>
            </div>
          )}

          {/* ELEVACIÓN EN MURO (MUEBLES AÉREOS) */}
          {activeCabinet.type === 'wall' && (
            <div className={`flex flex-col gap-1.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
              <div className={`flex justify-between items-center text-xs tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                <span className={isLight ? "font-bold text-slate-800" : "font-semibold"}>Elevación en Muro (Cota Inf.)</span>
                <span className={`font-mono font-bold text-xs ${isLight ? 'text-orange-600' : 'text-orange-500'}`}>
                  {Math.round(activeCabinet.position[1] - activeCabinet.height / 2)} cm
                </span>
              </div>
              <input 
                type="range" 
                min={110} 
                max={180} 
                step={2}
                value={Math.round(activeCabinet.position[1] - activeCabinet.height / 2)} 
                onChange={(e) => {
                  const newBottom = Number(e.target.value);
                  updateCabinet(activeCabinet.id, {
                    position: [activeCabinet.position[0], newBottom + activeCabinet.height / 2, activeCabinet.position[2]]
                  });
                }}
                className="w-full cursor-pointer accent-orange-500" 
              />
            </div>
          )}

          {/* DIMENSIONES DEL MÓDULO (SLIDERS) */}
          <div className="flex flex-col gap-2.5">
            {/* Ancho Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Ancho</span>
                <span className="font-mono font-bold text-orange-500">{activeCabinet.width} cm</span>
              </div>
              <input 
                type="range"
                min={
                  activeCabinet.variant === "spice_rack" ? 15 : 
                  activeCabinet.variant?.includes('wine_rack') ? 15 :
                  activeCabinet.variant?.startsWith('wall_corner_blind') ? 60 :
                  (activeCabinet.variant?.startsWith('corner_blind') ? 80 : 30)
                }
                max={
                  activeCabinet.variant === "spice_rack" ? 30 :
                  activeCabinet.variant?.includes('wine_rack') ? 65 :
                  activeCabinet.variant?.startsWith('wall_corner_blind') ? 100 :
                  (activeCabinet.variant?.startsWith('corner_blind') ? 130 : 120)
                }
                step={5}
                value={activeCabinet.width}
                onChange={(e) => updateCabinet(activeCabinet.id, { width: Number(e.target.value) })}
                className="w-full cursor-pointer accent-orange-500"
              />
            </div>

            {/* Alto Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Alto Total</span>
                <span className="font-mono font-bold text-orange-500">{activeCabinet.height} cm</span>
              </div>
              <input 
                type="range"
                min={activeCabinet.type === 'tall' ? 140 : (activeCabinet.type === 'base' ? 70 : 30)}
                max={activeCabinet.type === 'tall' ? 240 : (activeCabinet.type === 'wall' ? 120 : 100)}
                step={5}
                value={activeCabinet.height}
                onChange={(e) => updateCabinet(activeCabinet.id, { height: Number(e.target.value) })}
                className="w-full cursor-pointer accent-orange-500"
              />
            </div>

            {/* Profundidad Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Profundidad</span>
                <span className="font-mono font-bold text-orange-500">{activeCabinet.depth} cm</span>
              </div>
              <input 
                type="range"
                min={activeCabinet.type === 'island' ? 30 : 25}
                max={activeCabinet.type === 'island' ? 120 : 80}
                step={5}
                value={activeCabinet.depth}
                onChange={(e) => updateCabinet(activeCabinet.id, { depth: Number(e.target.value) })}
                className="w-full cursor-pointer accent-orange-500"
              />
            </div>
          </div>

          {/* INFO ESPECÍFICA ESPECIERO */}
          {activeCabinet.variant === 'spice_rack' && (
            <div className={`p-2.5 rounded-xl border text-xs ${isLight ? 'bg-orange-50 border-orange-200 text-orange-950' : 'bg-orange-950/20 border-orange-500/30 text-orange-200'}`}>
              <div className="font-bold mb-1 flex items-center justify-between">
                <span>Especiero Extraíble:</span>
                <span className="text-orange-500 font-extrabold">{activeCabinet.width} cm</span>
              </div>
              <div className="text-[11px] opacity-90 leading-relaxed">
                • Rango normativo: <span className="font-mono font-bold">15 - 30 cm</span><br/>
                • Guías telescópicas laterales + carro melamina 2 niveles
              </div>
            </div>
          )}

          {/* INFO ESPECÍFICA BOTILLERO O ESQUINERO */}
          {activeCabinet.variant?.includes('wine_rack') && (() => {
            const innerW = activeCabinet.width - 3.6;
            const cols = Math.min(5, Math.max(1, Math.floor((innerW + 1.8) / (10.5 + 1.8))));
            const colW = (innerW - (cols - 1) * 1.8) / cols;
            return (
              <div className={`p-2.5 rounded-xl border text-xs ${isLight ? 'bg-orange-50 border-orange-200 text-orange-950' : 'bg-orange-950/20 border-orange-500/30 text-orange-200'}`}>
                <div className="font-bold mb-1 flex items-center justify-between">
                  <span>Distribución Botellero:</span>
                  <span className="text-orange-500 font-extrabold">{cols} {cols === 1 ? 'Corrida' : 'Corridas'}</span>
                </div>
                <div className="text-[11px] opacity-90 leading-relaxed">
                  • Ancho libre por celda: <span className="font-mono font-bold">{colW.toFixed(1)} cm</span><br/>
                  • Fondo útil: <span className="font-mono font-bold">32.0 cm</span>
                </div>
              </div>
            );
          })()}
        </AccordionSection>
        
        {/* ACORDEÓN 2: APERTURA INDIVIDUAL DE PUERTAS Y CAJONES */}
        {hasInteractiveElements && (
          <AccordionSection
            id="mechanisms"
            title="Apertura de Puertas / Cajones"
            icon={DoorOpen}
            badge={
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                anyElementOpen
                  ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400')
                  : (isLight ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400')
              }`}>
                {anyElementOpen ? 'Abierto' : 'Cerrado'}
              </span>
            }
            isOpen={openSections.mechanisms}
            onToggle={() => toggleSection('mechanisms')}
            isLight={isLight}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Control Global
              </span>
              <button
                type="button"
                onClick={toggleAllOpen}
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200'
                    : 'bg-white/5 hover:bg-orange-500/20 text-orange-400'
                }`}
                title={anyElementOpen ? "Cerrar todo el módulo" : "Abrir todo el módulo"}
              >
                {anyElementOpen ? <DoorClosed size={12} /> : <DoorOpen size={12} />}
                {anyElementOpen ? 'Cerrar Todo' : 'Abrir Todo'}
              </button>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              {interactiveElements.map((el) => {
                const open = isElementOpen(el.id);
                return (
                  <div
                    key={`open-${el.id}`}
                    onClick={() => toggleElementOpen(el.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer group ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        : 'bg-[#242428] hover:bg-[#2c2c31]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${
                        isLight ? 'text-slate-800 group-hover:text-black' : 'text-zinc-200 group-hover:text-white'
                      }`}>
                        {el.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all ${
                        open 
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : isLight
                            ? 'bg-slate-200 text-slate-600 border border-slate-300'
                            : 'bg-zinc-800 text-zinc-400 border border-white/5'
                      }`}>
                        {open ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* ACORDEÓN 3: VETA (GRANO) POR PIEZA */}
        {hasInteractiveElements && (
          <AccordionSection
            id="grain"
            title="Orientación de Veta (Grano)"
            icon={ArrowUpDown}
            badge={
              <span className="font-mono text-orange-500 font-bold text-[10px]">
                {interactiveElements.length} {interactiveElements.length === 1 ? 'Pieza' : 'Piezas'}
              </span>
            }
            isOpen={openSections.grain}
            onToggle={() => toggleSection('grain')}
            isLight={isLight}
          >
            <div className="flex flex-col gap-1">
              {interactiveElements.map((el) => {
                const grain = getGrain(el.id);
                return (
                  <div 
                    key={`grain-${el.id}`}
                    onClick={() => toggleGrain(el.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer group ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        : 'bg-[#242428] hover:bg-[#2c2c31]'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${
                      isLight ? 'text-slate-800 group-hover:text-black' : 'text-zinc-200 group-hover:text-white'
                    }`}>{el.label}</span>
                    <span className={`${isLight ? 'text-orange-600' : 'text-orange-500'} font-bold text-xs tracking-wider flex items-center gap-1.5`}>
                      {grain === 'horizontal' ? (
                        <><ArrowLeftRight size={13} strokeWidth={2.5} /> HORIZ</>
                      ) : (
                        <><ArrowUpDown size={13} strokeWidth={2.5} /> VERT</>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* ACORDEÓN 4: REPISAS INTERIORES (MÓDULOS CON PUERTA) */}
        {isCabinetWithDoors(activeCabinet) && (
          <AccordionSection
            id="shelves"
            title="Repisas Interiores"
            icon={Layers}
            badge={
              <span className="font-mono text-orange-500 font-bold text-[10px]">
                {activeCabinet.shelvesCount !== undefined
                  ? `${activeCabinet.shelvesCount} repisas`
                  : `${getDefaultShelvesCount(activeCabinet)} std`}
              </span>
            }
            isOpen={openSections.shelves}
            onToggle={() => toggleSection('shelves')}
            isLight={isLight}
          >
            {(() => {
          const isSplit = isCabinetWithSplitDoors(activeCabinet);

          if (isSplit) {
            const splitCounts = getSplitCabinetShelvesCounts(activeCabinet);
            const isLower = selectedDoorSection === 'lower';
            const defaultLower = 1;
            let defaultUpper = 3;
            let maxUpper = 6;
            let upperLabel = '(sobre 70cm)';

            if (activeCabinet.variant === 'tall_oven_vent' || activeCabinet.variant === 'tall_oven_micro') {
              defaultUpper = 1;
              maxUpper = 3;
              upperLabel = '(sobre hornos)';
            } else if (activeCabinet.variant === 'tall_microwave_niche') {
              defaultUpper = 2;
              maxUpper = 5;
              upperLabel = '(sobre nicho)';
            }

            const defaultSectionCount = isLower ? defaultLower : defaultUpper;
            const maxSectionCount = isLower ? 4 : maxUpper;
            const currentSectionCount = isLower ? splitCounts.lower : splitCounts.upper;
            const isCustom = isLower
              ? activeCabinet.shelvesCountLower !== undefined
              : activeCabinet.shelvesCountUpper !== undefined;
            const hasAnyCustom =
              activeCabinet.shelvesCountLower !== undefined ||
              activeCabinet.shelvesCountUpper !== undefined ||
              activeCabinet.shelvesCount !== undefined;

            return (
              <div className={`flex flex-col gap-2 p-2.5 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1c1c1f] border-white/5'
              }`}>
                <div className="flex items-center justify-between px-1">
                  <div className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 ${
                    isLight ? 'text-slate-600' : 'text-zinc-400'
                  }`}>
                    <Layers size={13} className={isLight ? "text-orange-600" : "text-orange-400"} />
                    <span>
                      {activeCabinet.variant === 'tall_split_2_doors' ? 'Repisas Despensa Dividida' : 'Repisas Módulo 2 Puertas'}
                    </span>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    Anti-Colisión
                  </span>
                </div>

                {/* SELECTOR DE PUERTA SUPERIOR / INFERIOR */}
                <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg border ${
                  isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-[#242428] border-white/5'
                }`}>
                  <button
                    type="button"
                    onClick={() => setSelectedDoorSection('lower')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isLower
                        ? isLight
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'bg-orange-500 text-black shadow-md'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>Puerta 1 (Inferior)</span>
                    <span className="text-[9px] font-medium opacity-85">
                      {splitCounts.lower} repisa{splitCounts.lower !== 1 ? 's' : ''} (0-70cm)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDoorSection('upper')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                      !isLower
                        ? isLight
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'bg-orange-500 text-black shadow-md'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>Puerta 2 (Superior)</span>
                    <span className="text-[9px] font-medium opacity-85">
                      {splitCounts.upper} repisa{splitCounts.upper !== 1 ? 's' : ''} {upperLabel}
                    </span>
                  </button>
                </div>

                {/* CONTROL DE CANTIDAD PARA LA SECCIÓN SELECCIONADA */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#242428] border-white/5'
                }`}>
                  <div className="flex flex-col">
                    <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                      {isLower ? 'Puerta 1: Sección Inferior' : 'Puerta 2: Sección Superior'}
                    </span>
                    <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {currentSectionCount} repisa{currentSectionCount !== 1 ? 's' : ''}{' '}
                      {!isCustom ? `(Estándar: ${defaultSectionCount})` : '(Personalizado)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentSectionCount <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = Math.max(0, currentSectionCount - 1);
                        if (isLower) {
                          updateCabinet(activeCabinet.id, { shelvesCountLower: next });
                        } else {
                          updateCabinet(activeCabinet.id, { shelvesCountUpper: next });
                        }
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer ${
                        currentSectionCount <= 0
                          ? isLight ? 'bg-slate-100 text-slate-300' : 'bg-white/5 text-zinc-600'
                          : isLight
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                      }`}
                      title="Disminuir repisas"
                    >
                      -
                    </button>

                    <div className={`w-8 text-center font-mono font-bold text-xs ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {currentSectionCount}
                    </div>

                    <button
                      type="button"
                      disabled={currentSectionCount >= maxSectionCount}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = Math.min(maxSectionCount, currentSectionCount + 1);
                        if (isLower) {
                          updateCabinet(activeCabinet.id, { shelvesCountLower: next });
                        } else {
                          updateCabinet(activeCabinet.id, { shelvesCountUpper: next });
                        }
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer ${
                        currentSectionCount >= maxSectionCount
                          ? isLight ? 'bg-slate-100 text-slate-300' : 'bg-white/5 text-zinc-600'
                          : isLight
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-black'
                      }`}
                      title="Agregar repisas"
                    >
                      +
                    </button>
                  </div>
                </div>

                {hasAnyCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCabinet(activeCabinet.id, {
                        shelvesCount: undefined,
                        shelvesCountLower: undefined,
                        shelvesCountUpper: undefined,
                      });
                    }}
                    className={`text-[9px] text-right font-medium hover:underline cursor-pointer px-1 ${
                      isLight ? 'text-slate-500 hover:text-orange-600' : 'text-zinc-400 hover:text-orange-400'
                    }`}
                  >
                    Restablecer ambas puertas a estándar ({defaultLower} inf + {defaultUpper} sup)
                  </button>
                )}
              </div>
            );
          }

          const defaultShelves = getDefaultShelvesCount(activeCabinet);
          const currentShelvesCount = activeCabinet.shelvesCount !== undefined ? activeCabinet.shelvesCount : defaultShelves;
          return (
            <div className={`flex flex-col gap-2 p-2.5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1c1c1f] border-white/5'
            }`}>
              <div className="flex items-center justify-between px-1">
                <div className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  <Layers size={13} className={isLight ? "text-orange-600" : "text-orange-400"} />
                  <span>Repisas Interiores</span>
                </div>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/10 text-orange-400'
                }`}>
                  Anti-Colisión
                </span>
              </div>

              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#242428] border-white/5'
              }`}>
                <div className="flex flex-col">
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    Cantidad de Repisas
                  </span>
                  <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    {currentShelvesCount} repisa{currentShelvesCount !== 1 ? 's' : ''} {currentShelvesCount === defaultShelves ? '(Estándar)' : '(Personalizado)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentShelvesCount <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = Math.max(0, currentShelvesCount - 1);
                      updateCabinet(activeCabinet.id, { shelvesCount: next });
                    }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer ${
                      currentShelvesCount <= 0
                        ? isLight ? 'bg-slate-100 text-slate-300' : 'bg-white/5 text-zinc-600'
                        : isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                    }`}
                    title="Disminuir repisas"
                  >
                    -
                  </button>

                  <div className={`w-8 text-center font-mono font-bold text-xs ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {currentShelvesCount}
                  </div>

                  <button
                    type="button"
                    disabled={currentShelvesCount >= 8}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = Math.min(8, currentShelvesCount + 1);
                      updateCabinet(activeCabinet.id, { shelvesCount: next });
                    }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer ${
                      currentShelvesCount >= 8
                        ? isLight ? 'bg-slate-100 text-slate-300' : 'bg-white/5 text-zinc-600'
                        : isLight
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-black'
                    }`}
                    title="Agregar repisas"
                  >
                    +
                  </button>
                </div>
              </div>

              {activeCabinet.shelvesCount !== undefined && activeCabinet.shelvesCount !== defaultShelves && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCabinet(activeCabinet.id, { shelvesCount: undefined });
                  }}
                  className={`text-[9px] text-right font-medium hover:underline cursor-pointer px-1 ${
                    isLight ? 'text-slate-500 hover:text-orange-600' : 'text-zinc-400 hover:text-orange-400'
                  }`}
                >
                  Restablecer a estándar ({defaultShelves})
                </button>
              )}
            </div>
          );
        })()}
          </AccordionSection>
        )}

        {/* ACORDEÓN 5: TIRADORES / MANILLAS INDEPENDIENTES DEL MÓDULO */}
        {!isDecoration && (
          <AccordionSection
            id="handles"
            title="Tirador del Módulo"
            icon={SlidersHorizontal}
            badge={
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                activeCabinet.handleConfig
                  ? isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'
                  : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
              }`}>
                {activeCabinet.handleConfig ? 'Personalizado' : 'Global'}
              </span>
            }
            isOpen={openSections.handles}
            onToggle={() => toggleSection('handles')}
            isLight={isLight}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'text-slate-600' : 'text-zinc-400'
              }`}>
                Modo de Asignación
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                activeCabinet.handleConfig
                  ? isLight ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-white/5 text-zinc-400 border border-white/10'
              }`}>
                {activeCabinet.handleConfig ? 'Personalizado' : 'Global (Heredado)'}
              </span>
            </div>

            {/* Selector de Modo: Heredar vs Personalizar */}
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => updateCabinet(activeCabinet.id, { handleConfig: undefined })}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !activeCabinet.handleConfig
                    ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                    : isLight
                      ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-500'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                Heredar Global
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeCabinet.handleConfig) {
                    updateCabinet(activeCabinet.id, {
                      handleConfig: { ...globalHandleConfig }
                    });
                  }
                }}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeCabinet.handleConfig
                    ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                    : isLight
                      ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-500'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                Personalizar
              </button>
            </div>

            {/* Aviso si sistema Gola activo en módulo base o isla */}
            {golaSystem !== 'none' && (activeCabinet.type === 'base' || activeCabinet.type === 'island') && (
              <div className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 text-[10px] leading-tight ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-700/50 text-amber-300'
              }`}>
                <div className="flex items-start gap-1.5">
                  <ShieldAlert size={13} className="shrink-0 mt-0.5 text-amber-500" />
                  <span>Perfil Gola activo (los tiradores frontales quedan ocultos).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGolaSystem('none')}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[9px] uppercase tracking-wider shrink-0 cursor-pointer shadow-xs"
                >
                  Quitar Gola
                </button>
              </div>
            )}

            {/* Panel de Configuración de Tirador cuando está Personalizado */}
            {activeCabinet.handleConfig && (() => {
              const currentHConfig = activeCabinet.handleConfig;
              const selectedModelItem = HANDLE_CATALOG.find((m) => m.id === currentHConfig.model) || HANDLE_CATALOG[0];

              const onSelectModel = (modelId: HandleModelId) => {
                const item = HANDLE_CATALOG.find((m) => m.id === modelId);
                if (!item) return;
                const newFinish = item.finishes.includes(currentHConfig.finish)
                  ? currentHConfig.finish
                  : item.finishes[0] || 'negro';
                const newLength = item.lengths.includes(currentHConfig.lengthMm)
                  ? currentHConfig.lengthMm
                  : item.lengths[0] || 0;
                if (golaSystem !== 'none') {
                  setGolaSystem('none');
                }
                updateCabinet(activeCabinet.id, {
                  handleConfig: {
                    model: modelId,
                    finish: newFinish,
                    lengthMm: newLength,
                    orientation: currentHConfig.orientation || 'auto'
                  }
                });
              };

              const onSelectFinish = (finish: HandleFinish) => {
                updateCabinet(activeCabinet.id, {
                  handleConfig: {
                    ...currentHConfig,
                    finish
                  }
                });
              };

              const onSelectLength = (len: number) => {
                updateCabinet(activeCabinet.id, {
                  handleConfig: {
                    ...currentHConfig,
                    lengthMm: len
                  }
                });
              };

              return (
                <div className={`flex flex-col gap-3 p-2.5 rounded-xl border mt-1 ${
                  isLight ? 'bg-orange-50/40 border-orange-200' : 'bg-black/40 border-orange-500/30'
                }`}>
                  {/* Selector de Modelos */}
                  <div>
                    <label className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 block ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      Modelo de Tirador
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {HANDLE_CATALOG.map((item) => {
                        const isSelected = currentHConfig.model === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelectModel(item.id)}
                            className={`flex flex-col text-left p-2 rounded-lg border transition-all cursor-pointer relative ${
                              isSelected
                                ? isLight
                                  ? 'bg-orange-100 border-orange-500 shadow-sm text-orange-950 font-bold'
                                  : 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold'
                                : isLight
                                  ? 'bg-white border-slate-200 hover:border-orange-300 hover:bg-slate-50 text-slate-800'
                                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] truncate">{item.name}</span>
                              {isSelected && (
                                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                                  <Check size={9} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <span className="text-[8px] opacity-75 capitalize">{item.material}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {currentHConfig.model !== 'none' && (
                    <>
                      {/* Acabado / Color */}
                      {selectedModelItem.finishes.length > 0 && (
                        <div>
                          <label className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 block ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}>
                            Acabado ({selectedModelItem.finishes.length})
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {selectedModelItem.finishes.map((finishKey) => {
                              const isSelected = currentHConfig.finish === finishKey;
                              const hex = FINISH_HEX[finishKey];
                              const label = FINISH_LABELS[finishKey];
                              return (
                                <button
                                  key={finishKey}
                                  type="button"
                                  onClick={() => onSelectFinish(finishKey)}
                                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? isLight
                                        ? 'bg-orange-100 border-orange-500 ring-1 ring-orange-500'
                                        : 'bg-orange-500/20 border-orange-500 ring-1 ring-orange-500'
                                      : isLight
                                        ? 'bg-white border-slate-200 hover:border-slate-300'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-inner"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span className={`text-[10px] font-semibold truncate ${
                                    isSelected
                                      ? isLight ? 'text-orange-950 font-bold' : 'text-orange-400 font-bold'
                                      : isLight ? 'text-slate-700' : 'text-slate-300'
                                  }`}>
                                    {label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Medidas / Entrecentros */}
                      {selectedModelItem.lengths.length > 0 && (
                        <div>
                          <label className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 block ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}>
                            Entrecentros / Medida
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedModelItem.lengths.map((len) => {
                              const isSelected = currentHConfig.lengthMm === len;
                              return (
                                <button
                                  key={len}
                                  type="button"
                                  onClick={() => onSelectLength(len)}
                                  className={`py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                                      : isLight
                                        ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400'
                                        : 'bg-white/5 border border-white/10 text-slate-300 hover:border-orange-500/50'
                                  }`}
                                >
                                  {len === 0 ? 'Punto Único' : `${len} mm`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Botón para restablecer */}
                  <button
                    type="button"
                    onClick={() => updateCabinet(activeCabinet.id, { handleConfig: undefined })}
                    className={`text-[9px] text-right font-medium hover:underline cursor-pointer px-1 pt-1 ${
                      isLight ? 'text-slate-500 hover:text-orange-600' : 'text-zinc-400 hover:text-orange-400'
                    }`}
                  >
                    Restablecer a Tirador Global del Proyecto
                  </button>
                </div>
              );
            })()}
          </AccordionSection>
        )}

        {/* ACORDEÓN 6: TAPAS LATERALES VISTAS (COSTADOS DECORATIVOS) */}
        {!isDecoration && (
          <AccordionSection
            id="coverPanels"
            title="Tapas Laterales Vistas"
            icon={Box}
            badge={
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                (activeCabinet.leftCoverPanel?.enabled && activeCabinet.rightCoverPanel?.enabled)
                  ? isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'
                  : (activeCabinet.leftCoverPanel?.enabled || activeCabinet.rightCoverPanel?.enabled)
                    ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'
                    : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
              }`}>
                {activeCabinet.leftCoverPanel?.enabled && activeCabinet.rightCoverPanel?.enabled
                  ? 'Ambas Tapas'
                  : activeCabinet.leftCoverPanel?.enabled
                    ? 'Solo Izq'
                    : activeCabinet.rightCoverPanel?.enabled
                      ? 'Solo Der'
                      : 'Sin Tapas'}
              </span>
            }
            isOpen={openSections.coverPanels}
            onToggle={() => toggleSection('coverPanels')}
            isLight={isLight}
          >

            {/* Presets Rápidos */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'none', label: 'Ninguna', l: false, r: false },
                { id: 'left', label: 'Solo Izq', l: true, r: false },
                { id: 'right', label: 'Solo Der', l: false, r: true },
                { id: 'both', label: 'Ambas', l: true, r: true },
              ].map(preset => {
                const isActive = (preset.l === !!activeCabinet.leftCoverPanel?.enabled) && (preset.r === !!activeCabinet.rightCoverPanel?.enabled);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateCabinet(activeCabinet.id, {
                        leftCoverPanel: preset.l ? {
                          enabled: true,
                          extendToFloor: activeCabinet.leftCoverPanel?.extendToFloor ?? false,
                          color: activeCabinet.leftCoverPanel?.color,
                          material: activeCabinet.leftCoverPanel?.material,
                          thickness: activeCabinet.leftCoverPanel?.thickness,
                        } : { enabled: false },
                        rightCoverPanel: preset.r ? {
                          enabled: true,
                          extendToFloor: activeCabinet.rightCoverPanel?.extendToFloor ?? false,
                          color: activeCabinet.rightCoverPanel?.color,
                          material: activeCabinet.rightCoverPanel?.material,
                          thickness: activeCabinet.rightCoverPanel?.thickness,
                        } : { enabled: false }
                      });
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-black shadow-sm font-extrabold'
                        : isLight
                          ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-500'
                          : 'bg-white/5 text-slate-300 border border-white/10 hover:border-orange-500/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Panel Izquierdo */}
            <div className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
              activeCabinet.leftCoverPanel?.enabled
                ? isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-white/[0.03] border-orange-500/30'
                : isLight ? 'bg-slate-50/60 border-slate-200 opacity-80' : 'bg-white/[0.01] border-white/5 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!activeCabinet.leftCoverPanel?.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      updateCabinet(activeCabinet.id, {
                        leftCoverPanel: enabled ? {
                          enabled: true,
                          extendToFloor: activeCabinet.leftCoverPanel?.extendToFloor ?? false,
                          color: activeCabinet.leftCoverPanel?.color,
                          material: activeCabinet.leftCoverPanel?.material,
                          thickness: activeCabinet.leftCoverPanel?.thickness
                        } : { enabled: false }
                      });
                    }}
                    className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded"
                  />
                  <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    Tapa Lateral Izquierda
                  </span>
                </label>
                {activeCabinet.leftCoverPanel?.enabled && (
                  <span className="text-[9px] font-semibold text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 px-1.5 py-0.5 rounded">
                    {activeCabinet.leftCoverPanel.color ? 'Personalizado' : 'Igual a Puertas'}
                  </span>
                )}
              </div>

              {activeCabinet.leftCoverPanel?.enabled && (
                <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-white/10">
                  {/* Selector rápido de acabado */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateCabinet(activeCabinet.id, {
                          leftCoverPanel: {
                            ...activeCabinet.leftCoverPanel,
                            enabled: true,
                            color: undefined,
                            material: undefined
                          }
                        });
                      }}
                      className={`py-1 px-2 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                        !activeCabinet.leftCoverPanel.color
                          ? 'bg-orange-500 text-black font-extrabold'
                          : isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400' : 'bg-white/5 border border-white/10 text-zinc-300'
                      }`}
                    >
                      Color de Puertas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetZone('leftCoverPanel');
                        setOpenSections(prev => ({ ...prev, finishes: true }));
                      }}
                      className={`py-1 px-2 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                        activeCabinet.leftCoverPanel.color
                          ? 'bg-orange-500 text-black font-extrabold'
                          : isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400' : 'bg-white/5 border border-white/10 text-zinc-300'
                      }`}
                    >
                      Elegir del Catálogo
                    </button>
                  </div>

                  {/* Extensión al suelo para muebles de piso */}
                  {(activeCabinet.type === 'base' || activeCabinet.type === 'tall' || activeCabinet.type === 'island') && (
                    <label className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/5 cursor-pointer">
                      <span className={`text-[10px] font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        Extender hasta el piso (Tapa zócalo)
                      </span>
                      <input
                        type="checkbox"
                        checked={!!activeCabinet.leftCoverPanel.extendToFloor}
                        onChange={(e) => {
                          updateCabinet(activeCabinet.id, {
                            leftCoverPanel: {
                              ...activeCabinet.leftCoverPanel,
                              enabled: true,
                              extendToFloor: e.target.checked
                            }
                          });
                        }}
                        className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Panel Derecho */}
            <div className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
              activeCabinet.rightCoverPanel?.enabled
                ? isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-white/[0.03] border-orange-500/30'
                : isLight ? 'bg-slate-50/60 border-slate-200 opacity-80' : 'bg-white/[0.01] border-white/5 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!activeCabinet.rightCoverPanel?.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      updateCabinet(activeCabinet.id, {
                        rightCoverPanel: enabled ? {
                          enabled: true,
                          extendToFloor: activeCabinet.rightCoverPanel?.extendToFloor ?? false,
                          color: activeCabinet.rightCoverPanel?.color,
                          material: activeCabinet.rightCoverPanel?.material,
                          thickness: activeCabinet.rightCoverPanel?.thickness
                        } : { enabled: false }
                      });
                    }}
                    className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded"
                  />
                  <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    Tapa Lateral Derecha
                  </span>
                </label>
                {activeCabinet.rightCoverPanel?.enabled && (
                  <span className="text-[9px] font-semibold text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 px-1.5 py-0.5 rounded">
                    {activeCabinet.rightCoverPanel.color ? 'Personalizado' : 'Igual a Puertas'}
                  </span>
                )}
              </div>

              {activeCabinet.rightCoverPanel?.enabled && (
                <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-white/10">
                  {/* Selector rápido de acabado */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateCabinet(activeCabinet.id, {
                          rightCoverPanel: {
                            ...activeCabinet.rightCoverPanel,
                            enabled: true,
                            color: undefined,
                            material: undefined
                          }
                        });
                      }}
                      className={`py-1 px-2 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                        !activeCabinet.rightCoverPanel.color
                          ? 'bg-orange-500 text-black font-extrabold'
                          : isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400' : 'bg-white/5 border border-white/10 text-zinc-300'
                      }`}
                    >
                      Color de Puertas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetZone('rightCoverPanel');
                        setOpenSections(prev => ({ ...prev, finishes: true }));
                      }}
                      className={`py-1 px-2 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                        activeCabinet.rightCoverPanel.color
                          ? 'bg-orange-500 text-black font-extrabold'
                          : isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-400' : 'bg-white/5 border border-white/10 text-zinc-300'
                      }`}
                    >
                      Elegir del Catálogo
                    </button>
                  </div>

                  {/* Extensión al suelo para muebles de piso */}
                  {(activeCabinet.type === 'base' || activeCabinet.type === 'tall' || activeCabinet.type === 'island') && (
                    <label className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/5 cursor-pointer">
                      <span className={`text-[10px] font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        Extender hasta el piso (Tapa zócalo)
                      </span>
                      <input
                        type="checkbox"
                        checked={!!activeCabinet.rightCoverPanel.extendToFloor}
                        onChange={(e) => {
                          updateCabinet(activeCabinet.id, {
                            rightCoverPanel: {
                              ...activeCabinet.rightCoverPanel,
                              enabled: true,
                              extendToFloor: e.target.checked
                            }
                          });
                        }}
                        className="accent-orange-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Control de Profundidad / Voladizo para Isla con Regla Punteada */}
            {activeCabinet.type === 'island' && (activeCabinet.leftCoverPanel?.enabled || activeCabinet.rightCoverPanel?.enabled) && (() => {
              const minDepth = activeCabinet.depth || 60;
              const overhang = countertopConfig.islandOverhangCm ?? 30;
              const maxDepth = minDepth + overhang;
              const currentSideDepth = activeCabinet.leftCoverPanel?.depth || activeCabinet.rightCoverPanel?.depth || islandBackConfig.sideDepthCm || minDepth;

              const handleDepthChange = (newDepth: number) => {
                updateCabinet(activeCabinet.id, {
                  leftCoverPanel: activeCabinet.leftCoverPanel?.enabled
                    ? { ...activeCabinet.leftCoverPanel, depth: newDepth }
                    : activeCabinet.leftCoverPanel,
                  rightCoverPanel: activeCabinet.rightCoverPanel?.enabled
                    ? { ...activeCabinet.rightCoverPanel, depth: newDepth }
                    : activeCabinet.rightCoverPanel,
                });
                setIslandBackConfig({
                  sidesEnabled: true,
                  sideDepthCm: newDepth,
                  sideLeftEnabled: !!activeCabinet.leftCoverPanel?.enabled,
                  sideRightEnabled: !!activeCabinet.rightCoverPanel?.enabled,
                });
              };

              return (
                <DottedDepthSlider
                  min={minDepth}
                  max={maxDepth}
                  step={1}
                  value={currentSideDepth}
                  onChange={handleDepthChange}
                  label="Profundidad Lateral Isla"
                  overhangCm={overhang}
                  isLight={isLight}
                />
              );
            })()}
          </AccordionSection>
        )}

        {/* ACORDEÓN 7: REVESTIMIENTO Y COSTADOS DE ISLA */}
        {activeCabinet.type === 'island' && (
          <AccordionSection
            id="islandBack"
            title="Revestimiento y Costados Isla"
            icon={Layers}
            badge={
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                islandBackConfig.enabled
                  ? (isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400')
                  : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400')
              }`}>
                {islandBackConfig.enabled ? 'Activo' : 'Desactivado'}
              </span>
            }
            isOpen={openSections.islandBack}
            onToggle={() => toggleSection('islandBack')}
            isLight={isLight}
          >
            <IslandBackPanelConfigSection isLight={isLight} />
          </AccordionSection>
        )}

        {/* ACORDEÓN 7: ARMADO Y SUJECIÓN INDIVIDUAL */}
        <AccordionSection
          id="assembly"
          title="Armado y Sujeción"
          icon={Wrench}
          badge={
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeCabinet.assemblyType || activeCabinet.drawerAssemblyType || activeCabinet.mountingType
                ? isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'
                : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
            }`}>
              {activeCabinet.assemblyType || activeCabinet.drawerAssemblyType || activeCabinet.mountingType
                ? 'Personalizado'
                : 'Spax • Estándar'}
            </span>
          }
          isOpen={openSections.assembly}
          onToggle={() => toggleSection('assembly')}
          isLight={isLight}
        >
          <div className="flex flex-col gap-3">
            {/* 1. Sistema de Armado de Estructura (Cuerpo / Casco) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className={`text-[9.5px] uppercase tracking-wider font-bold ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  1. Ensamble de Estructura (Casco)
                </label>
                <span className={`text-[9px] font-mono font-bold ${
                  (activeCabinet.assemblyType || 'spax') === 'minifix'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-500'
                }`}>
                  {(activeCabinet.assemblyType || 'spax') === 'minifix' ? 'Minifix Ø15mm' : 'Tornillo Spax'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: 'spax' as const,
                    title: 'Tornillo Spax / Soberbio',
                    spec: '4.0x50 mm / Confirmat',
                    desc: 'Fijación directa con tapas adhesivas'
                  },
                  {
                    id: 'minifix' as const,
                    title: 'Sistema Minifix + Tarugo',
                    spec: 'Caja Ø15mm + Perno M6',
                    desc: 'Ensamble oculto sin tornillo visto'
                  }
                ].map((opt) => {
                  const isSelected = (activeCabinet.assemblyType || 'spax') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateCabinet(activeCabinet.id, { assemblyType: opt.id })}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? isLight
                            ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs ring-1 ring-orange-500/50'
                            : 'bg-orange-500/20 border-orange-500 text-white shadow-xs ring-1 ring-orange-500/40'
                          : isLight
                            ? 'bg-white border-slate-200 hover:border-orange-300 text-slate-700'
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10.5px] font-bold leading-tight">{opt.title}</span>
                        {isSelected && (
                          <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                            <Check size={9} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className={`text-[8.5px] font-mono ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : 'opacity-70'}`}>
                        {opt.spec}
                      </span>
                      <span className="text-[8px] opacity-75 leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Armado de Cajoneras (si el módulo tiene cajones) */}
            {hasDrawers && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className={`text-[9.5px] uppercase tracking-wider font-bold ${
                    isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    2. Ensamble de Gavetas / Cajones
                  </label>
                  <span className={`text-[9px] font-mono font-bold ${
                    (activeCabinet.drawerAssemblyType || 'spax') === 'minifix'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-slate-500'
                  }`}>
                    {(activeCabinet.drawerAssemblyType || 'spax') === 'minifix' ? 'Minifix Cajón' : 'Spax 3.5x40'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'spax' as const,
                      title: 'Tornillo Spax',
                      spec: '3.5x40 mm Cincado',
                      desc: 'Fijación directa cajón'
                    },
                    {
                      id: 'minifix' as const,
                      title: 'Minifix Cajonera',
                      spec: 'Caja Ø12/Ø15 mm',
                      desc: 'Desarmable sin fijación visible'
                    }
                  ].map((opt) => {
                    const isSelected = (activeCabinet.drawerAssemblyType || 'spax') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCabinet(activeCabinet.id, { drawerAssemblyType: opt.id })}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? isLight
                              ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs ring-1 ring-orange-500/50'
                              : 'bg-orange-500/20 border-orange-500 text-white shadow-xs ring-1 ring-orange-500/40'
                            : isLight
                              ? 'bg-white border-slate-200 hover:border-orange-300 text-slate-700'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10.5px] font-bold leading-tight">{opt.title}</span>
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[8.5px] font-mono ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : 'opacity-70'}`}>
                          {opt.spec}
                        </span>
                        <span className="text-[8px] opacity-75 leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Sistema de Sujeción y Anclaje */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <label className={`text-[9.5px] uppercase tracking-wider font-bold ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                {activeCabinet.type === 'wall' ? '3. Sistema de Suspensión a Muro' : activeCabinet.type === 'island' ? '3. Sistema de Fijación de Isla' : '3. Sujeción y Anclaje Estructural'}
              </label>

              {activeCabinet.type === 'wall' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'hidden_suspension' as const,
                      title: 'Colgador Oculto 3D',
                      spec: 'Riel de Suspensión',
                      desc: 'Regulación 3D (130 kg/par)'
                    },
                    {
                      id: 'bracket' as const,
                      title: 'Escuadra Reforzada',
                      spec: 'Angular con Tapa',
                      desc: 'Fijación directa con tornillo'
                    }
                  ].map((opt) => {
                    const isSelected = (activeCabinet.mountingType || 'hidden_suspension') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCabinet(activeCabinet.id, { mountingType: opt.id })}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? isLight
                              ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs ring-1 ring-orange-500/50'
                              : 'bg-orange-500/20 border-orange-500 text-white shadow-xs ring-1 ring-orange-500/40'
                            : isLight
                              ? 'bg-white border-slate-200 hover:border-orange-300 text-slate-700'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10.5px] font-bold leading-tight">{opt.title}</span>
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[8.5px] font-mono ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : 'opacity-70'}`}>
                          {opt.spec}
                        </span>
                        <span className="text-[8px] opacity-75 leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              ) : activeCabinet.type === 'island' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'floor_anchor' as const,
                      title: 'Anclaje Oculto a Piso',
                      spec: 'Escuadras Radier',
                      desc: 'Fijación interna sin perforar frentes'
                    },
                    {
                      id: 'inter_cabinet' as const,
                      title: 'Unión Inter-Módulos',
                      spec: 'Conectores M6',
                      desc: 'Solidariza cuerpos adyacentes de isla'
                    }
                  ].map((opt) => {
                    const isSelected = (activeCabinet.mountingType || 'floor_anchor') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCabinet(activeCabinet.id, { mountingType: opt.id })}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? isLight
                              ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs ring-1 ring-orange-500/50'
                              : 'bg-orange-500/20 border-orange-500 text-white shadow-xs ring-1 ring-orange-500/40'
                            : isLight
                              ? 'bg-white border-slate-200 hover:border-orange-300 text-slate-700'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10.5px] font-bold leading-tight">{opt.title}</span>
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[8.5px] font-mono ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : 'opacity-70'}`}>
                          {opt.spec}
                        </span>
                        <span className="text-[8px] opacity-75 leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'wall_anchor' as const,
                      title: 'Anclaje Posterior Muro',
                      spec: 'Tarugo DUOPOWER + Tirafondo',
                      desc: 'Fijación de seguridad anti-vuelco'
                    },
                    {
                      id: 'inter_cabinet' as const,
                      title: 'Pernos Unión M6',
                      spec: 'Conectores Pasantes',
                      desc: 'Unión sólida entre módulos contiguos'
                    }
                  ].map((opt) => {
                    const isSelected = (activeCabinet.mountingType || 'wall_anchor') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCabinet(activeCabinet.id, { mountingType: opt.id })}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? isLight
                              ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs ring-1 ring-orange-500/50'
                              : 'bg-orange-500/20 border-orange-500 text-white shadow-xs ring-1 ring-orange-500/40'
                            : isLight
                              ? 'bg-white border-slate-200 hover:border-orange-300 text-slate-700'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10.5px] font-bold leading-tight">{opt.title}</span>
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[8.5px] font-mono ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : 'opacity-70'}`}>
                          {opt.spec}
                        </span>
                        <span className="text-[8px] opacity-75 leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Restablecer a Global */}
            {(activeCabinet.assemblyType || activeCabinet.drawerAssemblyType || activeCabinet.mountingType) && (
              <button
                type="button"
                onClick={() => updateCabinet(activeCabinet.id, {
                  assemblyType: undefined,
                  drawerAssemblyType: undefined,
                  mountingType: undefined
                })}
                className={`text-[9px] text-right font-medium hover:underline cursor-pointer px-1 pt-1 ${
                  isLight ? 'text-slate-500 hover:text-orange-600' : 'text-zinc-400 hover:text-orange-400'
                }`}
              >
                Restablecer a Sistema Estándar Global
              </button>
            )}
          </div>
        </AccordionSection>

        {/* ACORDEÓN 8: ACABADOS Y MATERIALES EXCLUSIVOS DEL MÓDULO */}
        <AccordionSection
          id="finishes"
          title="Acabados y Materiales Exclusivos"
          icon={Palette}
          badge={
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeCabinet.customColors && Object.keys(activeCabinet.customColors).length > 0
                ? isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'
                : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
            }`}>
              {activeCabinet.customColors && Object.keys(activeCabinet.customColors).length > 0
                ? `${Object.keys(activeCabinet.customColors).length} zonas pers.`
                : 'Estándar'}
            </span>
          }
          isOpen={openSections.finishes}
          onToggle={() => toggleSection('finishes')}
          isLight={isLight}
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-600' : 'text-zinc-400'
              }`}>
                1. Selecciona la zona a modificar:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'doors', label: 'Puertas' },
                  { id: 'drawerFronts', label: 'Frentes Cajón' },
                  { id: 'coverPanels', label: 'Tapas Laterales' },
                  { id: 'structure', label: 'Paredes / Casco' },
                  { id: 'drawerInner', label: 'Cajas Cajón' },
                  { id: 'shelves', label: 'Repisas' },
                  { id: 'back', label: 'Fondo Interior' },
                  { id: 'socle', label: 'Zócalo' }
                ].map(part => {
                  const isSelected = targetZone === part.id;
                  return (
                    <button 
                      key={part.id}
                      type="button"
                      onClick={() => setTargetZone(part.id as PartType)}
                      className={`py-2 px-3 rounded-lg text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? isLight
                            ? 'bg-orange-500 text-black shadow-xs font-bold'
                            : 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.35)]' 
                          : isLight
                            ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-xs'
                            : 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#34343a] border border-white/5'
                      }`}
                    >
                      {part.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Masisa */}
            {masisaTextures.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  2. Masisa (Melaminas)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {masisaTextures.map(t => renderTextureButton(t))}
                </div>
              </div>
            )}

            {/* Abet */}
            {abetTextures.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  3. Abet Laminati (HPL)
                </div>

                {/* Sub-opción contextual en Abet Laminati: Trascara Balancer Blanco 0,9 mm */}
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                  isLight ? 'bg-orange-50/70 border-orange-200' : 'bg-orange-500/10 border-orange-500/20'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                        Trascara Balancer Blanco (0,9 mm)
                      </span>
                      <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Equilibrio mecánico anti-alabeo para enchapes HPL
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = activeCabinet.hplBalancer ?? globalStore.hplBalancer;
                        handleOverride('hplBalancer', !current);
                      }}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all cursor-pointer shrink-0 ${
                        (activeCabinet.hplBalancer ?? globalStore.hplBalancer)
                          ? isLight
                            ? 'bg-orange-500 text-black font-extrabold shadow-xs'
                            : 'bg-orange-500 text-black font-extrabold shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                          : isLight
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {(activeCabinet.hplBalancer ?? globalStore.hplBalancer) ? 'Activado (0,9 mm)' : 'Mismo Diseño'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {abetTextures.map(t => renderTextureButton(t))}
                </div>
              </div>
            )}

            {/* Otras Texturas Oficiales de Proveedor */}
            {otherTextures.length > 0 && (
              <div className={`pt-3 border-t flex flex-col gap-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  4. Otras Terminaciones de Proveedor
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {otherTextures.map(t => renderTextureButton(t))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Clear overrides */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button 
            onClick={handleClearOverrides}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all text-[11px] uppercase font-bold tracking-wider border ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
            }`}
          >
            <RefreshCw size={13} /> Revertir Global
          </button>
          <button 
            onClick={() => removeCabinet(activeCabinet.id)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all text-[11px] uppercase font-bold tracking-wider border ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700 shadow-sm'
                : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'
            }`}
          >
            <Trash2 size={13} /> Eliminar Mueble
          </button>
        </div>
      </div>
    </div>
  );
}

