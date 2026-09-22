'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/core/config/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, AlertTriangle, CalendarDays, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'URGENTE' | 'INFO' | 'EVENTO';
  created_at: string;
};

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Obtener el historial. En un caso real masivo, podríamos unir con la tabla
      // push_notification_deliveries para ver solo las que le tocaron al usuario, 
      // y si ya fueron leídas. Por ahora mostraremos las enviadas en la plataforma.
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('status', 'SENT')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
      setLoading(false);
    };

    fetchNotifications();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'URGENTE':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'INFO':
        return <Megaphone className="h-6 w-6 text-blue-500" />;
      case 'EVENTO':
        return <CalendarDays className="h-6 w-6 text-orange-500" />;
      default:
        return <CheckCircle2 className="h-6 w-6 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Notificaciones</h1>
        <p className="text-muted-foreground mt-2">
          Historial de comunicados institucionales importantes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial Reciente</CardTitle>
          <CardDescription>Comunicaciones emitidas por la administración</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando notificaciones...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay notificaciones institucionales recientes.</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{notif.title}</h4>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {notif.message}
                    </p>
                    <div className="pt-2 text-xs text-muted-foreground">
                      {format(new Date(notif.created_at), "d 'de' MMMM, yyyy - h:mm a", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
