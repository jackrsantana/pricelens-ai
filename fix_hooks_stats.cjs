const fs = require('fs');
let code = fs.readFileSync('src/hooks/useQueries.ts', 'utf8');

if (!code.includes('useDashboardStats')) {
  code = code.replace(/export const CACHE_KEYS = \{/, "export const CACHE_KEYS = {\n  STATS: ['dashboard_stats'],");
  code = code.replace(/export const useSystemSettings =/, "export const useDashboardStats = (options?: any) => useQuery({ queryKey: CACHE_KEYS.STATS, queryFn: () => FirestoreRepository.getDashboardStats(), staleTime: 1000 * 60 * 5, ...options });\nexport const useSystemSettings =");
}

fs.writeFileSync('src/hooks/useQueries.ts', code);
