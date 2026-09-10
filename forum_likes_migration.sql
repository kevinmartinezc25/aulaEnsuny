-- ==========================================================
-- Migración: Soporte de Likes (Me gusta) para aportaciones de foros
-- ==========================================================

-- 1. Agregar columna likes_count a la tabla forum_replies si no existe
ALTER TABLE forum_replies 
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- 2. (Opcional) Tabla para registrar qué usuario dio like a qué aportación
CREATE TABLE IF NOT EXISTS forum_reply_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- 3. Habilitar RLS para la tabla forum_reply_likes
ALTER TABLE forum_reply_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquier usuario autenticado puede ver los likes" 
ON forum_reply_likes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Los usuarios pueden dar o quitar sus propios likes" 
ON forum_reply_likes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
