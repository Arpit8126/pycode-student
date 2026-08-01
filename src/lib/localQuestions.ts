export interface LocalQuestion {
  id: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  category: 'python-basics' | 'python-advanced' | 'numpy' | 'pandas' | 'matplotlib-seaborn'
  description: string
  starter_code: string
  dataset_name: string | null
}

export const LOCAL_QUESTIONS: LocalQuestion[] = [
  {
    id: 1,
    title: '1. Find Even Numbers',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `find_evens(nums)` that takes a list of integers `nums` and returns a new list containing only the even numbers from the original list.',
    starter_code: 'def find_evens(nums):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 2,
    title: '2. Reverse String',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `reverse_str(s)` that takes a string `s` and returns the reversed version of that string.',
    starter_code: 'def reverse_str(s):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 3,
    title: '3. Find Prime',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `is_prime(n)` that returns `True` if the integer `n` is a prime number, and `False` otherwise.',
    starter_code: 'def is_prime(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 4,
    title: '4. Count Vowels',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `count_vowels(s)` that takes a string `s` and returns the number of vowels (a, e, i, o, u, case-insensitive) present in the string.',
    starter_code: 'def count_vowels(s):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 5,
    title: '5. Dictionary Merge',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `merge_dicts(d1, d2)` that combines two dictionaries. If a key is present in both, sum their values.',
    starter_code: 'def merge_dicts(d1, d2):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 6,
    title: '6. Find Duplicate Items',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `find_duplicates(lst)` that returns a list of elements that appear more than once in the input list.',
    starter_code: 'def find_duplicates(lst):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 7,
    title: '7. Celcius to Fahrenheit',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `c_to_f(c)` that converts Celcius temperature to Fahrenheit.',
    starter_code: 'def c_to_f(c):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 8,
    title: '8. Factorial Calculation',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `factorial(n)` that returns the factorial value of a positive integer `n`. (factorial of 0 is 1).',
    starter_code: 'def factorial(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 9,
    title: '9. Palindrome Check',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `is_palindrome(s)` that returns `True` if string `s` is a palindrome, ignoring capitalization and spaces.',
    starter_code: 'def is_palindrome(s):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 10,
    title: '10. Find Max Value',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `find_max(lst)` that takes a list of numbers and returns the maximum value without using python\'s built-in `max()` function.',
    starter_code: 'def find_max(lst):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 11,
    title: '11. Sum of Multiples',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `sum_multiples(n)` that returns the sum of all multiples of 3 or 5 below a positive integer `n`.',
    starter_code: 'def sum_multiples(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 12,
    title: '12. Remove Consonants',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `remove_consonants(s)` that removes all consonants from a string and returns only the vowels and spaces.',
    starter_code: 'def remove_consonants(s):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 13,
    title: '13. Fibonacci Term',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `fib(n)` that returns the `n`-th Fibonacci number. Assume 0-indexed, where `fib(0) = 0` and `fib(1) = 1`.',
    starter_code: 'def fib(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 14,
    title: '14. Matrix Transpose',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `transpose(matrix)` that transposes a 2D matrix list of lists.',
    starter_code: 'def transpose(matrix):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 15,
    title: '15. Find Common Elements',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `common_elements(l1, l2)` that returns a list containing unique common elements between two lists.',
    starter_code: 'def common_elements(l1, l2):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 16,
    title: '16. Word Count Dictionary',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `word_count(sentence)` that splits a sentence by spaces and returns a dictionary with the frequency of each word.',
    starter_code: 'def word_count(sentence):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 17,
    title: '17. Filter Odd Indexes',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `filter_odds(lst)` that filters out elements located at odd indexes (index 1, 3, 5...) and returns only elements at even indexes.',
    starter_code: 'def filter_odds(lst):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 18,
    title: '18. FizzBuzz Array',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `fizzbuzz(n)` that returns a list of strings representing values 1 to `n`. Print "Fizz" for multiples of 3, "Buzz" for 5, and "FizzBuzz" for both.',
    starter_code: 'def fizzbuzz(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 19,
    title: '19. Group by Length',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `group_by_len(words)` that takes a list of strings and returns a dictionary grouping words by their length key.',
    starter_code: 'def group_by_len(words):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 20,
    title: '20. List of Cubes',
    difficulty: 'easy',
    points: 100,
    category: 'python-basics',
    description: 'Write a function `cubes_list(n)` that returns a list containing cubes of numbers from 1 up to `n` (inclusive).',
    starter_code: 'def cubes_list(n):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 21,
    title: '21. Matrix Diagonal Sum',
    difficulty: 'medium',
    points: 200,
    category: 'python-advanced',
    description: 'Write a function `diagonal_sum(mat)` that calculates the sum of elements on both diagonals of a square matrix. Do not double count the center element if size is odd.',
    starter_code: 'def diagonal_sum(mat):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 22,
    title: '22. List Comprehension Filtering',
    difficulty: 'medium',
    points: 200,
    category: 'python-advanced',
    description: 'Write a function `comprehend_odds(lst)` using a single Python list comprehension that filters only odd numbers and squares them.',
    starter_code: 'def comprehend_odds(lst):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 23,
    title: '23. Lambda Sorter',
    difficulty: 'medium',
    points: 200,
    category: 'python-advanced',
    description: 'Write a function `sort_tuples(lst)` that sorts a list of tuples containing `(name, score)` by their score in descending order using a lambda function.',
    starter_code: 'def sort_tuples(lst):\n    # Write your code here\n    pass',
    dataset_name: null
  },
  {
    id: 36,
    title: '36. NumPy Zero Array',
    difficulty: 'easy',
    points: 100,
    category: 'numpy',
    description: 'Create a 1D NumPy array `arr` of size 10 filled with zeros, except the 5th element (index 4) which must be set to 1.',
    starter_code: 'import numpy as np\n# Assign array to variable "arr"',
    dataset_name: null
  },
  {
    id: 37,
    title: '37. Reshape 1D to 2D Matrix',
    difficulty: 'easy',
    points: 100,
    category: 'numpy',
    description: 'Create a 1D NumPy array containing values from 10 to 18 (inclusive), and reshape it into a 3x3 matrix. Save this matrix as `mat`.',
    starter_code: 'import numpy as np\n# Assign matrix to variable "mat"',
    dataset_name: null
  },
  {
    id: 56,
    title: '56. Load CSV and Count Rows',
    difficulty: 'medium',
    points: 200,
    category: 'pandas',
    description: '### 📊 Dataset Reference\n* **File Name**: `titanic.csv`\n* **Task**: Load the dataset `titanic.csv` into a Pandas DataFrame named `df` and count the number of rows. Save the row count integer to the variable `row_count`.',
    starter_code: 'import pandas as pd\n# Load dataset and assign row count to row_count',
    dataset_name: 'titanic.csv'
  },
  {
    id: 57,
    title: '57. Check Missing Ages',
    difficulty: 'medium',
    points: 200,
    category: 'pandas',
    description: '### 📊 Dataset Reference\n* **File Name**: `titanic.csv`\n* **Columns**: `Age` (float64, contains nulls)\n* **Task**: Load `titanic.csv` into `df`. Find the total count of null/missing values in the `Age` column. Save this sum integer to `missing_ages_count`.',
    starter_code: 'import pandas as pd\n# Assign result to missing_ages_count',
    dataset_name: 'titanic.csv'
  },
  {
    id: 58,
    title: '58. Fill Missing Ages with Median',
    difficulty: 'medium',
    points: 200,
    category: 'pandas',
    description: '### 📊 Dataset Reference\n* **File Name**: `titanic.csv`\n* **Task**: Load `titanic.csv`. Clean missing values in the `Age` column by filling them with the **median age** of the dataset. Store the cleaned DataFrame to `cleaned_df`.',
    starter_code: 'import pandas as pd\n# Save output to cleaned_df',
    dataset_name: 'titanic.csv'
  },
  {
    id: 81,
    title: '81. Line Chart Trend',
    difficulty: 'medium',
    points: 200,
    category: 'matplotlib-seaborn',
    description: '### 📊 Dataset Reference\n* **File Name**: `stock_market.csv`\n* **Task**: Generate a standard line chart of the `Close` price over `Date` using Matplotlib. Add a title `"Stock Trend"` and x-label `"Date"`.',
    starter_code: 'import matplotlib.pyplot as plt\nimport pandas as pd\ndf = pd.read_csv("stock_market.csv")\n# Write your plotting code here',
    dataset_name: 'stock_market.csv'
  },
  {
    id: 82,
    title: '82. Bar Chart Categories',
    difficulty: 'medium',
    points: 200,
    category: 'matplotlib-seaborn',
    description: '### 📊 Dataset Reference\n* **File Name**: `superstore.csv`\n* **Task**: Create a bar plot showing the total sales generated in each category using Seaborn (`sns.barplot`). Add a title `"Sales by Category"`.',
    starter_code: 'import seaborn as sns\nimport matplotlib.pyplot as plt\nimport pandas as pd\ndf = pd.read_csv("superstore.csv")\n# Write your plotting code here',
    dataset_name: 'superstore.csv'
  }
]
