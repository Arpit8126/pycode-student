const fs = require('fs');
const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const idx = content.indexOf('"rps_winner"');
console.log(content.substring(idx - 100, idx + 1000));
