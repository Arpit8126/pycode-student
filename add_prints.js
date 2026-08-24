// add_prints.js — Patches all verification scripts so:
// ✓ ALL test cases always run (no early stop on failure)
// ✓ exec_globals is set BEFORE any raise (so total/passed are always correct)
// ✓ Terminal shows a clean, formatted results block
// ✓ Inputs remain hidden — only outputs shown on failure

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

const qs = loadQuestions();

let patched = 0;

qs.forEach(q => {
  if (!q.verification_script) return;
  const vs = q.verification_script;

  // Extract total from original script (any previous version)
  const totalMatch = vs.match(/exec_globals\["total_cases"\]\s*=\s*(\d+)/);
  const privateTotalMatch = vs.match(/^\s*_total\s*=\s*(\d+)/m);
  const total = (totalMatch ? totalMatch[1] : null) || (privateTotalMatch ? privateTotalMatch[1] : null) || 'len(test_cases)';

  // Find start of loop block
  const passedIdx = vs.indexOf('passed = 0');
  if (passedIdx === -1) return;

  const prefix = vs.substring(0, passedIdx);

  // The new non-stopping loop
  let newBlock;
  if (q.category === 'python-patterns') {
    newBlock = `passed = 0
_total = ${total}
_failures = []
print("\\n┌─ TEST RESULTS " + "─" * 34)
for _i, _tc in enumerate(test_cases, 1):
    try:
        _exp = normalize(ref_impl(_tc))
        _got = normalize(capture(fn, _tc))
        _ok = _exp == _got
    except Exception as _e:
        print(f"│  [{_i}/{_total}] ✗  Runtime Error: {_e}")
        _failures.append(_i)
        continue
    if _ok:
        print(f"│  [{_i}/{_total}] ✓  Passed")
        passed += 1
    else:
        print(f"│  [{_i}/{_total}] ✗  Failed")
        _got_vis = _got if _got else ["(Empty Output)"]
        _exp_vis = _exp if _exp else ["(Empty Output)"]
        _max_rows = max(len(_got_vis), len(_exp_vis))
        _left_width = max(max((len(_r) for _r in _got_vis), default=0) + 6, 25)
        print(f"│           {'Your Output'.ljust(_left_width)} Expected")
        for _r_idx in range(_max_rows):
            _got_row = _got_vis[_r_idx] if _r_idx < len(_got_vis) else ""
            _exp_row = _exp_vis[_r_idx] if _r_idx < len(_exp_vis) else ""
            print(f"│           {_got_row.ljust(_left_width)} {_exp_row}")
        _failures.append(_i)
# Always set exec_globals FIRST before any raise
exec_globals["passed_cases"] = passed
exec_globals["total_cases"] = _total
print("└" + "─" * 49)
if passed == _total:
    print(f"  ✅  All {_total}/{_total} test cases passed!")
else:
    print(f"  ❌  {passed}/{_total} test cases passed")
    raise AssertionError(f"done")`;
  } else {
    newBlock = `passed = 0
_total = ${total}
_failures = []
print("\\n┌─ TEST RESULTS " + "─" * 34)
for _i, _tc in enumerate(test_cases, 1):
    try:
        if isinstance(_tc, tuple):
            _res = fn(*_tc)
            _exp = ref_impl(*_tc)
        else:
            _res = fn(_tc)
            _exp = ref_impl(_tc)
        _ok = _res == _exp
    except Exception as _e:
        print(f"│  [{_i}/{_total}] ✗  Runtime Error: {_e}")
        _failures.append(_i)
        continue
    if _ok:
        print(f"│  [{_i}/{_total}] ✓  Passed")
        passed += 1
    else:
        print(f"│  [{_i}/{_total}] ✗  Failed")
        print(f"│           Your output → {repr(_res)}")
        print(f"│           Expected    → {repr(_exp)}")
        _failures.append(_i)
# Always set exec_globals FIRST before any raise
exec_globals["passed_cases"] = passed
exec_globals["total_cases"] = _total
print("└" + "─" * 49)
if passed == _total:
    print(f"  ✅  All {_total}/{_total} test cases passed!")
else:
    print(f"  ❌  {passed}/{_total} test cases passed")
    raise AssertionError(f"done")`;
  }

  q.verification_script = prefix + newBlock;
  patched++;
});

console.log(`Patched ${patched} verification scripts.`);

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

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(qs, null, 2)};
`;
fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts saved.');
