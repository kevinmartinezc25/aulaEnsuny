-- Migration to add resources, compliance, and observations columns to public.events
-- Execute this script in the Supabase SQL Editor.

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS resources TEXT,
ADD COLUMN IF NOT EXISTS compliance VARCHAR(50) DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS observations TEXT;
