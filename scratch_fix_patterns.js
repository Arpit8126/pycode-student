const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Parse patterns.md
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /(?:^|\n)(\d+)\.\s+([\s\S]*?)(?=(?:\n\d+\.\s+|$))/g;
  const matches = [...content.matchAll(regex)];
  return matches.map(m => {
    const num = parseInt(m[1], 10);
    const body = m[2].trim();
    const probIdx = body.indexOf('Problem Statement Explanation');
    const rawTitle = probIdx !== -1
      ? body.substring(0, probIdx).trim()
      : body.split(/[\r\n]/)[0].trim();

    const examplesIdx = body.indexOf('Examples');
    let edgeIdx = body.indexOf('Critical Edge Cases');
    if (edgeIdx === -1) edgeIdx = body.indexOf('Critical Test Cases');
    if (edgeIdx === -1) edgeIdx = body.indexOf('Critical');

    let descHtml = '';
    if (probIdx !== -1 && examplesIdx !== -1 && edgeIdx !== -1) {
      const statementRaw = body.substring(probIdx + 'Problem Statement Explanation'.length, examplesIdx).trim();
      const stmtHtml = statementRaw.split(/\n\s*\n/).map(p =>
        `<p class="mb-4 leading-relaxed text-sm font-normal text-ink font-sans">${p.trim().replace(/\r/g, '')}</p>`
      ).join('');

      const examplesRaw = body.substring(examplesIdx + 'Examples'.length, edgeIdx).trim();
      const exBlocks = [...examplesRaw.matchAll(/Example\s+\d+:([\s\S]*?)(?=Example\s+\d+:|$)/g)];
      let exHtml = '';
      exBlocks.forEach((eb, idx) => {
        const bt = eb[1].trim();
        const iIdx = bt.indexOf('Input:'), oIdx = bt.indexOf('Output:'), expIdx = bt.indexOf('Explanation:');
        let inp = '', out = '', exp = '';
        const trimNewlines = (str) => (str || '').replace(/^[\r\n]+|[\r\n]+$/g, '');
        if (iIdx !== -1 && oIdx !== -1) {
          inp = bt.substring(iIdx + 6, oIdx).trim();
          if (expIdx !== -1) {
            out = trimNewlines(bt.substring(oIdx + 7, expIdx));
            exp = bt.substring(expIdx + 12).trim();
          } else {
            out = trimNewlines(bt.substring(oIdx + 7));
          }
        }
        const isPattern = out.includes('\n') || out.includes('*') || out.includes('|');
        const outRender = isPattern
          ? `<div class="mt-2"><pre class="bg-surface-soft p-3.5 rounded-2xl font-mono text-xs text-ink whitespace-pre my-2 border border-hairline overflow-x-auto leading-normal select-all">${out}</pre></div>`
          : `<code>${out}</code>`;
        exHtml += `<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Example ${idx + 1}</h3>
<div class="border-l-2 border-primary/40 dark:border-primary/50 pl-4 py-1.5 space-y-1.5 my-3.5 font-mono text-xs text-ink font-normal">
  <div><span class="text-ink/80 font-bold font-sans mr-2">Input:</span> <code>${inp}</code></div>
  <div><span class="text-primary font-bold font-sans mr-2">Output:</span> ${outRender}</div>
  ${exp ? `<div><span class="text-ink/80 font-bold font-sans mr-2">Explanation:</span> <span class="text-ink font-normal font-sans">${exp}</span></div>` : ''}
</div>`;
      });

      const cRaw = body.substring(edgeIdx).trim();
      const lines = cRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let constraints = [];
      for (let line of lines) {
        if (line.toLowerCase().includes('critical') || line.toLowerCase().includes('cases to pass')) {
          continue;
        }
        const matchL = line.match(/^([a-zA-Z0-9_.\s]+)\s*\((.*)\)/);
        if (matchL) {
          constraints.push(`${matchL[1].trim()} (${matchL[2].trim()})`);
        } else {
          constraints.push(line);
        }
      }
      const cHtml = constraints.length
        ? `<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Constraints / Edge Cases</h3>
<ul class="list-disc pl-5 text-xs text-ink space-y-1.5 font-normal">
  ${constraints.map(c => `<li class="py-0.5"><code>${c}</code></li>`).join('\n')}
</ul>`
        : '';
      descHtml = stmtHtml + exHtml + cHtml;
    } else {
      descHtml = `<p class="mb-4 leading-relaxed text-sm font-normal text-ink font-sans">${body.replace(/\r/g, '')}</p>`;
    }

    return { id: num, title: rawTitle, descHtml };
  });
}

console.log("Parsing patterns.md...");
const parsedPatterns = parseMarkdownFile('patterns.md');

// Map pattern indexes to local questions IDs
const patternMap = {};
for (let i = 1; i <= 22; i++) {
  patternMap[i] = i + 45; // Pattern 1-22 -> ID 46-67
}
patternMap[23] = 152; // Pattern 23 -> ID 152

// 2. Read localQuestions.ts
function loadQuestions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let jsCode = content
    .replace(/export interface[\s\S]*?\n\}/g, '')
    .replace(/export const LOCAL_QUESTIONS:[\s\S]*?=\s*\[/g, 'module.exports = [');
  const tempPath = './temp_local_questions_fix.js';
  fs.writeFileSync(tempPath, jsCode);
  delete require.cache[require.resolve(tempPath)];
  const qs = require(tempPath);
  fs.unlinkSync(tempPath);
  return qs;
}

console.log("Loading localQuestions.ts...");
const studentQuestionsPath = './src/lib/localQuestions.ts';
const studentQuestions = loadQuestions(studentQuestionsPath);

let fixedCount = 0;
studentQuestions.forEach(q => {
  // Find if this question is a pattern
  const patternIndex = Object.keys(patternMap).find(k => patternMap[k] === q.id);
  if (patternIndex) {
    const pattern = parsedPatterns.find(p => p.id === parseInt(patternIndex));
    if (pattern) {
      q.description = pattern.descHtml;
      fixedCount++;
    }
  }
});

console.log(`Fixed ${fixedCount} pattern descriptions in memory.`);

// Write back to student localQuestions.ts
const fileContent = `export interface LocalQuestion {
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

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(studentQuestions, null, 2)};
`;

fs.writeFileSync(studentQuestionsPath, fileContent);
console.log("✓ Saved pycode-student localQuestions.ts");

// Sync with pycode-teacher
const teacherQuestionsPath = '../pycode-teacher/src/lib/localQuestions.ts';
fs.writeFileSync(teacherQuestionsPath, fileContent);
console.log("✓ Synced localQuestions.ts with pycode-teacher");

// 3. Update Supabase database
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function syncToDatabase() {
  console.log("Syncing fixed descriptions to database...");
  for (let key in patternMap) {
    const qId = patternMap[key];
    const q = studentQuestions.find(item => item.id === qId);
    if (q) {
      const { error } = await supabase
        .from('coding_questions')
        .update({ description: q.description })
        .eq('id', qId);
      
      if (error) {
        console.error(`Error updating ID ${qId}:`, error);
      } else {
        console.log(`✓ Updated database for question ID ${qId}`);
      }
    }
  }
  console.log("Database sync finished.");
}

syncToDatabase();
