import React, { useState } from 'react';
import { Box, LayoutDashboard, Sparkles, ArrowRight, ShieldCheck, Shield, User, LogIn, Briefcase, Armchair } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { AdminLoginModal } from '../components/admin/AdminLoginModal';
import { AdminBackofficeModal } from '../components/admin/AdminBackofficeModal';

export function Home({ onNavigate }: { onNavigate: (route: 'closet' | 'kitchen' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => void }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isBackofficeOpen, setIsBackofficeOpen] = useState(false);
  const isLocalAuth = useAdminStore((state) => state.isAuthenticated);
  const supabaseUser = useSupabaseAuthStore((state) => state.user);
  const supabaseTenant = useSupabaseAuthStore((state) => state.tenant);
  const isCloud = isSupabaseConfigured();

  const isUserLoggedIn = Boolean(isLocalAuth || supabaseUser);

  const handleOpenAdmin = () => {
    if (isUserLoggedIn) {
      setIsBackofficeOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 font-sans p-8 flex flex-col items-center overflow-y-auto">
      <header className="w-full max-w-7xl flex flex-wrap justify-between items-center mb-16 gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bellota text-4xl font-bold lowercase text-orange-500 tracking-tight select-none">
            arquify
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {isUserLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBackofficeOpen(true)}
                className="group px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/50 rounded-xl text-xs font-bold uppercase tracking-wider text-orange-300 hover:text-orange-200 flex items-center gap-2 transition-all shadow-lg shadow-orange-500/10 cursor-pointer"
                title="Abrir panel de control y administración"
              >
                <div className="p-1 bg-orange-500/30 rounded-md text-orange-400">
                  <ShieldCheck size={14} />
                </div>
                <span>Backoffice</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sesión activa" />
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-slate-300">
                <User size={13} className="text-orange-400" />
                <span className="font-mono text-[11px] truncate max-w-[150px]">
                  {supabaseUser?.email || 'marcelo@robfu.cl'}
                </span>
                {supabaseUser?.role && (
                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold uppercase rounded">
                    {supabaseUser.role}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="group px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
              title="Iniciar sesión en Backoffice o registrar empresa proveedora"
            >
              <LogIn size={15} />
              <span>Iniciar Sesión / Proveedores</span>
            </button>
          )}

          <div className="hidden md:block text-xs font-semibold uppercase tracking-widest text-slate-500 border-l border-zinc-800 pl-3">
            Suite Muebles 3D
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 tracking-tight">Planifica tus muebles con <br/><span className="text-orange-500">precisión milimétrica</span></h1>
        <p className="text-slate-400 text-center max-w-2xl mb-16 text-lg">Selecciona un módulo de diseño para comenzar. Crea cocinas con trazado MEP, clósets modulares, mobiliario de oficina sobre planos PDF, sillas de terciado curvo, muebles especiales y cabinas sanitarias fenólicas en 2D y 3D.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Main Card: Hospital & Clinical Furniture Configurator */}
          <div 
            onClick={() => onNavigate('kitchen')}
            className="group relative bg-zinc-900 border-2 border-emerald-500 rounded-2xl p-6 hover:border-emerald-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/35 ring-1 ring-emerald-500/30"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-emerald-500/30"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/40 mb-4 z-10 relative flex items-center justify-between w-full">
              <span className="text-3xl">🏥</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-widest border border-emerald-500/30">Módulo Principal</span>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Mobiliario Hospitalario & Clínico</h2>
            <div className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-emerald-500/30">Norma SACYR MC.2.02 • Krion 12mm • Bastidor FE 30x50</div>
            <p className="text-slate-300 text-xs leading-relaxed mb-5 z-10 relative">Mesones clínicos con cubierta Krion Solid Surface 12mm, cajones con cerradura trampa ANVER, estructura metálica sanitaria elevada 300mm y tirador continuo KUTZ.</p>
            <div className="mt-auto flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Abrir Suite Hospitalaria <ArrowRight size={13} />
            </div>
          </div>

          {/* Kitchen Card */}
          <div 
            onClick={() => onNavigate('kitchen')}
            className="group relative bg-zinc-900 border border-blue-500/60 rounded-2xl p-6 hover:border-blue-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 ring-1 ring-blue-500/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-blue-500/25"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-blue-500/40 mb-4 z-10 relative">
              <LayoutDashboard size={28} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Cocinas Residenciales & BIM</h2>
            <div className="inline-block px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-blue-500/30">Motor BIM 2D/3D • MEP • Regrueso & Gola</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Dibuja muros en 2D y arrastra gabinetes y aéreos en 3D con imantación automática, trazado de tuberías MEP y detección de interferencias.</p>
            <div className="mt-auto flex items-center gap-2 text-blue-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Abrir Cocinas <ArrowRight size={13} />
            </div>
          </div>

          {/* Closet Card */}
          <div 
            onClick={() => onNavigate('closet')}
            className="group relative bg-zinc-900 border border-orange-500/60 rounded-2xl p-6 hover:border-orange-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25 ring-1 ring-orange-500/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/25"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-orange-500/40 mb-4 z-10 relative">
              <Box size={28} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Clóset Modular</h2>
            <div className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-orange-500/30">Modular 3D • Herrajes • Optimización</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Configurador paramétrico modular. Ajusta dimensiones, materiales, divisiones internas, cajones, repisas y herrajes de ensamble.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Iniciar Diseño <ArrowRight size={13} />
            </div>
          </div>

          {/* Office Furniture Configurator Card (Mobiliario de Oficina y Plantas PDF) */}
          <div 
            onClick={() => onNavigate('office')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-orange-500/5 hover:shadow-orange-500/15"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-orange-500/40 mb-4 z-10 relative">
              <Briefcase size={28} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Mobiliario de Oficina</h2>
            <div className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-orange-500/30">Plano PDF • 2D / 3D • Ergonomía</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Carga planos de arquitectura en PDF o imagen, calibra la escala métrica y amuebla oficinas operativas, gerenciales y salas de reunión en 2D y 3D.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar Oficinas <ArrowRight size={13} />
            </div>
          </div>

          {/* Chair Configurator Card (Sillas Abet Laminati & Fierro) */}
          <div 
            onClick={() => onNavigate('chair')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-orange-500/5 hover:shadow-orange-500/15"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-orange-500/40 mb-4 z-10 relative">
              <Armchair size={28} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Configurador de Sillas</h2>
            <div className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-orange-500/30">Terciado Curvo • Abet Laminati • Fierro</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Personaliza respaldos y asientos en terciado curvo con HPL Abet Laminati (130x305 cm), cantos multilaminares vistos y patas de fierro esmaltadas al horno.</p>
            <div className="mt-auto flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar Sillas <ArrowRight size={13} />
            </div>
          </div>

          {/* Special Furniture Card */}
          <div 
            onClick={() => onNavigate('special')}
            className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-amber-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-amber-500/20 mb-4 z-10 relative">
              <Sparkles size={28} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Muebles Especiales</h2>
            <div className="inline-block px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-amber-500/30">Abet & Madera</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Aparador vitrina individual de autor con fondo decorativo exclusivo, marco de madera y patas de acero.</p>
            <div className="mt-auto flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar <ArrowRight size={13} />
            </div>
          </div>

          {/* HPL Bathroom Partitions Card */}
          <div 
            onClick={() => onNavigate('hpl-bathroom')}
            className="group relative bg-zinc-900 border border-teal-500/40 rounded-2xl p-6 hover:border-teal-400 transition-all cursor-pointer overflow-hidden flex flex-col items-start min-h-[340px] shadow-lg shadow-teal-500/5 hover:shadow-teal-500/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-teal-500/20"></div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-teal-500/20 mb-4 z-10 relative">
              <Shield size={28} className="text-teal-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1.5 z-10 relative text-white">Separador Baños HPL</h2>
            <div className="inline-block px-2.5 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-widest rounded mb-2.5 z-10 relative border border-teal-500/30">Abet Laminati & JNF</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-5 z-10 relative">Cabinas fenólicas 10/12/15/19mm, patas y bisagras JNF Inox/PVD, optimización de cortes Nesting 2D y recinto cerámico 60x60.</p>
            <div className="mt-auto flex items-center gap-2 text-teal-400 font-bold uppercase text-xs tracking-wider group-hover:gap-3 transition-all z-10 relative">
              Configurar Baños <ArrowRight size={13} />
            </div>
          </div>
        </div>
      </main>

      {/* Superadmin Modals */}
      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          setIsBackofficeOpen(true);
        }}
      />

      <AdminBackofficeModal
        isOpen={isBackofficeOpen}
        onClose={() => setIsBackofficeOpen(false)}
        onNavigateToModule={onNavigate}
      />
    </div>
  );
}
