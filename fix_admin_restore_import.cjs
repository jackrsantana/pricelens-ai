const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// revert the bad replace
code = code.replace(/import \{\n  useFlyers,\n  useOffers,/g, 'import {');

// now properly add to the specific hook import
code = code.replace(/import \{\n  useMarkets,/, "import {\n  useFlyers,\n  useOffers,\n  useMarkets,");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
