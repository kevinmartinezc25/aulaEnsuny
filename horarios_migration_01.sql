-- ============================================================
-- MIGRACIÓN 01: HorarioEnsuny - Core de Entidades y Catálogos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de Docentes
CREATE TABLE IF NOT EXISTS sch_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    max_hours INTEGER NOT NULL DEFAULT 40,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Materias
CREATE TABLE IF NOT EXISTS sch_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(30) DEFAULT '#4A90E2',
    requires_lab BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Grupos
CREATE TABLE IF NOT EXISTS sch_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Salones
CREATE TABLE IF NOT EXISTS sch_classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER DEFAULT 30,
    is_lab BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE sch_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sch_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sch_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sch_classrooms ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para Admin (asumiendo que solo administradores configuran el motor por ahora)
-- Puedes ajustar esto según la necesidad de la plataforma
CREATE POLICY "Enable ALL for authenticated users" ON sch_teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON sch_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON sch_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON sch_classrooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
