const fs = require('fs');

const code = fs.readFileSync('dist/assets/index-beautified.js', 'utf8');
const lines = code.split('\n');

const buttons = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fileName: "/app/applet/src/components/DashboardAdmin.tsx"')) {
    if (lines[i+1] && lines[i+1].includes('lineNumber:')) {
      const match = lines[i+1].match(/lineNumber: (\d+)/);
      if (match) {
        const lineNum = parseInt(match[1]);
        // Search backwards to see if it's a button
        let isButton = false;
        let propsLine = '';
        for (let j = i; j >= Math.max(0, i - 100); j--) {
          if (lines[j].includes('jsxDEV("button"')) {
            isButton = true;
            propsLine = lines.slice(j, i + 5).join(' ');
            break;
          } else if (lines[j].includes('jsxDEV(')) {
            break; // some other element
          }
        }
        if (isButton) {
          buttons.push({ lineNum, source: propsLine });
        }
      }
    }
  }
}

buttons.sort((a, b) => a.lineNum - b.lineNum);
fs.writeFileSync('extracted_buttons.json', JSON.stringify(buttons, null, 2));
console.log(`Found ${buttons.length} buttons.`);
