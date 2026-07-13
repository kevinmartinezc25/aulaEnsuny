const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3NTkyOCwiZXhwIjoyMDk1NTUxOTI4fQ.qodaEzP1w8JtykupmF32-bfKp2gz4g_TtOY2232jyQk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulación de NotificationProvider para el script
class MockNotificationProvider {
  async sendEmail(options) {
    console.log(`\n=========================================`);
    console.log(`[EMAIL SEND] Para: ${options.to}`);
    console.log(`[EMAIL SEND] Asunto: ${options.subject}`);
    console.log(`[EMAIL SEND] Contenido HTML:\n${options.html}`);
    console.log(`=========================================\n`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }
}

async function sendWeeklySummary() {
  console.log('Generando resumen semanal de Agenda Institucional...');

  // 1. Obtener docentes
  const { data: teachers, error: tErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role_id')
    .eq('role_id', '1c7c0f79-8cb1-4fb1-82f5-d2e540ece965'); // Teacher role
  
  if (tErr || !teachers) {
    console.error('Error al obtener docentes:', tErr);
    return;
  }

  // 2. Obtener eventos de la próxima semana
  // Simularemos eventos para la semana del 8 de Febrero de 2027
  const startRange = new Date(2027, 1, 8, 0, 0, 0).toISOString();
  const endRange = new Date(2027, 1, 14, 23, 59, 59).toISOString();

  const { data: events, error: eErr } = await supabase
    .from('events')
    .select(`
      *,
      event_responsibles (
        user_id,
        profiles (first_name, last_name)
      )
    `)
    .gte('start_date', startRange)
    .lte('start_date', endRange)
    .order('start_date', { ascending: true });

  // Si la BD no tiene eventos aún, usaremos unos estáticos para la demostración
  const demoEvents = events && events.length > 0 ? events : [
    {
      title: 'Consejo Académico',
      start_date: new Date(2027, 1, 8, 8, 0).toISOString(),
      event_responsibles: [{ profiles: { first_name: 'Rector', last_name: '' } }, { profiles: { first_name: 'Coordinador', last_name: '' } }]
    },
    {
      title: 'Izada de Bandera',
      start_date: new Date(2027, 1, 9, 7, 0).toISOString(),
      event_responsibles: [{ profiles: { first_name: 'Coordinación', last_name: '' } }]
    },
    {
      title: 'Capacitación LMS',
      start_date: new Date(2027, 1, 10, 10, 30).toISOString(),
      event_responsibles: []
    }
  ];

  // 3. Generar cuerpo del correo para cada docente
  const mailProvider = new MockNotificationProvider();

  for (const doc of teachers) {
    const teacherName = `${doc.first_name} ${doc.last_name}`;
    const emailTo = doc.email || 'alejandro.docente@ensuny.edu.co'; // Fallback a correo institucional

    // Construcción del HTML
    let eventsHtml = '';
    
    // Agrupar por día
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const grouped = {};
    demoEvents.forEach(e => {
      const dayName = days[new Date(e.start_date).getDay()];
      if (!grouped[dayName]) grouped[dayName] = [];
      grouped[dayName].push(e);
    });

    Object.entries(grouped).forEach(([day, dayEvents]) => {
      eventsHtml += `<h3 style="color: #1e293b; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">${day}</h3>`;
      dayEvents.forEach(ev => {
        const timeStr = new Date(ev.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
        const respNames = ev.event_responsibles.map(r => r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}`.trim() : '').filter(Boolean).join(', ');
        
        eventsHtml += `
          <div style="margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b;">${timeStr}</p>
            <p style="margin: 3px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${ev.title}</p>
            ${respNames ? `<p style="margin: 0; font-size: 11px; color: #64748b;">Responsables: ${respNames}</p>` : ''}
          </div>
        `;
      });
    });

    const fullHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 10px;">Agenda Institucional - Próxima Semana</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">Hola <strong>${teacherName}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Estas son las actividades programadas para la próxima semana:</p>
        
        ${eventsHtml}
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="http://localhost:3000/teacher/institutional-agenda" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: bold; text-decoration: none; border-radius: 10px; display: inline-block;">Ver agenda completa</a>
        </div>
      </div>
    `;

    await mailProvider.sendEmail({
      to: emailTo,
      subject: 'Agenda Institucional - Próxima Semana',
      html: fullHtml
    });
  }
}

sendWeeklySummary();
