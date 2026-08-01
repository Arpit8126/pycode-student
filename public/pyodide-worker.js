importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');

let pyodide = null;
let execId = 'default';

self.onmessage = async (e) => {
  const data = e.data;
  
  if (data.type === 'INIT') {
    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
        stdout: (text) => {
          postMessage({ type: 'STDOUT', text });
        },
        stderr: (text) => {
          postMessage({ type: 'STDERR', text });
        }
      });
      await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'scikit-learn']);
      
      // Load default CSV files passed from main thread
      if (data.datasets) {
        Object.entries(data.datasets).forEach(([filename, info]) => {
          pyodide.FS.writeFile(filename, info.csv);
        });
      }
      
      postMessage({ type: 'INIT_READY' });
    } catch (err) {
      postMessage({ type: 'INIT_ERROR', message: err.message || String(err) });
    }
  }
  
  else if (data.type === 'GET_FILE') {
    if (!pyodide) return;
    try {
      const content = pyodide.FS.readFile(data.filename, { encoding: 'utf8' });
      postMessage({ type: 'FILE_CONTENT', filename: data.filename, content });
    } catch (err) {
      postMessage({ type: 'RUN_ERROR', message: err.message || String(err) });
    }
  }

  else if (data.type === 'RESET_FILE') {
    if (!pyodide) return;
    try {
      pyodide.FS.writeFile(data.filename, data.csv);
      const content = pyodide.FS.readFile(data.filename, { encoding: 'utf8' });
      postMessage({ type: 'FILE_CONTENT', filename: data.filename, content });
    } catch (err) {
      postMessage({ type: 'RUN_ERROR', message: err.message || String(err) });
    }
  }

  else if (data.type === 'RUN_CODE') {
    if (!pyodide) {
      postMessage({ type: 'RUN_ERROR', message: 'Pyodide not loaded yet.' });
      return;
    }
    
    execId = data.execId;
    const code = data.code;
    
    // Set custom prompt callback in Python environment
    pyodide.globals.set('_js_prompt', (promptText) => {
      // 1. Notify main thread to open custom React modal dialog
      postMessage({ type: 'NEED_INPUT', prompt: promptText });
      
      // 2. Perform short-polling check loop using synchronous XHR
      while (true) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/editor/input?execId=" + execId + "&poll=true", false);
        xhr.send(null);
        
        const response = xhr.responseText;
        if (response !== '__PENDING__') {
          return response;
        }
        
        // Paced synchronous sleep to prevent thread lock issues
        const sleepXhr = new XMLHttpRequest();
        sleepXhr.open("GET", "/api/editor/sleep?ms=150", false);
        sleepXhr.send(null);
      }
    });

    pyodide.globals.set('_js_write', (text) => {
      postMessage({ type: 'STDOUT', text });
    });
    
    try {
      // Direct stream writer setup
      await pyodide.runPythonAsync(`
import sys
import builtins

class JSStreamWriter:
    def write(self, text):
        _js_write(text)
    def flush(self):
        pass

sys.stdout = JSStreamWriter()
sys.stderr = JSStreamWriter()

def input_mock(prompt=""):
    if prompt:
        print(prompt, end="")
    try:
        val = _js_prompt(str(prompt))
        print(val)
        return val
    except Exception:
        return ""
builtins.input = input_mock
`);

      // Matplotlib agg backend
      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
`);

      // Run user code
      await pyodide.runPythonAsync(code);
      
      // Check for plots
      const plotData = await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
import io
import base64
fig = plt.gcf()
if fig.get_axes():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    plt.close('all')
    img_data
else:
    ""
`);
      postMessage({ type: 'RUN_SUCCESS', plotData });
    } catch (err) {
      postMessage({ type: 'RUN_ERROR', message: err.message || String(err) });
    }
  }
};
