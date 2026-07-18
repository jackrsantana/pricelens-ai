const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const missingStates = `  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [marketForm, setMarketForm] = useState<Partial<Market>>({});`;

code = code.replace(/const \[editingMarketId, setEditingMarketId\] = useState<string \| null>\(null\);/, missingStates);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
