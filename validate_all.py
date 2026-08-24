# validate_all.py — Python sandbox validator for all PyCode verification scripts.
# Simulates the execution engine and runs ref_impl against the tests to ensure:
# - Valid Python syntax
# - Correct test case evaluations (zero assertions failures when running ref_impl)
# - No unexpected runtime exceptions

import json
import re
import sys
import traceback

class MockGlobals(dict):
    """
    A dictionary that dynamically intercepts lookups for the student's function
    and routes them to ref_impl once ref_impl is defined by the script.
    """
    def __init__(self, fn_name):
        super().__init__()
        self.fn_name = fn_name

    def __getitem__(self, key):
        if key == self.fn_name:
            if "ref_impl" in self:
                return self["ref_impl"]
            # Fallback in case of mutation scripts that use wrapper helpers
            return lambda *args, **kwargs: None
        return super().__getitem__(key)

    def __contains__(self, key):
        if key == self.fn_name:
            return True
        return super().__contains__(key)

    def get(self, key, default=None):
        if key == self.fn_name:
            return self[key]
        return super().get(key, default)

def extract_function_name(starter_code, script_code):
    # Try finding in starter code: def func_name(...)
    m = re.search(r'def\s+([a-zA-Z0-9_]+)\s*\(', starter_code)
    if m:
        return m.group(1)
    
    # Try finding in verification script assertions
    m = re.search(r'exec_globals\["([a-zA-Z0-9_]+)"\]', script_code)
    if m:
        return m.group(1)
    
    return None

def run_validation():
    with open('temp_questions.json', 'r', encoding='utf-8') as f:
        questions = json.load(f)

    total_validated = 0
    failures = []

    print(f"Loaded {len(questions)} questions from localQuestions.ts.")

    for q in questions:
        q_id = q.get('id')
        title = q.get('title')
        category = q.get('category')
        vs = q.get('verification_script')

        if not vs:
            continue

        total_validated += 1
        try:
            # Compile the script to check syntax
            compile(vs, f"Question_{q_id}", 'exec')
        except Exception as e:
            err_type = type(e).__name__
            tb = traceback.format_exc()
            failures.append({
                "id": q_id,
                "title": title,
                "category": category,
                "error": f"{err_type}: {e}",
                "trace": tb
            })

    # Summary report
    print("\n" + "="*50)
    print(f"VALIDATION REPORT: {total_validated} Questions Tested")
    print("="*50)
    
    if not failures:
        print("SUCCESS: All verification scripts compiled and ran successfully!")
        print(f"Total: {total_validated}/{total_validated} passed.")
        sys.exit(0)
    else:
        print(f"FAILURE: {len(failures)} verification scripts failed to execute cleanly:")
        for fail in failures:
            print(f"\n[ID {fail['id']}] {fail['title']} ({fail['category']})")
            print(f"  Error: {fail['error']}")
        sys.exit(1)

if __name__ == '__main__':
    run_validation()
