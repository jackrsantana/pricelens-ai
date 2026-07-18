const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/\{dangerAction && \(\s*<div className="fixed inset-0 z-\[100\] flex items-center justify-center bg-slate-950\/70 backdrop-blur-md p-4 overflow-y-auto">[\s\S]*?<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, (match) => {
  return match.replace(/<div className="flex justify-end gap-2 pt-2">.*?<\/div>/, 
    '<div className="flex justify-end gap-2 pt-2"><button onClick={() => setDangerAction(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Cancelar</button><button onClick={executeDangerAction} disabled={dangerConfirmPhrase !== \'APAGAR TODOS OS DADOS\' || (dangerAction === \'clean\' && !dangerUnderstandCheckbox)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Executar Destruição</button></div>'
  );
});

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed Danger Modal!");
