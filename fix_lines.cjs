const fs = require('fs');
let lines = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8').split('\n');

lines[2264] = '                    <div className="flex justify-end gap-2 pt-2"><button onClick={() => setIsProdModalOpen(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Cancelar</button>';
lines[2265] = '<button onClick={handleSaveProduct} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar Produto</button></div>';

lines[2357] = '                    <div className="flex justify-end gap-2 pt-2"><button onClick={() => setIsCatModalOpen(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Cancelar</button>';
lines[2358] = '<button onClick={handleSaveCategory} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar Categoria</button></div>';

lines[2881] = '                    <div className="flex justify-end gap-2 pt-2"><button onClick={() => setDangerAction(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Cancelar</button>';
lines[2882] = '<button onClick={executeDangerAction} disabled={dangerConfirmPhrase !== \'APAGAR TODOS OS DADOS\' || (dangerAction === \'clean\' && !dangerUnderstandCheckbox)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Executar Destruição</button></div>';

fs.writeFileSync('src/components/DashboardAdmin.tsx', lines.join('\n'));
console.log("Fixed lines!");
