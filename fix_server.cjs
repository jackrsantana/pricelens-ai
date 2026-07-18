const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const response = await generateContentWithRetry\(ai, geminiModel \|\| 'gemini-3\.5-flash', \{/g, "const startGemini = performance.now();\n      const response = await generateContentWithRetry(ai, geminiModel || 'gemini-3.5-flash', {");

code = code.replace(/const rawResponse = response\.text;/g, "const rawResponse = response.text;\n      const geminiDuration = performance.now() - startGemini;");

code = code.replace(/res\.json\(\{\n\s*flyer: \{/g, "res.json({\n      debug: { geminiDuration, promptSent: prompt, rawResponse },\n      flyer: {");

fs.writeFileSync('server.ts', code);
console.log("Added Gemini duration tracking to server.ts");
