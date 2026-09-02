importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');

let pyodide = null;
let execId = 'default';
let currentCellId = null;
let isBgLoading = false;

const packagesLoaded = {
  numpy: false,
  pandas: false,
  openpyxl: false,
  matplotlib: false,
  seaborn: false,
  sklearn: false,
  plotly: false
};

// Generate demo Excel files once Pandas & Openpyxl are available
async function generateExcelDemoFiles() {
  if (!pyodide || !packagesLoaded.pandas || !packagesLoaded.openpyxl) return;
  try {
    await pyodide.runPythonAsync(`
import pandas as pd
import numpy as np
import random
from openpyxl import Workbook

# 1. budget_2026.xlsx
writer = pd.ExcelWriter("budget_2026.xlsx", engine="openpyxl")
df_north = pd.DataFrame({
    "ProjID": ["P100", "P101", "P102", "P103", "P100"],
    "Dept": ["IT", "HR", "Sales", "Finance", "IT"],
    "North_Budget": [150000, 80000, None, 200000, 150000]
})
df_north.to_excel(writer, sheet_name="North", index=False)

df_south = pd.DataFrame({
    "Project_ID": ["P104", "P105", "P101", "P106", "P104"],
    "Department": ["IT", "R&D", "HR", "Sales", "IT"],
    "South_Budget": [120000, 300000, None, 180000, 120000]
})
df_south.to_excel(writer, sheet_name="South", index=False)

df_east = pd.DataFrame({
    "Proj_Code": ["P107", "P108", "P102", "P109", "P107"],
    "Dept": ["Marketing", "IT", "Sales", "HR", "Marketing"],
    "East_Budget": [95000, None, 110000, 85000, 95000]
})
df_east.to_excel(writer, sheet_name="East", index=False)
writer.close()

# 2. retail_inventory_merged.xlsx
wb_inventory = Workbook()
ws_inv = wb_inventory.active
ws_inv.title = "Inventory"
ws_inv.append(["Category", "SKU", "StockQuantity", "StockStatus"])
ws_inv.append(["Electronics", "SKU-001", 45, "In Stock"])
ws_inv.append(["", "SKU-002", None, "In Stock"])
ws_inv.append(["", "SKU-003", 12, "Low Stock"])
ws_inv.append(["Clothing", "SKU-004", 110, "In Stock"])
ws_inv.append(["", "SKU-005", None, "Out of Stock"])
ws_inv.append(["", "SKU-004", 110, "In Stock"])
ws_inv.merge_cells("A2:A4")
ws_inv.merge_cells("A5:A7")
wb_inventory.save("retail_inventory_merged.xlsx")

# 3. employee_performance_irregular.xlsx
wb_perf = Workbook()
ws_perf = wb_perf.active
ws_perf.title = "Performance"
ws_perf.append(["HR PERFORMANCE REPORT 2026"])
ws_perf.append(["Confidential - Internal Use Only"])
ws_perf.append(["Generated on: 2026-08-24"])
ws_perf.append([])
ws_perf.append(["EmployeeID", "Dept", "AppraisalScore", "EmploymentType"])
ws_perf.append(["E101", "Sales", 4.2, "Full-Time"])
ws_perf.append(["E102", "Engineering", None, "Full-Time"])
ws_perf.append(["E103", "HR", 3.8, "Contractor"])
ws_perf.append(["E101", "Sales", 4.2, "Full-Time"])
ws_perf.append(["E104", "Engineering", 4.9, None])
wb_perf.save("employee_performance_irregular.xlsx")

# 4. property_appraisals_corrupt.xlsx
df_prop = pd.DataFrame({
    "PropertyID": ["PROP1", "PROP2", "PROP3", "PROP1", "PROP4"],
    "ZipCode": ["10001", "10002", "10001", "10001", "10003"],
    "Price": ["$1,200,000", "$950,000", None, "$1,200,000", "$1,550,000"],
    "SquareFootage": [1500, 1200, 1400, 1500, 1800]
})
df_prop.to_excel("property_appraisals_corrupt.xlsx", index=False)

# 5. smart_meter_consumption.xlsx
np.random.seed(42)
random.seed(42)
times_energy = pd.date_range(start="2026-06-01 00:00:00", periods=20, freq="H").strftime("%Y-%m-%d %H:%M:%S").tolist()
times_energy[5] = times_energy[4]
loads = [round(random.uniform(1.2, 5.8), 2) if i != 10 else None for i in range(20)]
df_energy = pd.DataFrame({
    "Timestamp": times_energy,
    "MeterID": ["M_01"] * 20,
    "PowerLoad_kW": loads
})
df_energy.set_index(["MeterID", "Timestamp"]).to_excel("smart_meter_consumption.xlsx")
    `);
  } catch (err) {
    console.warn('[pyodide-worker] Excel demo generation error:', err);
  }
}

// Progressive background loader for data science packages
async function loadPackagesInBackground() {
  if (isBgLoading) return;
  isBgLoading = true;
  try {
    // Tier 1: NumPy & Pandas + Openpyxl
    postMessage({ type: 'PKG_STATUS', status: 'loading', stage: 1, total: 3, label: 'NumPy & Pandas' });
    await pyodide.loadPackage(['numpy', 'pandas']);
    packagesLoaded.numpy = true;
    packagesLoaded.pandas = true;

    try {
      await pyodide.runPythonAsync('import micropip; await micropip.install("openpyxl")');
      packagesLoaded.openpyxl = true;
      await generateExcelDemoFiles();
    } catch (e) {
      console.warn('[pyodide-worker] Openpyxl setup note:', e);
    }
    postMessage({ type: 'PKG_STATUS', status: 'loading', stage: 1, total: 3, label: 'NumPy & Pandas', completed: true });

    // Tier 2: Matplotlib & Seaborn
    postMessage({ type: 'PKG_STATUS', status: 'loading', stage: 2, total: 3, label: 'Matplotlib & Seaborn' });
    await pyodide.loadPackage(['matplotlib']);
    packagesLoaded.matplotlib = true;
    try {
      await pyodide.runPythonAsync('import micropip; await micropip.install("seaborn")');
      packagesLoaded.seaborn = true;
    } catch (e) {
      console.warn('[pyodide-worker] Seaborn setup note:', e);
    }
    postMessage({ type: 'PKG_STATUS', status: 'loading', stage: 2, total: 3, label: 'Matplotlib & Seaborn', completed: true });

    // Tier 3: Plotly & Scikit-learn
    postMessage({ type: 'PKG_STATUS', status: 'loading', stage: 3, total: 3, label: 'Plotly & ML' });
    try {
      await pyodide.loadPackage(['scikit-learn']);
      packagesLoaded.sklearn = true;
    } catch (e) {}
    try {
      await pyodide.runPythonAsync('import micropip; await micropip.install("plotly")');
      packagesLoaded.plotly = true;
    } catch (e) {
      console.warn('[pyodide-worker] Plotly setup note:', e);
    }
    postMessage({ type: 'PKG_STATUS', status: 'ready', stage: 3, total: 3, label: 'All Packages Loaded', done: true });
  } catch (err) {
    console.warn('[pyodide-worker] Background loading exception:', err);
    postMessage({ type: 'PKG_STATUS', status: 'partial', label: 'Python Ready (Packages on-demand)' });
  } finally {
    isBgLoading = false;
  }
}

self.onmessage = async (e) => {
  const data = e.data;
  
  if (data.type === 'INIT') {
    try {
      // Step 1: Instant core Pyodide startup (< 1.5s)
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
        stdout: (text) => {
          postMessage({ type: 'STDOUT', text, cellId: currentCellId });
        },
        stderr: (text) => {
          postMessage({ type: 'STDERR', text, cellId: currentCellId });
        }
      });

      // Load micropip runtime immediately (tiny built-in)
      await pyodide.loadPackage('micropip');
      
      // Load default CSV datasets passed from main thread
      if (data.datasets) {
        Object.entries(data.datasets).forEach(([filename, info]) => {
          if (filename.endsWith('.xlsx')) return;
          try {
            pyodide.FS.writeFile(filename, info.csv || '');
          } catch (err) {}
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
          } catch (err) {
            console.warn(`[pyodide-worker] Failed to load custom dataset ${dataset.name}:`, err);
          }
        });
      }
      
      // Notify main thread IMMEDIATELY that Python is ready to run!
      postMessage({ type: 'INIT_READY' });
      postMessage({ type: 'PKG_STATUS', status: 'ready_core', label: 'Python Ready' });

      // Step 2: Kick off background package enrichment without blocking the user
      loadPackagesInBackground();
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
      // Ensure Pandas & Openpyxl are available if user requests an Excel preview immediately
      if (!packagesLoaded.pandas) {
        await pyodide.loadPackage(['numpy', 'pandas']);
        packagesLoaded.numpy = true;
        packagesLoaded.pandas = true;
      }
      if (!packagesLoaded.openpyxl) {
        await pyodide.runPythonAsync('import micropip; await micropip.install("openpyxl")');
        packagesLoaded.openpyxl = true;
      }
      const jsonRes = await pyodide.runPythonAsync(`
import pandas as pd
import json
try:
    df = pd.read_excel('${data.filename}').head(1000)
    df = df.astype(str).replace('nan', '')
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
    currentCellId = data.cellId || null;
    const code = data.code || '';
    
    const localSleep = (ms) => {
      const start = Date.now();
      while (Date.now() - start < ms) {}
    };

    // Set custom prompt callback in Python environment
    pyodide.globals.set('_js_prompt', (promptText) => {
      postMessage({ type: 'NEED_INPUT', prompt: promptText, cellId: currentCellId });
      while (true) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/editor/input?execId=" + execId + "&poll=true", false);
        xhr.send(null);
        const response = xhr.responseText;
        if (response !== '__PENDING__') {
          return response;
        }
        localSleep(350);
      }
    });

    pyodide.globals.set('_js_write', (text) => {
      postMessage({ type: 'STDOUT', text, cellId: currentCellId });
    });
    
    try {
      // Write user workspace files before execution
      if (data.savedFiles) {
        data.savedFiles.forEach(file => {
          if (file.name.includes('/')) {
            const parts = file.name.split('/');
            let dir = '';
            for (let i = 0; i < parts.length - 1; i++) {
              dir = dir ? `${dir}/${parts[i]}` : parts[i];
              try {
                pyodide.FS.mkdir(dir);
              } catch (e) {}
            }
          }
          try {
            pyodide.FS.writeFile(file.name, file.code || '');
          } catch (e) {
            console.error("Failed to write to worker FS:", file.name, e);
          }
        });
      }

      // 1. Dynamic Just-In-Time (JIT) dependency resolution
      // If the user's code uses packages before the background loader finished, prioritize them now
      if (code.includes('plotly') && !packagesLoaded.plotly) {
        postMessage({ type: 'STDOUT', text: '[Initializing interactive Plotly engine...]\n', cellId: currentCellId });
        await pyodide.runPythonAsync('import micropip; await micropip.install("plotly")');
        packagesLoaded.plotly = true;
      }
      if (code.includes('seaborn') && !packagesLoaded.seaborn) {
        if (!packagesLoaded.matplotlib) {
          await pyodide.loadPackage(['matplotlib']);
          packagesLoaded.matplotlib = true;
        }
        await pyodide.runPythonAsync('import micropip; await micropip.install("seaborn")');
        packagesLoaded.seaborn = true;
      }
      if ((code.includes('pd.') || code.includes('pandas')) && !packagesLoaded.pandas) {
        await pyodide.loadPackage(['numpy', 'pandas']);
        packagesLoaded.numpy = true;
        packagesLoaded.pandas = true;
      }
      if ((code.includes('plt.') || code.includes('matplotlib')) && !packagesLoaded.matplotlib) {
        await pyodide.loadPackage(['matplotlib']);
        packagesLoaded.matplotlib = true;
      }
      if (pyodide.loadPackagesFromImports) {
        try {
          await pyodide.loadPackagesFromImports(code);
        } catch (e) {}
      }

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

import warnings
def pycode_showwarning(message, category, filename, lineno, file=None, line=None):
    warn_text = warnings.formatwarning(message, category, filename, lineno, line)
    for l in warn_text.splitlines():
        sys.stderr.write(f"__PYCODE_WARNING__:{l}\\n")
warnings.showwarning = pycode_showwarning

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

      // Configure Matplotlib Agg backend & show mock if matplotlib is available
      await pyodide.runPythonAsync(`
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    def show_mock(*args, **kwargs):
        pass
    plt.show = show_mock
except Exception:
    pass

# Setup Plotly renderer hook if plotly is available
_last_plotly_json = ""
try:
    import plotly.io as pio
    import json
    class PyCodePlotlyRenderer:
        def render(self, fig_dict, **kwargs):
            global _last_plotly_json
            _last_plotly_json = json.dumps(fig_dict)
    pio.renderers['pycode'] = PyCodePlotlyRenderer()
    pio.renderers.default = 'pycode'
except Exception:
    pass
`);

      // Run user code
      await pyodide.runPythonAsync(code);

      // Capture Matplotlib figures as base64 PNG images
      let plotData = null;
      try {
        const result = await pyodide.runPythonAsync(`
plot_res = ""
try:
    import matplotlib.pyplot as plt
    import matplotlib._pylab_helpers as _helpers
    import io
    import base64

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
    plot_res = imgs[0] if imgs else ""
except Exception:
    pass
plot_res
`);
        plotData = result && typeof result.toString === 'function' ? result.toString() : String(result || '');
        if (result && typeof result.destroy === 'function') result.destroy();
      } catch(plotErr) {
        console.warn('[pyodide-worker] Matplotlib capture error:', plotErr);
        plotData = '';
      }

      // Capture Plotly figures as JSON specification
      let plotlyData = null;
      try {
        const pResult = await pyodide.runPythonAsync(`
plotly_res = ""
try:
    global _last_plotly_json
    if _last_plotly_json:
        plotly_res = _last_plotly_json
        _last_plotly_json = ""
except Exception:
    pass

if not plotly_res:
    try:
        for _name, _val in list(globals().items()):
            if _name.startswith('_'):
                continue
            if hasattr(_val, 'to_json') and ('Figure' in type(_val).__name__ or 'plotly' in str(type(_val))):
                plotly_res = _val.to_json()
                break
    except Exception:
        pass
plotly_res
`);
        plotlyData = pResult && typeof pResult.toString === 'function' ? pResult.toString() : String(pResult || '');
        if (pResult && typeof pResult.destroy === 'function') pResult.destroy();
      } catch (plotlyErr) {
        console.warn('[pyodide-worker] Plotly capture error:', plotlyErr);
        plotlyData = '';
      }

      // Read current contents of datasets to return to main thread
      const updatedFiles = {};
      const filenames = [
        'dirty_store_transactions.csv',
        'student_performance_factors.csv',
        'sensor_readings_noisy.csv',
        'store_dim_customers.csv',
        'corporate_financials_wide.csv',
        'high_frequency_stock_ticks.csv',
        'financial_transactions_part1.csv',
        'financial_transactions_part2.csv',
        'customer_churn_dirty.csv',
        'iot_telemetry_corrupt.csv',
        'healthcare_demographics_raw.csv',
        'logistics_tracking_dirty.csv',
        'branch_quarterly_revenue.csv',
        'budget_2026.xlsx',
        'retail_inventory_merged.xlsx',
        'employee_performance_irregular.xlsx',
        'property_appraisals_corrupt.xlsx',
        'smart_meter_consumption.xlsx'
      ];
      filenames.forEach(filename => {
        try {
          if (filename.endsWith('.xlsx')) {
            const content = pyodide.FS.readFile(filename);
            updatedFiles[filename] = content.buffer;
          } else {
            const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
            updatedFiles[filename] = content;
          }
        } catch (e) {}
      });

      // Scan and return modified user custom datasets
      if (data.customDatasets) {
        data.customDatasets.forEach(d => {
          try {
            if (d.type === 'xlsx') {
              const content = pyodide.FS.readFile(d.name);
              updatedFiles[d.name] = content.buffer;
            } else {
              const content = pyodide.FS.readFile(d.name, { encoding: 'utf8' });
              updatedFiles[d.name] = content;
            }
          } catch (e) {}
        });
      }

      // Recursively scan Pyodide's virtual filesystem for user files/folders
      const datasetNames = new Set(filenames);
      if (data.customDatasets && Array.isArray(data.customDatasets)) {
        data.customDatasets.forEach(d => datasetNames.add(d.name));
      }
      const scanUserFiles = (dir) => {
        const list = [];
        try {
          const files = pyodide.FS.readdir(dir);
          files.forEach(name => {
            if (name === '.' || name === '..') return;
            const fullPath = dir === '/' ? name : `${dir}/${name}`;
            try {
              const stat = pyodide.FS.stat(fullPath);
              const isDir = pyodide.FS.isDir(stat.mode);
              if (isDir) {
                list.push(...scanUserFiles(fullPath));
              } else {
                let relativePath = fullPath;
                if (relativePath.startsWith('/home/pyodide/')) {
                  relativePath = relativePath.slice('/home/pyodide/'.length);
                } else if (relativePath.startsWith('home/pyodide/')) {
                  relativePath = relativePath.slice('home/pyodide/'.length);
                }
                
                if (datasetNames.has(relativePath)) return;

                // Never treat dataset files as user code scripts
                const lower = relativePath.toLowerCase();
                if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.tsv') || lower.endsWith('.parquet')) {
                  return;
                }
                
                const isBinary = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.pdf');
                if (!isBinary) {
                  const fCode = pyodide.FS.readFile(fullPath, { encoding: 'utf8' });
                  list.push({ name: relativePath, code: fCode });
                }
              }
            } catch (e) {}
          });
        } catch (e) {}
        return list;
      };

      const userFiles = scanUserFiles('/home/pyodide');

      postMessage({
        type: 'RUN_SUCCESS',
        plotData: plotData || null,
        plotlyData: plotlyData || null,
        updatedFiles,
        cellId: currentCellId,
        userFiles
      });
    } catch (err) {
      const updatedFiles = {};
      const filenames = [
        'dirty_store_transactions.csv',
        'student_performance_factors.csv',
        'sensor_readings_noisy.csv',
        'store_dim_customers.csv',
        'corporate_financials_wide.csv',
        'high_frequency_stock_ticks.csv',
        'financial_transactions_part1.csv',
        'financial_transactions_part2.csv',
        'customer_churn_dirty.csv',
        'iot_telemetry_corrupt.csv',
        'healthcare_demographics_raw.csv',
        'logistics_tracking_dirty.csv',
        'branch_quarterly_revenue.csv',
        'budget_2026.xlsx',
        'retail_inventory_merged.xlsx',
        'employee_performance_irregular.xlsx',
        'property_appraisals_corrupt.xlsx',
        'smart_meter_consumption.xlsx'
      ];
      filenames.forEach(filename => {
        try {
          if (filename.endsWith('.xlsx')) {
            const content = pyodide.FS.readFile(filename);
            updatedFiles[filename] = content.buffer;
          } else {
            const content = pyodide.FS.readFile(filename, { encoding: 'utf8' });
            updatedFiles[filename] = content;
          }
        } catch (e) {}
      });

      if (data.customDatasets) {
        data.customDatasets.forEach(d => {
          try {
            if (d.type === 'xlsx') {
              const content = pyodide.FS.readFile(d.name);
              updatedFiles[d.name] = content.buffer;
            } else {
              const content = pyodide.FS.readFile(d.name, { encoding: 'utf8' });
              updatedFiles[d.name] = content;
            }
          } catch (e) {}
        });
      }

      const datasetNames = new Set(filenames);
      if (data.customDatasets && Array.isArray(data.customDatasets)) {
        data.customDatasets.forEach(d => datasetNames.add(d.name));
      }
      const scanUserFiles = (dir) => {
        const list = [];
        try {
          const files = pyodide.FS.readdir(dir);
          files.forEach(name => {
            if (name === '.' || name === '..') return;
            const fullPath = dir === '/' ? name : `${dir}/${name}`;
            try {
              const stat = pyodide.FS.stat(fullPath);
              const isDir = pyodide.FS.isDir(stat.mode);
              if (isDir) {
                list.push(...scanUserFiles(fullPath));
              } else {
                let relativePath = fullPath;
                if (relativePath.startsWith('/home/pyodide/')) {
                  relativePath = relativePath.slice('/home/pyodide/'.length);
                } else if (relativePath.startsWith('home/pyodide/')) {
                  relativePath = relativePath.slice('home/pyodide/'.length);
                }
                
                if (datasetNames.has(relativePath)) return;

                // Never treat dataset files as user code scripts
                const lower = relativePath.toLowerCase();
                if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.tsv') || lower.endsWith('.parquet')) {
                  return;
                }
                
                const isBinary = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.pdf');
                if (!isBinary) {
                  const fCode = pyodide.FS.readFile(fullPath, { encoding: 'utf8' });
                  list.push({ name: relativePath, code: fCode });
                }
              }
            } catch (e) {}
          });
        } catch (e) {}
        return list;
      };

      const userFiles = scanUserFiles('/home/pyodide');
      postMessage({
        type: 'RUN_ERROR',
        message: err.message || String(err),
        updatedFiles,
        cellId: currentCellId,
        userFiles
      });
    }
  }
};
