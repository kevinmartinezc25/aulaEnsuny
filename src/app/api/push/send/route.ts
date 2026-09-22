import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/core/config/supabase/server';
import webPush from 'web-push';

// Configurar web-push con las llaves VAPID
webPush.setVapidDetails(
  'mailto:soporte@ensuny.edu.co',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Verificar sesión y rol
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener rol del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single();

    const roleName = (profile?.roles as any)?.name || (Array.isArray(profile?.roles) ? (profile?.roles[0] as any)?.name : null);

    if (roleName !== 'admin' && roleName !== 'superadmin' && roleName !== 'superAdmin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, url, targetAudience } = body;

    if (!title || !message || !type) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // 1. Guardar la notificación en la base de datos (usando adminSupabase para evitar RLS)
    const { data: notification, error: insertError } = await adminSupabase
      .from('push_notifications')
      .insert({
        title,
        message,
        type,
        status: 'SENDING',
        author_id: user.id,
        target_criteria: targetAudience || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando notificación:', insertError);
      return NextResponse.json({ error: 'Error guardando en BD' }, { status: 500 });
    }

    // 2. Obtener las suscripciones activas
    // Usamos adminSupabase para bypassear RLS completamente y asegurar que lea todas las BD.
    
    let query = adminSupabase.from('push_subscriptions').select('*').eq('is_active', true);
    
    // Si queremos filtrar por audiencia (ej. solo 'student'), haríamos join, pero por ahora obtenemos todos 
    // y asumimos que son notificaciones críticas globales (ej. 🚨 Urgente).
    const { data: subscriptions, error: subError } = await query;

    if (subError || !subscriptions) {
      return NextResponse.json({ error: 'Error obteniendo suscripciones' }, { status: 500 });
    }

    const payload = JSON.stringify({
      title,
      message,
      type,
      url: url || '/notifications', // TODO: Enrutar al centro de notificaciones
    });

    let successCount = 0;
    let failCount = 0;

    // Enviar a todas las suscripciones
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
        successCount++;
        
        // Registrar delivery (si la tabla de deliveries se requiere llenarla)
        await adminSupabase.from('push_notification_deliveries').insert({
          notification_id: notification.id,
          user_id: sub.user_id
        }).select();

      } catch (err: any) {
        failCount++;
        // Si el error es 410 (Gone) o 404, la suscripción ya no es válida
        if (err.statusCode === 410 || err.statusCode === 404) {
          await adminSupabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id);
        }
      }
    });

    // Esperar a que terminen todas (en Serverless limitadas a pocos segundos, esto debe hacerse rápido)
    await Promise.all(sendPromises);

    // Actualizar estado final
    await adminSupabase.from('push_notifications').update({ 
      status: 'SENT',
      sent_at: new Date().toISOString()
    }).eq('id', notification.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Notificaciones enviadas',
      stats: { successCount, failCount }
    });

  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
