const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const missingButtonsCodeDanger = `\n<button onClick={() => setDangerAction(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Cancelar</button>\n<button onClick={executeDangerAction} disabled={dangerConfirmPhrase !== 'APAGAR TODOS OS DADOS' || (dangerAction === 'clean' && !dangerUnderstandCheckbox)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"><AlertOctagon className="w-4 h-4" /> Executar Destruição</button>\n`;

code = code.replace(/<div className="flex justify-end gap-2 pt-2">\s*<\/div>/g, `<div className="flex justify-end gap-2 pt-2">${missingButtonsCodeDanger}</div>`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed Danger Modal Buttons");
