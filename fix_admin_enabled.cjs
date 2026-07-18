const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/const \{ data: markets = \[\], isLoading: loadingMarkets \} = useMarkets\(\) as any;/, "const { data: markets = [], isLoading: loadingMarkets } = useMarkets({ enabled: ['dashboard', 'processing', 'quality', 'markets', 'flyers', 'crops', 'products', 'database'].includes(activeSubTab) }) as any;");
code = code.replace(/const \{ data: products = \[\], isLoading: loadingProducts \} = useProducts\(\) as any;/, "const { data: products = [], isLoading: loadingProducts } = useProducts({ enabled: ['dashboard', 'processing', 'quality', 'products', 'database'].includes(activeSubTab) }) as any;");
code = code.replace(/const \{ data: categories = \[\], isLoading: loadingCategories \} = useCategories\(\) as any;/, "const { data: categories = [], isLoading: loadingCategories } = useCategories({ enabled: ['dashboard', 'categories', 'database'].includes(activeSubTab) }) as any;");
code = code.replace(/const \{ data: brands = \[\], isLoading: loadingBrands \} = useBrands\(\) as any;/, "const { data: brands = [], isLoading: loadingBrands } = useBrands({ enabled: ['dashboard', 'brands', 'database'].includes(activeSubTab) }) as any;");
code = code.replace(/const \{ data: auditLogs = \[\], isLoading: loadingLogs \} = useAuditLogs\(\) as any;/, "const { data: auditLogs = [], isLoading: loadingLogs } = useAuditLogs({ enabled: ['dashboard', 'audit', 'database'].includes(activeSubTab) }) as any;");
code = code.replace(/const \{ data: backups = \[\], isLoading: loadingBackups \} = useBackups\(\) as any;/, "const { data: backups = [], isLoading: loadingBackups } = useBackups({ enabled: ['dashboard', 'database'].includes(activeSubTab) }) as any;");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed admin enabled");
