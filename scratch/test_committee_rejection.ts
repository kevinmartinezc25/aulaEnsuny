import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { RuleEngine } from '../src/app/admin/schedules/engine/RuleEngine';
import { ClassSession, RuleContext } from '../src/app/admin/schedules/engine/types';

async function diagnoseCommitteeRejections() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase
    .from('sch_curriculum')
    .select('*, group:sch_groups(name), subject:sch_subjects(name)')
    .eq('subject_id', '5772b40c-5143-47d1-99d1-09c845526636');

  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');
  const { data: existingSlots } = await supabase
    .from('sch_schedule_slots')
    .select('*')
    .neq('subject_id', '5772b40c-5143-47d1-99d1-09c845526636');

  const engine = new RuleEngine();
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

  const existingSchedule: ClassSession[] = (existingSlots || []).map((s: any) => ({
    id: `existing-${s.id}`,
    groupId: s.group_id,
    subjectId: s.subject_id,
    teacherId: s.teacher_id,
    classroomId: s.classroom_id,
    dayOfWeek: s.day_of_week,
    periodId: s.period_id,
    duration: s.duration || 1
  }));

  console.log('Loaded existing sessions:', existingSchedule.length);
  const mtConstraints = context.constraints.filter(c => c.ruleType === 'MULTI_TEACHER_SAME_SLOT');
  console.log('MULTI_TEACHER_SAME_SLOT constraints:', JSON.stringify(mtConstraints, null, 2));

  // Now, let's test adding:
  // 1. Shared meeting (slot 0) for all 6 teachers at Jueves period 5:
  const sharedMeeting: ClassSession[] = currData!.map((c, idx) => ({
    id: `committee-slot0-${idx}`,
    groupId: c.group_id,
    subjectId: c.subject_id,
    teacherId: c.teacher_id,
    dayOfWeek: 'Jueves',
    periodId: 5,
    duration: 1,
    slotIndex: 0
  }));

  let currentSchedule = [...existingSchedule, ...sharedMeeting];
  let rep = engine.evaluate(currentSchedule, context);
  console.log('--- Test Shared Meeting (Jueves 5) ---');
  console.log('Valid:', rep.isValid, 'Score:', rep.score, 'Violations:', rep.violations);

  // Now, let's test adding slot 1 for Teacher 1 on Martes period 2:
  const testSlot1: ClassSession = {
    id: 'committee-slot1-teacher1',
    groupId: currData![0].group_id,
    subjectId: currData![0].subject_id,
    teacherId: currData![0].teacher_id,
    dayOfWeek: 'Martes',
    periodId: 2,
    duration: 1,
    slotIndex: 1
  };

  currentSchedule.push(testSlot1);
  rep = engine.evaluate(currentSchedule, context);
  console.log('--- Test Adding Slot 1 for Teacher 1 on Martes 2 ---');
  console.log('Valid:', rep.isValid, 'Score:', rep.score, 'Violations:', rep.violations);

  // And test adding autonomous slot 2 for Teacher 1 on Viernes period 3:
  const testSlot2: ClassSession = {
    id: 'committee-slot2-teacher1',
    groupId: currData![0].group_id,
    subjectId: currData![0].subject_id,
    teacherId: currData![0].teacher_id,
    dayOfWeek: 'Viernes',
    periodId: 3,
    duration: 1,
    slotIndex: 2
  };
  currentSchedule.push(testSlot2);
  rep = engine.evaluate(currentSchedule, context);
  console.log('--- Test Adding Autonomous Slot 2 for Teacher 1 on Viernes 3 ---');
  console.log('Valid:', rep.isValid, 'Score:', rep.score, 'Violations:', rep.violations);

  // If invalid, let's test each rule individually to pinpoint the exact rejecting rule:
  if (!rep.isValid) {
    console.log('\n--- EVALUATING INDIVIDUAL RULES ---');
    for (const rule of (engine as any).rules) {
      const res = rule.validate(currentSchedule, context);
      if (!res.isValid) {
        console.log(`[RULE FAILED] ${rule.code}: ${res.message}`);
      }
    }
  }
}
diagnoseCommitteeRejections();
