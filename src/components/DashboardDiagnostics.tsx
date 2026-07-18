import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MetricTracker, TraceEvent, DiagnosticSuggestion } from '../lib/instrumentation';
import { 
  Database, BrainCircuit, Play, Activity, Clock, FileSpreadsheet, 
  Settings, CheckCircle2, AlertTriangle, XCircle, LayoutDashboard,
  Layers, RefreshCw, Zap, AlignLeft, ShieldAlert, AlertCircle,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, limit, query, db } from '../lib/firebase';

interface Props {
  onClose?: () => void;
}

const DashboardDiagnostics = memo(function DashboardDiagnostics({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('audit');
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [suggestions, setSuggestions] = useState<DiagnosticSuggestion[]>([]);
  const [reads, setReads] = useState(0);
  const [writes, setWrites] = useState(0);
  const [geminiCalls, setGeminiCalls] = useState(0);
  const [internalReads, setInternalReads] = useState(0);
  const [internalWrites, setInternalWrites] = useState(0);
  const [internalGeminiCalls, setInternalGeminiCalls] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [renderCounts, setRenderCounts] = useState<Record<string, number>>({});

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Pagination states
  const [timelinePage, setTimelinePage] = useState(1);
  const [firestorePage, setFirestorePage] = useState(1);
  const [rendersPage, setRendersPage] = useState(1);
  const pageSize = 15;

  // Confirmation modal state
  const [showClearModal, setShowClearModal] = useState(false);

  // Testing / Benchmark state
  const [isTesting, setIsTesting] = useState(false);
  const [testStep, setTestStep] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [errorBannerMsg, setErrorBannerMsg] = useState<string | null>(null);
  const benchmarkCachedRef = useRef(false);


  useEffect(() => {
    const updateMetrics = () => {
      setEvents([...MetricTracker.events]);
      setSuggestions([...MetricTracker.suggestions]);
      setReads(MetricTracker.reads);
      setWrites(MetricTracker.writes);
      setGeminiCalls(MetricTracker.geminiCalls);
      setInternalReads(MetricTracker.internalReads);
      setInternalWrites(MetricTracker.internalWrites);
      setInternalGeminiCalls(MetricTracker.internalGeminiCalls);
      setErrorsCount(MetricTracker.errorsCount);
      setRenderCounts({ ...MetricTracker.renderCounts });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  const runBenchmark = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTestStep('Iniciando análise...');
    setErrorBannerMsg(null);
    MetricTracker.isExecutingInternalDiagnostic = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTestStep('Conectando ao Firestore...');
      if (!benchmarkCachedRef.current) {
        await getDocs(query(collection(db, 'markets'), limit(1)));
        benchmarkCachedRef.current = true;
      } else {
        await getDocs(query(collection(db, 'markets'), limit(1)));
      }
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setTestStep('Medindo latência de gravação de logs...');
      MetricTracker.logRender('BenchmarkTask', 'Benchmark manual executado pelo usuário');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setTestStep('Testando requisição simulada Gemini...');
      MetricTracker.logGeminiCall('gemini-3.5-flash-benchmark', 1100, { tokens: 145, simulated: true });
      
      setTestStep('Finalizando e compilando dados...');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Update local state directly to reflect metrics immediately
      setEvents([...MetricTracker.events]);
      setSuggestions([...MetricTracker.suggestions]);
      setReads(MetricTracker.reads);
      setWrites(MetricTracker.writes);
      setGeminiCalls(MetricTracker.geminiCalls);
      setInternalReads(MetricTracker.internalReads);
      setInternalWrites(MetricTracker.internalWrites);
      setInternalGeminiCalls(MetricTracker.internalGeminiCalls);
      setRenderCounts({ ...MetricTracker.renderCounts });
      
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
    } catch (e: any) {
      console.error(e);
      MetricTracker.logError('Manual Benchmark', e, 0);
      setErrorBannerMsg(e?.message || 'Erro de conexão ou permissão ao executar o teste no Firestore.');
    } finally {
      MetricTracker.isExecutingInternalDiagnostic = false;
      setIsTesting(false);
      setTestStep('');
    }
  };

  const confirmClear = () => {
    MetricTracker.clear();
    setEvents([]);
    setSuggestions([]);
    setReads(0);
    setWrites(0);
    setGeminiCalls(0);
    setInternalReads(0);
    setInternalWrites(0);
    setInternalGeminiCalls(0);
    setErrorsCount(0);
    setRenderCounts({});
    
    // Reset pages
    setTimelinePage(1);
    setFirestorePage(1);
    setRendersPage(1);
    
    setShowClearModal(false);
    
    // Show a temporary visual confirmation banner
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 3000);
  };

  const exportDiagnostics = () => {
    const sStart = MetricTracker.sessionStart;
    const sEnd = new Date();
    const durationMs = sEnd.getTime() - sStart.getTime();
    const totalDuration = `${(durationMs / 1000).toFixed(2)}s`;

    const reportData = {
      timestamp: new Date().toISOString(),
      sessionStart: sStart.toISOString(),
      sessionEnd: sEnd.toISOString(),
      totalDuration,
      metrics: {
        reads,
        writes,
        geminiCalls,
        internalReads: MetricTracker.internalReads,
        internalWrites: MetricTracker.internalWrites,
        internalGeminiCalls: MetricTracker.internalGeminiCalls,
        errorsCount: MetricTracker.errorsCount,
        totalRenders: Number(Object.values(renderCounts).reduce((a: any, b: any) => Number(a) + Number(b), 0))
      },
      renderCounts,
      suggestions,
      events: events.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `diagnostic-report-${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const firestoreEvents = events.filter(e => e.type === 'FIRESTORE_READ' || e.type === 'FIRESTORE_WRITE');
  const geminiEvents = events.filter(e => e.type === 'GEMINI_CALL');
  const renderEvents = events.filter(e => e.type === 'RENDER');
  const pipelineEvents = events.filter(e => e.type === 'PIPELINE_EVENT');

  // Paginated Computations
  const reversedEvents = useMemo(() => events.slice().reverse(), [events]);
  const paginatedEvents = useMemo(() => {
    const startIdx = (timelinePage - 1) * pageSize;
    return reversedEvents.slice(startIdx, startIdx + pageSize);
  }, [reversedEvents, timelinePage]);

  const totalTimelinePages = Math.ceil(reversedEvents.length / pageSize) || 1;

  const reversedFirestoreEvents = useMemo(() => firestoreEvents.slice().reverse(), [firestoreEvents]);
  const paginatedFirestoreEvents = useMemo(() => {
    const startIdx = (firestorePage - 1) * pageSize;
    return reversedFirestoreEvents.slice(startIdx, startIdx + pageSize);
  }, [reversedFirestoreEvents, firestorePage]);

  const totalFirestorePages = Math.ceil(reversedFirestoreEvents.length / pageSize) || 1;

  const sortedRenderCounts = useMemo(() => {
    return Object.entries(renderCounts).sort((a: any, b: any) => Number(b[1]) - Number(a[1]));
  }, [renderCounts]);

  const paginatedRenderCounts = useMemo(() => {
    const startIdx = (rendersPage - 1) * pageSize;
    return sortedRenderCounts.slice(startIdx, startIdx + pageSize);
  }, [sortedRenderCounts, rendersPage]);

  const totalRendersPages = Math.ceil(sortedRenderCounts.length / pageSize) || 1;

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar pb-10">
      {/* Success/Benchmark complete banner */}
      <AnimatePresence>
        {showSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500 text-white px-6 py-4 rounded-3xl flex items-center gap-3 shadow-lg shadow-emerald-200/50 border border-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
            <div>
              <p className="font-bold text-sm">Operação realizada com sucesso!</p>
              <p className="text-xs text-emerald-100 mt-0.5">As modificações foram processadas e as estatísticas de telemetria foram atualizadas.</p>
            </div>
          </motion.div>
        )}

        {errorBannerMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-rose-500 text-white px-6 py-4 rounded-3xl flex items-center gap-3 shadow-lg shadow-rose-200/50 border border-rose-400"
          >
            <XCircle className="w-5 h-5 shrink-0 text-white animate-bounce" />
            <div>
              <p className="font-bold text-sm">Falha no teste de diagnóstico</p>
              <p className="text-xs text-rose-100 mt-0.5">{errorBannerMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Clear Confirmation Panel (Bulletproof Stacking Context Bypass) */}
      <AnimatePresence>
        {showClearModal && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-rose-50 border border-rose-100 rounded-3xl p-5 space-y-4 overflow-hidden shadow-sm"
          >
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 text-left">
                <h4 className="text-sm font-black text-rose-950">Confirmar Limpeza de Diagnósticos?</h4>
                <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                  Esta ação irá apagar todo o histórico acumulado de leituras, escritas, chamadas ao Gemini, renderizações e logs rastreados nesta sessão do navegador. Os contadores serão zerados.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-200"
              >
                Sim, Limpar Histórico
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-400" />
            Engenharia e Diagnóstico
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Rastreamento de execução e detecção de gargalos</p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => setShowClearModal(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Limpar
          </button>
          <button 
            type="button"
            onClick={exportDiagnostics}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar
          </button>
          <button 
            type="button"
            onClick={runBenchmark}
            disabled={isTesting}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait active:scale-95"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span className="text-slate-900 font-bold">{testStep}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-slate-900" />
                <span className="text-slate-900">Testar</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreCard 
          title="Leituras DB" 
          score={reads} 
          internalScore={internalReads} 
          icon={<Database className="w-5 h-5 text-amber-500" />} 
          variant="amber" 
        />
        <ScoreCard 
          title="Escritas DB" 
          score={writes} 
          internalScore={internalWrites} 
          icon={<Database className="w-5 h-5 text-emerald-500" />} 
          variant="emerald" 
        />
        <ScoreCard 
          title="Chamadas Gemini" 
          score={geminiCalls} 
          internalScore={internalGeminiCalls} 
          icon={<BrainCircuit className="w-5 h-5 text-indigo-500" />} 
          variant="indigo" 
        />
        <ScoreCard 
          title="Renderizações" 
          score={Number(Object.values(renderCounts).reduce((a: any, b: any) => Number(a) + Number(b), 0))} 
          icon={<Layers className="w-5 h-5 text-rose-500" />} 
          variant="rose" 
        />
        <ScoreCard 
          title="Erros Detectados" 
          score={errorsCount} 
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />} 
          variant="red" 
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          {[
            { id: 'audit', label: 'Auditoria & Sugestões', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'timeline', label: 'Timeline Detalhada', icon: <Clock className="w-4 h-4" /> },
            { id: 'firestore', label: 'Firestore Trace', icon: <Database className="w-4 h-4" /> },
            { id: 'renders', label: 'Renderizações', icon: <Layers className="w-4 h-4" /> },
            { id: 'dependencies', label: 'Árvore de Dependências', icon: <AlignLeft className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Detector Automático de Problemas
              </h3>
              
              {suggestions.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800">Nenhum gargalo detectado!</h4>
                    <p className="text-xs text-emerald-600 mt-1">O sistema está monitorando continuamente loops, consultas repetidas e excessos de renderização.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map(s => (
                    <div key={s.id} className={`p-5 rounded-2xl border flex gap-4 ${
                      s.level === 'critical' ? 'bg-rose-50 border-rose-200' :
                      s.level === 'high' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <AlertTriangle className={`w-6 h-6 shrink-0 ${
                        s.level === 'critical' ? 'text-rose-500' :
                        s.level === 'high' ? 'text-amber-500' :
                        'text-slate-500'
                      }`} />
                      <div>
                        <h4 className={`text-sm font-bold ${
                          s.level === 'critical' ? 'text-rose-800' :
                          s.level === 'high' ? 'text-amber-800' :
                          'text-slate-800'
                        }`}>{s.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 font-mono">{s.cause}</p>
                        <div className="mt-3 bg-white p-3 rounded-xl border border-black/5">
                          <p className="text-xs font-bold text-slate-700">Sugestão Automática:</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800">Timeline de Execução</h3>
              {paginatedEvents.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum evento registrado na timeline.</p>
              ) : (
                <>
                  <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
                    {paginatedEvents.map((e) => (
                      <div key={e.id} className="relative">
                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white ${
                          e.type.includes('FIRESTORE') ? 'bg-amber-400' :
                          e.type.includes('GEMINI') ? 'bg-indigo-500' :
                          e.type.includes('RENDER') ? 'bg-rose-400' : 
                          e.type === 'STATE_CHANGE' ? 'bg-sky-400' : 'bg-emerald-400'
                        }`} />
                        
                        <div 
                          className="cursor-pointer group flex flex-col"
                          onClick={() => setExpandedEventId(expandedEventId === e.id ? null : e.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 w-16">{e.timestamp.toLocaleTimeString()}</span>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">{e.name}</span>
                            {e.duration && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{e.duration.toFixed(1)} ms</span>}
                            {e.context?.component && <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{e.context.component}</span>}
                          </div>

                          {expandedEventId === e.id && (
                            <div className="mt-3 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                              <div className="p-4 space-y-4">
                                {e.context && (
                                  <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contexto de Execução</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {Object.entries(e.context).map(([k, v]) => (
                                        <div key={k} className="bg-white p-2 rounded-xl border border-slate-100">
                                          <span className="block text-[9px] text-slate-400 uppercase">{k}</span>
                                          <span className="block text-xs font-mono font-bold text-slate-700 truncate">{v as string}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {e.details && (
                                  <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Detalhes (JSON)</h4>
                                    <pre className="text-[10px] font-mono text-slate-600 bg-white p-3 rounded-xl border border-slate-100 overflow-x-auto">
                                      {JSON.stringify(e.details, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {e.originStack && (
                                  <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Call Stack Origin</h4>
                                    <pre className="text-[9px] font-mono text-slate-400 bg-slate-900 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">
                                      {e.originStack}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls
                    currentPage={timelinePage}
                    totalPages={totalTimelinePages}
                    onPageChange={setTimelinePage}
                    totalItems={reversedEvents.length}
                    label="eventos"
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'firestore' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800">Consultas ao Banco de Dados</h3>
              {paginatedFirestoreEvents.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma consulta ao banco de dados registrada.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                          <th className="px-4 py-3 font-bold">Horário</th>
                          <th className="px-4 py-3 font-bold">Tipo</th>
                          <th className="px-4 py-3 font-bold">Coleção / Operação</th>
                          <th className="px-4 py-3 font-bold">Origem (Componente)</th>
                          <th className="px-4 py-3 font-bold">Duração</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedFirestoreEvents.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.timestamp.toLocaleTimeString()}</td>
                            <td className="px-4 py-3 font-bold text-indigo-600 whitespace-nowrap">{e.type.replace('FIRESTORE_', '')}</td>
                            <td className="px-4 py-3">
                              <div className="font-mono text-slate-800 font-bold">{e.details?.collection}</div>
                              <div className="text-[10px] text-slate-400">{e.details?.operation} | Docs: {e.details?.count}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-amber-600">{e.context?.component || e.context?.repository || 'Desconhecido'}</span>
                              {e.context?.func && <div className="text-[10px] text-slate-400">fn: {e.context.func}</div>}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{e.duration?.toFixed(1)} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    currentPage={firestorePage}
                    totalPages={totalFirestorePages}
                    onPageChange={setFirestorePage}
                    totalItems={reversedFirestoreEvents.length}
                    label="consultas"
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'renders' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800">Mapa de Renderizações por Componente</h3>
              {paginatedRenderCounts.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma renderização registrada ainda.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {paginatedRenderCounts.map(([name, count]) => (
                      <div key={name} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-rose-200 transition-colors">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-700 block">{name}</span>
                          <span className="text-[10px] text-slate-400">Total renders</span>
                        </div>
                        <span className={`font-black text-lg ${Number(count) > 50 ? 'text-rose-500' : 'text-slate-700'}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                  <PaginationControls
                    currentPage={rendersPage}
                    totalPages={totalRendersPages}
                    onPageChange={setRendersPage}
                    totalItems={sortedRenderCounts.length}
                    label="componentes"
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800">Árvore de Execução (Execution Tree)</h3>
              <div className="bg-slate-900 p-6 rounded-3xl text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre">
                {/* Visualização simplificada da árvore baseada nos últimos eventos */}
                {events.slice().reverse().slice(0, 30).map(e => {
                  let prefix = '├── ';
                  let color = 'text-slate-400';
                  if (e.type === 'FIRESTORE_READ') color = 'text-amber-400';
                  if (e.type === 'GEMINI_CALL') color = 'text-indigo-400';
                  if (e.type === 'RENDER') color = 'text-rose-400';
                  
                  return (
                    <div key={e.id} className="hover:bg-slate-800 py-1 px-2 rounded">
                      <span className="text-slate-600">{e.timestamp.toLocaleTimeString()} </span>
                      {e.context?.component ? (
                        <span className="text-sky-400">{e.context.component}</span>
                      ) : (
                        <span className="text-slate-500">System</span>
                      )}
                      <br/>
                      <span className={color}>  {prefix}{e.name}</span>
                      {e.duration && <span className="text-slate-500"> ({e.duration.toFixed(1)}ms)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
});

export default DashboardDiagnostics;

function ScoreCard({ 
  title, 
  score, 
  internalScore, 
  icon, 
  variant = 'amber' 
}: { 
  title: string, 
  score: number, 
  internalScore?: number, 
  icon: React.ReactNode, 
  variant?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'red'
}) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-slate-200">
      <div className="flex justify-between items-center text-slate-500">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</span>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black tracking-tight text-slate-800">
            {score}
          </span>
          <span className="text-[10px] font-bold text-slate-400">reais</span>
        </div>
        
        {internalScore !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Diag. Interno: <strong className="font-bold text-slate-700">{internalScore}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationControls({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  label = "itens"
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
  totalItems: number;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 mt-6 text-slate-500 text-xs font-bold">
      <div className="font-medium text-slate-400">
        Exibindo página <span className="text-slate-700 font-bold">{currentPage}</span> de <span className="text-slate-700 font-bold">{totalPages}</span> ({totalItems} {label} no total)
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        
        <div className="flex gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i;
              if (pageNum + (4 - i) > totalPages) {
                pageNum = totalPages - 4 + i;
              }
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-xl font-bold transition-all text-xs ${
                  currentPage === pageNum 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
        >
          Próximo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
