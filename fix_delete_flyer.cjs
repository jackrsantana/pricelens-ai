const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/await flyerBatch\.commit\(\);(\s*)logAction\('FLYER_DELETE'/g, "await flyerBatch.commit();$1queryClient.invalidateQueries({ queryKey: ['flyers'] });$1queryClient.invalidateQueries({ queryKey: ['offers'] });$1logAction('FLYER_DELETE'");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed delete flyer invalidation!");
