-- 1. Agregar columna 'type' a la tabla 'lessons' si no existe
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'reading';

-- 2. Migrar filas existentes basándose en sus características actuales
-- Si tiene video_url, es de tipo 'video'
UPDATE public.lessons 
SET type = 'video' 
WHERE video_url IS NOT NULL;

-- Si el título contiene palabras clave de tareas, es de tipo 'task'
UPDATE public.lessons 
SET type = 'task' 
WHERE video_url IS NULL 
  AND (LOWER(title) LIKE '%tarea%' 
       OR LOWER(title) LIKE '%taller%' 
       OR LOWER(title) LIKE '%proyecto%' 
       OR LOWER(title) LIKE '%ensayo%' 
       OR LOWER(title) LIKE '%entrega%');

-- Nota: cualquier otra lección mantendrá el valor por defecto 'reading'.


-- 3. Agregar restricción UNIQUE a la tabla 'grades' para permitir upsert por estudiante, curso y categoría
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_student_course_category_key;
ALTER TABLE public.grades ADD CONSTRAINT grades_student_course_category_key UNIQUE (student_id, course_id, category_id);
