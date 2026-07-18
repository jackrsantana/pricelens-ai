const fs = require('fs');

function removeWord(file, word) {
  let content = fs.readFileSync(file, 'utf8');
  const regex = new RegExp(`\\b${word}\\b,?\\s*`, 'g');
  // Be careful with this simple regex, it might break code if the word is used elsewhere.
  // A safer way is to just let it be, but the user requested strict cleanup.
}

// I'll do specific replacements to avoid breaking the code.
let content;

// DashboardGeneral.tsx
content = fs.readFileSync('src/components/DashboardGeneral.tsx', 'utf8');
content = content.replace(/formatDateToLocal,?\s*/g, '');
content = content.replace(/CheckCircle2,?\s*/g, '');
fs.writeFileSync('src/components/DashboardGeneral.tsx', content);

// DashboardMarkets.tsx
content = fs.readFileSync('src/components/DashboardMarkets.tsx', 'utf8');
content = content.replace(/motion,?\s*/g, '');
content = content.replace(/Info,?\s*/g, '');
content = content.replace(/ClipboardCheck,?\s*/g, '');
content = content.replace(/Award,?\s*/g, '');
content = content.replace(/CheckCircle2,?\s*/g, '');
fs.writeFileSync('src/components/DashboardMarkets.tsx', content);

// DashboardProducts.tsx
content = fs.readFileSync('src/components/DashboardProducts.tsx', 'utf8');
content = content.replace(/motion,?\s*/g, '');
content = content.replace(/Info,?\s*/g, '');
fs.writeFileSync('src/components/DashboardProducts.tsx', content);

// FirebaseProvider.tsx
content = fs.readFileSync('src/components/FirebaseProvider.tsx', 'utf8');
content = content.replace(/Loader2,?\s*/g, '');
content = content.replace(/Database,?\s*/g, '');
content = content.replace(/Wifi,?\s*/g, '');
content = content.replace(/import \{ useDiagnosticStore \} from '\.\.\/stores\/useDiagnosticStore';\n/g, '');
fs.writeFileSync('src/components/FirebaseProvider.tsx', content);

// DangerZoneManager.tsx
content = fs.readFileSync('src/components/admin/DangerZoneManager.tsx', 'utf8');
content = content.replace(/const \{ data: categories = \[\] \} = useCategories\(\);\n/g, '');
content = content.replace(/const \{ data: cleanAuditLogs = \[\] \} = useAuditLogs\(\);\n/g, '');
content = content.replace(/const \{ data: cleanBackups = \[\] \} = useBackups\(\);\n/g, '');
fs.writeFileSync('src/components/admin/DangerZoneManager.tsx', content);

// OffersManager.tsx
content = fs.readFileSync('src/components/admin/OffersManager.tsx', 'utf8');
content = content.replace(/motion,?\s*/g, '');
content = content.replace(/X,?\s*/g, '');
fs.writeFileSync('src/components/admin/OffersManager.tsx', content);

// ProductsManager.tsx
content = fs.readFileSync('src/components/admin/ProductsManager.tsx', 'utf8');
content = content.replace(/Sparkles,?\s*/g, '');
fs.writeFileSync('src/components/admin/ProductsManager.tsx', content);

// useDiagnostic.ts
content = fs.readFileSync('src/hooks/useDiagnostic.ts', 'utf8');
content = content.replace(/useEffect,?\s*/g, '');
fs.writeFileSync('src/hooks/useDiagnostic.ts', content);

// FirestoreRepository.ts
content = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');
content = content.replace(/Category,?\s*/g, '');
fs.writeFileSync('src/services/FirestoreRepository.ts', content);

