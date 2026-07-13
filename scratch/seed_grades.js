const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57';
  const studentId = '4ae04a8f-36df-4d91-b7fe-ff53abec2349';

  // 1. Check/Insert Categories
  let { data: categories } = await supabase.from('course_grade_categories').select('*').eq('course_id', courseId);
  if (!categories || categories.length === 0) {
    console.log('Inserting default categories...');
    const { data: newCats, error: catErr } = await supabase.from('course_grade_categories').insert([
      { course_id: courseId, name: 'Tareas', weight: 0.3 },
      { course_id: courseId, name: 'Quizzes', weight: 0.3 },
      { course_id: courseId, name: 'Evaluación Final', weight: 0.4 }
    ]).select();
    
    if (catErr) {
      console.error('Error inserting categories:', catErr);
      return;
    }
    categories = newCats;
  }
  console.log('Categories:', categories);

  // 2. Check Academic Periods
  const { data: periods } = await supabase.from('academic_periods').select('*');
  console.log('Academic Periods:', periods);
  let periodId = null;
  if (periods && periods.length > 0) {
    periodId = periods[0].id;
  }

  // 3. Insert Grades
  const { data: existingGrades } = await supabase.from('grades').select('*').eq('course_id', courseId);
  if (!existingGrades || existingGrades.length === 0) {
    console.log('Inserting mock grades for Luisa Fernanda...');
    const scores = [3.5, 3.8, 4.2, 4.0, 4.5, 4.3];
    const daysAgo = [35, 28, 21, 14, 7, 1];
    
    const gradesToInsert = scores.map((score, index) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo[index]);
      
      // Rotate categories
      const cat = categories[index % categories.length];
      
      return {
        student_id: studentId,
        course_id: courseId,
        category_id: cat.id,
        score: score,
        feedback: `Buen trabajo en la actividad de la semana ${index + 1}`,
        created_at: date.toISOString()
      };
    });

    const { error: gradeErr } = await supabase.from('grades').insert(gradesToInsert);
    if (gradeErr) {
      console.error('Error inserting grades:', gradeErr);
    } else {
      console.log('Successfully inserted 6 grades!');
    }

    // 4. Also insert into student_period_grades if period exists
    if (periodId) {
      const { data: existingPeriodGrades } = await supabase
        .from('student_period_grades')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .eq('academic_period_id', periodId);

      if (!existingPeriodGrades || existingPeriodGrades.length === 0) {
        console.log('Inserting student period grades...');
        const { error: pgErr } = await supabase.from('student_period_grades').insert({
          student_id: studentId,
          course_id: courseId,
          academic_period_id: periodId,
          final_grade: 4.1
        });
        if (pgErr) console.error('Error inserting student_period_grades:', pgErr);
      }
    }
  } else {
    console.log('Grades already exist in database:', existingGrades.length);
  }
}

seed();
