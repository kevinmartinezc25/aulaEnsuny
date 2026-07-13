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

async function testFixedLogic() {
  const studentId = '4ae04a8f-36df-4d91-b7fe-ff53abec2349'; // Luisa Torres
  const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57'; // Fisica
  
  console.log("Running simulated fixed query logic...");
  
  let courseModules = []
  let lessonsInModules = []
  let dbQuizzes = []
  let quizAttemptsData = []
  const quizToLessonMap = new Map()

  const { data: modulesData, error: modErr } = await adminClient
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId);
  
  if (modErr) {
    console.error("Modules error:", modErr);
    return;
  }
  
  courseModules = modulesData || [];
  const moduleIds = courseModules.map(m => m.id);
  console.log("Modules found:", moduleIds);
  
  if (moduleIds.length > 0) {
    const { data: lessonsData, error: lesErr } = await adminClient
      .from('lessons')
      .select('id, title')
      .in('module_id', moduleIds);
      
    if (lesErr) {
      console.error("Lessons error:", lesErr);
      return;
    }
    
    lessonsInModules = lessonsData || [];
    const lessonIds = lessonsInModules.map(l => l.id);
    console.log("Lessons found:", lessonIds);
    
    if (lessonIds.length > 0) {
      const { data: quizzesData, error: qzErr } = await adminClient
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds);
        
      if (qzErr) {
        console.error("Quizzes error:", qzErr);
        return;
      }
      
      dbQuizzes = quizzesData || [];
      console.log("Quizzes found:", dbQuizzes.map(q => q.id));
      
      dbQuizzes.forEach((q) => {
        const lesson = lessonsInModules.find(l => l.id === q.lesson_id);
        if (lesson) {
          quizToLessonMap.set(q.id, { id: q.lesson_id, title: lesson.title });
        }
      });

      const quizIds = dbQuizzes.map(q => q.id);
      if (quizIds.length > 0) {
        const { data: attemptsData, error: attErr } = await adminClient
          .from('quiz_attempts')
          .select('id, score, completed_at, quiz_id')
          .eq('student_id', studentId)
          .in('quiz_id', quizIds);
          
        if (attErr) {
          console.error("Quiz attempts error:", attErr);
          return;
        }
        
        quizAttemptsData = attemptsData || [];
      }
    }
  }

  const quizResults = quizAttemptsData.map((a) => {
    const lessonInfo = quizToLessonMap.get(a.quiz_id);
    return {
      lessonId: lessonInfo?.id ?? '',
      lessonTitle: lessonInfo?.title ?? 'Quiz',
      score: Number(a.score ?? 0),
      maxScore: 5,
      completedAt: a.completed_at
    };
  });
  
  console.log("Quiz Results mapped successfully:", quizResults);
}

testFixedLogic();
