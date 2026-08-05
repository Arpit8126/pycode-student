-- ================================================================
-- FIX: Make exec_globals['total_cases'] use literal numbers
-- so getQuestionTotalCases() regex can always read the correct
-- total for unattempted questions — making totals consistent
-- for ALL students across every question.
--
-- This replaces the pattern:
--   total  = N
--   ...
--   exec_globals['total_cases']  = total
-- with:
--   total  = N
--   ...
--   exec_globals['total_cases']  = N    (literal number)
--
-- The UPDATE uses a regex to extract N from "total  = N" in the
-- script, then replaces "exec_globals['total_cases']  = total"
-- with "exec_globals['total_cases']  = N".
-- ================================================================

UPDATE public.coding_questions
SET verification_script = regexp_replace(
  verification_script,
  E'exec_globals\\[''total_cases''\\]\\s*=\\s*total',
  'exec_globals[''total_cases''] = ' || (
    regexp_match(verification_script, E'(?m)^\\s*total\\s*=\\s*(\\d+)') 
  )[1],
  'g'
)
WHERE verification_script IS NOT NULL
  AND verification_script ~ E'exec_globals\\[''total_cases''\\]\\s*=\\s*total'
  AND verification_script ~ E'(?m)^\\s*total\\s*=\\s*\\d+';

-- Verify the fix worked — should show literal numbers now
SELECT id, title,
  regexp_match(verification_script, E'exec_globals\\[''total_cases''\\]\\s*=\\s*(\\d+)') AS total_cases_literal
FROM public.coding_questions
WHERE verification_script IS NOT NULL
ORDER BY id;
