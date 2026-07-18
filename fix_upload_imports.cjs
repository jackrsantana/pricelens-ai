const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');

code = code.replace(/import \{ MetricTracker \} from '\.\.\/lib\/instrumentation';\n/g, '');
code = "import { MetricTracker } from '../lib/instrumentation';\n" + code;

fs.writeFileSync('src/components/DashboardUpload.tsx', code);
console.log("Fixed duplicated imports");
