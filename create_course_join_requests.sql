CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.course_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comments TEXT
);

ALTER TABLE public.course_join_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_course_join_requests_course ON public.course_join_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_course_join_requests_student ON public.course_join_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_course_join_requests_status ON public.course_join_requests(status);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS join_code TEXT,
  ADD COLUMN IF NOT EXISTS join_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_teacher_approval BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_join_code_unique ON public.courses(join_code) WHERE join_code IS NOT NULL;

DROP POLICY IF EXISTS "Estudiantes pueden ver sus solicitudes" ON public.course_join_requests;
CREATE POLICY "Estudiantes pueden ver sus solicitudes"
ON public.course_join_requests FOR SELECT TO authenticated
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Estudiantes pueden crear solicitudes" ON public.course_join_requests;
CREATE POLICY "Estudiantes pueden crear solicitudes"
ON public.course_join_requests FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Docentes pueden ver solicitudes de sus cursos" ON public.course_join_requests;
CREATE POLICY "Docentes pueden ver solicitudes de sus cursos"
ON public.course_join_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_join_requests.course_id
      AND c.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Docentes pueden aprobar o rechazar solicitudes" ON public.course_join_requests;
CREATE POLICY "Docentes pueden aprobar o rechazar solicitudes"
ON public.course_join_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_join_requests.course_id
      AND c.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin gestion completa" ON public.course_join_requests;
CREATE POLICY "Admin gestion completa"
ON public.course_join_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  )
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de cursos para autenticados" ON public.courses;
CREATE POLICY "Lectura de cursos para autenticados"
ON public.courses FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Docentes pueden editar sus cursos" ON public.courses;
CREATE POLICY "Docentes pueden editar sus cursos"
ON public.courses FOR UPDATE TO authenticated
USING (teacher_id = auth.uid());
