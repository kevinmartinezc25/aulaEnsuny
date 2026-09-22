'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Megaphone, AlertTriangle, CalendarDays, Send } from 'lucide-react';
import { motion } from 'framer-motion';

type NotificationType = 'URGENTE' | 'INFO' | 'EVENTO';

export default function AdminNotificationsPage() {
  const [type, setType] = useState<NotificationType>('INFO');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          message,
          targetAudience: { group: 'all' },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando la notificación');
      }

      setResult({ success: true, msg: `Notificación enviada con éxito. (${data.stats?.successCount} entregados, ${data.stats?.failCount} fallidos)` });
      setTitle('');
      setMessage('');
    } catch (error: any) {
      setResult({ success: false, msg: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunicaciones Institucionales</h1>
        <p className="text-muted-foreground mt-2">
          Envía notificaciones Push a los dispositivos de los usuarios. Utiliza esta herramienta con moderación y solo para avisos de alta importancia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Notificación</CardTitle>
          <CardDescription>Redacta el mensaje que aparecerá en el dispositivo del usuario.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Comunicación</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as NotificationType)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <RadioGroupItem value="URGENTE" id="urgente" className="peer sr-only" />
                  <Label
                    htmlFor="urgente"
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-all ${
                      type === 'URGENTE' 
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700' 
                        : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <AlertTriangle className="mb-3 h-6 w-6 text-red-500" />
                    <span className="font-semibold">Urgente</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="INFO" id="info" className="peer sr-only" />
                  <Label
                    htmlFor="info"
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-all ${
                      type === 'INFO'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-700'
                        : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Megaphone className="mb-3 h-6 w-6 text-blue-500" />
                    <span className="font-semibold text-center">Info Institucional</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="EVENTO" id="evento" className="peer sr-only" />
                  <Label
                    htmlFor="evento"
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-all ${
                      type === 'EVENTO'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700'
                        : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <CalendarDays className="mb-3 h-6 w-6 text-orange-500" />
                    <span className="font-semibold text-center">Evento / Cambio</span>
                  </Label>
                </div>

              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título de la Notificación</Label>
                <Input 
                  id="title" 
                  placeholder="Ej: Suspensión de actividades académicas" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea 
                  id="message" 
                  placeholder="Ej: Por motivos de fuerza mayor, se suspenden las clases del día de hoy..." 
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/150</p>
              </div>
            </div>

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-md text-sm ${result.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
              >
                {result.msg}
              </motion.div>
            )}

            <Button type="submit" disabled={isSubmitting || !title || !message} className="w-full sm:w-auto">
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Enviando a los dispositivos...' : 'Enviar Notificación Push'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
