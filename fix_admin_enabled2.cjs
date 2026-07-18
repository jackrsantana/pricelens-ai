const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/useFlyers\(\{ enabled: \['dashboard', 'flyers', 'database'\]\.includes\(activeSubTab\) \}\)/, "useFlyers({ enabled: ['flyers', 'quality', 'database'].includes(activeSubTab) })");
code = code.replace(/useOffers\(\{ enabled: \['dashboard', 'processing', 'quality', 'crops', 'database'\]\.includes\(activeSubTab\) \}\)/, "useOffers({ enabled: ['quality', 'crops', 'database'].includes(activeSubTab) })");
code = code.replace(/useMarkets\(\{ enabled: \['dashboard', 'processing', 'quality', 'markets', 'flyers', 'crops', 'products', 'database'\]\.includes\(activeSubTab\) \}\)/, "useMarkets({ enabled: ['markets', 'quality', 'flyers', 'crops', 'products', 'database'].includes(activeSubTab) })");
code = code.replace(/useProducts\(\{ enabled: \['dashboard', 'processing', 'quality', 'products', 'database'\]\.includes\(activeSubTab\) \}\)/, "useProducts({ enabled: ['products', 'quality', 'database'].includes(activeSubTab) })");
code = code.replace(/useCategories\(\{ enabled: \['dashboard', 'categories', 'database'\]\.includes\(activeSubTab\) \}\)/, "useCategories({ enabled: ['categories', 'database'].includes(activeSubTab) })");
code = code.replace(/useBrands\(\{ enabled: \['dashboard', 'brands', 'database'\]\.includes\(activeSubTab\) \}\)/, "useBrands({ enabled: ['brands', 'database'].includes(activeSubTab) })");
code = code.replace(/useAuditLogs\(\{ enabled: \['dashboard', 'audit', 'database'\]\.includes\(activeSubTab\) \}\)/, "useAuditLogs({ enabled: ['audit', 'database'].includes(activeSubTab) })");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
