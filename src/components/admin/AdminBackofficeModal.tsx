import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FolderKanban,
  DollarSign,
  Palette,
  LogOut,
  X,
  Sparkles,
  BarChart3,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  Building,
  Database,
  Cloud,
  Users,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useTenantDataStore } from '../../store/tenantDataStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ProjectsManagerTab } from './ProjectsManagerTab';
import { SuppliesPriceTab } from './SuppliesPriceTab';
import { TexturesManagerTab } from './TexturesManagerTab';
import { UsersAndProvidersTab } from './UsersAndProvidersTab';
import { ProviderAnalyticsTab } from './ProviderAnalyticsTab';
import { ManufacturingRatesTab } from './ManufacturingRatesTab';
import { Wrench } from 'lucide-react';

interface AdminBackofficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToModule: (route: 'kitchen' | 'closet' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => void;
}

export function AdminBackofficeModal({
  isOpen,
  onClose,
  onNavigateToModule,
}: AdminBackofficeModalProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'supplies' | 'textures' | 'users' | 'analytics' | 'manufacturing'>('projects');
  const { adminEmail, logout: localLogout, projects, supplies, textures, themeMode, toggleThemeMode } = useAdminStore();
  const { user: supabaseUser, tenant: supabaseTenant, logout: supabaseLogout } = useSupabaseAuthStore();
  const { fetchTenantData, materials, hardware, projects: cloudProjects } = useTenantDataStore();
  const isCloud = isSupabaseConfigured();

  const isLight = themeMode === 'light';
  const pendingTexturesCount = textures.filter((t) => t.approvalStatus === 'pending').length;

  useEffect(() => {
    if (isOpen && isCloud && supabaseUser?.tenant_id) {
      fetchTenantData();
    }
  }, [isOpen, isCloud, supabaseUser?.tenant_id]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (isCloud) {
      await supabaseLogout();
    }
    localLogout();
    onClose();
  };

  const handleLoadProject = (route: 'kitchen' | 'closet' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => {
    onClose();
    onNavigateToModule(route);
  };

  const totalProjectsValue = projects.reduce(
    (acc, p) => acc + (p.totalCostEstimateClp || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div
        className={`relative w-full max-w-7xl h-[94vh] border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-zinc-950 border-zinc-800 text-slate-200'
        }`}
      >
        {/* Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Modal Header */}
        <header
          className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-4 relative z-10 shrink-0 ${
            isLight ? 'bg-white/90 border-zinc-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bellota text-2xl font-bold lowercase text-orange-500 tracking-tight select-none">
                    arquify
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-bold tracking-tight uppercase ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    Backoffice
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded">
                  {supabaseUser?.role || 'Superadmin'}
                </span>
                {isCloud && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    <Cloud size={10} /> Supabase RLS
                  </span>
                )}
              </div>
              <p
                className={`text-xs flex items-center gap-2 mt-0.5 ${
                  isLight ? 'text-zinc-600' : 'text-slate-400'
                }`}
              >
                {supabaseTenant?.name ? (
                  <span className="text-orange-500 font-semibold flex items-center gap-1">
                    <Building size={12} /> {supabaseTenant.name}
                  </span>
                ) : (
                  'Portal de Proveedores, Liquidaciones, Catálogo 3D con VB y Precios'
                )}
              </p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            {/* Toggle Claro / Oscuro */}
            <button
              onClick={toggleThemeMode}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-zinc-200 hover:bg-zinc-300 border-zinc-300 text-zinc-800'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-amber-400'
              }`}
              title={`Cambiar a modo ${isLight ? 'oscuro' : 'claro'}`}
            >
              {isLight ? (
                <>
                  <Moon size={15} className="text-zinc-700" />
                  <span className="text-[11px] hidden sm:inline">Oscuro</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span className="text-[11px] hidden sm:inline">Claro</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                {supabaseTenant?.name ? 'Proveedor / Usuario' : 'Sesión Activa'}
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  isLight ? 'text-zinc-800' : 'text-slate-300'
                }`}
              >
                {supabaseUser?.email || adminEmail || 'marcelo@robfu.cl'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-zinc-800/80 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/30 text-slate-300 hover:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-zinc-600 hover:bg-zinc-200' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Quick KPI Bar */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs shrink-0 ${
            isLight ? 'bg-zinc-200/70 border-zinc-300' : 'bg-zinc-900/50 border-zinc-800/80'
          }`}
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={15} className="text-orange-500" />
              <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Proyectos Guardados:</span>
              <strong className={isLight ? 'text-zinc-900 font-mono' : 'text-white font-mono'}>{projects.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-500" />
              <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Insumos Registrados:</span>
              <strong className={isLight ? 'text-zinc-900 font-mono' : 'text-white font-mono'}>{supplies.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-sky-500" />
              <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Texturas Activas:</span>
              <strong className={isLight ? 'text-zinc-900 font-mono' : 'text-white font-mono'}>{textures.filter((t) => t.active).length}</strong>
            </div>
            {pendingTexturesCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-500 rounded-full font-bold animate-pulse">
                <Clock size={12} />
                <span>{pendingTexturesCount} pendientes de VB</span>
              </div>
            )}
          </div>

          <div className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Valor Estimado Cartera:{' '}
            <strong className="text-orange-500 font-mono text-xs">
              ${totalProjectsValue.toLocaleString('es-CL')} CLP
            </strong>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`px-5 pt-3 border-b flex items-center gap-2 shrink-0 overflow-x-auto ${
            isLight ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'projects'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <FolderKanban size={15} />
            Gestor de Proyectos ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'supplies'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <DollarSign size={15} />
            Tabla de Precios e Insumos ({supplies.length})
          </button>

          <button
            onClick={() => setActiveTab('textures')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'textures'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <Palette size={15} />
            Gestor de Texturas & Decorativos ({textures.length})
            {pendingTexturesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-extrabold rounded-full">
                {pendingTexturesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <BarChart3 size={15} />
            Estadísticas Proveedor
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <Users size={15} />
            Usuarios & Proveedores
          </button>

          <button
            onClick={() => setActiveTab('manufacturing')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'manufacturing'
                ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                : isLight
                ? 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-900/50'
            }`}
          >
            <Wrench size={15} />
            Tarifas B2B & Manufactura
          </button>
        </div>

        {/* Main Content Area */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
            isLight ? 'bg-zinc-50' : 'bg-zinc-950/80'
          }`}
        >
          {activeTab === 'projects' && (
            <ProjectsManagerTab onLoadProjectToModule={handleLoadProject} />
          )}
          {activeTab === 'supplies' && <SuppliesPriceTab />}
          {activeTab === 'textures' && <TexturesManagerTab />}
          {activeTab === 'analytics' && <ProviderAnalyticsTab />}
          {activeTab === 'users' && <UsersAndProvidersTab />}
          {activeTab === 'manufacturing' && <ManufacturingRatesTab />}
        </div>
      </div>
    </div>
  );
}
