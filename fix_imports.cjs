const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

if (!code.includes("import { Scissors }")) {
  code = code.replace(/import \{/, "import { Scissors, ");
}
if (!code.includes("import CropEditorModal")) {
  code = code.replace(/import \{/, "import CropEditorModal from './CropEditorModal';\nimport {");
}

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed missing imports!");
