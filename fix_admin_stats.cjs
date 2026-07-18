const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// Also add useDashboardStats import
if (!code.includes('useDashboardStats')) {
  code = code.replace(/useBackups,/, "useBackups,\n  useDashboardStats,");
}

code = code.replace(/const \{ data: backups = \[\], isLoading: loadingBackups \} = useBackups\(\{ enabled: \['dashboard', 'database'\]\.includes\(activeSubTab\) \}\) as any;/, 
  "const { data: backups = [], isLoading: loadingBackups } = useBackups({ enabled: ['database'].includes(activeSubTab) }) as any;\n  const { data: dashboardStats, isLoading: loadingStats } = useDashboardStats({ enabled: ['dashboard', 'processing'].includes(activeSubTab) }) as any;");

// Update loadingDb
code = code.replace(/const loadingDb = loadingMarkets \|\| loadingProducts \|\| loadingCategories \|\| loadingBrands \|\| loadingLogs \|\| loadingBackups;/, 
  "const loadingDb = loadingStats || loadingMarkets || loadingProducts || loadingCategories || loadingBrands || loadingLogs || loadingBackups;");

// Fix technicalStats
code = code.replace(/const technicalStats = useMemo\(\(\) => \{[\s\S]*?\}\);/g, 
  `const technicalStats = useMemo(() => {
    const dStats = dashboardStats || { marketsCount: 0, flyersCount: 0, offersCount: 0, pendingOcrCount: 0, processedFlyersCount: 0, errorFlyersCount: 0, unnormalizedOffersCount: 0, normalizedOffersCount: 0, manualReviewOffersCount: 0 };
    return {
      marketsCount: dStats.marketsCount,
      flyersCount: dStats.flyersCount,
      offersCount: dStats.offersCount,
      productsCount: dStats.normalizedOffersCount,
      storageUsed: \`\${(dStats.flyersCount * 1.2 + dStats.offersCount * 0.05).toFixed(1)} MB\`,
      avgConfidence: 92,
      processingQueue: dStats.pendingOcrCount + dStats.manualReviewOffersCount,
      ocrFailures: dStats.errorFlyersCount,
      processedOCR: dStats.processedFlyersCount,
      pendingReviewCount: dStats.manualReviewOffersCount,
      validCount: dStats.normalizedOffersCount
    };
  }, [dashboardStats]);`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
