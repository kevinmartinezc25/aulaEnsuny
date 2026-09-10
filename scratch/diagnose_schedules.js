require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runDiagnostic() {
  console.log('====================================================');
  console.log('   DIAGNÓSTICO INTEGRAL DEL MÓDULO DE HORARIOS');
  console.log('====================================================\n');

  // 1. RESTRICCIONES Y REGLAS EN BD
  console.log('--- 1. ESTADO DE REGLAS Y CONFIGURACIONES (sch_constraints) ---');
  const { data: constraints, error: cErr } = await supabase.from('sch_constraints').select('*');
  if (cErr) {
    console.error('Error al consultar sch_constraints:', cErr.message);
  } else {
    console.log(`Total reglas en sch_constraints: ${constraints.length}`);
    constraints.forEach(c => {
      console.log(`- Regla: [${c.rule_type}] | Activa: ${c.is_active} | Peso: ${c.weight} | Target: ${c.target_entity_type || 'GLOBAL'}:${c.target_entity_id || 'TODOS'}`);
      if (c.parameters) {
        console.log(`  Parámetros:`, JSON.stringify(c.parameters));
      }
    });
  }

  // 2. DISPONIBILIDAD Y TIME-OFF
  console.log('\n--- 2. RESTRICCIONES DE DISPONIBILIDAD (sch_time_off) ---');
  const { data: timeOff, error: tErr } = await supabase.from('sch_time_off').select('*');
  if (tErr) {
    console.error('Error consultando sch_time_off:', tErr.message);
  } else {
    console.log(`Total registros en sch_time_off: ${timeOff.length}`);
    const forbidden = timeOff.filter(t => t.status === 'FORBIDDEN').length;
    const discouraged = timeOff.filter(t => t.status === 'DISCOURAGED').length;
    console.log(`- Prohibidos (FORBIDDEN): ${forbidden}`);
    console.log(`- Desalentados (DISCOURAGED): ${discouraged}`);
  }

  // 3. MALLA CURRICULAR (sch_curriculum)
  console.log('\n--- 3. MALLA CURRICULAR Y CARGA LECTIVA ---');
  const { data: curr, error: currErr } = await supabase.from('sch_curriculum').select('*, subject:sch_subjects(name), group:sch_groups(name), teacher:profiles(first_name, last_name)');
  if (currErr) {
    console.error('Error consultando sch_curriculum:', currErr.message);
  } else {
    console.log(`Total filas en sch_curriculum: ${curr.length}`);
    let totalCurriculumHours = 0;
    let missingTeacherRows = 0;
    let missingGroupRows = 0;
    const teacherWorkloads = new Map();

    curr.forEach(c => {
      totalCurriculumHours += c.hours_per_week || 0;
      if (!c.teacher_id) missingTeacherRows++;
      if (!c.group_id) missingGroupRows++;
      if (c.teacher_id) {
        teacherWorkloads.set(c.teacher_id, (teacherWorkloads.get(c.teacher_id) || 0) + (c.hours_per_week || 0));
      }
    });

    console.log(`Total horas semanales requeridas en malla: ${totalCurriculumHours}h`);
    console.log(`Filas sin docente titular: ${missingTeacherRows}`);
    console.log(`Filas sin grupo: ${missingGroupRows}`);
    console.log(`Docentes con carga asignada: ${teacherWorkloads.size}`);
    
    // Top 5 docentes con más horas
    const sortedTeachers = Array.from(teacherWorkloads.entries()).sort((a, b) => b[1] - a[1]);
    console.log('Top docentes con mayor carga lectiva:');
    sortedTeachers.slice(0, 7).forEach(([tId, hours]) => {
      const match = curr.find(c => c.teacher_id === tId);
      const name = match?.teacher ? `${match.teacher.first_name} ${match.teacher.last_name}` : tId;
      console.log(`  * ${name}: ${hours} horas/semana`);
    });
  }

  // 4. SLOTS ACTUALES EN HORARIOS (sch_schedule_slots) Y DETECCIÓN DE CRUCES
  console.log('\n--- 4. SLOTS GUARDADOS EN HORARIO (sch_schedule_slots) Y CRUCES ---');
  const { data: slots, error: sErr } = await supabase
    .from('sch_schedule_slots')
    .select('*, group:sch_groups(name), teacher:profiles(first_name, last_name), subject:sch_subjects(name)');

  if (sErr) {
    console.error('Error consultando sch_schedule_slots:', sErr.message);
  } else {
    console.log(`Total slots guardados en BD: ${slots.length}`);
    let totalScheduledHours = 0;
    slots.forEach(s => totalScheduledHours += (s.duration || 1));
    console.log(`Total horas programadas en slots: ${totalScheduledHours}h`);

    // A. Cruces de Docente (Teacher Overlap)
    const teacherSlotsMap = new Map();
    // B. Cruces de Grupo (Group Overlap)
    const groupSlotsMap = new Map();
    // C. Cruces de Aula (Classroom Overlap)
    const roomSlotsMap = new Map();

    const normalWorkloadConstraint = (constraints || []).find(c => c.rule_type === 'MULTI_TEACHER_WORKLOAD_CONFIG');
    const normalSubjIds = new Set(normalWorkloadConstraint?.parameters?.normal_workload_subject_ids || []);

    slots.forEach(s => {
      const dur = s.duration || 1;
      for (let i = 0; i < dur; i++) {
        const period = s.period_id + i;
        // Teacher
        if (s.teacher_id && !normalSubjIds.has(s.subject_id)) {
          const tKey = `${s.teacher_id}#${s.day_of_week}#${period}`;
          if (!teacherSlotsMap.has(tKey)) teacherSlotsMap.set(tKey, []);
          teacherSlotsMap.get(tKey).push(s);
        }
        // Group
        if (s.group_id) {
          const gKey = `${s.group_id}#${s.day_of_week}#${period}`;
          if (!groupSlotsMap.has(gKey)) groupSlotsMap.set(gKey, []);
          groupSlotsMap.get(gKey).push(s);
        }
        // Classroom
        if (s.classroom_id) {
          const rKey = `${s.classroom_id}#${s.day_of_week}#${period}`;
          if (!roomSlotsMap.has(rKey)) roomSlotsMap.set(rKey, []);
          roomSlotsMap.get(rKey).push(s);
        }
      }
    });

    // Analizar cruces de docente
    const teacherClashes = [];
    for (const [key, list] of teacherSlotsMap.entries()) {
      if (list.length > 1) {
        teacherClashes.push({ key, slots: list });
      }
    }
    console.log(`\n[CRUCES DE DOCENTE]: ${teacherClashes.length} periodos con superposición`);
    teacherClashes.slice(0, 5).forEach(c => {
      const [tId, day, p] = c.key.split('#');
      const tName = c.slots[0].teacher ? `${c.slots[0].teacher.first_name} ${c.slots[0].teacher.last_name}` : tId;
      console.log(`  ⚠️ Docente "${tName}" tiene ${c.slots.length} clases el ${day} Periodo ${p}:`);
      c.slots.forEach(s => {
        console.log(`     - Grupo: ${s.group?.name || s.group_id} | Materia: ${s.subject?.name || s.subject_id}`);
      });
    });

    // Analizar cruces de grupo
    const groupClashes = [];
    for (const [key, list] of groupSlotsMap.entries()) {
      if (list.length > 1) {
        // Ignorar si es la misma materia (co-docencia permitida)
        const firstSubj = list[0].subject_id;
        const diffSubj = list.some(s => s.subject_id !== firstSubj);
        if (diffSubj) {
          groupClashes.push({ key, slots: list });
        }
      }
    }
    console.log(`\n[CRUCES DE GRUPO]: ${groupClashes.length} periodos con materias distintas simultáneas`);
    groupClashes.slice(0, 5).forEach(c => {
      const [gId, day, p] = c.key.split('#');
      const gName = c.slots[0].group?.name || gId;
      console.log(`  ⚠️ Grupo "${gName}" tiene ${c.slots.length} clases diferentes el ${day} Periodo ${p}:`);
      c.slots.forEach(s => {
        console.log(`     - Materia: ${s.subject?.name || s.subject_id} | Docente: ${s.teacher?.first_name || ''} ${s.teacher?.last_name || ''}`);
      });
    });

    // Analizar violaciones de Time-Off
    let timeOffViolations = 0;
    slots.forEach(s => {
      const dur = s.duration || 1;
      for (let i = 0; i < dur; i++) {
        const period = s.period_id + i;
        const bad = (timeOff || []).find(t => 
          t.status === 'FORBIDDEN' &&
          t.day_of_week === s.day_of_week &&
          t.period_id === period &&
          (t.entity_id === s.teacher_id || t.entity_id === s.group_id || t.entity_id === s.classroom_id)
        );
        if (bad) timeOffViolations++;
      }
    });
    console.log(`\n[VIOLACIONES DE DISPONIBILIDAD TIME-OFF]: ${timeOffViolations} slots en horario prohibido`);

    // D. Carga faltante vs programada
    console.log('\n--- 5. BALANCE CURRICULUM VS SLOTS PROGRAMADOS ---');
    const scheduledCountMap = new Map();
    slots.forEach(s => {
      const key = `${s.group_id}#${s.subject_id}#${s.teacher_id}`;
      scheduledCountMap.set(key, (scheduledCountMap.get(key) || 0) + (s.duration || 1));
    });

    let totalMissingHours = 0;
    let missingEntriesCount = 0;
    const missingDetails = [];

    curr.forEach(c => {
      if (!c.group_id || !c.teacher_id || !c.hours_per_week) return;
      const key = `${c.group_id}#${c.subject_id}#${c.teacher_id}`;
      const scheduled = scheduledCountMap.get(key) || 0;
      const diff = c.hours_per_week - scheduled;
      if (diff > 0) {
        totalMissingHours += diff;
        missingEntriesCount++;
        missingDetails.push({
          group: c.group?.name || c.group_id,
          subject: c.subject?.name || c.subject_id,
          teacher: c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : c.teacher_id,
          required: c.hours_per_week,
          scheduled,
          missing: diff
        });
      }
    });

    console.log(`Total asignaturas/bloques con horas faltantes: ${missingEntriesCount}`);
    console.log(`Total horas de clase que se quedaron sin programar: ${totalMissingHours}h`);
    if (missingDetails.length > 0) {
      console.log('Muestra de bloques faltantes:');
      missingDetails.slice(0, 10).forEach(m => {
        console.log(`  ❌ [${m.group}] ${m.subject} (Docente: ${m.teacher}) -> Req: ${m.required}h, Asig: ${m.scheduled}h, Faltan: ${m.missing}h`);
      });
    }
  }

  console.log('\n====================================================');
  console.log('   FIN DEL DIAGNÓSTICO EN BD');
  console.log('====================================================');
}

runDiagnostic().catch(console.error);
