-- Fix Q83, Q84, Q85 verification scripts to use literal numbers
-- so getQuestionTotalCases regex can parse them correctly.
-- Change: exec_globals['total_cases'] = total   →   exec_globals['total_cases'] = 3

UPDATE public.coding_questions
SET verification_script = REPLACE(
  verification_script,
  E'exec_globals[''total_cases'']  = total',
  E'exec_globals[''total_cases'']  = 3'
)
WHERE id IN (83, 84, 85)
  AND verification_script LIKE '%total_cases%';
