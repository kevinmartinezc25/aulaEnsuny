import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/core/config/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar sesión del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Parsear el body de la petición
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos de la suscripción Push' }, { status: 400 });
    }

    // Upsert la suscripción en la base de datos
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

    if (dbError) {
      console.error('Error guardando suscripción:', dbError);
      return NextResponse.json({ error: 'Error interno del servidor al guardar la suscripción' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Suscripción registrada exitosamente' });

  } catch (error) {
    console.error('Error inesperado en /api/push/subscribe:', error);
    return NextResponse.json({ error: 'Error inesperado del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint es requerido' }, { status: 400 });
    }

    // Marcar como inactiva en lugar de borrar para mantener un registro, 
    // o borrarla si lo preferimos. Optamos por borrarla para mantener limpieza.
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (dbError) {
      console.error('Error eliminando suscripción:', dbError);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Suscripción eliminada exitosamente' });

  } catch (error) {
    console.error('Error inesperado en DELETE /api/push/subscribe:', error);
    return NextResponse.json({ error: 'Error inesperado del servidor' }, { status: 500 });
  }
}
