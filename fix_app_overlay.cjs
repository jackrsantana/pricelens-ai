const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("DiagnosticOverlay")) {
  code = code.replace(/import \{ BrowserRouter as Router/g, "import DiagnosticOverlay from './components/DiagnosticOverlay';\nimport { BrowserRouter as Router");
  
  code = code.replace(/<Router>/g, "<Router>\n      <DiagnosticOverlay />");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Added DiagnosticOverlay to App.tsx");
