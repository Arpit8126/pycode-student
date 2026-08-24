// validate.js — Master script to execute and verify every question's verification script in Python.
// Runs the validation sandbox for all 274 questions and prints a report.

const fs = require('fs');
const execSync = require('child_process').execSync;

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

const questions = loadQuestions();
fs.writeFileSync('temp_questions.json', JSON.stringify(questions, null, 2));

console.log('Verifying all 274 questions in Python sandbox...');
try {
  const output = execSync('python validate_all.py', { encoding: 'utf8' });
  console.log(output);
} catch (e) {
  console.error('Validation runner crashed:', e.message);
  if (e.stdout) console.log('Stdout:', e.stdout);
  if (e.stderr) console.error('Stderr:', e.stderr);
} finally {
  fs.unlinkSync('temp_questions.json');
}
