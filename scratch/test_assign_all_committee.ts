import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext } from '../src/app/admin/schedules/engine/types';

async function testAssignAllCommittee() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // 1. Fetch curriculum of committee
  const { data: currData } = await supabase
    .from('sch_curriculum')
    .select('*, group:sch_groups(name), subject:sch_subjects(name)')
    .eq('subject_id', '5772b40c-5143-47d1-99d1-09c845526636');

  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');

  // Load existing slots of all OTHER subjects
  const { data: existingSlots } = await supabase
    .from('sch_schedule_slots')
    .select('*')
    .neq('subject_id', '5772b40c-5143-47d1-99d1-09c845526636');

  const multiTeacherSubjectIds = ['5772b40c-5143-47d1-99d1-09c845526636'];

  const workloadConfig = (constraintsData || []).find((c: any) => c.rule_type === 'MULTI_TEACHER_WORKLOAD_CONFIG' && c.is_active !== false);
  const normalWorkloadSubjectIds = workloadConfig?.parameters?.normal_workload_subject_ids || [];

  const context: RuleContext = {
    multiTeacherSubjectIds,
    normalWorkloadSubjectIds,
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
        duration: 1,
        slotIndex: slotIdx++
      });
      hoursLeft -= 1;
    }
    slotCounters.set(counterKey, slotIdx);
  });

  console.log('Total committee blocks to assign:', blocksToAssign.length);

  const existingSchedule = (existingSlots || []).map((s: any) => ({
    id: `existing-${s.id}`,
    groupId: s.group_id,
    subjectId: s.subject_id,
    teacherId: s.teacher_id,
    classroomId: s.classroom_id,
    dayOfWeek: s.day_of_week,
    periodId: s.period_id,
    duration: s.duration || 1
  }));

  console.log('Existing schedule slots from other groups:', existingSchedule.length);

  const generator = new ScheduleGenerator();
  const config: GeneratorConfig = {
    curriculum: blocksToAssign,
    existingSchedule,
    context,
    days: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'],
    periodsPerDay: 7,
    breakPeriods: [4],
    groupPeriods: {}
  };

  const result = await generator.generate(config, (p, msg) => {
    console.log(`[${p}%] ${msg}`);
  });

  console.log('--- RESULT OF COMMITTEE GENERATION ---');
  console.log('Total assigned sessions:', result.schedule.length);
  console.log('Total unassigned:', result.unassigned?.length);
  if (result.unassigned && result.unassigned.length > 0) {
    result.unassigned.forEach((u, i) => {
      console.log(`[Unassigned ${i+1}] Teacher: ${u.teacher_id?.substring(0,8)} | Slot: ${u.slotIndex} | Reason: ${u.reason}`);
    });
  }
}
testAssignAllCommittee();
