-- Update Tam Tran to floater role
-- She is one of the 3 designated floaters (Tiffany, Tam, Aura) who can
-- drive between any of the 3 centers wherever needed

UPDATE teachers
SET
  role = 'floater',
  classroom_title = 'anywhere',
  regular_shift_start = '07:45'
WHERE first_name = 'Tam'
  AND last_name = 'Tran';
