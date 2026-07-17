const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');

code = code.replace(/const queryClient = useQueryClient\(\);\n      queryClient\.invalidateQueries\(\{ queryKey: \['markets'\] \}\);/, "queryClient.invalidateQueries({ queryKey: ['markets'] });");

code = code.replace(/export default function DashboardUpload\(\{ onAddFlyerAndOffers \}: Props\) \{/, "export default function DashboardUpload({ onAddFlyerAndOffers }: Props) {\n  const queryClient = useQueryClient();");

fs.writeFileSync('src/components/DashboardUpload.tsx', code);
console.log("Fixed hook successfully!");
