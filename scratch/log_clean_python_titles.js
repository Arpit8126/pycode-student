const fs = require('fs');

const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const titles = [...content.matchAll(/"title":\s*"([^"]+)"/g)].map(m => m[1]);
const cats = [...content.matchAll(/"category":\s*"([^"]+)"/g)].map(m => m[1]);
const pythonTitles = [];
for (let i = 0; i < titles.length; i++) {
  if (!['numpy', 'pandas', 'matplotlib-seaborn'].includes(cats[i])) {
    pythonTitles.push(titles[i]);
  }
}
console.log('Python titles in clean localQuestions.ts:');
console.log(pythonTitles.join('\n'));
