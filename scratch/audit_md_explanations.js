const fs = require('fs');

const mdFiles = [
  'Basic Math logic and digit manupulation .md',
  'string.md',
  'patterns.md',
  'Arrays.md'
];

mdFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File ${file} does not exist.`);
    return;
  }
  console.log(`\nAuditing ${file}...`);
  const content = fs.readFileSync(file, 'utf8');
  const regex = /(?:^|\n)(\d+)\.\s+([\s\S]*?)(?=(?:\n\d+\.\s+|$))/g;
  const matches = [...content.matchAll(regex)];
  matches.forEach(m => {
    const num = m[1];
    const body = m[2];
    const title = body.split('\n')[0].trim();
    
    // Check examples raw text
    const examplesIdx = body.indexOf('Examples');
    let edgeIdx = body.indexOf('Critical Edge Cases');
    if (edgeIdx === -1) edgeIdx = body.indexOf('Critical Test Cases');
    if (edgeIdx === -1) edgeIdx = body.indexOf('Critical');
    
    if (examplesIdx !== -1 && edgeIdx !== -1) {
      const examplesRaw = body.substring(examplesIdx, edgeIdx);
      const exBlocks = [...examplesRaw.matchAll(/Example\s+\d+:([\s\S]*?)(?=Example\s+\d+:|$)/g)];
      const missing = [];
      exBlocks.forEach((eb, idx) => {
        if (!eb[1].includes('Explanation:')) {
          missing.push(idx + 1);
        }
      });
      if (missing.length > 0) {
        console.log(`  Q${num} (${title}) is missing explanations for Examples: ${missing.join(', ')}`);
      }
    } else {
      console.log(`  Q${num} (${title}) does not have standard Examples/Edge cases blocks.`);
    }
  });
});
