// fix_dataset_name.js — Adds dataset_name: null to all questions missing it
const fs = require('fs');
let content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');

function loadQuestions() {
  const content = fs.readFileSync('src/lib/localQuestions.ts', 'utf8');
  let jsCode = content
    .replace(/export interface[\s\S]*?\n\}/g, '')
    .replace(/export const LOCAL_QUESTIONS:[\s\S]*?=\s*\[/g, 'module.exports = [');
  const tempPath = './temp_local_questions.js';
  fs.writeFileSync(tempPath, jsCode);
  const qs = require(tempPath);
  fs.unlinkSync(tempPath);
  return qs;
}

let questions = loadQuestions();

let fixed = 0;
questions = questions.map(q => {
  if (!('dataset_name' in q)) {
    q.dataset_name = null;
    fixed++;
  }
  // Remove any stray created_at
  delete q.created_at;
  return q;
});

console.log(`Fixed ${fixed} questions missing dataset_name`);

const newContent = `export interface LocalQuestion {
  id: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  category: 'python-basics' | 'python-advanced' | 'numpy' | 'pandas' | 'matplotlib-seaborn'
  description: string
  starter_code: string
  dataset_name: string | null
  verification_script?: string
}

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(questions, null, 2)};
`;
fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts updated.');
