export interface QuestionContent {
  problemStatement: string
  examples: {
    input: string
    output: string
    explanation?: string
  }[]
  constraints: string[]
}

function formatQuestionTemplate(
  title: string,
  category: string,
  points: number,
  statement: string,
  examples: { input: string; output: string; explanation?: string }[],
  constraints: string[]
): string {
  const exampleHtml = examples.map((ex, idx) => `
<h3 class="text-xs font-bold text-primary uppercase tracking-wider mb-2 mt-6">Example ${idx + 1}</h3>
<div class="border-l-2 border-primary/40 dark:border-primary/50 pl-4 py-1.5 space-y-1.5 my-3.5 font-mono text-xs text-body">
  <div><span class="text-gray-700 dark:text-zinc-450 font-sans mr-2">Input:</span> <code>${ex.input}</code></div>
  <div><span class="text-primary font-bold font-sans mr-2">Output:</span> <code>${ex.output}</code></div>
  ${ex.explanation ? `<div><span class="text-gray-700 dark:text-zinc-450 font-sans mr-2">Explanation:</span> <span class="text-gray-650 dark:text-zinc-300 font-sans font-light">${ex.explanation}</span></div>` : ''}
</div>
  `).join('');

  const constraintsHtml = constraints.length > 0 ? `
<h3 class="text-xs font-bold text-primary uppercase tracking-wider mb-2 mt-6">Constraints</h3>
<ul class="list-disc pl-5 text-xs text-gray-700 dark:text-zinc-300 space-y-1.5 font-light">
  ${constraints.map(c => `<li><code>${c}</code></li>`).join('')}
</ul>
  ` : '';

  return `
<p class="text-body text-sm font-light leading-relaxed mb-4">
  ${statement}
</p>
${exampleHtml}
${constraintsHtml}
`;
}

export function enrichQuestionDetails(q: any): string {
  if (!q) return ''

  const desc = q.description || ''
  
  // If the description is already complex HTML or multi-line format with Example blocks, return it directly
  if (desc.includes('Example 1') || desc.includes('Input:') || desc.includes('###')) {
    // Standardize colors and strip ugly background boxes to use beautiful left-borders
    return desc
      .replace(/text-gray-300/g, 'text-body')
      .replace(/text-gray-400/g, 'text-muted')
      .replace(/text-gray-550/g, 'text-muted')
      .replace(/text-gray-500/g, 'text-muted')
      .replace(/bg-surface-soft/g, '')
      .replace(/bg-\[\#13141b\]/g, '')
      .replace(/border-hairline/g, 'border-l-2 border-primary/40 pl-4 py-1')
      .replace(/border-\[\#232630\]/g, 'border-l-2 border-primary/40 pl-4 py-1')
      .replace(/p-4/g, 'py-1.5 my-3.5')
      .replace(/rounded-2xl/g, '')
      .replace(/text-\[\#eab308\]/g, 'text-primary font-bold')
      .replace(/text-accent-amber/g, 'text-primary')
      .replace(/text-warning/g, 'text-primary')
      .replace(/text-yellow-500/g, 'text-primary')
      .replace(/text-amber-500/g, 'text-primary');
  }

  const titleLower = (q.title || '').toLowerCase()

  // Q1. Find Even Numbers
  if (titleLower.includes('even') && (titleLower.includes('find') || titleLower.includes('1.'))) {
    return formatQuestionTemplate(
      "Find Even Numbers",
      "Python Basics",
      100,
      "Given an array of integers <code>nums</code>, write a function <code>find_evens(nums)</code> that iterates through the list and filters out any odd numbers, returning a new list containing only the even integers in their original sequence order.",
      [
        { input: "nums = [1, 2, 3, 4, 5, 6]", output: "[2, 4, 6]", explanation: "The even numbers in the list are 2, 4, and 6." },
        { input: "nums = [7, 9, 11]", output: "[]", explanation: "All elements are odd, so an empty list is returned." }
      ],
      ["1 <= len(nums) <= 10^5", "-10^4 <= nums[i] <= 10^4", "The original list order of even elements must be preserved."]
    )
  }

  // Q2. Reverse String
  if (titleLower.includes('reverse') && titleLower.includes('string')) {
    return formatQuestionTemplate(
      "Reverse String",
      "Python Basics",
      100,
      "Write a function <code>reverse_str(s)</code> that takes a string <code>s</code> as input and returns a new string with the characters in reverse order.",
      [
        { input: 's = "pycode"', output: '"edocyp"', explanation: 'Reversing "pycode" yields "edocyp".' },
        { input: 's = "hello"', output: '"olleh"' }
      ],
      ["0 <= len(s) <= 10^5", "Input consists of alphanumeric characters and symbols."]
    )
  }

  // Q3. Find Prime
  if (titleLower.includes('prime')) {
    return formatQuestionTemplate(
      "Find Prime",
      "Python Basics",
      100,
      "Implement the function <code>is_prime(n)</code> to determine if a positive integer <code>n</code> is prime. A prime number is a number greater than 1 that has no positive divisors other than 1 and itself.",
      [
        { input: "n = 11", output: "True", explanation: "11 is only divisible by 1 and 11." },
        { input: "n = 4", output: "False" }
      ],
      ["1 <= n <= 10^9"]
    )
  }

  // Q4. Count Vowels
  if (titleLower.includes('vowel')) {
    return formatQuestionTemplate(
      "Count Vowels",
      "Python Basics",
      100,
      "Write a function <code>count_vowels(s)</code> that takes a string <code>s</code> and returns the number of vowels (a, e, i, o, u, case-insensitive) present in the string.",
      [
        { input: 's = "PyCode Sandbox"', output: "4", explanation: "The vowels are 'o', 'e', 'a', 'o' which sums up to 4." },
        { input: 's = "xyz"', output: "0" }
      ],
      ["0 <= len(s) <= 10^4"]
    )
  }

  // Q5. Dictionary Merge
  if (titleLower.includes('merge') && titleLower.includes('dict')) {
    return formatQuestionTemplate(
      "Dictionary Merge",
      "Python Basics",
      100,
      "Write a function <code>merge_dicts(d1, d2)</code> that combines two dictionaries. If a key is present in both, sum their values.",
      [
        { input: 'd1 = {"a": 1, "b": 2}, d2 = {"b": 3, "c": 4}', output: '{"a": 1, "b": 5, "c": 4}', explanation: "The key 'b' is present in both dictionaries, so its values are summed (2 + 3 = 5)." },
        { input: 'd1 = {"x": 10}, d2 = {"y": 20}', output: '{"x": 10, "y": 20}' }
      ],
      ["0 <= len(d1), len(d2) <= 10^3", "Dictionary keys are strings, values are integers."]
    )
  }

  // Q6. Find Duplicate Items
  if (titleLower.includes('duplicate')) {
    return formatQuestionTemplate(
      "Find Duplicate Items",
      "Python Basics",
      100,
      "Write a function <code>find_duplicates(lst)</code> that takes a list <code>lst</code> and returns a new list containing elements that appear more than once in the input list.",
      [
        { input: "lst = [1, 2, 3, 2, 4, 1]", output: "[1, 2]", explanation: "1 and 2 appear twice, while 3 and 4 appear only once." },
        { input: "lst = [1, 2, 3]", output: "[]" }
      ],
      ["0 <= len(lst) <= 10^4", "Order of elements in the output list does not matter."]
    )
  }

  // Q7. Celcius to Fahrenheit
  if (titleLower.includes('celcius') || titleLower.includes('c_to_f')) {
    return formatQuestionTemplate(
      "Celcius to Fahrenheit",
      "Python Basics",
      100,
      "Write a function <code>c_to_f(c)</code> that converts Celcius float temperature to Fahrenheit. The formula is: <code>F = C * 9/5 + 32</code>.",
      [
        { input: "c = 0", output: "32.0", explanation: "0 * 9/5 + 32 = 32.0" },
        { input: "c = 100", output: "212.0" }
      ],
      ["-273.15 <= c <= 10^4"]
    )
  }

  // Q8. Factorial Calculation
  if (titleLower.includes('factorial')) {
    return formatQuestionTemplate(
      "Factorial Calculation",
      "Python Basics",
      100,
      "Write a function <code>factorial(n)</code> that returns the factorial value of a positive integer <code>n</code>. Factorial of 0 is defined as 1.",
      [
        { input: "n = 5", output: "120", explanation: "5! = 5 * 4 * 3 * 2 * 1 = 120" },
        { input: "n = 0", output: "1" }
      ],
      ["0 <= n <= 100"]
    )
  }

  // Q9. Palindrome Check
  if (titleLower.includes('palindrome')) {
    return formatQuestionTemplate(
      "Palindrome Check",
      "Python Basics",
      100,
      "Write a function <code>is_palindrome(s)</code> that returns <code>True</code> if string <code>s</code> is a palindrome, ignoring capitalization and spaces, and <code>False</code> otherwise.",
      [
        { input: 's = "Racecar"', output: "True", explanation: "Ignoring capitalization, 'racecar' read backwards is still 'racecar'." },
        { input: 's = "A man a plan a canal Panama"', output: "True", explanation: "Ignoring spaces and capitalization, the string is 'amanaplanacanalpanama', which is a palindrome." }
      ],
      ["0 <= len(s) <= 10^5"]
    )
  }

  // Q10. Find Max Value
  if (titleLower.includes('max value') || titleLower.includes('find_max')) {
    return formatQuestionTemplate(
      "Find Max Value",
      "Python Basics",
      100,
      "Write a function <code>find_max(lst)</code> that takes a list of numbers <code>lst</code> and returns the maximum value without using Python's built-in <code>max()</code> function.",
      [
        { input: "lst = [1, 5, 3, 9, 2]", output: "9", explanation: "The largest integer in the list is 9." },
        { input: "lst = [-5, -2, -10]", output: "-2" }
      ],
      ["1 <= len(lst) <= 10^5", "-10^9 <= lst[i] <= 10^9"]
    )
  }

  // Q11. Sum of Multiples
  if (titleLower.includes('multiples') && titleLower.includes('sum')) {
    return formatQuestionTemplate(
      "Sum of Multiples",
      "Python Basics",
      100,
      "Write a function <code>sum_multiples(n)</code> that returns the sum of all multiples of 3 or 5 strictly below a positive integer <code>n</code>.",
      [
        { input: "n = 10", output: "23", explanation: "Multiples of 3 or 5 below 10 are 3, 5, 6, and 9. Their sum is 23." },
        { input: "n = 16", output: "60", explanation: "Multiples below 16 are 3, 5, 6, 9, 10, 12, and 15. Their sum is 60." }
      ],
      ["1 <= n <= 10^5"]
    )
  }

  // Q12. Remove Consonants
  if (titleLower.includes('consonants')) {
    return formatQuestionTemplate(
      "Remove Consonants",
      "Python Basics",
      100,
      "Write a function <code>remove_consonants(s)</code> that removes all consonants from a string <code>s</code> and returns a new string containing only the vowels (a, e, i, o, u) and spaces, preserving their original order.",
      [
        { input: 's = "PyCode sandbox"', output: '"o ea o"', explanation: "Consonants P, y, C, d, s, n, d, b, x are removed." },
        { input: 's = "hello"', output: '"eo"' }
      ],
      ["0 <= len(s) <= 10^4"]
    )
  }

  // Q13. Fibonacci Term
  if (titleLower.includes('fibonacci') || (titleLower.includes('fib') && titleLower.includes('13.'))) {
    return formatQuestionTemplate(
      "Fibonacci Term",
      "Python Basics",
      100,
      "Write a function <code>fib(n)</code> that returns the <code>n</code>-th Fibonacci number. The sequence is 0-indexed, where <code>fib(0) = 0</code> and <code>fib(1) = 1</code>.",
      [
        { input: "n = 5", output: "5", explanation: "Fibonacci sequence: 0, 1, 1, 2, 3, 5. The 5th index is 5." },
        { input: "n = 6", output: "8", explanation: "The 6th index is 8." }
      ],
      ["0 <= n <= 30"]
    )
  }

  // Q14. Matrix Transpose
  if (titleLower.includes('transpose')) {
    return formatQuestionTemplate(
      "Matrix Transpose",
      "Python Basics",
      100,
      "Write a function <code>transpose(matrix)</code> that transposes a 2D matrix represented as a list of lists.",
      [
        { input: "matrix = [[1, 2], [3, 4]]", output: "[[1, 3], [2, 4]]", explanation: "Rows become columns." },
        { input: "matrix = [[1, 2, 3], [4, 5, 6]]", output: "[[1, 4], [2, 5], [3, 6]]" }
      ],
      ["1 <= rows, cols <= 100"]
    )
  }

  // Q15. Find Common Elements
  if (titleLower.includes('common elements') || titleLower.includes('common_elements')) {
    return formatQuestionTemplate(
      "Find Common Elements",
      "Python Basics",
      100,
      "Write a function <code>common_elements(l1, l2)</code> that returns a list containing unique common elements present in both input lists.",
      [
        { input: "l1 = [1, 2, 2, 3], l2 = [2, 2, 4, 3]", output: "[2, 3]", explanation: "2 and 3 are in both lists. We return only unique values." },
        { input: "l1 = [1, 2], l2 = [3, 4]", output: "[]" }
      ],
      ["0 <= len(l1), len(l2) <= 10^4"]
    )
  }

  // Q16. Word Count Dictionary
  if (titleLower.includes('word_count') || titleLower.includes('word count')) {
    return formatQuestionTemplate(
      "Word Count Dictionary",
      "Python Basics",
      100,
      "Write a function <code>word_count(sentence)</code> that splits a sentence by spaces and returns a dictionary mapping each unique word to its frequency of occurrence.",
      [
        { input: 'sentence = "hello world hello"', output: '{"hello": 2, "world": 1}', explanation: "'hello' occurs twice and 'world' occurs once." },
        { input: 'sentence = "python"', output: '{"python": 1}' }
      ],
      ["0 <= len(sentence) <= 10^4"]
    )
  }

  // Q17. Filter Odd Indexes
  if (titleLower.includes('filter_odds') || titleLower.includes('odd index')) {
    return formatQuestionTemplate(
      "Filter Odd Indexes",
      "Python Basics",
      100,
      "Write a function <code>filter_odds(lst)</code> that filters out elements located at odd indexes (indexes 1, 3, 5...) and returns a list containing only elements at even indexes (0, 2, 4...).",
      [
        { input: "lst = [10, 20, 30, 40, 50]", output: "[10, 30, 50]", explanation: "Elements at index 0 (10), index 2 (30), and index 4 (50) are retained." },
        { input: 'lst = ["a", "b"]', output: '["a"]' }
      ],
      ["0 <= len(lst) <= 10^4"]
    )
  }

  // Q18. FizzBuzz Array
  if (titleLower.includes('fizzbuzz')) {
    return formatQuestionTemplate(
      "FizzBuzz Array",
      "Python Basics",
      100,
      "Write a function <code>fizzbuzz(n)</code> that returns a list of strings representing values 1 to <code>n</code>. Substitute \"Fizz\" for multiples of 3, \"Buzz\" for multiples of 5, and \"FizzBuzz\" for numbers divisible by both.",
      [
        { input: "n = 5", output: '["1", "2", "Fizz", "4", "Buzz"]' },
        { input: "n = 3", output: '["1", "2", "Fizz"]' }
      ],
      ["1 <= n <= 10^4"]
    )
  }

  // Q19. Group by Length
  if (titleLower.includes('group_by_len') || titleLower.includes('group by length')) {
    return formatQuestionTemplate(
      "Group by Length",
      "Python Basics",
      100,
      "Write a function <code>group_by_len(words)</code> that takes a list of strings <code>words</code> and returns a dictionary grouping words by their length key.",
      [
        { input: 'words = ["a", "bb", "ccc", "dd"]', output: '{1: ["a"], 2: ["bb", "dd"], 3: ["ccc"]}' },
        { input: 'words = []', output: '{}' }
      ],
      ["0 <= len(words) <= 10^3", "Original order of words must be preserved in the group lists."]
    )
  }

  // Q20. List of Cubes
  if (titleLower.includes('cubes_list') || titleLower.includes('cubes list')) {
    return formatQuestionTemplate(
      "List of Cubes",
      "Python Basics",
      100,
      "Write a function <code>cubes_list(n)</code> that returns a list containing the cubes of integers from 1 up to <code>n</code> (inclusive).",
      [
        { input: "n = 3", output: "[1, 8, 27]", explanation: "1^3 = 1, 2^3 = 8, 3^3 = 27." },
        { input: "n = 1", output: "[1]" }
      ],
      ["1 <= n <= 10^3"]
    )
  }

  // Q21. Matrix Diagonal Sum
  if (titleLower.includes('diagonal_sum') || titleLower.includes('diagonal sum')) {
    return formatQuestionTemplate(
      "Matrix Diagonal Sum",
      "Python Advanced Techniques",
      200,
      "Write a function <code>diagonal_sum(mat)</code> that calculates the sum of all elements on both the primary and secondary diagonals of a square matrix. Do not double count the center element if the matrix size is odd.",
      [
        { input: "mat = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]", output: "25", explanation: "Primary diagonal: 1 + 5 + 9 = 15. Secondary diagonal: 3 + 5 + 7 = 15. Since 5 is the center element, sum is 15 + 15 - 5 = 25." },
        { input: "mat = [[1, 2], [3, 4]]", output: "10", explanation: "1 + 4 + 2 + 3 = 10" }
      ],
      ["1 <= len(mat) <= 100", "mat is a square matrix (N x N)."]
    )
  }

  // Q22. List Comprehension Filtering
  if (titleLower.includes('comprehend_odds') || titleLower.includes('comprehension')) {
    return formatQuestionTemplate(
      "List Comprehension Filtering",
      "Python Advanced Techniques",
      200,
      "Write a function <code>comprehend_odds(lst)</code> using a single Python list comprehension that filters only the odd integers from the list and returns their squares.",
      [
        { input: "lst = [1, 2, 3, 4]", output: "[1, 9]", explanation: "Odd numbers are 1 and 3. Squaring them yields [1, 9]." },
        { input: "lst = [2, 4]", output: "[]" }
      ],
      ["0 <= len(lst) <= 10^4"]
    )
  }

  // Q23. Lambda Sorter
  if (titleLower.includes('sort_tuples') || titleLower.includes('lambda')) {
    return formatQuestionTemplate(
      "Lambda Sorter",
      "Python Advanced Techniques",
      200,
      "Write a function <code>sort_tuples(lst)</code> that sorts a list of tuples containing <code>(name, score)</code> by their score in descending order using a lambda function.",
      [
        { input: 'lst = [("Alice", 85), ("Bob", 95), ("Charlie", 90)]', output: '[("Bob", 95), ("Charlie", 90), ("Alice", 85)]' },
        { input: 'lst = [("A", 10)]', output: '[("A", 10)]' }
      ],
      ["0 <= len(lst) <= 10^3"]
    )
  }

  // 56. Load CSV and Count Rows (Pandas)
  if (titleLower.includes('load csv') || titleLower.includes('count rows')) {
    return `
<p class="text-body text-sm font-light leading-relaxed mb-4">
  Write a Pandas script to read the dataset file <code>titanic.csv</code> into a DataFrame named <code>df</code> and calculate the total number of rows in the dataset. Save the resulting integer count to the variable <code>row_count</code>.
</p>

<h3 class="text-xs font-bold text-accent-amber dark:text-warning uppercase tracking-wider mb-2 mt-6">Dataset Schema Reference</h3>
<div class="p-4 rounded-2xl bg-surface-soft border border-hairline font-mono text-xs text-body space-y-1 mb-4">
  <div><strong>File:</strong> <code>titanic.csv</code></div>
  <div><strong>Columns:</strong> PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch...</div>
</div>

<h3 class="text-xs font-bold text-accent-amber dark:text-warning uppercase tracking-wider mb-2 mt-6">Expected Variables</h3>
<ul class="list-disc pl-5 text-xs text-body space-y-1.5 font-light">
  <li><code>df</code>: Pandas DataFrame containing the loaded CSV data.</li>
  <li><code>row_count</code>: Integer representing the number of rows in the DataFrame.</li>
</ul>
`
  }

  // 58. Fill Missing Ages (Pandas)
  if (titleLower.includes('missing ages') || titleLower.includes('median')) {
    return `
<p class="text-body text-sm font-light leading-relaxed mb-4">
  Load the dataset <code>titanic.csv</code>. The <code>Age</code> column contains missing values (nulls). Clean these missing values by replacing them with the <strong>median age</strong> calculated from the dataset. Save the cleaned DataFrame to the variable <code>cleaned_df</code>.
</p>

<h3 class="text-xs font-bold text-accent-amber dark:text-warning uppercase tracking-wider mb-2 mt-6">Expected Variables</h3>
<ul class="list-disc pl-5 text-xs text-body space-y-1.5 font-light">
  <li><code>cleaned_df</code>: Pandas DataFrame where missing values in the <code>Age</code> column have been populated with the median.</li>
</ul>
`
  }

  // Default: Fallback to printing the raw statement with standard linebreaks
  return `
<p class="text-body text-sm font-light leading-relaxed mb-4">
  ${desc.replace(/\n/g, '<br />')}
</p>
`
}
