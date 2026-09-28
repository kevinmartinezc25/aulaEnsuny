-- ==============================================================================
-- OPTIMIZACIÓN DE ÍNDICES COMPUESTOS PARA ALTO RENDIMIENTO — AULAENSUNY
-- ==============================================================================
-- Basado en el esquema real y verificado de aulaEnsuny.
-- Totalmente idempotente y seguro contra fallos.
-- ==============================================================================

-- 1. Matrícula explícita de estudiantes en cursos LMS (student_courses)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_courses' AND column_name = 'course_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_student_courses_student_course 
      ON public.student_courses (student_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_student_courses_course 
      ON public.student_courses (course_id);
  END IF;
END $$;

-- 2. Matrículas institucionales anuales SIMAT (student_enrollments)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'academic_year'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_year 
      ON public.student_enrollments (student_id, academic_year);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_grade_group 
      ON public.student_enrollments (grade_level, group_name);
  END IF;
END $$;

-- 3. Calificaciones LMS (grades)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'course_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_grades_student_course 
      ON public.grades (student_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_grades_course_created 
      ON public.grades (course_id, created_at DESC);
  END IF;
END $$;

-- 4. Planilla Asistida — Calificaciones y Actividades Docentes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assisted_grades') THEN
    CREATE INDEX IF NOT EXISTS idx_assisted_grades_student_activity 
      ON public.assisted_grades (student_id, activity_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assisted_activities') THEN
    CREATE INDEX IF NOT EXISTS idx_assisted_activities_achievement 
      ON public.assisted_activities (achievement_id, position_order);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assisted_students') THEN
    CREATE INDEX IF NOT EXISTS idx_assisted_students_subject 
      ON public.assisted_students (subject_id, number);
  END IF;
END $$;

-- 5. Planilla Asistida — Sesiones y Asistencia
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assisted_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_assisted_sessions_subject_date 
      ON public.assisted_sessions (subject_id, date);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assisted_attendance') THEN
    CREATE INDEX IF NOT EXISTS idx_assisted_attendance_session_student 
      ON public.assisted_attendance (session_id, student_id);
  END IF;
END $$;

-- 6. Reemplazos y excepciones del horario escolar (sch_daily_overrides)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sch_daily_overrides' AND column_name = 'target_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sch_daily_overrides_target_date_teacher 
      ON public.sch_daily_overrides (target_date, teacher_id);
  END IF;
END $$;

-- 7. Evaluaciones e Intentos de Quiz (quiz_attempts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_attempts' AND column_name = 'quiz_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz 
      ON public.quiz_attempts (student_id, quiz_id);
  END IF;
END $$;

-- 8. Agenda Institucional (events y event_responsibles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_dates 
      ON public.events (start_date, end_date);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_responsibles') THEN
    CREATE INDEX IF NOT EXISTS idx_event_responsibles_event_user 
      ON public.event_responsibles (event_id, user_id);
  END IF;
END $$;

-- 9. Solicitudes de Permisos Docentes (permission_requests)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'permission_requests' AND column_name = 'teacher_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_permission_requests_teacher_status 
      ON public.permission_requests (teacher_id, status);
  END IF;
END $$;

-- 10. Notificaciones de Usuario no leídas (notifications)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
      ON public.notifications (recipient_id, is_read) WHERE is_read = false;
  END IF;
END $$;
