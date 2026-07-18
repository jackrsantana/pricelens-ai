const fs = require('fs');
let code = fs.readFileSync('src/lib/instrumentation.ts', 'utf8');

code = code.replace(/includes\(\\\`Consultas Repetidas: \\\$\\{col\\}\\\`\)/, "includes(`Consultas Repetidas: ${col}`)");
code = code.replace(/\\n/g, "\\n");

fs.writeFileSync('src/lib/instrumentation.ts', code);
console.log("Fixed");
