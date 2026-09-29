-- Migration to support custom manual responsibles and tags in the institutional agenda

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS custom_responsibles TEXT[] DEFAULT '{}';
