import React, { useState, useRef, memo } from 'react';
import { useBackups, useFlyers, useOffers, useMarkets, useProducts, useCategories } from '../../hooks/useQueries';
import { db } from '../../lib/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { FirestoreRepository } from '../../services/FirestoreRepository';
import { Backup, Flyer, Offer, Market, CanonicalProduct, Category } from '../../types';
import { Database, Download, Upload, Trash2, Play, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface DatabaseManagerProps {
  flyers?: Flyer[];
  offers?: Offer[];
  markets?: Market[];
  products?: CanonicalProduct[];
  categories?: Category[];
}

function DatabaseManager({ flyers: propFlyers, offers: propOffers, markets: propMarkets, products: propProducts, categories: propCategories }: DatabaseManagerProps) {
  const { data: backups = [], isLoading: loadingBackups, refetch: refetchBackups } = useBackups();
  const { data: queryFlyers = [] } = useFlyers({ 
    
    enabled: !propFlyers 
  });
  const { data: queryOffers = [] } = useOffers({ 
    
    enabled: !propOffers 
  });
  const { data: queryMarkets = [] } = useMarkets({ 
    
    enabled: !propMarkets 
  });
  const { data: queryProducts = [] } = useProducts({ 
    
    enabled: !propProducts 
  });
  const { data: queryCategories = [] } = useCategories({ 
    enabled: !propCategories 
  });

  const flyers = propFlyers !== undefined ? propFlyers : queryFlyers;
  const offers = propOffers !== undefined ? propOffers : queryOffers;
  const markets = propMarkets !== undefined ? propMarkets : queryMarkets;
  const products = propProducts !== undefined ? propProducts : queryProducts;
  const categories = propCategories !== undefined ? propCategories : queryCategories;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBackupActionLoading, setIsBackupActionLoading] = useState(false);

  const [importFileSummary, setImportFileSummary] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };

  const logAction = async (actionType: string, description: string) => {
    await FirestoreRepository.addAuditLog({
      timestamp: new Date().toISOString(),
      user: 'Administrador Principal',
      action: actionType,
      details: description
    });
  };

  const handleExportData = (format: 'SQL' | 'JSON' | 'CSV', partialOnly: boolean) => {
    try {
      let content = '';
      const selectedFlyers = flyers;
      const selectedOffers = partialOnly ? offers.slice(0, 20) : offers;

      if (format === 'JSON') {
        content = JSON.stringify({
          version: '1.2.0',
          exportedAt: new Date().toISOString(),
          scope: partialOnly ? 'Partial' : 'Full',
          flyers: selectedFlyers,
          offers: selectedOffers,
          markets,
          products,
          categories
        }, null, 2);
      } else if (format === 'CSV') {
        const headers = 'id,flyerId,marketId,originalName,price,unit,confidence,status\n';
        const rows = selectedOffers.map(o => 
          `"${o.id}","${o.flyerId}","${o.marketId}","${o.originalName.replace(/"/g, '""')}",${o.price},"${o.unit}",${o.confidence},"${o.status}"`
        ).join('\n');
        content = headers + rows;
      } else if (format === 'SQL') {
        const prefix = `-- Exportado em ${new Date().toISOString()}\n\n`;
        const flyerInserts = selectedFlyers.map(f => 
          `INSERT INTO flyers (id, market_id, city_name, start_date, end_date, status, created_at) VALUES ('${f.id}', '${f.marketId}', '${f.cityName}', '${f.startDate}', '${f.endDate}', '${f.status}', '${f.createdAt}');`
        ).join('\n');
        const offerInserts = selectedOffers.map(o => 
          `INSERT INTO offers (id, flyer_id, market_id, original_name, price, unit, confidence, status) VALUES ('${o.id}', '${o.flyerId}', '${o.marketId}', '${o.originalName.replace(/'/g, "''")}', ${o.price}, '${o.unit}', ${o.confidence}, '${o.status}');`
        ).join('\n');
        content = prefix + flyerInserts + '\n\n' + offerInserts;
      }

      // Trigger browser download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `precointeligente_export_${partialOnly ? 'parcial' : 'completo'}_${Date.now()}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logAction('DB_EXPORT', `Administrador exportou base de dados em formato ${format} (${partialOnly ? 'Parcial' : 'Completa'})`);
      showSuccess(`Exportação ${format} iniciada e salva no computador!`);
    } catch (err: any) {
      showError(`Erro ao exportar banco de dados: ${err.message}`);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackupActionLoading(true);
    try {
      const backupId = `bkp-${Date.now()}`;
      const recordCount = flyers.length + offers.length + markets.length + products.length;
      const bkpData = {
        id: backupId,
        date: new Date().toISOString(),
        size: `${((recordCount * 0.4) / 1024).toFixed(2)} KB`,
        recordCount,
        version: '1.2.0'
      };

      const backupPayload = {
        flyers,
        offers,
        markets,
        products,
        categories
      };

      await FirestoreRepository.createBackup(backupId, bkpData, { payload: JSON.stringify(backupPayload) });
      await refetchBackups();

      logAction('DB_BACKUP_CREATE', `Administrador criou backup completo de código ${backupId}`);
      showSuccess(`Backup completo "${backupId}" gravado no servidor.`);
    } catch (err: any) {
      showError(`Erro ao criar backup: ${err.message}`);
    } finally {
      setIsBackupActionLoading(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (parsed && (parsed.flyers || parsed.offers)) {
            setImportPayload(parsed);
            setImportFileSummary(`Integridade Validada! O backup de versão ${parsed.version || '1.0'} contém: ${parsed.flyers?.length || 0} Folhetos, ${parsed.offers?.length || 0} Ofertas, ${parsed.markets?.length || 0} Mercados.`);
          } else {
            showError("O arquivo de backup selecionado possui estrutura inválida.");
          }
        } catch (err) {
          showError("Falha na decodificação do arquivo JSON de backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPayload) return;
    setIsBackupActionLoading(true);
    try {
      const batch = writeBatch(db);
      Object.entries(importPayload).forEach(([collectionName, docs]) => {
        if (Array.isArray(docs)) {
          docs.forEach((docData: any) => {
            const docId = docData.id;
            if (docId) {
              batch.set(doc(db, collectionName, docId), docData);
            }
          });
        }
      });
      await batch.commit();
      logAction('DB_IMPORT', `Administrador importou backup externo e restaurou dados.`);
      showSuccess("Banco de dados restaurado com sucesso do arquivo de backup!");
      setImportFileSummary(null);
      setImportPayload(null);
    } catch (err: any) {
      showError(`Erro na restauração: ${err.message}`);
    } finally {
      setIsBackupActionLoading(false);
    }
  };

  const handleRestoreBackupFromList = async (bkp: Backup) => {
    if (window.confirm(`Deseja restaurar a aplicação para o estado do backup "${bkp.id}"? Isso substituirá as tabelas atuais!`)) {
      setIsBackupActionLoading(true);
      try {
        const payloadDocData = await FirestoreRepository.getBackupPayload(bkp.id);
        if (payloadDocData) {
          const payload = JSON.parse((payloadDocData as any).payload);
          const batch = writeBatch(db);
          Object.entries(payload).forEach(([collectionName, docs]) => {
            if (collectionName !== 'id' && Array.isArray(docs)) {
              docs.forEach((docData: any) => {
                if (docData.id) {
                  batch.set(doc(db, collectionName, docData.id), docData);
                }
              });
            }
          });
          await batch.commit();
          logAction('DB_RESTORE', `Administrador restaurou backup ${bkp.id}`);
          showSuccess("Backup restaurado com sucesso!");
        } else {
          showError("Dados do backup não encontrados.");
        }
      } catch (err: any) {
        showError(`Erro ao restaurar backup: ${err.message}`);
      } finally {
        setIsBackupActionLoading(false);
      }
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (window.confirm(`Excluir registro de backup "${id}"?`)) {
      setIsBackupActionLoading(true);
      try {
        await deleteDoc(doc(db, 'backups', id));
        await deleteDoc(doc(db, 'backup_payloads', id));
        await refetchBackups();
        logAction('DB_BACKUP_DELETE', `Administrador removeu arquivo de backup "${id}"`);
        showSuccess('Backup removido.');
      } catch (err: any) {
        showError(`Erro ao excluir backup: ${err.message}`);
      } finally {
        setIsBackupActionLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold shadow-sm animate-fade-in">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold shadow-sm animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* Backup actions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Rotinas de Backup</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gere backups completos de segurança das ofertas no Firestore</p>
          </div>
          <button 
            disabled={isBackupActionLoading || loadingBackups}
            onClick={handleCreateBackup}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
          >
            {isBackupActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>Criar Novo Backup</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                <th className="px-4 py-2.5 font-bold">Identificador Backup</th>
                <th className="px-4 py-2.5 font-bold">Data Geração</th>
                <th className="px-4 py-2.5 font-bold">Tamanho</th>
                <th className="px-4 py-2.5 font-bold text-center">Registros</th>
                <th className="px-4 py-2.5 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loadingBackups ? (
                <tr>
                  <td colSpan={5} className="text-center py-6">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : backups.map(bkp => (
                <tr key={bkp.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-slate-900">{bkp.id}</td>
                  <td className="px-4 py-3">{new Date(bkp.date).toLocaleString()}</td>
                  <td className="px-4 py-3">{bkp.size}</td>
                  <td className="px-4 py-3 text-center">{bkp.recordCount}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      onClick={() => handleRestoreBackupFromList(bkp)}
                      disabled={isBackupActionLoading}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer inline-flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Restaurar</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteBackup(bkp.id)}
                      disabled={isBackupActionLoading}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer inline-flex"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingBackups && backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 italic">Nenhum backup gravado até o momento.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import / Export JSON SQL CSV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Exportar Banco de Dados</h3>
          <p className="text-xs text-slate-400">Baixe todo o histórico em múltiplos formatos amigáveis para análise externa.</p>
          
          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold">
              <span>Exportar Base Completa</span>
              <div className="flex gap-1">
                <button onClick={() => handleExportData('JSON', false)} className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>JSON</span>
                </button>
                <button onClick={() => handleExportData('CSV', false)} className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>CSV</span>
                </button>
                <button onClick={() => handleExportData('SQL', false)} className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>SQL</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold">
              <span>Exportar Amostra Parcial (20 registros)</span>
              <div className="flex gap-1">
                <button onClick={() => handleExportData('JSON', true)} className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>JSON</span>
                </button>
                <button onClick={() => handleExportData('CSV', true)} className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Import Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Restaurar de Backup Externo</h3>
          <p className="text-xs text-slate-400">Faça o upload de um arquivo JSON de backup gerado por este sistema para reescrever as tabelas.</p>
          
          <div className="flex gap-3">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef}
              onChange={handleImportFileChange}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isBackupActionLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Selecionar Arquivo Backup</span>
            </button>
          </div>

          {importFileSummary && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3 text-xs font-semibold">
              <p className="text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{importFileSummary}</span>
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setImportFileSummary(null); setImportPayload(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg cursor-pointer font-bold">Cancelar</button>
                <button onClick={handleExecuteImport} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg cursor-pointer hover:bg-amber-700 font-bold">Confirmar & Gravar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(DatabaseManager);
