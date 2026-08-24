// comprehensive_fix_categories.js
// Fixes ALL miscategorized questions based on their IDs and titles
// 
// Issues found:
// 1. Q6-9: Number/String Reverse, Count/Sum Digits → python-ifelse (user says should be ifelse)
//    WAIT - actually these are in python-loops now (from my fix). User says "earlier was correct"
//    so I need to revert Q6-9 back to python-ifelse
// 2. Q36-45: Star/Pattern printing questions → python-loops (wrong, should be python-patterns)
// 3. Q58-67: String method questions → python-patterns (wrong, should be python-strings)

const fs = require('fs');

const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');

let jsCode = content
  .replace(/export interface[\s\S]*?\n\}/g, '')
  .replace(/export const LOCAL_QUESTIONS:[\s\S]*?=\s*\[/, 'module.exports = [');

const tempPath = './temp_comprehensive_fix.js';
fs.writeFileSync(tempPath, jsCode);
delete require.cache[require.resolve(tempPath)];
const questions = require(tempPath);
fs.unlinkSync(tempPath);

let fixCount = 0;

const fixed = questions.map(q => {
  const id = q.id;
  const title = q.title || '';
  let newCat = null;

  // ── FIX 1: Q6-9 should be python-ifelse (Number/String Reverse, Count/Sum Digits)
  // These are basic questions that were wrongly moved to loops by my earlier fix
  // They involve simple math with if/else checks, no loops required
  if (id >= 6 && id <= 9 && q.category === 'python-loops') {
    newCat = 'python-ifelse';
  }

  // ── FIX 2: Q36-45 are pattern questions stuck in python-loops
  if (id >= 36 && id <= 45 && q.category === 'python-loops') {
    newCat = 'python-patterns';
  }

  // ── FIX 3: Q58-67 are string method questions stuck in python-patterns  
  if (id >= 58 && id <= 67 && q.category === 'python-patterns') {
    newCat = 'python-strings';
  }

  if (newCat && newCat !== q.category) {
    console.log(`  Fixed Q${id}: "${title.substring(0, 50)}" ${q.category} → ${newCat}`);
    q.category = newCat;
    fixCount++;
  }

  return q;
});

console.log(`\nTotal fixes: ${fixCount}`);

const newContent = `export interface LocalQuestion {
  id: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  category: string
  description: string
  starter_code: string
  dataset_name: string | null
  verification_script?: string
}

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(fixed, null, 2)};
`;

fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts updated.');

// Sync with pycode-teacher
const path = require('path');
const teacherPath = path.join(__dirname, '..', 'pycode-teacher', 'src', 'lib', 'localQuestions.ts');
if (fs.existsSync(path.dirname(teacherPath))) {
  fs.writeFileSync(teacherPath, newContent);
  console.log('✓ Synced to pycode-teacher');
}
