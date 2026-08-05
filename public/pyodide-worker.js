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
      await pyodide.runPythonAsync('import micropip; await micropip.install(["seaborn", "openpyxl"])');
      
      // Load default CSV files passed from main thread
      if (data.datasets) {
        Object.entries(data.datasets).forEach(([filename, info]) => {
          pyodide.FS.writeFile(filename, info.csv);
        });
      }

      // Load custom user-imported datasets from IndexedDB
      if (data.customDatasets) {
        data.customDatasets.forEach((dataset) => {
          try {
            if (dataset.type === 'xlsx') {
              pyodide.FS.writeFile(dataset.name, new Uint8Array(dataset.currentContent));
            } else {
              pyodide.FS.writeFile(dataset.name, dataset.currentContent);
            }
          } catch (e) {
            console.warn(`[pyodide-worker] Failed to load custom dataset ${dataset.name} on init:`, e);
          }
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

  else if (data.type === 'IMPORT_FILE') {
    if (!pyodide) return;
    try {
      if (data.fileType === 'xlsx') {
        pyodide.FS.writeFile(data.filename, new Uint8Array(data.content));
      } else {
        pyodide.FS.writeFile(data.filename, data.content);
      }
      postMessage({ type: 'IMPORT_SUCCESS', filename: data.filename });
    } catch (err) {
      postMessage({ type: 'RUN_ERROR', message: 'Failed to mount file: ' + (err.message || String(err)) });
    }
  }

  else if (data.type === 'DELETE_FILE') {
    if (!pyodide) return;
    try {
      pyodide.FS.unlink(data.filename);
      postMessage({ type: 'DELETE_SUCCESS', filename: data.filename });
    } catch (err) {
      // Ignore if file doesn't exist
    }
  }

  else if (data.type === 'GET_EXCEL_PREVIEW') {
    if (!pyodide) return;
    try {
      const jsonRes = await pyodide.runPythonAsync(`
import pandas as pd
import json
try:
    df = pd.read_excel('${data.filename}').head(15)
    # Convert all columns to strings and fillna
    df = df.astype(str).replace('nan', '')
    # Convert to list of lists including headers
    res = [df.columns.tolist()] + df.values.tolist()
except Exception as preview_err:
    res = [["Error Previewing File"], [str(preview_err)]]
json.dumps(res)
      `);
      postMessage({ type: 'EXCEL_PREVIEW_READY', filename: data.filename, rows: JSON.parse(jsonRes) });
    } catch (err) {
      postMessage({ type: 'RUN_ERROR', message: 'Failed to preview Excel file: ' + err.message });
    }
  }

  else if (data.type === 'RUN_CODE') {
    if (!pyodide) {
      postMessage({ type: 'RUN_ERROR', message: 'Pyodide not loaded yet.' });
      return;
    }
    
    execId = data.execId;
    const code = data.code;
    
    const localSleep = (ms) => {
      const start = Date.now();
      while (Date.now() - start < ms) {}
    };

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
        
        // Paced synchronous sleep locally (no network requests) to prevent thread lock
        localSleep(350);
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
      const filenames = [
        'dirty_store_transactions.csv',
        'student_performance_factors.csv',
        'sensor_readings_noisy.csv',
        'store_dim_customers.csv',
        'corporate_financials_wide.csv',
        'high_frequency_stock_ticks.csv'
      ];
      filenames.forEach(filename => {
        try {
          const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
          updatedFiles[filename] = content;
        } catch (e) {
          console.warn(`[pyodide-worker] Could not read ${filename} after execution:`, e);
        }
      });

      // Scan and return modified user custom datasets
      if (data.customDatasets) {
        data.customDatasets.forEach(d => {
          try {
            if (d.type === 'xlsx') {
              const content = pyodide.FS.readFile(d.name); // Uint8Array
              updatedFiles[d.name] = content.buffer; // ArrayBuffer
            } else {
              const content = pyodide.FS.readFile(d.name, { encoding: 'utf8' });
              updatedFiles[d.name] = content;
            }
          } catch (e) {
            // Ignore if deleted or unreadable
          }
        });
      }

      postMessage({ type: 'RUN_SUCCESS', plotData: plotData || null, updatedFiles });
    } catch (err) {
      // Read current contents of datasets to return to main thread even on error
      const updatedFiles = {};
      const filenames = [
        'dirty_store_transactions.csv',
        'student_performance_factors.csv',
        'sensor_readings_noisy.csv',
        'store_dim_customers.csv',
        'corporate_financials_wide.csv',
        'high_frequency_stock_ticks.csv'
      ];
      filenames.forEach(filename => {
        try {
          const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
          updatedFiles[filename] = content;
        } catch (e) {
          // ignore
        }
      });

      // Scan and return modified user custom datasets
      if (data.customDatasets) {
        data.customDatasets.forEach(d => {
          try {
            if (d.type === 'xlsx') {
              const content = pyodide.FS.readFile(d.name); // Uint8Array
              updatedFiles[d.name] = content.buffer; // ArrayBuffer
            } else {
              const content = pyodide.FS.readFile(d.name, { encoding: 'utf8' });
              updatedFiles[d.name] = content;
            }
          } catch (e) {
            // Ignore if deleted or unreadable
          }
        });
      }

      postMessage({ type: 'RUN_ERROR', message: err.message || String(err), updatedFiles });
    }
  }
};
