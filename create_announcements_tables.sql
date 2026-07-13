-- Migración para la sección de Novedades (Anuncios de Curso)

CREATE TABLE IF NOT EXISTS course_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'announcement', -- 'announcement', 'reminder', 'new_material', 'date_change', 'congratulation', 'urgent'
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    publish_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array de archivos adjuntos [{ name, url, type }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES course_announcements(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(announcement_id, student_id)
);

-- Habilitar RLS
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Políticas para course_announcements
DROP POLICY IF EXISTS "Permitir lectura de anuncios a usuarios autenticados" ON course_announcements;
CREATE POLICY "Permitir lectura de anuncios a usuarios autenticados"
ON course_announcements FOR SELECT TO authenticated
USING (publish_at <= NOW());

DROP POLICY IF EXISTS "Docentes y admin gestionan anuncios" ON course_announcements;
CREATE POLICY "Docentes y admin gestionan anuncios"
ON course_announcements FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
);

-- Políticas para announcement_reads
DROP POLICY IF EXISTS "Estudiantes ven sus lecturas" ON announcement_reads;
CREATE POLICY "Estudiantes ven sus lecturas"
ON announcement_reads FOR SELECT TO authenticated
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Estudiantes insertan lecturas" ON announcement_reads;
CREATE POLICY "Estudiantes insertan lecturas"
ON announcement_reads FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Docentes y admin ven lecturas" ON announcement_reads;
CREATE POLICY "Docentes y admin ven lecturas"
ON announcement_reads FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('teacher', 'admin')
    )
);
