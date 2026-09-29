-- ==============================================================================
-- SCRIPT DE LIMPIEZA DE DATOS DE PRUEBA: Convivencia y Permisos Docentes
-- Plataforma: aulaEnsuny - Escuela Normal Superior del Nordeste
-- ==============================================================================
-- Este script elimina de forma segura y transaccional todos los registros de prueba
-- generados en los módulos de Convivencia y Permisos Docentes, preservando los
-- catálogos oficiales y reiniciando el consecutivo de radicación institucional.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. DIAGNÓSTICO PREVIO (Visualización de datos antes del borrado)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_reports_count INT;
  v_perm_count INT;
BEGIN
  SELECT count(*) INTO v_reports_count FROM public.disciplinary_reports;
  SELECT count(*) INTO v_perm_count FROM public.permission_requests;
  RAISE NOTICE 'Iniciando depuración... Reportes de convivencia: %, Solicitudes de permisos: %', v_reports_count, v_perm_count;
END $$;

-- ------------------------------------------------------------------------------
-- 2. LIMPIEZA DEL MÓDULO DE CONVIVENCIA ESCOLAR
-- ------------------------------------------------------------------------------

-- 2.1 Eliminar historial de estados y notas de seguimiento
DELETE FROM public.disciplinary_report_history;

-- 2.2 Eliminar todos los reportes disciplinarios operativos de prueba
DELETE FROM public.disciplinary_reports;

-- ------------------------------------------------------------------------------
-- 3. LIMPIEZA DEL MÓDULO DE PERMISOS DOCENTES
-- ------------------------------------------------------------------------------

-- 3.1 Eliminar historial y auditoría de decisiones/aprobaciones
DELETE FROM public.permission_request_history;

-- 3.2 Eliminar todas las solicitudes de permisos de prueba
DELETE FROM public.permission_requests;

-- 3.3 Reiniciar secuencia oficial de radicado para comenzar en PER-YYYY-0001
ALTER SEQUENCE IF EXISTS public.seq_permission_request_number RESTART WITH 1;

-- 3.4 Purgar tipos de permisos ficticios/temporales creados durante las pruebas
-- (Se conservan exclusivamente los 9 tipos institucionales oficiales)
DELETE FROM public.permission_types 
WHERE code NOT IN (
  'CALAMIDAD',
  'CITA_MEDICA',
  'CITA_ODONTOLOGICA',
  'INCAPACIDAD',
  'ASUNTO_PERSONAL',
  'CAPACITACION',
  'REPRESENTACION',
  'LICENCIA',
  'OTRO'
);

-- Asegurar que los tipos oficiales se mantengan activos y con su ordenación correcta
UPDATE public.permission_types SET active = true WHERE active = false;

-- ------------------------------------------------------------------------------
-- 4. LIMPIEZA DE OBJETOS EN STORAGE (Firmas y Adjuntos de Prueba)
-- ------------------------------------------------------------------------------
-- Si existen archivos cargados en el bucket 'signatures' de Supabase Storage:
DELETE FROM storage.objects 
WHERE bucket_id = 'signatures';

-- ------------------------------------------------------------------------------
-- 5. COMPROBACIÓN POSTERIOR DE INTEGRIDAD
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_rem_reports INT;
  v_rem_rep_hist INT;
  v_rem_perm INT;
  v_rem_perm_hist INT;
  v_rem_types INT;
  v_rem_situations INT;
BEGIN
  SELECT count(*) INTO v_rem_reports FROM public.disciplinary_reports;
  SELECT count(*) INTO v_rem_rep_hist FROM public.disciplinary_report_history;
  SELECT count(*) INTO v_rem_perm FROM public.permission_requests;
  SELECT count(*) INTO v_rem_perm_hist FROM public.permission_request_history;
  SELECT count(*) INTO v_rem_types FROM public.permission_types;
  SELECT count(*) INTO v_rem_situations FROM public.disciplinary_situations;

  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'RESULTADO DE LA LIMPIEZA DE DATOS DE PRUEBA:';
  RAISE NOTICE '  - Reportes de Convivencia restantes:      % (Esperado: 0)', v_rem_reports;
  RAISE NOTICE '  - Historial de Convivencia restante:      % (Esperado: 0)', v_rem_rep_hist;
  RAISE NOTICE '  - Solicitudes de Permisos restantes:      % (Esperado: 0)', v_rem_perm;
  RAISE NOTICE '  - Historial de Permisos restante:         % (Esperado: 0)', v_rem_perm_hist;
  RAISE NOTICE '  - Tipos de Permisos oficiales preservados:% (Esperado: 9)', v_rem_types;
  RAISE NOTICE '  - Situaciones de Convivencia preservadas: %', v_rem_situations;
  RAISE NOTICE '===========================================================';
END $$;

COMMIT;
