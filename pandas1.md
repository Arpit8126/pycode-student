Challenge 1: Isolate Student Identity Columns (Easy)Problem DescriptionYour teacher has provided a class roster containing academic performance metrics. Before performing any data analysis, you need to isolate only the basic identification fields of the students to create an administrative contact list.Write a Python function extract_student_identity(df: pd.DataFrame) -> pd.DataFrame that extracts a specific vertical slice of the dataset:Column Selection: Extract only the Name and Age columns from the input DataFrame.Order Preservation: Ensure that the columns remain in the exact order requested (Name first, Age second).Row Retention: Keep all rows intact, including rows that contain missing values (NaN).Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64/Int64), and Marks (Float64/Int64).Constraints$1 \le \text{df.shape}[0] \le 100$Columns Name and Age are guaranteed to exist in the input DataFrame.Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
Output:| Name | Age  |
|------|------|
| "A"  | 20.0 |
| "B"  | 25.0 |
Hidden Verification Test CasesTest Case 1.1: Missing Marks Safety CheckTest Input Data: A DataFrame where the Marks column is entirely filled with NaN values.Expected Test Output: The function safely returns the Name and Age columns without throwing an error due to the missing data in the dropped column.Challenge 2: Fill Missing Grade Entries (Easy)Problem DescriptionA class roster contains some missing final grades. Write a Python function fill_missing_grades(df: pd.DataFrame) -> pd.DataFrame that cleanses the dataset:Null Grade Identification: Scan the Marks column to find any missing (NaN) values.Value Imputation: Fill those missing cells with a baseline default float value of 0.0.Data Modification: Modify the Marks column directly or reassign it, returning the updated DataFrame.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 150$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | 22.0 | 70.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 0.0   |
| "C"  | 22.0 | 70.0  |
Hidden Verification Test CasesTest Case 2.1: No Missing Grade VerificationTest Input Data: A DataFrame where every student already has a valid numerical grade.Expected Test Output: The DataFrame is returned exactly as it was, with no modifications made to any cell.Challenge 3: Count Missing Grade Entries (Easy)Problem DescriptionThe school wants to know how many final exam grades are currently missing from the roster database.Write a Python function count_missing_grades(df: pd.DataFrame) -> int that counts missing values:Null Detection: Scan the Marks column to identify any missing (NaN) values.Sum Tally: Calculate the total number of missing cells in that column.Return Type: Return the count as a standard Python integer.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 300$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | NaN   |
| "C"  | 22.0 | NaN   |
Output:2
Hidden Verification Test CasesTest Case 3.1: Complete Record Safety CheckTest Input Data: A DataFrame where all students have valid, non-null grades.Expected Test Output: The function successfully returns 0 since no grade entries are missing.Challenge 4: Purge Duplicate Student Records (Easy)Problem DescriptionDue to duplicate submission errors, some student records were entered multiple times in the database roster.Write a Python function remove_duplicate_students(df: pd.DataFrame) -> pd.DataFrame that cleans the ledger:Duplicate Purging: Remove any rows that are exact duplicates of previous rows.First Instance Preservation: Retain only the first occurrence of each duplicate record.Output Structure: Return the clean DataFrame without shifting or resetting index numbers.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 200$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
| "A"  | 20.0 | 80.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
Hidden Verification Test CasesTest Case 4.1: No Duplicates VerificationTest Input Data: A roster where every single row is completely unique.Expected Test Output: The DataFrame is returned exactly as it was, with no modifications made to any cell.Challenge 5: Count Duplicate Student Records (Easy)Problem DescriptionDue to duplicate submission errors, some student records were entered multiple times in the database roster.Write a Python function count_duplicate_students(df: pd.DataFrame) -> int that identifies duplicates:Duplicate Detection: Find the number of duplicate rows in the DataFrame where all columns (Name, Age, Marks) are identical to a previous row.Return Type: Return the count as a standard Python integer.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 200$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "B"  | 25.0 | 90.0  |
| "A"  | 20.0 | 80.0  |
Output:1
Hidden Verification Test CasesTest Case 5.1: No Duplicates VerificationTest Input Data: A roster where every single row is completely unique.Expected Test Output: The function returns 0 since no duplicate entries exist.Challenge 6: Drop Empty Student Names (Easy)Problem DescriptionAn administrative record requires every student to have a valid name. If a row is missing the student's name, that record must be deleted.Write a Python function remove_empty_names(df: pd.DataFrame) -> pd.DataFrame that cleanses the dataset:Null Name Identification: Scan the Name column to find any missing (NaN or null) entries.Row Dropping: Remove all rows where the student's Name is missing.Data Preservation: Retain rows where the Age or Marks values are missing, as long as the Name is present.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 150$Example 1Input:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| NaN  | 25.0 | 90.0  |
| "C"  | NaN  | 70.0  |
Output:| Name | Age  | Marks |
|------|------|-------|
| "A"  | 20.0 | 80.0  |
| "C"  | NaN  | 70.0  |
Hidden Verification Test CasesTest Case 6.1: Missing Marks Name Intact Safety CheckTest Input Data: A row containing a valid Name but NaN in Marks.Expected Test Output: The row is preserved in the output since the Name is present.Challenge 7: Filter Mature Student Cohorts (Easy)Problem DescriptionThe university is organizing a specialized seminar intended exclusively for students who are 22 years of age or older. You need to filter the master roster down to this specific group.Write a Python function filter_mature_students(df: pd.DataFrame) -> pd.DataFrame that performs basic row filtering:Conditional Filtering: Filter the rows to retain only students where their Age is greater than or equal to 22 ($\text{Age} \ge 22$).Missing Data Handling: Completely exclude rows where the student's Age is missing (NaN), as they cannot be verified.Structure Output: Return the filtered DataFrame with all original columns intact.Input DataFrame Schemadf: A DataFrame containing Name (String), Age (Float64), and Marks (Float64).Constraints$1 \le \text{df.shape}[0] \le 120$Example 1Input:| Name | Age  | Marks |
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