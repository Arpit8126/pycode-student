// restructure_curriculum.js — Removes basics (IDs 1-10), merges scientific questions,
// categorizes into granular topics, and renumbers everything from 1 to N.

const fs = require('fs');

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

// 1. Load the 167 Python questions currently in localQuestions.ts
let pythonQs = loadQuestions();

// Keep only the Python questions with ID >= 11 (removes variables, basic operators, types) and exclude scientific categories to prevent duplication
pythonQs = pythonQs.filter(q => q.id >= 11 && !['numpy', 'pandas', 'matplotlib-seaborn'].includes(q.category));

// 2. Load the 117 scientific questions from our backup
const scientificQs = JSON.parse(fs.readFileSync('scientific_questions.json', 'utf8'));

// 3. Merge them
let merged = [...pythonQs, ...scientificQs];

// 4. Categorize and Renumber
let newId = 1;
const restructured = merged.map(q => {
  q.id = newId;
  q.dataset_name = q.dataset_name !== undefined ? q.dataset_name : null;

  // DO NOT remap categories — use whatever category is already set on the question.
  // The old ID-range mapping was wrong because IDs change every restructure run.

  // Renumber the title prefix (e.g. "11. Positive..." becomes "1. Positive...")
  q.title = q.title.replace(/^\d+\.\s*/, `${newId}. `);

  newId++;
  return q;
});

console.log(`Restructured curriculum:`);
console.log(`- Removed 10 basic python questions.`);
console.log(`- Loaded ${scientificQs.length} scientific questions.`);
console.log(`- Total restructured questions: ${restructured.length}`);

// Write back to localQuestions.ts
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

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(restructured, null, 2)};
`;

fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts saved.');

// Sync with pycode-teacher
const path = require('path');
const teacherPath = path.join(__dirname, '..', 'pycode-teacher', 'src', 'lib', 'localQuestions.ts');
if (fs.existsSync(path.dirname(teacherPath))) {
  fs.writeFileSync(teacherPath, newContent);
  console.log('✓ Synced localQuestions.ts with pycode-teacher');
}

// ─── WRITE questions_seed.sql ────────────────────────────────
console.log('Generating pycode-supabase/questions_seed.sql & supabase/questions_seed.sql...');
let sql = `-- PyCode Student — Full Question Seed
-- Generated automatically. Run in Supabase SQL Editor.

BEGIN;
TRUNCATE public.coding_questions RESTART IDENTITY CASCADE;

`;
restructured.forEach(q => {
  const esc = s => (s || '').replace(/'/g, "''");
  const dv = q.dataset_name ? `'${esc(q.dataset_name)}'` : 'NULL';
  let dbCategory = q.category;
  if (!['numpy', 'pandas', 'matplotlib-seaborn'].includes(dbCategory)) {
    if (['python-ifelse', 'python-loops', 'python-patterns', 'python-strings'].includes(dbCategory)) {
      dbCategory = 'python-basics';
    } else {
      dbCategory = 'python-advanced';
    }
  }
  sql += `INSERT INTO public.coding_questions (id,title,description,difficulty,points,category,starter_code,verification_script,dataset_name)
VALUES (${q.id},'${esc(q.title)}','${esc(q.description)}','${q.difficulty}',${q.points},'${dbCategory}','${esc(q.starter_code)}','${esc(q.verification_script||'')}',${dv});\n\n`;
});
sql += 'COMMIT;\n';

// Destination 1: pycode-supabase
const sqlDir1 = path.join(__dirname, '..', 'pycode-supabase');
if (!fs.existsSync(sqlDir1)) fs.mkdirSync(sqlDir1, { recursive: true });
fs.writeFileSync(path.join(sqlDir1, 'questions_seed.sql'), sql);

// Destination 2: supabase (root folder)
const sqlDir2 = path.join(__dirname, '..', 'supabase');
if (!fs.existsSync(sqlDir2)) fs.mkdirSync(sqlDir2, { recursive: true });
fs.writeFileSync(path.join(sqlDir2, 'questions_seed.sql'), sql);

console.log('✓ Saved questions_seed.sql to both destinations');
