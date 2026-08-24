const fs = require('fs');

const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const regex = /"verification_script":\s*"([\s\S]*?)"/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  const script = match[1];
  if (script.includes('assert res == expected')) {
    count++;
  }
}
console.log('Total scripts containing assert res == expected:', count);
