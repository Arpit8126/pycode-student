const fs = require('fs');

// 1. Clean localQuestions.ts titles
const cleanContent = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const cleanTitles = [...cleanContent.matchAll(/"title":\s*"([^"]+)"/g)].map(m => m[1]);
const cleanCats = [...cleanContent.matchAll(/"category":\s*"([^"]+)"/g)].map(m => m[1]);
const cleanPython = [];
for (let i = 0; i < cleanTitles.length; i++) {
  if (!['numpy', 'pandas', 'matplotlib-seaborn'].includes(cleanCats[i])) {
    cleanPython.push(cleanTitles[i].replace(/^\d+\.\s*/, '').trim());
  }
}

// 2. Generate raw python list from scratch_generate_all.js
const { execSync } = require('child_process');
execSync('node scratch_generate_all.js', { stdio: 'pipe' });

const rawContent = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const rawTitles = [...rawContent.matchAll(/"title":\s*"([^"]+)"/g)].map(m => m[1]);
const rawCats = [...rawContent.matchAll(/"category":\s*"([^"]+)"/g)].map(m => m[1]);
const rawPython = [];
for (let i = 0; i < rawTitles.length; i++) {
  if (!['numpy', 'pandas', 'matplotlib-seaborn'].includes(rawCats[i])) {
    rawPython.push(rawTitles[i].replace(/^\d+\.\s*/, '').trim());
  }
}

// Restore localQuestions.ts
execSync('git restore src/lib/localQuestions.ts');

console.log('Clean count:', cleanPython.length);
console.log('Raw generated count:', rawPython.length);

const missingInClean = rawPython.filter(t => !cleanPython.includes(t));
console.log('\nMissing in clean (present in raw):', missingInClean);

const uniqueToClean = cleanPython.filter(t => !rawPython.includes(t));
console.log('\nUnique to clean (missing in raw):', uniqueToClean);
