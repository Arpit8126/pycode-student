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
      await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'scikit-learn', 'micropip']);
      await pyodide.runPythonAsync('import micropip; await micropip.install("seaborn")');
      
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

      // Matplotlib agg backend and show() mock to prevent clearing active figures
      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
def show_mock(*args, **kwargs):
    pass
plt.show = show_mock
`);

      // Run user code
      await pyodide.runPythonAsync(code);

      // Capture all matplotlib figures as base64 PNG images
      let plotData = null;
      try {
        const result = await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
import matplotlib._pylab_helpers as _helpers
import io
import base64

# Get all open figure managers
managers = _helpers.Gcf.get_all_fig_managers()
imgs = []
for mgr in managers:
    fig = mgr.canvas.figure
    if fig.get_axes():
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        imgs.append(base64.b64encode(buf.read()).decode('utf-8'))

plt.close('all')
imgs[0] if imgs else ""
`);
        // Convert PyProxy to plain JS string
        plotData = result && typeof result.toString === 'function' ? result.toString() : String(result || '');
        if (result && typeof result.destroy === 'function') result.destroy();
      } catch(plotErr) {
        // Plot capture failed - not fatal, just log
        console.warn('[pyodide-worker] plot capture error:', plotErr);
        plotData = '';
      }

      // Read current contents of datasets to return to main thread
      const updatedFiles = {};
      const filenames = ['dirty_store_transactions.csv', 'student_performance_factors.csv', 'sensor_readings_noisy.csv'];
      filenames.forEach(filename => {
        try {
          const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
          updatedFiles[filename] = content;
        } catch (e) {
          console.warn(`[pyodide-worker] Could not read ${filename} after execution:`, e);
        }
      });

      postMessage({ type: 'RUN_SUCCESS', plotData: plotData || null, updatedFiles });
    } catch (err) {
      // Read current contents of datasets to return to main thread even on error
      const updatedFiles = {};
      const filenames = ['dirty_store_transactions.csv', 'student_performance_factors.csv', 'sensor_readings_noisy.csv'];
      filenames.forEach(filename => {
        try {
          const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
          updatedFiles[filename] = content;
        } catch (e) {
          // ignore
        }
      });

      postMessage({ type: 'RUN_ERROR', message: err.message || String(err), updatedFiles });
    }
  }
};
