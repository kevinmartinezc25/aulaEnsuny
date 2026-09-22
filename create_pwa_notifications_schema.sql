-- Crear tabla para almacenar las suscripciones Push de los dispositivos
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para push_subscriptions
-- Usuarios pueden insertar sus propias suscripciones
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden leer sus propias suscripciones
CREATE POLICY "Users can view their own push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias suscripciones (ej. desactivarlas)
CREATE POLICY "Users can update their own push subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admin y superAdmin pueden leer todas las suscripciones (útil para la edge function y métricas)
CREATE POLICY "Admins can view all push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() 
            AND r.name IN ('admin', 'superAdmin')
        )
    );

-- Crear enum para los tipos de notificación
DO $$ BEGIN
    CREATE TYPE push_notification_type AS ENUM ('URGENTE', 'INFO', 'EVENTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear enum para el estado de la notificación
DO $$ BEGIN
    CREATE TYPE push_notification_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla para el historial de notificaciones
CREATE TABLE IF NOT EXISTS public.push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type push_notification_type NOT NULL,
    status push_notification_status NOT NULL DEFAULT 'DRAFT',
    target_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para push_notifications (Gestión administrativa)
-- Solo admin y superAdmin pueden gestionar notificaciones
CREATE POLICY "Admins can manage push notifications"
    ON public.push_notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() 
            AND r.name IN ('admin', 'superAdmin')
        )
    );

-- Lectura para usuarios (Centro de notificaciones - Solo las enviadas que apliquen a ellos)
-- NOTA: Esta política es simplificada. La lógica real para determinar si un usuario específico 
-- es destinatario basado en target_criteria puede ser compleja en RLS y es mejor manejarla
-- creando una tabla cruzada 'push_notification_deliveries' al momento de enviar, o 
-- filtrando por roles/grados directamente si el JSONB es sencillo. 
-- Para este schema, crearemos la tabla cruzada.

CREATE TABLE IF NOT EXISTS public.push_notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(notification_id, user_id)
);

-- Habilitar RLS en push_notification_deliveries
ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias entregas de notificación
CREATE POLICY "Users can view their notification deliveries"
    ON public.push_notification_deliveries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Usuarios pueden actualizar sus entregas (marcar como leídas)
CREATE POLICY "Users can update their notification deliveries"
    ON public.push_notification_deliveries
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins pueden gestionar todas las entregas
CREATE POLICY "Admins can manage notification deliveries"
    ON public.push_notification_deliveries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() 
            AND r.name IN ('admin', 'superAdmin')
        )
    );

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_notifications_updated_at ON public.push_notifications;
CREATE TRIGGER update_push_notifications_updated_at
    BEFORE UPDATE ON public.push_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
