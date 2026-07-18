const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/const \{ data: markets = \[\], isLoading: loadingMarkets \} = useQuery\(\{ queryKey: \['markets'\] \}\) as any;/, "const { data: markets = [], isLoading: loadingMarkets } = useMarkets() as any;");
code = code.replace(/const \{ data: products = \[\], isLoading: loadingProducts \} = useQuery\(\{ queryKey: \['canonical_products'\] \}\) as any;/, "const { data: products = [], isLoading: loadingProducts } = useProducts() as any;");
code = code.replace(/const \{ data: categories = \[\], isLoading: loadingCategories \} = useQuery\(\{ queryKey: \['categories'\] \}\) as any;/, "const { data: categories = [], isLoading: loadingCategories } = useCategories() as any;");
code = code.replace(/const \{ data: brands = \[\], isLoading: loadingBrands \} = useQuery\(\{ queryKey: \['brands'\] \}\) as any;/, "const { data: brands = [], isLoading: loadingBrands } = useBrands() as any;");
code = code.replace(/const \{ data: auditLogs = \[\], isLoading: loadingLogs \} = useQuery\(\{ queryKey: \['audit_logs'\] \}\) as any;/, "const { data: auditLogs = [], isLoading: loadingLogs } = useAuditLogs() as any;");
code = code.replace(/const \{ data: backups = \[\], isLoading: loadingBackups \} = useQuery\(\{ queryKey: \['backups'\] \}\) as any;/, "const { data: backups = [], isLoading: loadingBackups } = useBackups() as any;");

if (!code.includes('useMarkets')) {
  code = code.replace(/import \{ useQueryClient, useQuery \} from '@tanstack\/react-query';/, "import { useQueryClient, useQuery } from '@tanstack/react-query';\nimport { useMarkets, useProducts, useCategories, useBrands, useAuditLogs, useBackups } from '../hooks/useQueries';");
}

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed admin queries");
