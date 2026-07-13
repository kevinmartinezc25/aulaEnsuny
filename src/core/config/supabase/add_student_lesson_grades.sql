-- ============================================================
-- MIGRACIÓN: Actualizar student_lesson_grades existente
-- La tabla ya existe desde refactor_grades_db.sql pero le
-- faltan columnas. Este script las agrega de forma segura.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar course_id si no existe
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 2. Agregar grade_type si no existe
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS grade_type TEXT CHECK (grade_type IN ('quiz', 'task', 'workshop', 'activity'));

-- 3. Agregar grade si no existe (espejo de score con rango 0-5)
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS grade NUMERIC(5,2) CHECK (grade >= 0 AND grade <= 100);

-- 4. Agregar max_grade si no existe
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS max_grade NUMERIC(5,2) DEFAULT 5 CHECK (max_grade > 0);

-- 5. Agregar graded_at si no existe
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ DEFAULT now();

-- 6. Sincronizar grade desde score (si score ya tiene datos)
UPDATE public.student_lesson_grades
SET grade = score
WHERE grade IS NULL AND score IS NOT NULL;

-- 7. Poblar course_id desde la relación lesson → module → course
UPDATE public.student_lesson_grades slg
SET course_id = cm.course_id
FROM public.lessons l
JOIN public.course_modules cm ON l.module_id = cm.id
WHERE slg.lesson_id = l.id
  AND slg.course_id IS NULL;

-- 8. Poblar grade_type a partir del título de la lección
UPDATE public.student_lesson_grades slg
SET grade_type = 
  CASE
    WHEN lower(l.title) LIKE '%taller%' THEN 'workshop'
    WHEN lower(l.title) LIKE '%actividad%' THEN 'activity'
    WHEN lower(l.title) LIKE '%quiz%' OR l.type = 'quiz' THEN 'quiz'
    ELSE 'task'
  END
FROM public.lessons l
WHERE slg.lesson_id = l.id
  AND slg.grade_type IS NULL;

-- 9. Poblar max_grade si está vacía
UPDATE public.student_lesson_grades
SET max_grade = 5
WHERE max_grade IS NULL;

-- 10. Agregar academic_period_id si no existe
ALTER TABLE public.student_lesson_grades
  ADD COLUMN IF NOT EXISTS academic_period_id UUID REFERENCES public.academic_periods(id) ON DELETE CASCADE;

-- 11. Poblar academic_period_id desde la fecha de created_at
-- Asignar período basado en si el created_at cae dentro del rango de fechas del período
UPDATE public.student_lesson_grades slg
SET academic_period_id = ap.id
FROM public.academic_periods ap
WHERE slg.academic_period_id IS NULL
  AND slg.created_at >= ap.start_date 
  AND slg.created_at <= ap.end_date;

-- 12. Para registros sin período asignado (fuera de rango), asignar el período más reciente
UPDATE public.student_lesson_grades slg
SET academic_period_id = (
  SELECT id FROM public.academic_periods
  ORDER BY end_date DESC
  LIMIT 1
)
WHERE slg.academic_period_id IS NULL;

-- 13. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_slg_student_id ON public.student_lesson_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_slg_lesson_id  ON public.student_lesson_grades(lesson_id);
CREATE INDEX IF NOT EXISTS idx_slg_course_id  ON public.student_lesson_grades(course_id);
CREATE INDEX IF NOT EXISTS idx_slg_period_id  ON public.student_lesson_grades(academic_period_id);

-- 14. Agregar columna content_type a lessons si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN content_type TEXT;
  END IF;
END
$$;

-- 15. Agregar columna order_index a lessons si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;
END
$$;

-- 16. Poblar content_type y order_index desde columnas existentes
UPDATE public.lessons
SET content_type = type
WHERE content_type IS NULL AND type IS NOT NULL;

UPDATE public.lessons
SET order_index = sort_order
WHERE order_index IS NULL AND sort_order IS NOT NULL;

-- 17. Derivar content_type desde títulos para lecciones sin type
UPDATE public.lessons
SET content_type =
  CASE
    WHEN lower(title) LIKE '%taller%' THEN 'workshop'
    WHEN lower(title) LIKE '%actividad%' THEN 'activity'
    WHEN lower(title) LIKE '%tarea%' THEN 'task'
    WHEN lower(title) LIKE '%quiz%' OR lower(title) LIKE '%evaluaci%' THEN 'quiz'
    ELSE NULL
  END
WHERE content_type IS NULL;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 
  COUNT(*) AS total_filas,
  COUNT(course_id) AS con_course_id,
  COUNT(grade_type) AS con_grade_type,
  COUNT(grade) AS con_grade
FROM public.student_lesson_grades;
