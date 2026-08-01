1. Find Maximum and Minimum Element in a List
Problem Statement Explanation
Given a list of integers nums, find and return both the maximum element and the minimum element present in the list. Return the result as a tuple: (maximum, minimum).

If the input list is completely empty, there are no elements to evaluate; in this case, return (None, None).

Examples
Example 1:

Input: nums = [3, 5, 1, 9, -2, 7]

Output: (9, -2)

Example 2:

Input: nums = [42]

Output: (42, 42)

Example 3:

Input: nums = []

Output: (None, None)

Critical Test Cases to Pass
nums = [7] (Single-element list where maximum must equal minimum)

nums = [5, 5, 5, 5] (A list where all elements are identical values)

nums = [-10, -20, -3, -50] (A list containing exclusively negative integers)

nums = [] (An empty list)

2. Find the Second Largest and Second Smallest Element
Problem Statement Explanation
Given an unsorted list of integers nums, find and return the second largest and the second smallest unique elements in the list. Return the result as a tuple: (second_largest, second_smallest).

If a unique second largest element does not exist (due to insufficient unique numbers), its value should be returned as None. Similarly, if a unique second smallest element does not exist, its value should be returned as None. If the input list is empty, return (None, None).

Examples
Example 1:

Input: nums = [12, 35, 1, 10, 34, 1]

Output: (34, 10)

Example 2:

Input: nums = [10, 10, 10]

Output: (None, None)

Example 3:

Input: nums = []

Output: (None, None)

Critical Test Cases to Pass
nums = [10, 20, 20, 5, 5] (Duplicate maximum and duplicate minimum values present)

nums = [8, 8] (A list containing fewer than two unique elements)

nums = [-5, -1, -10, 0] (A list containing a mix of negative values and zero)

nums = [] (An empty list)

3. Count Even and Odd Numbers in a List
Problem Statement Explanation
Given a list of integers nums, determine the total count of even integers and the total count of odd integers present in the list. Return the result as a tuple format: (even_count, odd_count).

An integer is considered even if it is perfectly divisible by 2, and odd if it leaves a remainder. Negative numbers must be categorized accurately based on this rule. If the input list is completely empty, return (0, 0).

Examples
Example 1:

Input: nums = [2, 7, 11, 44, 8, 9]

Output: (3, 3)

Example 2:

Input: nums = [0, -2, -4]

Output: (3, 0)

Example 3:

Input: nums = []

Output: (0, 0)

Critical Test Cases to Pass
nums = [0] (A list containing only the number zero, which is mathematically even)

nums = [-3, -5, -6, -8] (A list containing negative odd and negative even integers)

nums = [] (An empty list)

4. Check if a List is Sorted (Ascending or Descending)
Problem Statement Explanation
Given a list of numbers nums, check whether the list is completely sorted in non-decreasing (ascending) order OR completely sorted in non-increasing (descending) order.

Return True if the list satisfies either sorting condition from start to finish. Return False if the elements fluctuate up and down. By definition, an empty list or a list containing a single element has no out-of-order pairs and must return True.

Examples
Example 1:

Input: nums = [1, 2, 2, 5, 7]

Output: True

Example 2:

Input: nums = [4, 7, 2, 9]

Output: False

Example 3:

Input: nums = []

Output: True

Critical Test Cases to Pass
nums = [] (An empty list)

nums = [9] (A single-element list)

nums = [3, 3, 3, 3] (A list containing all identical elements)

nums = [20, 15, 10, 5] (A strictly descending list)

5. Reverse a List In-Place
Problem Statement Explanation
Given a list nums, reverse the order of its elements. You must perform this operation in-place by mutating the input list directly. Your function should modify the original object and not return a new copy. If the list is empty or contains only one element, it remains unchanged.

Examples
Example 1:

Input: nums = [1, 2, 3, 4, 5]

Output: nums becomes [5, 4, 3, 2, 1]

Example 2:

Input: nums = ["A", "B"]

Output: nums becomes ["B", "A"]

Example 3:

Input: nums = []

Output: nums becomes []

Critical Test Cases to Pass
nums = [1, 2, 3] (An odd-length list where the middle element stays in position)

nums = [10, 20, 30, 40] (An even-length list where all elements change positions)

nums = [] or [5] (Empty or single-element boundary conditions)

6. Sum and Average of Elements in a List
Problem Statement Explanation
Given a list of numbers nums, calculate the total sum of all elements and their arithmetic average (mean). Return the result as a tuple: (total_sum, average).

If the input list is completely empty, it has no mathematical sum or length; in this scenario, return (0, 0.0) to safeguard against division errors.

Examples
Example 1:

Input: nums = [1, 2, 3, 4]

Output: (10, 2.5)

Example 2:

Input: nums = [-5, 5]

Output: (0, 0.0)

Example 3:

Input: nums = []

Output: (0, 0.0)

Critical Test Cases to Pass
nums = [] (An empty list)

nums = [-2, -4, -6] (A list containing exclusively negative integers)

nums = [0.1, 0.2, 0.3] (A list containing floating-point decimal numbers)

7. Move All Zeroes to the End of the List (In-Place)
Problem Statement Explanation
Given a list of integers nums, move all 0s to the end of it while maintaining the relative order of the non-zero elements.

In-Place: You must modify the input list directly by shifting elements within its existing memory. You are not allowed to create a copy of the list or allocate an auxiliary list.

Relative Order: The non-zero numbers must remain in the exact same sequence relative to one another after the zeroes are moved. For example, if 1 appeared before 3 originally, 1 must still appear before 3 in the final modified list.

If the list is empty or contains no zeroes, it remains unchanged.

Examples
Example 1:

Input: nums = [0, 1, 0, 3, 12]

Output: nums becomes [1, 3, 12, 0, 0]

Example 2:

Input: nums = [0]

Output: nums becomes [0]

Example 3:

Input: nums = [4, 5, 6]

Output: nums becomes [4, 5, 6]

Critical Test Cases to Pass
nums = [] (An empty list)

nums = [0, 0, 0] (A list containing exclusively zeroes)

nums = [1, 2, 3, 0] (Zero is already at the correct terminal position)

nums = [0, 0, 9] (Multiple consecutive zeroes at the very front of the list)

8. Remove Duplicates from a Sorted List (In-Place)
Problem Statement Explanation
Given a list nums sorted in non-decreasing (ascending) order, remove the duplicate elements in-place such that each unique element appears only once. The relative order of the unique elements must be kept identical.

Since the final length of the unique elements will be smaller than or equal to the original list size, your function must return an integer k, representing the number of unique elements. The first k slots of the modified nums list must hold these unique elements. The values stored beyond the first k elements do not matter.

If the list is empty, return 0.

Examples
Example 1:

Input: nums = [1, 1, 2]

Output: Return value = 2, nums becomes [1, 2, _] (where _ represents any don't-care value)

Example 2:

Input: nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]

Output: Return value = 5, nums becomes [0, 1, 2, 3, 4, _, _, _, _, _]

Example 3:

Input: nums = []

Output: Return value = 0, nums becomes []

Critical Test Cases to Pass
nums = [1, 2, 3, 4] (A sorted list that contains zero duplicates initially)

nums = [5, 5, 5, 5] (A list where every single element is a duplicate of the first)

nums = [-3, -3, -1, 0, 0, 2] (Handling negative integers and zero across duplicates)

9. Rotate a List Left or Right by k Steps
Problem Statement Explanation
Given a list nums, rotate the list to the right by k steps, where k is a non-negative integer.

Rotate to the Right: Shifting elements toward the higher indices. An element at the last index wraps around to index 0. Moving a list right by 1 step means the last element becomes the first element, and all other elements slide one slot to the right.

The modification must be performed in-place. Note that k can be zero, or it can be significantly larger than the total length of the list.

Examples
Example 1:

Input: nums = [1, 2, 3, 4, 5, 6, 7], k = 3

Output: nums becomes [5, 6, 7, 1, 2, 3, 4]

Example 2:

Input: nums = [-1, -100, 3, 99], k = 2

Output: nums becomes [3, 99, -1, -100]

Example 3:

Input: nums = [1, 2], k = 0

Output: nums becomes [1, 2]

Critical Test Cases to Pass
nums = [1, 2], k = 5 (k is larger than the list length; must wrap around correctly via modulo scaling)

nums = [1, 2, 3], k = 3 (k is exactly equal to the list length; results in zero net positional change)

nums = [], k = 10 (An empty list modified by any rotation step value)

10. Separate Even and Odd Numbers
Problem Statement Explanation
Given an unsorted list of integers nums, rearrange its elements in-place so that all even numbers appear at the beginning of the list, immediately followed by all odd numbers.

You are not required to preserve the original relative order of the numbers within the even group or within the odd group; any arrangement is acceptable as long as all evens precede all odds. If the list is empty, it remains unchanged.

Examples
Example 1:

Input: nums = [3, 5, 2, 4, 9, 8]

Output: nums becomes [2, 4, 8, 3, 9, 5] (Note: [8, 4, 2, 5, 9, 3] is also valid)

Example 2:

Input: nums = [1, 3, 5]

Output: nums becomes [1, 3, 5]

Example 3:

Input: nums = []

Output: nums becomes []

Critical Test Cases to Pass
nums = [2, 4, 6, 8] (A list that contains only even numbers)

nums = [2, 4, 1, 3] (A list that is already perfectly partitioned with evens first)

nums = [1, 2, 1, 2] (Alternating odd and even integers)

11. Two Sum in a Sorted List (Target Sum)
Problem Statement Explanation
Given a list of integers nums that is already sorted in non-decreasing (ascending) order, find two distinct numbers in the list that add up to a specific target number.

Return the indices of these two numbers as a tuple: (index1, index2). Assume that each input has exactly one unique solution, and you are not allowed to use the same element twice. If no matching pair exists (due to bad input bounds), return (None, None).

Examples
Example 1:

Input: nums = [2, 7, 11, 15], target = 9

Output: (0, 1)

Example 2:

Input: nums = [2, 3, 4], target = 6

Output: (0, 2)

Example 3:

Input: nums = [1, 2, 3], target = 10

Output: (None, None)

Critical Test Cases to Pass
nums = [-5, -3, -1, 2, 4], target = -4 (Target sum composed of negative sorted integers)

nums = [1, 2, 3, 3, 5], target = 6 (Target sum formed by two identical values at adjacent indices)

nums = [-10, 0, 10], target = 0 (Target sum matching exactly zero using values across the origin)

12. Container With Most WaterProblem Statement ExplanationGiven a list of non-negative integers height of length n, where each element represents the vertical height of a wall at coordinate index i, find two vertical lines that together with the x-axis form a container that holds the maximum volume of water.Container Volume: The volume of water trapped between two lines at indices left and right is limited by the shorter line and the horizontal distance between them. Return the maximum volume area of water the container can store. If height has a length less than 2, it cannot form a container; return 0.ExamplesExample 1:Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]Output: 49Example 2:Input: height = [1, 1]Output: 1Example 3:Input: height = [4]Output: 0Critical Test Cases to Passheight = [5, 4, 3, 2, 1] (Monotonically descending wall heights)height = [10, 1, 1, 1, 10] (Taller walls positioned at the extreme outer boundaries separated by low walls)height = [1, 2, 1, 2, 1, 2] (Repeated fluctuating heights forming internal valleys)

13. Maximum Subarray Sum (Kadane's Algorithm)
Problem Statement Explanation
Given a list of integers nums, find the contiguous subarray which has the largest sum and return its sum.

Contiguous Subarray: A connected, unbroken sequence of elements taken directly from inside the list without skipping any elements. For example, in [1, 2, 3, 4], [2, 3] is a contiguous subarray, but [1, 3] is not.

A single element can qualify as a valid subarray. If the list is completely empty, return 0.

Examples
Example 1:

Input: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

Output: 6 (The contiguous subarray with the largest sum is [4, -1, 2, 1])

Example 2:

Input: nums = [1]

Output: 1

Example 3:

Input: nums = []

Output: 0

Critical Test Cases to Pass
nums = [-2, -3, -1, -5] (A list containing exclusively negative numbers; must return the single highest negative number, not 0)

nums = [5, -2, 5] (A list containing a small negative bridge between two large positive numbers)

nums = [1, 2, 3, 4] (A list containing entirely positive integers)

14. Find All Subarrays of a List (Subarray Generation)
Problem Statement Explanation
Given a list of integers nums, find and generate every possible contiguous subarray that can be formed from the list. Return the result as a list of lists containing all the generated subarrays.

The individual subarrays can appear in any order in the output, but the interior elements of each individual subarray must preserve their original sequential placement. If the input list is empty, return an empty list [].

Examples
Example 1:

Input: nums = [1, 2, 3]

Output: [[1], [1, 2], [1, 2, 3], [2], [2, 3], [3]]

Example 2:

Input: nums = [4]

Output: [[4]]

Example 3:

Input: nums = []

Output: []

Critical Test Cases to Pass
nums = [1, 2, 3, 4] (Must generate exactly (N * (N + 1)) // 2 subarrays, which is 10 unique subarrays)

nums = [5, 5] (Handling duplicate elements correctly; the subarrays generated are separate items based on index coordinates: [[5], [5, 5], [5]])

nums = [] (Empty list boundary condition)

15. Maximum Sum Subarray of Fixed Size k
Problem Statement Explanation
Given a list of integers nums and a positive integer k, calculate the maximum possible sum of any contiguous subarray that has a fixed size equal to exactly k.

Fixed Size Window: The subarray must contain exactly k items. If the total length of the input list nums is strictly less than k, it is impossible to form a window of the required size; in this case, return 0.

Examples
Example 1:

Input: nums = [2, 1, 5, 1, 3, 2], k = 3

Output: 9 (The subarray [5, 1, 3] has the maximum sum of 9)

Example 2:

Input: nums = [2, 3, 4, 1, 5], k = 2

Output: 7 (The subarray [3, 4] has the maximum sum of 7)

Example 3:

Input: nums = [1, 2], k = 4

Output: 0

Critical Test Cases to Pass
nums = [1, 2, 3], k = 3 (k is exactly equal to the length of the list)

nums = [-1, 4, -2, 3, -5], k = 2 (Window spans across alternating positive and negative values)

nums = [0, 0, 0, 0], k = 2 (A list containing entirely zeroes)

16. Minimum Size Subarray Sum (Variable Window Size)
Problem Statement Explanation
Given a list of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray whose sum is greater than or equal to target.

Variable Window Size: The length of the subarray is dynamic. You are looking for the shortest possible span of elements that satisfies the target condition.

If no such contiguous subarray exists within the list, return 0 instead.

Examples
Example 1:

Input: target = 7, nums = [2, 3, 1, 2, 4, 3]

Output: 2 (The shortest subarray meeting the condition is [4, 3] with a length of 2)

Example 2:

Input: target = 4, nums = [1, 4, 4]

Output: 1 (The single element [4] meets the condition instantly)

Example 3:

Input: target = 100, nums = [1, 2, 3]

Output: 0 (No subarray can sum up to 100)

Critical Test Cases to Pass
nums = [1, 2, 10, 3], target = 10 (A single element exactly matches the target value mid-list)

nums = [5], target = 5 (A single-element list that meets the target value exactly)

nums = [1, 1, 1, 1, 1, 5], target = 5 (A large number at the very end of a list of small numbers)

17. Product of List Except Self
Problem Statement Explanation
Given a list of integers nums, return an output list answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

Product Except Self: For an element at index i, its output value is the combined product of all numbers appearing before it (Prefix Product) multiplied by all numbers appearing after it (Suffix Product).

Constraint: You must solve this without using the division operator / or //. If the list contains only 1 element, it has no outer items to multiply; return [1]. If the list is empty, return [].

Examples
Example 1:

Input: nums = [1, 2, 3, 4]

Output: [24, 12, 8, 6]

Example 2:

Input: nums = [-1, 1, 0, -3, 3]

Output: [0, 0, 9, 0, 0]

Example 3:

Input: nums = []

Output: []

Critical Test Cases to Pass
nums = [4, 5, 0, 2] (A list containing exactly one zero element)

nums = [0, 2, 3, 0] (A list containing multiple zero elements)

nums = [-1, -2, -3] (A list containing negative values that flip signs based on position)

18. Majority ElementProblem Statement ExplanationGiven a list of integers nums of size n, find and return the majority element.Majority Element: The specific element that appears more than n // 2 times in the list. The problem guarantees that a majority element always exists in the input list.Your algorithm must find this element using constant $O(1)$ extra space, meaning you cannot duplicate the list or allocate structural counters.ExamplesExample 1:Input: nums = [3, 2, 3]Output: 3Example 2:Input: nums = [2, 2, 1, 1, 1, 2, 2]Output: 2Example 3:Input: nums = [7]Output: 7Critical Test Cases to Passnums = [1, 2, 1, 2, 1, 2, 1] (An alternating sequence where the majority element wins by exactly one occurrence)nums = [4, 4, 4, 1, 2] (The majority element is clustered entirely at the front of the list)nums = [1, 1, 2, 2, 2] (The majority element is clustered entirely at the back of the list)

19. Sort an Array of 0s, 1s, and 2s (Dutch National Flag)Problem Statement ExplanationAn unsorted list nums contains only three types of integer elements: 0, 1, and 2. Rearrange this list in-place so that all elements are sorted in ascending order (all 0s first, followed by all 1s, and ending with all 2s).Partitioning: You must sort the list in a single pass over the elements using constant $O(1)$ extra space. You are not allowed to use Python's built-in .sort() function or count the frequencies to rebuild the list.ExamplesExample 1:Input: nums = [2, 0, 2, 1, 1, 0]Output: nums becomes [0, 0, 1, 1, 2, 2]Example 2:Input: nums = [2, 0, 1]Output: nums becomes [0, 1, 2]Example 3:Input: nums = [1]Output: nums becomes [1]Critical Test Cases to Passnums = [1, 1, 1] (A list containing only one of the three numbers)nums = [2, 0, 0, 2] (A list where one of the middle numbers, 1, is completely missing)nums = [2, 1, 0] (A list that is initially arranged in completely reversed order)

20. Next Permutation of a List
Problem Statement Explanation
Given a list of integers nums, rearrange the numbers into the lexicographically next greater permutation of numbers.

Lexicographical Order: The dictionary order of numbers. For example, the permutations of [1,2,3] sorted in increasing order are [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], and [3,2,1].

The rearrangement must be done in-place using constant extra memory. If no greater permutation can be formed because the list is already in its maximum possible sorted state (strictly descending order), rearrange the list into its lowest possible lexicographical order (sorted completely in ascending order).

Examples
Example 1:

Input: nums = [1, 2, 3]

Output: nums becomes [1, 3, 2]

Example 2:

Input: nums = [3, 2, 1]

Output: nums becomes [1, 2, 3]

Example 3:

Input: nums = [1, 1, 5]

Output: nums becomes [1, 5, 1]

Critical Test Cases to Pass
nums = [1, 5, 1] (Handling duplicate elements correctly during pivot search)

nums = [2, 3, 1] (The pivot point requiring modification is located at the very first index)

nums = [1, 3, 2] (Requires finding the next structural step where values change columns across multiple trailing elements)

21. Trapping Rain WaterProblem Statement ExplanationGiven a list of non-negative integers height where each element represents the height of a vertical bar on a structural grid map (width of each bar is 1), calculate the total units of water that can be trapped within the valleys after a rainstorm.Elevation Trapping: Water is trapped on top of a bar at index i only if there are higher bars blocking it on both its far left and far right sides. The level of water trapped at index i is determined by:$$\text{Water Level} = \min(\text{Max Left Height}, \text{Max Right Height}) - \text{height[i]}$$Return the total accumulation value. If the list contains fewer than 3 bars, it cannot form a valley; return 0.ExamplesExample 1:Input: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]Output: 6Example 2:Input: height = [4, 2, 0, 3, 2, 5]Output: 9Example 3:Input: height = [1, 2]Output: 0Critical Test Cases to Passheight = [1, 2, 3, 4, 5] (A list representing a continuous, upward staircase structure where no water can be trapped)height = [5, 4, 3, 2, 1] (A list representing a continuous, downward staircase structure where no water can be trapped)height = [3, 0, 3] (A simple, single symmetric valley formed by two high outer bounds and a deep center)

22. Merge Sorted Lists In-Place
Problem Statement Explanation
You are given two integer lists, nums1 and nums2, both sorted in non-decreasing (ascending) order. You are also given two integers, m and n, representing the exact number of elements that should be merged from nums1 and nums2 respectively.

Merge nums2 directly into nums1 so that the combined elements form a single sorted list inside nums1.

Constraint: To hold the incoming numbers, nums1 has an expanded total structural length of m + n. The first m elements denote the numbers that should be merged, and the last n positions are initialized to 0 as empty space placeholders. You must modify nums1 in-place without using a second list.

Examples
Example 1:

Input: nums1 = [1, 2, 3, 0, 0, 0], m = 3, nums2 = [2, 5, 6], n = 3

Output: nums1 becomes [1, 2, 2, 3, 5, 6]

Example 2:

Input: nums1 = [0], m = 0, nums2 = [1], n = 1

Output: nums1 becomes [1]

Example 3:

Input: nums1 = [2, 0], m = 1, nums2 = [1], n = 1

Output: nums1 becomes [1, 2]

Critical Test Cases to Pass
nums1 = [4, 5, 6, 0, 0, 0], m = 3; nums2 = [1, 2, 3], n = 3 (All elements in nums2 are strictly smaller than all elements in nums1)

nums1 = [1, 2, 3, 0, 0, 0], m = 3; nums2 = [4, 5, 6], n = 3 (All elements in nums2 are strictly larger than all elements in nums1)

nums1 = [0], m = 0; nums2 = [1], n = 1 (The active portion of nums1 is completely empty)

23. Interval List IntersectionsProblem Statement ExplanationGiven two lists of closed intervals, firstList and secondList, where each individual interval is represented as a pair [start, end]. Each list contains intervals that are already sorted in ascending order by their start times and do not overlap with other intervals in the same list.Find and return the intersection of these two interval lists.Interval Intersection: A closed interval [a, b] (with $a \le b$) represents the set of real numbers from $a$ to $b$. The intersection of two intervals is the set of points that are common to both intervals (e.g., the intersection of [1, 4] and [3, 6] is [3, 4]).Return the overlapping pairs as a list of lists. If there is no overlap at all, return an empty list [].ExamplesExample 1:Input: firstList = [[0, 2], [5, 10], [13, 23], [24, 25]], secondList = [[1, 5], [8, 12], [15, 24], [25, 26]]Output: [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]Example 2:Input: firstList = [[1, 3]], secondList = []Output: []Example 3:Input: firstList = [[1, 10]], secondList = [[3, 5], [6, 8]]Output: [[3, 5], [6, 8]]Critical Test Cases to PassfirstList = [[1, 5]], secondList = [[5, 10]] (Intervals meet at exactly one singular touching point; must yield [[5, 5]])firstList = [[1, 10]], secondList = [[2, 3]] (One massive interval completely encloses a tiny internal interval)firstList = [], secondList = [] (Both interval lists are completely empty)

24. Rotate Matrix 90 Degrees Clockwise In-Place
Problem Statement Explanation
You are given an n x n 2D matrix represented as a nested list of lists, where matrix[i][j] represents the element at row i and column j. Rotate the entire grid image by 90 degrees in a clockwise direction.

In-Place Transformation: You must modify the 2D list directly within its allocated memory structure. You are not allowed to create or allocate a new second matrix to map the coordinates.

Examples
Example 1:

Input: matrix = [[1, 2], [3, 4]]

Output: matrix becomes [[3, 1], [4, 2]]

Example 2:

Input: matrix = [[5, 1, 9], [2, 4, 8], [13, 3, 6]]

Output: matrix becomes [[13, 2, 5], [3, 4, 1], [6, 8, 9]]

Example 3:

Input: matrix = [[1]]

Output: matrix becomes [[1]]

Critical Test Cases to Pass
matrix = [[1]] (A 1x1 minimal matrix boundary case)

matrix = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]] (An even-dimensioned 4x4 grid testing nested boundary layer coordinates)

A matrix where elements along the primary diagonal are completely identical (e.g., matrix[i][i] == 5 for all i), ensuring structural transposition checks do not stall.

25. Spiral Matrix Traversal
Problem Statement Explanation
Given an m x n matrix (a nested list containing m rows and n columns), return a flat 1D list containing all the elements of the matrix ordered by a spiral traversal path.

Spiral Order: Reading elements by starting from the top-left corner (0,0), moving horizontally across the first row to the right edge, turning downward along the final column to the bottom edge, turning left across the bottom row, and climbing back up the first column. This outer loop boundary then shrinks inward layer by layer until every coordinate is visited exactly once.

If the matrix is empty, return an empty list [].

Examples
Example 1:

Input: matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

Output: [1, 2, 3, 6, 9, 8, 7, 4, 5]

Example 2:

Input: matrix = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]

Output: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]

Example 3:

Input: matrix = []

Output: []

Critical Test Cases to Pass
matrix = [[1, 2, 3, 4]] (A single-row matrix layout; must terminate right after reading left-to-right without performing invalid reverse loops)

matrix = [[1], [2], [3]] (A single-column matrix layout; must move directly down without processing width loops)

matrix = [[1, 2], [3, 4]] (A simple square matrix grid)

26. Set Matrix ZeroesProblem Statement ExplanationGiven an m x n integer matrix, if any element inside the grid is originally equal to 0, modify the matrix in-place so that its entire corresponding row and entire corresponding column are completely filled with 0s.In-Place Flagging: You must solve this with a constant $O(1)$ extra space footprint. You cannot maintain a separate copy of the matrix or use separate tracking lists of size m or n to mark row/column states. Instead, you must utilize the matrix's own first row and first column as interior status indicators.ExamplesExample 1:Input: matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]Output: matrix becomes [[1, 0, 1], [0, 0, 0], [1, 0, 1]]Example 2:Input: matrix = [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]Output: matrix becomes [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]]Example 3:Input: matrix = [[1, 2], [3, 4]]Output: matrix becomes [[1, 2], [3, 4]]Critical Test Cases to Passmatrix = [[0, 1]] or matrix = [[1], [0]] (Grids containing zeroes inside the tracking header rows/columns initially)matrix = [[0, 0], [0, 0]] (Matrices containing exclusively zeroes)matrix = [[1, 2, 3], [4, 0, 5], [6, 7, 8]] (Zero located precisely at the exact geometric center of an odd-dimensioned grid)

27. Standard Binary Search ImplementationProblem Statement ExplanationGiven a list of integers nums which is sorted in non-decreasing (ascending) order, and an integer target, search for target inside the list.If the target exists within the collection, return its corresponding index position. If the target is not present in the list, return -1.Your algorithm must search for the target using a logarithmic range reduction strategy, meaning the search space must be cut in half at each comparative step to achieve an optimal time complexity of $O(\log N)$ instead of checking elements sequentially.ExamplesExample 1:Input: nums = [-1, 0, 3, 5, 9, 12], target = 9Output: 4Example 2:Input: nums = [-1, 0, 3, 5, 9, 12], target = 2Output: -1Example 3:Input: nums = [], target = 5Output: -1Critical Test Cases to Passnums = [5], target = 5 (A single-element list where the target is located exactly at index 0)nums = [1, 3], target = 3 (A minimal two-element list boundary check ensuring floor truncation logic does not loop infinitely)nums = [10, 20, 30, 40], target = 10 or target = 40 (Target elements located precisely at the absolute outer boundaries of the list)

28. Find Peak ElementProblem Statement ExplanationA peak element in a list is an element that is strictly greater than its immediate neighbors. Given an unsorted integer list nums, find a peak element and return its index position.Boundary Assumptions: You may imagine that the elements outside the boundary limits of the list act as negative infinity. This means that if an element is at the very front or very back of the list, it only needs to be strictly greater than its single interior neighbor to qualify as a peak.If the list contains multiple peak elements, returning the index position of any of the peaks is considered correct. Your solution must run within an optimal time complexity constraint of $O(\log N)$.ExamplesExample 1:Input: nums = [1, 2, 3, 1]Output: 2 (The value at index 2 is 3, which is greater than its neighbors 2 and 1)Example 2:Input: nums = [1, 2, 1, 3, 5, 6, 4]Output: 5 (The value at index 5 is 6, which is greater than its neighbors 5 and 4)Example 3:Input: nums = [1]Output: 0 (A single element qualifies as a peak by default)Critical Test Cases to Passnums = [1, 2, 3, 4] (A list sorted in strictly increasing order; the final element must be identified as the peak)nums = [4, 3, 2, 1] (A list sorted in strictly decreasing order; the first element must be identified as the peak)nums = [2, 1, 2] (Multiple valid peaks exist across internal dips)

29. Search in Rotated Sorted ListProblem Statement ExplanationAn integer list nums is initially sorted in strictly ascending order with completely unique values. Prior to being passed to your function, the list is rotated at an unknown pivot index k ($1 \le k < \text{len(nums)}$) such that the resulting array shifts its structural segments (e.g., [0,1,2,4,5,6,7] might become [4,5,6,7,0,1,2]).Given the rotated list nums and an integer target, return the index of the target if it is present in the list, or -1 if it cannot be found.Your algorithm must search for the target element within an optimal time complexity layout of $O(\log N)$.ExamplesExample 1:Input: nums = [4, 5, 6, 7, 0, 1, 2], target = 0Output: 4Example 2:Input: nums = [4, 5, 6, 7, 0, 1, 2], target = 3Output: -1Example 3:Input: nums = [1], target = 0Output: -1Critical Test Cases to Passnums = [3, 1], target = 1 (A small two-element rotated list where the targeted element is situated on the lower sub-segment)nums = [5, 1, 3], target = 5 (The targeted value is located exactly at index 0, functioning as the peak of the high sub-segment)nums = [4, 5, 6, 1, 2, 3], target = 4 or target = 3 (Target values positioned at the extreme outer edge elements of a rotated system)

30. Next Greater Element
Problem Statement Explanation
Given a list of integers nums, find and return a new list answer of the exact same length, where answer[i] represents the next greater element for nums[i].

Next Greater Element: The first element located to the strict right of index i that has a value larger than nums[i]. If no such element exists because you hit the right boundary or all subsequent numbers are smaller, the value for that position must be recorded as -1.

Examples
Example 1:

Input: nums = [1, 3, 4, 2]

Output: [3, 4, -1, -1]

Example 2:

Input: nums = [6, 5, 4, 3, 2, 1]

Output: [-1, -1, -1, -1, -1, -1]

Example 3:

Input: nums = [2, 1, 5]

Output: [5, 5, -1]

Critical Test Cases to Pass
nums = [1, 2, 3, 4, 5] (A list sorted in strictly increasing order, where every single element except the last maps to its immediate right neighbor)

nums = [5, 4, 3, 2, 10] (A long descending run terminated by a massive value at the very end that resolves the entire sequence)

nums = [] (An empty list boundary case, which must return an empty list [])

31. Daily Temperatures (Monotonic Decreasing Property)
Problem Statement Explanation
Given a list of integers temperatures representing the daily temperature records, compute and return a list answer where answer[i] is the exact number of days you would have to wait after index i to get a warmer temperature.

Lookup Offsets: You must calculate the index distance index difference (j - i) rather than recording the raw temperature value itself. If there is no future day for which this condition is met, record 0 for that position instead.

Examples
Example 1:

Input: temperatures = [73, 74, 75, 71, 69, 72, 76, 73]

Output: [1, 1, 4, 2, 1, 1, 0, 0]

Example 2:

Input: temperatures = [30, 40, 50, 60]

Output: [1, 1, 1, 0]

Example 3:

Input: temperatures = [30, 30, 25]

Output: [0, 0, 0]

Critical Test Cases to Pass
temperatures = [89, 89, 89] (A sequence of identical temperatures; since it requires a strictly warmer day, they must all resolve to 0)

temperatures = [50, 40, 30, 60] (A multi-day drop that is completely broken and resolved by a single massive jump at the end)

temperatures = [40] (A single-element list boundary case, returning [0])

32. Largest Rectangle in HistogramProblem Statement ExplanationGiven a list of non-negative integers heights where each element represents the height of a bar in a histogram chart layout (where the horizontal width of each individual bar is exactly 1), find the largest rectangular area that can be formed within the boundaries of the histogram.Bounding Rectangle Volume: The maximum area of a rectangle spanning from index left to index right is restricted by the absolute shortest bar contained within that span multiplied by the total wide index distance:$$\text{Area} = \min(\text{heights[left \dots right]}) \times (\text{right} - \text{left} + 1)$$Return the maximum calculated area value. If the list is empty, return 0.ExamplesExample 1:Input: heights = [2, 1, 5, 6, 2, 3]Output: 10 (The largest rectangle is formed by the bars 5 and 6 with a width of 2, yielding an area of $5 \times 2 = 10$)Example 2:Input: heights = [2, 4]Output: 4Example 3:Input: heights = []Output: 0Critical Test Cases to Passheights = [1, 2, 3, 4, 5] (A continuous upward-sloping staircase structure where wide-low areas compete directly against deep-narrow ones)heights = [0, 0, 0] (A list containing exclusively zero-height bars, which must return 0)heights = [11, 11, 11] (A list containing uniform heights, where the maximum area is the full length multiplied by the shared height)
