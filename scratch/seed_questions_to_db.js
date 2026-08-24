// scratch/seed_questions_to_db.js
// Seeds the database directly with the 280 questions using the service role key.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Read environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// 2. Load questions from src/lib/localQuestions.ts
function loadQuestions() {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'localQuestions.ts'), 'utf8');
  let jsCode = content
    .replace(/export interface[\s\S]*?\n\}/g, '')
    .replace(/export const LOCAL_QUESTIONS:[\s\S]*?=\s*\[/g, 'module.exports = [');
  const tempPath = path.join(__dirname, 'temp_local_questions_seed.js');
  fs.writeFileSync(tempPath, jsCode);
  delete require.cache[require.resolve(tempPath)];
  const qs = require(tempPath);
  fs.unlinkSync(tempPath);
  return qs;
}

const questions = loadQuestions();
console.log(`Loaded ${questions.length} questions from localQuestions.ts`);

async function seed() {
  console.log('Starting Supabase DB Seeding...');
  
  // Prepare questions payload
  const rows = questions.map(q => {
    // Determine DB-level category (basics vs advanced vs scientific)
    let dbCategory = q.category;
    if (!['numpy', 'pandas', 'matplotlib-seaborn'].includes(dbCategory)) {
      if (['python-ifelse', 'python-loops', 'python-patterns', 'python-strings'].includes(dbCategory)) {
        dbCategory = 'python-basics';
      } else {
        dbCategory = 'python-advanced';
      }
    }
    
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      points: q.points,
      category: dbCategory,
      starter_code: q.starter_code,
      verification_script: q.verification_script || '',
      dataset_name: q.dataset_name || null
    };
  });

  // Upsert in batches of 15 with retries to avoid rate limits and ECONNRESET
  const batchSize = 15;
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    console.log(`Upserting questions ${i + 1} to ${Math.min(i + batchSize, rows.length)}...`);
    
    let success = false;
    let retries = 3;
    while (!success && retries > 0) {
      try {
        const { error } = await supabase
          .from('coding_questions')
          .upsert(batch, { onConflict: 'id' });
          
        if (error) throw error;
        success = true;
      } catch (err) {
        retries--;
        console.warn(`Error seeding batch. Retries remaining: ${retries}. Error:`, err.message || err);
        if (retries > 0) {
          await delay(1000); // Wait 1s before retry
        } else {
          console.error('Failed to seed batch after multiple retries.');
          process.exit(1);
        }
      }
    }
    await delay(200); // 200ms delay between batches
  }

  console.log('✓ Successfully seeded database coding_questions table!');
}

seed();
