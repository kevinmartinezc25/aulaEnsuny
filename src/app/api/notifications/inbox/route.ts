import { NextResponse } from 'next/server';
import { createAdminClient } from '@/core/config/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Bypass RLS con Admin Client
    const { data, error } = await supabase
      .from('push_notification_deliveries')
      .select(`
        id,
        read_at,
        created_at,
        push_notifications (
          id,
          title,
          message,
          type,
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedData = (data || []).map((d: any) => {
      // Manejar tanto si PostgREST devuelve objeto como si devuelve array
      const p = Array.isArray(d.push_notifications) ? d.push_notifications[0] : d.push_notifications;
      return {
        id: d.id,
        title: p?.title || 'Notificación',
        message: p?.message || '',
        type: p?.type || 'INFO',
        read_at: d.read_at,
        created_at: d.created_at
      };
    });

    return NextResponse.json({ data: formattedData }, { status: 200 });
  } catch (error: any) {
    console.error('Unhandled Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
