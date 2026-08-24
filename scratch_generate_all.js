// ============================================================
// scratch_generate_all.js — Complete PyCode Student Question Generator
// Sections: Fundamentals → If/Else → Math → Patterns →
//           String Methods → String Algos → List Basics →
//           Array Algos → Dicts → Functional → OOP
// ============================================================
const fs = require('fs');
const path = require('path');

// ─── HELPERS ────────────────────────────────────────────────

function html(strings, ...vals) {
  return strings.reduce((acc, str, i) => acc + str + (vals[i] || ''), '');
}

function desc(statement, examples, constraints) {
  const stmtHtml = statement
    .split('\n\n')
    .map(p => `<p class="mb-4 leading-relaxed text-sm font-normal text-ink font-sans">${p.trim()}</p>`)
    .join('');

  const exHtml = examples.map((ex, i) => {
    const isPattern = ex.output && (ex.output.includes('\n') || ex.output.includes('*'));
    const outputRender = isPattern
      ? `<div class="mt-2"><pre class="bg-surface-soft p-3.5 rounded-2xl font-mono text-xs text-ink whitespace-pre my-2 border border-hairline overflow-x-auto leading-normal select-all">${ex.output}</pre></div>`
      : `<code>${ex.output}</code>`;
    return `<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Example ${i + 1}</h3>
<div class="border-l-2 border-primary/40 dark:border-primary/50 pl-4 py-1.5 space-y-1.5 my-3.5 font-mono text-xs text-ink font-normal">
  <div><span class="text-ink/80 font-bold font-sans mr-2">Input:</span> <code>${ex.input}</code></div>
  <div><span class="text-primary font-bold font-sans mr-2">Output:</span> ${outputRender}</div>
  ${ex.explanation ? `<div><span class="text-ink/80 font-bold font-sans mr-2">Explanation:</span> <span class="text-ink font-normal font-sans">${ex.explanation}</span></div>` : ''}
</div>`;
  }).join('');

  const cHtml = constraints && constraints.length
    ? `<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Constraints</h3>
<ul class="list-disc pl-5 text-xs text-ink space-y-1.5 font-normal">
  ${constraints.map(c => `<li><code>${c}</code></li>`).join('')}
</ul>`
    : '';

  return stmtHtml + exHtml + cHtml;
}

function verify(funcName, testCases, refBody) {
  const n = testCases.length;
  return `def ref_impl(*args):
${refBody.split('\n').map(l => '    ' + l).join('\n')}

assert "${funcName}" in exec_globals, "Function ${funcName} not found"
fn = exec_globals["${funcName}"]
test_cases = [${testCases.join(', ')}]
passed = 0
for tc in test_cases:
    if isinstance(tc, tuple):
        res = fn(*tc)
        expected = ref_impl(*tc)
        assert res == expected, f"Failed for {tc}:\\n  got:      {res}\\n  expected: {expected}"
    else:
        res = fn(tc)
        expected = ref_impl(tc)
        assert res == expected, f"Failed for {tc}:\\n  got:      {res}\\n  expected: {expected}"
    passed += 1
exec_globals["passed_cases"] = passed
exec_globals["total_cases"] = ${n}`;
}

function verifyCustom(body, total) {
  return body + `\nexec_globals["total_cases"] = ${total}`;
}

// ─── PARSE MARKDOWN (for existing .md files) ────────────────
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

    // Build HTML description
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

      const edgeRaw = body.substring(edgeIdx);
      const firstNl = edgeRaw.indexOf('\n');
      const edgeCases = (firstNl !== -1 ? edgeRaw.substring(firstNl) : '').trim()
        .split('\n').map(c => c.trim()).filter(c => c.length > 0)
        .map(c => c.replace(/^[-*•\s]+/, ''));
      const cHtml = edgeCases.length
        ? `<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Constraints / Edge Cases</h3>
<ul class="list-disc pl-5 text-xs text-ink space-y-1.5 font-normal">
  ${edgeCases.map(c => `<li><code>${c}</code></li>`).join('')}
</ul>` : '';
      descHtml = stmtHtml + exHtml + cHtml;
    } else {
      descHtml = `<p class="mb-4 leading-relaxed text-sm font-normal text-ink font-sans">${body.replace(/\r/g, '')}</p>`;
    }

    return { id: num, title: rawTitle, descHtml };
  });
}

// ─── PATTERN HELPERS ────────────────────────────────────────
const patternFuncs = {
  1:'solid_square', 2:'right_triangle', 3:'number_triangle',
  4:'repeating_number_triangle', 5:'inverted_right_triangle',
  6:'inverted_number_triangle', 7:'star_pyramid', 8:'inverted_star_pyramid',
  9:'star_diamond', 10:'half_star_diamond', 11:'binary_triangle',
  12:'mirror_canopy', 13:'floyds_triangle', 14:'alphabet_triangle',
  15:'inverted_alphabet_triangle', 16:'repeating_alphabet_triangle',
  17:'alphabet_palindrome_pyramid', 18:'alphabet_window',
  19:'inverted_butterfly', 20:'butterfly', 21:'hollow_square',
  22:'concentric_grid', 23:'pascal_triangle'
};

function patternRef(id) {
  const refs = {
    1: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join(["*"] * args[0])] * args[0])`,
    2: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join(["*"] * i) for i in range(1, args[0] + 1)])`,
    3: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join(str(j) for j in range(1, i + 1)) for i in range(1, args[0] + 1)])`,
    4: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join([str(i)] * i) for i in range(1, args[0] + 1)])`,
    5: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join(["*"] * i) for i in range(args[0], 0, -1)])`,
    6: `if args[0] <= 0: return ""\nreturn "\\n".join([" ".join(str(j) for j in range(1, i + 1)) for i in range(args[0], 0, -1)])`,
    7: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    spaces = " " * (n - i)\n    stars = " ".join(["*"] * i)\n    lines.append(spaces + stars)\nreturn "\\n".join(lines)`,
    8: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(n, 0, -1):\n    spaces = " " * (n - i)\n    stars = " ".join(["*"] * i)\n    lines.append(spaces + stars)\nreturn "\\n".join(lines)`,
    9: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    spaces = " " * (n - i)\n    stars = " ".join(["*"] * i)\n    lines.append(spaces + stars)\nfor i in range(n - 1, 0, -1):\n    spaces = " " * (n - i)\n    stars = " ".join(["*"] * i)\n    lines.append(spaces + stars)\nreturn "\\n".join(lines)`,
    10: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    lines.append(" ".join(["*"] * i))\nfor i in range(n - 1, 0, -1):\n    lines.append(" ".join(["*"] * i))\nreturn "\\n".join(lines)`,
    11: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    row = []\n    val = 1 if i % 2 != 0 else 0\n    for j in range(i):\n        row.append(str(val))\n        val = 1 - val\n    lines.append(" ".join(row))\nreturn "\\n".join(lines)`,
    12: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    left = "".join(str(j) for j in range(1, i + 1))\n    right = "".join(str(j) for j in range(i, 0, -1))\n    spaces = " " * (2 * (n - i))\n    lines.append(left + spaces + right)\nreturn "\\n".join(lines)`,
    13: `n = args[0]\nif n <= 0: return ""\nlines = []\ncurr = 1\nfor i in range(1, n + 1):\n    row = []\n    for _ in range(i):\n        row.append(str(curr))\n        curr += 1\n    lines.append(" ".join(row))\nreturn "\\n".join(lines)`,
    14: `n = args[0]\nif n <= 0 or n > 26: return ""\nreturn "\\n".join(["".join(chr(65 + j) for j in range(i)) for i in range(1, n + 1)])`,
    15: `n = args[0]\nif n <= 0 or n > 26: return ""\nreturn "\\n".join(["".join(chr(65 + j) for j in range(i)) for i in range(n, 0, -1)])`,
    16: `n = args[0]\nif n <= 0 or n > 26: return ""\nreturn "\\n".join([chr(65 + i - 1) * i for i in range(1, n + 1)])`,
    17: `n = args[0]\nif n <= 0 or n > 26: return ""\nlines = []\nfor i in range(1, n + 1):\n    spaces = " " * (n - i)\n    left = "".join(chr(65 + j) for j in range(i))\n    right = "".join(chr(65 + j) for j in range(i - 2, -1, -1))\n    lines.append(spaces + left + right)\nreturn "\\n".join(lines)`,
    18: `n = args[0]\nif n <= 0 or n > 26: return ""\nlines = []\nfor i in range(1, n + 1):\n    row = [chr(65 + n - i + j) for j in range(i)]\n    lines.append(" ".join(row))\nreturn "\\n".join(lines)`,
    19: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    stars = "*" * (n - i + 1)\n    spaces = " " * (2 * (i - 1))\n    lines.append(stars + spaces + stars)\nfor i in range(1, n + 1):\n    stars = "*" * i\n    spaces = " " * (2 * (n - i))\n    lines.append(stars + spaces + stars)\nreturn "\\n".join(lines)`,
    20: `n = args[0]\nif n <= 0: return ""\nlines = []\nfor i in range(1, n + 1):\n    stars = "*" * i\n    spaces = " " * (2 * (n - i))\n    lines.append(stars + spaces + stars)\nfor i in range(1, n):\n    stars = "*" * (n - i)\n    spaces = " " * (2 * i)\n    lines.append(stars + spaces + stars)\nreturn "\\n".join(lines)`,
    21: `n = args[0]\nif n <= 0: return ""\nif n == 1: return "*"\nlines = []\nlines.append(" ".join(["*"] * n))\nfor _ in range(n - 2):\n    lines.append("*" + " " * (2 * n - 3) + "*")\nlines.append(" ".join(["*"] * n))\nreturn "\\n".join(lines)`,
    22: `n = args[0]\nif n <= 0: return ""\nsize = 2 * n - 1\nlines = []\nfor r in range(size):\n    row = []\n    for c in range(size):\n        d = min(r, c, size - 1 - r, size - 1 - c)\n        row.append(str(n - d))\n    lines.append(" ".join(row))\nreturn "\\n".join(lines)`,
    23: `n = args[0]\nif n <= 0: return ""\nlines = []\nrow = [1]\nfor i in range(n):\n    row_str = " ".join(str(x) for x in row)\n    spaces = " " * (n - 1 - i)\n    lines.append(spaces + row_str)\n    next_row = [1]\n    for j in range(len(row) - 1):\n        next_row.append(row[j] + row[j+1])\n    next_row.append(1)\n    row = next_row\nreturn "\\n".join(lines)`
  };
  return refs[id];
}

function makePatternVerify(id, funcName) {
  const alphaBased = id >= 14 && id <= 18;
  const testCases = alphaBased ? [1, 3, 5, 28] : [1, 3, 5, -2];
  return `def ref_impl(*args):
${patternRef(id).split('\n').map(l => '    ' + l).join('\n')}

assert "${funcName}" in exec_globals, "Function ${funcName} not found"
fn = exec_globals["${funcName}"]

# Show live output for 2 sample sizes
print("--- YOUR PATTERN FOR n=4 ---")
try:
    fn(4)
except Exception as e:
    print(f"Error: {e}")
print("----------------------------")
print("--- YOUR PATTERN FOR n=5 ---")
try:
    fn(5)
except Exception as e:
    print(f"Error: {e}")
print("----------------------------")

def capture(func, n):
    import io, sys
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        func(n)
    finally:
        sys.stdout = old
    return buf.getvalue()

def normalize(s):
    lines = [l.rstrip() for l in s.splitlines()]
    while lines and not lines[-1]: lines.pop()
    while lines and not lines[0]: lines.pop(0)
    return lines

test_cases = [${testCases.join(', ')}]
passed = 0
for tc in test_cases:
    exp = normalize(ref_impl(tc))
    got = normalize(capture(fn, tc))
    assert exp == got, f"Mismatch n={tc}\\nExpected:\\n" + "\\n".join(exp) + "\\nGot:\\n" + "\\n".join(got)
    passed += 1
exec_globals["passed_cases"] = passed
exec_globals["total_cases"] = ${testCases.length}`;
}

// ─── SECTION 1: PYTHON FUNDAMENTALS (IDs 1-10) ──────────────
const fundamentalsQuestions = [
  {
    id: 1, title: '1. Greet with f-String',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>greet(name)</code> that takes a person's name and returns a greeting message using a Python f-string.\n\nf-strings (formatted string literals) let you embed expressions directly inside string literals using <code>f"..."</code> syntax. They are the modern, readable way to format strings in Python.`,
      [
        { input: 'name = "Alice"', output: '"Hello, Alice!"' },
        { input: 'name = "PyCode"', output: '"Hello, PyCode!"' }
      ],
      ['The name can be any non-empty string']
    ),
    starter_code: 'def greet(name):\n    # Use an f-string to return the greeting\n    pass',
    verification_script: verify('greet', ['"Alice"', '"PyCode"', '"World"', '"Python 3"'], 'return f"Hello, {args[0]}!"')
  },
  {
    id: 2, title: '2. Identify Variable Types',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>get_type(val)</code> that takes any value and returns its Python type as a string — e.g. <code>"int"</code>, <code>"str"</code>, <code>"float"</code>, <code>"bool"</code>, <code>"list"</code>.\n\nUse Python's built-in <code>type()</code> function and access <code>.__name__</code> to get the type name as a string.`,
      [
        { input: 'val = 42', output: '"int"', explanation: 'type(42).__name__ == "int"' },
        { input: 'val = 3.14', output: '"float"' },
        { input: 'val = "hello"', output: '"str"' },
        { input: 'val = True', output: '"bool"' }
      ],
      []
    ),
    starter_code: 'def get_type(val):\n    # Return the type name as a string\n    pass',
    verification_script: verify('get_type', ['42', '3.14', '"hello"', 'True', '[1,2]', '(1,2)', 'None'], 'return type(args[0]).__name__')
  },
  {
    id: 3, title: '3. Type Conversion',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>convert(s)</code> that takes a numeric string <code>s</code> (e.g. <code>"42"</code>) and returns a tuple <code>(as_int, as_float, back_to_str)</code> — the value converted to int, float, and then back to string.\n\nType conversion (casting) is fundamental in Python. Use <code>int()</code>, <code>float()</code>, and <code>str()</code> built-ins.`,
      [
        { input: 's = "42"', output: '(42, 42.0, "42")', explanation: 'int("42")=42, float("42")=42.0, str(42)="42"' },
        { input: 's = "3"', output: '(3, 3.0, "3")' }
      ],
      ['Input is always a valid numeric string representing a whole number']
    ),
    starter_code: 'def convert(s):\n    # Convert s to int, float, and back to string\n    pass',
    verification_script: verify('convert', ['"42"', '"3"', '"0"', '"100"', '"-7"'], 'n = int(args[0])\nreturn (n, float(n), str(n))')
  },
  {
    id: 4, title: '4. All Arithmetic Operators',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>all_ops(a, b)</code> that takes two integers and returns a tuple of all six arithmetic results:\n<code>(a+b, a-b, a*b, a//b, a%b, a**b)</code>\n\nThis covers the 6 core Python arithmetic operators: addition, subtraction, multiplication, floor division, modulo, and exponentiation.`,
      [
        { input: 'a = 10, b = 3', output: '(13, 7, 30, 3, 1, 1000)', explanation: '10+3=13, 10-3=7, 10*3=30, 10//3=3, 10%3=1, 10**3=1000' },
        { input: 'a = 5, b = 2', output: '(7, 3, 10, 2, 1, 25)' }
      ],
      ['b is always non-zero']
    ),
    starter_code: 'def all_ops(a, b):\n    # Return tuple of (sum, diff, product, floor_div, modulo, power)\n    pass',
    verification_script: verify('all_ops', ['(10, 3)', '(5, 2)', '(8, 4)', '(7, 3)'], 'a, b = args[0], args[1]\nreturn (a+b, a-b, a*b, a//b, a%b, a**b)')
  },
  {
    id: 5, title: '5. String Slicing & Indexing',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>string_info(s)</code> that takes a string <code>s</code> and returns a tuple:\n<code>(first_char, last_char, first_three, last_three, reversed_str)</code>\n\nStrings in Python are sequences. You access characters with <code>s[0]</code>, <code>s[-1]</code>, and slices with <code>s[start:end:step]</code>.`,
      [
        { input: 's = "Python"', output: '("P", "n", "Pyt", "hon", "nohtyP")', explanation: 'Indexing and slicing the string' },
        { input: 's = "Hello"', output: '("H", "o", "Hel", "llo", "olleH")' }
      ],
      ['Length of s is at least 3']
    ),
    starter_code: 'def string_info(s):\n    # Return (first_char, last_char, first_three, last_three, reversed)\n    pass',
    verification_script: verify('string_info', ['"Python"', '"Hello"', '"abcdef"', '"Data"'], 'return (args[0][0], args[0][-1], args[0][:3], args[0][-3:], args[0][::-1])')
  },
  {
    id: 6, title: '6. Comparison Operators',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>compare(a, b)</code> that takes two numbers and returns a tuple of all six comparison results:\n<code>(a==b, a!=b, a>b, a<b, a>=b, a<=b)</code>\n\nComparison operators return boolean values (<code>True</code>/<code>False</code>) and are the foundation of every conditional statement.`,
      [
        { input: 'a = 5, b = 3', output: '(False, True, True, False, True, False)' },
        { input: 'a = 4, b = 4', output: '(True, False, False, False, True, True)' }
      ],
      []
    ),
    starter_code: 'def compare(a, b):\n    # Return tuple of comparison results\n    pass',
    verification_script: verify('compare', ['(5, 3)', '(4, 4)', '(-1, 2)', '(10, 10)', '(0, 1)'], 'a, b = args[0], args[1]\nreturn (a==b, a!=b, a>b, a<b, a>=b, a<=b)')
  },
  {
    id: 7, title: '7. Boolean Logic',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>bool_ops(a, b)</code> that takes two boolean values and returns a tuple:\n<code>(a and b, a or b, not a, a ^ b)</code>\n\nPython uses the keywords <code>and</code>, <code>or</code>, <code>not</code> for boolean logic. The last item <code>^</code> is the XOR operator — it returns True if exactly one of the two is True.`,
      [
        { input: 'a = True, b = False', output: '(False, True, False, True)' },
        { input: 'a = True, b = True', output: '(True, True, False, False)' }
      ],
      []
    ),
    starter_code: 'def bool_ops(a, b):\n    # Return (a and b, a or b, not a, a XOR b)\n    pass',
    verification_script: verify('bool_ops', ['(True, False)', '(True, True)', '(False, False)', '(False, True)'], 'a, b = args[0], args[1]\nreturn (a and b, a or b, not a, a ^ b)')
  },
  {
    id: 8, title: '8. Multiple Assignment & Unpacking',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>unpack_and_swap(lst)</code> that takes a list of exactly 3 elements, unpacks it into three variables <code>a, b, c</code>, then swaps <code>a</code> and <code>c</code> in a single line using Python's multiple assignment, and returns the new tuple <code>(a, b, c)</code>.\n\nPython allows multiple assignment in one line: <code>a, b = b, a</code>. This is cleaner and more Pythonic than using a temporary variable.`,
      [
        { input: 'lst = [1, 2, 3]', output: '(3, 2, 1)', explanation: 'a,b,c = 1,2,3 → swap a,c → 3,2,1' },
        { input: 'lst = [10, 20, 30]', output: '(30, 20, 10)' }
      ],
      ['List always has exactly 3 elements']
    ),
    starter_code: 'def unpack_and_swap(lst):\n    # Unpack, swap a and c, return tuple\n    pass',
    verification_script: verify('unpack_and_swap', ['[1, 2, 3]', '[10, 20, 30]', '["x", "y", "z"]', '[99, 0, -1]'], 'a, b, c = args[0]\na, c = c, a\nreturn (a, b, c)')
  },
  {
    id: 9, title: '9. Truthy & Falsy Values',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>is_truthy(val)</code> that returns <code>True</code> if the value is truthy in Python and <code>False</code> if it is falsy.\n\nIn Python, these values are considered "falsy": <code>0</code>, <code>0.0</code>, <code>""</code> (empty string), <code>[]</code> (empty list), <code>{}</code> (empty dict), <code>None</code>, <code>False</code>. Everything else is truthy.`,
      [
        { input: 'val = 0', output: 'False', explanation: '0 is falsy in Python' },
        { input: 'val = "hello"', output: 'True', explanation: 'Non-empty strings are truthy' },
        { input: 'val = []', output: 'False', explanation: 'Empty list is falsy' }
      ],
      []
    ),
    starter_code: 'def is_truthy(val):\n    # Return True if val is truthy, False if falsy\n    pass',
    verification_script: verify('is_truthy', ['0', '1', '""', '"hello"', '[]', '[0]', 'None', 'False', 'True', '0.0'], 'return bool(args[0])')
  },
  {
    id: 10, title: '10. String Multiplication & Repetition',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>repeat_info(s, n)</code> that takes a string <code>s</code> and a positive integer <code>n</code>, and returns a tuple:\n<code>(repeated, length_after, upper, lower)</code>\n\nWhere:\n- <code>repeated</code> = the string repeated <code>n</code> times (<code>s * n</code>)\n- <code>length_after</code> = its length\n- <code>upper</code> = the repeated string in uppercase\n- <code>lower</code> = the repeated string in lowercase`,
      [
        { input: 's = "ab", n = 3', output: '("ababab", 6, "ABABAB", "ababab")' },
        { input: 's = "Hi", n = 2', output: '("HiHi", 4, "HIHI", "hihi")' }
      ],
      []
    ),
    starter_code: 'def repeat_info(s, n):\n    # Return (repeated, length, upper, lower)\n    pass',
    verification_script: verify('repeat_info', ['("ab", 3)', '("Hi", 2)', '("x", 5)', '("py", 1)'], 'r = args[0] * args[1]\nreturn (r, len(r), r.upper(), r.lower())')
  }
];

// ─── SECTION 2: IF/ELSE CONDITIONALS (IDs 11-25) ────────────
const ifElseQuestions = [
  {
    id: 11, title: '11. Positive, Negative or Zero',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>classify_number(n)</code> that takes a number and returns <code>"Positive"</code>, <code>"Negative"</code>, or <code>"Zero"</code>.\n\nThis is the simplest if/elif/else chain — the foundation of all decision-making in Python.`,
      [
        { input: 'n = 5', output: '"Positive"' },
        { input: 'n = -3', output: '"Negative"' },
        { input: 'n = 0', output: '"Zero"' }
      ],
      []
    ),
    starter_code: 'def classify_number(n):\n    # Return "Positive", "Negative", or "Zero"\n    pass',
    verification_script: verify('classify_number', ['5', '-3', '0', '-100', '0.0', '0.1'], 'if args[0] > 0: return "Positive"\nelif args[0] < 0: return "Negative"\nreturn "Zero"')
  },
  {
    id: 12, title: '12. Absolute Value Without abs()',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>my_abs(n)</code> that returns the absolute value of a number <em>without</em> using Python's built-in <code>abs()</code> function.\n\nUse an <code>if/else</code> statement: if the number is negative, negate it; otherwise return it as-is.`,
      [
        { input: 'n = -7', output: '7' },
        { input: 'n = 5', output: '5' },
        { input: 'n = 0', output: '0' }
      ],
      []
    ),
    starter_code: 'def my_abs(n):\n    # Return absolute value without abs()\n    pass',
    verification_script: verify('my_abs', ['-7', '5', '0', '-100', '3.14', '-2.5'], 'return -args[0] if args[0] < 0 else args[0]')
  },
  {
    id: 13, title: '13. Find Maximum of Three',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>max_of_three(a, b, c)</code> that returns the largest of three numbers <em>without</em> using the built-in <code>max()</code> function.\n\nUse nested <code>if/elif/else</code> to compare all three values.`,
      [
        { input: 'a=1, b=2, c=3', output: '3' },
        { input: 'a=10, b=10, c=5', output: '10' },
        { input: 'a=-1, b=-5, c=-2', output: '-1' }
      ],
      []
    ),
    starter_code: 'def max_of_three(a, b, c):\n    # Return the largest without using max()\n    pass',
    verification_script: verify('max_of_three', ['(1,2,3)', '(5,3,4)', '(-1,-5,-2)', '(10,10,10)', '(0,0,1)'], 'a,b,c=args[0],args[1],args[2]\nif a>=b and a>=c: return a\nelif b>=a and b>=c: return b\nreturn c')
  },
  {
    id: 14, title: '14. FizzBuzz',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>fizzbuzz(n)</code> that takes an integer and returns:\n- <code>"FizzBuzz"</code> if divisible by both 3 and 5\n- <code>"Fizz"</code> if divisible by 3 only\n- <code>"Buzz"</code> if divisible by 5 only\n- The number itself as a string otherwise\n\nThis is the most famous coding interview warm-up question. Order matters — always check the combined divisibility first.`,
      [
        { input: 'n = 15', output: '"FizzBuzz"', explanation: '15 is divisible by both 3 and 5' },
        { input: 'n = 9', output: '"Fizz"' },
        { input: 'n = 20', output: '"Buzz"' },
        { input: 'n = 7', output: '"7"' }
      ],
      []
    ),
    starter_code: 'def fizzbuzz(n):\n    # Return FizzBuzz, Fizz, Buzz, or the number as string\n    pass',
    verification_script: verify('fizzbuzz', ['15', '9', '20', '7', '1', '30', '5', '3'], 'n=args[0]\nif n%15==0: return "FizzBuzz"\nelif n%3==0: return "Fizz"\nelif n%5==0: return "Buzz"\nreturn str(n)')
  },
  {
    id: 15, title: '15. Vowel or Consonant',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>vowel_or_consonant(ch)</code> that takes a single character and returns <code>"Vowel"</code>, <code>"Consonant"</code>, or <code>"Neither"</code>.\n\nVowels are: a, e, i, o, u (both upper and lowercase). Any other letter is a consonant. Non-letter characters (digits, symbols, spaces) return <code>"Neither"</code>.`,
      [
        { input: 'ch = "a"', output: '"Vowel"' },
        { input: 'ch = "B"', output: '"Consonant"' },
        { input: 'ch = "3"', output: '"Neither"' }
      ],
      []
    ),
    starter_code: 'def vowel_or_consonant(ch):\n    # Return "Vowel", "Consonant", or "Neither"\n    pass',
    verification_script: verify('vowel_or_consonant', ['"a"', '"B"', '"3"', '"U"', '"z"', '"!"', '" "'], 'c=args[0].lower()\nif not c.isalpha(): return "Neither"\nreturn "Vowel" if c in "aeiou" else "Consonant"')
  },
  {
    id: 16, title: '16. Leap Year Check',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>is_leap_year(year)</code> that returns <code>True</code> if the given year is a leap year, <code>False</code> otherwise.\n\nLeap year rules:\n1. Divisible by 4 → potentially a leap year\n2. But if also divisible by 100 → NOT a leap year\n3. Unless also divisible by 400 → IS a leap year\n\nThis requires nested conditions or a single compound boolean expression.`,
      [
        { input: 'year = 2024', output: 'True', explanation: '2024 ÷ 4 = 0 remainder, not divisible by 100' },
        { input: 'year = 1900', output: 'False', explanation: '1900 ÷ 100 = 0, but 1900 ÷ 400 ≠ 0' },
        { input: 'year = 2000', output: 'True', explanation: '2000 ÷ 400 = 0, so it is a leap year' }
      ],
      []
    ),
    starter_code: 'def is_leap_year(year):\n    # Return True if leap year, False otherwise\n    pass',
    verification_script: verify('is_leap_year', ['2024', '1900', '2000', '2023', '100', '400'], 'y=args[0]\nreturn y%4==0 and (y%100!=0 or y%400==0)')
  },
  {
    id: 17, title: '17. Grade Calculator',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>calculate_grade(score)</code> that takes a score (0-100) and returns a letter grade:\n- Score >= 90 → <code>"A"</code>\n- Score >= 80 → <code>"B"</code>\n- Score >= 70 → <code>"C"</code>\n- Score >= 60 → <code>"D"</code>\n- Score < 60 → <code>"F"</code>\n- Score < 0 or > 100 → <code>"Invalid"</code>`,
      [
        { input: 'score = 95', output: '"A"' },
        { input: 'score = 72', output: '"C"' },
        { input: 'score = 55', output: '"F"' },
        { input: 'score = -5', output: '"Invalid"' }
      ],
      []
    ),
    starter_code: 'def calculate_grade(score):\n    # Return letter grade A-F or Invalid\n    pass',
    verification_script: verify('calculate_grade', ['95', '82', '70', '59', '-5', '101', '60', '80', '90'], 's=args[0]\nif s<0 or s>100: return "Invalid"\nelif s>=90: return "A"\nelif s>=80: return "B"\nelif s>=70: return "C"\nelif s>=60: return "D"\nreturn "F"')
  },
  {
    id: 18, title: '18. Season Detector',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>get_season(month)</code> that takes a month number (1-12) and returns the season:\n- Dec, Jan, Feb (12, 1, 2) → <code>"Winter"</code>\n- Mar, Apr, May (3, 4, 5) → <code>"Spring"</code>\n- Jun, Jul, Aug (6, 7, 8) → <code>"Summer"</code>\n- Sep, Oct, Nov (9, 10, 11) → <code>"Autumn"</code>\n- Any other number → <code>"Invalid"</code>`,
      [
        { input: 'month = 1', output: '"Winter"' },
        { input: 'month = 7', output: '"Summer"' },
        { input: 'month = 13', output: '"Invalid"' }
      ],
      []
    ),
    starter_code: 'def get_season(month):\n    # Return the season name\n    pass',
    verification_script: verify('get_season', ['1', '2', '3', '6', '9', '12', '13', '0'], 'm=args[0]\nif m in [12,1,2]: return "Winter"\nelif m in [3,4,5]: return "Spring"\nelif m in [6,7,8]: return "Summer"\nelif m in [9,10,11]: return "Autumn"\nreturn "Invalid"')
  },
  {
    id: 19, title: '19. Valid Triangle Check',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>is_valid_triangle(a, b, c)</code> that returns <code>True</code> if the three sides form a valid triangle, <code>False</code> otherwise.\n\nA triangle is valid if the sum of any two sides is strictly greater than the third side. This must hold for all three combinations.`,
      [
        { input: 'a=3, b=4, c=5', output: 'True', explanation: '3+4>5, 3+5>4, 4+5>3' },
        { input: 'a=1, b=2, c=3', output: 'False', explanation: '1+2=3 is not strictly greater' },
        { input: 'a=0, b=2, c=3', output: 'False', explanation: 'Side of length 0 is invalid' }
      ],
      []
    ),
    starter_code: 'def is_valid_triangle(a, b, c):\n    # Return True if valid triangle\n    pass',
    verification_script: verify('is_valid_triangle', ['(3,4,5)', '(1,2,3)', '(5,12,13)', '(0,2,3)', '(10,1,1)'], 'a,b,c=args[0],args[1],args[2]\nreturn a+b>c and a+c>b and b+c>a')
  },
  {
    id: 20, title: '20. Ticket Price Calculator',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>ticket_price(age, is_student)</code> that returns ticket price based on rules:\n- Children under 5 → Free (<code>0</code>)\n- Seniors 65+ → <code>5</code> (50% discount)\n- Students → <code>8</code> (20% discount)\n- Everyone else → <code>10</code> (full price)\n\nNote: the age rules take priority over the student discount.`,
      [
        { input: 'age=4, is_student=False', output: '0' },
        { input: 'age=70, is_student=False', output: '5' },
        { input: 'age=20, is_student=True', output: '8' },
        { input: 'age=30, is_student=False', output: '10' }
      ],
      []
    ),
    starter_code: 'def ticket_price(age, is_student):\n    # Return ticket price as integer\n    pass',
    verification_script: verify('ticket_price', ['(4,False)', '(70,False)', '(20,True)', '(25,False)', '(5,True)', '(64,True)'], 'age,stud=args[0],args[1]\nif age<5: return 0\nelif age>=65: return 5\nelif stud: return 8\nreturn 10')
  },
  {
    id: 21, title: '21. BMI Classifier',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>bmi_classify(weight, height)</code> that computes BMI = weight(kg) / height(m)² and returns:\n- BMI < 18.5 → <code>"Underweight"</code>\n- 18.5 ≤ BMI < 25 → <code>"Normal"</code>\n- 25 ≤ BMI < 30 → <code>"Overweight"</code>\n- BMI ≥ 30 → <code>"Obese"</code>`,
      [
        { input: 'weight=40, height=1.60', output: '"Underweight"', explanation: 'BMI = 40/1.6² = 15.6' },
        { input: 'weight=70, height=1.75', output: '"Normal"', explanation: 'BMI = 70/1.75² = 22.9' }
      ],
      []
    ),
    starter_code: 'def bmi_classify(weight, height):\n    # Calculate BMI and return category\n    pass',
    verification_script: verify('bmi_classify', ['(50,1.60)', '(40,1.60)', '(80,1.60)', '(70,1.60)', '(100,1.75)'], 'w,h=args[0],args[1]\nbmi=w/(h*h)\nif bmi<18.5: return "Underweight"\nelif bmi<25.0: return "Normal"\nelif bmi<30.0: return "Overweight"\nreturn "Obese"')
  },
  {
    id: 22, title: '22. Rock Paper Scissors',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>rps_winner(p1, p2)</code> that takes two choices (<code>"rock"</code>, <code>"paper"</code>, or <code>"scissors"</code>) and returns <code>"Player 1"</code>, <code>"Player 2"</code>, or <code>"Draw"</code>.\n\nRules: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.`,
      [
        { input: 'p1="rock", p2="scissors"', output: '"Player 1"' },
        { input: 'p1="paper", p2="paper"', output: '"Draw"' },
        { input: 'p1="scissors", p2="rock"', output: '"Player 2"' }
      ],
      []
    ),
    starter_code: 'def rps_winner(p1, p2):\n    # Return who wins or "Draw"\n    pass',
    verification_script: verify('rps_winner', ['("rock","scissors")', '("paper","paper")', '("scissors","rock")', '("paper","rock")', '("rock","paper")'], 'p1,p2=args[0],args[1]\nif p1==p2: return "Draw"\nwins=[("rock","scissors"),("scissors","paper"),("paper","rock")]\nreturn "Player 1" if (p1,p2) in wins else "Player 2"')
  },
  {
    id: 23, title: '23. Simple Calculator',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>calculate(a, b, op)</code> that performs the operation specified by the string <code>op</code> on numbers <code>a</code> and <code>b</code>. Supported operators: <code>"+"</code>, <code>"-"</code>, <code>"*"</code>, <code>"/"</code>.\n\nReturn <code>"Error: Division by zero"</code> if op is <code>"/"</code> and b is 0. Return <code>"Error: Invalid operator"</code> for unknown operators.`,
      [
        { input: 'a=10, b=5, op="+"', output: '15' },
        { input: 'a=10, b=0, op="/"', output: '"Error: Division by zero"' },
        { input: 'a=5, b=2, op="%"', output: '"Error: Invalid operator"' }
      ],
      []
    ),
    starter_code: 'def calculate(a, b, op):\n    # Return result or error string\n    pass',
    verification_script: verify('calculate', ['(10,5,"+")', '(10,3,"-")', '(4,3,"*")', '(10,5,"/")', '(10,0,"/")', '(5,2,"%")'], 'a,b,op=args[0],args[1],args[2]\nif op=="+":\n    return a+b\nelif op=="-":\n    return a-b\nelif op=="*":\n    return a*b\nelif op=="/":\n    if b==0: return "Error: Division by zero"\n    return a/b\nreturn "Error: Invalid operator"')
  },
  {
    id: 24, title: '24. Character Classifier',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      `Write a function <code>classify_char(ch)</code> that takes a single character and returns its category:\n- Uppercase letter → <code>"Uppercase"</code>\n- Lowercase letter → <code>"Lowercase"</code>\n- Digit (0–9) → <code>"Digit"</code>\n- Anything else → <code>"Special"</code>`,
      [
        { input: 'ch = "A"', output: '"Uppercase"' },
        { input: 'ch = "z"', output: '"Lowercase"' },
        { input: 'ch = "5"', output: '"Digit"' },
        { input: 'ch = "#"', output: '"Special"' }
      ],
      []
    ),
    starter_code: 'def classify_char(ch):\n    # Return the character category\n    pass',
    verification_script: verify('classify_char', ['"A"', '"z"', '"5"', '"#"', '" "', '"Z"', '"0"', '"!"'], 'c=args[0]\nif c.isupper(): return "Uppercase"\nelif c.islower(): return "Lowercase"\nelif c.isdigit(): return "Digit"\nreturn "Special"')
  },
  {
    id: 25, title: '25. Quadratic Roots Counter',
    difficulty: 'medium', points: 200, category: 'python-basics',
    description: desc(
      `Write a function <code>count_roots(a, b, c)</code> that determines how many real roots the quadratic equation <code>ax² + bx + c = 0</code> has.\n\nUse the discriminant: <code>D = b² - 4ac</code>\n- D > 0 → 2 real roots\n- D = 0 → 1 real root (repeated)\n- D < 0 → 0 real roots\n\nAssume a ≠ 0.`,
      [
        { input: 'a=1, b=-3, c=2', output: '2', explanation: 'D = 9-8 = 1 > 0 → two roots' },
        { input: 'a=1, b=2, c=1', output: '1', explanation: 'D = 4-4 = 0 → one root' },
        { input: 'a=1, b=1, c=1', output: '0', explanation: 'D = 1-4 = -3 < 0 → no real roots' }
      ],
      ['a is always non-zero']
    ),
    starter_code: 'def count_roots(a, b, c):\n    # Return number of real roots: 0, 1, or 2\n    pass',
    verification_script: verify('count_roots', ['(1,-3,2)', '(1,2,1)', '(1,1,1)', '(2,4,2)', '(1,0,-1)'], 'a,b,c=args[0],args[1],args[2]\nd=b*b-4*a*c\nif d>0: return 2\nelif d==0: return 1\nreturn 0')
  }
];

// ─── SECTION 3: MATH LOGIC (IDs 26-55) — from math.md ───────
const mathMappings = {
  1: { id:26, func:'even_or_odd', diff:'easy', pts:100, starter:'def even_or_odd(n):\n    # Return "Even" or "Odd"\n    pass', ref:`return "Even" if args[0] % 2 == 0 else "Odd"`, tcs:['42','-17','0','-2','100'] },
  2: { id:27, func:'reverse_integer', diff:'easy', pts:100, starter:'def reverse_integer(n):\n    # Reverse the digits of n\n    pass', ref:`sign=-1 if args[0]<0 else 1\nreturn int(str(abs(args[0]))[::-1])*sign`, tcs:['5792','-408','9300','0','7'] },
  3: { id:28, func:'count_digits', diff:'easy', pts:100, starter:'def count_digits(n):\n    # Count digits in n\n    pass', ref:`return len(str(abs(args[0])))`, tcs:['34521','-9','0','-500','100000'] },
  4: { id:29, func:'sum_of_digits', diff:'easy', pts:100, starter:'def sum_of_digits(n):\n    # Sum all digits of n\n    pass', ref:`return sum(int(d) for d in str(abs(args[0])))`, tcs:['1234','-506','0','-45'] },
  5: { id:30, func:'swap_numbers', diff:'easy', pts:100, starter:'def swap_numbers(a, b):\n    # Return (b, a) swapped\n    pass', ref:`return (args[1],args[0])`, tcs:['(5,10)','(-3,7)','(4,4)'] },
  6: { id:31, func:'is_palindrome_number', diff:'easy', pts:100, starter:'def is_palindrome_number(n):\n    # Return True if palindrome number\n    pass', ref:`n=args[0]\nif n<0: return False\nreturn str(n)==str(n)[::-1]`, tcs:['1221','-121','10','0','12321'] },
  7: { id:32, func:'is_armstrong', diff:'easy', pts:100, starter:'def is_armstrong(n):\n    # Return True if Armstrong number\n    pass', ref:`n=args[0]\ns=str(n)\nl=len(s)\nreturn sum(int(d)**l for d in s)==n`, tcs:['153','123','1634','0','7','370'] },
  8: { id:33, func:'generate_fibonacci', diff:'easy', pts:100, starter:'def generate_fibonacci(n):\n    # Return list of first n Fibonacci numbers\n    pass', ref:`n=args[0]\nif n<=0: return []\nif n==1: return [0]\nres=[0,1]\nwhile len(res)<n:\n    res.append(res[-1]+res[-2])\nreturn res`, tcs:['5','1','0','2','8'] },
  9: { id:34, func:'nth_fibonacci', diff:'easy', pts:100, starter:'def nth_fibonacci(n):\n    # Return the nth Fibonacci number (0-indexed)\n    pass', ref:`n=args[0]\nif n<=0: return 0\nif n==1: return 1\na,b=0,1\nfor _ in range(2,n+1):\n    a,b=b,a+b\nreturn b`, tcs:['0','1','2','9','10'] },
  10: { id:35, func:'factorial', diff:'easy', pts:100, starter:'def factorial(n):\n    # Return n! (n factorial)\n    pass', ref:`import math\nreturn math.factorial(args[0])`, tcs:['5','0','1','10','7'] },
  11: { id:36, func:'is_prime', diff:'easy', pts:100, starter:'def is_prime(n):\n    # Return True if n is prime\n    pass', ref:`n=args[0]\nif n<=1: return False\nfor i in range(2,int(n**0.5)+1):\n    if n%i==0: return False\nreturn True`, tcs:['11','4','1','2','9','-5','97'] },
  12: { id:37, func:'count_primes', diff:'medium', pts:200, starter:'def count_primes(n):\n    # Count primes strictly less than n\n    pass', ref:`n=args[0]\nif n<=2: return 0\nip=[True]*n\nip[0]=ip[1]=False\nfor i in range(2,int(n**0.5)+1):\n    if ip[i]:\n        for j in range(i*i,n,i):\n            ip[j]=False\nreturn sum(ip)`, tcs:['10','2','0','1','100'] },
  13: { id:38, func:'gcd_lcm', diff:'easy', pts:100, starter:'def gcd_lcm(a, b):\n    # Return (gcd, lcm) as a tuple\n    pass', ref:`import math\na,b=args[0],args[1]\nx,y=abs(a),abs(b)\ng=math.gcd(x,y)\nif g==0: return (0,0)\nl=(x//g)*y\nreturn (g,l)`, tcs:['(24,36)','(7,9)','(0,8)','(-24,36)','(12,18)'] },
  14: { id:39, func:'trailing_zeroes', diff:'easy', pts:100, starter:'def trailing_zeroes(n):\n    # Count trailing zeros in n!\n    pass', ref:`n=args[0]\ncount=0\nwhile n>=5:\n    count+=n//5\n    n//=5\nreturn count`, tcs:['5','3','0','25','125'] },
  15: { id:40, func:'is_happy', diff:'easy', pts:100, starter:'def is_happy(n):\n    # Return True if n is a happy number\n    pass', ref:`n=args[0]\nseen=set()\nwhile n!=1 and n not in seen:\n    seen.add(n)\n    n=sum(int(d)**2 for d in str(n))\nreturn n==1`, tcs:['19','2','7','1','4'] },
  16: { id:41, func:'is_ugly', diff:'easy', pts:100, starter:'def is_ugly(n):\n    # Return True if n is an ugly number\n    pass', ref:`n=args[0]\nif n<=0: return False\nfor p in [2,3,5]:\n    while n%p==0:\n        n//=p\nreturn n==1`, tcs:['6','14','1','0','-8','30'] },
  17: { id:42, func:'add_digits', diff:'easy', pts:100, starter:'def add_digits(num):\n    # Repeatedly sum digits until single digit (digital root)\n    pass', ref:`num=args[0]\nif num==0: return 0\nreturn 9 if num%9==0 else num%9`, tcs:['38','0','9','18','999'] },
  18: { id:43, func:'my_pow', diff:'medium', pts:200, starter:'def my_pow(x, n):\n    # Implement x to the power n\n    pass', ref:`x,n=args[0],args[1]\nreturn round(x**n,5)`, tcs:['(2.0,10)','(2.1,3)','(2.0,-2)','(0.0,5)','(1.0,100)','(2.0,0)'] },
  19: { id:44, func:'roman_to_int', diff:'easy', pts:100, starter:'def roman_to_int(s):\n    # Convert Roman numeral string to integer\n    pass', ref:`s=args[0]\nroman={"I":1,"V":5,"X":10,"L":50,"C":100,"D":500,"M":1000}\nans=0\nfor i in range(len(s)):\n    if i+1<len(s) and roman[s[i]]<roman[s[i+1]]:\n        ans-=roman[s[i]]\n    else:\n        ans+=roman[s[i]]\nreturn ans`, tcs:['"III"','"MCMXCIV"','"CDXLIV"','"X"','"IV"'] },
  20: { id:45, func:'int_to_roman', diff:'medium', pts:200, starter:'def int_to_roman(num):\n    # Convert integer to Roman numeral string\n    pass', ref:`num=args[0]\nval=[1000,900,500,400,100,90,50,40,10,9,5,4,1]\nsyb=["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]\nrn=""\ni=0\nwhile num>0:\n    for _ in range(num//val[i]):\n        rn+=syb[i]\n        num-=val[i]\n    i+=1\nreturn rn`, tcs:['58','1994','3999','4','9'] },
  21: { id:46, func:'multiply_strings', diff:'medium', pts:200, starter:'def multiply_strings(num1, num2):\n    # Multiply two non-negative integers given as strings\n    pass', ref:`return str(int(args[0])*int(args[1]))`, tcs:['("2","3")','("123","456")','("0","456")','("999","999")','("1","0")'] },
  22: { id:47, func:'my_atoi', diff:'medium', pts:200, starter:'def my_atoi(s):\n    # Convert string to 32-bit signed integer (like C atoi)\n    pass', ref:`s=args[0].lstrip()\nif not s: return 0\nsign=1\ni=0\nif s[0]=="-":\n    sign=-1\n    i+=1\nelif s[0]=="+":\n    i+=1\nres=0\nwhile i<len(s) and s[i].isdigit():\n    res=res*10+int(s[i])\n    i+=1\nres*=sign\nINT_MIN,INT_MAX=-2**31,2**31-1\nreturn max(INT_MIN,min(INT_MAX,res))`, tcs:['"   -42"','"4193 with words"','"words and 987"','"9999999999"','"-9999999999"','"+"'] },
  23: { id:48, func:'next_greater_digit_arrangement', diff:'medium', pts:200, starter:'def next_greater_digit_arrangement(n):\n    # Find smallest integer greater than n with same digits\n    pass', ref:`n=args[0]\ndigits=list(str(n))\ni=len(digits)-2\nwhile i>=0 and digits[i]>=digits[i+1]:\n    i-=1\nif i<0: return -1\nj=len(digits)-1\nwhile digits[j]<=digits[i]:\n    j-=1\ndigits[i],digits[j]=digits[j],digits[i]\ndigits[i+1:]=reversed(digits[i+1:])\nres=int("".join(digits))\nreturn res if res<2**31 else -1`, tcs:['12','21','1999999999','987520','51111','230241'] },
  24: { id:49, func:'convert_to_base', diff:'medium', pts:200, starter:'def convert_to_base(num, base):\n    # Convert num to given base (2-9), return as string\n    pass', ref:`num,base=args[0],args[1]\nif num==0: return "0"\nsign="-" if num<0 else ""\nn=abs(num)\nres=[]\nwhile n>0:\n    res.append(str(n%base))\n    n//=base\nreturn sign+"".join(res[::-1])`, tcs:['(100,7)','(-7,7)','(0,7)','(5,2)','(-5,2)','(255,2)'] },
  25: { id:50, func:'excel_column_number', diff:'easy', pts:100, starter:'def excel_column_number(columnTitle):\n    # Convert Excel column title (e.g. "AB") to number\n    pass', ref:`t=args[0]\nans=0\nfor c in t:\n    ans=ans*26+(ord(c)-ord("A")+1)\nreturn ans`, tcs:['"AB"','"ZY"','"A"','"Z"','"FXSHRXW"'] },
  26: { id:51, func:'super_pow', diff:'hard', pts:300, starter:'def super_pow(a, b):\n    # Compute a^b mod 1337 where b is given as list of digits\n    pass', ref:`a,b=args[0],args[1]\nmod=1337\nreturn pow(a%mod,int("".join(map(str,b))),mod)`, tcs:['(2,[3])','(2,[1,0])','(2147483647,[2,0,0])'] },
  27: { id:52, func:'integer_break', diff:'hard', pts:300, starter:'def integer_break(n):\n    # Break n into positive integers summing to n, maximise product\n    pass', ref:`n=args[0]\nif n==2: return 1\nif n==3: return 2\nc3=n//3\nr=n%3\nif r==1:\n    return (3**(c3-1))*4\nelif r==2:\n    return (3**c3)*2\nreturn 3**c3`, tcs:['2','10','3','4','8'] },
  28: { id:53, func:'num_squares', diff:'medium', pts:200, starter:'def num_squares(n):\n    # Least number of perfect square numbers that sum to n\n    pass', ref:`n=args[0]\nwhile n%4==0: n//=4\nif n%8==7: return 4\nfor i in range(int(n**0.5)+1):\n    if i*i==n: return 1\nfor i in range(int(n**0.5)+1):\n    j2=n-i*i\n    j=int(j2**0.5)\n    if j*j==j2: return 2\nreturn 3`, tcs:['12','13','4','7','36'] },
  29: { id:54, func:'can_win_nim', diff:'easy', pts:100, starter:'def can_win_nim(n):\n    # Return True if first player wins Nim game\n    pass', ref:`return args[0]%4!=0`, tcs:['4','1','2','3','8','135'] },
  30: { id:55, func:'is_perfect_number', diff:'easy', pts:100, starter:'def is_perfect_number(n):\n    # Return True if n equals sum of its proper divisors\n    pass', ref:`n=args[0]\nif n<=1: return False\nreturn sum(i for i in range(1,n) if n%i==0)==n`, tcs:['6','28','12','1','496','8128'] },
};

// ─── SECTION 4: PATTERNS (IDs 56-77) — from patterns.md ─────
const patternDiffs = {1:'easy',2:'easy',3:'easy',4:'easy',5:'easy',6:'easy',7:'easy',8:'easy',
  9:'medium',10:'medium',11:'medium',12:'medium',13:'medium',14:'medium',
  15:'medium',16:'medium',17:'medium',18:'medium',19:'hard',20:'hard',21:'hard',22:'hard',23:'medium'};

// ─── SECTION 5: STRING METHODS (IDs 78-87) ──────────────────
const stringMethodQuestions = [
  {
    id: 78, title: '78. String Upper, Lower, Strip',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>clean_string(s)</code> that takes a string with possible leading/trailing whitespace and mixed case, and returns a tuple:\n<code>(stripped, upper, lower, title_case)</code>\n\nUse Python's built-in string methods: <code>.strip()</code>, <code>.upper()</code>, <code>.lower()</code>, <code>.title()</code>`,
      [
        { input: 's = "  hello world  "', output: '("hello world", "HELLO WORLD", "hello world", "Hello World")', explanation: '.strip() removes spaces, .title() capitalizes each word' },
        { input: 's = "  PyTHON  "', output: '("PyTHON", "PYTHON", "python", "Python")' }
      ],
      []
    ),
    starter_code: 'def clean_string(s):\n    # Return (stripped, upper, lower, title_case)\n    pass',
    verification_script: verify('clean_string', ['"  hello world  "', '"  PyTHON  "', '"TEST"', '"  a  b  "'], 'r=args[0].strip()\nreturn (r, r.upper(), r.lower(), r.title())')
  },
  {
    id: 79, title: '79. Split and Join',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>split_and_join(sentence)</code> that takes a sentence string, splits it into words, and then returns a tuple:\n<code>(words_list, word_count, joined_with_dash)</code>\n\nUse <code>.split()</code> which splits on whitespace by default, and <code>"-".join(lst)</code> to join with a dash separator.`,
      [
        { input: 's = "the quick brown fox"', output: '(["the","quick","brown","fox"], 4, "the-quick-brown-fox")' },
        { input: 's = "hello world"', output: '(["hello","world"], 2, "hello-world")' }
      ],
      []
    ),
    starter_code: 'def split_and_join(sentence):\n    # Return (words_list, word_count, joined_with_dash)\n    pass',
    verification_script: verify('split_and_join', ['"the quick brown fox"', '"hello world"', '"single"', '"a b c d e"'], 'words=args[0].split()\nreturn (words, len(words), "-".join(words))')
  },
  {
    id: 80, title: '80. Replace and Find',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>modify_string(s, old, new_val)</code> that returns a tuple:\n<code>(replaced, first_index, count)</code>\n\nWhere:\n- <code>replaced</code> = the string with all occurrences of <code>old</code> replaced by <code>new_val</code>\n- <code>first_index</code> = the index of first occurrence of <code>old</code> (-1 if not found)\n- <code>count</code> = how many times <code>old</code> appears\n\nUse <code>.replace()</code>, <code>.find()</code>, and <code>.count()</code>.`,
      [
        { input: 's="hello world", old="l", new_val="L"', output: '("heLLo worLd", 2, 3)' },
        { input: 's="python", old="z", new_val="Z"', output: '("python", -1, 0)' }
      ],
      []
    ),
    starter_code: 'def modify_string(s, old, new_val):\n    # Return (replaced, first_index, count)\n    pass',
    verification_script: verify('modify_string', ['("hello world","l","L")', '("python","z","Z")', '("abcabc","a","X")', '("aaa","a","b")'], 's,old,new=args[0],args[1],args[2]\nreturn (s.replace(old,new), s.find(old), s.count(old))')
  },
  {
    id: 81, title: '81. Starts With & Ends With',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>check_affixes(s, prefix, suffix)</code> that returns a tuple:\n<code>(starts_with_prefix, ends_with_suffix, both)</code> — all boolean values.\n\nUse Python's <code>.startswith()</code> and <code>.endswith()</code> string methods.`,
      [
        { input: 's="Python Programming", prefix="Py", suffix="ing"', output: '(True, True, True)' },
        { input: 's="Hello World", prefix="Hi", suffix="World"', output: '(False, True, False)' }
      ],
      []
    ),
    starter_code: 'def check_affixes(s, prefix, suffix):\n    # Return (starts, ends, both) as booleans\n    pass',
    verification_script: verify('check_affixes', ['("Python Programming","Py","ing")', '("Hello World","Hi","World")', '("abc","a","c")', '("abc","x","y")'], 's,p,su=args[0],args[1],args[2]\nst=s.startswith(p)\nen=s.endswith(su)\nreturn (st,en,st and en)')
  },
  {
    id: 82, title: '82. isalpha, isdigit, isalnum',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>check_string_type(s)</code> that returns a tuple:\n<code>(is_alpha, is_digit, is_alnum, is_space)</code>\n\nUse the built-in string methods <code>.isalpha()</code>, <code>.isdigit()</code>, <code>.isalnum()</code>, <code>.isspace()</code>. Each returns True only if ALL characters in the string satisfy the condition.`,
      [
        { input: 's = "Hello"', output: '(True, False, True, False)' },
        { input: 's = "12345"', output: '(False, True, True, False)' },
        { input: 's = "Hello123"', output: '(False, False, True, False)' }
      ],
      ['s is a non-empty string']
    ),
    starter_code: 'def check_string_type(s):\n    # Return (is_alpha, is_digit, is_alnum, is_space)\n    pass',
    verification_script: verify('check_string_type', ['"Hello"', '"12345"', '"Hello123"', '"   "', '"abc!"'], 's=args[0]\nreturn (s.isalpha(), s.isdigit(), s.isalnum(), s.isspace())')
  },
  {
    id: 83, title: '83. Count Specific Characters',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>char_counts(s)</code> that takes a string and returns a tuple:\n<code>(vowels, consonants, digits, spaces, specials)</code>\n\nCount each type of character in the string. Vowels are a,e,i,o,u (case-insensitive). Consonants are other letters. Specials are anything else that's not a digit or space.`,
      [
        { input: 's = "Hello World 2024!"', output: '(3, 7, 4, 1, 1)', explanation: 'Vowels: e,o,o=3 | Consonants: H,l,l,W,r,l,d=7 | Digits: 2024=4 | Spaces: 1 | Specials: !=1' },
        { input: 's = "abc"', output: '(1, 2, 0, 0, 0)' }
      ],
      []
    ),
    starter_code: 'def char_counts(s):\n    # Return (vowels, consonants, digits, spaces, specials)\n    pass',
    verification_script: verify('char_counts', ['"Hello World 2024!"', '"abc"', '"12 + 34"', '""'], 's=args[0]\nv=sum(1 for c in s if c.lower() in "aeiou")\nco=sum(1 for c in s if c.isalpha() and c.lower() not in "aeiou")\nd=sum(1 for c in s if c.isdigit())\nsp=sum(1 for c in s if c==" ")\nspec=sum(1 for c in s if not c.isalnum() and c!=" ")\nreturn (v,co,d,sp,spec)')
  },
  {
    id: 84, title: '84. String Padding & Alignment',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>align_string(s, width)</code> that returns a tuple of the string aligned three ways within a field of the given <code>width</code>:\n<code>(left_aligned, right_aligned, center_aligned)</code>\n\nUse Python's string methods <code>.ljust(width)</code>, <code>.rjust(width)</code>, <code>.center(width)</code>.`,
      [
        { input: 's="hi", width=6', output: '("hi    ", "    hi", "  hi  ")' },
        { input: 's="abc", width=5', output: '("abc  ", "  abc", " abc ")' }
      ],
      ['width is always >= len(s)']
    ),
    starter_code: 'def align_string(s, width):\n    # Return (left, right, center) aligned strings\n    pass',
    verification_script: verify('align_string', ['("hi",6)', '("abc",5)', '("x",4)', '("python",10)'], 's,w=args[0],args[1]\nreturn (s.ljust(w),s.rjust(w),s.center(w))')
  },
  {
    id: 85, title: '85. Palindrome Using String Methods',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>is_palindrome_clean(s)</code> that checks if a string is a palindrome after cleaning it.\n\nCleaning steps (using string methods):\n1. Convert to lowercase with <code>.lower()</code>\n2. Keep only alphanumeric characters — iterate and use <code>.isalnum()</code>\n3. Compare the cleaned string with its reverse (<code>[::-1]</code>)`,
      [
        { input: 's = "A man, a plan, a canal: Panama"', output: 'True' },
        { input: 's = "race a car"', output: 'False' },
        { input: 's = "Was it a car or a cat I saw?"', output: 'True' }
      ],
      []
    ),
    starter_code: 'def is_palindrome_clean(s):\n    # Clean s and check if palindrome\n    pass',
    verification_script: verify('is_palindrome_clean', ['"A man, a plan, a canal: Panama"', '"race a car"', '"Was it a car or a cat I saw?"', '""', '"a"'], 's=args[0]\nclean="".join(c for c in s.lower() if c.isalnum())\nreturn clean==clean[::-1]')
  },
  {
    id: 86, title: '86. Word Frequency',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>word_frequency(sentence)</code> that takes a sentence string, splits it into words (lowercased), and returns a dictionary mapping each unique word to its count.\n\nThis combines <code>.lower()</code>, <code>.split()</code>, and dictionary operations.`,
      [
        { input: 's = "the cat sat on the mat"', output: '{"the": 2, "cat": 1, "sat": 1, "on": 1, "mat": 1}' },
        { input: 's = "hello hello world"', output: '{"hello": 2, "world": 1}' }
      ],
      []
    ),
    starter_code: 'def word_frequency(sentence):\n    # Return dict of word: count\n    pass',
    verification_script: verify('word_frequency', ['"the cat sat on the mat"', '"hello hello world"', '"a a a"', '"one"'], 'words=args[0].lower().split()\nfreq={}\nfor w in words:\n    freq[w]=freq.get(w,0)+1\nreturn freq')
  },
  {
    id: 87, title: '87. Format a Report Line',
    difficulty: 'easy', points: 100, category: 'python-advanced',
    description: desc(
      `Write a function <code>format_report(name, score, rank)</code> that returns a neatly formatted report line using an f-string:\n\n<code>f"Rank {rank:02d} | {name:<15} | Score: {score:06.2f}"</code>\n\nFormat specifiers:\n- <code>:02d</code> → integer with leading zeros (min width 2)\n- <code>:<15</code> → left-align with width 15\n- <code>:06.2f</code> → float with 2 decimal places, min width 6, leading zeros`,
      [
        { input: 'name="Alice", score=95.5, rank=1', output: '"Rank 01 | Alice           | Score: 095.50"' },
        { input: 'name="Bob", score=7.3, rank=10', output: '"Rank 10 | Bob             | Score: 007.30"' }
      ],
      []
    ),
    starter_code: 'def format_report(name, score, rank):\n    # Return the formatted report line\n    pass',
    verification_script: verify('format_report', ['("Alice",95.5,1)', '("Bob",7.3,10)', '("Charlie",100.0,3)'], 'n,sc,rk=args[0],args[1],args[2]\nreturn f"Rank {rk:02d} | {n:<15} | Score: {sc:06.2f}"')
  }
];

// ─── SECTION 6: STRING ALGORITHMS (IDs 88-105) — from string.md ─
// Skip Q1 (Reverse String — duplicate). Use Q2-Q19 → IDs 88-105
const stringAlgoMappings = {
  2: { id:88, func:'is_palindrome', diff:'easy', pts:100, starter:'def is_palindrome(s):\n    pass', ref:'import re\nclean=re.sub(r"[^a-zA-Z0-9]","",args[0]).lower()\nreturn clean==clean[::-1]', tcs:['"A man, a plan, a canal: Panama"','"race a car"','""'] },
  3: { id:89, func:'count_vowels_consonants_digits', diff:'easy', pts:100, starter:'def count_vowels_consonants_digits(s):\n    pass', ref:'v=sum(1 for c in args[0] if c.lower() in "aeiou")\nc=sum(1 for c in args[0] if c.isalpha() and c.lower() not in "aeiou")\nd=sum(1 for c in args[0] if c.isdigit())\nreturn (v,c,d)', tcs:['"Hello World 2026!"','"xyz"','""'] },
  4: { id:90, func:'first_uniq_char', diff:'easy', pts:100, starter:'def first_uniq_char(s):\n    pass', ref:'s=args[0]\nfor idx,char in enumerate(s):\n    if s.count(char)==1:\n        return idx\nreturn -1', tcs:['"leetcode"','"loveleetcode"','"aabb"','"a"'] },
  5: { id:91, func:'toggle_case', diff:'easy', pts:100, starter:'def toggle_case(s):\n    pass', ref:'return args[0].swapcase()', tcs:['"Hello World!"','"123"','""'] },
  6: { id:92, func:'is_anagram', diff:'easy', pts:100, starter:'def is_anagram(s, t):\n    pass', ref:'return sorted(args[0])==sorted(args[1])', tcs:['("anagram","nagaram")',('("rat","car")')] },
  7: { id:93, func:'valid_palindrome_ii', diff:'easy', pts:100, starter:'def valid_palindrome_ii(s):\n    pass', ref:'s=args[0]\nleft,right=0,len(s)-1\nwhile left<right:\n    if s[left]!=s[right]:\n        s1,s2=s[left:right],s[left+1:right+1]\n        return s1==s1[::-1] or s2==s2[::-1]\n    left,right=left+1,right-1\nreturn True', tcs:['"aba"','"abca"','"abc"'] },
  8: { id:94, func:'compress', diff:'medium', pts:200, starter:'def compress(chars):\n    pass', isMutating:true },
  9: { id:95, func:'reverse_words', diff:'easy', pts:100, starter:'def reverse_words(s):\n    pass', ref:'return " ".join(args[0].split()[::-1])', tcs:['"the sky is blue"','"  hello world  "','"a good   example"'] },
  10: { id:96, func:'longest_palindrome', diff:'medium', pts:200, starter:'def longest_palindrome(s):\n    pass', ref:'s=args[0]\nif not s: return ""\nres=""\nfor i in range(len(s)):\n    l,r=i,i\n    while l>=0 and r<len(s) and s[l]==s[r]:\n        if (r-l+1)>len(res): res=s[l:r+1]\n        l-=1;r+=1\n    l,r=i,i+1\n    while l>=0 and r<len(s) and s[l]==s[r]:\n        if (r-l+1)>len(res): res=s[l:r+1]\n        l-=1;r+=1\nreturn res', tcs:['"babad"','"cbbd"','"a"'] },
  11: { id:97, func:'is_subsequence', diff:'easy', pts:100, starter:'def is_subsequence(s, t):\n    pass', ref:'s,t=args[0],args[1]\ni,j=0,0\nwhile i<len(s) and j<len(t):\n    if s[i]==t[j]: i+=1\n    j+=1\nreturn i==len(s)', tcs:['("abc","ahbgdc")',('("axc","ahbgdc")')] },
  12: { id:98, func:'str_str', diff:'easy', pts:100, starter:'def str_str(haystack, needle):\n    pass', ref:'return args[0].find(args[1])', tcs:['("sadbutsad","sad")',('("leetcode","leeto")')] },
  13: { id:99, func:'length_of_longest_substring', diff:'medium', pts:200, starter:'def length_of_longest_substring(s):\n    pass', ref:'s=args[0]\nused={}\nstart=0\nmax_len=0\nfor i,c in enumerate(s):\n    if c in used and start<=used[c]:\n        start=used[c]+1\n    else:\n        max_len=max(max_len,i-start+1)\n    used[c]=i\nreturn max_len', tcs:['"abcabcbb"','"bbbbb"','"pwwkew"'] },
  14: { id:100, func:'min_window', diff:'hard', pts:300, starter:'def min_window(s, t):\n    pass', ref:'s,t=args[0],args[1]\nfrom collections import Counter\nif not t or not s: return ""\ndict_t=Counter(t)\nrequired=len(dict_t)\nfiltered_s=[(i,char) for i,char in enumerate(s) if char in dict_t]\nl,r=0,0\nformed=0\nwc={}\nans=float("inf"),None,None\nwhile r<len(filtered_s):\n    character=filtered_s[r][1]\n    wc[character]=wc.get(character,0)+1\n    if wc[character]==dict_t[character]:\n        formed+=1\n    while l<=r and formed==required:\n        character=filtered_s[l][1]\n        end=filtered_s[r][0]\n        start=filtered_s[l][0]\n        if end-start+1<ans[0]:\n            ans=(end-start+1,start,end)\n        wc[character]-=1\n        if wc[character]<dict_t[character]:\n            formed-=1\n        l+=1\n    r+=1\nreturn "" if ans[0]==float("inf") else s[ans[1]:ans[2]+1]', tcs:['("ADOBECODEBANC","ABC")',('("a","a")'),('("a","aa")')] },
  15: { id:101, func:'find_anagrams', diff:'medium', pts:200, starter:'def find_anagrams(s, p):\n    pass', ref:'s,p=args[0],args[1]\nfrom collections import Counter\nres=[]\nns,np=len(s),len(p)\nif ns<np: return []\npc=Counter(p)\nsc=Counter()\nfor i in range(ns):\n    sc[s[i]]+=1\n    if i>=np:\n        if sc[s[i-np]]==1:\n            del sc[s[i-np]]\n        else:\n            sc[s[i-np]]-=1\n    if pc==sc:\n        res.append(i-np+1)\nreturn res', tcs:['("cbaebabacd","abc")',('("abab","ab")')] },
  16: { id:102, func:'add_strings', diff:'easy', pts:100, starter:'def add_strings(num1, num2):\n    pass', ref:'return str(int(args[0])+int(args[1]))', tcs:['("11","123")',('("456","77")'),('("0","0")')] },
  17: { id:103, func:'reverse_string_algo', diff:'easy', pts:100, starter:'def reverse_string_algo(s):\n    # Reverse using two-pointer technique (no slicing)\n    pass', ref:'lst=list(args[0])\nl,r=0,len(lst)-1\nwhile l<r:\n    lst[l],lst[r]=lst[r],lst[l]\n    l+=1;r-=1\nreturn "".join(lst)', tcs:['"hello"','"Python"','"a"','""','"abcde"'] },
  18: { id:104, func:'is_number', diff:'hard', pts:300, starter:'def is_number(s):\n    pass', ref:'import re\npattern=re.compile(r"^\\s*[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?\\s*$")\nreturn bool(pattern.match(args[0]))', tcs:['"0"','"e"','"."','"abc"','"1a"','"2e10"','"-90E3"','"99e2.5"'] },
  19: { id:105, func:'longest_common_prefix', diff:'easy', pts:100, starter:'def longest_common_prefix(strs):\n    pass', ref:'strs=args[0]\nif not strs: return ""\nprefix=strs[0]\nfor s in strs[1:]:\n    while not s.startswith(prefix):\n        prefix=prefix[:-1]\n        if not prefix: return ""\nreturn prefix', tcs:['["flower","flow","flight"]','["dog","racecar","car"]','[]','["abc"]'] },
};

// ─── SECTION 7: LIST BASICS (IDs 106-113) ───────────────────
const listBasicsQuestions = [
  {
    id:106, title:'106. List Methods — Append, Pop, Insert',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>list_operations(nums)</code> that takes a list and performs these operations in sequence, returning the final list:\n1. Append 100 to the end\n2. Insert 0 at position 0 (front)\n3. Pop the last element\n4. Return the modified list`,
      [
        {input:'nums = [1, 2, 3]', output:'[0, 1, 2, 3]', explanation:'append 100 → [1,2,3,100], insert 0 at front → [0,1,2,3,100], pop → [0,1,2,3]'},
        {input:'nums = [5]', output:'[0, 5]'}
      ], []
    ),
    starter_code:'def list_operations(nums):\n    # Modify the list in-place, return it\n    pass',
    verification_script: verify('list_operations', ['[1,2,3]','[5]','[]','[10,20]'], 'lst=list(args[0])\nlst.append(100)\nlst.insert(0,0)\nlst.pop()\nreturn lst')
  },
  {
    id:107, title:'107. List Slicing',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>slice_list(lst)</code> that returns a tuple of 5 different slices:\n<code>(first_three, last_three, every_second, reversed_list, middle)</code>\n\nWhere middle = everything except the first and last element. If the list has fewer than 3 elements, return empty list for those slices.`,
      [
        {input:'lst = [0,1,2,3,4,5,6,7,8,9]', output:'([0,1,2], [7,8,9], [0,2,4,6,8], [9,8,7,6,5,4,3,2,1,0], [1,2,3,4,5,6,7,8])'},
        {input:'lst = [1,2,3]', output:'([1,2,3], [1,2,3], [1,3], [3,2,1], [2])'}
      ], []
    ),
    starter_code:'def slice_list(lst):\n    # Return tuple of 5 slices\n    pass',
    verification_script: verify('slice_list', ['[0,1,2,3,4,5,6,7,8,9]','[1,2,3]','[10,20,30,40,50]'], 'l=args[0]\nreturn (l[:3],l[-3:],l[::2],l[::-1],l[1:-1])')
  },
  {
    id:108, title:'108. Sorting Lists',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>sort_info(lst)</code> that returns a tuple:\n<code>(sorted_asc, sorted_desc, min_val, max_val, sum_val)</code>\n\nUse <code>sorted()</code> (which returns a new list), not <code>.sort()</code> (which modifies in-place). Use built-in <code>min()</code>, <code>max()</code>, <code>sum()</code>.`,
      [
        {input:'lst = [3,1,4,1,5,9,2,6]', output:'([1,1,2,3,4,5,6,9], [9,6,5,4,3,2,1,1], 1, 9, 31)'},
        {input:'lst = [5]', output:'([5], [5], 5, 5, 5)'}
      ], []
    ),
    starter_code:'def sort_info(lst):\n    # Return (sorted_asc, sorted_desc, min, max, sum)\n    pass',
    verification_script: verify('sort_info', ['[3,1,4,1,5,9,2,6]','[5]','[-3,0,3]','[100,-100,0]'], 'l=args[0]\nreturn (sorted(l),sorted(l,reverse=True),min(l),max(l),sum(l))')
  },
  {
    id:109, title:'109. List Comprehension Basics',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>comprehension_ops(nums)</code> that returns a tuple of four new lists created using list comprehensions:\n\n1. Squares of all numbers: <code>[x**2 for x in nums]</code>\n2. Only even numbers: <code>[x for x in nums if x%2==0]</code>\n3. Absolute values: <code>[abs(x) for x in nums]</code>\n4. Strings of numbers: <code>[str(x) for x in nums]</code>`,
      [
        {input:'nums = [1,-2,3,-4,5]', output:'([1,4,9,16,25], [-2,-4], [1,2,3,4,5], ["1","-2","3","-4","5"])'}
      ], []
    ),
    starter_code:'def comprehension_ops(nums):\n    # Return tuple of 4 lists using comprehensions\n    pass',
    verification_script: verify('comprehension_ops', ['[1,-2,3,-4,5]','[0,2,4,6]','[-1,-2,-3]','[]'], 'n=args[0]\nreturn ([x**2 for x in n],[x for x in n if x%2==0],[abs(x) for x in n],[str(x) for x in n])')
  },
  {
    id:110, title:'110. 2D Lists (Matrix Basics)',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>matrix_info(matrix)</code> that takes a 2D list (list of lists) and returns a tuple:\n<code>(rows, cols, flat, transposed)</code>\n\nWhere:\n- <code>rows</code> = number of rows\n- <code>cols</code> = number of columns in row 0\n- <code>flat</code> = all elements in one list (flattened)\n- <code>transposed</code> = the matrix transposed (rows become columns)`,
      [
        {input:'matrix = [[1,2,3],[4,5,6]]', output:'(2, 3, [1,2,3,4,5,6], [[1,4],[2,5],[3,6]])'}
      ], []
    ),
    starter_code:'def matrix_info(matrix):\n    # Return (rows, cols, flat, transposed)\n    pass',
    verification_script: verify('matrix_info', ['[[1,2,3],[4,5,6]]','[[1,2],[3,4],[5,6]]','[[1]]'], 'm=args[0]\nr=len(m)\nc=len(m[0]) if m else 0\nflat=[x for row in m for x in row]\ntrans=[[m[i][j] for i in range(r)] for j in range(c)]\nreturn (r,c,flat,trans)')
  },
  {
    id:111, title:'111. zip and enumerate',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>zip_and_enumerate(names, scores)</code> that:\n1. Creates a list of <code>(index, name, score)</code> tuples using <code>enumerate</code> and <code>zip</code>\n2. Returns the tuple list sorted by score descending\n\nThis teaches two of Python's most useful built-in functions for iterating over sequences.`,
      [
        {input:'names=["Alice","Bob","Carol"], scores=[85,92,78]', output:'[(1,"Bob",92),(0,"Alice",85),(2,"Carol",78)]', explanation:'Sorted by score descending'}
      ], ['Both lists have the same length']
    ),
    starter_code:'def zip_and_enumerate(names, scores):\n    # Return list of (idx, name, score) sorted by score descending\n    pass',
    verification_script: verify('zip_and_enumerate', ['(["Alice","Bob","Carol"],[85,92,78])', '(["X","Y"],[1,2])'], 'names,scores=args[0],args[1]\nresult=[(i,n,s) for i,(n,s) in enumerate(zip(names,scores))]\nreturn sorted(result,key=lambda x:x[2],reverse=True)')
  },
  {
    id:112, title:'112. Remove Duplicates & Keep Order',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>unique_ordered(lst)</code> that removes duplicate elements from a list while maintaining the original order of first occurrences.\n\nFor example: <code>[3,1,2,1,3]</code> → <code>[3,1,2]</code>\n\nHint: Use a set to track seen elements and a list comprehension.`,
      [
        {input:'lst = [3,1,2,1,3,4]', output:'[3,1,2,4]'},
        {input:'lst = [1,1,1,2]', output:'[1,2]'},
        {input:'lst = []', output:'[]'}
      ], []
    ),
    starter_code:'def unique_ordered(lst):\n    # Remove duplicates preserving order\n    pass',
    verification_script: verify('unique_ordered', ['[3,1,2,1,3,4]','[1,1,1,2]','[]','[5,4,3,2,1]','[1,2,1,2]'], 'seen=set()\nres=[]\nfor x in args[0]:\n    if x not in seen:\n        seen.add(x)\n        res.append(x)\nreturn res')
  },
  {
    id:113, title:'113. Flatten Nested List',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>flatten(nested)</code> that takes a list that may contain integers or other lists (one level of nesting), and returns a single flat list with all integers.\n\nFor example: <code>[[1,2],[3,[4]],5]</code> → <code>[1,2,3,4,5]</code> — only one level of nesting is guaranteed.`,
      [
        {input:'nested = [[1,2],[3,4],[5]]', output:'[1,2,3,4,5]'},
        {input:'nested = [1,[2,3],4]', output:'[1,2,3,4]'},
        {input:'nested = []', output:'[]'}
      ], ['At most one level of nesting']
    ),
    starter_code:'def flatten(nested):\n    # Flatten one level of nesting\n    pass',
    verification_script: verify('flatten', ['[[1,2],[3,4],[5]]','[1,[2,3],4]','[]','[[1],[2],[3]]','[1,2,3]'], 'result=[]\nfor item in args[0]:\n    if isinstance(item,list):\n        result.extend(item)\n    else:\n        result.append(item)\nreturn result')
  }
];

// ─── SECTION 9: DICTIONARIES (IDs 146-153) ──────────────────
const dictQuestions = [
  {
    id:146, title:'146. Create and Access a Dictionary',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>student_dict(name, age, grade)</code> that creates and returns a dictionary with keys <code>"name"</code>, <code>"age"</code>, <code>"grade"</code>.\n\nDictionaries (dicts) are Python's key-value store. You create them with <code>{key: value}</code> syntax and access values with <code>dict[key]</code> or <code>dict.get(key)</code>.`,
      [
        {input:'name="Alice", age=18, grade="A"', output:'{"name":"Alice","age":18,"grade":"A"}'},
        {input:'name="Bob", age=20, grade="B"', output:'{"name":"Bob","age":20,"grade":"B"}'}
      ], []
    ),
    starter_code:'def student_dict(name, age, grade):\n    # Return a dict with name, age, grade\n    pass',
    verification_script: verify('student_dict', ['("Alice",18,"A")', '("Bob",20,"B")', '("X",0,"F")'], 'return {"name":args[0],"age":args[1],"grade":args[2]}')
  },
  {
    id:147, title:'147. Dictionary Methods — keys, values, items',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>dict_info(d)</code> that takes a dictionary and returns a tuple:\n<code>(sorted_keys, sorted_values, items_list)</code>\n\nUse <code>dict.keys()</code>, <code>dict.values()</code>, <code>dict.items()</code>. Sort the keys and values for consistent comparison.`,
      [
        {input:'d = {"b":2,"a":1,"c":3}', output:'(["a","b","c"], [1,2,3], [("a",1),("b",2),("c",3)])'}
      ], []
    ),
    starter_code:'def dict_info(d):\n    # Return (sorted_keys, sorted_values, sorted_items)\n    pass',
    verification_script: verify('dict_info', ['{"b":2,"a":1,"c":3}', '{"x":10,"y":20}', '{}'], 'd=args[0]\nsk=sorted(d.keys())\nsv=sorted(d.values())\nsi=sorted(d.items())\nreturn (sk,sv,si)')
  },
  {
    id:148, title:'148. Merge and Update Dictionaries',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>merge_dicts(d1, d2)</code> that merges two dictionaries. If a key exists in both, sum the values. Return the merged dictionary.\n\nUse <code>.update()</code> or <code>dict.get()</code> to handle overlapping keys.`,
      [
        {input:'d1={"a":1,"b":2}, d2={"b":3,"c":4}', output:'{"a":1,"b":5,"c":4}', explanation:'"b" appears in both: 2+3=5'},
        {input:'d1={"x":10}, d2={"y":20}', output:'{"x":10,"y":20}'}
      ], []
    ),
    starter_code:'def merge_dicts(d1, d2):\n    # Merge d1 and d2, summing values for duplicate keys\n    pass',
    verification_script: verify('merge_dicts', ['({"a":1,"b":2},{"b":3,"c":4})', '({"x":10},{"y":20})', '({},{})'], 'd1,d2=dict(args[0]),args[1]\nfor k,v in d2.items():\n    d1[k]=d1.get(k,0)+v\nreturn d1')
  },
  {
    id:149, title:'149. Frequency Counter with Dict',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>count_elements(lst)</code> that takes a list and returns a dictionary mapping each unique element to its count.\n\nThis is one of the most common dict patterns in real Python programs. You can use a plain dict with <code>.get()</code>, or use <code>collections.Counter</code>.`,
      [
        {input:'lst = [1,2,2,3,3,3]', output:'{1:1, 2:2, 3:3}'},
        {input:'lst = ["a","b","a","c","b","a"]', output:'{"a":3,"b":2,"c":1}'}
      ], []
    ),
    starter_code:'def count_elements(lst):\n    # Return frequency dict\n    pass',
    verification_script: verify('count_elements', ['[1,2,2,3,3,3]','["a","b","a","c","b","a"]','[]','[5]'], 'freq={}\nfor x in args[0]:\n    freq[x]=freq.get(x,0)+1\nreturn freq')
  },
  {
    id:150, title:'150. Dict Comprehension',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>squares_dict(n)</code> that uses a dict comprehension to create a dictionary mapping each integer from 1 to n to its square.\n\nDict comprehension syntax: <code>{key: value for var in iterable}</code>\n\nFor example, n=4 → <code>{1:1, 2:4, 3:9, 4:16}</code>`,
      [
        {input:'n = 5', output:'{1:1, 2:4, 3:9, 4:16, 5:25}'},
        {input:'n = 3', output:'{1:1, 2:4, 3:9}'}
      ], []
    ),
    starter_code:'def squares_dict(n):\n    # Return {i: i**2 for i in 1..n} using dict comprehension\n    pass',
    verification_script: verify('squares_dict', ['5','3','1','10'], 'return {i:i**2 for i in range(1,args[0]+1)}')
  },
  {
    id:151, title:'151. Two Sum with Dictionary',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>two_sum(nums, target)</code> that returns the indices of the two numbers in <code>nums</code> that add up to <code>target</code>.\n\nUse a dictionary to achieve O(n) time: for each number, check if <code>target - number</code> is already in the dict. Each input has exactly one valid solution.`,
      [
        {input:'nums=[2,7,11,15], target=9', output:'[0,1]', explanation:'nums[0]+nums[1]=2+7=9'},
        {input:'nums=[3,2,4], target=6', output:'[1,2]'}
      ], ['Each input has exactly one solution', 'You may not use the same element twice']
    ),
    starter_code:'def two_sum(nums, target):\n    # Return [i, j] where nums[i]+nums[j]==target\n    pass',
    verification_script: verify('two_sum', ['([2,7,11,15],9)','([3,2,4],6)','([3,3],6)','([1,2,3,4],5)'], 'nums,target=args[0],args[1]\nseen={}\nfor i,n in enumerate(nums):\n    complement=target-n\n    if complement in seen:\n        return [seen[complement],i]\n    seen[n]=i')
  },
  {
    id:152, title:'152. Group Anagrams',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>group_anagrams(strs)</code> that takes a list of strings and groups them into lists of anagrams. Return the groups in any order.\n\nKey insight: anagrams have the same sorted characters. Use <code>tuple(sorted(word))</code> as the dict key to group them.`,
      [
        {input:'strs = ["eat","tea","tan","ate","nat","bat"]', output:'[["eat","tea","ate"],["tan","nat"],["bat"]]'},
        {input:'strs = [""]', output:'[[""]]'}
      ], []
    ),
    starter_code:'def group_anagrams(strs):\n    # Group strings that are anagrams of each other\n    pass',
    verification_script: verifyCustom(`assert "group_anagrams" in exec_globals, "Function group_anagrams not found"
fn = exec_globals["group_anagrams"]

def normalize(result):
    return sorted([sorted(g) for g in result])

tc1 = fn(["eat","tea","tan","ate","nat","bat"])
exp1 = sorted([sorted(["eat","tea","ate"]),sorted(["tan","nat"]),sorted(["bat"])])
assert normalize(tc1) == exp1, f"Failed tc1: {tc1}"

tc2 = fn([""])
exp2 = [[""]]
assert normalize(tc2) == normalize(exp2), f"Failed tc2: {tc2}"

tc3 = fn(["a"])
assert normalize(tc3) == [["a"]], f"Failed tc3: {tc3}"

exec_globals["passed_cases"] = 3`, 3)
  },
  {
    id:153, title:'153. Nested Dictionary — Student Records',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>top_student(records)</code> that takes a nested dictionary where each key is a student name and each value is a dict with <code>"scores"</code> (list) and <code>"grade"</code> (string). Return the name of the student with the highest average score.\n\nThis tests navigating nested data structures — a common real-world skill.`,
      [
        {input:'records = {"Alice":{"scores":[90,85,92],"grade":"A"}, "Bob":{"scores":[70,80,75],"grade":"B"}}', output:'"Alice"', explanation:'Alice avg=89, Bob avg=75'}
      ], ['At least one student in records']
    ),
    starter_code:'def top_student(records):\n    # Return name of student with highest average score\n    pass',
    verification_script: verify('top_student', ['{"Alice":{"scores":[90,85,92],"grade":"A"},"Bob":{"scores":[70,80,75],"grade":"B"}}', '{"X":{"scores":[100],"grade":"A"},"Y":{"scores":[50],"grade":"C"}}'], 'return max(args[0],key=lambda name:sum(args[0][name]["scores"])/len(args[0][name]["scores"]))')
  }
];

// ─── SECTION 10: FUNCTIONAL PYTHON (IDs 154-159) ────────────
const functionalQuestions = [
  {
    id:154, title:'154. Lambda Functions',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>apply_operations(nums)</code> that uses lambda functions to perform 3 operations on a list:\n1. Double each number: use <code>lambda x: x*2</code> with <code>map()</code>\n2. Keep only positives: use <code>lambda x: x>0</code> with <code>filter()</code>\n3. Sort by absolute value: use <code>lambda x: abs(x)</code> as key in <code>sorted()</code>\n\nReturn a tuple: <code>(doubled, positives_only, sorted_by_abs)</code>`,
      [
        {input:'nums = [-3,1,-2,4,0]', output:'([-6,2,-4,8,0], [1,4], [-3,-2,0,1,4])'},
      ], []
    ),
    starter_code:'def apply_operations(nums):\n    # Return (doubled, positives_only, sorted_by_abs)\n    pass',
    verification_script: verify('apply_operations', ['[-3,1,-2,4,0]','[5,-1,3,-2]','[]','[0,0,0]'], 'n=args[0]\nd=list(map(lambda x:x*2,n))\np=list(filter(lambda x:x>0,n))\ns=sorted(n,key=lambda x:abs(x))\nreturn (d,p,s)')
  },
  {
    id:155, title:'155. Map and Filter',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>transform_list(words)</code> that takes a list of strings and applies these transformations:\n1. Convert each word to uppercase using <code>map(str.upper, words)</code>\n2. Keep only words longer than 3 characters using <code>filter()</code>\n3. Get the lengths of all words using <code>map(len, words)</code>\n\nReturn as a tuple: <code>(upper_words, long_words, lengths)</code>`,
      [
        {input:'words = ["hi","hello","cat","python","a"]', output:'(["HI","HELLO","CAT","PYTHON","A"], ["hello","python"], [2,5,3,6,1])'}
      ], []
    ),
    starter_code:'def transform_list(words):\n    # Return (upper_words, long_words, lengths)\n    pass',
    verification_script: verify('transform_list', ['["hi","hello","cat","python","a"]','["x","abc","abcd"]','[]'], 'w=args[0]\nu=list(map(str.upper,w))\nl=[x for x in w if len(x)>3]\nn=list(map(len,w))\nreturn (u,l,n)')
  },
  {
    id:156, title:'156. sorted() with Key Function',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Write a function <code>custom_sort(people)</code> that takes a list of tuples <code>(name, age)</code> and returns them sorted by age ascending, then by name alphabetically for ties.\n\nUse <code>sorted()</code> with a <code>key=lambda</code> that returns a tuple — Python compares tuples element by element.`,
      [
        {input:'people = [("Alice",30),("Bob",25),("Carol",30),("Dave",25)]', output:'[("Bob",25),("Dave",25),("Alice",30),("Carol",30)]'}
      ], []
    ),
    starter_code:'def custom_sort(people):\n    # Sort by age, then by name for ties\n    pass',
    verification_script: verify('custom_sort', ['[("Alice",30),("Bob",25),("Carol",30),("Dave",25)]','[("Z",1),("A",1),("M",2)]','[]'], 'return sorted(args[0],key=lambda x:(x[1],x[0]))')
  },
  {
    id:157, title:'157. Advanced List Comprehensions',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>comprehension_advanced(matrix)</code> that takes a 2D list (matrix) and returns a tuple:\n1. <code>flat_evens</code> — all even numbers from the entire matrix flattened\n2. <code>row_sums</code> — list of sums of each row\n3. <code>positive_coords</code> — list of <code>(row, col)</code> tuples where value > 0`,
      [
        {input:'matrix = [[1,-2,3],[4,-5,6]]', output:'([4,6], [2,5], [(0,0),(0,2),(1,0),(1,2)])'}
      ], []
    ),
    starter_code:'def comprehension_advanced(matrix):\n    # Return (flat_evens, row_sums, positive_coords)\n    pass',
    verification_script: verify('comprehension_advanced', ['[[1,-2,3],[4,-5,6]]','[[2,4],[6,8]]','[[]]'], 'm=args[0]\nfe=[x for row in m for x in row if x%2==0]\nrs=[sum(row) for row in m]\npc=[(r,c) for r,row in enumerate(m) for c,x in enumerate(row) if x>0]\nreturn (fe,rs,pc)')
  },
  {
    id:158, title:'158. Generator Function',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>even_generator(n)</code> that returns a list of all even numbers from 0 to n (inclusive) using a generator expression inside <code>list()</code>.\n\nGenerator expressions look like list comprehensions but use <code>()</code> instead of <code>[]</code>. They are memory-efficient as they generate values on-demand.`,
      [
        {input:'n = 10', output:'[0,2,4,6,8,10]'},
        {input:'n = 0', output:'[0]'},
        {input:'n = 7', output:'[0,2,4,6]'}
      ], ['n >= 0']
    ),
    starter_code:'def even_generator(n):\n    # Use a generator expression to return list of evens 0..n\n    pass',
    verification_script: verify('even_generator', ['10','0','7','1','20'], 'return list(x for x in range(args[0]+1) if x%2==0)')
  },
  {
    id:159, title:'159. Reduce for Cumulative Operations',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>cumulative_ops(nums)</code> that uses <code>functools.reduce</code> to compute:\n1. <code>product</code> — the product of all numbers (using reduce with <code>lambda a,b: a*b</code>)\n2. <code>max_val</code> — the maximum value (using reduce with <code>lambda a,b: a if a>b else b</code>)\n\nReturn <code>(product, max_val)</code>. Return <code>(0, None)</code> for an empty list.`,
      [
        {input:'nums = [1,2,3,4,5]', output:'(120, 5)', explanation:'1*2*3*4*5=120, max=5'},
        {input:'nums = [3]', output:'(3, 3)'}
      ], []
    ),
    starter_code:'def cumulative_ops(nums):\n    # Use reduce to compute product and max\n    from functools import reduce\n    pass',
    verification_script: verify('cumulative_ops', ['[1,2,3,4,5]','[3]','[-1,-2,-3]','[10,1,5,3]'], 'from functools import reduce\nn=args[0]\nif not n: return (0,None)\nprod=reduce(lambda a,b:a*b,n)\nmx=reduce(lambda a,b:a if a>b else b,n)\nreturn (prod,mx)')
  }
];

// ─── SECTION 11: OOP BASICS (IDs 160-167) ───────────────────
const oopQuestions = [
  {
    id:160, title:'160. Create a Class',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Define a class <code>Animal</code> with:\n- <code>__init__(self, name, sound)</code> that stores <code>name</code> and <code>sound</code> as instance attributes\n- A method <code>speak()</code> that returns <code>f"{self.name} says {self.sound}!"</code>\n\nClasses are the foundation of Object-Oriented Programming. The <code>__init__</code> method is the constructor, called automatically when creating an instance.`,
      [
        {input:'Animal("Dog", "Woof").speak()', output:'"Dog says Woof!"'},
        {input:'Animal("Cat", "Meow").speak()', output:'"Cat says Meow!"'}
      ], []
    ),
    starter_code:'class Animal:\n    def __init__(self, name, sound):\n        # Store name and sound\n        pass\n    \n    def speak(self):\n        # Return the speech string\n        pass',
    verification_script: verifyCustom(`assert "Animal" in exec_globals, "Class Animal not found"
Animal = exec_globals["Animal"]
a1 = Animal("Dog", "Woof")
assert a1.name == "Dog" and a1.sound == "Woof", f"Attributes wrong: {a1.name}, {a1.sound}"
assert a1.speak() == "Dog says Woof!", f"speak() wrong: {a1.speak()}"
a2 = Animal("Cat", "Meow")
assert a2.speak() == "Cat says Meow!", f"speak() wrong: {a2.speak()}"
a3 = Animal("Duck", "Quack")
assert a3.speak() == "Duck says Quack!", f"speak() wrong: {a3.speak()}"
exec_globals["passed_cases"] = 3`, 3)
  },
  {
    id:161, title:'161. Class with Methods & Attributes',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Define a class <code>BankAccount</code> with:\n- <code>__init__(self, owner, balance=0)</code>\n- <code>deposit(self, amount)</code> — adds to balance, returns new balance\n- <code>withdraw(self, amount)</code> — subtracts from balance if sufficient funds, else returns <code>"Insufficient funds"</code>\n- <code>get_balance(self)</code> — returns current balance`,
      [
        {input:'acc = BankAccount("Alice", 100)', output:'acc.deposit(50) → 150, acc.withdraw(30) → 120, acc.withdraw(200) → "Insufficient funds"'}
      ], []
    ),
    starter_code:'class BankAccount:\n    def __init__(self, owner, balance=0):\n        pass\n    \n    def deposit(self, amount):\n        pass\n    \n    def withdraw(self, amount):\n        pass\n    \n    def get_balance(self):\n        pass',
    verification_script: verifyCustom(`assert "BankAccount" in exec_globals, "Class BankAccount not found"
BA = exec_globals["BankAccount"]
acc = BA("Alice", 100)
assert acc.get_balance() == 100, f"Initial balance wrong: {acc.get_balance()}"
assert acc.deposit(50) == 150, f"deposit wrong: {acc.deposit(50)}"
acc2 = BA("Bob", 200)
assert acc2.withdraw(80) == 120, f"withdraw wrong"
assert acc2.withdraw(1000) == "Insufficient funds", f"insufficient funds wrong"
acc3 = BA("Carol")
assert acc3.get_balance() == 0, f"default balance wrong"
exec_globals["passed_cases"] = 5`, 5)
  },
  {
    id:162, title:'162. __str__ and __repr__',
    difficulty:'easy', points:100, category:'python-advanced',
    description: desc(
      `Define a class <code>Point</code> that represents a 2D coordinate with:\n- <code>__init__(self, x, y)</code>\n- <code>__str__(self)</code> — returns <code>f"Point({self.x}, {self.y})"</code>\n- <code>__repr__(self)</code> — returns <code>f"Point(x={self.x}, y={self.y})"</code>\n- <code>distance_from_origin(self)</code> — returns <code>√(x² + y²)</code> rounded to 2 decimal places\n\n<code>__str__</code> is used by <code>print()</code>, <code>__repr__</code> for debugging/REPL.`,
      [
        {input:'p = Point(3, 4)', output:'str(p) → "Point(3, 4)", repr(p) → "Point(x=3, y=4)", p.distance_from_origin() → 5.0'}
      ], []
    ),
    starter_code:'class Point:\n    def __init__(self, x, y):\n        pass\n    \n    def __str__(self):\n        pass\n    \n    def __repr__(self):\n        pass\n    \n    def distance_from_origin(self):\n        pass',
    verification_script: verifyCustom(`assert "Point" in exec_globals, "Class Point not found"
Point = exec_globals["Point"]
p = Point(3, 4)
assert str(p) == "Point(3, 4)", f"__str__ wrong: {str(p)}"
assert repr(p) == "Point(x=3, y=4)", f"__repr__ wrong: {repr(p)}"
assert p.distance_from_origin() == 5.0, f"distance wrong: {p.distance_from_origin()}"
p2 = Point(0, 0)
assert p2.distance_from_origin() == 0.0, f"origin distance wrong"
exec_globals["passed_cases"] = 4`, 4)
  },
  {
    id:163, title:'163. Inheritance',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Define a base class <code>Shape</code> with a method <code>area()</code> that returns <code>0</code>.\n\nThen define two subclasses that inherit from <code>Shape</code>:\n- <code>Circle(radius)</code> — <code>area()</code> returns <code>π × radius²</code> (use <code>3.14159</code>)\n- <code>Rectangle(width, height)</code> — <code>area()</code> returns <code>width × height</code>\n\nInheritance lets subclasses override methods from the parent class (method overriding).`,
      [
        {input:'Circle(5).area()', output:'78.53975', explanation:'3.14159 × 5² = 78.53975'},
        {input:'Rectangle(4, 6).area()', output:'24'}
      ], []
    ),
    starter_code:'class Shape:\n    def area(self):\n        return 0\n\nclass Circle(Shape):\n    def __init__(self, radius):\n        pass\n    \n    def area(self):\n        pass\n\nclass Rectangle(Shape):\n    def __init__(self, width, height):\n        pass\n    \n    def area(self):\n        pass',
    verification_script: verifyCustom(`assert "Circle" in exec_globals, "Class Circle not found"
assert "Rectangle" in exec_globals, "Class Rectangle not found"
Circle = exec_globals["Circle"]
Rectangle = exec_globals["Rectangle"]
c = Circle(5)
assert abs(c.area() - 78.53975) < 0.01, f"Circle area wrong: {c.area()}"
r = Rectangle(4, 6)
assert r.area() == 24, f"Rectangle area wrong: {r.area()}"
c2 = Circle(1)
assert abs(c2.area() - 3.14159) < 0.01, f"Unit circle area wrong: {c2.area()}"
r2 = Rectangle(3, 3)
assert r2.area() == 9, f"Square area wrong"
exec_globals["passed_cases"] = 4`, 4)
  },
  {
    id:164, title:'164. Class vs Instance Variables',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Define a class <code>Student</code> with:\n- A <strong>class variable</strong> <code>school = "PyCode Academy"</code> — shared by all instances\n- Instance variables <code>name</code> and <code>grade</code> set in <code>__init__</code>\n- A <strong>class method</strong> <code>get_school(cls)</code> decorated with <code>@classmethod</code>\n- A method <code>info(self)</code> that returns <code>f"{self.name} (Grade {self.grade}) at {Student.school}"</code>`,
      [
        {input:'Student("Alice", "A").info()', output:'"Alice (Grade A) at PyCode Academy"'},
        {input:'Student.get_school()', output:'"PyCode Academy"'}
      ], []
    ),
    starter_code:'class Student:\n    school = "PyCode Academy"\n    \n    def __init__(self, name, grade):\n        pass\n    \n    @classmethod\n    def get_school(cls):\n        pass\n    \n    def info(self):\n        pass',
    verification_script: verifyCustom(`assert "Student" in exec_globals, "Class Student not found"
Student = exec_globals["Student"]
s = Student("Alice", "A")
assert s.info() == "Alice (Grade A) at PyCode Academy", f"info() wrong: {s.info()}"
assert Student.get_school() == "PyCode Academy", f"get_school() wrong"
s2 = Student("Bob", "B")
assert s2.info() == "Bob (Grade B) at PyCode Academy", f"info() wrong: {s2.info()}"
assert s.school == "PyCode Academy", f"class variable wrong"
exec_globals["passed_cases"] = 4`, 4)
  },
  {
    id:165, title:'165. Property Decorator',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Define a class <code>Temperature</code> with:\n- <code>__init__(self, celsius)</code> that stores the temperature\n- A <code>@property</code> <code>celsius</code> that returns the value\n- A <code>@celsius.setter</code> that raises <code>ValueError</code> if value < -273.15\n- A <code>@property</code> <code>fahrenheit</code> that returns <code>celsius × 9/5 + 32</code>\n\nProperties let you add validation logic to attribute access.`,
      [
        {input:'t = Temperature(100)', output:'t.celsius → 100, t.fahrenheit → 212.0'},
        {input:'Temperature(-300) raises ValueError', output:'ValueError raised'}
      ], []
    ),
    starter_code:'class Temperature:\n    def __init__(self, celsius):\n        self.celsius = celsius  # uses the setter\n    \n    @property\n    def celsius(self):\n        pass\n    \n    @celsius.setter\n    def celsius(self, value):\n        pass\n    \n    @property\n    def fahrenheit(self):\n        pass',
    verification_script: verifyCustom(`assert "Temperature" in exec_globals, "Class Temperature not found"
Temperature = exec_globals["Temperature"]
t = Temperature(100)
assert t.celsius == 100, f"celsius wrong: {t.celsius}"
assert t.fahrenheit == 212.0, f"fahrenheit wrong: {t.fahrenheit}"
t2 = Temperature(0)
assert t2.fahrenheit == 32.0, f"0°C fahrenheit wrong: {t2.fahrenheit}"
try:
    Temperature(-300)
    assert False, "Should have raised ValueError"
except ValueError:
    pass
exec_globals["passed_cases"] = 4`, 4)
  },
  {
    id:166, title:'166. Dunder Methods — Making Objects Comparable',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Define a class <code>Box</code> with:\n- <code>__init__(self, length, width, height)</code>\n- <code>volume(self)</code> that returns <code>l × w × h</code>\n- <code>__eq__(self, other)</code> — returns True if volumes are equal\n- <code>__lt__(self, other)</code> — returns True if self volume < other volume\n- <code>__repr__(self)</code> — returns <code>f"Box({self.l}×{self.w}×{self.h})"</code>\n\nDunder (double underscore) methods let you control how Python operators work on your objects.`,
      [
        {input:'Box(1,2,3) == Box(6,1,1)', output:'True', explanation:'Both have volume 6'},
        {input:'Box(1,1,1) < Box(2,2,2)', output:'True', explanation:'Volume 1 < 8'}
      ], []
    ),
    starter_code:'class Box:\n    def __init__(self, length, width, height):\n        pass\n    \n    def volume(self):\n        pass\n    \n    def __eq__(self, other):\n        pass\n    \n    def __lt__(self, other):\n        pass\n    \n    def __repr__(self):\n        pass',
    verification_script: verifyCustom(`assert "Box" in exec_globals, "Class Box not found"
Box = exec_globals["Box"]
b1 = Box(1,2,3)
assert b1.volume() == 6, f"volume wrong: {b1.volume()}"
b2 = Box(6,1,1)
assert b1 == b2, f"__eq__ wrong: {b1} == {b2} should be True"
b3 = Box(1,1,1)
assert b3 < b1, f"__lt__ wrong: {b3} < {b1} should be True"
assert not (b1 < b3), f"__lt__ wrong: {b1} < {b3} should be False"
assert isinstance(repr(b1), str), f"__repr__ should return str"
exec_globals["passed_cases"] = 5`, 5)
  },
  {
    id:167, title:'167. Exception Handling',
    difficulty:'medium', points:200, category:'python-advanced',
    description: desc(
      `Write a function <code>safe_divide(a, b)</code> that uses <code>try/except/finally</code> to:\n- Return <code>a / b</code> if b is non-zero\n- Catch <code>ZeroDivisionError</code> and return <code>"Error: Cannot divide by zero"</code>\n- Catch <code>TypeError</code> and return <code>"Error: Invalid types"</code>\n\nAlso write a function <code>safe_index(lst, idx)</code> that returns <code>lst[idx]</code> or <code>"Error: Index out of range"</code> for <code>IndexError</code>.`,
      [
        {input:'safe_divide(10, 2)', output:'5.0'},
        {input:'safe_divide(10, 0)', output:'"Error: Cannot divide by zero"'},
        {input:'safe_index([1,2,3], 10)', output:'"Error: Index out of range"'}
      ], []
    ),
    starter_code:'def safe_divide(a, b):\n    # Handle ZeroDivisionError and TypeError\n    pass\n\ndef safe_index(lst, idx):\n    # Handle IndexError\n    pass',
    verification_script: verifyCustom(`assert "safe_divide" in exec_globals, "Function safe_divide not found"
assert "safe_index" in exec_globals, "Function safe_index not found"
sd = exec_globals["safe_divide"]
si = exec_globals["safe_index"]
assert sd(10, 2) == 5.0, f"sd(10,2) wrong: {sd(10,2)}"
assert sd(10, 0) == "Error: Cannot divide by zero", f"ZeroDivisionError not caught"
assert sd("a", 2) == "Error: Invalid types", f"TypeError not caught"
assert si([1,2,3], 1) == 2, f"si wrong: {si([1,2,3],1)}"
assert si([1,2,3], 10) == "Error: Index out of range", f"IndexError not caught"
exec_globals["passed_cases"] = 5`, 5)
  }
];

// ─── LOAD EXISTING DATA & BUILD EVERYTHING ───────────────────

// Load shifted non-basics (NumPy, Pandas, Matplotlib) from JSON
let nonBasics = [];
try {
  nonBasics = JSON.parse(fs.readFileSync('scratch_existing_questions.json', 'utf8'));
} catch (err) {
  console.warn('Could not load scratch_existing_questions.json — non-basics will be empty.');
}
// Strip created_at and shift IDs
nonBasics = nonBasics.map(q => {
  let newId = q.id;
  if (q.category === 'numpy') newId = q.id - 36 + 301;
  else if (q.category === 'matplotlib-seaborn') newId = q.id - 81 + 401;
  else if (q.category === 'pandas') newId = q.id - 101 + 501;
  const { created_at, ...rest } = q;
  return { ...rest, id: newId, title: q.title.replace(/^\d+\.\s+/, `${newId}. `) };
});

// Parse math.md
console.log('Parsing math.md...');
const rawMath = parseMarkdownFile('Basic Math logic and digit manupulation .md');
const mathQuestions = rawMath.map(q => {
  const m = mathMappings[q.id];
  if (!m) { console.warn(`No mapping for math Q${q.id}`); return null; }
  return {
    id: m.id, title: `${m.id}. ${q.title}`,
    difficulty: m.diff, points: m.pts, category: 'python-basics',
    description: q.descHtml, starter_code: m.starter,
    verification_script: verify(m.func, m.tcs, m.ref),
    dataset_name: null
  };
}).filter(Boolean);

// Parse patterns.md
console.log('Parsing patterns.md...');
const rawPatterns = parseMarkdownFile('patterns.md');
const patternQuestions = rawPatterns.map(q => {
  const fn = patternFuncs[q.id];
  const newId = q.id === 23 ? 168 : q.id + 55; // IDs 56-77, and 168
  const d = patternDiffs[q.id];
  const pts = d === 'easy' ? 100 : d === 'medium' ? 200 : 300;
  return {
    id: newId, title: `${newId}. ${q.title}`,
    difficulty: d, points: pts, category: 'python-basics',
    description: q.descHtml, starter_code: `def ${fn}(n):\n    # Write your code here\n    pass`,
    verification_script: makePatternVerify(q.id, fn),
    dataset_name: null
  };
});

// Parse string.md (skip Q1 — was Reverse String, duplicated by our explicit reverse_string_algo at ID 103)
console.log('Parsing string.md...');
const rawStrings = parseMarkdownFile('string.md');
const stringAlgoQuestions = rawStrings.map(q => {
  if (q.id === 1) return null; // Skip — handled separately in ID 103
  const m = stringAlgoMappings[q.id];
  if (!m) { console.warn(`No mapping for string Q${q.id}`); return null; }
  if (m.isMutating) {
    // String compression (Q94) — custom mutating verification
    return {
      id: m.id, title: `${m.id}. ${q.title}`,
      difficulty: m.diff, points: m.pts, category: 'python-advanced',
      description: q.descHtml, starter_code: m.starter,
      verification_script: verifyCustom(`assert "compress" in exec_globals, "Function compress not found"
fn = exec_globals["compress"]
tc1 = ["a","a","b","b","c","c","c"]
k1 = fn(tc1)
assert k1 == 6 and tc1[:6] == ["a","2","b","2","c","3"], f"Failed tc1: got {k1}, {tc1}"
tc2 = ["a"]
k2 = fn(tc2)
assert k2 == 1 and tc2[:1] == ["a"], f"Failed tc2: got {k2}, {tc2}"
tc3 = ["a","b","b","b","b","b","b","b","b","b","b","b","b"]
k3 = fn(tc3)
assert k3 == 4 and tc3[:4] == ["a","b","1","2"], f"Failed tc3: got {k3}, {tc3}"
exec_globals["passed_cases"] = 3`, 3),
      dataset_name: null
    };
  }
  return {
    id: m.id, title: `${m.id}. ${q.title}`,
    difficulty: m.diff, points: m.pts, category: 'python-advanced',
    description: q.descHtml, starter_code: m.starter,
    verification_script: verify(m.func, m.tcs, m.ref),
    dataset_name: null
  };
}).filter(Boolean);

// Parse Arrays.md
console.log('Parsing Arrays.md...');
const arrayMappings = {
  1:{ id:114, func:'find_max_min', diff:'easy', pts:100, starter:'def find_max_min(nums):\n    pass', ref:'return (max(args[0]),min(args[0])) if args[0] else (None,None)', tcs:['[3,5,1,9,-2,7]','[42]','[]','[5,5,5]','[-10,-20,-3]'] },
  2:{ id:115, func:'find_second_largest_smallest', diff:'easy', pts:100, starter:'def find_second_largest_smallest(nums):\n    pass', ref:'nums=list(set(args[0]))\nif len(nums)<2: return (None,None)\nnums.sort()\nreturn (nums[-2],nums[1])', tcs:['[3,5,1,9,-2,7]','[42]','[]','[5,5,5]','[1,2]'] },
  3:{ id:116, func:'count_even_odd', diff:'easy', pts:100, starter:'def count_even_odd(nums):\n    pass', ref:'evens=sum(1 for x in args[0] if x%2==0)\nodds=len(args[0])-evens\nreturn (evens,odds)', tcs:['[1,2,3,4,5]','[]','[2,4,6]'] },
  4:{ id:117, func:'is_sorted', diff:'easy', pts:100, starter:'def is_sorted(nums):\n    pass', ref:'nums=args[0]\nif len(nums)<=1: return True\nasc=all(nums[i]<=nums[i+1] for i in range(len(nums)-1))\ndesc=all(nums[i]>=nums[i+1] for i in range(len(nums)-1))\nreturn asc or desc', tcs:['[1,2,3,5]','[5,4,3,1]','[1,3,2]','[]','[5]'] },
  5:{ id:118, func:'reverse_list', diff:'easy', pts:100, starter:'def reverse_list(nums):\n    pass', isMutating:true, mVerify:`assert "reverse_list" in exec_globals
fn=exec_globals["reverse_list"]
a1=[1,2,3]; fn(a1); assert a1==[3,2,1], f"Got {a1}"
a2=[]; fn(a2); assert a2==[], f"Got {a2}"
a3=[5]; fn(a3); assert a3==[5], f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  6:{ id:119, func:'sum_average', diff:'easy', pts:100, starter:'def sum_average(nums):\n    pass', ref:'nums=args[0]\nif not nums: return (0,0.0)\ns=sum(nums)\nreturn (s,s/len(nums))', tcs:['[1,2,3,4]','[]','[5]'] },
  7:{ id:120, func:'move_zeroes', diff:'easy', pts:100, starter:'def move_zeroes(nums):\n    pass', isMutating:true, mVerify:`assert "move_zeroes" in exec_globals
fn=exec_globals["move_zeroes"]
a1=[0,1,0,3,12]; fn(a1); assert a1==[1,3,12,0,0], f"Got {a1}"
a2=[0]; fn(a2); assert a2==[0], f"Got {a2}"
a3=[1,2,3]; fn(a3); assert a3==[1,2,3], f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  8:{ id:121, func:'remove_duplicates', diff:'easy', pts:100, starter:'def remove_duplicates(nums):\n    pass', isMutating:true, mVerify:`assert "remove_duplicates" in exec_globals
fn=exec_globals["remove_duplicates"]
a1=[1,1,2]; k1=fn(a1); assert k1==2 and a1[:2]==[1,2], f"Got {k1},{a1}"
a2=[]; k2=fn(a2); assert k2==0, f"Got {k2}"
a3=[1,2,3]; k3=fn(a3); assert k3==3 and a3[:3]==[1,2,3], f"Got {k3},{a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  9:{ id:122, func:'rotate_list', diff:'easy', pts:100, starter:'def rotate_list(nums, k):\n    pass', isMutating:true, mVerify:`assert "rotate_list" in exec_globals
fn=exec_globals["rotate_list"]
a1=[1,2,3,4,5,6,7]; fn(a1,3); assert a1==[5,6,7,1,2,3,4], f"Got {a1}"
a2=[-1,-100,3,99]; fn(a2,2); assert a2==[3,99,-1,-100], f"Got {a2}"
a3=[1,2]; fn(a3,0); assert a3==[1,2], f"Got {a3}"
a4=[1,2]; fn(a4,5); assert a4==[2,1], f"Got {a4}"
exec_globals["passed_cases"]=4`, mTotal:4 },
  10:{ id:123, func:'separate_even_odd', diff:'easy', pts:100, starter:'def separate_even_odd(nums):\n    pass', isMutating:true, mVerify:`assert "separate_even_odd" in exec_globals
fn=exec_globals["separate_even_odd"]
def check_partition(a):
    is_even=True
    for x in a:
        if x%2!=0: is_even=False
        elif not is_even: return False
    return True
a1=[3,5,2,4,9,8]; fn(a1); assert check_partition(a1), f"Got {a1}"
a2=[1,3,5]; fn(a2); assert check_partition(a2), f"Got {a2}"
a3=[]; fn(a3); assert check_partition(a3), f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  11:{ id:124, func:'two_sum_sorted', diff:'easy', pts:100, starter:'def two_sum_sorted(nums, target):\n    pass', ref:'nums,target=args[0],args[1]\nl,r=0,len(nums)-1\nwhile l<r:\n    s=nums[l]+nums[r]\n    if s==target: return (l,r)\n    elif s<target: l+=1\n    else: r-=1\nreturn None', tcs:['([2,7,11,15],9)','([1,2,3,4,6],6)','([1,2],5)'] },
  12:{ id:125, func:'max_area', diff:'medium', pts:200, starter:'def max_area(h):\n    pass', ref:'h=args[0]\nl,r=0,len(h)-1\nans=0\nwhile l<r:\n    ans=max(ans,min(h[l],h[r])*(r-l))\n    if h[l]<h[r]: l+=1\n    else: r-=1\nreturn ans', tcs:['[1,8,6,2,5,4,8,3,7]','[1,1]','[4]'] },
  13:{ id:126, func:'max_sub_array', diff:'medium', pts:200, starter:'def max_sub_array(nums):\n    pass', ref:'nums=args[0]\nif not nums: return 0\ncur=max_s=nums[0]\nfor x in nums[1:]:\n    cur=max(x,cur+x)\n    max_s=max(max_s,cur)\nreturn max_s', tcs:['[-2,1,-3,4,-1,2,1,-5,4]','[1]','[5,4,-1,7,8]'] },
  14:{ id:127, func:'find_subarrays', diff:'easy', pts:100, starter:'def find_subarrays(nums):\n    pass', ref:'nums=args[0]\nres=[]\nfor i in range(len(nums)):\n    for j in range(i+1,len(nums)+1):\n        res.append(nums[i:j])\nreturn res', tcs:['[1,2,3]','[4]','[]'] },
  15:{ id:128, func:'max_sub_array_k', diff:'easy', pts:100, starter:'def max_sub_array_k(nums, k):\n    pass', ref:'nums,k=args[0],args[1]\nif len(nums)<k or k<=0: return 0\ncur=sum(nums[:k])\nmx=cur\nfor i in range(len(nums)-k):\n    cur=cur-nums[i]+nums[i+k]\n    mx=max(mx,cur)\nreturn mx', tcs:['([100,200,300,400],2)','([1,4,2,10,23,3,1,0,20],4)','([2,3],3)'] },
  16:{ id:129, func:'min_sub_array_len', diff:'medium', pts:200, starter:'def min_sub_array_len(target, nums):\n    pass', ref:'target,nums=args[0],args[1]\nl,total,ans=0,0,float("inf")\nfor r in range(len(nums)):\n    total+=nums[r]\n    while total>=target:\n        ans=min(ans,r-l+1)\n        total-=nums[l]\n        l+=1\nreturn 0 if ans==float("inf") else ans', tcs:['(7,[2,3,1,2,4,3])','(4,[1,4,4])','(11,[1,1,1,1,1,1,1])'] },
  17:{ id:130, func:'product_except_self', diff:'medium', pts:200, starter:'def product_except_self(nums):\n    pass', ref:'nums=args[0]\nn=len(nums)\nres=[1]*n\nleft=1\nfor i in range(n):\n    res[i]=left\n    left*=nums[i]\nright=1\nfor i in range(n-1,-1,-1):\n    res[i]*=right\n    right*=nums[i]\nreturn res', tcs:['[1,2,3,4]','[-1,1,0,-3,3]'] },
  18:{ id:131, func:'majority_element', diff:'easy', pts:100, starter:'def majority_element(nums):\n    pass', ref:'nums=args[0]\ncand,count=None,0\nfor x in nums:\n    if count==0: cand=x\n    count+=1 if x==cand else -1\nreturn cand', tcs:['[3,2,3]','[2,2,1,1,1,2,2]','[7]'] },
  19:{ id:132, func:'sort_colors', diff:'medium', pts:200, starter:'def sort_colors(nums):\n    pass', isMutating:true, mVerify:`assert "sort_colors" in exec_globals
fn=exec_globals["sort_colors"]
a1=[2,0,2,1,1,0]; fn(a1); assert a1==[0,0,1,1,2,2], f"Got {a1}"
a2=[2,0,1]; fn(a2); assert a2==[0,1,2], f"Got {a2}"
a3=[1]; fn(a3); assert a3==[1], f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  20:{ id:133, func:'next_permutation', diff:'medium', pts:200, starter:'def next_permutation(nums):\n    pass', isMutating:true, mVerify:`assert "next_permutation" in exec_globals
fn=exec_globals["next_permutation"]
a1=[1,2,3]; fn(a1); assert a1==[1,3,2], f"Got {a1}"
a2=[3,2,1]; fn(a2); assert a2==[1,2,3], f"Got {a2}"
a3=[1,1,5]; fn(a3); assert a3==[1,5,1], f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  21:{ id:134, func:'trap', diff:'hard', pts:300, starter:'def trap(h):\n    pass', ref:'h=args[0]\nif not h: return 0\nl,r=0,len(h)-1\nlm,rm=h[l],h[r]\nans=0\nwhile l<r:\n    if lm<rm:\n        l+=1\n        lm=max(lm,h[l])\n        ans+=lm-h[l]\n    else:\n        r-=1\n        rm=max(rm,h[r])\n        ans+=rm-h[r]\nreturn ans', tcs:['[0,1,0,2,1,0,1,3,2,1,2,1]','[4,2,0,3,2,5]','[1,2]'] },
  22:{ id:135, func:'merge', diff:'medium', pts:200, starter:'def merge(nums1, m, nums2, n):\n    pass', isMutating:true, mVerify:`assert "merge" in exec_globals
fn=exec_globals["merge"]
a1=[1,2,3,0,0,0]; fn(a1,3,[2,5,6],3); assert a1==[1,2,2,3,5,6], f"Got {a1}"
a2=[1]; fn(a2,1,[],0); assert a2==[1], f"Got {a2}"
a3=[0]; fn(a3,0,[1],1); assert a3==[1], f"Got {a3}"
exec_globals["passed_cases"]=3`, mTotal:3 },
  23:{ id:136, func:'interval_intersection', diff:'medium', pts:200, starter:'def interval_intersection(firstList, secondList):\n    pass', ref:'l1,l2=args[0],args[1]\ni,j=0,0\nres=[]\nwhile i<len(l1) and j<len(l2):\n    lo=max(l1[i][0],l2[j][0])\n    hi=min(l1[i][1],l2[j][1])\n    if lo<=hi: res.append([lo,hi])\n    if l1[i][1]<l2[j][1]: i+=1\n    else: j+=1\nreturn res', tcs:['([[0,2],[5,10],[13,23],[24,25]],[[1,5],[8,12],[15,24],[25,26]])','([[1,3]],[])','([[1,10]],[[3,5],[6,8]])'] },
  24:{ id:137, func:'rotate_matrix', diff:'medium', pts:200, starter:'def rotate_matrix(matrix):\n    pass', isMutating:true, mVerify:`assert "rotate_matrix" in exec_globals
fn=exec_globals["rotate_matrix"]
m1=[[1,2,3],[4,5,6],[7,8,9]]; fn(m1); assert m1==[[7,4,1],[8,5,2],[9,6,3]], f"Got {m1}"
m2=[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]; fn(m2); assert m2==[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]], f"Got {m2}"
exec_globals["passed_cases"]=2`, mTotal:2 },
  25:{ id:138, func:'spiral_order', diff:'medium', pts:200, starter:'def spiral_order(matrix):\n    pass', ref:'matrix=args[0]\nif not matrix: return []\nres=[]\nr1,r2=0,len(matrix)-1\nc1,c2=0,len(matrix[0])-1\nwhile r1<=r2 and c1<=c2:\n    for c in range(c1,c2+1): res.append(matrix[r1][c])\n    for r in range(r1+1,r2+1): res.append(matrix[r][c2])\n    if r1<r2 and c1<c2:\n        for c in range(c2-1,c1,-1): res.append(matrix[r2][c])\n        for r in range(r2,r1,-1): res.append(matrix[r][c1])\n    r1+=1;r2-=1;c1+=1;c2-=1\nreturn res', tcs:['[[1,2,3],[4,5,6],[7,8,9]]','[[1,2,3,4],[5,6,7,8],[9,10,11,12]]'] },
  26:{ id:139, func:'set_zeroes', diff:'medium', pts:200, starter:'def set_zeroes(matrix):\n    pass', isMutating:true, mVerify:`assert "set_zeroes" in exec_globals
fn=exec_globals["set_zeroes"]
m1=[[1,1,1],[1,0,1],[1,1,1]]; fn(m1); assert m1==[[1,0,1],[0,0,0],[1,0,1]], f"Got {m1}"
m2=[[0,1,2,0],[3,4,5,2],[1,3,1,5]]; fn(m2); assert m2==[[0,0,0,0],[0,4,5,0],[0,3,1,0]], f"Got {m2}"
exec_globals["passed_cases"]=2`, mTotal:2 },
  27:{ id:140, func:'binary_search', diff:'easy', pts:100, starter:'def binary_search(nums, target):\n    pass', ref:'nums,target=args[0],args[1]\nl,r=0,len(nums)-1\nwhile l<=r:\n    m=(l+r)//2\n    if nums[m]==target: return m\n    elif nums[m]<target: l=m+1\n    else: r=m-1\nreturn -1', tcs:['([-1,0,3,5,9,12],9)','([-1,0,3,5,9,12],2)','([],5)','([5],5)','([1,3],3)','([10,20,30,40],10)'] },
  28:{ id:141, func:'find_peak_element', diff:'medium', pts:200, starter:'def find_peak_element(nums):\n    pass', ref:'nums=args[0]\nl,r=0,len(nums)-1\nwhile l<r:\n    m=(l+r)//2\n    if nums[m]>nums[m+1]: r=m\n    else: l=m+1\nreturn l', tcs:['[1,2,3,1]','[1,2,1,3,5,6,4]','[1]','[1,2,3,4]'] },
  29:{ id:142, func:'search_rotated', diff:'medium', pts:200, starter:'def search_rotated(nums, target):\n    pass', ref:'nums,target=args[0],args[1]\nl,r=0,len(nums)-1\nwhile l<=r:\n    m=(l+r)//2\n    if nums[m]==target: return m\n    if nums[l]<=nums[m]:\n        if nums[l]<=target<nums[m]: r=m-1\n        else: l=m+1\n    else:\n        if nums[m]<target<=nums[r]: l=m+1\n        else: r=m-1\nreturn -1', tcs:['([4,5,6,7,0,1,2],0)','([4,5,6,7,0,1,2],3)','([1],0)','([3,1],1)','([5,1,3],5)'] },
  30:{ id:143, func:'next_greater_element_array', diff:'medium', pts:200, starter:'def next_greater_element_array(nums):\n    pass', ref:'nums=args[0]\nans=[-1]*len(nums)\nst=[]\nfor i in range(len(nums)):\n    while st and nums[st[-1]]<nums[i]:\n        ans[st.pop()]=nums[i]\n    st.append(i)\nreturn ans', tcs:['[1,3,4,2]','[6,5,4,3,2,1]','[2,1,5]'] },
  31:{ id:144, func:'daily_temperatures', diff:'medium', pts:200, starter:'def daily_temperatures(temps):\n    pass', ref:'t=args[0]\nans=[0]*len(t)\nst=[]\nfor i,temp in enumerate(t):\n    while st and t[st[-1]]<temp:\n        idx=st.pop()\n        ans[idx]=i-idx\n    st.append(i)\nreturn ans', tcs:['[73,74,75,71,69,72,76,73]','[30,40,50,60]','[30,30,25]','[40]'] },
  32:{ id:145, func:'largest_rectangle_area', diff:'hard', pts:300, starter:'def largest_rectangle_area(heights):\n    pass', ref:'heights=args[0]\nheights.append(0)\nst=[-1]\nans=0\nfor i in range(len(heights)):\n    while heights[i]<heights[st[-1]]:\n        h=heights[st.pop()]\n        w=i-st[-1]-1\n        ans=max(ans,h*w)\n    st.append(i)\nheights.pop()\nreturn ans', tcs:['[2,1,5,6,2,3]','[2,4]','[]','[1,2,3,4,5]','[11,11,11]'] },
};

const rawArrays = parseMarkdownFile('Arrays.md');
const arrayQuestions = rawArrays.map(q => {
  const m = arrayMappings[q.id];
  if (!m) { console.warn(`No mapping for array Q${q.id}`); return null; }
  if (m.isMutating) {
    return {
      id: m.id, title: `${m.id}. ${q.title}`,
      difficulty: m.diff, points: m.pts, category: 'python-advanced',
      description: q.descHtml, starter_code: m.starter,
      verification_script: verifyCustom(m.mVerify, m.mTotal),
      dataset_name: null
    };
  }
  return {
    id: m.id, title: `${m.id}. ${q.title}`,
    difficulty: m.diff, points: m.pts, category: 'python-advanced',
    description: q.descHtml, starter_code: m.starter,
    verification_script: verify(m.func, m.tcs, m.ref),
    dataset_name: null
  };
}).filter(Boolean);

// ─── ASSEMBLE FINAL LIST ─────────────────────────────────────
const allNew = [
  ...fundamentalsQuestions,
  ...ifElseQuestions,
  ...mathQuestions,
  ...patternQuestions,
  ...stringMethodQuestions,
  ...stringAlgoQuestions,
  ...listBasicsQuestions,
  ...arrayQuestions,
  ...dictQuestions,
  ...functionalQuestions,
  ...oopQuestions
].sort((a,b) => a.id - b.id);

const finalList = [...allNew, ...nonBasics];

// ─── WRITE localQuestions.ts ─────────────────────────────────
console.log(`\nWriting ${finalList.length} questions to src/lib/localQuestions.ts...`);
const tsContent = `export interface LocalQuestion {
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

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(finalList, null, 2)};
`;
fs.writeFileSync('src/lib/localQuestions.ts', tsContent);
console.log('✓ Saved src/lib/localQuestions.ts');

// ─── WRITE questions_seed.sql ────────────────────────────────
console.log('Generating pycode-supabase/questions_seed.sql...');
let sql = `-- PyCode Student — Full Question Seed
-- Generated automatically. Run in Supabase SQL Editor.

BEGIN;
TRUNCATE public.coding_questions RESTART IDENTITY CASCADE;

`;
finalList.forEach(q => {
  const esc = s => (s || '').replace(/'/g, "''");
  const dv = q.dataset_name ? `'${esc(q.dataset_name)}'` : 'NULL';
  sql += `INSERT INTO public.coding_questions (id,title,description,difficulty,points,category,starter_code,verification_script,dataset_name)
VALUES (${q.id},'${esc(q.title)}','${esc(q.description)}','${q.difficulty}',${q.points},'${q.category}','${esc(q.starter_code)}','${esc(q.verification_script||'')}',${dv});\n\n`;
});
sql += 'COMMIT;\n';
const sqlDir = path.join(__dirname,'..','pycode-supabase');
if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir,{recursive:true});
fs.writeFileSync(path.join(sqlDir,'questions_seed.sql'), sql);
console.log('✓ Saved pycode-supabase/questions_seed.sql');
console.log(`\n✓ Total questions: ${finalList.length} (${allNew.length} Python + ${nonBasics.length} Scientific)`);
console.log('  Sections:');
console.log(`    1. Fundamentals (IDs 1-10):      ${fundamentalsQuestions.length}q`);
console.log(`    2. If/Else (IDs 11-25):           ${ifElseQuestions.length}q`);
console.log(`    3. Math Logic (IDs 26-55):        ${mathQuestions.length}q`);
console.log(`    4. Patterns (IDs 56-77):          ${patternQuestions.length}q`);
console.log(`    5. String Methods (IDs 78-87):    ${stringMethodQuestions.length}q`);
console.log(`    6. String Algos (IDs 88-105):     ${stringAlgoQuestions.length}q`);
console.log(`    7. List Basics (IDs 106-113):     ${listBasicsQuestions.length}q`);
console.log(`    8. Array Algos (IDs 114-145):     ${arrayQuestions.length}q`);
console.log(`    9. Dictionaries (IDs 146-153):    ${dictQuestions.length}q`);
console.log(`   10. Functional Python (IDs 154-159): ${functionalQuestions.length}q`);
console.log(`   11. OOP & Exceptions (IDs 160-167): ${oopQuestions.length}q`);
