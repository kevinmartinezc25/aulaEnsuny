import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext } from '../src/app/admin/schedules/engine/types';

async function diagnose() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase.from('sch_curriculum')
    .select('*, group:sch_groups(name), subject:sch_subjects(name, is_academic_workload)');
  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');

  const context: RuleContext = {
    constraints: (constraintsData || []).map((c: any) => ({
      ruleType: c.rule_type,
      targetEntityType: c.target_entity_type,
      targetEntityId: c.target_entity_id,
      parameters: c.parameters,
      weight: c.weight,
      isActive: c.is_active
    })),
    timeOff: (timeOffData || []).map((t: any) => ({
      teacherId: t.entity_type === 'TEACHER' ? t.entity_id : undefined,
      groupId: t.entity_type === 'GROUP' ? t.entity_id : undefined,
      classroomId: t.entity_type === 'CLASSROOM' ? t.entity_id : undefined,
      dayOfWeek: t.day_of_week,
      periodId: t.period_id,
      status: t.status
    })),
    maxPeriodsPerDay: 7,
    breakPeriods: [4]
  };

  const blocksToAssign: any[] = [];
  const slotCounters = new Map<string, number>();
  currData?.forEach((c: any) => {
    if (!c.group_id || !c.teacher_id) return;
    let hoursLeft = c.hours_per_week;
    const counterKey = c.group_id + '-' + c.subject_id + '-' + c.teacher_id;
    let slotIdx = slotCounters.get(counterKey) || 0;
    while (hoursLeft > 0) {
      blocksToAssign.push({
        subject_id: c.subject_id,
        teacher_id: c.teacher_id,
        group_id: c.group_id,
        group_name: c.group?.name,
        subject_name: c.subject?.name,
        is_academic_workload: c.subject?.is_academic_workload,
        duration: 1,
        slotIndex: slotIdx++
      });
      hoursLeft -= 1;
    }
    slotCounters.set(counterKey, slotIdx);
  });

  const comiteBlocks = blocksToAssign.filter(b => b.subject_id === '5772b40c-5143-47d1-99d1-09c845526636');
  console.log('Total Comite blocksToAssign:', comiteBlocks.length);
  comiteBlocks.forEach(b => {
    console.log(`Teacher: ${b.teacher_id.substring(0,8)} | SlotIdx: ${b.slotIndex}`);
  });

  const generator = new ScheduleGenerator();
  const config: GeneratorConfig = {
    curriculum: blocksToAssign,
    context,
    days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    periodsPerDay: 7,
    breakPeriods: [4],
    groupPeriods: {}
  };

  const result = await generator.generate(config);
  const comiteScheduled = result.schedule.filter(s => s.subjectId === '5772b40c-5143-47d1-99d1-09c845526636');
  console.log('\nComite Scheduled Sessions:');
  comiteScheduled.forEach(s => {
    console.log(`Teacher: ${s.teacherId?.substring(0,8)} | Day: ${s.dayOfWeek} | P${s.periodId} | SlotIdx: ${s.slotIndex} | ID: ${s.id}`);
  });
}

diagnose();
