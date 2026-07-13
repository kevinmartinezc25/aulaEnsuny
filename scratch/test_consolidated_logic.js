const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);

async function testConsolidated() {
  const gradeLevel = '10°';
  const groupName = '1';
  
  console.log("Running simulated consolidated grades query logic...");
  
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, title, subject')
    .eq('grade_level', gradeLevel)
    .eq('group_name', groupName);

  if (!courses || courses.length === 0) {
    console.log("No courses found");
    return;
  }

  const courseIds = courses.map(c => c.id);

  const { data: students } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('grade_level', gradeLevel)
    .eq('group_name', groupName)
    .eq('status', 'active');

  if (!students || students.length === 0) {
    console.log("No students found");
    return;
  }

  const studentIds = students.map(s => s.id);

  const { data: allGrades } = await adminClient
    .from('student_lesson_grades')
    .select('student_id, course_id, grade, score, max_grade')
    .in('student_id', studentIds)
    .in('course_id', courseIds);
    
  console.log("Lesson grades count:", allGrades ? allGrades.length : 0);

  // Find all modules of these courses
  const { data: modulesData } = await adminClient
    .from('course_modules')
    .select('id, course_id')
    .in('course_id', courseIds);

  const modules = modulesData || [];
  const moduleIds = modules.map(m => m.id);
  
  let lessons = [];
  let quizzesList = [];
  let allQuizzesAttempts = [];

  if (moduleIds.length > 0) {
    const { data: lessonsData } = await adminClient
      .from('lessons')
      .select('id, module_id')
      .in('module_id', moduleIds);
    lessons = lessonsData || [];
    
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length > 0) {
      const { data: quizzesData } = await adminClient
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds);
      quizzesList = quizzesData || [];
      
      const quizIds = quizzesList.map(q => q.id);
      if (quizIds.length > 0) {
        const { data: attemptsData } = await adminClient
          .from('quiz_attempts')
          .select('student_id, quiz_id, score')
          .in('student_id', studentIds)
          .in('quiz_id', quizIds);
        allQuizzesAttempts = attemptsData || [];
      }
    }
  }

  // Create mapping: quiz_id -> course_id
  const quizToCourseMap = new Map();
  const moduleToCourse = new Map(modules.map(m => [m.id, m.course_id]));
  const lessonToCourse = new Map();
  lessons.forEach(l => {
    const cid = moduleToCourse.get(l.module_id);
    if (cid) lessonToCourse.set(l.id, cid);
  });
  quizzesList.forEach(q => {
    const cid = lessonToCourse.get(q.lesson_id);
    if (cid) quizToCourseMap.set(q.id, cid);
  });

  const allQuizzes = allQuizzesAttempts.map((q) => ({
    student_id: q.student_id,
    course_id: quizToCourseMap.get(q.quiz_id) || '',
    score: Number(q.score ?? 0),
    max_score: 5
  }));
  
  console.log("All mapped quizzes attempts count:", allQuizzes.length);
  console.log("Sample mapped quiz attempt:", allQuizzes[0]);
}

testConsolidated();
