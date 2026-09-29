-- ============================================================
-- SCHEMAS FOR INSTITUTIONAL ELECTIONS MODULE
-- ============================================================

-- 1. Create enum types for Elections if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'election_type') THEN
        CREATE TYPE election_type AS ENUM ('official', 'simulation', 'survey');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'election_status') THEN
        CREATE TYPE election_status AS ENUM ('draft', 'active', 'closed');
    END IF;
END $$;

-- 2. Create elections table
CREATE TABLE IF NOT EXISTS public.elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status election_status DEFAULT 'draft'::election_status NOT NULL,
    type election_type DEFAULT 'official'::election_type NOT NULL,
    show_realtime_results BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create election_tables (Mesas electorales)
CREATE TABLE IF NOT EXISTS public.election_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    enabled_grades TEXT[] NOT NULL DEFAULT '{}', -- Array of grade levels like {'10°', '11°'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create candidates
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    proposal TEXT,
    photo_url TEXT,
    presentation TEXT,
    objectives TEXT,
    proposals TEXT,
    goals TEXT,
    video_url TEXT, -- YouTube URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(election_id, student_id),
    UNIQUE(election_id, number)
);

-- 5. Create election_attachments (Archivos adjuntos de propuestas)
CREATE TABLE IF NOT EXISTS public.election_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create jurors
CREATE TABLE IF NOT EXISTS public.jurors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.election_tables(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, table_id)
);

-- 7. Create election_voters (Trazabilidad y control del voto único)
CREATE TABLE IF NOT EXISTS public.election_voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    has_voted BOOLEAN DEFAULT false NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, election_id)
);

-- 8. Create votes (Votos anónimos para garantizar secreto de voto)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE, -- NULL indica Voto en Blanco
    table_id UUID REFERENCES public.election_tables(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create election_debates
CREATE TABLE IF NOT EXISTS public.election_debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    transmission_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create election_audit
CREATE TABLE IF NOT EXISTS public.election_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_audit ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (Allows all authenticated users to read processes, candidates, tables, debates)
CREATE POLICY "Elecciones leibles por autenticados" ON public.elections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Candidatos leibles por autenticados" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mesas leibles por autenticados" ON public.election_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Adjuntos leibles por autenticados" ON public.election_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Debates leibles por autenticados" ON public.election_debates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Jurados leibles por autenticados" ON public.jurors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Votantes leibles por autenticados" ON public.election_voters FOR SELECT TO authenticated USING (true);

-- Admins and Superadmins have full control
CREATE POLICY "Admins gestionan elecciones" ON public.elections FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan candidatos" ON public.candidates FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan mesas" ON public.election_tables FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan adjuntos" ON public.election_attachments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan debates" ON public.election_debates FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan jurados" ON public.jurors FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);
CREATE POLICY "Admins gestionan votantes" ON public.election_voters FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
);

-- Policies for VOTE registration
CREATE POLICY "Estudiantes insertan su registro de votante" ON public.election_voters FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id
);
CREATE POLICY "Estudiantes actualizan su registro de votante" ON public.election_voters FOR UPDATE TO authenticated USING (
    auth.uid() = student_id
);
CREATE POLICY "Votos insertables por autenticados" ON public.votes FOR INSERT TO authenticated WITH CHECK (
    -- Asegurar que el estudiante que vota esté registrado como habilitado en la elección correspondiente
    EXISTS (
        SELECT 1 FROM public.election_voters ev
        WHERE ev.student_id = auth.uid() AND ev.election_id = election_id AND ev.has_voted = false
    )
);
-- Admins and Jurors can read aggregated results (or individuals if election permits realtime)
CREATE POLICY "Resultados leibles por admins y jurados" ON public.votes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'superadmin'))
    OR
    EXISTS (
        SELECT 1 FROM public.elections e 
        WHERE e.id = election_id AND e.show_realtime_results = true
    )
);
