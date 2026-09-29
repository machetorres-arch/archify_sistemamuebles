import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  Check,
  X,
  Layers,
  Wrench,
  Home,
  Trees,
  ShieldAlert,
  HelpCircle,
  Save,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { useAdminStore, SupplyItem, SupplyCategory } from '../../store/adminStore';

export function SuppliesPriceTab() {
  const { supplies, updateSupplyPrice, updateSupply, addSupply, deleteSupply, resetSuppliesToDefault } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | SupplyCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal para agregar nuevo insumo / material
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<SupplyCategory>('cubiertas_qstone');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [newUnit, setNewUnit] = useState('m²');
  const [newPrice, setNewPrice] = useState<number>(180000);
  const [newSupplier, setNewSupplier] = useState('Qstone Chile');
  const [newNotes, setNewNotes] = useState('');

  const categories: { id: 'all' | SupplyCategory; label: string; icon: any }[] = [
    { id: 'all', label: 'Todos los Insumos', icon: Filter },
    { id: 'solid_surface_hpl', label: '🏥 Krion / Corian & HPL', icon: Sparkles },
    { id: 'acero_perfiles', label: 'Perfiles Acero FE', icon: Wrench },
    { id: 'melamina', label: 'MDF & Melaminas', icon: Layers },
    { id: 'herrajes', label: 'Herrajes & Quincallería', icon: Wrench },
    { id: 'cubiertas_qstone', label: 'Cubiertas Qstone', icon: Sparkles },
    { id: 'fijaciones_sellantes', label: 'Fijaciones & Sellos', icon: DollarSign },
  ];

  const filteredSupplies = supplies.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.spec.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleStartEdit = (item: SupplyItem) => {
    setEditingId(item.id);
    setEditPrice(item.priceClp);
    setEditSupplier(item.supplier);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    updateSupply(id, {
      priceClp: Number(editPrice),
      supplier: editSupplier.trim(),
      notes: editNotes.trim(),
    });
    setEditingId(null);
    showToast('Precio y especificación actualizados correctamente.');
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer todos los precios y costos de insumos a valores predeterminados de fábrica?')) {
      resetSuppliesToDefault();
      showToast('Precios de fábrica restaurados.');
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`¿Eliminar el insumo "${name}" del catálogo?`)) {
      deleteSupply(id);
      showToast(`Insumo "${name}" eliminado.`);
    }
  };

  const handleCreateSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      alert('Por favor ingrese al menos el nombre y código del insumo.');
      return;
    }

    addSupply({
      category: newCategory,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      spec: newSpec.trim() || 'Especificación estándar de taller',
      unit: newUnit.trim() || 'Unid.',
      priceClp: Math.max(0, Number(newPrice)),
      supplier: newSupplier.trim() || 'Proveedor General',
      notes: newNotes.trim()
    });

    setIsAddModalOpen(false);
    // Limpiar campos
    setNewName('');
    setNewCode('');
    setNewSpec('');
    setNewPrice(180000);
    setNewNotes('');
    showToast(`Material "${newName}" agregado al catálogo con éxito.`);
  };

  const getCategoryBadge = (cat: SupplyCategory) => {
    switch (cat) {
      case 'solid_surface_hpl':
        return <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold uppercase">🏥 Krion / HPL</span>;
      case 'acero_perfiles':
        return <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded text-[9px] font-bold uppercase">Acero FE 30x50</span>;
      case 'cubiertas_qstone':
        return <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold uppercase">Cubiertas Qstone</span>;
      case 'melamina':
        return <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[9px] font-bold uppercase">Melaminas</span>;
      case 'herrajes':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold uppercase">Herrajes</span>;
      case 'madera':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase">Madera</span>;
      case 'fijaciones_sellantes':
        return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[9px] font-bold uppercase">Fijaciones/Sellos</span>;
      default:
        return <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[9px] font-bold uppercase">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedback && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start justify-between gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <DollarSign size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">Impacto en Presupuestos y Cubicaciones</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Cualquier cambio de costo unitario impacta inmediatamente en las estimaciones de costo, planillas Excel de fabricación y reportes técnicos de todos los módulos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setNewCategory('cubiertas_qstone');
              setNewUnit('m²');
              setNewSupplier('Qstone Chile');
              setIsAddModalOpen(true);
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Agregar nuevo material de cubierta o insumo"
          >
            <Plus size={13} /> Agregar Insumo / Material
          </button>
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Restaurar precios iniciales"
          >
            <RotateCcw size={13} /> Restaurar Fábrica
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre de insumo, proveedor o especificación..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-900'
                }`}
              >
                <Icon size={13} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Código & Insumo</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Especificación Técnica</th>
                <th className="p-3.5">Unidad</th>
                <th className="p-3.5">Proveedor</th>
                <th className="p-3.5 text-right">Precio Unitario (CLP)</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredSupplies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No se encontraron insumos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSupplies.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Name & Code */}
                      <td className="p-3.5 pl-4 font-semibold text-white">
                        <div className="font-mono text-[10px] text-orange-400 font-bold">{item.code}</div>
                        <div className="text-xs text-slate-200">{item.name}</div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">{getCategoryBadge(item.category)}</td>

                      {/* Spec */}
                      <td className="p-3.5 text-slate-400 text-[11px] max-w-xs">{item.spec}</td>

                      {/* Unit */}
                      <td className="p-3.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">{item.unit}</td>

                      {/* Supplier */}
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSupplier}
                            onChange={(e) => setEditSupplier(e.target.value)}
                            className="p-1 bg-zinc-950 border border-orange-500 rounded text-xs text-white w-full"
                          />
                        ) : (
                          item.supplier
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="p-1 w-28 bg-zinc-950 border border-orange-500 rounded text-xs text-right text-orange-400 font-bold"
                            />
                          </div>
                        ) : (
                          <span className="text-white text-sm">
                            ${item.priceClp.toLocaleString('es-CL')} <span className="text-[10px] text-zinc-500">CLP</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                              title="Guardar precio"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-zinc-800 text-slate-400 hover:bg-zinc-700 rounded-lg"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="px-2.5 py-1 bg-zinc-800/80 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-zinc-700/60 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 size={12} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Eliminar insumo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Agregar Insumo / Material */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nuevo Insumo o Cubierta</h3>
                  <p className="text-[11px] text-zinc-400">Incorpora materiales de marmolería Qstone, herrajes o tableros con costo unitario</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSupply} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      const cat = e.target.value as SupplyCategory;
                      setNewCategory(cat);
                      if (cat === 'solid_surface_hpl') {
                        setNewUnit('Plancha');
                        setNewSupplier('Krion Porcelanosa / Corian Dupont / Lamitech');
                        setNewPrice(320000);
                      } else if (cat === 'acero_perfiles') {
                        setNewUnit('Barra (6m)');
                        setNewSupplier('Barraca Fierro / Cintac');
                        setNewPrice(24500);
                      } else if (cat === 'cubiertas_qstone') {
                        setNewUnit('m²');
                        setNewSupplier('Qstone Chile');
                        setNewPrice(180000);
                      } else if (cat === 'melamina') {
                        setNewUnit('Plancha (4.46 m²)');
                        setNewSupplier('Arauco / Masisa');
                        setNewPrice(54900);
                      } else {
                        setNewUnit('Unid.');
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="solid_surface_hpl">🏥 Krion / Corian & HPL Compacto (Hospitalario)</option>
                    <option value="acero_perfiles">Perfiles de Acero FE (Bastidor Sanitario)</option>
                    <option value="cubiertas_qstone">Cubiertas Qstone (Cuarzo / Sinterizado)</option>
                    <option value="melamina">Melaminas & MDF Tableros</option>
                    <option value="herrajes">Herrajes & Quincallería</option>
                    <option value="madera">Madera & Enchapados</option>
                    <option value="fijaciones_sellantes">Fijaciones & Sellos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Código SKU / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: QS-CUA-CALACAT-20"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre del Insumo / Material
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Qstone Cuarzo Calacatta Gold 20mm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Precio Unitario ($ CLP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="m², Plancha, Metro Lineal, Unid."
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Qstone Chile"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Especificación Técnica / Formato
                </label>
                <input
                  type="text"
                  placeholder="Ej: Formato 3.20 x 1.60 m, espesor 20mm, acabado pulido brillante"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Notas de Taller / Criterio de Montaje
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Para cubiertas sinterizadas de 12mm requiere base de melamina completa 18mm como soporte continuo."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Save size={14} /> Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
