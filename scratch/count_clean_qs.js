const fs = require('fs');
const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const cats = [...content.matchAll(/"category":\s*"([^"]+)"/g)].map(m => m[1]);
const ids = [...content.matchAll(/"id":\s*(\d+)/g)].map(m => parseInt(m[1]));
let python = 0, sci = 0;
for (let i = 0; i < cats.length; i++) {
  if (['numpy', 'pandas', 'matplotlib-seaborn'].includes(cats[i])) sci++;
  else python++;
}
console.log('Python:', python, 'Sci:', sci, 'Total:', ids.length);
