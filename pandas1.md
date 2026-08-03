Challenge 1: Isolate Student Identity Columns (Easy)Problem DescriptionYour teacher has provided a class roster containing academic performance metrics. Before performing any data analysis, you need to isolate only the basic identification fields of the students to create an administrative contact list.Write a Python function extract_student_identity(df: pd.DataFrame) -> pd.DataFrame that extracts a specific vertical slice of the dataset:Column Selection: Extract only the Name and Age columns from the input DataFrame.Order Preservation: Ensure that the columns remain in the exact order requested (Name first, Age second).Row Retention: Keep all rows intact, including rows that contain missing values (NaN).Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64/Int64), and Marks (Float64/Int64).Constraints$1 \le \text{df.shape}[0] \le 100$Columns Name and Age are guaranteed to exist in the input DataFrame.Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
Output:| Name | Age  |
|------|------|
| "A"  | 20.0 |
| "B"  | 25.0 |
Hidden Verification Test CasesTest Case 1.1: Missing Marks Safety CheckTest Input Data: A DataFrame where the Marks column is entirely filled with NaN values.Expected Test Output: The function safely returns the Name and Age columns without throwing an error due to the missing data in the dropped column.Challenge 2: Drop Incomplete Grade Records (Easy)Problem DescriptionAn automated report is being compiled for final course submissions. The rules state that a student cannot be evaluated if their final exam grade is missing from the system database.Write a Python function remove_missing_marks(df: pd.DataFrame) -> pd.DataFrame that cleans the dataset:Null Identification: Scan the Marks column to find any missing values (NaN or float("nan")).Row Dropping: Drop all rows where the Marks value is missing.Data Preservation: Keep rows where the Age column is missing, as long as the Marks value is present.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 150$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | NaN  | 70.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "C"  | NaN  | 70.0  |
Hidden Verification Test CasesTest Case 2.1: Completely Empty Marks FilterTest Input Data: A dataset where every single row has a missing Marks value.Expected Test Output: An empty DataFrame retaining the original three columns (Name, Age, Marks).Challenge 3: Count Missing Grade Entries (Easy)Problem DescriptionThe school wants to know how many final exam grades are currently missing from the roster database.Write a Python function count_missing_grades(df: pd.DataFrame) -> int that counts missing values:Null Detection: Scan the Marks column to identify any missing (NaN) values.Sum Tally: Calculate the total number of missing cells in that column.Return Type: Return the count as a standard Python integer.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 300$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | 22.0 | NaN   |
Output:2
Hidden Verification Test CasesTest Case 3.1: Complete Record Safety CheckTest Input Data: A DataFrame where all students have valid, non-null grades.Expected Test Output: The function successfully returns 0 since no grade entries are missing.Challenge 4: Inject Default Age Specifications (Easy)Problem DescriptionA school enrollment form requires every record to have a valid age field. If a student's age was left blank during signup, school policy states it should be temporarily set to a default baseline value of 18.Write a Python function fill_missing_ages(df: pd.DataFrame) -> pd.DataFrame that updates column values:Target Imputation: Locate all missing values (NaN) specifically within the Age column.Value Replacement: Fill those missing cells with the constant integer value 18.Column Modification: Modify the Age column directly or reassign it, keeping the rest of the DataFrame completely unchanged.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 200$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "C"  | NaN  | 70.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "C"  | 18.0 | 70.0  |
Hidden Verification Test CasesTest Case 4.1: No Missing Values VerificationTest Input Data: A DataFrame where every student already has a valid numerical age.Expected Test Output: The DataFrame is returned exactly as it was, with no modifications made to any cell.Challenge 5: Count Duplicate Student Records (Easy)Problem DescriptionDue to duplicate submission errors, some student records were entered multiple times in the database roster.Write a Python function count_duplicate_students(df: pd.DataFrame) -> int that identifies duplicates:Duplicate Detection: Find the number of duplicate rows in the DataFrame where all columns (Name, Age, Marks) are identical to a previous row.Return Type: Return the count as a standard Python integer.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 200$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
| "A"  | 20.0 | 80.0  |
Output:1
Hidden Verification Test CasesTest Case 5.1: No Duplicates VerificationTest Input Data: A roster where every single row is completely unique.Expected Test Output: The function returns 0 since no duplicate entries exist.Challenge 6: Compute Bonus Point Adjustments (Easy)Problem DescriptionYour teacher decided to give every student a standard boost of 5 extra credit points to reward excellent classroom participation. You need to create an updated grade tracking column.Write a Python function apply_bonus_marks(df: pd.DataFrame) -> pd.DataFrame that performs basic column arithmetic:Mathematical Addition: Add exactly 5 points to every value inside the Marks column.New Column Assignment: Save these new scores into a completely new column named BonusMarks.Null Preservation: If a student has a missing mark (NaN), the new BonusMarks value for that student must also remain NaN (standard behavior in Pandas column math).Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 100$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | 22.0 | 60.0  |
Output:| Name | Age  | Marks | BonusMarks |
|------|------|-------|------------|
| "A"  | 20.0 | 80.0  | 85.0       |
| "B"  | 25.0 | NaN   | NaN        |
| "C"  | 22.0 | 60.0  | 65.0       |
Hidden Verification Test CasesTest Case 6.1: Zero Score Boundary CheckTest Input Data: A student record where Marks is exactly 0.0.Expected Test Output: The corresponding BonusMarks value evaluates perfectly to 5.0.Challenge 7: Filter Mature Student Cohorts (Easy)Problem DescriptionThe university is organizing a specialized seminar intended exclusively for students who are 22 years of age or older. You need to filter the master roster down to this specific group.Write a Python function filter_mature_students(df: pd.DataFrame) -> pd.DataFrame that performs basic row filtering:Conditional Filtering: Filter the rows to retain only students where their Age is greater than or equal to 22 ($\text{Age} \ge 22$).Missing Data Handling: Completely exclude rows where the student's Age is missing (NaN), as they cannot be verified.Structure Output: Return the filtered DataFrame with all original columns intact.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 120$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
| "C"  | NaN  | 70.0  |
| "D"  | 22.0 | 60.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "B"  | 25.0 | 90.0  |
| "D"  | 22.0 | 60.0  |
Hidden Verification Test CasesTest Case 7.1: Empty Result Set MatchTest Input Data: A dataset where every student is strictly under the age of 22.Expected Test Output: An empty DataFrame displaying the three structural column headers.Challenge 8: Count Unique Student Cohorts (Easy)Problem DescriptionThe academic office needs to know how many distinct student names are registered in the course roster database.Write a Python function count_unique_students(df: pd.DataFrame) -> int that counts unique entries:Uniqueness Detection: Find the total number of unique values in the Name column.Return Type: Return the count as a standard Python integer.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 300$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
| "A"  | 22.0 | 70.0  |
Output:2
Hidden Verification Test CasesTest Case 8.1: Single Unique Record VerificationTest Input Data: A dataset where all registered student rows share the exact same Name.Expected Test Output: The function returns exactly 1 since there is only one unique name cohort.Challenge 9: Purge Completely Corrupted Student Records (Easy)Problem DescriptionDue to a minor database glitch during a weekly update loop, some rows were saved without both the student's age and their exam mark. A row is considered completely corrupted if it contains missing values in both columns at the same time.Write a Python function purge_corrupted_records(df: pd.DataFrame) -> pd.DataFrame that checks for multiple missing values:Double Null Isolation: Identify rows where the Age column AND the Marks column are missing (NaN) at the same time.Row Removal: Drop those specific double-null rows from the dataset.Partial Record Safe Harbor: Retain rows where at least one of the two metrics is valid (e.g., if age is missing but marks are valid, or vice-versa, do not drop the row).Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 100$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |  <- Keep (Age is valid)
| "C"  | NaN  | 70.0  |  <- Keep (Marks are valid)
| "D"  | NaN  | NaN   |  <- Drop (Both are missing)
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | NaN  | 70.0  |
Hidden Verification Test CasesTest Case 9.1: All-Valid Record VerificationTest Input Data: A dataset containing no missing values anywhere.Expected Test Output: The function returns the initial DataFrame completely intact without dropping any records.Challenge 10: Reset Structural Data Alignment Indices (Easy)Problem DescriptionWhen you drop rows from a DataFrame, the row numbers (indices) keep their original positions, leaving gaps in the sequence (e.g., jumping from row 0 directly to row 2). Before exporting data to a clean Excel spreadsheet, you need to reset these row numbers so they run continuously again.Write a Python function reset_dataframe_index(df: pd.DataFrame) -> pd.DataFrame that fixes index sequences:Index Rebuilding: Rebuild the row numbers so they run in a continuous, unbroken sequence starting from 0 to $N-1$.Old Index Cleanup: Ensure the old, broken index numbers are completely dropped and not saved as a new data column (Hint: check the parameters of your index reset function).Return Matrix: Return the re-indexed DataFrame.Input DataFrame Schemadf: A DataFrame with gaps or jumps in its row index sequence.Constraints$1 \le \text{df.shape}[0] \le 200$Example 1Input (DataFrame with row 1 missing after a filter operation):Index Number | Name | Age  | Marks |
-------------|------|------|-------|
0            | "A"  | 20.0 | 80.0  |
2            | "C"  | 22.0 | 60.0  |
Output:Index Number | Name | Age  | Marks |
-------------|------|------|-------|
0            | "A"  | 20.0 | 80.0  |
1            | "C"  | 22.0 | 60.0  |
Hidden Verification Test CasesTest Case 10.1: Continuous Pre-Sorted Layout StabilityTest Input Data: A DataFrame whose index numbers are already perfectly sorted and continuous from 0.Expected Test Output: The function runs smoothly, preserving the layout and structure exactly as it was.