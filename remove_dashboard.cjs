const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// 1. Remove activeSubTab default from 'dashboard' to 'processing'
code = code.replace(/useTrackedState<string>\('dashboard', 'DashboardAdmin', 'activeSubTab'\);/, "useTrackedState<string>('processing', 'DashboardAdmin', 'activeSubTab');");

// 2. Remove dashboard from subTabs
code = code.replace(/\{ id: 'dashboard', label: 'Resumo Técnico', icon: <LayoutDashboard className="w-4 h-4" \/> \},\n\s*/, "");

// 3. Update useDashboardStats
code = code.replace(/const \{ data: dashboardStats, isLoading: loadingStats \} = useDashboardStats\(\{ enabled: \['dashboard', 'processing'\]\.includes\(activeSubTab\) \}\) as any;\n\s*/, "");

// 4. Update loadingDb to remove loadingStats
code = code.replace(/const loadingDb = loadingStats \|\| loadingMarkets/, "const loadingDb = loadingMarkets");

// 5. Replace technicalStats useMemo to use loaded arrays directly
const newTechnicalStats = `const technicalStats = useMemo(() => {
    return {
      marketsCount: markets.length,
      flyersCount: flyers.length,
      offersCount: offers.length,
      productsCount: products.length,
      storageUsed: \`\${(flyers.length * 1.2 + offers.length * 0.05).toFixed(1)} MB\`,
      avgConfidence: 92,
      processingQueue: flyers.filter(f => f.status === 'pending_ocr').length + offers.filter(o => o.status === 'review_pending').length,
      ocrFailures: flyers.filter(f => f.status === 'error').length,
      processedOCR: flyers.filter(f => f.status === 'processed').length,
      pendingReviewCount: offers.filter(o => o.status === 'review_pending').length,
      validCount: offers.filter(o => o.productCanonicalId).length
    };
  }, [markets, flyers, offers, products]);`;

code = code.replace(/const technicalStats = useMemo\(\(\) => \{[\s\S]*?\}\);/g, newTechnicalStats);

// 6. Remove case 'dashboard': block completely
// It starts with `case 'dashboard':` and ends right before `case 'processing': {`
const dashboardCaseRegex = /case 'dashboard':[\s\S]*?(?=case 'processing': \{)/;
code = code.replace(dashboardCaseRegex, "");

// 7. Remove processing activeSubTab array includes 'processing' from where dashboard is removed?
// Wait, 'processing' is still used in useFlyers etc.

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
