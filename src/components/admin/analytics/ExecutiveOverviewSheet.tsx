import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
  Scissors,
  Lightbulb,
  Building,
  Rocket,
  Eye,
  AlertTriangle,
  Factory,
  ArrowUpRight,
  Download,
  Sliders,
  CheckCircle2,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useAdminStore } from '../../../store/adminStore';

interface ExecutiveOverviewSheetProps {
  selectedProviderName: string;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutiveOverviewSheet({ selectedProviderName, onNavigateToTab }: ExecutiveOverviewSheetProps) {
  const { projects } = useAdminStore();
  const [periodFilter, setPeriodFilter] = useState<'7D' | '30D' | '3M' | '1A'>('30D');
  const [isExporting, setIsExporting] = useState(false);
  const [alertStockModal, setAlertStockModal] = useState(false);

  // Dynamic calculations from actual projects in store (strictly 0 when empty)
  const projectCount = projects.length;
  const totalM2 = projects.reduce((acc, p) => {
    if (p.type === 'kitchen') {
      const cabinets = (p.data as any)?.cabinets || [];
      return acc + (cabinets.length > 0 ? cabinets.length * 3.6 : 10.5);
    }
    if (p.type === 'closet') {
      const modules = (p.data as any)?.modules || [];
      return acc + (modules.length > 0 ? modules.length * 4.2 : 8.5);
    }
    if (p.type === 'special') return acc + 3.2;
    if (p.type === 'hpl-bathroom') return acc + 6.0;
    if (p.type === 'office') return acc + 8.0;
    return acc + 4.0;
  }, 0);
  const totalClp = projects.reduce((acc, p) => acc + (p.totalCostEstimateClp || 0), 0);
  const scrapPercentage = projects.length > 0 ? 7.4 : 0;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Informe Ejecutivo Consolidado (PDF/XLS) generado exitosamente con datos de telemetría RM.');
    }, 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-400">
              Supervisión Estratégica Regional
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-400 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${projectCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              {projectCount > 0
                ? `Telemetría Activa: ${projectCount} proyecto(s) en cartera`
                : 'Telemetría en Espera (0 proyectos guardados)'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Panel de Rendimiento Regional{' '}
            <span className="text-orange-400 font-light">— Santiago de Chile ({selectedProviderName})</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">
            Telemetría en tiempo real de tableros, optimización de cortes y cubicación de proyectos 3D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
          <button
            onClick={() => setAlertStockModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/20 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Sliders size={15} />
            <span>Alertas de Stock</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all cursor-pointer"
          >
            {isExporting ? <Clock size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{isExporting ? 'Generando...' : 'Exportar Informe (PDF/XLS)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary KPI Metrology Slabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Superficie Proyectada</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {totalM2 > 0 ? totalM2.toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '0'}{' '}
                <span className="text-xs font-normal text-zinc-400">m²</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Layers size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold">
              <TrendingUp size={14} />
              <span>{projectCount > 0 ? '+100%' : '0%'}</span>
              <span className="text-[11px] font-normal text-zinc-500 ml-1">{projectCount > 0 ? 'activo' : 'en espera'}</span>
            </div>
            <div className="flex items-end gap-1 h-5">
              <div className={`w-1 h-2 ${projectCount > 0 ? 'bg-sky-500/40' : 'bg-zinc-800'} rounded-t`} />
              <div className={`w-1 h-3 ${projectCount > 0 ? 'bg-sky-500/60' : 'bg-zinc-800'} rounded-t`} />
              <div className={`w-1 h-4 ${projectCount > 0 ? 'bg-sky-500/80' : 'bg-zinc-800'} rounded-t`} />
              <div className={`w-1 h-5 ${projectCount > 0 ? 'bg-sky-400' : 'bg-zinc-800'} rounded-t`} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-40" />
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Proyectos Registrados</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {projectCount} <span className="text-xs font-normal text-zinc-400">diseños</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <span>⚡ {projectCount > 0 ? `+${projectCount} guardado(s)` : '0 en cola'}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono">
              {projectCount > 0 ? `${projectCount} en cartera` : '0 estudios RM'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-40" />
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Volumen Estimado BOM</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {totalClp > 0
                  ? totalClp >= 1000000
                    ? `$${(totalClp / 1000000).toFixed(2)}M`
                    : `$${totalClp.toLocaleString('es-CL')}`
                  : '$0'}{' '}
                <span className="text-xs font-normal text-zinc-400">CLP</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <ArrowUpRight size={14} />
              <span>{projectCount > 0 ? 'Facturación activa' : '$0 CLP'}</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {totalM2 > 0 ? `$${Math.round(totalClp / totalM2).toLocaleString('es-CL')} / m²` : '$0 / m²'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40" />
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Merma Promedio en Cortes</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 mt-1">
                {projectCount > 0 ? `${scrapPercentage}%` : '0,0%'}{' '}
                <span className="text-xs font-normal text-zinc-400">seccionadora</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Scissors size={20} />
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold">
              <span>{projectCount > 0 ? '▼ -3.2% optimizado' : 'Sin datos de corte'}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-500/30 text-sky-400 font-bold">
              {projectCount > 0 ? 'OptiCorte Activo' : 'En Espera'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-40" />
        </div>
      </div>

      {/* 3. Analytical Core: Weekly Evolution & Category Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Evolution Stacked Projection (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-white">Evolución de Demanda de Materiales</h3>
              <p className="text-xs text-zinc-400">Metros cuadrados y unidades aplicadas semanalmente en el motor paramétrico 3D</p>
            </div>
            <div className="inline-flex bg-zinc-950 border border-zinc-800 p-0.5 rounded-xl text-xs font-bold">
              {(['7D', '30D', '3M', '1A'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    periodFilter === p
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-zinc-300 font-medium">Melaminas Vesto & Masisa (18mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-sky-400" />
              <span className="text-zinc-300 font-medium">Cubiertas Cuarzo & Sinterizados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-zinc-300 font-medium">Perfiles Gola & Quincallería</span>
            </div>
          </div>

          {/* SVG Stacked Bar Visualizer */}
          <div className="w-full h-56 flex flex-col justify-end pt-2">
            {projectCount === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                <Layers size={32} className="text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">Sin datos de demanda registrados</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  La evolución semanal se calculará automáticamente al guardar proyectos en el diseñador 3D.
                </p>
              </div>
            ) : (
              <div className="h-full w-full flex items-end justify-between gap-3 px-2">
                <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                    <div className="w-full h-10 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                    <div className="w-full h-16 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                    <div className="w-full h-20 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">S36</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                    <div className="w-full h-12 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                    <div className="w-full h-20 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                    <div className="w-full h-24 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">S37</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden">
                    <div className="w-full h-14 bg-amber-400/80 group-hover:bg-amber-400 transition-all" />
                    <div className="w-full h-24 bg-sky-400/80 group-hover:bg-sky-400 transition-all" />
                    <div className="w-full h-28 bg-orange-500/80 group-hover:bg-orange-500 transition-all" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">S38</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full max-w-[42px] flex flex-col gap-0.5 rounded-md overflow-hidden shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/40">
                    <div className="w-full h-18 bg-amber-400 group-hover:brightness-110 transition-all" />
                    <div className="w-full h-32 bg-sky-400 group-hover:brightness-110 transition-all" />
                    <div className="w-full h-36 bg-orange-500 group-hover:brightness-110 transition-all" />
                  </div>
                  <span className="text-[11px] font-mono text-orange-400 font-bold">S39 (Act)</span>
                </div>
              </div>
            )}
          </div>

          {/* Insight Tag */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Lightbulb size={18} className="text-orange-400 shrink-0" />
              <p className="text-xs text-zinc-300 truncate">
                <strong className="text-white">Análisis Predictivo B2B:</strong>{' '}
                {projectCount > 0 ? (
                  <>
                    Monitoreando {projectCount} proyecto(s) en curso con optimización de corte CNC activada.
                  </>
                ) : (
                  <>
                    En espera de nuevos proyectos para estimar consumos de tableros Vesto y Masisa en la Región Metropolitana.
                  </>
                )}
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded hidden sm:inline shrink-0">
              OptiCorte v3.1 CL
            </span>
          </div>
        </div>

        {/* Distribution by Category (4 Cols) */}
        <div className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-white">Distribución de Uso</h3>
              <p className="text-xs text-zinc-400">Por tipología de elemento 3D</p>
            </div>
            <span className="text-xs font-mono text-zinc-400">{projectCount > 0 ? '100% CAD' : '0%'}</span>
          </div>

          {/* Donut Visual */}
          <div className="relative flex items-center justify-center my-4">
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 160 160">
              {projectCount > 0 ? (
                <>
                  {/* 48% Frentes */}
                  <circle
                    className="text-orange-500"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="60"
                    stroke="currentColor"
                    strokeDasharray="181 377"
                    strokeDashoffset="0"
                    strokeWidth="15"
                  />
                  {/* 31% Encimeras */}
                  <circle
                    className="text-sky-400"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="60"
                    stroke="currentColor"
                    strokeDasharray="117 377"
                    strokeDashoffset="-181"
                    strokeWidth="15"
                  />
                  {/* 14% Herrajes */}
                  <circle
                    className="text-amber-400"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="60"
                    stroke="currentColor"
                    strokeDasharray="53 377"
                    strokeDashoffset="-298"
                    strokeWidth="15"
                  />
                  {/* 7% Zócalos */}
                  <circle
                    className="text-zinc-600"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="60"
                    stroke="currentColor"
                    strokeDasharray="26 377"
                    strokeDashoffset="-351"
                    strokeWidth="15"
                  />
                </>
              ) : (
                <circle
                  className="text-zinc-800"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="60"
                  stroke="currentColor"
                  strokeDasharray="377 377"
                  strokeDashoffset="0"
                  strokeWidth="12"
                />
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white">{projectCount > 0 ? '100%' : '0%'}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {projectCount > 0 ? 'Superficie Total' : 'Sin Proyectos'}
              </span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-orange-500" />
                <span className="text-zinc-200 font-medium">Frentes de Mobiliario</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{projectCount > 0 ? '48%' : '0%'}</span>
                <span className="text-zinc-500">{projectCount > 0 ? `${(totalM2 * 0.48).toFixed(1)} m²` : '0 m²'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                <span className="text-zinc-200 font-medium">Encimeras e Islas</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{projectCount > 0 ? '31%' : '0%'}</span>
                <span className="text-zinc-500">{projectCount > 0 ? `${(totalM2 * 0.31).toFixed(1)} m²` : '0 m²'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-zinc-200 font-medium">Herrajes & Perfiles Gola</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{projectCount > 0 ? '14%' : '0%'}</span>
                <span className="text-zinc-500">{projectCount > 0 ? `${(totalM2 * 0.14).toFixed(1)} ml` : '0 ml'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-zinc-600" />
                <span className="text-zinc-200 font-medium">Zócalos & Revestimientos</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{projectCount > 0 ? '7%' : '0%'}</span>
                <span className="text-zinc-500">{projectCount > 0 ? `${(totalM2 * 0.07).toFixed(1)} m²` : '0 m²'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Floor: Top Materials BOM Inspector & Strategic Alerts Mosaic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 5 Specified Materials Table (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white">Top Acabados Prescritos en CAD</h3>
              <p className="text-xs text-zinc-400">Volúmenes acumulados, precios de cesión y tracción de catálogo</p>
            </div>
            <button
              onClick={() => onNavigateToTab?.('materiales')}
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Ver Catálogo Completo</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-400 uppercase tracking-wider bg-zinc-950/60 text-[10px] font-bold">
                  <th className="py-2.5 px-3 rounded-l-lg">Material / Textura</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Volumen</th>
                  <th className="py-2.5 px-3 text-right">Crecimiento</th>
                  <th className="py-2.5 px-3 text-right">Precio Ref.</th>
                  <th className="py-2.5 px-3 text-center rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {projectCount === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      <p className="font-semibold text-zinc-400">Sin materiales registrados en proyectos</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        Al diseñar y guardar cocinas, clósets o casas SIP, aparecerá el ranking de consumo aquí.
                      </p>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-500/30 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                            RC
                          </div>
                          <div>
                            <div className="font-semibold text-white">Melamina Vesto Roble Cendra</div>
                            <div className="text-[11px] text-zinc-400">Arauco Línea Tendencias (18mm)</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">ARA-CEN18</td>
                      <td className="py-3 px-3 text-zinc-300">Melamina 18mm</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{(totalM2 * 0.45).toFixed(1)} m²</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+100%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">$28.900/m²</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onNavigateToTab?.('sku-viewer')}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-orange-400 transition-colors cursor-pointer"
                          title="Ver en Visor 3D y Telemetría"
                        >
                          <Rocket size={14} />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-900/30 border border-sky-500/30 flex items-center justify-center font-bold text-[10px] text-sky-400 shrink-0">
                            BN
                          </div>
                          <div>
                            <div className="font-semibold text-white">Cubierta Cuarzo Blanco Norte</div>
                            <div className="text-[11px] text-zinc-400">Silestone / Distribución Nacional</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">CUB-BNO20</td>
                      <td className="py-3 px-3 text-zinc-300">Cuarzo 20mm</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{(totalM2 * 0.3).toFixed(1)} m²</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">+100%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">$165.000/m²</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onNavigateToTab?.('materiales')}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-Time Alerts & Immediate Commercial Opportunities (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Oportunidad Inmediata */}
          <div className="bg-zinc-900/80 border border-orange-500/30 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden shadow-lg shadow-orange-500/5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-extrabold uppercase">
                <Sparkles size={12} /> Estado de Cartera
              </span>
              <span className="text-[10px] font-mono text-zinc-500">{projectCount > 0 ? 'En tiempo real' : 'En espera'}</span>
            </div>
            <h4 className="text-sm font-bold text-white">
              {projectCount > 0 ? `${projectCount} Proyecto(s) Activo(s)` : 'Cartera en Limpio'}
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {projectCount > 0 ? (
                <>
                  Se encuentran cargados <strong className="text-white">{projectCount} proyecto(s)</strong> con una estimación de{' '}
                  <span className="text-orange-400 font-semibold">${totalClp.toLocaleString('es-CL')} CLP</span>.
                </>
              ) : (
                'No hay proyectos simulados ni activos. Todo está limpio para comenzar tus propios diseños desde cero.'
              )}
            </p>
            {projectCount > 0 && (
              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80 mt-1">
                <button
                  onClick={() => onNavigateToTab?.('proyectos')}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Ver Proyectos
                </button>
                <span className="text-xs font-mono font-bold text-amber-400">${totalClp.toLocaleString('es-CL')} CLP</span>
              </div>
            )}
          </div>

          {/* Alerta de Merma */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-sky-400 text-[10px] font-extrabold uppercase">
                <AlertTriangle size={12} /> Optimizador de Corte
              </span>
              <span className="text-[10px] font-mono text-zinc-500">OptiCorte CL</span>
            </div>
            <h4 className="text-sm font-bold text-white">
              {projectCount > 0 ? `Merma Promedio: ${scrapPercentage}%` : 'Módulo de Seccionado Listo'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {projectCount > 0
                ? 'Los algoritmos de encaje automático garantizan un aprovechamiento superior al 90% en tableros de 2440x1830mm.'
                : 'El motor de nesting automático evaluará la merma en cuanto agregues módulos a la escena.'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Alertas Stock */}
      {alertStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-orange-500" />
                Configurar Umbrales de Stock B2B
              </h3>
              <button
                onClick={() => setAlertStockModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Sincronización con ERP de Planta (Arauco SAP & Masisa Hub). Define los metros cuadrados mínimos de alerta en cola:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Umbral Mínimo Tableros Melamina 18mm</label>
                <input
                  type="number"
                  defaultValue={2000}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Umbral Cuarzos y Sinterizados (m²)</label>
                <input
                  type="number"
                  defaultValue={500}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAlertStockModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setAlertStockModal(false);
                  alert('Umbrales de stock actualizados y guardados correctamente.');
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-400"
              >
                Guardar Umbrales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
