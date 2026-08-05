"""
Test script to verify Q83, Q84, Q85 verification logic.
Tests CORRECT solutions (must pass all 3 cases) and WRONG solutions (must fail).
"""
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PathCollection

PASS = "\033[92m PASS\033[0m"
FAIL = "\033[91m FAIL\033[0m"

def run_test(name, fn, df, check_fn):
    plt.close('all')
    try:
        ax = fn(df)
        result, msg = check_fn(ax, df)
        status = PASS if result else FAIL
        print(f"  {status} | {name}: {msg}")
        return result
    except AssertionError as e:
        print(f"  {FAIL} | {name}: AssertionError — {e}")
        return False
    except Exception as e:
        print(f"  {FAIL} | {name}: Exception — {e}")
        return False

# ════════════════════════════════════════════════════
# Q83 — Simple Student Marks Bar Plot
# ════════════════════════════════════════════════════
print("\n" + "="*60)
print("Q83: Simple Student Marks Bar Plot")
print("="*60)

# --- CORRECT SOLUTION ---
def plot_student_marks_CORRECT(df):
    fig, ax = plt.subplots()
    ax.bar(df['Name'], df['Marks'])
    ax.set_xlabel('Student Name')
    ax.set_ylabel('Marks')
    ax.set_title('Student Marks Overview')
    return ax

# --- WRONG: missing labels ---
def plot_student_marks_WRONG_no_labels(df):
    fig, ax = plt.subplots()
    ax.bar(df['Name'], df['Marks'])
    return ax

# --- WRONG: wrong ylabel ---
def plot_student_marks_WRONG_wrong_label(df):
    fig, ax = plt.subplots()
    ax.bar(df['Name'], df['Marks'])
    ax.set_xlabel('Student Name')
    ax.set_ylabel('Score')  # Wrong — should be "Marks"
    ax.set_title('Student Marks Overview')
    return ax

# --- WRONG: only 2 bars for 4-student dataset (simulates wrong grouping) ---
def plot_student_marks_WRONG_wrong_bars(df):
    fig, ax = plt.subplots()
    ax.bar(['A', 'B'], [80, 90])  # hardcoded 2 bars regardless of df
    ax.set_xlabel('Student Name')
    ax.set_ylabel('Marks')
    ax.set_title('Student Marks Overview')
    return ax

df83_3 = pd.DataFrame({'Name': ['Alice', 'Bob', 'Carol'], 'Marks': [85.0, 72.0, 90.0]})
df83_4 = pd.DataFrame({'Name': ['X', 'Y', 'Z', 'W'], 'Marks': [55.0, 70.0, 88.0, 95.0]})

def check_q83_t1(ax, df): r = ax.get_ylabel() == 'Marks'; return r, f"ylabel='{ax.get_ylabel()}'"
def check_q83_t2(ax, df): r = ax.get_xlabel() == 'Student Name' and ax.get_title() == 'Student Marks Overview'; return r, f"xlabel='{ax.get_xlabel()}' title='{ax.get_title()}'"
def check_q83_t3(ax, df): r = len(ax.patches) == len(df); return r, f"bars={len(ax.patches)} expected={len(df)}"

print("\n✅ CORRECT solution (should pass all 3):")
run_test("T1: ylabel==Marks",             plot_student_marks_CORRECT, df83_3, check_q83_t1)
run_test("T2: xlabel+title correct",       plot_student_marks_CORRECT, df83_3, check_q83_t2)
run_test("T3: bar count == len(df)",       plot_student_marks_CORRECT, df83_4, check_q83_t3)

print("\n❌ WRONG: no labels (should fail T1):")
run_test("T1: ylabel==Marks",             plot_student_marks_WRONG_no_labels, df83_3, check_q83_t1)

print("\n❌ WRONG: ylabel='Score' (should fail T1):")
run_test("T1: ylabel==Marks",             plot_student_marks_WRONG_wrong_label, df83_3, check_q83_t1)

print("\n❌ WRONG: hardcoded 2 bars (should fail T3):")
run_test("T3: bar count == len(df)",      plot_student_marks_WRONG_wrong_bars, df83_4, check_q83_t3)

# ════════════════════════════════════════════════════
# Q84 — Age vs Marks Scatter Plot
# ════════════════════════════════════════════════════
print("\n" + "="*60)
print("Q84: Age vs Marks Scatter Plot")
print("="*60)

def plot_age_vs_marks_CORRECT(df):
    fig, ax = plt.subplots()
    ax.scatter(df['Age'], df['Marks'])
    ax.set_xlabel('Age')
    ax.set_ylabel('Marks')
    ax.set_title('Age vs Marks Distribution')
    return ax

def plot_age_vs_marks_WRONG_bar(df):
    fig, ax = plt.subplots()
    ax.bar(df['Age'], df['Marks'])  # bar instead of scatter
    ax.set_xlabel('Age')
    ax.set_ylabel('Marks')
    ax.set_title('Age vs Marks Distribution')
    return ax

def plot_age_vs_marks_WRONG_no_xlabel(df):
    fig, ax = plt.subplots()
    ax.scatter(df['Age'], df['Marks'])
    ax.set_ylabel('Marks')
    ax.set_title('Age vs Marks Distribution')
    return ax

def plot_age_vs_marks_WRONG_wrong_title(df):
    fig, ax = plt.subplots()
    ax.scatter(df['Age'], df['Marks'])
    ax.set_xlabel('Age')
    ax.set_ylabel('Marks')
    ax.set_title('Scatter Plot')  # wrong title
    return ax

df84 = pd.DataFrame({'Age': [20.0, 22.0, 25.0], 'Marks': [80.0, 65.0, 90.0]})
df84_5 = pd.DataFrame({'Age': [18.0, 20.0, 22.0, 24.0, 26.0], 'Marks': [50.0, 60.0, 75.0, 80.0, 95.0]})

def check_q84_t1(ax, df): r = ax.get_xlabel() == 'Age'; return r, f"xlabel='{ax.get_xlabel()}'"
def check_q84_t2(ax, df): r = ax.get_ylabel() == 'Marks' and ax.get_title() == 'Age vs Marks Distribution'; return r, f"ylabel='{ax.get_ylabel()}' title='{ax.get_title()}'"
def check_q84_t3(ax, df): has = any(isinstance(c, PathCollection) for c in ax.collections); return has, f"PathCollection found={has}"

print("\n✅ CORRECT solution (should pass all 3):")
run_test("T1: xlabel==Age",                    plot_age_vs_marks_CORRECT, df84, check_q84_t1)
run_test("T2: ylabel+title correct",           plot_age_vs_marks_CORRECT, df84, check_q84_t2)
run_test("T3: scatter PathCollection present", plot_age_vs_marks_CORRECT, df84_5, check_q84_t3)

print("\n❌ WRONG: bar instead of scatter (should fail T3):")
run_test("T3: scatter PathCollection present", plot_age_vs_marks_WRONG_bar, df84_5, check_q84_t3)

print("\n❌ WRONG: missing xlabel (should fail T1):")
run_test("T1: xlabel==Age",                    plot_age_vs_marks_WRONG_no_xlabel, df84, check_q84_t1)

print("\n❌ WRONG: wrong title (should fail T2):")
run_test("T2: ylabel+title correct",           plot_age_vs_marks_WRONG_wrong_title, df84, check_q84_t2)

# ════════════════════════════════════════════════════
# Q85 — Average Marks by Age Group Bar Plot
# ════════════════════════════════════════════════════
print("\n" + "="*60)
print("Q85: Average Marks by Age Group Bar Plot")
print("="*60)

def plot_avg_marks_by_age_CORRECT(df):
    fig, ax = plt.subplots()
    avg = df.groupby('Age')['Marks'].mean()
    ax.bar(avg.index, avg.values)
    ax.set_xlabel('Age')
    ax.set_ylabel('Average Marks')
    ax.set_title('Average Marks by Age')
    return ax

def plot_avg_marks_by_age_WRONG_no_groupby(df):
    fig, ax = plt.subplots()
    ax.bar(df['Age'], df['Marks'])  # raw rows, no groupby
    ax.set_xlabel('Age')
    ax.set_ylabel('Average Marks')
    ax.set_title('Average Marks by Age')
    return ax

def plot_avg_marks_by_age_WRONG_labels(df):
    fig, ax = plt.subplots()
    avg = df.groupby('Age')['Marks'].mean()
    ax.bar(avg.index, avg.values)
    ax.set_xlabel('Age')
    ax.set_ylabel('Marks')        # wrong — should be "Average Marks"
    ax.set_title('Average Marks by Age')
    return ax

df85_3row = pd.DataFrame({'Age': [20.0, 20.0, 22.0], 'Marks': [80.0, 90.0, 70.0]})
df85_6row = pd.DataFrame({
    'Age':   [18.0, 18.0, 20.0, 22.0, 22.0, 22.0],
    'Marks': [60.0, 80.0, 75.0, 85.0, 90.0, 95.0]
})

def check_q85_t1(ax, df):
    ok = ax.get_xlabel() == 'Age' and ax.get_ylabel() == 'Average Marks' and ax.get_title() == 'Average Marks by Age'
    return ok, f"xlabel='{ax.get_xlabel()}' ylabel='{ax.get_ylabel()}' title='{ax.get_title()}'"

def check_q85_t2(ax, df):
    expected = df['Age'].nunique()
    actual = len(ax.patches)
    return actual == expected, f"bars={actual} expected={expected}"

def check_q85_t3(ax, df):
    expected = df['Age'].nunique()
    actual = len(ax.patches)
    return actual == expected, f"bars={actual} expected={expected} (6-row/3-age dataset)"

print("\n✅ CORRECT solution (should pass all 3):")
run_test("T1: all labels+title correct",       plot_avg_marks_by_age_CORRECT, df85_3row, check_q85_t1)
run_test("T2: bar count == nunique (3-row df)",plot_avg_marks_by_age_CORRECT, df85_3row, check_q85_t2)
run_test("T3: bar count == nunique (6-row df)",plot_avg_marks_by_age_CORRECT, df85_6row, check_q85_t3)

print("\n❌ WRONG: no groupby — plots raw rows (should fail T2 & T3):")
run_test("T2: bar count == nunique (3-row df)",plot_avg_marks_by_age_WRONG_no_groupby, df85_3row, check_q85_t2)
run_test("T3: bar count == nunique (6-row df)",plot_avg_marks_by_age_WRONG_no_groupby, df85_6row, check_q85_t3)

print("\n❌ WRONG: ylabel='Marks' not 'Average Marks' (should fail T1):")
run_test("T1: all labels+title correct",       plot_avg_marks_by_age_WRONG_labels, df85_3row, check_q85_t1)

plt.close('all')
print("\n" + "="*60)
print("All tests complete.")
print("="*60)
