import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Flame,
  FileCode,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Search,
  Sliders,
  DollarSign,
  PieChart,
  ArrowRight,
  Download,
  ShieldCheck,
  Building
} from 'lucide-react';

interface MaterialAnalyticsSheetProps {
  onPrescribePackage?: (packageName: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function MaterialAnalyticsSheet({ onPrescribePackage, onNavigateToTab }: MaterialAnalyticsSheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tableros' | 'cubiertas' | 'electrodomesticos' | 'herrajes' | 'interiores'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const materialsData = [
    {
      id: 'mat-1',
      name: 'Cuarzo Blanco Calacatta 20mm',
      sku: 'QC-CAL-20',
      format: 'Plancha Jumbo 3200 × 1600 mm',
      category: 'cubiertas',
      categoryLabel: 'Cubiertas Cuarzo',
      badge: 'QC',
      volumen: '3.820 m²',
      proc: 'Waterjet Directo',
      merma: '8,4%',
      mermaType: 'secondary',
      cocinas: '245 cocinas',
      share: '24,8% elección'
    },
    {
      id: 'mat-2',
      name: 'Dekton Laurent 12mm',
      sku: 'DL-LAU-12',
      format: 'Piedra Sinterizada Ultracompacta',
      category: 'cubiertas',
      categoryLabel: 'Cubiertas Sinterizadas',
      badge: 'DL',
      volumen: '2.940 m²',
      proc: 'Disco Diamantado CNC',
      merma: '6,1%',
      mermaType: 'primary',
      cocinas: '180 cocinas',
      share: '19,2% elección'
    },
    {
      id: 'mat-3',
      name: 'Cubierta HPL Roble Poro Sincronizado',
      sku: 'HPL-ROB-38',
      format: 'Espesor 38mm Postformado',
      category: 'cubiertas',
      categoryLabel: 'Cubiertas HPL',
      badge: 'HP',
      volumen: '1.850 m²',
      proc: 'Seccionadora Lineal',
      merma: '5,4%',
      mermaType: 'tertiary',
      cocinas: '160 cocinas',
      share: '12,1% elección'
    },
    {
      id: 'mat-4',
      name: 'Melamina Vesto Roble Cendra 18mm',
      sku: 'ARA-CEN-18',
      format: 'Arauco • Plancha 2500 × 1830 mm',
      category: 'tableros',
      categoryLabel: 'Frentes & Cascos',
      badge: 'RC',
      volumen: '6.210 m²',
      proc: 'Nesting CNC Homag',
      merma: '7,8%',
      mermaType: 'secondary',
      cocinas: '380 cocinas',
      share: '35,4% elección'
    },
    {
      id: 'mat-5',
      name: 'Laca Gris Grafito Mate Sedoso 22mm',
      sku: 'LAC-GG-22',
      format: 'MDF Hidrófugo Revestido',
      category: 'tableros',
      categoryLabel: 'Frentes Premium',
      badge: 'GG',
      volumen: '4.120 m²',
      proc: 'Cabina Presurizada',
      merma: '8,9%',
      mermaType: 'neutral',
      cocinas: '210 cocinas',
      share: '18,6% elección'
    },
    {
      id: 'mat-6',
      name: 'Encimera Inducción 60cm Flex',
      sku: 'EL-IND-60',
      format: '7.4 kW • 4 Zonas • Encastre Ras',
      category: 'electrodomesticos',
      categoryLabel: 'Electrodoméstico',
      badge: 'IN',
      volumen: '312 unidades',
      proc: 'Render 3D Activo',
      merma: 'Calado CNC Preciso',
      mermaType: 'tertiary',
      cocinas: '312 cocinas',
      share: '96% integración'
    },
    {
      id: 'mat-7',
      name: 'Horno Eléctrico Pirolítico 60cm',
      sku: 'EL-HOR-60',
      format: '71L • Torre / Bajo Cubierta',
      category: 'electrodomesticos',
      categoryLabel: 'Electrodoméstico',
      badge: 'HO',
      volumen: '280 unidades',
      proc: 'Render 3D Activo',
      merma: 'Nicho Estándar 595mm',
      mermaType: 'neutral',
      cocinas: '280 cocinas',
      share: '89% especificación'
    },
    {
      id: 'mat-8',
      name: 'Refrigerador Bottom Freezer Integrable 310L',
      sku: 'EL-REF-310',
      format: 'Nicho 1780 × 560 × 550 mm',
      category: 'electrodomesticos',
      categoryLabel: 'Electrodoméstico',
      badge: 'RF',
      volumen: '198 unidades',
      proc: 'A++ Inverter',
      merma: 'Puerta Pantógrafo',
      mermaType: 'neutral',
      cocinas: '198 cocinas',
      share: '62% integración'
    },
    {
      id: 'mat-9',
      name: 'Microondas Empotrable Inox 25L',
      sku: 'EL-MIC-25',
      format: 'Grill 1000W • Encastre Aéreo',
      category: 'electrodomesticos',
      categoryLabel: 'Electrodoméstico',
      badge: 'MO',
      volumen: '240 unidades',
      proc: 'Render 3D Activo',
      merma: 'Mueble 380mm',
      mermaType: 'neutral',
      cocinas: '240 cocinas',
      share: '76% integración'
    },
    {
      id: 'mat-10',
      name: 'Perfil Gola Negro Mate Anodizado',
      sku: 'DUC-GOL-01',
      format: 'Aluminio extruido 4.10m',
      category: 'herrajes',
      categoryLabel: 'Herrajes & Golas',
      badge: 'GL',
      volumen: '5.920 ml',
      proc: 'Corte Ingletadora CNC',
      merma: '4,2%',
      mermaType: 'primary',
      cocinas: '290 cocinas',
      share: '48% adopción'
    }
  ];

  const filteredMaterials = materialsData.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.format.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExportDxf = () => {
    alert('Exportando plan consolidado de nesting y cortes CNC en formato .DXF para taller Quilicura.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-extrabold uppercase tracking-wider text-orange-400">Taller & Prescripción Técnica</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 font-medium">Hub Central Santiago (Quilicura / San Joaquín)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Analítica de Materiales, Cubiertas & Electrodomésticos
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl mt-0.5">
            Monitoreo en tiempo real de m² prescritos, cubicación en configurador 3D, nesting CNC de tableros y optimización de corte waterjet en piedra sinterizada y cuarzo técnico.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Cpu size={16} className="text-amber-400" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Algoritmo Nesting</span>
              <span className="text-xs font-bold text-amber-400">KitchOpt v4.2 Activo</span>
            </div>
          </div>

          <button
            onClick={handleExportDxf}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar Plan de Corte (.DXF)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Top Cubierta Prescrita</span>
            <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono">
              38% Cuota
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-sm font-bold text-white truncate">Cuarzo Blanco Stellar</h4>
            <p className="text-xs text-zinc-400">Silestone® España • Formato Jumbo</p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-orange-400 font-mono">4.180</span>
              <span className="text-xs text-zinc-400">m² proyectados</span>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold">8,6% merma</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Eficiencia Waterjet CNC</span>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono">
              Ahorro Activo
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-sm font-bold text-white truncate">Corte Piedra Sinterizada</h4>
            <p className="text-xs text-zinc-400">Optimización Waterjet 5 Ejes</p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400 font-mono">7,4%</span>
              <span className="text-xs text-zinc-400">vs 14,2% manual</span>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold">-$38.4M CLP</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Líder Encastre 3D</span>
            <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono">
              Render Hook
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-sm font-bold text-white truncate">Inducción 4Z Flex Bosch</h4>
            <p className="text-xs text-zinc-400">Serie 6 • Encastre al ras / biselado</p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-sky-400 font-mono">342</span>
              <span className="text-xs text-zinc-400">unidades 3D</span>
            </div>
            <span className="text-xs text-zinc-300 font-medium">96% ensamble</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aprovechamiento Tableros</span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono">
              91,8% Útil
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-sm font-bold text-white truncate">Planchas 2.50 × 1.83 m</h4>
            <p className="text-xs text-zinc-400">Plantas Quilicura & San Joaquín</p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-400 font-mono">8,2%</span>
              <span className="text-xs text-zinc-400">merma neta</span>
            </div>
            <span className="text-xs text-zinc-300 font-mono">12.450 m²</span>
          </div>
        </div>
      </div>

      {/* Quick Filter Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 p-2 border border-zinc-800 rounded-2xl">
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { key: 'all', label: 'Todos', count: 112 },
            { key: 'tableros', label: 'Tableros & Melaminas', count: 38 },
            { key: 'cubiertas', label: 'Cubiertas: Cuarzo, Sinterizadas & HPL', count: 26 },
            { key: 'electrodomesticos', label: 'Electrodomésticos Empotrados', count: 24 },
            { key: 'herrajes', label: 'Herrajes & Golas', count: 18 },
            { key: 'interiores', label: 'Interiores & Módulos', count: 6 }
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === cat.key ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl shrink-0">
          <Search size={14} className="text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar material o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none w-44"
          />
        </div>
      </div>

      {/* Main Layout Grid: Master Table (Left) + Wastage Breakdown Sidebar (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 8-Column: Master Data Table */}
        <div className="xl:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-orange-500" />
              Tabla Maestra de Especificación y Rendimiento ({filteredMaterials.length})
            </h3>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-400" /> Sincronizado Nesting CNC
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-400 uppercase tracking-wider bg-zinc-950/60 text-[10px] font-bold">
                  <th className="py-2.5 px-3 rounded-l-lg">Material / SKU Técnico</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Volumen / Unidades</th>
                  <th className="py-2.5 px-3 text-center">Merma / Eficiencia</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Cocinas / Tasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-orange-400 shrink-0">
                          {mat.badge}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{mat.name}</div>
                          <div className="text-[11px] font-mono text-zinc-400">{mat.format}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                        {mat.categoryLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-bold text-white">{mat.volumen}</div>
                      <div className="text-[10px] text-zinc-500">{mat.proc}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold text-[11px]">
                        {mat.merma}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono text-zinc-200 font-medium">{mat.cocinas}</div>
                      <div className="text-[10px] text-orange-400 font-semibold">{mat.share}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4-Column: Wastage Breakdown & Nesting Gauge */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart size={18} className="text-amber-400" />
                  Distribución de Mermas
                </h3>
                <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
                  Nesting CNC
                </span>
              </div>
              <p className="text-xs text-zinc-400 my-3">
                Pérdida promedio de sustrato en corte optimizado por software industrial según material:
              </p>

              <div className="space-y-3 text-xs">
                {/* Melamina 18mm */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-200 font-medium">Melamina 18mm (Arauco/Masisa)</span>
                    <span className="text-orange-400 font-mono font-bold">8,2% merma</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '8.2%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>Aprovechamiento: 91,8%</span>
                    <span>Taller Quilicura</span>
                  </div>
                </div>

                {/* Cubierta Cuarzo */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-200 font-medium">Cubierta Cuarzo (Waterjet CNC)</span>
                    <span className="text-amber-400 font-mono font-bold">8,6% merma</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '8.6%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>Aprovechamiento: 91,4%</span>
                    <span>Corte a chorro de agua</span>
                  </div>
                </div>

                {/* Piedra Sinterizada */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-200 font-medium">Piedra Sinterizada (Dekton)</span>
                    <span className="text-sky-400 font-mono font-bold">6,1% merma</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 rounded-full" style={{ width: '6.1%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>Aprovechamiento: 93,9%</span>
                    <span>Diamantado 5 Ejes</span>
                  </div>
                </div>

                {/* Cubierta HPL */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-200 font-medium">Cubierta HPL Postformada 38mm</span>
                    <span className="text-emerald-400 font-mono font-bold">5,4% merma</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '5.4%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>Aprovechamiento: 94,6%</span>
                    <span>Seccionadora Horizontal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gauge Result */}
            <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="92.9, 100"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[9px] font-black text-white font-mono">92.9%</span>
              </div>
              <div className="text-xs">
                <div className="text-[10px] text-zinc-400 uppercase font-bold">Rendimiento Promedio Global</div>
                <div className="font-bold text-white">Alto Aprovechamiento de Tableros</div>
                <div className="text-[11px] text-emerald-400 font-medium">Estándar ISO 14001 Taller Quilicura</div>
              </div>
            </div>
          </div>

          {/* Alerta de Retazo */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Alerta de Retazo & Economía Circular</span>
            </div>
            <h4 className="text-sm font-bold text-white">14 Retazos Útiles Dekton Laurent (&gt;1.2 m²)</h4>
            <p className="text-xs text-zinc-400">
              Disponibles en patio de corte San Joaquín para frentes de islas o respaldos antisalpicadura (Backsplashes).
            </p>
          </div>
        </div>
      </div>

      {/* Full-Width Section: Co-ocurrencia y Paquetes de Cocina Completa */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-orange-500" />
            Co-ocurrencia y Paquetes de Cocina Completa
          </h3>
          <p className="text-xs text-zinc-400">
            Combinaciones de alta afinidad registradas por el motor 3D en proyectos inmobiliarios y residenciales del Gran Santiago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pack 1 */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-orange-500/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sector Oriente • Las Condes</span>
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] font-bold font-mono">
                  82% Afinidad
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Pack Urbano Contemporáneo</h4>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-orange-400 shrink-0" />
                  <span><strong>Frentes:</strong> Melamina Gris Grafito 22mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-orange-400 shrink-0" />
                  <span><strong>Cubierta:</strong> Cuarzo Blanco Stellar 20mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-orange-400 shrink-0" />
                  <span><strong>Electro:</strong> Horno + Microondas Bosch Empotrados</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Costo Estimado</div>
                <div className="text-xs font-mono font-bold text-white">142 UF / Proyecto</div>
              </div>
              <button
                onClick={() => onPrescribePackage?.('Urbano Contemporáneo')}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Prescribir Pack
              </button>
            </div>
          </div>

          {/* Pack 2 */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Alta Gama • Lo Barnechea</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold font-mono">
                  74% Afinidad
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Pack Neoclásico Cálido</h4>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  <span><strong>Frentes:</strong> Melamina Roble Vesto 18mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  <span><strong>Cubierta:</strong> Piedra Sinterizada Calacatta 12mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  <span><strong>Electro:</strong> Inducción 4Z + Campana Oculta 90cm</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Costo Estimado</div>
                <div className="text-xs font-mono font-bold text-white">188 UF / Proyecto</div>
              </div>
              <button
                onClick={() => onPrescribePackage?.('Neoclásico Cálido')}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Prescribir Pack
              </button>
            </div>
          </div>

          {/* Pack 3 */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-sky-500/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Multifamily • Santiago & Ñuñoa</span>
                <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded text-[10px] font-bold font-mono">
                  65% Afinidad
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Pack Renting & Inversionista</h4>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-sky-400 shrink-0" />
                  <span><strong>Frentes:</strong> Melamina Blanca Hidrófuga 15mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-sky-400 shrink-0" />
                  <span><strong>Cubierta:</strong> HPL Antibacterial 38mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-sky-400 shrink-0" />
                  <span><strong>Electro:</strong> Combo Horno + Campana Teka Inox</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Costo Estimado</div>
                <div className="text-xs font-mono font-bold text-white">68 UF / Proyecto</div>
              </div>
              <button
                onClick={() => onPrescribePackage?.('Renting & Inversionista')}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-sky-500 hover:text-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Prescribir Pack
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
