// audit_questions.js — checks title vs starter_code function name alignment
const fs = require('fs');
const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
const start = content.indexOf('= [\n') + 2;  // after '= ['
const end = content.lastIndexOf(']') + 1;
const jsonStr = content.substring(start, end);
const qs = JSON.parse(jsonStr);

let issues = 0;
qs.forEach(q => {
  const m = (q.starter_code || '').match(/def\s+(\w+)/);
  const fn = m ? m[1] : '?';
  // Extract clean title words for fuzzy match
  const titleWords = q.title.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 3);
  const fnWords = fn.toLowerCase().split('_').filter(w => w.length > 3);
  const hasOverlap = fnWords.some(fw => titleWords.some(tw => tw.includes(fw) || fw.includes(tw)));
  const status = hasOverlap ? '✓' : '✗';
  if (!hasOverlap) {
    issues++;
    console.log(status + ' ID ' + String(q.id).padStart(3) + ' | ' + q.title.substring(0,40).padEnd(40) + ' | fn: ' + fn);
  }
});
console.log('\nTotal mismatches:', issues, '/', qs.length);
