const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// Replace the large useEffect block
const startMatch = `// Sync Markets, Products, Categories, Brands, Logs, Backups from Firestore`;
const endMatch = `  // Sub-navigation tabs list`;

const startIndex = code.indexOf(startMatch);
const endIndex = code.indexOf(endMatch);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(endIndex);

const newCode = `// Fetch System Settings from React Query
  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.ocrConfidenceThreshold !== undefined) setOcrConfidenceThreshold(systemSettings.ocrConfidenceThreshold);
      if (systemSettings.geminiModel !== undefined) {
        setGeminiModel(systemSettings.geminiModel);
        localStorage.setItem('gemini_model', systemSettings.geminiModel);
      }
      if (systemSettings.storageLimit !== undefined) setStorageLimit(systemSettings.storageLimit);
      if (systemSettings.apiLimitRate !== undefined) setApiLimitRate(systemSettings.apiLimitRate);
    }
  }, [systemSettings]);

  // Audit logger helper
  const logAction = async (action: string, details: string) => {
    try {
      await addAuditLog({
        user: userEmail,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not write audit log", e);
    }
  };

`

const newFile = before + newCode + after;
fs.writeFileSync('src/components/DashboardAdmin.tsx', newFile);
console.log("Patched successfully!");
