const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: dbGrades, error } = await supabase
    .from('grades')
    .select('score, created_at, category_id, course_grade_categories(name)')
    .in('course_id', ['45c26bca-06e8-4d47-9dc3-3bb5da189c57']);
  console.log('Grades with categories:', JSON.stringify(dbGrades, null, 2), error);
}

check();
