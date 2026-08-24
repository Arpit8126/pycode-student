const fs = require('fs');
const c = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const idMatches = [...c.matchAll(/"id": (\d+)/g)].map(m => m[1]);
const catMatches = [...c.matchAll(/"category": "([^"]+)"/g)].map(m => m[1]);
const titleMatches = [...c.matchAll(/"title": "([^"]+)"/g)].map(m => m[1]);
console.log("ID   CATEGORY                  TITLE");
console.log("-".repeat(85));
for(let i=0;i<idMatches.length;i++) {
  console.log(
    String(idMatches[i]).padEnd(5),
    catMatches[i].padEnd(26),
    titleMatches[i] ? titleMatches[i].substring(0,50) : ''
  );
}
console.log(`\nTotal: ${idMatches.length} questions`);
