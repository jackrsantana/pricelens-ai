const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/export default memo\(OfferCropImage\);/g, "export default memo(DashboardAdmin);");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed export");
