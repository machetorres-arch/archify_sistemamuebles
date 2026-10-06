import React, { useState } from 'react';
import { useStore, PartType } from '../store';
import { useAdminStore } from '../store/adminStore';
import { useKitchenStore } from '../store/kitchenStore';

const DEFAULT_TEXTURES = [
  { id: 'def_mas_blanco_15', name: 'Masisa Blanco', url: '#FFFFFF', thicknessMm: 15, brand: 'Masisa' },
  { id: 'def_mas_blanco_18', name: 'Masisa Blanco', url: '#FFFFFF', thicknessMm: 18, brand: 'Masisa' },
  { id: 'def_mas_negro_18', name: 'Masisa Negro', url: '#171717', thicknessMm: 18, brand: 'Masisa' }
];

export const TexturesSection = ({ 
  onSelectTexture,
  title = "Catálogo de Materiales",
  badgeText,
  isLight = false,
}: { 
  onSelectTexture?: (url: string, mat: 'hpl' | 'melamina') => void;
  title?: string;
  badgeText?: string;
  isLight?: boolean;
}) => {
  const state = useStore();
  const adminTextures = useAdminStore((s) => s.textures);
  const [thicknessFilter, setThicknessFilter] = useState<'all' | 15 | 18>('all');
  const hasIslands = useKitchenStore((s) => s.cabinets?.some((c) => c.type === 'island'));

  const applyTexture = (url: string, name: string, texObj?: any) => {
    const currentTargetPart = useStore.getState().targetPart;
    const nameLower = name.toLowerCase();
    const urlLower = (url || '').toLowerCase();
    
    // Auto-detectar material por categoría de Backoffice, marca o nombre del archivo/textura
    const isHPL = 
      texObj?.category === 'hpl_autor' ||
      (texObj && isAbetItem(texObj)) ||
      nameLower.includes('abet') ||
      nameLower.includes('hpl') ||
      nameLower.includes('laminati') ||
      urlLower.includes('abet') ||
      urlLower.includes('fiore') ||
      urlLower.includes('broccato');
    const mat: 'melamina' | 'hpl' = isHPL ? 'hpl' : 'melamina';
    
    if (onSelectTexture) {
      onSelectTexture(url, mat);
      return;
    }

    if (currentTargetPart === 'islandBack') {
      useKitchenStore.getState().setIslandBackConfig({
        enabled: true,
        materialType: 'decorative',
        decorativeColor: url,
        decorativeMaterial: mat,
      });
      return;
    }

    state.applyTextureToTarget(url);
    switch(currentTargetPart) {
      case 'structure': state.setStructureMaterial(mat); break;
      case 'doors': state.setDoorMaterial(mat); break;
      case 'drawerFronts': state.setDrawerFrontMaterial(mat); break;
      case 'drawerInner': state.setDrawerInnerMaterial(mat); break;
      case 'shelves': state.setShelfMaterial(mat); break;
      case 'socle': state.setSocleMaterial(mat); break;
      case 'all':
        state.setStructureMaterial(mat);
        state.setDoorMaterial(mat);
        state.setDrawerFrontMaterial(mat);
        state.setDrawerInnerMaterial(mat);
        state.setShelfMaterial(mat);
        state.setSocleMaterial(mat);
        break;
    }
  };

  // Filtrar exclusivamente terminaciones aprobadas por el Superadministrador (VB) y activas
  // Las cubiertas de cuarzo/sinterizado (Qstone Sysprotec) se configuran exclusivamente en el modal de cubiertas
  const activeApprovedAdminTextures = (adminTextures || [])
    .filter(t => t.active && (t.approvalStatus === 'approved' || !t.approvalStatus))
    .filter(t => {
      const cat = t.category;
      const n = (t.name || '').toLowerCase();
      const b = (t.brand || t.providerName || '').toLowerCase();
      const isStone = cat === 'piedras_marmoles' || n.includes('qstone') || b.includes('qstone') || b.includes('sysprotec');
      return !isStone;
    })
    .map(t => ({
      id: t.id,
      name: t.name.toLowerCase().includes((t.brand || '').toLowerCase()) ? t.name : `${t.brand ? t.brand + ' ' : ''}${t.name}`,
      code: t.code,
      url: t.url || t.previewUrl || '#CCCCCC',
      category: t.category,
      brand: t.brand || t.providerName,
      providerName: t.providerName,
      thicknessMm: t.thicknessMm || (t.category === 'hpl_autor' ? 0.9 : (t.name.includes('15') ? 15 : 18)),
      sheetFormat: t.sheetFormat
    }));

  // Combinación única con defaults
  const combinedMap = new Map<string, any>();
  DEFAULT_TEXTURES.forEach(t => combinedMap.set(t.id, t));
  activeApprovedAdminTextures.forEach(t => combinedMap.set(t.id, t));

  const allTextures = Array.from(combinedMap.values());
  
  const isMasisaItem = (t: any) => {
    const n = (t.name || '').toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const p = (t.providerName || '').toLowerCase();
    return n.includes('masisa') || b.includes('masisa') || p.includes('masisa');
  };

  const isAbetItem = (t: any) => {
    const n = (t.name || '').toLowerCase();
    const b = (t.brand || '').toLowerCase();
    const p = (t.providerName || '').toLowerCase();
    return n.includes('abet') || b.includes('abet') || p.includes('abet') || n.includes('laminati') || n.includes('hpl') || t.category === 'hpl_autor';
  };

  // Filtrado por espesor si aplica (solo afecta a melaminas / maderas / tableros)
  const matchesThickness = (t: any) => {
    if (thicknessFilter === 'all') return true;
    if (isAbetItem(t)) return true;
    return t.thicknessMm === thicknessFilter;
  };

  const masisaTextures = allTextures.filter(t => isMasisaItem(t) && matchesThickness(t));
  const abetTextures = allTextures.filter(t => !isMasisaItem(t) && isAbetItem(t));
  const otherTextures = allTextures.filter(t => !isMasisaItem(t) && !isAbetItem(t) && matchesThickness(t));

  const renderTextureButton = (tex: any) => {
    const is15 = tex.thicknessMm === 15;
    const is18 = tex.thicknessMm === 18;
    return (
      <div key={tex.id} className="relative group">
        <button 
          onClick={() => {
            applyTexture(tex.url, tex.name, tex);
            // Solo ajustar espesor global de la estructura si se está configurando la estructura o todo el mueble,
            // y solo para tableros autoportantes (>= 12 mm). Nunca para láminas HPL (0.8/0.9 mm) ni al cambiar solo puertas.
            if (
              tex.thicknessMm &&
              tex.thicknessMm >= 12 &&
              (state.targetPart === 'structure' || state.targetPart === 'all') &&
              state.setThickness
            ) {
              state.setThickness(Number((tex.thicknessMm / 10).toFixed(2)));
            }
          }}
          className={`flex flex-col items-center gap-1 p-1 rounded transition-colors w-full cursor-pointer relative ${
            isLight 
              ? 'bg-white border border-slate-300 hover:border-orange-500 shadow-sm' 
              : 'bg-white/5 border border-white/10 hover:border-orange-500/50'
          }`}
          title={`${tex.name} ${tex.thicknessMm ? `[${tex.thicknessMm}mm]` : ''} ${tex.code ? `(${tex.code})` : ''}`}
        >
          {/* Badge de Espesor visible en esquina superior derecha */}
          {tex.thicknessMm && (
            <span
              className={`absolute top-1 right-1 px-1 py-0.2 rounded text-[7px] font-mono font-extrabold uppercase shadow-sm z-10 ${
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
            className={`w-full aspect-square rounded border group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-cover bg-center ${
              isLight ? 'border-slate-200' : 'border-white/20'
            }`}
            style={tex.url.startsWith('#') ? { backgroundColor: tex.url } : { backgroundImage: `url('${tex.url}')` }}
          />
          <span className={`text-[8px] uppercase tracking-wider font-bold truncate w-full text-center ${
            isLight ? 'text-slate-800' : 'text-slate-400'
          }`}>
            {tex.name.length > 17 ? tex.name.substring(0, 17) + '...' : tex.name}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className={`mb-8 p-3 rounded-lg border ${
      isLight 
        ? 'bg-orange-50/40 border-orange-300 shadow-sm' 
        : 'bg-orange-500/5 border-orange-500/30'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-[11px] uppercase tracking-widest font-bold ${
          isLight ? 'text-orange-600' : 'text-orange-500'
        }`}>{title}</h2>
        {badgeText && (
          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            isLight 
              ? 'bg-orange-100 text-orange-800 border-orange-300' 
              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          }`}>
            {badgeText}
          </span>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mb-4">
        <label className={`text-[10px] uppercase tracking-widest font-bold ${
          isLight ? 'text-slate-700' : 'text-slate-400'
        }`}>1. Selecciona la zona a modificar:</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { id: 'all' as PartType, label: 'Todo el Mueble' },
            { id: 'doors' as PartType, label: 'Puertas' },
            { id: 'drawerFronts' as PartType, label: 'Frentes Cajón' },
            { id: 'structure' as PartType, label: 'Estructura / Casco' },
            { id: 'coverPanels' as PartType, label: 'Tapas Laterales' },
            { id: 'drawerInner' as PartType, label: 'Cajas Cajón' },
            { id: 'shelves' as PartType, label: 'Repisas' },
            { id: 'back' as PartType, label: 'Fondo Interior' },
            { id: 'socle' as PartType, label: 'Zócalo' },
          ].map(part => (
            <button 
              key={part.id}
              onClick={() => state.setTargetPart(part.id)}
              className={`p-1.5 rounded-md text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                (part as any).highlight ? 'col-span-2 py-2 border-orange-500/60 shadow-sm' : ''
              } ${
                state.targetPart === part.id 
                  ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-orange-500 font-extrabold' 
                  : isLight 
                    ? 'bg-white text-slate-800 border border-slate-300 hover:border-orange-500 hover:text-black shadow-sm' 
                    : 'bg-white/10 text-slate-300 border border-transparent hover:bg-white/20'
              }`}
            >
              {part.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de Espesor de Melamina: Todos / 15 mm / 18 mm */}
      <div className={`flex items-center justify-between p-1.5 rounded-lg border mb-3.5 ${
        isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/10'
      }`}>
        <span className={`text-[9px] uppercase font-bold tracking-wider pl-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          Filtro Calibre:
        </span>
        <div className="flex items-center gap-1">
          {[
            { id: 'all' as const, label: 'Todos' },
            { id: 15 as const, label: '15 mm' },
            { id: 18 as const, label: '18 mm' },
          ].map((f) => (
            <button
              key={String(f.id)}
              type="button"
              onClick={() => setThicknessFilter(f.id)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                thicknessFilter === f.id
                  ? 'bg-orange-500 text-black font-extrabold shadow-xs'
                  : isLight
                  ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {masisaTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>2. Masisa (Melaminas)</label>
          <div className="grid grid-cols-3 gap-2">
            {masisaTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}

      {abetTextures.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-[10px] uppercase tracking-widest font-bold ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>3. Abet Laminati (HPL)</label>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
              Laminado de Alta Presión
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {abetTextures.map(t => renderTextureButton(t))}
          </div>

          {/* Trascara HPL Balancer Global 0.9 mm */}
          <div className={`mt-2.5 p-2.5 rounded-xl border flex flex-col gap-1.5 ${
            isLight ? 'bg-orange-50/80 border-orange-200' : 'bg-black/30 border-orange-500/25'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'text-orange-950' : 'text-orange-400'
              }`}>
                Trascara HPL de Compensación (Global)
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                0.9 mm
              </span>
            </div>
            <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Balanceador blanco normalizado para evitar el alabeo de puertas y frentes laminados a una cara.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => state.setHplBalancer(true)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  state.hplBalancer
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>Balancer Blanco 0.9mm</span>
              </button>
              <button
                type="button"
                onClick={() => state.setHplBalancer(false)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  !state.hplBalancer
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>Mismo HPL 2 Caras</span>
              </button>
            </div>
          </div>

          {/* Sustrato de Base HPL: MDF Desnudo 15mm / 18mm (Formato 2440 × 1520 mm) */}
          <div className={`mt-2 p-2.5 rounded-xl border flex flex-col gap-1.5 ${
            isLight ? 'bg-orange-50/80 border-orange-200' : 'bg-black/30 border-orange-500/25'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'text-orange-950' : 'text-orange-400'
              }`}>
                Sustrato Base MDF Desnudo
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-300 border border-zinc-600/40">
                2440 × 1520 mm
              </span>
            </div>
            <p className={`text-[10px] leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Tablero MDF crudo donde se prensa el laminado HPL (formato único 2440 × 1520 mm).
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => state.setHplSubstrateThickness(15)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  (state.hplSubstrateThickness || 15) === 15
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>MDF Desnudo 15 mm</span>
              </button>
              <button
                type="button"
                onClick={() => state.setHplSubstrateThickness(18)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  state.hplSubstrateThickness === 18
                    ? 'bg-orange-500 text-black shadow-xs font-extrabold'
                    : isLight
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-orange-500/50'
                }`}
              >
                <span>MDF Desnudo 18 mm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {otherTextures.length > 0 && (
        <div className="mb-4">
          <label className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>4. Otros Proveedores Homologados</label>
          <div className="grid grid-cols-3 gap-2">
            {otherTextures.map(t => renderTextureButton(t))}
          </div>
        </div>
      )}
    </div>
  );
};
