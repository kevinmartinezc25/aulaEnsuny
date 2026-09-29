-- ============================================================
-- MIGRACIÓN: Sincronización de carpetas de DocCenter con Google Drive
-- Tabla: doc_folders
-- Permite almacenar el ID y la URL oficial de la carpeta física en Drive
-- ============================================================

ALTER TABLE doc_folders 
  ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_doc_folders_drive_id ON doc_folders(drive_folder_id);
