const fs = require('fs');

const content = fs.readFileSync('scratch_generate_all.js', 'utf8');

// We can search for the definition of ifElseQuestions and see their examples
// Let's print the examples that are missing explanations in Sections 2 and 3
console.log('Auditing questions in scratch_generate_all.js for missing example explanations...');

const parseJsArray = (str, startMarker, endMarker) => {
  const start = str.indexOf(startMarker);
  if (start === -1) return '';
  let braces = 0;
  let end = start;
  while (end < str.length) {
    if (str[end] === '[') braces++;
    else if (str[end] === ']') {
      braces--;
      if (braces === 0) {
        return str.substring(start, end + 1);
      }
    }
    end++;
  }
  return '';
};

// Let's run a simple regex match to find questions and log their titles and example explanations
const qRegex = /id:\s*(\d+),\s*title:\s*'([^']+)'[\s\S]*?description:\s*desc\([\s\S]*?\[([\s\S]*?)\]/g;
let match;
while ((match = qRegex.exec(content)) !== null) {
  const id = parseInt(match[1]);
  const title = match[2];
  const exText = match[3];
  
  // Parse individual examples
  const exMatches = [...exText.matchAll(/\{\s*input:[\s\S]*?\}/g)].map(m => m[0]);
  const missing = [];
  exMatches.forEach((ex, idx) => {
    if (!ex.includes('explanation:')) {
      missing.push(idx + 1);
    }
  });
  
  if (missing.length > 0 && id <= 55) {
    console.log(`Q${id} (${title}) is missing explanations for Examples: ${missing.join(', ')}`);
  }
}
