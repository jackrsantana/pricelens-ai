import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMarkets, useMutateMarket, useDeleteMarket } from '../../hooks/useQueries';
import { Market } from '../../types';
import { APP_CONFIG } from '../../config/app';
import { Store, Plus, Edit, Trash2, Save, X, Sparkles, Loader2 } from 'lucide-react';

interface MarketsManagerProps {
  logAction?: (action: string, details: string) => void;
  markets?: Market[];
}

function MarketsManager({ logAction, markets: propMarkets }: MarketsManagerProps) {
  const { data: queryMarkets = [], isLoading } = useMarkets({ 
    
    enabled: !propMarkets 
  });
  const markets = propMarkets !== undefined ? propMarkets : queryMarkets;
  const mutateMarket = useMutateMarket();
  const deleteMarket = useDeleteMarket();

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [marketForm, setMarketForm] = useState<Partial<Market>>({ id: '', name: '', address: '', cityId: 'sao-gotardo' });
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };

  const handleOpenMarketModal = (m?: Market) => {
    if (m) {
      setMarketForm(m);
      setEditingMarketId(m.id);
    } else {
      setMarketForm({ id: `m-custom-${Date.now()}`, name: '', address: '', cityId: 'sao-gotardo' });
      setEditingMarketId(null);
    }
    setIsMarketModalOpen(true);
  };

  const handleSaveMarket = async () => {
    if (!marketForm.name) {
      showError('Nome fantasia do estabelecimento é um campo obrigatório.');
      return;
    }
    try {
      const targetId = marketForm.id || `m-custom-${Date.now()}`;
      const payload = { 
        ...marketForm, 
        id: targetId, 
        cityId: 'sao-gotardo' 
      } as Market;
      
      await mutateMarket.mutateAsync({ id: targetId, payload });
      if (logAction) {
        logAction(editingMarketId ? 'MARKET_UPDATE' : 'MARKET_CREATE', `Administrador ${editingMarketId ? 'atualizou' : 'criou'} estabelecimento ${payload.name}`);
      }
      showSuccess(`Estabelecimento "${payload.name}" gravado com sucesso!`);
      setIsMarketModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar estabelecimento: ${err.message}`);
    }
  };

  const handleDeleteMarket = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o estabelecimento "${name}"? Esta ação removerá o cadastro do estabelecimento do sistema.`)) {
      try {
        await deleteMarket.mutateAsync(id);
        if (logAction) {
          logAction('MARKET_DELETE', `Administrador removeu estabelecimento ${name}`);
        }
        showSuccess(`Estabelecimento "${name}" removido.`);
      } catch (err: any) {
        showError(`Erro ao excluir estabelecimento: ${err.message}`);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium animate-fade-in">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium animate-fade-in">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Cadastro de Estabelecimentos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Gerenciamento de redes de supermercado de {APP_CONFIG.defaultCity}</p>
        </div>
        <button 
          onClick={() => handleOpenMarketModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Estabelecimento
        </button>
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
                <th className="px-4 py-2.5 font-bold">Nome do Estabelecimento</th>
                <th className="px-4 py-2.5 font-bold">Endereço</th>
                <th className="px-4 py-2.5 font-bold">Cidade</th>
                <th className="px-4 py-2.5 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {markets.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                  <td className="px-4 py-3">{m.address}</td>
                  <td className="px-4 py-3 uppercase text-[10px] text-slate-500">{m.cityId}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenMarketModal(m)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMarket(m.id, m.name)}
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

      {/* Modal for Market Add/Edit */}
      <AnimatePresence>
        {isMarketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto border border-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {editingMarketId ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
                </h4>
                <button onClick={() => setIsMarketModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Side: Identificação & Comercial */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Informações Principais</h5>
                  
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Nome Fantasia *</label>
                    <input 
                      type="text" 
                      required
                      value={marketForm.name || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                      placeholder="Ex: Supermercado Popular"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Razão Social (Opcional)</label>
                    <input 
                      type="text" 
                      value={marketForm.companyName || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, companyName: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                      placeholder="Ex: popular LTDA"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">CNPJ (Opcional)</label>
                      <input 
                        type="text" 
                        value={marketForm.cnpj || ''}
                        onChange={(e) => setMarketForm({ ...marketForm, cnpj: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-semibold text-slate-700"
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Tipo Comercial</label>
                      <select 
                        value={marketForm.marketType || 'Supermercado'}
                        onChange={(e) => setMarketForm({ ...marketForm, marketType: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                      >
                        <option value="Supermercado">Supermercado</option>
                        <option value="Atacarejo">Atacarejo</option>
                        <option value="Mercearia">Mercearia</option>
                        <option value="Hortifruti">Hortifruti</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Telefone</label>
                      <input 
                        type="text" 
                        value={marketForm.phone || ''}
                        onChange={(e) => setMarketForm({ ...marketForm, phone: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-semibold text-slate-700"
                        placeholder="(34) 3671-0000"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">WhatsApp</label>
                      <input 
                        type="text" 
                        value={marketForm.whatsapp || ''}
                        onChange={(e) => setMarketForm({ ...marketForm, whatsapp: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-semibold text-slate-700"
                        placeholder="(34) 99999-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Logotipo / URL da Imagem</label>
                    <input 
                      type="text" 
                      value={marketForm.logoUrl || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, logoUrl: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-medium text-slate-600"
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                </div>

                {/* Right Side: Localização & Controle Interno */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Localização & Funcionamento</h5>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={marketForm.address || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                      placeholder={`Ex: Av. Rui Barbosa, 120, Centro, ${APP_CONFIG.defaultCity}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Bairro</label>
                      <input 
                        type="text" 
                        value={marketForm.neighborhood || ''}
                        onChange={(e) => setMarketForm({ ...marketForm, neighborhood: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                        placeholder="Ex: Centro"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Ponto de Referência</label>
                      <input 
                        type="text" 
                        value={marketForm.referencePoint || ''}
                        onChange={(e) => setMarketForm({ ...marketForm, referencePoint: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-bold text-slate-700"
                        placeholder="Ex: Próximo à Matriz"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Horário de Funcionamento</label>
                    <input 
                      type="text" 
                      value={marketForm.businessHours || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, businessHours: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-semibold text-slate-700"
                      placeholder="Ex: Seg a Sáb: 07:00 às 20:00, Dom: 07:00 às 12:00"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Diferenciais do Estabelecimento</label>
                    <input 
                      type="text" 
                      value={marketForm.differentials || ''}
                      onChange={(e) => setMarketForm({ ...marketForm, differentials: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none font-semibold text-slate-700"
                      placeholder="Ex: Estacionamento coberto, Clube de vantagens"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-indigo-950 uppercase font-mono">Status Operacional</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={marketForm.isActive !== false}
                        onChange={(e) => setMarketForm({ ...marketForm, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-[10px] font-extrabold text-indigo-900 uppercase">
                        {marketForm.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => setIsMarketModalOpen(false)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveMarket} 
                  disabled={mutateMarket.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {mutateMarket.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(MarketsManager);
