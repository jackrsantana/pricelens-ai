const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// The flyer modal is correct at 1887. We'll leave it or replace it precisely.
// Wait, I can just use the line numbers to replace them since I know them exactly. Or match the context.
code = code.replace(/\{isProdModalOpen && \(\s*<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950\/40 backdrop-blur-sm p-4">[\s\S]*?<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, (match) => {
  return match.replace(/<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, 
    '<div className="flex justify-end gap-2 pt-2"><button onClick={() => setIsProdModalOpen(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Cancelar</button><button onClick={handleSaveProduct} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar Produto</button></div>'
  );
});

code = code.replace(/\{isCatModalOpen && \(\s*<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950\/40 backdrop-blur-sm p-4">[\s\S]*?<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, (match) => {
  return match.replace(/<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, 
    '<div className="flex justify-end gap-2 pt-2"><button onClick={() => setIsCatModalOpen(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Cancelar</button><button onClick={handleSaveCategory} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar Categoria</button></div>'
  );
});

code = code.replace(/\{dangerAction && \(\s*<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950\/80 backdrop-blur-md p-4">[\s\S]*?<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, (match) => {
  return match.replace(/<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, 
    '<div className="flex justify-end gap-2 pt-2"><button onClick={() => setDangerAction(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Cancelar</button><button onClick={executeDangerAction} disabled={dangerConfirmPhrase !== \'APAGAR TODOS OS DADOS\' || (dangerAction === \'clean\' && !dangerUnderstandCheckbox)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"><AlertOctagon className="w-4 h-4" /> Executar Destruição</button></div>'
  );
});

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed other modals!");
