const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// 1. Remove hook imports that are no longer needed
content = content.replace(
  `  useFlyers,\n  useOffers,\n  useMarkets,\n  useProducts,\n  useCategories,\n  useAuditLogs,\n  useBackups,\n  useDashboardStats,\n  useSystemSettings,\n  useMutateMarket,\n  useDeleteMarket,\n  useMutateFlyer,\n  useMutateOffer,\n  useMutateProduct,\n  useDeleteProduct,\n  useAddAuditLog,\n  useCreateBackup,\n  useDeleteBackup\n} from '../hooks/useQueries';`,
  `  useDashboardStats,\n  useSystemSettings,\n  useMutateMarket,\n  useDeleteMarket,\n  useMutateFlyer,\n  useMutateOffer,\n  useMutateProduct,\n  useDeleteProduct,\n  useAddAuditLog,\n  useCreateBackup,\n  useDeleteBackup\n} from '../hooks/useQueries';`
);

// 2. Add React.lazy for DangerZoneManager
content = content.replace(
  `const AuditManager = React.lazy(() => import('./admin/AuditManager'));`,
  `const AuditManager = React.lazy(() => import('./admin/AuditManager'));\nconst DangerZoneManager = React.lazy(() => import('./admin/DangerZoneManager'));`
);

// 3. Remove DangerZone state and hooks from DashboardAdmin
const regexDangerZone = /  const isDangerActive = useMemo\(\(\) => activeSubTab === 'danger', \[activeSubTab\]\);[\s\S]*?      storageUsed: \`\$\{\(flyers.length \* 0.15\)\.toFixed\(1\)\} MB\`\n    };\n  }, \[flyers, offers, markets, products\]\);/;
content = content.replace(regexDangerZone, '');

// 4. Update the render sub view
const regexRenderDanger = /      case 'danger':\n        return \([\s\S]*?        \);\n      default:/;
content = content.replace(regexRenderDanger, `      case 'danger':\n        return <DangerZoneManager logAction={logAction} showSuccess={showSuccess} showError={showError} />;\n      default:`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
