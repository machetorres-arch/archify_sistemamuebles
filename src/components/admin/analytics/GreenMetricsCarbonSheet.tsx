import React, { useState } from 'react';
import {
  Leaf,
  ShieldCheck,
  TrendingDown,
  Truck,
  RotateCcw,
  Zap,
  Award,
  Navigation,
  CheckCircle,
  Download,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  MapPin
} from 'lucide-react';

export function GreenMetricsCarbonSheet() {
  const [selectedComuna, setSelectedComuna] = useState<'las_condes' | 'lo_barnechea' | 'vitacura' | 'chicureo' | 'providencia'>('chicureo');
  const [isExporting, setIsExporting] = useState(false);

  const comunaData = {
    las_condes: { name: 'Las Condes (San Carlos / El Golf)', km: 28, co2: 3.1, opt: '-18%', barWidth: '42%' },
    lo_barnechea: { name: 'Lo Barnechea (La Dehesa)', km: 36, co2: 4.2, opt: '-15%', barWidth: '55%' },
    vitacura: { name: 'Vitacura (Santa María de Manquehue)', km: 24, co2: 2.7, opt: '-22%', barWidth: '36%' },
    chicureo: { name: 'Colina / Chicureo (Piedra Roja)', km: 22, co2: 2.3, opt: '-28%', barWidth: '32%' },
    providencia: { name: 'Providencia / Ñuñoa', km: 19, co2: 2.0, opt: '-25%', barWidth: '28%' }
  };

  const currentComuna = comunaData[selectedComuna];

  const handleExportLEED = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Certificado LEED & Reporte Scope 1-3 generado exitosamente en formato PDF.');
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Protocolo GHG • Scopes 1, 2 & 3
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span className="text-zinc-400 text-xs">Auditoría DIN EN ISO 14064-1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Huella de Carbono & Indicadores Verdes (ESG){' '}
            <span className="text-emerald-400 font-light">— Trazabilidad RM</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">
            Monitoreo de emisiones Scope 1, 2 y 3 basado en origen de insumos (Arauco Biobío, Cosentino Pto. San Antonio, Masisa Concepción), talleres de corte CNC en Quilicura/Huechuraba y comunas de despacho final.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportLEED}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ShieldCheck size={16} />
            <span>{isExporting ? 'Generando LEED...' : 'Exportar LEED Cocinas (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Bloque 1: Tarjetas KPIs de Impacto Ambiental */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Emisiones Totales</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                14,8 <span className="text-xs font-normal text-zinc-400">tCO₂e</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Leaf size={20} />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800/80 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <TrendingDown size={14} /> -22,4% vs benchmark
              </span>
              <span className="text-zinc-400 font-mono">28,4 kg / cocina</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '77.6%' }} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
              <span className="uppercase font-bold">Auditoría Scope 3</span>
              <span className="text-emerald-400 font-medium">Verificado TÜV Rheinland</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Merma de Corte Evitada</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                1.420 <span className="text-xs font-normal text-zinc-400">kg</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw size={20} />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800/80 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-medium">Algoritmo Nesting CNC</span>
              <span className="text-zinc-400 font-mono">48 árboles equiv.</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: '86%' }} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
              <span className="uppercase font-bold">Aprovechamiento</span>
              <span className="text-amber-400 font-bold font-mono">92,1% en tableros</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Despacho Logístico RM</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                38,2 <span className="text-xs font-normal text-zinc-400">km prom.</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Truck size={20} />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800/80 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-400 font-medium">Última milla eléctrica</span>
              <span className="text-zinc-400 font-mono">0,18 kg/km</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full" style={{ width: '64%' }} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
              <span className="uppercase font-bold">Hub Quilicura → Obra</span>
              <span className="text-sky-400 font-medium">100% Rutas Optimizadas</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Circularidad & Reciclaje</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                84,6 <span className="text-xs font-normal text-zinc-400">%</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Award size={20} />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800/80 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-400 font-medium">BOM Desarmable</span>
              <span className="text-zinc-400 font-mono">+14% vs 2023</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full" style={{ width: '84.6%' }} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
              <span className="uppercase font-bold">Cradle-to-Cradle</span>
              <span className="text-orange-400 font-medium">Planchas FSC/PEFC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque 2: Diagrama de Flujo Logístico & Trazabilidad */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Life-Cycle Tectonic Map */}
        <div className="xl:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Trazabilidad de Cadena de Suministro</span>
              <h3 className="text-base font-bold text-white">Ciclo de Vida Logístico: Origen → Taller Quilicura → Entrega RM</h3>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300 font-medium">Telemetría GPS & Carga Activa</span>
            </div>
          </div>

          {/* Route Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tramo 1 */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold text-[10px]">Tramo 01</span>
                  <span className="font-mono text-zinc-400">480 km</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">Origen Insumos</h4>
                <p className="text-xs text-zinc-400">Arauco Biobío & Cosentino (Pto. San Antonio)</p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Emisión Tramo:</span>
                  <span className="font-mono font-bold text-white">5,2 tCO₂e</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Impacto total:</span>
                  <span className="text-orange-400 font-bold">35% de la huella</span>
                </div>
              </div>
            </div>

            {/* Tramo 2 */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px]">Tramo 02</span>
                  <span className="font-mono text-emerald-400 font-bold">0% Fósil</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">Corte & Enchape CNC</h4>
                <p className="text-xs text-zinc-400">Taller Matriz Quilicura & Huechuraba</p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Energía Taller:</span>
                  <span className="text-emerald-400 font-bold">100% Renovable</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Pérdida neta:</span>
                  <span className="text-amber-400 font-bold font-mono">7,9% Merma</span>
                </div>
              </div>
            </div>

            {/* Tramo 3 */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold text-[10px]">Tramo 03</span>
                  <span className="font-mono text-zinc-400">42 km prom.</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">Despacho Última Milla</h4>
                <p className="text-xs text-zinc-400">Instalación en Domicilio RM Final</p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Flota Eléctrica:</span>
                  <span className="font-mono font-bold text-white">1,1 tCO₂e</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Tiempo Tránsito:</span>
                  <span className="text-sky-400 font-bold">Same-Day Slot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scope SVG Breakdown Ring */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#27272a" strokeWidth="10" />
                  {/* Scope 3 62% */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ea580c" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="95.4" />
                  {/* Scope 2 26% */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="185.8" />
                  {/* Scope 1 12% */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38bdf8" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="221" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-extrabold text-white">14.8t</span>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold">Scope Total</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-orange-600" />
                  <span className="text-zinc-300">Scope 3 (Insumos Arauco/Cosentino): <strong className="text-white font-mono">62%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span className="text-zinc-300">Scope 2 (Energía Taller CNC Quilicura): <strong className="text-white font-mono">26%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                  <span className="text-zinc-300">Scope 1 (Despacho Última Milla RM): <strong className="text-white font-mono">12%</strong></span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1 text-zinc-400 max-w-xs">
              <div className="text-white font-bold flex items-center gap-1">
                <Navigation size={13} className="text-emerald-400" />
                Ruta Optimizada Activa
              </div>
              <p className="text-[11px]">
                Troncal Costanera Norte → Autopista Nororiente evita congestión central reduciendo 3,4 kg CO₂ por flete.
              </p>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Interactive Communa Simulator */}
        <div className="xl:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Simulador de Impacto</span>
                <h3 className="text-base font-bold text-white">Huella por Comuna de Destino</h3>
              </div>
              <MapPin size={18} className="text-emerald-400" />
            </div>
            <p className="text-xs text-zinc-400 my-2">
              Selecciona la comuna de instalación para evaluar la huella incremental desde el taller en Quilicura vs transporte despiezado (Flat-Pack).
            </p>

            <div className="space-y-1.5 mt-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">Comuna de Entrega:</label>
              <select
                value={selectedComuna}
                onChange={(e) => setSelectedComuna(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="las_condes">Las Condes (San Carlos / El Golf)</option>
                <option value="lo_barnechea">Lo Barnechea (La Dehesa)</option>
                <option value="vitacura">Vitacura (Santa María de Manquehue)</option>
                <option value="chicureo">Colina / Chicureo (Piedra Roja)</option>
                <option value="providencia">Providencia / Ñuñoa</option>
              </select>
            </div>

            {/* Communa Realtime Gauge Card */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mt-3 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Distancia Taller → Obra:</span>
                <span className="font-mono font-bold text-white text-sm">{currentComuna.km},0 km</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Emisión Despacho Van EV:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{currentComuna.co2} kg CO₂e</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Ahorro con Flat-Pack:</span>
                <span className="font-bold text-amber-400">{currentComuna.opt} vs Armado</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: currentComuna.barWidth }} />
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Acreditaciones Verdes:</span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium flex items-center gap-1">
                <Leaf size={11} className="text-emerald-400" /> PEFC/16-37-142
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium flex items-center gap-1">
                <ShieldCheck size={11} className="text-amber-400" /> LEED v4 Compliant
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium flex items-center gap-1">
                <Zap size={11} className="text-sky-400" /> Greenguard Gold
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium flex items-center gap-1">
                <Award size={11} className="text-orange-400" /> 100% I-REC Clean Energy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque 3: Matriz Ambiental de Materiales */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Inventario & Ciclo de Vida</span>
            <h3 className="text-base font-bold text-white">Matriz Ambiental de Materiales & Componentes KitchStudio</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">6 familias auditadas DIN EN ISO</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-400 uppercase tracking-wider bg-zinc-950/60 text-[10px] font-bold">
                <th className="py-2.5 px-3 rounded-l-lg">Familia / Material</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3">Origen de Fábrica</th>
                <th className="py-2.5 px-3 font-mono">Merma de Corte %</th>
                <th className="py-2.5 px-3 font-mono">Huella CO₂ eq</th>
                <th className="py-2.5 px-3">Acreditación Verde</th>
                <th className="py-2.5 px-3 rounded-r-lg">Status Circular</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              <tr className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-700" />
                  Melamina Vesto Roble Cendra
                </td>
                <td className="py-3 px-3 text-zinc-400">Tablero Mueble Base</td>
                <td className="py-3 px-3 text-zinc-300">Planta Coronel, Arauco Biobío</td>
                <td className="py-3 px-3 font-mono font-bold text-amber-400">7,4%</td>
                <td className="py-3 px-3 font-mono font-bold text-white">4,2 kg / m²</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    FSC • Carbon Neutral
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">100% Reciclable</span>
                </td>
              </tr>

              <tr className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  Cuarzo Silestone Nolita HybriQ+
                </td>
                <td className="py-3 px-3 text-zinc-400">Cubierta Cocina Isla</td>
                <td className="py-3 px-3 text-zinc-300">Cantoria, Almería / Hub Pudahuel</td>
                <td className="py-3 px-3 font-mono font-bold text-zinc-400">8,8% (Waterjet)</td>
                <td className="py-3 px-3 font-mono font-bold text-white">12,8 kg / m²</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    99% Agua Reciclada
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400 text-[10px]">20% Vidrio Reciclado</span>
                </td>
              </tr>

              <tr className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                  Piedra Sinterizada Dekton Danae
                </td>
                <td className="py-3 px-3 text-zinc-400">Cubierta Ultracompacta</td>
                <td className="py-3 px-3 text-zinc-300">Cosentino Hub Santiago Poniente</td>
                <td className="py-3 px-3 font-mono font-bold text-amber-400">6,2%</td>
                <td className="py-3 px-3 font-mono font-bold text-white">8,9 kg / m²</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    Cradle-to-Grave Neutral
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Reutilización de áridos</span>
                </td>
              </tr>

              <tr className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-900" />
                  Cubierta HPL Postformado
                </td>
                <td className="py-3 px-3 text-zinc-400">Cubierta Laminada</td>
                <td className="py-3 px-3 text-zinc-300">Planta Masisa Concepción</td>
                <td className="py-3 px-3 font-mono font-bold text-emerald-400">5,1%</td>
                <td className="py-3 px-3 font-mono font-bold text-white">3,8 kg / m²</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold text-[10px]">
                    Greenguard Gold
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Núcleo certificado</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
