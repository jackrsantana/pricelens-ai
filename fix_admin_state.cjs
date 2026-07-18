const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// The code currently has: 
// const [uploadSession, setUploadSession] = useTrackedState<any>((() => {
// ...
// })(), 'DashboardAdmin', 'uploadSession');
//   // Remove old init logic
//   /*
//       extractedOffers: [],
// ...

code = code.replace(/\/\/ Remove old init logic[\s\S]*?geminiModel: ''\n    \};\n  }\);/g, "");

// Wait, the block I want to fix is everything between `// --- Resilient Upload and Background Processing Session State ---` and `const [successMsg, setSuccessMsg] = useState<string | null>(null);` or similar.

const regex = /\/\/ --- Resilient Upload and Background Processing Session State ---[\s\S]*?(?=const \[successMsg, setSuccessMsg\])/;
code = code.replace(regex, `// --- Resilient Upload and Background Processing Session State ---
  const [uploadSession, setUploadSession] = useTrackedState<any>((() => {
    try {
      const saved = localStorage.getItem('flyerintel_upload_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to restore upload session from localStorage:', e);
    }
    return {
      selectedFile: null, originalFile: null, status: 'idle', marketId: '', cityId: '',
      startDate: '', endDate: '', observations: '', error: null, uploadedFlyer: null,
      extractedOffers: [], selectedOffer: null, debugData: null, pipelineSteps: [],
      detectedNewMarket: null, geminiModel: ''
    };
  })(), 'DashboardAdmin', 'uploadSession');

  `);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
