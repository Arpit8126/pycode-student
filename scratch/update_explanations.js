const fs = require('fs');

let content = fs.readFileSync('scratch_generate_all.js', 'utf8');

const replacements = [
  {
    id: 11,
    target: `    id: 11, title: '11. Positive, Negative or Zero',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>classify_number(n)</code> that takes a number and returns <code>"Positive"</code>, <code>"Negative"</code>, or <code>"Zero"</code>.\\n\\nThis is the simplest if/elif/else chain — the foundation of all decision-making in Python.\`,
      [
        { input: 'n = 5', output: '"Positive"' },
        { input: 'n = -3', output: '"Negative"' },
        { input: 'n = 0', output: '"Zero"' }
      ],`,
    replacement: `    id: 11, title: '11. Positive, Negative or Zero',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>classify_number(n)</code> that takes a number and returns <code>"Positive"</code>, <code>"Negative"</code>, or <code>"Zero"</code>.\\n\\nThis is the simplest if/elif/else chain — the foundation of all decision-making in Python.\`,
      [
        { input: 'n = 5', output: '"Positive"', explanation: '5 is strictly greater than 0, so it is Positive.' },
        { input: 'n = -3', output: '"Negative"', explanation: '-3 is less than 0, so it is Negative.' },
        { input: 'n = 0', output: '"Zero"', explanation: '0 is neither positive nor negative, so it is Zero.' }
      ],`
  },
  {
    id: 12,
    target: `    id: 12, title: '12. Absolute Value Without abs()',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>my_abs(n)</code> that returns the absolute value of a number <em>without</em> using Python's built-in <code>abs()</code> function.\\n\\nUse an <code>if/else</code> statement: if the number is negative, negate it; otherwise return it as-is.\`,
      [
        { input: 'n = -7', output: '7' },
        { input: 'n = 5', output: '5' },
        { input: 'n = 0', output: '0' }
      ],`,
    replacement: `    id: 12, title: '12. Absolute Value Without abs()',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>my_abs(n)</code> that returns the absolute value of a number <em>without</em> using Python's built-in <code>abs()</code> function.\\n\\nUse an <code>if/else</code> statement: if the number is negative, negate it; otherwise return it as-is.\`,
      [
        { input: 'n = -7', output: '7', explanation: 'The absolute value of -7 is 7 (negated to make it positive).' },
        { input: 'n = 5', output: '5', explanation: 'The absolute value of 5 is 5 (returns as-is).' },
        { input: 'n = 0', output: '0', explanation: 'The absolute value of 0 is 0.' }
      ],`
  },
  {
    id: 13,
    target: `    id: 13, title: '13. Find Maximum of Three',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>max_of_three(a, b, c)</code> that returns the largest of three numbers <em>without</em> using the built-in <code>max()</code> function.\\n\\nUse nested <code>if/elif/else</code> to compare all three values.\`,
      [
        { input: 'a=1, b=2, c=3', output: '3' },
        { input: 'a=10, b=10, c=5', output: '10' },
        { input: 'a=-1, b=-5, c=-2', output: '-1' }
      ],`,
    replacement: `    id: 13, title: '13. Find Maximum of Three',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>max_of_three(a, b, c)</code> that returns the largest of three numbers <em>without</em> using the built-in <code>max()</code> function.\\n\\nUse nested <code>if/elif/else</code> to compare all three values.\`,
      [
        { input: 'a=1, b=2, c=3', output: '3', explanation: '3 is the largest among 1, 2, and 3.' },
        { input: 'a=10, b=10, c=5', output: '10', explanation: '10 is the largest among 10, 10, and 5.' },
        { input: 'a=-1, b=-5, c=-2', output: '-1', explanation: '-1 is the largest among -1, -5, and -2.' }
      ],`
  },
  {
    id: 14,
    target: `    id: 14, title: '14. FizzBuzz',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>fizzbuzz(n)</code> that takes an integer and returns:\\n- <code>"FizzBuzz"</code> if divisible by both 3 and 5\\n- <code>"Fizz"</code> if divisible by 3 only\\n- <code>"Buzz"</code> if divisible by 5 only\\n- The number itself as a string otherwise\\n\\nThis is the most famous coding interview warm-up question. Order matters — always check the combined divisibility first.\`,
      [
        { input: 'n = 15', output: '"FizzBuzz"', explanation: '15 is divisible by both 3 and 5' },
        { input: 'n = 9', output: '"Fizz"' },
        { input: 'n = 20', output: '"Buzz"' },
        { input: 'n = 7', output: '"7"' }
      ],`,
    replacement: `    id: 14, title: '14. FizzBuzz',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>fizzbuzz(n)</code> that takes an integer and returns:\\n- <code>"FizzBuzz"</code> if divisible by both 3 and 5\\n- <code>"Fizz"</code> if divisible by 3 only\\n- <code>"Buzz"</code> if divisible by 5 only\\n- The number itself as a string otherwise\\n\\nThis is the most famous coding interview warm-up question. Order matters — always check the combined divisibility first.\`,
      [
        { input: 'n = 15', output: '"FizzBuzz"', explanation: '15 is divisible by both 3 and 5, so we return "FizzBuzz".' },
        { input: 'n = 9', output: '"Fizz"', explanation: '9 is divisible by 3 but not 5, so we return "Fizz".' },
        { input: 'n = 20', output: '"Buzz"', explanation: '20 is divisible by 5 but not 3, so we return "Buzz".' },
        { input: 'n = 7', output: '"7"', explanation: '7 is not divisible by 3 or 5, so we return "7" as a string.' }
      ],`
  },
  {
    id: 15,
    target: `    id: 15, title: '15. Vowel or Consonant',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>vowel_or_consonant(ch)</code> that takes a single character and returns <code>"Vowel"</code>, <code>"Consonant"</code>, or <code>"Neither"</code>.\\n\\nVowels are: a, e, i, o, u (both upper and lowercase). Any other letter is a consonant. Non-letter characters (digits, symbols, spaces) return <code>"Neither"</code>.\`,
      [
        { input: 'ch = "a"', output: '"Vowel"' },
        { input: 'ch = "B"', output: '"Consonant"' },
        { input: 'ch = "3"', output: '"Neither"' }
      ],`,
    replacement: `    id: 15, title: '15. Vowel or Consonant',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>vowel_or_consonant(ch)</code> that takes a single character and returns <code>"Vowel"</code>, <code>"Consonant"</code>, or <code>"Neither"</code>.\\n\\nVowels are: a, e, i, o, u (both upper and lowercase). Any other letter is a consonant. Non-letter characters (digits, symbols, spaces) return <code>"Neither"</code>.\`,
      [
        { input: 'ch = "a"', output: '"Vowel"', explanation: '"a" is a lowercase vowel.' },
        { input: 'ch = "B"', output: '"Consonant"', explanation: '"B" is an uppercase consonant.' },
        { input: 'ch = "3"', output: '"Neither"', explanation: '"3" is a digit, which is neither a vowel nor a consonant.' }
      ],`
  },
  {
    id: 22,
    target: `    id: 22, title: '22. Rock Paper Scissors',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>rps_winner(p1, p2)</code> that takes two choices (<code>"rock"</code>, <code>"paper"</code>, or <code>"scissors"</code>) and returns <code>"Player 1"</code>, <code>"Player 2"</code>, or <code>"Draw"</code>.\\n\\nRules: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.\`,
      [
        { input: 'p1="rock", p2="scissors"', output: '"Player 1"' },
        { input: 'p1="paper", p2="paper"', output: '"Draw"' },
        { input: 'p1="scissors", p2="rock"', output: '"Player 2"' }
      ],`,
    replacement: `    id: 22, title: '22. Rock Paper Scissors',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>rps_winner(p1, p2)</code> that takes two choices (<code>"rock"</code>, <code>"paper"</code>, or <code>"scissors"</code>) and returns <code>"Player 1"</code>, <code>"Player 2"</code>, or <code>"Draw"</code>.\\n\\nRules: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.\`,
      [
        { input: 'p1="rock", p2="scissors"', output: '"Player 1"', explanation: 'Player 1 chose rock and Player 2 chose scissors. Since rock beats scissors, Player 1 wins.' },
        { input: 'p1="paper", p2="paper"', output: '"Draw"', explanation: 'Both players chose paper, resulting in a Draw.' },
        { input: 'p1="scissors", p2="rock"', output: '"Player 2"', explanation: 'Player 1 chose scissors and Player 2 chose rock. Since rock beats scissors, Player 2 wins.' }
      ],`
  },
  {
    id: 23,
    target: `    id: 23, title: '23. Simple Calculator',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>calculator(a, b, op)</code> that performs basic math operations (<code>"+"</code>, <code>"-"</code>, <code>"*"</code>, <code>"/"</code>) based on the string <code>op</code>.\\n\\nIf the operator is division (<code>"/"</code>) and <code>b</code> is 0, return <code>"Error: Division by zero"</code>. If the operator is not supported, return <code>"Error: Invalid operator"</code>.\`,
      [
        { input: 'a=10, b=5, op="+"', output: '15' },
        { input: 'a=10, b=0, op="/"', output: '"Error: Division by zero"' },
        { input: 'a=5, b=2, op="%"', output: '"Error: Invalid operator"' }
      ],`,
    replacement: `    id: 23, title: '23. Simple Calculator',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>calculator(a, b, op)</code> that performs basic math operations (<code>"+"</code>, <code>"-"</code>, <code>"*"</code>, <code>"/"</code>) based on the string <code>op</code>.\\n\\nIf the operator is division (<code>"/"</code>) and <code>b</code> is 0, return <code>"Error: Division by zero"</code>. If the operator is not supported, return <code>"Error: Invalid operator"</code>.\`,
      [
        { input: 'a=10, b=5, op="+"', output: '15', explanation: 'The operator is "+", so we add 10 and 5 to get 15.' },
        { input: 'a=10, b=0, op="/"', output: '"Error: Division by zero"', explanation: 'Division by zero is invalid, so we return an error message.' },
        { input: 'a=5, b=2, op="%"', output: '"Error: Invalid operator"', explanation: 'The modulo operator "%" is not supported, so we return an error message.' }
      ],`
  },
  {
    id: 24,
    target: `    id: 24, title: '24. Character Classifier',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>classify_char(ch)</code> that takes a single character and returns its classification:\\n- <code>"Uppercase"</code> for A-Z\\n- <code>"Lowercase"</code> for a-z\\n- <code>"Digit"</code> for 0-9\\n- <code>"Special"</code> for any other character\\n\\nUse Python's built-in string methods: <code>.isupper()</code>, <code>.islower()</code>, <code>.isdigit()</code>.\`,
      [
        { input: 'ch = "A"', output: '"Uppercase"' },
        { input: 'ch = "z"', output: '"Lowercase"' },
        { input: 'ch = "5"', output: '"Digit"' },
        { input: 'ch = "#"', output: '"Special"' }
      ],`,
    replacement: `    id: 24, title: '24. Character Classifier',
    difficulty: 'easy', points: 100, category: 'python-basics',
    description: desc(
      \`Write a function <code>classify_char(ch)</code> that takes a single character and returns its classification:\\n- <code>"Uppercase"</code> for A-Z\\n- <code>"Lowercase"</code> for a-z\\n- <code>"Digit"</code> for 0-9\\n- <code>"Special"</code> for any other character\\n\\nUse Python's built-in string methods: <code>.isupper()</code>, <code>.islower()</code>, <code>.isdigit()</code>.\`,
      [
        { input: 'ch = "A"', output: '"Uppercase"', explanation: '"A" is a capital letter, so it is classified as Uppercase.' },
        { input: 'ch = "z"', output: '"Lowercase"', explanation: '"z" is a small letter, so it is classified as Lowercase.' },
        { input: 'ch = "5"', output: '"Digit"', explanation: '"5" is a digit between 0 and 9, so it is classified as Digit.' },
        { input: 'ch = "#"', output: '"Special"', explanation: '"#" is a symbol, so it is classified as Special.' }
      ],`
  },
  {
    id: 25,
    target: `    id: 25, title: '25. Quadratic Roots Counter',
    difficulty: 'medium', points: 200, category: 'python-basics',
    description: desc(
      \`Write a function <code>count_roots(a, b, c)</code> that returns the number of real roots (<code>0</code>, <code>1</code>, or <code>2</code>) of a quadratic equation $ax^2 + bx + c = 0$.\\n\\nCalculate the discriminant: $D = b^2 - 4ac$:\\n- $D > 0$ → 2 real roots\\n- $D = 0$ → 1 real root\\n- $D < 0$ → 0 real roots\`,
      [
        { input: 'a=1, b=-3, c=2', output: '2' },
        { input: 'a=1, b=2, c=1', output: '1' },
        { input: 'a=1, b=1, c=1', output: '0' }
      ],`,
    replacement: `    id: 25, title: '25. Quadratic Roots Counter',
    difficulty: 'medium', points: 200, category: 'python-basics',
    description: desc(
      \`Write a function <code>count_roots(a, b, c)</code> that returns the number of real roots (<code>0</code>, <code>1</code>, or <code>2</code>) of a quadratic equation $ax^2 + bx + c = 0$.\\n\\nCalculate the discriminant: $D = b^2 - 4ac$:\\n- $D > 0$ → 2 real roots\\n- $D = 0$ → 1 real root\\n- $D < 0$ → 0 real roots\`,
      [
        { input: 'a=1, b=-3, c=2', output: '2', explanation: 'Discriminant D = (-3)^2 - 4(1)(2) = 9 - 8 = 1. Since D > 0, there are 2 real roots.' },
        { input: 'a=1, b=2, c=1', output: '1', explanation: 'Discriminant D = 2^2 - 4(1)(1) = 4 - 4 = 0. Since D = 0, there is 1 real root.' },
        { input: 'a=1, b=1, c=1', output: '0', explanation: 'Discriminant D = 1^2 - 4(1)(1) = 1 - 4 = -3. Since D < 0, there are 0 real roots.' }
      ],`
  }
];

let updatedCount = 0;
for (const r of replacements) {
  const normalizedTarget = r.target.replace(/\r\n/g, '\n').trim();
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  if (normalizedContent.includes(normalizedTarget)) {
    content = normalizedContent.replace(normalizedTarget, r.replacement.replace(/\r\n/g, '\n').trim());
    updatedCount++;
    console.log(`Successfully updated Q${r.id}`);
  } else {
    console.warn(`Target block not found for Q${r.id}!`);
  }
}

fs.writeFileSync('scratch_generate_all.js', content);
console.log(`Successfully completed precise updates for ${updatedCount} / ${replacements.length} questions in scratch_generate_all.js`);
