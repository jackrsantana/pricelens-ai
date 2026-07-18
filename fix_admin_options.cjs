const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/useFlyers\(\{ enabled: \['flyers', 'quality', 'database'\]\.includes\(activeSubTab\) \}\)/, "useFlyers({ enabled: ['flyers', 'quality', 'database', 'processing'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useOffers\(\{ enabled: \['quality', 'crops', 'database'\]\.includes\(activeSubTab\) \}\)/, "useOffers({ enabled: ['quality', 'crops', 'database', 'processing', 'offers'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useMarkets\(\{ enabled: \['markets', 'quality', 'flyers', 'crops', 'products', 'database'\]\.includes\(activeSubTab\) \}\)/, "useMarkets({ enabled: ['markets', 'quality', 'flyers', 'crops', 'products', 'database', 'processing'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useProducts\(\{ enabled: \['products', 'quality', 'database'\]\.includes\(activeSubTab\) \}\)/, "useProducts({ enabled: ['products', 'quality', 'database'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useCategories\(\{ enabled: \['categories', 'database'\]\.includes\(activeSubTab\) \}\)/, "useCategories({ enabled: ['categories', 'database'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useBrands\(\{ enabled: \['brands', 'database'\]\.includes\(activeSubTab\) \}\)/, "useBrands({ enabled: ['brands', 'database'].includes(activeSubTab), repoOptions: { limit: 100 } })");
code = code.replace(/useAuditLogs\(\{ enabled: \['audit', 'database'\]\.includes\(activeSubTab\) \}\)/, "useAuditLogs({ enabled: ['audit', 'database'].includes(activeSubTab), repoOptions: { limit: 100 } })");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
