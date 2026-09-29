import React, { useState } from 'react';
import { useKitchenStore } from '../../store/kitchenStore';
import { WALL_COLOR_OPTIONS, FLOOR_TYPE_OPTIONS } from '../../utils/kitchenMaterials';
import { Palette, Check, Layers } from 'lucide-react';

const sectionTitle = "text-[11px] uppercase tracking-widest text-orange-500 font-bold mb-3 mt-6 first:mt-0";

export function RoomFinishesSection({ isLight = false }: { isLight?: boolean }) {
  const { wallColor, setWallColor, floorType, setFloorType } = useKitchenStore();
  const [activeTab, setActiveTab] = useState<'walls' | 'floors'>('walls');

  return (
    <div className={`mb-6 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-[11px] uppercase tracking-widest font-bold mb-3 mt-6 first:mt-0 ${
          isLight ? 'text-orange-600' : 'text-orange-500'
        }`}>Acabados de Estancia</h2>
        <div className={`flex p-0.5 rounded-lg border ${
          isLight ? 'bg-slate-200/90 border-slate-300' : 'bg-black/40 border-white/10'
        }`}>
          <button
            onClick={() => setActiveTab('walls')}
            className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'walls' 
                ? 'bg-orange-500 text-black shadow-sm' 
                : isLight 
                  ? 'text-slate-700 hover:text-slate-900 font-bold' 
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette size={11} />
            <span>Muros ({WALL_COLOR_OPTIONS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('floors')}
            className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'floors' 
                ? 'bg-orange-500 text-black shadow-sm' 
                : isLight 
                  ? 'text-slate-700 hover:text-slate-900 font-bold' 
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={11} />
            <span>Pisos ({FLOOR_TYPE_OPTIONS.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'walls' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {WALL_COLOR_OPTIONS.map((opt) => {
              const isSelected = (wallColor || '').toLowerCase() === opt.hex.toLowerCase();
              return (
                <button
                  key={opt.id}
                  onClick={() => setWallColor(opt.hex)}
                  title={`${opt.name} (${opt.category}): ${opt.description}`}
                  className={`group relative flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/15 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                      : isLight
                        ? 'border-slate-300 bg-white hover:border-orange-500 hover:bg-slate-50 shadow-sm'
                        : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full border border-black/30 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: opt.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        className={
                          ['#FFFFFF', '#F6F3EC', '#E2E8F0', '#CBD5E1', '#E7DEC8', '#9CAF88'].includes(opt.hex)
                            ? 'text-black'
                            : 'text-white'
                        }
                      />
                    )}
                  </span>
                  <span className={`text-[8px] uppercase tracking-tight mt-1.5 font-bold truncate max-w-full text-center leading-tight ${
                    isLight ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {opt.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'floors' && (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {FLOOR_TYPE_OPTIONS.map((opt) => {
              const isSelected = floorType === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFloorType(opt.id)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/15 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                      : isLight
                        ? 'border-slate-300 bg-white hover:border-orange-500 hover:bg-slate-50 shadow-sm'
                        : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded border shrink-0 shadow-sm relative overflow-hidden flex items-center justify-center ${
                      isLight ? 'border-slate-300' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: opt.primaryColor }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/2 opacity-30"
                      style={{ backgroundColor: opt.accentColor }}
                    />
                    {isSelected && <Check size={14} className="relative z-10 text-orange-500 drop-shadow" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[10px] font-bold truncate leading-tight ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>{opt.name}</span>
                    <span className={`text-[8px] uppercase tracking-wider font-bold ${
                      isLight ? 'text-orange-600' : 'text-orange-400'
                    }`}>{opt.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
