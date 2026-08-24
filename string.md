1. Check if a String is a Palindrome
Problem Statement Explanation
Given a string s, determine whether it reads the exact same forward as it does backward. The verification must be completely case-insensitive.

Only alphanumeric characters (letters and numbers) should be evaluated. All whitespace characters, punctuation marks, and special structural symbols must be completely ignored. An empty string or a string consisting entirely of skipped characters satisfies this condition by default.

Examples
Example 1:

Input: s = "A man, a plan, a canal: Panama"

Output: True

Example 2:

Input: s = "race a car"

Output: False

Example 3:

Input: s = " "

Output: True

Critical Test Cases to Pass
Input: s = "ab_a"

Expected Output: True

Input: s = "0P"

Expected Output: False

Input: s = "a"

Expected Output: True

Input: s = ".,."

Expected Output: True

Input: s = ""

Expected Output: True

2. Count Vowels, Consonants, and Digits
Problem Statement Explanation
Given a string s, analyze its content and find the total count of vowels, consonants, and numeric digits present. Return the calculated values as a tuple format: (vowel_count, consonant_count, digit_count).

Vowels: The English letters 'a', 'e', 'i', 'o', 'u' (in both uppercase and lowercase forms).

Consonants: Any other English alphabet letter that is not a vowel.

Digits: Any numerical character ranging from '0' to '9'.

Any white spaces, punctuation marks, or special characters present in the string must be completely ignored and excluded from all three counts.

Examples
Example 1:

Input: s = "Hello World 2026!"

Output: (3, 7, 4)

Example 2:

Input: s = "xyz"

Output: (0, 3, 0)

Example 3:

Input: s = ""

Output: (0, 0, 0)

Critical Test Cases to Pass
Input: s = "AEIOUaeiou"

Expected Output: (10, 0, 0)

Input: s = "1234567890"

Expected Output: (0, 0, 10)

Input: s = "!!!   !!!"

Expected Output: (0, 0, 0)

Input: s = "bcdfghjklmnpqrstvwxyz"

Expected Output: (0, 21, 0)

Input: s = ""

Expected Output: (0, 0, 0)

3. Find the First Non-Repeating Character
Problem Statement Explanation
Given a string s, scan through the text and identify the very first character that appears exactly once throughout the entire string.

Return the 0-based index position of this unique character. If every single character in the string repeats at least once elsewhere, or if the string is completely empty, return -1.

Examples
Example 1:

Input: s = "leetcode"

Output: 0

Example 2:

Input: s = "loveleetcode"

Output: 2

Example 3:

Input: s = "aabb"

Output: -1

Critical Test Cases to Pass
Input: s = "a"

Expected Output: 0

Input: s = "abcdeabcde"

Expected Output: -1

Input: s = "abcdefg"

Expected Output: 0

Input: s = "ccca"

Expected Output: 3

Input: s = ""

Expected Output: -1

4. Check if Two Strings are Anagrams
Problem Statement Explanation
Given two strings, s and t, determine whether t is an anagram of s.

An anagram is defined as a word or phrase formed by rearranging the exact letters of a different word or phrase, using all the original letters exactly once. The evaluation must check for an absolute matching frequency of every single character character-for-character. If the strings have different lengths, they cannot be anagrams.

Examples
Example 1:

Input: s = "anagram", t = "nagaram"

Output: True

Example 2:

Input: s = "rat", t = "car"

Output: False

Example 3:

Input: s = "", t = ""

Output: True

Critical Test Cases to Pass
Input: s = "a", t = "ab"

Expected Output: False

Input: s = "aa", t = "a"

Expected Output: False

Input: s = "ab", t = "ba"

Expected Output: True

Input: s = "aabc", t = "abca"

Expected Output: True

Input: s = "", t = ""

Expected Output: True

5. Valid Palindrome II
Problem Statement Explanation
Given a string s, return True if the string can be a palindrome after deleting at most one character from it.

A palindrome is a string that reads the same forward and backward. You can choose to delete zero characters or exactly one character from any position in the string to satisfy the condition.

Examples
Example 1:

Input: s = "aba"

Output: True

Example 2:

Input: s = "abca"

Output: True (You can delete the character 'c' to get "aba", or 'b' to get "aca")

Example 3:

Input: s = "abc"

Output: False

Critical Test Cases to Pass
Input: s = "deeee"

Expected Output: True (Deleting the first character 'd' yields "eeee")

Input: s = "abcdefba"

Expected Output: False (Requires deleting more than one character to form a palindrome)

Input: s = "aguokkgauktcjmdwwdonecahexwjjotfsocipyzhwqvhuabcitjbmuzhrrznaswwmjjumszumbjticaubhqvwhzyipcosftojjwxehacenodwwdmjctkuagukkouga"

Expected Output: True (Testing a long string with a single mismatch deep inside the structure)

Input: s = "a"

Expected Output: True

6. String Compression (Run-Length Encoding)
Problem Statement Explanation
Given an array of characters chars, compress it using a run-length encoding algorithm.

For each group of consecutive repeating characters:

If the group length is 1, append the character to the result.

Otherwise, append the character followed by the group's length.

The compression must be done in-place, modifying the input array directly. The new length of the compressed array must be returned. The structural digits of any count greater than or equal to 10 must be split into single individual string characters (e.g., a count of 12 becomes "1", then "2").

Examples
Example 1:

Input: chars = ["a","a","b","b","c","c","c"]

Output: 6 (The input array becomes ["a","2","b","2","c","3"])

Example 2:

Input: chars = ["a"]

Output: 1 (The input array becomes ["a"])

Example 3:

Input: chars = ["a","b","b","b","b","b","b","b","b","b","b","b","b"]

Output: 4 (The input array becomes ["a","b","1","2"])

Critical Test Cases to Pass
Input: chars = ["a","a","a","a","a","a","a","a","a","a"]

Expected Output: 3 (Modifies to ["a","1","0"])

Input: chars = ["a","b","c"]

Expected Output: 3 (Modifies to ["a","b","c"] since no repetitions occur)

Input: chars = []

Expected Output: 0

7. Reverse Words in a String
Problem Statement Explanation
Given an input string s, reverse the order of the words.

A word is defined as a sequence of non-space characters. The words in s will be separated by at least one space. Return a string of the words in reverse order concatenated by a single space.

Constraint Requirements: The input string s may contain leading spaces, trailing spaces, or multiple spaces between two words. The returned string must not contain leading or trailing spaces, and words must be separated by exactly one single space.

Examples
Example 1:

Input: s = "the sky is blue"

Output: "blue is sky the"

Example 2:

Input: s = "  hello world  "

Output: "world hello"

Example 3:

Input: s = "a good   example"

Output: "example good a"

Critical Test Cases to Pass
Input: s = "  Bob    Loves  Alice  "

Expected Output: "Alice Loves Bob"

Input: s = "Alice"

Expected Output: "Alice"

Input: s = "   "

Expected Output: ""

8. Longest Palindromic Substring
Problem Statement Explanation
Given a string s, find and return the longest contiguous substring within s that forms a valid palindrome.

A substring is a contiguous sequence of characters within a string. If multiple palindromic substrings share the maximum length, returning any one of them is acceptable.

Examples
Example 1:

Input: s = "babad"

Output: "bab" (Note: "aba" is also a completely valid answer)

Example 2:

Input: s = "cbbd"

Output: "bb"

Example 3:

Input: s = "a"

Output: "a"

Critical Test Cases to Pass
Input: s = "aacabdkacaa"

Expected Output: "aca"

Input: s = "bb"

Expected Output: "bb"

Input: s = "abcdefg"

Expected Output: "a" (When no larger matches exist, any single character satisfies the base length 1)

Input: s = ""

Expected Output: ""

9. Is Subsequence
Problem Statement Explanation
Given two strings s and t, determine if s is a subsequence of t.

A subsequence of a string is a new string that is formed from the original string by deleting some (can be none) of the characters without disturbing the relative positions of the remaining characters. (e.g., "ace" is a subsequence of "abcde" while "aec" is not). Return True if conditions match, otherwise False.

Examples
Example 1:

Input: s = "abc", t = "ahbgdc"

Output: True

Example 2:

Input: s = "axc", t = "ahbgdc"

Output: False

Example 3:

Input: s = "", t = "ahbgdc"

Output: True

Critical Test Cases to Pass
Input: s = "abc", t = "abc"

Expected Output: True

Input: s = "b", t = "c"

Expected Output: False

Input: s = "aaaaaa", t = "bbaaaa"

Expected Output: False (Mismatched absolute letter counts)

Input: s = "", t = ""

Expected Output: True

10. Longest Substring Without Repeating Characters
Problem Statement Explanation
Given a string s, find the length of the longest contiguous substring that contains entirely unique characters (no character appears more than once within that substring span).

Examples
Example 1:

Input: s = "abcabcbb"

Output: 3 (The longest unique substring is "abc")

Example 2:

Input: s = "bbbbb"

Output: 1 (The longest unique substring is "b")

Example 3:

Input: s = "pwwkew"

Output: 3 (The longest unique substring is "wke")

Critical Test Cases to Pass
Input: s = " "

Expected Output: 1 (A single space character is a valid unique character)

Input: s = "dvdf"

Expected Output: 3 (The substring "vdf" is the longest unique segment)

Input: s = ""

Expected Output: 0

11. Find All Anagrams in a String
Problem Statement Explanation
Given two strings s and p, return an array of all the start indices of p's anagrams inside s. You may return the answer list in any sorting order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once. This means you are looking for substrings in s that match the length and exact character frequencies of p.

Examples
Example 1:

Input: s = "cbaebabacd", p = "abc"

Output: [0, 6] (The anagram matches start at index 0 ["cba"] and index 6 ["bac"])

Example 2:

Input: s = "abab", p = "ab"

Output: [0, 1, 2]

Critical Test Cases to Pass
Input: s = "aaaaaaaaaa", p = "aaaaaaaa"

Expected Output: [0, 1, 2]

Input: s = "af", p = "be"

Expected Output: []

Input: s = "", p = "a"

Expected Output: []

12. Longest Common Prefix
Problem Statement Explanation
Write a function to find the longest common prefix string amongst an array of strings strs.

A prefix is a collection of characters at the absolute beginning of a string. If no common prefix exists across all strings in the array, return an empty string "".

Examples
Example 1:

Input: strs = ["flower","flow","flight"]

Output: "fl"

Example 2:

Input: strs = ["dog","racecar","car"]

Output: ""

Example 3:

Input: strs = ["a"]

Output: "a"

Critical Test Cases to Pass
Input: strs = ["","b"]

Expected Output: "" (An empty string in the input array immediately nullifies any prefix)

Input: strs = ["ab", "a"]

Expected Output: "a"

Input: strs = ["cir", "car"]

Expected Output: "c"

Input: strs = []

Expected Output: ""