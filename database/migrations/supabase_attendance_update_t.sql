-- Script de actualización para permitir el estado 'T' (Llegada tarde) en assisted_attendance
-- Si tu base de datos ya fue inicializada, ejecuta este bloque en el SQL Editor de Supabase:

ALTER TABLE public.assisted_attendance 
  DROP CONSTRAINT IF EXISTS assisted_attendance_status_check;

ALTER TABLE public.assisted_attendance 
  ADD CONSTRAINT assisted_attendance_status_check 
  CHECK (status IN ('A', 'I', 'E', 'T'));
