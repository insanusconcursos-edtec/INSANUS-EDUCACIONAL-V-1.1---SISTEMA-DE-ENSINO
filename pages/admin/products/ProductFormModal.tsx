import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Upload, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TictoProduct, ProductType } from '../../../types/product';
import { createProduct, updateProduct, uploadProductCover } from '../../../services/productService';
import { getPlans } from '../../../services/planService';
import { courseService } from '../../../services/courseService';
import { getSimulatedClasses } from '../../../services/simulatedService';
import { classService } from '../../../services/classService';

interface ProductFormModalProps {
  product: TictoProduct | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductFormModal({ product, onClose, onSave }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(product?.name || '');
  const [tictoId, setTictoId] = useState(product?.tictoId || '');
  const [type, setType] = useState<ProductType>(product?.type || 'COMBO');
  const [accessDays, setAccessDays] = useState(product?.accessDays || 365);
  const [coverUrl, setCoverUrl] = useState(product?.coverUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerms, setSearchTerms] = useState({ plans: '', courses: '', classes: '', simulated: '' });
  const [expanded, setExpanded] = useState({ plans: false, courses: false, classes: false, simulated: false });

  // Linked Resources State
  const [linkedPlans, setLinkedPlans] = useState<string[]>(product?.linkedResources.plans || []);
  const [linkedCourses, setLinkedCourses] = useState<string[]>(product?.linkedResources.onlineCourses || []);
  const [linkedClasses, setLinkedClasses] = useState<string[]>(product?.linkedResources.presentialClasses || []);
  const [linkedSimulated, setLinkedSimulated] = useState<string[]>(product?.linkedResources.simulated || []);

  // Available Resources State
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableSimulated, setAvailableSimulated] = useState<any[]>([]);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [plans, courses, classes, simulated] = await Promise.all([
          getPlans(),
          courseService.getCourses(),
          classService.getClasses(),
          getSimulatedClasses()
        ]);
        setAvailablePlans(plans);
        setAvailableCourses(courses);
        setAvailableClasses(classes);
        setAvailableSimulated(simulated);
      } catch (err) {
        console.error('Failed to load resources:', err);
        setError('Erro ao carregar recursos disponíveis.');
      }
    };
    loadResources();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !tictoId || !type || !accessDays) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    const productData = {
      name,
      tictoId,
      type,
      accessDays,
      coverUrl,
      linkedResources: {
        plans: linkedPlans,
        onlineCourses: linkedCourses,
        presentialClasses: linkedClasses,
        simulated: linkedSimulated
      }
    };

    try {
      if (product?.id) {
        await updateProduct(product.id, productData);
      } else {
        await createProduct(productData);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      setError('Erro ao salvar produto. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const productTypes: ProductType[] = ['COMBO', 'PLANO', 'TURMA_ONLINE', 'CURSO_ISOLADO', 'SIMULADO'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">
            {product ? 'Editar Produto' : 'Novo Produto Ticto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Nome Interno do Produto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Combo Polícia Civil VIP"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  ID do Produto na Ticto *
                </label>
                <input
                  type="text"
                  value={tictoId}
                  onChange={(e) => setTictoId(e.target.value)}
                  placeholder="Ex: 12345"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-red-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Tipo de Produto *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductType)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-red-500"
                  required
                >
                  {productTypes.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Tempo de Acesso (Dias) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={accessDays}
                  onChange={(e) => setAccessDays(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recursos Vinculados</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Selecione os recursos que o aluno terá acesso ao adquirir este produto.
              </p>

              {/* Upload de Capa */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm font-bold text-gray-400">Capa do Produto (474x1000)</label>
                <div className="flex items-center gap-4">
                  {coverUrl && <img src={coverUrl} alt="Capa" className="w-16 h-auto rounded border border-gray-700" />}
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg cursor-pointer transition border border-gray-700 w-fit">
                    {isUploading ? 'Enviando...' : <><Upload size={16} /> {coverUrl ? 'Trocar Capa' : 'Enviar Capa'}</>}
                    <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploading(true);
                        try {
                           const url = await uploadProductCover(file);
                           setCoverUrl(url);
                        } catch(err) { alert('Erro no upload'); }
                        setIsUploading(false);
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Plans */}
                <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden mb-3">
                  <button type="button" onClick={() => setExpanded(prev => ({ ...prev, plans: !prev.plans }))} className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 transition text-sm font-bold text-gray-300">
                    <span>Planos de Estudo ({availablePlans.length})</span>
                    {expanded.plans ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded.plans && (
                    <div className="p-3 flex flex-col gap-3 border-t border-gray-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar plano..." 
                          value={searchTerms.plans}
                          onChange={(e) => setSearchTerms(prev => ({ ...prev, plans: e.target.value.toLowerCase() }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-white text-xs focus:border-red-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {availablePlans.filter(p => (p.title || p.name || '').toLowerCase().includes(searchTerms.plans)).map(plan => (
                          <label key={plan.id} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={linkedPlans.includes(plan.id)}
                              onChange={(e) => {
                                if (e.target.checked) setLinkedPlans([...linkedPlans, plan.id]);
                                else setLinkedPlans(linkedPlans.filter(id => id !== plan.id));
                              }}
                              className="rounded border-gray-600 bg-gray-900 text-red-500 focus:ring-red-500" 
                            />
                            <span className="truncate">{plan.title || plan.name || 'Plano sem nome'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Online Courses */}
                <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden mb-3">
                  <button type="button" onClick={() => setExpanded(prev => ({ ...prev, courses: !prev.courses }))} className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 transition text-sm font-bold text-gray-300">
                    <span>Cursos Online ({availableCourses.length})</span>
                    {expanded.courses ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded.courses && (
                    <div className="p-3 flex flex-col gap-3 border-t border-gray-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar curso..." 
                          value={searchTerms.courses}
                          onChange={(e) => setSearchTerms(prev => ({ ...prev, courses: e.target.value.toLowerCase() }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-white text-xs focus:border-red-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {availableCourses.filter(p => (p.title || p.name || '').toLowerCase().includes(searchTerms.courses)).map(course => (
                          <label key={course.id} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={linkedCourses.includes(course.id)}
                              onChange={(e) => {
                                if (e.target.checked) setLinkedCourses([...linkedCourses, course.id]);
                                else setLinkedCourses(linkedCourses.filter(id => id !== course.id));
                              }}
                              className="rounded border-gray-600 bg-gray-900 text-red-500 focus:ring-red-500" 
                            />
                            <span className="truncate">{course.title || course.name || 'Curso sem nome'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Presential Classes */}
                <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden mb-3">
                  <button type="button" onClick={() => setExpanded(prev => ({ ...prev, classes: !prev.classes }))} className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 transition text-sm font-bold text-gray-300">
                    <span>Turmas Presenciais ({availableClasses.length})</span>
                    {expanded.classes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded.classes && (
                    <div className="p-3 flex flex-col gap-3 border-t border-gray-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar turma..." 
                          value={searchTerms.classes}
                          onChange={(e) => setSearchTerms(prev => ({ ...prev, classes: e.target.value.toLowerCase() }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-white text-xs focus:border-red-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {availableClasses.filter(p => (p.title || p.name || '').toLowerCase().includes(searchTerms.classes)).map(cls => (
                          <label key={cls.id} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={linkedClasses.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) setLinkedClasses([...linkedClasses, cls.id]);
                                else setLinkedClasses(linkedClasses.filter(id => id !== cls.id));
                              }}
                              className="rounded border-gray-600 bg-gray-900 text-red-500 focus:ring-red-500" 
                            />
                            <span className="truncate">{cls.title || cls.name || 'Turma sem nome'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Exams */}
                <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden mb-3">
                  <button type="button" onClick={() => setExpanded(prev => ({ ...prev, simulated: !prev.simulated }))} className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 transition text-sm font-bold text-gray-300">
                    <span>Turmas de Simulados ({availableSimulated.length})</span>
                    {expanded.simulated ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded.simulated && (
                    <div className="p-3 flex flex-col gap-3 border-t border-gray-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar simulado..." 
                          value={searchTerms.simulated}
                          onChange={(e) => setSearchTerms(prev => ({ ...prev, simulated: e.target.value.toLowerCase() }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-white text-xs focus:border-red-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {availableSimulated.filter(p => (p.title || p.name || '').toLowerCase().includes(searchTerms.simulated)).map(sim => (
                          <label key={sim.id} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={linkedSimulated.includes(sim.id)}
                              onChange={(e) => {
                                if (e.target.checked) setLinkedSimulated([...linkedSimulated, sim.id]);
                                else setLinkedSimulated(linkedSimulated.filter(id => id !== sim.id));
                              }}
                              className="rounded border-gray-600 bg-gray-900 text-red-500 focus:ring-red-500" 
                            />
                            <span className="truncate">{sim.title || sim.name || 'Simulado sem nome'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>
      </div>
    </div>
  );
}
