// fix_categories.js — Fixes misassigned categories in localQuestions.ts
// Questions 6-9 and 12-15 are loops questions stuck in python-ifelse

const fs = require('fs');

// Map: question title substring → correct category
const categoryFixes = {
  'Number Reverse': 'python-loops',
  'String Reverse': 'python-loops',
  'Count Digits in a Number': 'python-loops',
  'Sum of Digits of a Number': 'python-loops',
  'Fibonacci Series Generation': 'python-loops',
  'Nth Fibonacci Number': 'python-loops',
  'Factorial of a Number': 'python-loops',
  'Check Prime Number': 'python-loops',
};

const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');

// Parse the questions array
let jsCode = content
  .replace(/export interface[\s\S]*?\n\}/g, '')
  .replace(/export const LOCAL_QUESTIONS:[\s\S]*?=\s*\[/, 'module.exports = [');

const tempPath = './temp_fix_cats.js';
fs.writeFileSync(tempPath, jsCode);
const questions = require(tempPath);
fs.unlinkSync(tempPath);

let fixCount = 0;
const fixed = questions.map(q => {
  for (const [titleSnippet, correctCat] of Object.entries(categoryFixes)) {
    if (q.title.includes(titleSnippet) && q.category !== correctCat) {
      console.log(`  Fixed Q${q.id}: "${q.title}" ${q.category} → ${correctCat}`);
      q.category = correctCat;
      fixCount++;
      break;
    }
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
