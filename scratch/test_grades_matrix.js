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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// We need to mock next/headers for cookies since server actions use it
// But we can test the logic of getGradesMatrix directly by copying its steps.
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testActionLogic() {
  try {
    const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57'; // Fisica General
    console.log("Starting test action logic...");

    // 1a. Course info
    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('title, grade_level, group_name')
      .eq('id', courseId)
      .single();
    if (courseErr || !course) throw new Error('Curso no encontrado');
    console.log("Course found:", course.title);

    // 1b. Evaluable lessons
    const { data: lessons, error: lessonsErr } = await adminClient
      .from('lessons')
      .select('id, title, content_type, type, order_index, course_modules!inner(course_id), quizzes(id)')
      .eq('course_modules.course_id', courseId)
      .order('order_index', { ascending: true });
    
    if (lessonsErr) {
      console.error("Lessons query error:", lessonsErr);
      return;
    }
    console.log("Lessons retrieved:", lessons.length);

    const columns = (lessons || [])
      .filter(l => {
        const ct = (l.content_type ?? l.type);
        const hasQuiz = l.quizzes && l.quizzes.id;
        return hasQuiz || (ct && ['quiz', 'task', 'workshop', 'activity', 'forum'].includes(ct));
      })
      .map(l => {
        const hasQuiz = l.quizzes && l.quizzes.id;
        const gradeType = hasQuiz ? 'quiz' : (l.content_type ?? l.type);
        return {
          lessonId: l.id,
          lessonTitle: l.title,
          gradeType,
          orderIndex: l.order_index ?? 0
        };
      });

    console.log("Columns:", columns);

    const lessonIds = columns.map(c => c.lessonId);

    // 1c. Enrollments
    const { data: enrollments, error: enrollError } = await adminClient
      .from('student_courses')
      .select('student_id, profiles!student_id(id, first_name, last_name)')
      .eq('course_id', courseId);
    
    if (enrollError) {
      console.error("Enrollments error:", enrollError);
      return;
    }
    console.log("Enrollments retrieved:", enrollments ? enrollments.length : 0);

    const students = (enrollments || []).map((e) => {
      const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
      return { id: p?.id ?? e.student_id, firstName: p?.first_name ?? '', lastName: p?.last_name ?? '' };
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));

    console.log("Students:", students);

    const studentIds = students.map(s => s.id);

    // 1d. Existing grades with simulated period filter (e.g., Periodo 2)
    let existingGrades = [];
    const periodId = '8a89b873-5671-41cc-a90e-a32d73f36756'; // Periodo 2
    if (studentIds.length > 0 && lessonIds.length > 0) {
      let query = adminClient
        .from('student_lesson_grades')
        .select('id, student_id, lesson_id, grade, score, max_grade')
        .in('student_id', studentIds)
        .in('lesson_id', lessonIds);

      if (periodId) {
        query = query.or(`academic_period_id.eq.${periodId},academic_period_id.is.null`);
      }

      const { data, error: gradesErr } = await query;
      if (gradesErr) {
        console.error("Grades error:", gradesErr);
        return;
      }
      existingGrades = data || [];
    }
    console.log("Grades retrieved:", existingGrades.length);

    // 1d.1 Quizzes and attempts
    let dbQuizzes = [];
    let quizAttempts = [];
    if (lessonIds.length > 0) {
      const { data: qData } = await adminClient
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds);
      dbQuizzes = qData || [];
      
      if (dbQuizzes.length > 0 && studentIds.length > 0) {
        const quizIds = dbQuizzes.map(q => q.id);
        const { data: aData } = await adminClient
          .from('quiz_attempts')
          .select('id, student_id, quiz_id, score, completed_at')
          .in('student_id', studentIds)
          .in('quiz_id', quizIds)
          .order('completed_at', { ascending: true });
        quizAttempts = aData || [];
      }
    }
    console.log("Quizzes found:", dbQuizzes.length);
    console.log("Quiz attempts found:", quizAttempts.length);

    // Build grade lookup
    const gradeMap = new Map();
    existingGrades.forEach(g => {
      const gradeVal = Number(g.grade ?? g.score ?? 0);
      gradeMap.set(`${g.student_id}_${g.lesson_id}`, {
        gradeId: g.id,
        grade: gradeVal,
        maxGrade: Number(g.max_grade ?? 5)
      });
    });

    if (dbQuizzes.length > 0 && quizAttempts.length > 0) {
      const quizToLesson = new Map();
      dbQuizzes.forEach(q => quizToLesson.set(q.id, q.lesson_id));

      quizAttempts.forEach(attempt => {
        const lessonId = quizToLesson.get(attempt.quiz_id);
        if (lessonId) {
          const key = `${attempt.student_id}_${lessonId}`;
          gradeMap.set(key, {
            gradeId: attempt.id,
            grade: Number(attempt.score ?? 0),
            maxGrade: 5
          });
        }
      });
    }

    // 1e. Build matrix rows
    const rows = students.map(s => {
      const gradesRow = {};
      let sum = 0; let count = 0;

      columns.forEach(col => {
        const entry = gradeMap.get(`${s.id}_${col.lessonId}`) ?? null;
        gradesRow[col.lessonId] = entry;
        if (entry) { sum += entry.grade; count++ }
      });

      const finalGrade = count > 0 ? Number((sum / count).toFixed(2)) : null;

      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`.trim(),
        grades: gradesRow,
        finalGrade
      };
    });

    console.log("Rows:", JSON.stringify(rows, null, 2));
    console.log("Action logic completed successfully!");
  } catch (err) {
    console.error("Execution error:", err);
  }
}

testActionLogic();
