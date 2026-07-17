const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const startMatch = `// --- Dynamic State loaded from Firestore or Fallbacks ---`;
const endMatch = `// System Config State`;

const startIndex = code.indexOf(startMatch);
const endIndex = code.indexOf(endMatch);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(endIndex);

const newCode = `// --- Dynamic State loaded from Firestore via Repository ---
  const { data: markets = [], isLoading: loadingMarkets } = useMarkets();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: auditLogs = [] } = useAuditLogs();
  const { data: backups = [] } = useBackups();
  const { data: systemSettings } = useSystemSettings();

  const { mutateAsync: addAuditLog } = useAddAuditLog();

  const loadingDb = loadingMarkets || loadingProducts || loadingCategories || loading;

  `

const newFile = before + newCode + after;
fs.writeFileSync('src/components/DashboardAdmin.tsx', newFile);
console.log("Patched successfully!");
