const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/onClick=\{handleSaveFlyerDates\}/g, 'onClick={handleSaveFlyer}');
code = code.replace(/onClick=\{executeDangerAction\}/g, 'onClick={handleExecuteDangerAction}');

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed handler names!");
