// fix_math_questions.js — Corrects starter_code & verification_script for all 167 questions
// where title and function name don't match (generator mapping bug)

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

// ─── Correct starter_code + verification_script per question ID ───────────────
// Format: id → { starter, ref, tests, totalCases, fnName }
// ref = the reference implementation body (receives ...args)
// tests = array of test case values or tuples
const FIXES = {

  // ── MATH SECTION (IDs 26-55) ─────────────────────────────────────────────

  26: { // Number Reverse
    starter: `def reverse_number(n):\n    # Reverse digits of integer n mathematically\n    pass`,
    fnName: 'reverse_number',
    ref: `sign=1 if args[0]>=0 else -1; n=abs(args[0]); r=0
while n>0: r=r*10+n%10; n//=10
return sign*r`,
    tests: [5792, -408, 0, 100, -7],
    total: 5
  },

  27: { // String Reverse
    starter: `def reverse_string(s):\n    # Return the string reversed\n    pass`,
    fnName: 'reverse_string',
    ref: `return args[0][::-1]`,
    tests: [`"hello"`, `"PyCode"`, `""`, `"a"`, `"racecar"`],
    total: 5,
    strTests: true
  },

  28: { // Count Digits
    starter: `def count_digits(n):\n    # Count digits in integer n\n    pass`,
    fnName: 'count_digits',
    ref: `return len(str(abs(args[0]))) if args[0]!=0 else 1`,
    tests: [34521, -90, 0, 7, 1000000],
    total: 5
  },

  29: { // Sum of Digits
    starter: `def sum_of_digits(n):\n    # Return sum of digits of n\n    pass`,
    fnName: 'sum_of_digits',
    ref: `return sum(int(d) for d in str(abs(args[0])))`,
    tests: [1234, -506, 0, 11, 999],
    total: 5
  },

  30: { // Swap Two Numbers
    starter: `def swap_numbers(a, b):\n    # Return (b, a) — swap without a temp variable\n    pass`,
    fnName: 'swap_numbers',
    ref: `return (args[1], args[0])`,
    tests: [[5,10],[0,-3],[100,200],[-5,-5],[1,2]],
    total: 5,
    tupleTests: true
  },

  31: { // Check Even or Odd
    starter: `def even_or_odd(n):\n    # Return "Even" or "Odd"\n    pass`,
    fnName: 'even_or_odd',
    ref: `return "Even" if args[0]%2==0 else "Odd"`,
    tests: [42, -17, 0, -2, 100],
    total: 5
  },

  32: { // Fibonacci Series
    starter: `def fibonacci_series(n):\n    # Return a list of the first n Fibonacci numbers\n    pass`,
    fnName: 'fibonacci_series',
    ref: `a,b,r=0,1,[]
for _ in range(args[0]): r.append(a); a,b=b,a+b
return r`,
    tests: [1, 5, 8, 10, 0],
    total: 5
  },

  33: { // Nth Fibonacci
    starter: `def nth_fibonacci(n):\n    # Return the nth Fibonacci number (0-indexed)\n    pass`,
    fnName: 'nth_fibonacci',
    ref: `a,b=0,1
for _ in range(args[0]): a,b=b,a+b
return a`,
    tests: [0, 1, 5, 10, 15],
    total: 5
  },

  34: { // Factorial
    starter: `def factorial(n):\n    # Return n! — factorial of non-negative integer n\n    pass`,
    fnName: 'factorial',
    ref: `r=1
for i in range(2,args[0]+1): r*=i
return r`,
    tests: [0, 1, 5, 10, 12],
    total: 5
  },

  35: { // Is Prime
    starter: `def is_prime(n):\n    # Return True if n is prime, False otherwise\n    pass`,
    fnName: 'is_prime',
    ref: `if args[0]<2: return False
if args[0]==2: return True
if args[0]%2==0: return False
i=3
while i*i<=args[0]:
  if args[0]%i==0: return False
  i+=2
return True`,
    tests: [2, 11, 4, 1, 97],
    total: 5
  },

  36: { // Armstrong Number
    starter: `def is_armstrong(n):\n    # Return True if n is an Armstrong (narcissistic) number\n    pass`,
    fnName: 'is_armstrong',
    ref: `digits=str(args[0]); p=len(digits)
return sum(int(d)**p for d in digits)==args[0]`,
    tests: [153, 370, 123, 0, 9474],
    total: 5
  },

  37: { // Palindrome Number
    starter: `def is_palindrome_number(n):\n    # Return True if n reads the same forwards and backwards\n    pass`,
    fnName: 'is_palindrome_number',
    ref: `s=str(args[0]); return s==s[::-1] if args[0]>=0 else False`,
    tests: [121, -121, 0, 1221, 10],
    total: 5
  },

  38: { // Add Digits / Digital Root
    starter: `def add_digits(n):\n    # Repeatedly sum digits until single digit (digital root)\n    pass`,
    fnName: 'add_digits',
    ref: `if args[0]==0: return 0
return 1+(args[0]-1)%9`,
    tests: [38, 0, 9, 199, 1234],
    total: 5
  },

  39: { // Convert to Base
    starter: `def convert_to_base(n, base):\n    # Convert integer n to the given base, return as string\n    pass`,
    fnName: 'convert_to_base',
    ref: `if args[0]==0: return "0"
digits="0123456789abcdef"; n=abs(args[0]); b=args[1]; r=[]
while n: r.append(digits[n%b]); n//=b
return ("-" if args[0]<0 else "")+"".join(reversed(r))`,
    tests: [[100,7],[0,7],[255,16],[8,2],[27,3]],
    total: 5,
    tupleTests: true
  },

  40: { // Integer to Roman
    starter: `def int_to_roman(num):\n    # Convert integer to Roman numeral string\n    pass`,
    fnName: 'int_to_roman',
    ref: `vals=[(1000,"M"),(900,"CM"),(500,"D"),(400,"CD"),(100,"C"),(90,"XC"),(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I")]
r=""
for v,s in vals:
  while args[0]>=v: r+=s; args[0]-=v
return r`,
    tests: [3, 4, 9, 58, 1994],
    total: 5
  },

  41: { // Roman to Integer
    starter: `def roman_to_int(s):\n    # Convert Roman numeral string to integer\n    pass`,
    fnName: 'roman_to_int',
    ref: `m={"I":1,"V":5,"X":10,"L":50,"C":100,"D":500,"M":1000}
r=0; s=args[0]
for i in range(len(s)):
  if i+1<len(s) and m[s[i]]<m[s[i+1]]: r-=m[s[i]]
  else: r+=m[s[i]]
return r`,
    tests: [`"III"`, `"IV"`, `"IX"`, `"LVIII"`, `"MCMXCIV"`],
    total: 5,
    strTests: true
  },

  42: { // Excel Sheet Column Number
    starter: `def title_to_number(column_title):\n    # Convert Excel column title like "AB" to its column number\n    pass`,
    fnName: 'title_to_number',
    ref: `r=0
for c in args[0]: r=r*26+ord(c)-ord("A")+1
return r`,
    tests: [`"A"`, `"B"`, `"Z"`, `"AA"`, `"ZY"`],
    total: 5,
    strTests: true
  },

  43: { // Multiply Strings
    starter: `def multiply_strings(num1, num2):\n    # Multiply two non-negative integers given as strings, return result as string\n    pass`,
    fnName: 'multiply_strings',
    ref: `return str(int(args[0])*int(args[1]))`,
    tests: [[`"2"`,`"3"`],[`"123"`,`"456"`],[`"0"`,`"999"`],[`"99"`,`"99"`],[`"1"`,`"1"`]],
    total: 5,
    tupleTests: true,
    strTests: true
  },

  44: { // My Atoi
    starter: `def my_atoi(s):\n    # Parse leading integer from string, clamp to 32-bit signed range\n    pass`,
    fnName: 'my_atoi',
    ref: `import re
s=args[0].lstrip()
m=re.match(r'^[+-]?\\d+',s)
if not m: return 0
n=int(m.group())
INT_MAX=2**31-1; INT_MIN=-(2**31)
return max(INT_MIN,min(INT_MAX,n))`,
    tests: [`'" -42"'`, `'"4193 with words"'`, `'"words and 987"'`, `'"91"'`, `'"-91"'`],
    total: 5,
    strTests: true
  },

  45: { // Next Greater Element III
    starter: `def next_greater_digit_arrangement(n):\n    # Find next greater integer using same digits, return -1 if none\n    pass`,
    fnName: 'next_greater_digit_arrangement',
    ref: `digits=list(str(args[0]))
i=len(digits)-2
while i>=0 and digits[i]>=digits[i+1]: i-=1
if i<0: return -1
j=len(digits)-1
while digits[j]<=digits[i]: j-=1
digits[i],digits[j]=digits[j],digits[i]
digits[i+1:]=digits[i+1:][::-1]
r=int("".join(digits))
return r if r<2**31 else -1`,
    tests: [12, 21, 230, 1234, 999],
    total: 5
  },

  46: { // Count Primes
    starter: `def count_primes(n):\n    # Count primes strictly less than n\n    pass`,
    fnName: 'count_primes',
    ref: `if args[0]<2: return 0
sieve=[True]*args[0]; sieve[0]=sieve[1]=False
for i in range(2,int(args[0]**0.5)+1):
  if sieve[i]:
    for j in range(i*i,args[0],i): sieve[j]=False
return sum(sieve)`,
    tests: [10, 0, 1, 2, 100],
    total: 5
  },

  47: { // GCD & LCM
    starter: `def gcd_lcm(a, b):\n    # Return (gcd, lcm) as a tuple\n    pass`,
    fnName: 'gcd_lcm',
    ref: `import math; return (math.gcd(args[0],args[1]), args[0]*args[1]//math.gcd(args[0],args[1]))`,
    tests: [[12,18],[7,3],[0,5],[100,75],[6,6]],
    total: 5,
    tupleTests: true
  },

  48: { // Factorial Trailing Zeroes
    starter: `def trailing_zeroes(n):\n    # Count trailing zeros in n!\n    pass`,
    fnName: 'trailing_zeroes',
    ref: `r=0; n=args[0]
while n>=5: n//=5; r+=n
return r`,
    tests: [3, 5, 10, 25, 100],
    total: 5
  },

  49: { // Super Pow
    starter: `def super_pow(a, b):\n    # Compute a^b mod 1337, where b is given as a list of digits\n    pass`,
    fnName: 'super_pow',
    ref: `MOD=1337
def pw(a,b): return pow(a,b,MOD)
r=1; a%=MOD
for d in args[1]: r=pw(r,10)*pw(a,d)%MOD
return r`,
    tests: [[2,[3]],[2,[1,0]],[1,[4,3,3,8,5,7,3]],[2147483647,[2,0,0]],[10,[1]]],
    total: 5,
    tupleTests: true
  },

  50: { // Is Ugly
    starter: `def is_ugly(n):\n    # Return True if n is an ugly number (prime factors only 2,3,5)\n    pass`,
    fnName: 'is_ugly',
    ref: `if args[0]<=0: return False
for p in [2,3,5]:
  while args[0]%p==0: args[0]//=p
return args[0]==1`,
    tests: [6, 8, 14, 1, 0],
    total: 5
  },

  51: { // Happy Number
    starter: `def is_happy(n):\n    # Return True if n is a happy number\n    pass`,
    fnName: 'is_happy',
    ref: `seen=set()
while args[0]!=1:
  if args[0] in seen: return False
  seen.add(args[0]); args[0]=sum(int(d)**2 for d in str(args[0]))
return True`,
    tests: [19, 2, 1, 7, 100],
    total: 5
  },

  52: { // Integer Break
    starter: `def integer_break(n):\n    # Break n into at least 2 integers to maximise their product\n    pass`,
    fnName: 'integer_break',
    ref: `if args[0]==2: return 1
if args[0]==3: return 2
q,r=divmod(args[0],3)
if r==0: return 3**q
if r==1: return 3**(q-1)*4
return 3**q*2`,
    tests: [2, 3, 4, 10, 6],
    total: 5
  },

  53: { // Perfect Squares
    starter: `def num_squares(n):\n    # Return the least number of perfect square numbers that sum to n\n    pass`,
    fnName: 'num_squares',
    ref: `dp=[float('inf')]*(args[0]+1); dp[0]=0
for i in range(1,args[0]+1):
  j=1
  while j*j<=i: dp[i]=min(dp[i],dp[i-j*j]+1); j+=1
return dp[args[0]]`,
    tests: [12, 13, 1, 4, 100],
    total: 5
  },

  54: { // Nim Game
    starter: `def can_win_nim(n):\n    # Return True if the first player can guarantee a win\n    pass`,
    fnName: 'can_win_nim',
    ref: `return args[0]%4!=0`,
    tests: [4, 1, 2, 8, 5],
    total: 5
  },

  55: { // Pow(x, n)
    starter: `def my_pow(x, n):\n    # Implement pow(x, n) — x raised to the power n\n    pass`,
    fnName: 'my_pow',
    ref: `if args[1]<0: return (1/args[0])**abs(args[1])
return args[0]**args[1]`,
    tests: [[2.0,10],[2.1,3],[2.0,-2],[1.0,2147483647],[0.0,5]],
    total: 5,
    tupleTests: true
  },

  // ── FUNDAMENTALS that had wrong fn name ──────────────────────────────────

  3: { // Type Conversion
    starter: `def type_convert(value, target):\n    # Convert value to target type: "int", "float", "str", "bool"\n    pass`,
    fnName: 'type_convert',
    ref: `v,t=args[0],args[1]
if t=="int": return int(v)
if t=="float": return float(v)
if t=="str": return str(v)
if t=="bool": return bool(v)
raise ValueError("Unknown type")`,
    tests: [["3.14","int"],["42","float"],[42,"str"],[0,"bool"],["hello","bool"]],
    total: 5,
    tupleTests: true
  },

  4: { // All Arithmetic Operators
    starter: `def all_ops(a, b):\n    # Return (a+b, a-b, a*b, a//b, a%b, a**b) as a tuple\n    pass`,
    fnName: 'all_ops',
    ref: `a,b=args[0],args[1]; return (a+b,a-b,a*b,a//b,a%b,a**b)`,
    tests: [[10,3],[7,2],[-4,2],[100,10],[2,8]],
    total: 5,
    tupleTests: true
  },

  6: { // Comparison Operators
    starter: `def compare(a, b):\n    # Return dict with keys: equal, not_equal, greater, less, gte, lte\n    pass`,
    fnName: 'compare',
    ref: `a,b=args[0],args[1]; return {"equal":a==b,"not_equal":a!=b,"greater":a>b,"less":a<b,"gte":a>=b,"lte":a<=b}`,
    tests: [[5,5],[3,7],[-1,0],[100,99],[0,0]],
    total: 5,
    tupleTests: true
  },

  10: { // String Multiplication & Repetition
    starter: `def repeat_info(s, n):\n    # Return s repeated n times\n    pass`,
    fnName: 'repeat_info',
    ref: `return args[0]*args[1]`,
    tests: [["ab",3],["*",5],["",10],["PyCode",1],["x",0]],
    total: 5,
    tupleTests: true
  },

  // ── IF/ELSE that had false-positive flags ───────────────────────────────

  11: { // Positive, Negative or Zero
    starter: `def classify_number(n):\n    # Return "Positive", "Negative", or "Zero"\n    pass`,
    fnName: 'classify_number',
    ref: `if args[0]>0: return "Positive"
elif args[0]<0: return "Negative"
return "Zero"`,
    tests: [5, -3, 0, -100, 1],
    total: 5
  },

  12: { // Absolute Value
    starter: `def my_abs(n):\n    # Return absolute value without using abs()\n    pass`,
    fnName: 'my_abs',
    ref: `return args[0] if args[0]>=0 else -args[0]`,
    tests: [-5, 0, 3, -1000, 2147483647],
    total: 5
  },

  21: { // BMI Classifier
    starter: `def bmi_classify(weight_kg, height_m):\n    # Calculate BMI and return category string\n    pass`,
    fnName: 'bmi_classify',
    ref: `bmi=args[0]/args[1]**2
if bmi<18.5: return "Underweight"
if bmi<25: return "Normal"
if bmi<30: return "Overweight"
return "Obese"`,
    tests: [[50,1.7],[70,1.75],[90,1.75],[120,1.70],[30,1.50]],
    total: 5,
    tupleTests: true
  },

  22: { // Rock Paper Scissors
    starter: `def rps_winner(p1, p2):\n    # Return "Player 1", "Player 2", or "Draw"\n    pass`,
    fnName: 'rps_winner',
    ref: `if args[0]==args[1]: return "Draw"
wins={("rock","scissors"),("scissors","paper"),("paper","rock")}
return "Player 1" if (args[0],args[1]) in wins else "Player 2"`,
    tests: [["rock","scissors"],["paper","rock"],["scissors","scissors"],["rock","paper"],["scissors","rock"]],
    total: 5,
    tupleTests: true
  },

  23: { // Simple Calculator
    starter: `def calculate(a, b, op):\n    # Return result of operation op on a and b\n    pass`,
    fnName: 'calculate',
    ref: `a,b,op=args[0],args[1],args[2]
if op=="+": return a+b
elif op=="-": return a-b
elif op=="*": return a*b
elif op=="/":
  if b==0: return "Error: Division by zero"
  return a/b
return "Error: Invalid operator"`,
    tests: [[10,5,"+"],[10,3,"-"],[4,3,"*"],[10,5,"/"],[10,0,"/"]],
    total: 5,
    tupleTests: true
  },

  // ── STRING METHODS mismatches ────────────────────────────────────────────

  80: { // Replace and Find
    starter: `def modify_string(s, old, new):\n    # Replace all occurrences of old with new in s, return result\n    pass`,
    fnName: 'modify_string',
    ref: `return args[0].replace(args[1],args[2])`,
    tests: [["hello world","world","Python"],["aabbcc","b","x"],["no match","z","Z"],["","a","b"],["aaaa","a","b"]],
    total: 5,
    tupleTests: true
  },

  81: { // Starts With & Ends With
    starter: `def check_affixes(s, prefix, suffix):\n    # Return (startswith, endswith) tuple\n    pass`,
    fnName: 'check_affixes',
    ref: `return (args[0].startswith(args[1]), args[0].endswith(args[2]))`,
    tests: [["PyCode","Py","ode"],["hello","he","lo"],["world","xyz","ld"],["abc","","abc"],["test","test","test"]],
    total: 5,
    tupleTests: true
  },

  82: { // isalpha, isdigit, isalnum
    starter: `def check_string_type(s):\n    # Return dict: {alpha, digit, alnum} booleans\n    pass`,
    fnName: 'check_string_type',
    ref: `return {"alpha":args[0].isalpha(),"digit":args[0].isdigit(),"alnum":args[0].isalnum()}`,
    tests: ['"hello"', '"12345"', '"hello123"', '"hello world"', '""'],
    total: 5,
    strTests: true
  },

  // ── ARRAY ALGOS ──────────────────────────────────────────────────────────

  98: { // strStr / Find Needle in Haystack
    starter: `def str_str(haystack, needle):\n    # Return the index of first occurrence of needle in haystack, or -1\n    pass`,
    fnName: 'str_str',
    ref: `return args[0].find(args[1])`,
    tests: [["sadbutsad","sad"],["leetcode","leeto"],["",""],["a","a"],["hello","ll"]],
    total: 5,
    tupleTests: true
  },

  125: { // Container With Most Water
    starter: `def max_area(height):\n    # Return the maximum area of water that can be contained\n    pass`,
    fnName: 'max_area',
    ref: `l,r=0,len(args[0])-1; best=0
while l<r:
  best=max(best,min(args[0][l],args[0][r])*(r-l))
  if args[0][l]<args[0][r]: l+=1
  else: r-=1
return best`,
    tests: [[1,8,6,2,5,4,8,3,7],[1,1],[4,3,2,1,4],[1,2,1],[0,2]],
    total: 5,
    listTests: true
  },

  151: { // Two Sum with Dictionary
    starter: `def two_sum(nums, target):\n    # Return indices [i,j] of two numbers summing to target\n    pass`,
    fnName: 'two_sum',
    ref: `seen={}
for i,n in enumerate(args[0]):
  if args[1]-n in seen: return sorted([seen[args[1]-n],i])
  seen[n]=i`,
    tests: [[[2,7,11,15],9],[[3,2,4],6],[[3,3],6],[[1,2,3,4,5],9],[[0,4,3,0],0]],
    total: 5,
    tupleTests: true,
    listTests: true
  },

  // ── FUNCTIONAL & OOP (class-based, skip fn-name check) ──────────────────
  154: { // Lambda Functions
    starter: `def apply_operations(nums):\n    # Using lambda: return list of squares of even numbers\n    pass`,
    fnName: 'apply_operations',
    ref: `return list(map(lambda x: x**2, filter(lambda x: x%2==0, args[0])))`,
    tests: [[1,2,3,4,5,6],[0,-2,3],[10,11,12],[],[7]],
    total: 5,
    listTests: true
  },

  155: { // Map and Filter
    starter: `def transform_list(nums):\n    # Use map and filter: return squares of numbers > 0\n    pass`,
    fnName: 'transform_list',
    ref: `return list(map(lambda x: x**2, filter(lambda x: x>0, args[0])))`,
    tests: [[1,-2,3,-4,5],[-1,-2],[], [0,1,2],[10]],
    total: 5,
    listTests: true
  },
};

// Build verification script for a fix entry
function makeVerifyScript(fix) {
  const fnName = fix.fnName;
  const refLines = fix.ref.split('\n').map(l => '  ' + l).join('\n');
  
  let testCaseStr = '';
  if (fix.tupleTests) {
    // Tests are tuples/arrays to unpack
    testCaseStr = JSON.stringify(fix.tests).replace(/\[([^\[\]]+)\]/g, m => m);
  } else if (fix.listTests) {
    testCaseStr = JSON.stringify(fix.tests);
  } else if (fix.strTests) {
    // Tests are already quoted strings
    testCaseStr = `[${fix.tests.join(', ')}]`;
  } else {
    testCaseStr = JSON.stringify(fix.tests);
  }

  const assertFn = fix.fnName.startsWith('__') ? null : fnName;

  return `def ref_impl(*args):
${refLines}

assert "${fnName}" in exec_globals, "Function ${fnName} not found"
fn = exec_globals["${fnName}"]
test_cases = ${testCaseStr}
passed = 0
for tc in test_cases:
    if isinstance(tc, (list, tuple)) and not isinstance(tc, str):
        try:
            res = fn(*tc)
        except:
            res = fn(tc)
    else:
        res = fn(tc)
    expected = ref_impl(*tc) if isinstance(tc, (list, tuple)) and not isinstance(tc, str) else ref_impl(tc)
    assert res == expected, f"Failed for {tc}:\\n  got:      {res}\\n  expected: {expected}"
    passed += 1
exec_globals["passed_cases"] = passed
exec_globals["total_cases"] = ${fix.total}`;
}

// Apply fixes
let fixCount = 0;
qs.forEach(q => {
  const fix = FIXES[q.id];
  if (fix) {
    q.starter_code = fix.starter;
    q.verification_script = makeVerifyScript(fix);
    fixCount++;
  }
});

console.log(`Fixed ${fixCount} questions.`);

// Write back
const newContent = `export interface LocalQuestion {
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

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(qs, null, 2)};
`;
fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts saved.');
