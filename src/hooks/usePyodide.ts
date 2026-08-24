'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DEFAULT_DATASETS } from '@/lib/datasetGenerator'

declare global {
  interface Window {
    loadPyodide?: any
  }
}

function getQuestionTotalCases(verificationScript?: string): number {
  if (!verificationScript) return 1
  
  // 1. Check for literal assignment: exec_globals['total_cases'] = 5
  const literalMatch = verificationScript.match(/exec_globals\[["']total_cases["']\]\s*=\s*(\d+)/)
  if (literalMatch) {
    return parseInt(literalMatch[1], 10)
  }
  
  // 2. Check for _total = N (our patched format)
  const privateTotalMatch = verificationScript.match(/^\s*_total\s*=\s*([1-9]\d*)/m)
  if (privateTotalMatch) {
    return parseInt(privateTotalMatch[1], 10)
  }
  
  // 3. Check for total = N (not 0)
  const totalMatches = verificationScript.match(/^\s*total\s*=\s*([1-9]\d*)/m)
  if (totalMatches) {
    return parseInt(totalMatches[1], 10)
  }
  
  // 4. Count test_cases list length if possible
  const listMatch = verificationScript.match(/test_cases\s*=\s*(\[[\s\S]*?\])/)
  if (listMatch) {
    try {
      const arr = JSON.parse(listMatch[1].replace(/'/g, '"'))
      if (Array.isArray(arr) && arr.length > 0) return arr.length
    } catch {}
  }
  
  if (!verificationScript.includes('fn = exec_globals') && !verificationScript.includes('assert fn(')) {
    return 1
  }
  return 1
}

export type PyodideState = 'idle' | 'loading_script' | 'loading_wasm' | 'loading_packages' | 'ready' | 'error'

export function usePyodide() {
  const [state, setState] = useState<PyodideState>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const pyodideRef = useRef<any>(null)

  useEffect(() => {
    let active = true

    const initPyodide = async () => {
      if (pyodideRef.current) {
        setState('ready')
        return
      }

      setState('loading_script')
      setProgressMsg('Loading WebAssembly core...')

      // 1. Append Pyodide script dynamically if not present
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Pyodide script from CDN.'))
          document.body.appendChild(script)
        })
      }

      if (!active) return

      try {
        setState('loading_wasm')
        setProgressMsg('Initializing Python virtual machine...')

        // 2. Load Pyodide engine
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/'
        })

        if (!active) return

        pyodideRef.current = pyodide

        setState('loading_packages')
        setProgressMsg('Downloading Pandas, NumPy, Matplotlib & Seaborn packages...')

        // 3. Pre-load standard libraries (NumPy, Pandas, Matplotlib, Scikit-learn, Micropip)
        await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'scikit-learn', 'micropip'])

        // 4. Install pure Python Seaborn library using micropip
        await pyodide.runPythonAsync('import micropip; await micropip.install("seaborn")')

        if (!active) return
        
        setState('ready')
        setProgressMsg('Environment ready!')
      } catch (err: any) {
        console.error("Pyodide loading failed:", err)
        if (active) {
          setState('error')
          setErrorMsg(err.message || 'Failed to bootstrap Pyodide.')
        }
      }
    }

    initPyodide()

    return () => {
      active = false
    }
  }, [])

  const runCode = useCallback(async (code: string, verificationScript: string = '') => {
    if (!pyodideRef.current) {
      throw new Error('Python runner is not initialized yet.')
    }

    const py = pyodideRef.current

    // Write all datasets to Pyodide virtual filesystem
    Object.keys(DEFAULT_DATASETS).forEach(filename => {
      try {
        py.FS.writeFile(filename, DEFAULT_DATASETS[filename].csv)
      } catch (err) {
        console.error(`Failed to write dataset ${filename} to Pyodide FS:`, err)
      }
    })

    // Set up headless canvas interceptor and output streams in virtual filesystem
    const wrapperCode = `
import sys
import io
import json
import base64

# Enforce Agg headless plots
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.show = lambda *args, **kwargs: None
import pandas as pd
import numpy as np

# Intercept output
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

result = {
    "status": "accepted",
    "output": "",
    "passed_cases": 0,
    "total_cases": 0,
    "visualization": ""
}

try:
    # Set up global variables environment
    import builtins
    builtins.input = lambda *args, **kwargs: ""
    exec_globals = {
        'plt': plt,
        'pd': pd,
        'np': np,
        '__builtins__': __builtins__
    }
    exec_globals['exec_globals'] = exec_globals
    
    # 1. Run User Code
    exec(${JSON.stringify(code)}, exec_globals)

        
    # 3. Run Test Verifications if provided
    verification_code = ${JSON.stringify(verificationScript)}
    
    # Pre-process verification script to fix database seeding typos (missing newlines before exec_globals)
    if verification_code:
        verification_code = verification_code.replace('"exec_globals["passed_cases"]', '"' + chr(10) + 'exec_globals["passed_cases"]')
        verification_code = verification_code.replace('"exec_globals["total_cases"]', '"' + chr(10) + 'exec_globals["total_cases"]')
        verification_code = verification_code.replace("exec_globals[" + chr(39) + "passed_cases" + chr(39) + "]", chr(10) + "exec_globals[" + chr(39) + "passed_cases" + chr(39) + "]")
        verification_code = verification_code.replace("exec_globals[" + chr(39) + "total_cases" + chr(39) + "]", chr(10) + "exec_globals[" + chr(39) + "total_cases" + chr(39) + "]")
    
    # Pre-verify script-based variables using console stdout print values
    # This allows students to name variables freely and print the outputs directly.
    import re
    import pandas as pd
    
    stdout_val = sys.stdout.getvalue() or ""
    
    # 1. Bind any DataFrame in exec_globals to the expected names (e.g., df, cleaned_df)
    found_df = None
    for k, v in list(exec_globals.items()):
        if isinstance(v, pd.DataFrame):
            found_df = v
            break
    if found_df is not None:
        exec_globals["df"] = found_df
        exec_globals["cleaned_df"] = found_df
                    
    # 2. Match printed expected values to variables (e.g. matching 891 to row_count)
    if verification_code:
        matches = re.findall('assert +exec_globals..([a-zA-Z0-9_]+).. *== *([^,]+)', verification_code)
        for var_name, expected_str in matches:
            try:
                expected_val = eval(expected_str, exec_globals)
                expected_repr = str(expected_val).strip()
                stdout_tokens = [t.strip() for t in stdout_val.split()]
                if expected_repr in stdout_tokens or expected_repr in stdout_val:
                    exec_globals[var_name] = expected_val
            except Exception:
                pass
    
    # Generate and print a safe sample run with DIFFERENT inputs to show return values without leaking test cases
    import random
    match = re.search('assert[ \t]+.([a-zA-Z0-9_]+).[ \t]+in[ \t]+exec_globals', verification_code)
    if match:
        fn_name = match.group(1)
        if fn_name in exec_globals and callable(exec_globals[fn_name]):
            arg_match = re.search('assert[ \t]+fn[(](.*?)[)][ \t]*==', verification_code)
            if not arg_match:
                arg_match = re.search(f'assert[ \t]+{fn_name}[(](.*?)[)][ \t]*==', verification_code)
            if arg_match:
                arg_str = arg_match.group(1)
                try:
                    orig_arg = eval(arg_str, exec_globals)
                    if isinstance(orig_arg, list):
                        if all(isinstance(x, int) for x in orig_arg):
                            new_arg = [random.randint(1, 100) for _ in range(len(orig_arg))]
                        else:
                            new_arg = [f"val_{i}" for i in range(len(orig_arg))]
                    elif isinstance(orig_arg, str):
                        new_arg = "test_" + "".join(random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(len(orig_arg) or 5))
                    elif isinstance(orig_arg, int):
                        new_arg = random.randint(5, 80)
                    elif isinstance(orig_arg, float):
                        new_arg = round(random.uniform(5.0, 80.0), 2)
                    elif isinstance(orig_arg, dict):
                        new_arg = {f"k{i}": random.randint(1, 10) for i in range(len(orig_arg) or 2)}
                    else:
                        new_arg = orig_arg
                    
                    # Run sample case and print output
                    res = exec_globals[fn_name](new_arg)
                    print(f"--- SAMPLE RUN ---")
                    print(f"Input:  {fn_name}({repr(new_arg)})")
                    print(f"Return: {repr(res)}")
                    print("-" * 18)
                except Exception:
                    pass

    if verification_code:
        # ── Line-by-line transform: make assert-based tests non-fatal ──
        # Replaces "assert res == expected, msg" + next "passed += 1" line
        # with an if/else that continues running all test cases
        _lines = verification_code.split(chr(10))
        _out = []
        for _ln in _lines:
            _stripped = _ln.lstrip()
            if _stripped.startswith('assert res == expected,'):
                _indent = _ln[:len(_ln) - len(_stripped)]
                _out.append(_indent + '_current_ok = (res == expected)')
                _out.append(_indent + 'exec_globals["_current_ok"] = _current_ok')
                _out.append(_indent + 'import sys')
                _out.append(_indent + '_tc_num = exec_globals.get("_tc_idx", 1)')
                _out.append(_indent + 'if _current_ok: print(f"✓ Test Case {_tc_num} Passed")')
                _out.append(_indent + 'else: print(f"❌ Test Case {_tc_num} FAILED: got {res!r}, expected {expected!r}", file=sys.stderr)')
                _out.append(_indent + 'exec_globals["_tc_idx"] = _tc_num + 1')
            elif _stripped == 'passed += 1':
                _indent = _ln[:len(_ln) - len(_stripped)]
                _out.append(_indent + 'if exec_globals.get("_current_ok", True): passed += 1')
            else:
                _out.append(_ln)
        _patched_verification = chr(10).join(_out)
        exec_globals["_current_ok"] = True
        exec_globals["_tc_idx"] = 1
        exec(_patched_verification, exec_globals)
        passed = exec_globals.get("passed_cases", exec_globals.get("passed", 0))
        total = exec_globals.get("total_cases", exec_globals.get("_total", 1))
        
        # If this is a script-based question (no function fn defined), show exactly 1 test case
        if "fn = exec_globals" not in verification_code and "assert fn(" not in verification_code:
            result["passed_cases"] = 1 if result["status"] == "accepted" else 0
            result["total_cases"] = 1
        else:
            result["passed_cases"] = passed
            result["total_cases"] = total
            if passed == total:
                result["status"] = "accepted"
            else:
                result["status"] = "wrong_answer"

except AssertionError as ae:
    result["status"] = "wrong_answer"
    result["passed_cases"] = exec_globals.get("passed_cases", exec_globals.get("passed", 0))
    result["total_cases"] = exec_globals.get("total_cases", exec_globals.get("_total", 1))
    # Don't print raw exception — verification script already printed clean output
except Exception as e:
    import traceback
    result["status"] = "runtime_error"
    result["passed_cases"] = exec_globals.get("passed", 0)
    result["total_cases"] = exec_globals.get("total_cases", exec_globals.get("total", 1))
    
    exc_type, exc_value, exc_tb = sys.exc_info()
    if exc_type is SyntaxError:
        print(f"SyntaxError: {exc_value}", file=sys.stderr)
        if exc_value.text:
            print(f"  Line {exc_value.lineno}: {exc_value.text.strip()}", file=sys.stderr)
            if exc_value.offset:
                print("  " + " " * (exc_value.offset - 1) + "^", file=sys.stderr)
    else:
        tblist = traceback.extract_tb(exc_tb)
        filtered_tb = [f for f in tblist if f.filename == "<string>"]
        if filtered_tb:
            print("Traceback (most recent call last):", file=sys.stderr)
            for frame in filtered_tb:
                print(f'  File "editor.py", line {frame.lineno}, in {frame.name}', file=sys.stderr)
                if frame.line:
                    print(f'    {frame.line}', file=sys.stderr)
        print(f"{exc_type.__name__}: {exc_value}", file=sys.stderr)
finally:
    try:
        import matplotlib._pylab_helpers as _helpers
        managers = _helpers.Gcf.get_all_fig_managers()
        if managers:
            fig = managers[0].canvas.figure
            if fig.get_axes():
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
                buf.seek(0)
                result["visualization"] = base64.b64encode(buf.read()).decode('utf-8')
    except Exception:
        pass
    plt.close('all')
    result["output"] = sys.stdout.getvalue() + sys.stderr.getvalue()
    
# Return json parsed results
json.dumps(result)
`
    try {
      const jsonRes = await py.runPythonAsync(wrapperCode)
      const res = JSON.parse(jsonRes)
      if (verificationScript) {
        // Only override with JS-computed total if Python didn't set it correctly (> 1 means Python set it)
        const jsFallback = getQuestionTotalCases(verificationScript)
        if (!res.total_cases || res.total_cases <= 1) {
          res.total_cases = jsFallback
        }
      }
      return res
    } catch (e: any) {
      return {
        "status": "runtime_error",
        "output": `Interpreter Crash: ${e.message}`,
        "passed_cases": 0,
        "total_cases": getQuestionTotalCases(verificationScript),
        "visualization": ""
      }
    }
  }, [])

  return {
    state,
    progressMsg,
    errorMsg,
    runCode
  }
}
