-- ============================================================
-- SEED: Catálogo de Situaciones Tipo I (Faltas Leves)
-- Manual de Convivencia Escolar - Escuela Normal
-- Ejecutar en Supabase SQL Editor
-- ============================================================

INSERT INTO disciplinary_situations 
  (code, type, title, description, category, sort_order, active)
VALUES
  (
    'T1-01', 'Tipo I',
    'Juegos de azar, negocios y compraventas no autorizados',
    'Realizar toda clase de juegos de azar, negocios, compraventas dentro de la Escuela Normal. Cuando se trate de actividades para beneficio institucional, deben estar autorizadas previamente por el rector.',
    'Conducta en la institución', 1, true
  ),
  (
    'T1-02', 'Tipo I',
    'Permanencia no autorizada después de clases',
    'Permanecer en la institución después de culminada sus labores académicas sin previa autorización.',
    'Conducta en la institución', 2, true
  ),
  (
    'T1-03', 'Tipo I',
    'Interrupciones verbales durante clases o actividades',
    'Conversaciones, silbidos o gritos esporádicos que interrumpan el normal desarrollo de las clases o actividades extracurriculares.',
    'Convivencia escolar', 3, true
  ),
  (
    'T1-04', 'Tipo I',
    'Desórdenes en formaciones y actos generales',
    'Desórdenes en formaciones y actos generales de la comunidad.',
    'Convivencia escolar', 4, true
  ),
  (
    'T1-05', 'Tipo I',
    'Comer en clase sin autorización',
    'Comer en horas de clase sin autorización previa.',
    'Conducta en aula', 5, true
  ),
  (
    'T1-06', 'Tipo I',
    'Uso indebido de chicles',
    'Hacer uso indebido de chicles en la institución y actos programados por la Escuela Normal.',
    'Conducta en la institución', 6, true
  ),
  (
    'T1-07', 'Tipo I',
    'Abandono de envases en espacios comunes',
    'Llevar envases y dejarlos abandonados en los corredores, salones, baños, jardineras o cualquier otro sitio de la institución que no sea la tienda escolar.',
    'Aseo y cuidado', 7, true
  ),
  (
    'T1-08', 'Tipo I',
    'Arrojar basuras en zonas comunes',
    'Arrojar basuras en los corredores, patios y aulas de clase.',
    'Aseo y cuidado', 8, true
  ),
  (
    'T1-09', 'Tipo I',
    'Uso inadecuado del uniforme',
    'Usar inadecuadamente el uniforme dentro y fuera de la institución.',
    'Presentación personal', 9, true
  ),
  (
    'T1-10', 'Tipo I',
    'Permanecer en aulas durante descansos',
    'Permanecer en las aulas durante los descansos.',
    'Conducta en la institución', 10, true
  ),
  (
    'T1-11', 'Tipo I',
    'Uso indebido del enmallado institucional',
    'Utilizar el enmallado que cerca la institución para entrar o salir de ella.',
    'Conducta en la institución', 11, true
  ),
  (
    'T1-12', 'Tipo I',
    'Permanecer fuera de clase sin autorización',
    'Permanecer fuera de clase sin autorización.',
    'Asistencia y puntualidad', 12, true
  ),
  (
    'T1-13', 'Tipo I',
    'Realizar actividades diferentes a las propuestas en clase',
    'Realizar actividades diferentes a las propuestas en clase.',
    'Conducta en aula', 13, true
  ),
  (
    'T1-14', 'Tipo I',
    'Impuntualidad a actividades institucionales sin justificación',
    'Impuntualidad a las actividades institucionales sin justificación.',
    'Asistencia y puntualidad', 14, true
  ),
  (
    'T1-15', 'Tipo I',
    'Incumplimiento del decálogo de dispositivos electrónicos',
    'Incumplir al decálogo de uso de dispositivos electrónicos.',
    'Tecnología', 15, true
  ),
  (
    'T1-16', 'Tipo I',
    'Incitar o provocar desórdenes en aula',
    'Incitar o provocar desórdenes y mal comportamiento en el aula de clase.',
    'Convivencia escolar', 16, true
  ),
  (
    'T1-17', 'Tipo I',
    'Uso de vocabulario soez',
    'Emplear un vocabulario soez dentro y fuera de la institución.',
    'Convivencia escolar', 17, true
  ),
  (
    'T1-18', 'Tipo I',
    'Uso inadecuado de muebles escolares',
    'Sentarse o pararse sobre los escritorios y mesas de pin-pong; o pararse en las sillas.',
    'Conducta en la institución', 18, true
  ),
  (
    'T1-19', 'Tipo I',
    'Difundir información distorsionada sobre la institución',
    'Indisponer la comunidad educativa en contra de la Escuela Normal llevando y trayendo información distorsionada.',
    'Convivencia escolar', 19, true
  ),
  (
    'T1-20', 'Tipo I',
    'Irresponsabilidad en el aseo del aula',
    'Irresponsabilidad en el aseo del aula asignado por el director de grupo.',
    'Aseo y cuidado', 20, true
  ),
  (
    'T1-21', 'Tipo I',
    'Inasistencias frecuentes sin justificación',
    'Faltar frecuentemente a clase sin constancia médica o excusa justificada del padre de familia.',
    'Asistencia y puntualidad', 21, true
  ),
  (
    'T1-22', 'Tipo I',
    'Portar uniforme fuera de horario sin justificación',
    'Permanecer con el uniforme hasta altas horas después de terminar la jornada de estudio sin causa justificada.',
    'Presentación personal', 22, true
  ),
  (
    'T1-23', 'Tipo I',
    'Ingreso no autorizado a espacios restringidos',
    'Entrar al laboratorio, sala de sistemas, de audiovisuales, aula taller de matemáticas, sala de profesores, rectoría, aula de apoyo, oficina de asesoría psicológica y coordinación sin la autorización de la persona competente.',
    'Conducta en la institución', 23, true
  ),
  (
    'T1-24', 'Tipo I',
    'Participar o inducir desórdenes dentro y fuera de la institución',
    'Participar en desórdenes dentro y fuera de la Normal, o de inducir a otras personas a ello.',
    'Convivencia escolar', 24, true
  ),
  (
    'T1-25', 'Tipo I',
    'Obstaculizar el trabajo de los compañeros',
    'Obstaculizar el trabajo y las actividades de los demás compañeros con charlas, juegos, visita a otras aulas a través de las ventanas o de las puertas.',
    'Conducta en aula', 25, true
  ),
  (
    'T1-26', 'Tipo I',
    'Tres llegadas tarde en el mismo período sin justa causa',
    'Llegar tarde tres (3) veces durante el mismo periodo sin justa causa.',
    'Asistencia y puntualidad', 26, true
  ),
  (
    'T1-27', 'Tipo I',
    'Uso no académico de recursos de informática',
    'Utilizar en clase los recursos de las Aulas de Informática para fines no académicos. Por ejemplo: chatear, navegar en páginas no autorizadas, reenviar cadenas de correo electrónico, reproducir videos o música cuando estos no hacen parte de una clase.',
    'Tecnología', 27, true
  ),
  (
    'T1-28', 'Tipo I',
    'Comportamientos interferentes hacia otros usuarios',
    'Perturbar el trabajo de otros usuarios con comportamientos interferentes.',
    'Tecnología', 28, true
  ),
  (
    'T1-29', 'Tipo I',
    'Desacatar procedimientos de las Aulas de Informática',
    'Desacatar los procedimientos establecidos por la Institución para el uso de las Aulas de Informática.',
    'Tecnología', 29, true
  ),
  (
    'T1-30', 'Tipo I',
    'Descarga de software no autorizado',
    'Descargar cualquier software de Internet, sin la debida autorización y sin la presencia de un profesor.',
    'Tecnología', 30, true
  ),
  (
    'T1-31', 'Tipo I',
    'Modificar la configuración de los computadores',
    'Modificar la configuración de los computadores.',
    'Tecnología', 31, true
  ),
  (
    'T1-32', 'Tipo I',
    'Retirarse de la institución sin autorización',
    'Retirarse de la institución sin autorización de los directivos docentes.',
    'Asistencia y puntualidad', 32, true
  ),
  (
    'T1-33', 'Tipo I',
    'Reincidencia en llegadas tarde (más de tres en el período)',
    'La reincidencia en más de tres llegadas tarde sin justificación escrita por el padre de familia, durante un periodo académico.',
    'Asistencia y puntualidad', 33, true
  ),
  (
    'T1-34', 'Tipo I',
    'Menospreciar los símbolos patrios o institucionales',
    'Menospreciar o ultrajar los símbolos patrios, de la institución, el municipio o el departamento.',
    'Convivencia escolar', 34, true
  ),
  (
    'T1-35', 'Tipo I',
    'Deterioro de bienes institucionales',
    'Deteriorar muebles, enseres y paredes de la institución. Las acciones correctivas deben incluir la reparación del daño causado.',
    'Aseo y cuidado', 35, true
  ),
  (
    'T1-36', 'Tipo I',
    'Tirar objetos o basura por las ventanas',
    'Tirar objetos o basura por las ventanas de las aulas de clase.',
    'Aseo y cuidado', 36, true
  ),
  (
    'T1-37', 'Tipo I',
    'Instalar o desinstalar software sin autorización',
    'Instalar o desinstalar software en equipos y servidores de la Institución, sin la debida autorización y sin la presencia de un profesor.',
    'Tecnología', 37, true
  ),
  (
    'T1-38', 'Tipo I',
    'Faltar a la práctica pedagógica sin causa justificada',
    'Faltar a la práctica pedagógica sin causa justificada.',
    'Asistencia y puntualidad', 38, true
  )
ON CONFLICT (code) DO NOTHING;

-- Verificación: contar situaciones insertadas
SELECT COUNT(*) AS total_tipo1 FROM disciplinary_situations WHERE type = 'Tipo I';
