-- ============================================================
-- SEED: Catálogo de Situaciones Tipo II (Faltas Graves)
-- Manual de Convivencia Escolar - Escuela Normal
-- Ejecutar en Supabase SQL Editor
-- ============================================================

INSERT INTO disciplinary_situations 
  (code, type, title, description, category, sort_order, active)
VALUES
  (
    'T2-01', 'Tipo II',
    'Chistes ofensivos o chismes',
    'Lanzar chistes de mal gusto, chismes o expresiones ofensivas que vaya en contra de los principios morales, éticos, políticos y religiosos de los demás.',
    'Convivencia y respeto', 1, true
  ),
  (
    'T2-02', 'Tipo II',
    'Reclamos descorteses o agresivos',
    'Hacer reclamos en forma descortés, altanera o agresiva.',
    'Convivencia y respeto', 2, true
  ),
  (
    'T2-03', 'Tipo II',
    'Confianzas excesivas',
    'Confianzas excesivas con compañeros o profesores dentro de la institución.',
    'Conducta en la institución', 3, true
  ),
  (
    'T2-04', 'Tipo II',
    'Escritos ofensivos en muros o papeles',
    'Expresarse en forma descortés y desmedida a través de escritos en muros, paredes y papeles que afecten los derechos de los demás.',
    'Convivencia y respeto', 4, true
  ),
  (
    'T2-05', 'Tipo II',
    'Esconder pertenencias ajenas',
    'Esconder implementos escolares o demás pertenencias ajenas.',
    'Respeto a bienes ajenos', 5, true
  ),
  (
    'T2-06', 'Tipo II',
    'Sabotear actividades institucionales',
    'Interrumpir con intención de saboteo cualquier actividad institucional.',
    'Conducta en la institución', 6, true
  ),
  (
    'T2-07', 'Tipo II',
    'Falso testimonio o mentira',
    'Emplear la mentira y los falsos testimonios, afectando el buen nombre de la persona, o evadiendo responsabilidades. Si trae consecuencias en la vida e integridad de una persona, se considerará gravísima.',
    'Honestidad y transparencia', 7, true
  ),
  (
    'T2-08', 'Tipo II',
    'Apodos, burlas o gestos ofensivos',
    'Empleo de apodos ofensivos, burlas, ademanes, gestos, posturas y expresiones irrespetuosas y/o ofensivas contra cualquier miembro de la comunidad educativa.',
    'Convivencia y respeto', 8, true
  ),
  (
    'T2-09', 'Tipo II',
    'Uso o porte de material pornográfico',
    'Llevar material pornográfico a la institución o utilizar la web para verlos.',
    'Tecnología y medios', 9, true
  ),
  (
    'T2-10', 'Tipo II',
    'Asistir bajo efectos de sustancias',
    'Presentarse a la institución bajo efectos del alcohol, sustancias alucinógenas, estupefacientes o sustancias psicoactivas, debidamente comprobado.',
    'Salud y prevención', 10, true
  ),
  (
    'T2-11', 'Tipo II',
    'Deterioro de material ajeno',
    'Dañar o deteriorar el material de los demás. La medida correctiva adoptada debe incluir el arreglo o pago del daño causado.',
    'Respeto a bienes ajenos', 11, true
  ),
  (
    'T2-12', 'Tipo II',
    'Publicación indebida de vida privada',
    'Publicar en la web u otros medios de comunicación fotografías, imágenes e información de la vida privada de miembros de la comunidad educativa sin su consentimiento.',
    'Ciberconvivencia', 12, true
  ),
  (
    'T2-13', 'Tipo II',
    'Agresión física o verbal entre compañeros',
    'Agredirse física o verbalmente con compañeros dentro de la Escuela Normal o fuera de ella portando el uniforme. Si la agresión trae consecuencias en la integridad física o moral de la persona afectada, se considerará falta gravísima y se sancionará como tal.',
    'Violencia y agresión', 13, true
  ),
  (
    'T2-14', 'Tipo II',
    'Complicidad en situaciones de convivencia',
    'Actuar como cómplice en la comisión de situaciones de convivencia.',
    'Conducta en la institución', 14, true
  ),
  (
    'T2-15', 'Tipo II',
    'Agresión a personal de la institución',
    'Agredir de hecho o de palabra a un educador, directivo, administrativo u otro personal de la Escuela Normal. Si la agresión trae consecuencias en la integridad física o moral del afectado, ésta será considerada como gravísima y se sancionará como tal.',
    'Violencia y agresión', 15, true
  ),
  (
    'T2-16', 'Tipo II',
    'Fumar en la institución o con uniforme',
    'Fumar dentro de la institución; o fuera de ella portando el uniforme.',
    'Salud y prevención', 16, true
  ),
  (
    'T2-17', 'Tipo II',
    'Fraude académico',
    'Cometer fraude en evaluaciones o pruebas escritas.',
    'Honestidad y transparencia', 17, true
  ),
  (
    'T2-18', 'Tipo II',
    'Uso de código de acceso ajeno',
    'Utilizar el código de acceso de otro(s) usuario(s) sin la debida autorización.',
    'Tecnología y medios', 18, true
  ),
  (
    'T2-19', 'Tipo II',
    'Borrar archivos de otros',
    'Borrar archivos de otros usuarios.',
    'Tecnología y medios', 19, true
  ),
  (
    'T2-20', 'Tipo II',
    'Ciberacoso o ridiculización en medios',
    'Ridiculizar a miembros de la comunidad educativa por medio de imágenes, escritos, panfletos, memes o montajes utilizando Internet u otros medios.',
    'Ciberconvivencia', 20, true
  )
ON CONFLICT (code) DO NOTHING;

-- Verificación: contar situaciones insertadas
SELECT COUNT(*) AS total_tipo2 FROM disciplinary_situations WHERE type = 'Tipo II';
