const fs = require('fs');
let code = fs.readFileSync('src/lib/instrumentation.ts', 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
code = code.replace(/\\\\n/g, '\\n');

fs.writeFileSync('src/lib/instrumentation.ts', code);
console.log("Fixed again");
