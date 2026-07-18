const fs = require('fs');

function replaceArgs(file, oldStr, newStr) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(oldStr, newStr);
  fs.writeFileSync(file, code);
}

replaceArgs('src/components/DashboardAdmin.tsx', 
  "export default function DashboardAdmin(...args: any[]) {", 
  "export default function DashboardAdmin({ flyers, offers, loading, onUpdateOffer, onAddFlyerAndOffers }: Props) {"
);

replaceArgs('src/components/DashboardUpload.tsx', 
  "export default function DashboardUpload(...args: any[]) {", 
  "export default function DashboardUpload({ onAddFlyerAndOffers, markets, canonicalProducts, categories, uploadSession, setUploadSession }: Props) {"
);

replaceArgs('src/components/DashboardAI.tsx', 
  "export default function DashboardAI(...args: any[]) {", 
  "export default function DashboardAI({ flyers, offers }: Props) {"
);

console.log("Fixed arguments!");
