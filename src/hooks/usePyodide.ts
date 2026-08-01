'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DATASET_SAMPLES } from '@/lib/datasetSamples'

function convertToCSV(rows: any[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map(row => 
    columns.map(col => {
      let val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') {
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }
      return String(val);
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

declare global {
  interface Window {
    loadPyodide?: any
  }
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

        // 3. Pre-load standard libraries (NumPy, Pandas, Matplotlib)
        // Note: Seaborn is pure Python and can be loaded dynamically, but Pandas/Numpy need compiled C extensions.
        await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'scikit-learn'])

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
    await Promise.all(Object.keys(DATASET_SAMPLES).map(async filename => {
      if (filename === 'titanic.csv') {
        try {
          const res = await fetch('https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv')
          if (res.ok) {
            const text = await res.text()
            py.FS.writeFile(filename, text)
            return
          }
        } catch (err) {
          console.warn("Failed to fetch full titanic.csv, falling back to local sample:", err)
        }
      }
      
      const ds = DATASET_SAMPLES[filename]
      const cols = ds.columns.map(c => c.column)
      const csvStr = convertToCSV(ds.rows, cols)
      try {
        py.FS.writeFile(filename, csvStr)
      } catch (err) {
        console.error(`Failed to write dataset ${filename} to Pyodide FS:`, err)
      }
    }))

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
    # 2. Capture Plotted Canvas if any axis has active subplots
    fig = plt.gcf()
    if fig.get_axes():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        result["visualization"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close('all')
        
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
        exec(verification_code, exec_globals)
        passed = exec_globals.get("passed_cases", 1)
        total = exec_globals.get("total_cases", 1)
        
        # If this is a script-based question (no function fn defined), show exactly 1 test case
        if "fn = exec_globals" not in verification_code and "assert fn(" not in verification_code:
            result["passed_cases"] = 1 if result["status"] == "accepted" else 0
            result["total_cases"] = 1
        else:
            result["passed_cases"] = passed
            result["total_cases"] = total

except AssertionError as ae:
    result["status"] = "wrong_answer"
    result["passed_cases"] = 0
    result["total_cases"] = 1
    print(f"Test Failed: {ae}", file=sys.stderr)
except Exception as e:
    import traceback
    result["status"] = "runtime_error"
    result["passed_cases"] = 0
    result["total_cases"] = 1
    
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
    plt.close('all')
    result["output"] = sys.stdout.getvalue() + sys.stderr.getvalue()
    
# Return json parsed results
json.dumps(result)
`
    try {
      const jsonRes = await py.runPythonAsync(wrapperCode)
      return JSON.parse(jsonRes)
    } catch (e: any) {
      return {
        "status": "runtime_error",
        "output": `Interpreter Crash: ${e.message}`,
        "passed_cases": 0,
        "total_cases": 1,
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
