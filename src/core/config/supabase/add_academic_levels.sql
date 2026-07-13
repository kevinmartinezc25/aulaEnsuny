-- Migration to add academic_levels table
CREATE TABLE IF NOT EXISTS academic_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert standard values
INSERT INTO academic_levels (name) 
VALUES ('8°'), ('9°'), ('10°'), ('11°') 
ON CONFLICT (name) DO NOTHING;
