const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/\{ id: 'renders', label: 'Renderizações', icon: <Layers className="w-4 h-4" \/> \}/g, "{ id: 'renders', label: 'Renderizações', icon: <Layers className=\"w-4 h-4\" /> },\n          { id: 'audit', label: 'Auditoria', icon: <AlertTriangle className=\"w-4 h-4\" /> }");

// And let's generate the content of the audit tab
const auditTabContent = `
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Auditoria Automática
            </h3>
            
            <div className="space-y-3">
              {Object.entries(renderCounts).filter(([_, count]) => count > 50).map(([name, count]) => (
                <div key={'render-'+name} className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-800">Renderizações Excessivas Detectadas</h4>
                    <p className="text-[10px] text-rose-600 mt-0.5">O componente <strong>{name}</strong> foi renderizado {count} vezes. Considere memoização (useMemo/React.memo) ou revise as dependências dos hooks.</p>
                  </div>
                </div>
              ))}
              
              {geminiCalls > 10 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Uso Elevado do Gemini</h4>
                    <p className="text-[10px] text-amber-600 mt-0.5">Detectamos {geminiCalls} chamadas. Verifique se há chamadas redundantes sem cache.</p>
                  </div>
                </div>
              )}
              
              {reads > 200 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Alto Volume de Leituras no Firestore</h4>
                    <p className="text-[10px] text-amber-600 mt-0.5">Foram lidos {reads} documentos. Considere adicionar índices, limitar queries ou implementar cache local para reduzir custos.</p>
                  </div>
                </div>
              )}

              {Object.entries(renderCounts).filter(([_, count]) => count <= 50).length > 0 && reads <= 200 && geminiCalls <= 10 && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800">Nenhum Gargalo Crítico</h4>
                    <p className="text-[10px] text-emerald-600 mt-0.5">A arquitetura parece saudável e não foram detectados loops ou excessos até o momento.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
`;

code = code.replace(/\{activeTab === 'timeline' && \(/, auditTabContent + "\n        {activeTab === 'timeline' && (");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Added Audit tab");
