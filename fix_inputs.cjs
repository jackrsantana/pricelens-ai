const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

content = content.replace(
  `  const [stagingOcrThreshold, setStagingOcrThreshold] = useState<number>(ocrConfidenceThreshold);`,
  `  const [stagingOcrThreshold, setStagingOcrThreshold] = useState<number>(ocrConfidenceThreshold);\n  const handleStagingOcrThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingOcrThreshold(parseInt(e.target.value) || 85), []);`
);
content = content.replace(
  `onChange={(e) => setStagingOcrThreshold(parseInt(e.target.value) || 85)}`,
  `onChange={handleStagingOcrThresholdChange}`
);

content = content.replace(
  `  const [stagingGeminiModel, setStagingGeminiModel] = useState<string>(geminiModel);`,
  `  const [stagingGeminiModel, setStagingGeminiModel] = useState<string>(geminiModel);\n  const handleStagingGeminiModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setStagingGeminiModel(e.target.value), []);`
);
content = content.replace(
  `onChange={(e) => {\n                        setStagingGeminiModel(e.target.value);\n                      }}`,
  `onChange={handleStagingGeminiModelChange}`
);

content = content.replace(
  `  const [stagingStorageLimit, setStagingStorageLimit] = useState<number>(storageLimit);`,
  `  const [stagingStorageLimit, setStagingStorageLimit] = useState<number>(storageLimit);\n  const handleStagingStorageLimitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingStorageLimit(parseInt(e.target.value) || 5), []);`
);
content = content.replace(
  `onChange={(e) => setStagingStorageLimit(parseInt(e.target.value) || 5)}`,
  `onChange={handleStagingStorageLimitChange}`
);

content = content.replace(
  `  const [stagingApiLimitRate, setStagingApiLimitRate] = useState<number>(apiLimitRate);`,
  `  const [stagingApiLimitRate, setStagingApiLimitRate] = useState<number>(apiLimitRate);\n  const handleStagingApiLimitRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingApiLimitRate(parseInt(e.target.value) || 100), []);`
);
content = content.replace(
  `onChange={(e) => setStagingApiLimitRate(parseInt(e.target.value) || 100)}`,
  `onChange={handleStagingApiLimitRateChange}`
);

content = content.replace(
  `  const [dangerConfirmPhrase, setDangerConfirmPhrase] = useState('');`,
  `  const [dangerConfirmPhrase, setDangerConfirmPhrase] = useState('');\n  const handleDangerConfirmPhraseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDangerConfirmPhrase(e.target.value), []);`
);
content = content.replace(
  `onChange={(e) => setDangerConfirmPhrase(e.target.value)}`,
  `onChange={handleDangerConfirmPhraseChange}`
);

content = content.replace(
  `  const [dangerUnderstandCheckbox, setDangerUnderstandCheckbox] = useState(false);`,
  `  const [dangerUnderstandCheckbox, setDangerUnderstandCheckbox] = useState(false);\n  const handleDangerUnderstandCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDangerUnderstandCheckbox(e.target.checked), []);\n  const handleCancelDangerAction = useCallback(() => setDangerAction(null), []);`
);
content = content.replace(
  `onChange={(e) => setDangerUnderstandCheckbox(e.target.checked)}`,
  `onChange={handleDangerUnderstandCheckboxChange}`
);
content = content.replace(
  `onClick={() => setDangerAction(null)}`,
  `onClick={handleCancelDangerAction}`
);

fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
