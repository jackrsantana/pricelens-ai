const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

if (!code.includes('useFlyers')) {
  code = code.replace(/import \{[\s\S]*?useMarkets,/, "import {\n  useFlyers,\n  useOffers,\n  useMarkets,");
}
fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
