// add_explanations.js — Injects pedagogical explanations and restructures example cards.
// Ensures that Input, Output, and Explanation are separate rows with aligned labels.

const fs = require('fs');

const EXPLANATIONS = {
  1:  ["f-string substitutes name into template: f'Hello, {name}!' with name='Alice' → 'Hello, Alice!'",
       "Same template with name='PyCode' → 'Hello, PyCode!'"],
  2:  ["type(42) in Python → int (integer literal)", "type(3.14) → float (decimal point makes it a float)",
       "type('hello') → str (quotes make it a string)", "type(True) → bool (boolean)"],
  3:  ["int('42')=42, float('42')=42.0, str('42')='42' — same value, different types",
       "int('3')=3, float('3')=3.0, str('3')='3'"],
  4:  ["10+3=13, 10-3=7, 10*3=30, 10//3=3 (floor), 10%3=1, 10**3=1000",
       "5+2=7, 5-2=3, 5*2=10, 5//2=2 (floor), 5%2=1, 5**2=25"],
  5:  ["s[0]='P' (first character), s[-1]='n' (last), s[:3]='Pyt' (first 3), s[3:]='hon' (remaining), s[::-1] reverses the string",
       "s[0]='H', s[-1]='o', s[:3]='Hel', s[3:]='llo', s[::-1] reverses"],
  6:  ["5==3 is False, 5!=3 is True, 5>3 is True, 5<3 is False, 5>=3 is True, 5<=3 is False",
       "4==4 is True, 4!=4 is False, 4>4 is False, 4<4 is False, 4>=4 is True, 4<=4 is True"],
  7:  ["True AND False=False, True OR False=True, True XOR False=True, NOT True=False",
       "True AND True=True, True OR True=True, True XOR True=False, NOT True=False"],
  8:  ["Unpacking [1,2,3] gives a=1, b=2, c=3; so first=1, middle=2, last=3",
       "Unpacking [10,20,30] gives first=10, middle=20, last=30"],
  9:  ["0 is falsy in Python → bool(0) = False", "'hello' is a non-empty string → truthy → True",
       "[] is an empty list → falsy → False"],
  10: ["'ab'*3='ababab', len=6, upper='ABABAB', lower='ababab', 'ab'*2[:-1]='ababa'[:-1]='aba'",
       "'Hi'*2='HiHi', len=4, upper='HIHI', lower='hihi'"],
  11: ["The number 5 is strictly greater than 0, so it is classified as positive.",
       "The number -3 is strictly less than 0, so it is classified as negative.",
       "The number 0 is equal to 0, so it is classified as zero."],
  12: ["Since -7 is negative, we multiply it by -1 to get its absolute positive value, which is 7.",
       "Since 5 is positive, its absolute value remains 5.",
       "Since 0 has no positive or negative sign, its absolute value remains 0."],
  13: ["Comparing 1, 2, and 3: 3 is greater than 1 and 3 is also greater than 2, so 3 is the largest number.",
       "Comparing 10, 10, and 5: 10 is equal to 10 and both are greater than 5, so the maximum is 10.",
       "Comparing -1, -5, and -2: -1 is greater than -2 and -1 is also greater than -5, so -1 is the largest number."],
  14: ["15 is divisible by both 3 (15/3 = 5) and 5 (15/5 = 3), so we return 'FizzBuzz'.",
       "9 is divisible by 3 (9/3 = 3) but not by 5, so we return 'Fizz'.",
       "20 is divisible by 5 (20/5 = 4) but not by 3, so we return 'Buzz'.",
       "7 is not divisible by 3 or 5, so we return the number itself as a string '7'."],
  15: ["The character 'a' is in the vowels list (a, e, i, o, u), so it is a Vowel.",
       "The character 'B' is a letter but not a vowel, so it is a Consonant.",
       "The character '3' is a number and not a letter, so it is classified as Neither."],
  16: ["2024 is divisible by 4, and it is not a century year (not divisible by 100), so it is a leap year.",
       "1900 is a century year divisible by 100 but not by 400, so it is not a leap year.",
       "2000 is a century year divisible by both 100 and 400, so it is a leap year."],
  17: ["The score 95 is 90 or above, which corresponds to grade 'A'.",
       "The score 72 is between 70 and 79, which corresponds to grade 'C'.",
       "The score 55 is below 60, which corresponds to grade 'F'.",
       "A negative score like -5 is outside the valid range of 0 to 100, so it is Invalid."],
  18: ["Month 1 (January) belongs to the Winter months (December, January, and February).",
       "Month 7 (July) belongs to the Summer months (June, July, and August).",
       "Month 13 is outside the valid range of 1 to 12, so it is Invalid."],
  19: ["For sides 3, 4, and 5: 3+4>5, 3+5>4, and 4+5>3. Since the sum of any two sides is greater than the third, it is a valid triangle.",
       "For sides 1, 2, and 3: the sum of side 1 and 2 is 3, which is not strictly greater than side 3. Thus, it cannot form a triangle.",
       "A side length of 0 is impossible in geometry, so it cannot form a valid triangle."],
  20: ["Age 4 is under 5, which qualifies for free admission (price is 0).",
       "Age 70 is 65 or older, qualifying for the senior ticket price of 5.",
       "Age 20 is not a child or senior, but has student status, getting the student price of 8.",
       "Age 30 has no special discounts, paying the full standard price of 10."],
  21: ["BMI = weight / height^2 = 40 / (1.60^2) = 15.6. Since 15.6 is less than 18.5, the category is 'Underweight'.",
       "BMI = weight / height^2 = 70 / (1.75^2) = 22.9. Since 22.9 is between 18.5 and 24.9, the category is 'Normal'."],
  22: ["Player 1 chose rock and Player 2 chose scissors. Since rock beats scissors, Player 1 wins.",
       "Both players chose paper. Since their choices are identical, the result is a Draw.",
       "Player 1 chose scissors and Player 2 chose rock. Since rock beats scissors, Player 2 wins."],
  23: ["The operator is '+', so we add 10 and 5 to get 15.",
       "The operator is '/' but the divisor b is 0. Since division by zero is impossible, we return the error message.",
       "The operator '%' is not one of the supported operators (+, -, *, /), so we return an invalid operator error."],
  24: ["'A' is a capital letter, so it is classified as Uppercase.",
       "'z' is a small letter, so it is classified as Lowercase.",
       "'5' is a digit between 0 and 9, so it is classified as Digit.",
       "'#' is a symbol, so it is classified as Special."],
  25: ["Discriminant = b^2 - 4ac = (-3)^2 - 4(1)(2) = 9 - 8 = 1. Since 1 is greater than 0, there are 2 real roots.",
       "Discriminant = 2^2 - 4(1)(1) = 4 - 4 = 0. Since the discriminant is exactly 0, there is 1 repeated real root.",
       "Discriminant = 1^2 - 4(1)(1) = 1 - 4 = -3. Since -3 is less than 0, there are 0 real roots."],
  26: ["Reversing the digits of 5792 from right to left gives 2, 9, 7, and 5, which forms the integer 2975.",
       "For -408, we ignore the sign and reverse the digits of 408 to get 804, then re-apply the negative sign to get -804."],
  27: ["Reversing 'hello' character-by-character from right to left gives 'o', 'l', 'l', 'e', 'h', which forms 'olleh'.",
       "Reversing 'Data Science' including spaces and capitals gives 'ecneicS ataD'."],
  28: ["The number 34521 contains five digits: 3, 4, 5, 2, and 1.",
       "The number -9 contains only one digit: 9. The negative sign is not counted as a digit."],
  29: ["Summing the individual digits of 1234: 1 + 2 + 3 + 4 = 10.",
       "Summing the digits of -506 (ignoring the sign): 5 + 0 + 6 = 11."],
  30: ["Unpacking (a, b) = (b, a) swaps the two numbers, transforming (5, 10) into (10, 5).",
       "Swapping (-3, 0) transforms it into (0, -3)."],
  31: ["42 divided by 2 leaves a remainder of 0, which means it is an Even number.",
       "-17 divided by 2 leaves a remainder of 1 (or -1), which means it is an Odd number."],
  32: ["The first 5 terms of the Fibonacci sequence starting from 0 and 1 are 0, 1, 1, 2, and 3.",
       "With n=1, only the first Fibonacci term 0 is requested, returning [0]."],
  33: ["F(0) represents the first term in the sequence, which is defined as 0.",
       "F(9) is the 10th term in the sequence (0, 1, 1, 2, 3, 5, 8, 13, 21, 34), which is 34."],
  34: ["5! is the product of all positive integers up to 5: 5 * 4 * 3 * 2 * 1 = 120.",
       "By mathematical definition, the factorial of 0 (0!) is equal to 1."],
  35: ["11 has no divisors other than 1 and itself, so it is a prime number (returns True).",
       "4 can be divided evenly by 2 (2 * 2 = 4), which means it is not a prime number (returns False)."],
  36: ["153 has 3 digits. 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153. Since this sum equals the original number, it is an Armstrong number (returns True).",
       "123 has 3 digits. 1^3 + 2^3 + 3^3 = 1 + 8 + 27 = 36. Since 36 is not equal to 123, it is not an Armstrong number (returns False)."],
  37: ["Reading 1221 backwards gives 1221, which is identical to the original number, so it is a palindrome.",
       "Reading -121 backwards gives 121-, which does not equal -121. Thus, negative numbers are never palindromes."],
  38: ["For 38: 3 + 8 = 11, then 1 + 1 = 2. Since 2 is a single digit, the digital root is 2.",
       "0 is already a single digit, so its digital root is 0."],
  39: ["Dividing 100 by 7 gives remainders of 2, 0, and 2. Reading them backwards yields the base-7 string '202'.",
       "Converting |-7| = 7 to base-7 gives '10', and re-applying the negative sign yields '-10'."],
  40: ["58 is composed of 50 (L), 5 (V), and 3 (III), which forms the Roman numeral 'LVIII'.",
       "1994 is composed of 1000 (M), 900 (CM), 90 (XC), and 4 (IV), which forms 'MCMXCIV'."],
  41: ["Adding the values: I + I + I = 1 + 1 + 1 = 3.",
       "Adding and subtracting based on Roman rules: M(1000) + CM(900) + XC(90) + IV(4) = 1994."],
  42: ["For column 'AB': A is 1st (1 * 26 = 26) and B is 2nd (2). 26 + 2 = 28.",
       "For column 'ZY': Z is 26th (26 * 26 = 676) and Y is 25th (25). 676 + 25 = 701."],
  43: ["Multiplying the two values: 2 * 3 = 6, returned as the string '6'.",
       "Multiplying 123 * 456 = 56088, returned as the string '56088'."],
  44: ["We strip leading whitespace to get '-42', read the sign '-', and parse the digits '42' to get the integer -42.",
       "We parse digits up to the first non-digit space character in '4193 with words', yielding the integer 4193."],
  45: ["The digits of 12 can be rearranged to form the next larger permutation, which is 21.",
       "The digits of 21 are already sorted in descending order, meaning no larger permutation can be formed, so we return -1."],
  46: ["The prime numbers strictly less than 10 are 2, 3, 5, and 7, so there are 4 primes.",
       "There are no prime numbers strictly less than 2, so the count is 0."],
  47: ["The Greatest Common Divisor of 24 and 36 is 12, and their Least Common Multiple is (24 * 36) / 12 = 72.",
       "The Greatest Common Divisor of 7 and 9 is 1, and their Least Common Multiple is (7 * 9) / 1 = 63."],
  48: ["5! = 120, which contains exactly one factor of 5 and 2, resulting in 1 trailing zero.",
       "3! = 6, which contains no factor of 5, resulting in 0 trailing zeroes."],
  49: ["We compute 2 raised to the power of 3 modulo 1337, which is 8.",
       "We compute 2 raised to the power of 10 modulo 1337: 1024 modulo 1337 = 1024."],
  50: ["The prime factors of 6 are 2 and 3. Since they belong to the allowed set {2, 3, 5}, the number is ugly.",
       "The prime factors of 14 are 2 and 7. Since 7 is not in the set {2, 3, 5}, the number is not ugly."],
  51: ["19: 1^2 + 9^2 = 82 → 8^2 + 2^2 = 68 → 6^2 + 8^2 = 100 → 1^2 + 0^2 = 1. Since it reaches 1, it is a happy number.",
       "2: the process enters an infinite loop (4 → 16 → 37...) and never reaches 1, so it is not a happy number."],
  52: ["The number 2 can only be split into 1 + 1, and their product is 1 * 1 = 1.",
       "The number 10 is optimally split into 3 + 3 + 4, giving the maximum product of 3 * 3 * 4 = 36."],
  53: ["12 is optimally split into 4 + 4 + 4 (which are 2^2 + 2^2 + 2^2), needing 3 perfect squares.",
       "13 is optimally split into 9 + 4 (which are 3^2 + 2^2), needing 2 perfect squares."],
  54: ["With 4 stones left, any move (taking 1, 2, or 3 stones) leaves 1 to 3 stones, allowing the opponent to win. So player 1 cannot guarantee a win.",
       "With 1 stone left, you take the last stone and win the game immediately."],
  55: ["We compute 2.0 raised to the power of 10, which yields 1024.0.",
       "We compute 2.1 raised to the power of 3, which yields 9.261."],
  78: ["strip() removes spaces, upper() converts to uppercase, lower() to lowercase",
       "Same operations on '  PyTHON  '"],
  79: ["split() on spaces gives list, len() counts elements, join() puts them back with hyphens",
       "split() gives ['hello', 'world'], len=2, joined with hyphen → 'hello-world'"],
  80: ["replace('l','L') replaces all 'l's; find('l') returns first index 2; count('l') returns 3",
       "No match for 'z' → returns original string, find=-1, count=0"],
  81: ["'PyCode' starts with 'Py' and ends with 'ode' → (True, True)",
       "'hello' starts with 'he' and ends with 'lo' → (True, True)"],
  82: ["'hello' contains only alphabetic characters → alpha=True, digit=False, alnum=True",
       "'12345' contains only digit characters → alpha=False, digit=True, alnum=True"],
  83: ["'Hello World' has 2 words, longest is 'Hello' (5 chars)",
       "Empty string has 0 words, longest is '' (0 chars)"],
  84: ["'racecar' reversed is 'racecar' → Palindrome → True",
       "'hello' reversed is 'olleh' != 'hello' → False"],
  85: ["Clean string to lowercase letters: 'madam' → same reversed → True",
       "Clean string: 'helloworld' → reversed is 'dlrowolleh' != original → False"],
  86: ["Rotate 'Python' by 2: move last 2 chars 'on' to front → 'onPyth'",
       "Rotate 'abcde' by 1: move last 1 char 'e' to front → 'eabcd'"],
  87: ["'abcabc': unique characters sorted → 'abc', count of each: a=2, b=2, c=2",
       "'aabbc': unique characters sorted → 'abc'"],
  88: ["Filter out any characters that are in the remove string",
       "Filter out 'aeiou' vowels from 'Python' → 'Pythn'"],
  89: ["Extract digits '123' and '456' → sum = 123 + 456 = 579",
       "No digit characters found → sum = 0"],
  90: ["Words starting with 'h' in 'hello world foo' is just 'hello' → 1",
       "Count occurrences of letter 'a' in 'banana' → 3"],
  91: ["Reverse each word in-place: 'Hello'→'olleH', 'World'→'dlroW' → 'olleH dlroW'",
       "'Python' reversed → 'nohtyP'"],
  92: ["Common prefix of 'flower', 'flow', 'flight' is 'fl'",
       "No common prefix among 'dog', 'racecar', 'car' → ''"],
  93: ["Anagram: sorted('listen') == sorted('silent') → True",
       "Anagram: sorted('hello') != sorted('world') → False"],
  94: ["Caesar cipher shift 3: H→K, e→h, l→o, l→o, o→r → 'Khoor'",
       "ROT13 shift 13: a→n, b→o, c→p → 'nop'"],
  95: ["Unique characters in 'banana' are 'b', 'a', 'n' → 3 unique characters",
       "Unique characters in 'hello' are 'h', 'e', 'l', 'o' → 4 unique characters"],
  96: ["Compress: 3 'a's, 3 'b's, 2 'c's → 'a3b3c2'",
       "Compress: 1 'a', 1 'b', 1 'c', 1 'd' → 'a1b1c1d1'"],
  97: ["Characters appearing once: 'l', 't', 'c', 'o', 'd' → first is 'l'",
       "No characters appear only once in 'aabb' → ''"],
  98: ["'sad' first occurs at index 0 of 'sadbutsad' → 0",
       "'leeto' is not in 'leetcode' → -1"],
  99: ["Remove duplicates keeping first: 'p', 'r', 'o', 'g', 'a', 'm', 'i', 'n' → 'progamin'",
       "Remove duplicates keeping first: 'h', 'e', 'l', 'o' → 'helo'"],
  100: ["Machine Learning → take first letters: 'M' + 'L' → 'ML'",
        "Artificial Intelligence → 'A' + 'I' → 'AI'"],
  101: ["Sum=15, max=5, min=1, avg=3.0, reversed=[5,4,3,2,1]",
        "Sum=0, max=1, min=-1, avg=0.0, reversed=[1,0,-1]"],
  102: ["Unique values in [1, 2, 2, 3, 1] keeping order → [1, 2, 3]",
        "List [4, 5, 6] already has unique values → [4, 5, 6]"],
  103: ["Concatenate all sublists: [1, 2] + [3, 4] + [5] → [1, 2, 3, 4, 5]",
        "Concatenate [1] + [2] + [3] → [1, 2, 3]"],
  104: ["Rotate [1, 2, 3, 4, 5] by 2 right: [4, 5] move to front → [4, 5, 1, 2, 3]",
        "Rotate [1, 2, 3] by 4: 4 % 3 = 1 step rotation → [3, 1, 2]"],
  105: ["Intersection: {2,3}, Union: {1,2,3,4}, Difference: {1} and {4}",
        "Intersection: {}, Union: {1,2,3,4}"],
  106: ["Pair elements: (1,'a'), (2,'b'), (3,'c')",
        "Pair elements (stops at shortest list): (1,'a'), (2,'b')"],
  107: ["Even indices (0, 2, 4): 10, 30, 50 → [10, 30, 50]",
        "Odd indices (1, 3): 2, 4 → [2, 4]"],
  108: ["max=9, min=1, range = 9-1 = 8, sorted = [1, 1, 2, 3, 4, 5, 6, 9]",
        "max=5, min=5, range = 5-5 = 0, sorted = [5]"],
  109: ["Split into chunks of size 2: [1, 2], [3, 4], [5]",
        "Split into chunks of size 1: [1], [2], [3]"],
  110: ["Numbers 1 to 5 missing from [1, 2, 4, 5] is {3} → [3]",
        "Numbers 1 to 4 missing from [1, 3] is {2, 4} → [2, 4]"],
  111: ["Transpose rows to columns: [[1,4], [2,5], [3,6]]",
        "Transpose rows to columns: [[1], [2]]"],
  112: ["Even numbers: [2, 4], Odd numbers: [1, 3, 5]",
        "Even numbers: [0, 2], Odd numbers: [-1, -3]"],
  113: ["Binary search: find 6 in sorted list → index 5",
        "Unsorted list: sort first then binary search"],
  114: ["Scanning the list [3, 5, 1, 9, -2, 7]: the largest number is 9 and the smallest is -2, so we return the tuple (9, -2).",
        "The list contains only one number 42, which is both the maximum and minimum, so we return (42, 42).",
        "The list is completely empty, so there are no elements to evaluate, returning (None, None)."],
  115: ["First we remove duplicates to get unique values. In [-2, 1, 3, 5, 7, 9], the second largest value is 7 and the second smallest is 1, so we return (7, 1).",
        "There is only one unique element 42, so a second unique largest or smallest does not exist, returning (None, None).",
        "The list is empty, so we return (None, None)."],
  116: ["In the list [1, 2, 3, 4, 5]: 2 and 4 are even (count 2), and 1, 3, and 5 are odd (count 3), so we return the tuple (2, 3)."],
  117: ["Scanning [1, 2, 2, 5, 7]: every number is greater than or equal to the one before it, so it is sorted in ascending order (returns True).",
        "In [4, 7, 2, 9]: 7 is followed by 2, which is smaller, so the list goes up then down. It is not sorted (returns False).",
        "An empty list has no out-of-order pairs, so it is considered sorted by default (returns True)."],
  118: ["Reversing the elements of list [1, 2, 3] in-place yields [3, 2, 1]."],
  119: ["The sum of [1, 2, 3, 4] is 10. The average is 10 divided by 4 elements, which is 2.5, returning (10, 2.5)."],
  120: ["Moving all zeroes to the end of [0, 1, 0, 3, 12] in-place while keeping the non-zero numbers in order yields [1, 3, 12, 0, 0]."],
  121: ["Modifying [1, 1, 2] in-place to keep only unique elements leaves [1, 2] at the front, returning the count of unique elements, which is 2."],
  122: ["Rotating [1, 2, 3, 4, 5, 6, 7] by 3 steps shifts the last 3 elements [5, 6, 7] to the front, yielding [5, 6, 7, 1, 2, 3, 4] in-place."],
  123: ["Partitioning [3, 5, 2, 4, 9, 8] in-place so all even numbers (2, 4, 8) are placed before the odd numbers (3, 5, 9)."],
  124: ["In the sorted list [2, 7, 11, 15], 2 at index 0 and 7 at index 1 add up to the target of 9, returning indices (0, 1)."],
  125: ["The maximum area of water is formed between the vertical lines at index 1 (height 8) and index 8 (height 7): min(8, 7) * (8 - 1) = 7 * 7 = 49.",
        "The only container possible has boundaries at index 0 and 1, giving area min(1, 1) * 1 = 1."],
  126: ["The contiguous subarray with the largest sum is [4, -1, 2, 1], which sums to 6.",
        "Only one element is present, so the max subarray sum is 1."],
  127: ["Generating all contiguous slices of [1, 2, 3] gives [1], [1, 2], [1, 2, 3], [2], [2, 3], and [3]."],
  128: ["Scanning windows of size 2: [100, 200] is 300, [200, 300] is 500, [300, 400] is 700. The maximum sum is 700."],
  129: ["The shortest contiguous subarray with a sum greater than or equal to 7 is [4, 3], which has a length of 2."],
  130: ["For each index, the product of all other elements is: index 0 (2*3*4=24), index 1 (1*3*4=12), index 2 (1*2*4=8), index 3 (1*2*3=6), giving [24, 12, 8, 6]."],
  131: ["In [3, 2, 3], the number 3 appears 2 times, which is more than half of the list length of 3, so it is the majority element."],
  132: ["Sorting the elements (0s, 1s, 2s) in-place: all 0s go left, 1s go middle, 2s go right, giving [0, 0, 1, 1, 2, 2]."],
  133: ["The next lexicographically greater arrangement of digits for [1, 2, 3] is [1, 3, 2]."],
  134: ["A total of 6 units of rain water can be trapped between the columns of height [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]."],
  135: ["Merging [2, 5, 6] directly into [1, 2, 3, 0, 0, 0] from right to left yields the sorted list [1, 2, 2, 3, 5, 6] in-place."],
  136: ["The intersections where the intervals overlap are [1, 2], [5, 5], [8, 10], [15, 23], and [25, 25]."],
  137: ["Rotating the 2x2 grid [[1, 2], [3, 4]] clockwise by 90 degrees in-place yields [[3, 1], [4, 2]]."],
  138: ["Traversing the grid in spiral order: top row [1, 2, 3], right column [6, 9], bottom row [8, 7], left column [4], and center [5]."],
  139: ["Since matrix[1][1] is 0, we set the entire row 1 and column 1 to 0, yielding [[1, 0, 1], [0, 0, 0], [1, 0, 1]] in-place."],
  140: ["Searching for 9 in the sorted list [-1, 0, 3, 5, 9, 12]: we compare with the middle values and find it at index 4."],
  141: ["In [1, 2, 3, 1], the element 3 at index 2 is greater than both neighbor 2 (left) and neighbor 1 (right), making it a peak."],
  142: ["Searching for 0 in rotated list [4, 5, 6, 7, 0, 1, 2]: using binary search, we find it at index 4."],
  143: ["Finding the next greater value to the right: 1→3, 3→4, 4→none (-1), 2→none (-1), giving [3, 4, -1, -1]."],
  144: ["Number of days to wait for a warmer temperature: 73→1 day (74), 74→1 day (75), 75→4 days (76), giving [1, 1, 4, 2, 1, 1, 0, 0]."],
  145: ["The largest rectangle is formed by the heights 5 and 6 side-by-side, giving a width of 2 and a height of 5, which yields an area of 10."],
  146: ["Create dictionary with key-value pairs → {'name': 'Alice', 'age': 18, 'grade': 'A'}",
        "Create dictionary → {'name': 'Bob', 'age': 20, 'grade': 'B'}"],
  147: ["keys() sorted → ['a','b','c'], values() sorted → [1,2,3], items() → key-value tuples"],
  148: ["Merge and sum duplicate key 'b' (2 + 3 = 5) → {'a': 1, 'b': 5, 'c': 4}",
        "Merge dictionaries → {'x': 10, 'y': 20}"],
  149: ["1 appears 1 time, 2 appears 2 times, 3 appears 3 times → {1: 1, 2: 2, 3: 3}",
        "'a' appears 3 times, 'b' twice, 'c' once → {'a': 3, 'b': 2, 'c': 1}"],
  150: ["Dictionary of squares for 1 to 5 → {1:1, 2:4, 3:9, 4:16, 5:25}",
        "Dictionary of squares for 1 to 3 → {1:1, 2:4, 3:9}"],
  151: ["Target 9: 2 + 7 = 9 at indices [0, 1]",
        "Target 6: 2 + 4 = 6 at indices [1, 2]"],
  152: ["Group anagrams: 'eat', 'tea', 'ate' group together; 'tan', 'nat' group together",
        "Single empty string → [['']]"],
  153: ["Alice has highest average score (89) → return 'Alice'"],
  154: ["Filter even numbers [-2, 4, 0] and square them → [4, 16, 0]; positives=[1, 4]"],
  155: ["Map to uppercase; filter words with length > 3 → ['HELLO', 'PYTHON']"],
  156: ["Sort by age ascending, then name alphabetically → Bob(25), Dave(25), Alice(30), Carol(30)"],
  157: ["Filter positives, take absolute value of negatives, find positions of elements > 0"],
  158: ["Even numbers <= 10: 0, 2, 4, 6, 8, 10",
        "0 is even → [0]", "Evens <= 7: 0, 2, 4, 6"],
  159: ["Cumulative product: 1*2*3*4*5 = 120, max element = 5 → (120, 5)",
        "Single element → cumulative product = 3, max = 3"],
  160: ["Animal('Dog', 'Woof').speak() → 'Dog says Woof!'",
        "Animal('Cat', 'Meow').speak() → 'Cat says Meow!'"],
  161: ["deposit(50) updates balance to 150; withdraw(30) updates balance to 120"],
  162: ["str(p) gives Point(3, 4), repr(p) gives developer-friendly representation"],
  163: ["Circle area = pi * 5^2 ≈ 78.54", "Rectangle area = 4 * 6 = 24"],
  164: ["Instance variable name='Alice', class variable school='PyCode Academy'",
        "Class method access: get_school() → 'PyCode Academy'"],
  165: ["Property getter/setter: 100°C conversion → 100*9/5 + 32 = 212°F",
        "Negative temperature below absolute zero (-300°C) is invalid"],
  166: ["Box volumes: 1*2*3 = 6 vs 6*1*1 = 6 → equal → == True",
        "Box volumes: 1 < 8 → Box(1,1,1) < Box(2,2,2) → True"],
  167: ["10 / 2 = 5.0", "Division by zero is caught → 'Error: Cannot divide by zero'",
        "Index 10 of list size 3 is caught → 'Error: Index out of range'"],
};

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

// Regex to match the example block
// Since the builder's HTML had missing closing </div> tags on Input row, we'll parse it very robustly.
// We extract:
// 1. Input content: everything after "Input:</span>" up to either the next "Output:" row or the next <div>/</div>.
// 2. Output content: everything after "Output:</span>" up to the end of the block.
const EXAMPLE_BLOCK_RE = /<div class="border-l-2 border-primary\/40[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*(?:<h3|<ul|$))/g;

let totalPatched = 0;

qs.forEach(q => {
  const explanations = EXPLANATIONS[q.id];
  if (!explanations || !explanations.length) return;

  let exampleIdx = 0;
  let newDesc = q.description;

  // Find all example blocks and rewrite them as a clean, standardized list of rows.
  // We'll replace the entire <div class="border-l-2..."> block with a clean structure
  newDesc = newDesc.replace(EXAMPLE_BLOCK_RE, (match, innerContent) => {
    // 1. Extract Input value code
    let inputVal = '';
    const inputMatch = innerContent.match(/Input:<\/span>\s*(<code>.*?<\/code>)/);
    if (inputMatch) {
      inputVal = inputMatch[1];
    } else {
      // Fallback: look for code tag inside the first div
      const codeMatch = innerContent.match(/<code>(.*?)<\/code>/);
      if (codeMatch) inputVal = `<code>${codeMatch[1]}</code>`;
    }

    // 2. Extract Output value code
    let outputVal = '';
    const outputMatch = innerContent.match(/Output:<\/span>\s*(<code>.*?<\/code>)/);
    if (outputMatch) {
      outputVal = outputMatch[1];
    } else {
      // Fallback: look for the second code tag
      const codeMatches = [...innerContent.matchAll(/<code>(.*?)<\/code>/g)];
      if (codeMatches.length >= 2) {
        outputVal = `<code>${codeMatches[1][1]}</code>`;
      }
    }

    const explanation = explanations[exampleIdx];
    exampleIdx++;

    if (!inputVal || !outputVal || !explanation) {
      return match; // Keep unchanged if parsing failed
    }

    // Standardized markup with consistent tags
    // We wrap each row in a div with proper classes that our formatter will easily format.
    // The raw HTML is simple and correct.
    return `<div class="border-l-2 border-primary/40 dark:border-primary/50 pl-4 py-1.5 space-y-1.5 my-3.5 font-mono text-xs text-ink font-normal">
  <div><span class="text-ink/80 font-bold font-sans mr-2">Input:</span> ${inputVal}</div>
  <div><span class="text-primary font-bold font-sans mr-2">Output:</span> ${outputVal}</div>
  <div><span class="text-ink/80 font-bold font-sans mr-2">Explanation:</span> <span class="text-ink font-normal font-sans">${explanation}</span></div>
</div>`;
  });

  if (newDesc !== q.description) {
    q.description = newDesc;
    totalPatched++;
  }
});

function formatParagraphLists(html) {
  if (!html) return html;
  const P_RE = /(<p[^>]*>)([\s\S]*?)(<\/p>)/g;
  return html.replace(P_RE, (match, openTag, content, closeTag) => {
    if (!content.includes('\n-') && !content.includes('\n*') && !content.includes('\n1.')) {
      return match;
    }
    const lines = content.split('\n');
    let result = [];
    let currentParagraph = [];
    let inList = false;
    let listType = '';
    
    for (let line of lines) {
      let trimmed = line.trim();
      const ulMatch = trimmed.match(/^[-*•]\s+(.*)/);
      const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      
      if (ulMatch || olMatch) {
        if (currentParagraph.length > 0) {
          result.push(`${openTag}${currentParagraph.join(' ')}${closeTag}`);
          currentParagraph = [];
        }
        const type = ulMatch ? 'ul' : 'ol';
        const itemContent = ulMatch ? ulMatch[1] : olMatch[2];
        
        if (!inList || listType !== type) {
          if (inList) result.push(`</${listType}>`);
          const listClass = type === 'ul'
            ? 'list-disc pl-5 mb-4 text-xs text-ink space-y-1.5 font-normal font-sans'
            : 'list-decimal pl-5 mb-4 text-xs text-ink space-y-1.5 font-normal font-sans';
          result.push(`<${type} class="${listClass}">`);
          inList = true;
          listType = type;
        }
        result.push(`<li>${itemContent}</li>`);
      } else {
        if (inList) {
          result.push(`</${listType}>`);
          inList = false;
        }
        currentParagraph.push(line);
      }
    }
    if (inList) {
      result.push(`</${listType}>`);
    }
    if (currentParagraph.length > 0) {
      result.push(`${openTag}${currentParagraph.join(' ')}${closeTag}`);
    }
    return result.join('\n');
  });
}

qs.forEach(q => {
  q.description = formatParagraphLists(q.description);
});

console.log(`Structured and added explanations to ${totalPatched} questions. Formatted lists.`);

const newContent = `export interface LocalQuestion {
  id: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  category: string
  description: string
  starter_code: string
  dataset_name: string | null
  verification_script?: string
}

export const LOCAL_QUESTIONS: LocalQuestion[] = ${JSON.stringify(qs, null, 2)};
`;
fs.writeFileSync('src/lib/localQuestions.ts', newContent);
console.log('Done — src/lib/localQuestions.ts saved.');
