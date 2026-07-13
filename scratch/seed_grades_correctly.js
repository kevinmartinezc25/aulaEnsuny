const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57';
  const studentId = '4ae04a8f-36df-4d91-b7fe-ff53abec2349';

  // 1. Get Categories
  const { data: categories } = await supabase.from('course_grade_categories').select('*').eq('course_id', courseId);
  console.log('Categories:', categories);

  if (!categories || categories.length === 0) {
    console.error('No categories found. Run seed_grades.js first or create categories.');
    return;
  }

  // 2. Clean previous grades to avoid conflicts
  await supabase.from('grades').delete().eq('course_id', courseId).eq('student_id', studentId);

  // 3. Insert Grades (max 1 per category to respect the unique constraint)
  // We'll insert one for Tareas, one for Quizzes, one for Evaluación Final
  // We can spread their created_at dates to show a nice trend
  const gradesToInsert = [
    {
      student_id: studentId,
      course_id: courseId,
      category_id: categories[0].id, // Tareas
      score: 3.8,
      feedback: 'Buen desempeño en las entregas de tareas.',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    },
    {
      student_id: studentId,
      course_id: courseId,
      category_id: categories[1].id, // Quizzes
      score: 4.2,
      feedback: 'Excelente desempeño en las evaluaciones formativas.',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
    },
    {
      student_id: studentId,
      course_id: courseId,
      category_id: categories[2].id, // Evaluación Final
      score: 4.5,
      feedback: 'Felicitaciones por tu examen final.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    }
  ];

  const { error: gradeErr } = await supabase.from('grades').insert(gradesToInsert);
  if (gradeErr) {
    console.error('Error inserting grades:', gradeErr);
  } else {
    console.log('Successfully inserted 3 grades!');
  }

  // 4. Insert into student_period_grades
  const { data: periods } = await supabase.from('academic_periods').select('*');
  if (periods && periods.length > 0) {
    // Delete existing to avoid duplicate key
    await supabase.from('student_period_grades').delete().eq('course_id', courseId).eq('student_id', studentId);
    
    // Periodo 2 is active, so we can insert for it
    const activePeriod = periods.find(p => p.status === 'active') || periods[0];
    
    console.log('Inserting student period grades for period:', activePeriod.name);
    const { error: pgErr } = await supabase.from('student_period_grades').insert({
      student_id: studentId,
      course_id: courseId,
      academic_period_id: activePeriod.id,
      final_grade: 4.2,
      performance_level: 'Alto'
    });
    if (pgErr) console.error('Error inserting student_period_grades:', pgErr);
    else console.log('Successfully inserted student period grade!');
  }
}

seed();
