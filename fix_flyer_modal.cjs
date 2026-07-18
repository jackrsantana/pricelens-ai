const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const missingButtonsCode = `<button onClick={() => setIsFlyerModalOpen(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Cancelar</button>\n<button onClick={handleSaveFlyerDates} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar</button>`;

code = code.replace(/<div className="flex justify-end gap-2 pt-2">\s*<\/div>/g, `<div className="flex justify-end gap-2 pt-2">${missingButtonsCode}</div>`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed Flyer Modal Buttons");
