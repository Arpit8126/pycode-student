const fs = require('fs');

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
      let currentLabel = '';
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
<ul class="list-disc pl-5 text-xs text-ink space-y-1.5 font-normal font-sans">
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

const parsed = parseMarkdownFile('patterns.md');
const q = parsed.find(item => item.id === 1); // 1 is Solid Star Square Pattern in patterns.md
console.log("Parsed Title:", q.title);
console.log("Parsed descHtml:");
console.log(q.descHtml);
