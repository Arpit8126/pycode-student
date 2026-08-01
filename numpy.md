1. Continuous Integer Array Generation
Problem Statement Explanation
Given a single positive integer n, generate a one-dimensional (1D) array that holds a sequential range of whole numbers. The sequence must begin exactly at 0 and step upward by 1 for each subsequent position, containing a total of exactly n elements.

If the input n is 0 or a negative value, it is impossible to establish a sequence; the system must return an empty array with no elements.

Examples
Example 1:

Input: n = 5

Output: array([0, 1, 2, 3, 4])

Example 2:

Input: n = 3

Output: array([0, 1, 2])

Example 3:

Input: n = 0

Output: array([])

Critical Test Cases to Pass
Input: n = 1

Expected Output: array([0])

Input: n = -10

Expected Output: array([])

Input: n = 7

Expected Output: array([0, 1, 2, 3, 4, 5, 6])

2. Floating-Point Grid Generation with Fixed Steps
Problem Statement Explanation
Given three parameters—a starting value start, a boundary value stop, and a step size step—generate a 1D array of fractional (floating-point) numbers. The array must begin exactly at the start value, and each subsequent element must be exactly step units greater than the one before it. The sequence continues generating values as long as they are strictly less than the stop boundary. The stop value itself must be excluded from the final array.

Examples
Example 1:

Input: start = 0.0, stop = 2.0, step = 0.5

Output: array([0. , 0.5, 1. , 1.5])

Example 2:

Input: start = 1.0, stop = 1.6, step = 0.2

Output: array([1. , 1.2, 1.4])

Example 3:

Input: start = 5.0, stop = 5.0, step = 0.1

Output: array([])

Critical Test Cases to Pass
Input: start = 0.0, stop = 0.3, step = 0.1

Expected Output: array([0.0, 0.1, 0.2])

Input: start = 10.0, stop = 10.05, step = 0.1

Expected Output: array([10.0])

Input: start = 0.0, stop = -5.0, step = 1.0

Expected Output: array([])

3. Linearly Spaced Interval Anchoring
Problem Statement Explanation
Given three parameters—a mandatory starting value start, a mandatory terminating value stop, and a total count num—generate a 1D array containing exactly num elements. The values inside the array must be automatically calculated so that they are spaced completely evenly across the entire stretch from start to stop.

Unlike step-based generation, both the start and stop values must be present in the array as the absolute first and absolute last elements respectively.

Examples
Example 1:

Input: start = 0, stop = 10, num = 5

Output: array([ 0. ,  2.5,  5. ,  7.5, 10. ])

Example 2:

Input: start = 0, stop = 1, num = 2

Output: array([0., 1.])

Example 3:

Input: start = 5, stop = 5, num = 4

Output: array([5., 5., 5., 5.])

Critical Test Cases to Pass
Input: start = 10, stop = 0, num = 3

Expected Output: array([10.,  5.,  0.])

Input: start = -1, stop = 1, num = 5

Expected Output: array([-1. , -0.5,  0. ,  0.5,  1. ])

Input: start = 0, stop = 100, num = 1

Expected Output: array([0.])

4. Zero-Filled Structure Instantiation
Problem Statement Explanation
Given two integer parameters, rows and cols, create a two-dimensional (2D) grid layout (a matrix) matching these dimensions. Every single coordinate position within this grid must be populated exclusively with the fractional value 0.0 (floating-point zero).

If either rows or cols is less than or equal to 0, return an empty array layout.

Examples
Example 1:

Input: rows = 3, cols = 2

Output:

array([[0., 0.],
       [0., 0.],
       [0., 0.]])
Example 2:

Input: rows = 1, cols = 4

Output: array([[0., 0., 0., 0.]])

Example 3:

Input: rows = 0, cols = 5

Output: array([])

Critical Test Cases to Pass
Input: rows = 1, cols = 1

Expected Output: array([[0.]])

Input: rows = -2, cols = 3

Expected Output: array([])

Input: rows = 2, cols = 3

Expected Output:

array([[0., 0., 0.],
       [0., 0., 0.]])
5. Constant-Value Broadcasting Arrays
Problem Statement Explanation
Given a tuple structural shape (rows, cols) and a specific scalar value fill_value, initialize a 2D matrix matching the given dimensions where every single cell across all columns and rows contains exactly the fill_value. The data type of the matrix elements must adapt to match the data type of the provided fill_value.

Examples
Example 1:

Input: shape = (2, 3), fill_value = 7

Output:

array([[7, 7, 7],
       [7, 7, 7]])
Example 2:

Input: shape = (3, 1), fill_value = 3.14

Output:

array([[3.14],
       [3.14],
       [3.14]])
Example 3:

Input: shape = (0, 2), fill_value = 9

Output: array([])

Critical Test Cases to Pass
Input: shape = (1, 2), fill_value = -1

Expected Output: array([[-1, -1]])

Input: shape = (2, 2), fill_value = 0

Expected Output:

array([[0, 0],
       [0, 0]])
6. Square Identity Matrix Mapping
Problem Statement Explanation
Given a single integer n, generate a perfectly square 2D grid matrix containing exactly n rows and n columns. The internal layout of this matrix must adhere to a strict structural design: every cell whose row coordinate matches its column coordinate (the main diagonal running from the top-left corner to the bottom-right corner) must contain the value 1.0. Every other cell outside this diagonal line must contain 0.0.

Examples
Example 1:

Input: n = 3

Output:

array([[1., 0., 0.],
       [0., 1., 0.],
       [0., 0., 1.]])
Example 2:

Input: n = 2

Output:

array([[1., 0.],
       [0., 1.]])
Example 3:

Input: n = 0

Output: array([])

Critical Test Cases to Pass
Input: n = 1

Expected Output: array([[1.]])

Input: n = -4

Expected Output: array([])

Input: n = 4

Expected Output:

array([[1., 0., 0., 0.],
       [0., 1., 0., 0.],
       [0., 0., 1., 0.],
       [0., 0., 0., 1.]])
7. Step-Based Diagonal Shift Matrix Mapping
Problem Statement Explanation
Given a square dimension size n and an integer offset tracker k, construct an n x n 2D matrix grid. Instead of placing a line of 1.0 values down the absolute center diagonal, you must shift the diagonal path based on k:

If k = 0, the 1.0 values fill the central main diagonal.

If k is a positive number, the line of 1.0 values shifts upward into the upper columns by k steps.

If k is a negative number, the line of 1.0 values shifts downward into the lower rows by k steps.
All other cells remaining in the grid must equal 0.0.

Examples
Example 1:

Input: n = 3, k = 1

Output:

array([[0., 1., 0.],
       [0., 0., 1.],
       [0., 0., 0.]])
Example 2:

Input: n = 3, k = -1

Output:

array([[0., 0., 0.],
       [1., 0., 0.],
       [0., 1., 0.]])
Example 3:

Input: n = 2, k = 0

Output:

array([[1., 0.],
       [0., 1.]])
Critical Test Cases to Pass
Input: n = 3, k = 2

Expected Output:

array([[0., 0., 1.],
       [0., 0., 0.],
       [0., 0., 0.]])
Input: n = 2, k = -5

Expected Output:

array([[0., 0.],
       [0., 0.]])
8. Uniform Random Float Matrix Generation
Problem Statement Explanation
Given two parameters, rows and cols, initialize a 2D matrix structure matching these dimensions populated entirely with randomized fractional values. Every generated number must fall within a strict mathematical interval: greater than or equal to 0.0, and strictly less than 1.0. The randomization must be uniform, meaning every possible value within that interval has an equal probability of being selected.

Examples
Example 1:

Input: rows = 2, cols = 2

Output: (A 2x2 grid containing arbitrary decimals between 0.0 and 1.0, e.g.)

array([[0.12345678, 0.87654321],
       [0.45678901, 0.23456789]])
Example 2:

Input: rows = 0, cols = 3

Output: array([])

Critical Test Cases to Pass
Input: rows = 1, cols = 3 -> Expected Output: A 1D-row matrix layout containing 3 random values between 0.0 and 1.0.

All elements x in the output grid must strictly satisfy the boundary condition: 0.0 <= x < 1.0.

9. Random Integer Bound Sampling Matrices
Problem Statement Explanation
Given a lower integer limit low, an upper integer limit high, and a structural layout shape tuple (rows, cols), generate a 2D matrix filled entirely with random whole numbers. Each generated number must fall within the range defined by the bounds: it can be as low as low (inclusive), but it must be strictly less than high (exclusive).

Examples
Example 1:

Input: low = 1, high = 7, shape = (2, 3)

Output: (A 2x3 matrix containing random whole numbers from 1 to 6, e.g.)

array([[3, 6, 1],
       [5, 2, 4]])
Example 2:

Input: low = 10, high = 11, shape = (2, 2)

Output: (Since 11 is excluded, all cells must equal 10)

array([[10, 10],
       [10, 10]])
Critical Test Cases to Pass
Input: low = -5, high = 0, shape = (1, 4) -> Expected Output: A 1x4 matrix filled with random negative values chosen from [-5, -4, -3, -2, -1].

All elements x in the output matrix must strictly satisfy the boundary condition: low <= x < high.

10. Standard Normal Distribution Tensor Sampling
Problem Statement Explanation
Given two integers, rows and cols, generate a 2D matrix structure populated with random floating-point values sampled directly from a standard normal distribution (a Gaussian bell curve). The values must be distributed symmetrically such that the mathematical mean of an infinitely large sample size would equal exactly 0.0, and its standard deviation variance footprint would equal exactly 1.0.

Examples
Example 1:

Input: rows = 2, cols = 3

Output: (A 2x3 matrix containing floating-point numbers clustered around 0.0, e.g.)

array([[-0.453214,  1.204325, -0.094321],
       [ 0.765412, -1.890432,  0.321456]])
Critical Test Cases to Pass
Input: rows = 1, cols = 1 -> Expected Output: A single-element matrix [[x]] holding a normal distribution sample.

The values generated are unbound, but statistically, the majority of values must fall within the standard range of -3.0 to 3.0.

11. Array Shape and Data Type Inspection
Problem Statement Explanation
Given an arbitrary multidimensional array arr, inspect its metadata structural properties. You must determine two core aspects of the array: its exact structural shape layout (represented as a tuple of integers indicating the size along each dimension) and its internal numeric data storage type.

Return these structural properties combined as a standard Python tuple format: (shape_tuple, data_type).

Examples
Example 1:

Input: An array initialized from [[1, 2, 3], [4, 5, 6]] containing standard whole numbers.

Output: ((2, 3), dtype('int64')) (Note: The precise integer precision bits like 32 or 64 may vary depending on the platform architecture)

Example 2:

Input: An array initialized from [1.5, 2.7, 3.9] containing fractional values.

Output: ((3,), dtype('float64'))

Example 3:

Input: An empty array with no elements.

Output: ((0,), dtype('float64'))

Critical Test Cases to Pass
Input: An array initialized from [[[1, 2]], [[3, 4]]]

Expected Output: ((2, 1, 2), dtype('int64'))

Input: An array initialized from [[0.0]]

Expected Output: ((1, 1), dtype('float64'))

12. Flat Array Dimensional Stretching
Problem Statement Explanation
Given a one-dimensional (1D) array arr containing exactly 12 elements, stretch its spatial organization out into a two-dimensional (2D) grid matrix containing exactly 3 rows and 4 columns.

The underlying numeric data sequence must be preserved exactly as it was originally ordered, reading from left to right across the columns of the first row, then moving down to populate the columns of the next rows sequentially.

Examples
Example 1:

Input: arr = array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

Output:

array([[ 1,  2,  3,  4],
       [ 5,  6,  7,  8],
       [ 9, 10, 11, 12]])
Example 2:

Input: arr = array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

Output:

array([[0, 0, 0, 0],
       [0, 0, 0, 0],
       [0, 0, 0, 0]])
Critical Test Cases to Pass
Input: arr = array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120])

Expected Output:


array([[ 10,  20,  30,  40],
       [ 50,  60,  70,  80],
       [ 90, 100, 110, 120]])
13. Matrix Flattening Traversal
Problem Statement Explanation
Given a multi-dimensional 2D matrix array matrix, collapse its row and column structural layers completely down into a single flat 1D sequence of numbers.

The transformation must collapse the elements row-by-row: it must capture all elements of the first row from left to right, immediately followed by all elements of the second row from left to right, continuing this sequence until the final element of the last row is reached.

Examples
Example 1:

Input:

matrix = array([[1, 2],
                [3, 4]])
Output: array([1, 2, 3, 4])

Example 2:

Input:

matrix = array([[5, 6, 7],
                [8, 9, 10]])
Output: array([5, 6, 7, 8, 9, 10])

Example 3:

Input: matrix = array([[]])

Output: array([])

Critical Test Cases to Pass
Input: matrix = array([[100]])

Expected Output: array([100])

Input:
text matrix = array([[1, 2, 3, 4]]) 

Expected Output: array([1, 2, 3, 4])

14. Multi-Dimensional Array Transposition
Problem Statement Explanation
Given a 2D matrix array matrix with m rows and n columns, swap its geometric axes completely. This means the layout must be flipped over its main diagonal axis so that every row from the original matrix transforms into a column in the new matrix, and every column transforms into a row.

The resulting output will be a newly structured matrix layout containing exactly n rows and m columns.

Examples
Example 1:

Input:

matrix = array([[1, 2, 3],
                [4, 5, 6]])
Output:

Plaintext
array([[1, 4],
       [2, 5],
       [3, 6]])
Example 2:

Input:

matrix = array([[1, 2],
                [3, 4]])
Output:

array([[1, 3],
       [2, 4]])
Critical Test Cases to Pass
Input: matrix = array([[5]])

Expected Output: array([[5]])

Input: matrix = array([[1, 2, 3, 4]])

Expected Output:

array([[1],
       [2],
       [3],
       [4]])
15. Automatic Dimension Deduction
Problem Statement Explanation
Given a flat 1D array arr containing an arbitrary number of total elements, and a fixed target row count r, restructure the array into a 2D matrix.

You are only provided with the required number of rows r; the system must automatically calculate and deduce the matching number of columns needed based on the total element count of arr so that all elements fit into a perfectly balanced rectangular grid.

Examples
Example 1:

Input: arr = array([1, 2, 3, 4, 5, 6, 7, 8]), r = 2

Output: (The system automatically deduces 4 columns are required)

array([[1, 2, 3, 4],
       [5, 6, 7, 8]])
Example 2:

Input: arr = array([10, 20, 30]), r = 3

Output: (The system automatically deduces 1 column is required)

array([[10],
       [20],
       [30]])
Critical Test Cases to Pass
Input: arr = array([1, 2, 3, 4, 5, 6]), r = 1

Expected Output: array([[1, 2, 3, 4, 5, 6]])

Input: arr = array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), r = 5

Expected Output:

array([[ 1,  2],
       [ 3,  4],
       [ 5,  6],
       [ 7,  8],
       [ 9, 10]])
16. Tensor Dimension Expansion
Problem Statement Explanation
Given a 1D array arr of size n, alter its dimensional complexity by inserting an entirely new, single auxiliary dimension axis. You must generate two structural variations of this expansion:

Transform it into a 2D column-like vector matrix with the shape layout (n, 1).

Transform it into a 2D row-like vector matrix with the shape layout (1, n).

Return both structural formats contained together inside a tuple: (column_vector, row_vector).

Examples
Example 1:

Input: arr = array([5, 10, 15])

Output:

(array([[ 5],
        [10],
        [15]]), 
 array([[ 5, 10, 15]]))
Critical Test Cases to Pass
Input: arr = array([1])

Expected Output: (array([[1]]), array([[1]]))

Input: arr = array([0, -1])

Expected Output:

(array([[ 0],
        [-1]]), 
 array([[ 0, -1]]))
17. Redundant Singleton Dimension Squeezing
Problem Statement Explanation
Given a multidimensional array arr containing redundant singleton dimensions (dimensions whose structural capacity size equals exactly 1, such as a shape of (1, 5, 1) or (1, 3)), compress its dimensionality.

The transformation must completely remove all single-length dimensions from the shape metadata, collapsing the structure down to only its active, meaningful dimensions while leaving the internal data values untouched.

Examples
Example 1:

Input: An array containing the elements [[1, 2, 3]] with an active shape property layout of (1, 3).

Output: array([1, 2, 3]) (The empty row wrapping is stripped, resulting in a flat shape layout of (3,))

Example 2:

Input: An array containing the single element [[[10]]] with a shape property layout of (1, 1, 1).

Output: array(10) (A zero-dimensional scalar value array)

Critical Test Cases to Pass
Input: An array with shape (2, 1, 2) initialized from [[[1, 2]], [[3, 4]]]

Expected Output: An array with shape layout (2, 2) containing [[1, 2], [3, 4]].

18. Array Deep Copying vs Memory View Splitting
Problem Statement Explanation
Given a master matrix array matrix, isolate a standalone duplicate copy of the dataset.

In low-level numerical computing, extraction operations often create temporary shared memory references (views) that point back to the original database. You must create a completely decoupled, independent array replica so that any subsequent modifications or cell rewrites performed on the new array copy have absolutely no impact on the original values stored within matrix.

Examples
Example 1:

Input: matrix = array([[1, 2], [3, 4]])

Output: An identical matrix structure array([[1, 2], [3, 4]]) that is decoupled in system memory.

Critical Test Cases to Pass
Input: matrix = array([[9, 9, 9]])

Expected Output: An identical decoupled matrix layout array([[9, 9, 9]]).

Verification: Changing cell [0,0] to 0 in the output must leave the input matrix equal to 9.

19. 1D Interval Element Extraction
Problem Statement Explanation
Given a one-dimensional (1D) array arr containing a list of numeric values, extract a specific contiguous subsection. The extraction window is defined by a starting index boundary start and an ending index boundary stop.

The final extracted array must contain all elements beginning precisely at the start position up to, but strictly excluding, the element located at the stop position. If start is greater than or equal to stop, an empty array layout must be returned.

Examples
Example 1:

Input: arr = array([10, 20, 30, 40, 50]), start = 1, stop = 4

Output: array([20, 30, 40])

Example 2:

Input: arr = array([5, 6, 7]), start = 0, stop = 1

Output: array([5])

Example 3:

Input: arr = array([1, 2, 3]), start = 2, stop = 2

Output: array([])

Critical Test Cases to Pass
Input: arr = array([1, 2, 3, 4, 5]), start = 0, stop = 5

Expected Output: array([1, 2, 3, 4, 5])

Input: arr = array([10, 20]), start = 3, stop = 5

Expected Output: array([])

20. Reverse Sorting Elements via Index Stepping
Problem Statement Explanation
Given a 1D array arr, create a newly ordered array containing the exact same elements but with their sequential positions completely inverted. The character sequence must read from the absolute final element of arr backward to the absolute first element of arr.

Examples
Example 1:

Input: arr = array([1, 2, 3, 4, 5])

Output: array([5, 4, 3, 2, 1])

Example 2:

Input: arr = array([10.5, 20.5])

Output: array([20.5, 10.5])

Example 3:

Input: arr = array([])

Output: array([])

Critical Test Cases to Pass
Input: arr = array([7])

Expected Output: array([7])

Input: arr = array([-1, 0, 1])

Expected Output: array([1, 0, -1])

21. 2D Internal Coordinate Window Slicing
Problem Statement Explanation
Given a two-dimensional (2D) matrix grid matrix containing m rows and n columns, extract and isolate an internal sub-grid window. The sub-grid must exclude the outermost boundaries of the original structure: the absolute first row, the absolute last row, the absolute first column, and the absolute last column.

If the input matrix dimensions are too small to contain any interior core cells (e.g., width or height is less than 3), return an empty array structure.

Examples
Example 1:

Input:

Plaintext
matrix = array([[1,  2,  3,  4],
                [5,  6,  7,  8],
                [9, 10, 11, 12],
                [13, 14, 15, 16]])
Output:

Plaintext
array([[ 6,  7],
       [10, 11]])
Example 2:

Input:

Plaintext
matrix = array([[1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]])
Output: array([[5]])

Critical Test Cases to Pass
Input: matrix = array([[1, 2], [3, 4]])

Expected Output: An empty array layout with 0 rows and 0 columns.

Input:
text matrix = array([[1, 2, 3],  [4, 5, 6]]) 

Expected Output: An empty array layout.

22. Boolean Mask Filtering
Problem Statement Explanation
Given a multidimensional array arr, scan through all coordinates and filter out values based on a specific criteria condition: you must isolate all elements whose numeric value is strictly greater than a provided scalar value threshold.

The matching values must be stripped of their original dimensional layout and returned as a collapsed, flat 1D sequence ordered by their original appearance.

Examples
Example 1:

Input: arr = array([[5, 12, 3], [9, 1, 15]]), threshold = 8

Output: array([12,  9, 15])

Example 2:

Input: arr = array([1, 2, 3]), threshold = 5

Output: array([])

Critical Test Cases to Pass
Input: arr = array([-3, -1, -5]), threshold = -2

Expected Output: array([-1])

Input: arr = array([[10, 20], [30, 40]]), threshold = 25

Expected Output: array([30, 40])

23. Multi-Condition Intersect Masking
Problem Statement Explanation
Given a 1D dataset array arr, perform a dual-boundary filtering operation. You must extract all values within the array that simultaneously satisfy two distinct numeric constraints: an element must be strictly greater than a lower bound value lower, and strictly less than an upper bound value upper.

Return the isolated elements as a flat 1D array.

Examples
Example 1:

Input: arr = array([5, 12, 18, 25, 30]), lower = 10, upper = 26

Output: array([12, 18, 25])

Example 2:

Input: arr = array([1, 2, 3]), lower = 5, upper = 10

Output: array([])

Critical Test Cases to Pass
Input: arr = array([10, 20, 30]), lower = 10, upper = 30

Expected Output: array([20]) (Since the boundaries are strictly exclusive)

Input: arr = array([-5, 0, 5]), lower = -6, upper = 6

Expected Output: array([-5,  0,  5])

24. Fancy Indexing (Coordinate Array Lookups)
Problem Statement Explanation
Given a 2D matrix array matrix and a flat list of row indices row_indices along with a matching list of column indices col_indices, extract specific coordinate pairs.

The output must be a flat 1D array where the first element corresponds to the value located at matrix[row_indices[0]][col_indices[0]], the second element corresponds to matrix[row_indices[1]][col_indices[1]], and so on.

Examples
Example 1:

Input:

Plaintext
matrix = array([[10, 20, 30],
                [40, 50, 60],
                [70, 80, 90]])
row_indices = [0, 1, 2], col_indices = [2, 1, 0]

Output: array([30, 50, 70])

Critical Test Cases to Pass
Input: matrix = array([[1, 2], [3, 4]]), row_indices = [0, 0], col_indices = [0, 1]

Expected Output: array([1, 2])

Input: matrix = array([[5]]), row_indices = [0], col_indices = [0]

Expected Output: array([5])

25. Row-Wise Element Sorting Analysis
Problem Statement Explanation
Given a 2D matrix array matrix, analyze the numerical ordering of elements within each individual row. Instead of returning the sorted numbers themselves, you must generate a matching 2D matrix structure containing the 0-based column index positions that the numbers would occupy if that specific row were sorted in ascending order.

Examples
Example 1:

Input:

Plaintext
matrix = array([[9, 3, 6],
                [1, 8, 4]])
Output:

Plaintext
array([[1, 2, 0],
       [0, 2, 1]])
(Explanation: In the first row, 3 is the smallest [index 1], 6 is next [index 2], and 9 is largest [index 0])

Critical Test Cases to Pass
Input: matrix = array([[10, 20, 30]])

Expected Output: array([[0, 1, 2]]) (Already ordered)

Input: matrix = array([[5, 5], [2, 1]])

Expected Output:

Plaintext
array([[0, 1],
       [1, 0]])
26. Conditional Index Hunting
Problem Statement Explanation
Given a multidimensional array arr, locate the exact positions of specific values. You must find the coordinate locations of every element that satisfies a given condition: the element value must be exactly equal to a targeted integer target.

Return these positions as a tuple of arrays, where each array contains the coordinate indices for a specific dimension axis.

Examples
Example 1:

Input: arr = array([[1, 2, 3], [2, 4, 5]]), target = 2

Output: (array([0, 1]), array([1, 0]))
(Explanation: The value 2 is located at row 0 column 1, and row 1 column 0)

Example 2:

Input: arr = array([10, 20, 30]), target = 99

Output: (array([]),)

Critical Test Cases to Pass
Input: arr = array([[7, 7], [7, 7]]), target = 7

Expected Output: (array([0, 0, 1, 1]), array([0, 1, 0, 1]))