import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts, useCategories, useMutateProduct, useDeleteProduct } from '../../hooks/useQueries';
import { CanonicalProduct, Category } from '../../types';
import { Search, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';

interface ProductsManagerProps {
  logAction?: (action: string, details: string) => void;
  products?: CanonicalProduct[];
  categories?: Category[];
}

function ProductsManager({ logAction, products: propProducts, categories: propCategories }: ProductsManagerProps) {
  const { data: queryProducts = [], isLoading } = useProducts({ 
    
    enabled: !propProducts 
  });
  const { data: queryCategories = [] } = useCategories({ 
    enabled: !propCategories 
  });

  const products = propProducts !== undefined ? propProducts : queryProducts;
  const categories = propCategories !== undefined ? propCategories : queryCategories;
  const mutateProduct = useMutateProduct();
  const deleteProduct = useDeleteProduct();

  const [productSearch, setProductSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<CanonicalProduct>>({ id: '', name: '', brand: '', category: 'mercearia', weightVolume: '', unit: 'un' });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
    );
  }, [products, productSearch]);

  const handleOpenProductModal = (p?: CanonicalProduct) => {
    if (p) {
      setProductForm(p);
      setEditingProductId(p.id);
    } else {
      setProductForm({ id: `p-custom-${Date.now()}`, name: '', brand: '', category: 'mercearia', weightVolume: '', unit: 'un' });
      setEditingProductId(null);
    }
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.brand) {
      showError('Nome e Marca são campos obrigatórios.');
      return;
    }
    try {
      const targetId = productForm.id || `p-custom-${Date.now()}`;
      const payload = {
        ...productForm,
        id: targetId
      } as CanonicalProduct;
      
      await mutateProduct.mutateAsync({ id: targetId, payload });
      if (logAction) {
        logAction(editingProductId ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', `Administrador ${editingProductId ? 'atualizou' : 'criou'} produto canônico ${payload.name}`);
      }
      showSuccess(`Produto "${payload.name}" gravado com sucesso!`);
      setIsProdModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar produto: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o produto canônico "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync(id);
        if (logAction) {
          logAction('PRODUCT_DELETE', `Administrador removeu produto canônico ${name}`);
        }
        showSuccess(`Produto "${name}" removido.`);
      } catch (err: any) {
        showError(`Erro ao excluir: ${err.message}`);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Dicionário de Produtos Canônicos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Normalização inteligente que agrupa variações textuais sob um único código de barra virtual</p>
        </div>
        <button 
          onClick={() => handleOpenProductModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input 
          type="text" 
          placeholder="Pesquisar por nome do produto canônico, marca ou seção..." 
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                <th className="px-4 py-2.5 font-bold">Nome Normalizado</th>
                <th className="px-4 py-2.5 font-bold">Marca</th>
                <th className="px-4 py-2.5 font-bold">Seção / Categoria</th>
                <th className="px-4 py-2.5 font-bold">Volume / Peso</th>
                <th className="px-4 py-2.5 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3">{p.brand}</td>
                  <td className="px-4 py-3 uppercase text-[10px] text-slate-500">{p.category}</td>
                  <td className="px-4 py-3">{p.weightVolume}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenProductModal(p)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Product Add/Edit */}
      <AnimatePresence>
        {isProdModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">
                  {editingProductId ? 'Editar Produto Canônico' : 'Novo Produto Canônico'}
                </h4>
                <button onClick={() => setIsProdModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Nome Amigável do Produto *</label>
                  <input 
                    type="text" 
                    value={productForm.name || ''}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                    placeholder="Ex: Arroz Integral Tipo 1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Marca *</label>
                  <input 
                    type="text" 
                    value={productForm.brand || ''}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                    placeholder="Ex: Camil"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Categoria/Seção</label>
                  <select 
                    value={productForm.category || 'mercearia'}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Volume/Peso</label>
                    <input 
                      type="text" 
                      value={productForm.weightVolume || ''}
                      onChange={(e) => setProductForm({ ...productForm, weightVolume: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                      placeholder="Ex: 5kg, 900ml"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Unidade Base</label>
                    <input 
                      type="text" 
                      value={productForm.unit || 'un'}
                      onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                      placeholder="Ex: kg, un"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setIsProdModalOpen(false)} 
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct} 
                  disabled={mutateProduct.isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {mutateProduct.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ProductsManager);
