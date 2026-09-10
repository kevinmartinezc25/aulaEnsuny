import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext } from '../src/app/admin/schedules/engine/types';

async function testGen() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase.from('sch_curriculum').select('*, group:sch_groups(name), subject:sch_subjects(name)');
  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');

  console.log('Total curriculum rows:', currData?.length);

  const groupSubjectTeachers = new Map<string, { subjectId: string; teachers: Set<string> }>();
  const multiTeacherSubjSet = new Set<string>();

  currData?.forEach((row: any) => {
    if (!row.group_id || !row.subject_id || !row.teacher_id) return;
    const key = `${row.group_id}___${row.subject_id}`;
    if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, { subjectId: row.subject_id, teachers: new Set() });
    groupSubjectTeachers.get(key)!.teachers.add(row.teacher_id);
  });
  for (const info of groupSubjectTeachers.values()) {
    if (info.teachers.size > 1) {
      multiTeacherSubjSet.add(info.subjectId);
    }
  }

  const explicitRulesList = (constraintsData || []).filter((c: any) => c.rule_type === 'MULTI_TEACHER_SAME_SLOT' && c.is_active !== false);
  for (const explicitRules of explicitRulesList) {
    if (explicitRules?.parameters?.rules && Array.isArray(explicitRules.parameters.rules)) {
      explicitRules.parameters.rules.forEach((r: any) => {
        if (r.subject_id && r.subject_id !== 'ALL') multiTeacherSubjSet.add(r.subject_id);
      });
    } else if (explicitRules?.parameters?.subject_id && explicitRules.parameters.subject_id !== 'ALL') {
      multiTeacherSubjSet.add(explicitRules.parameters.subject_id);
    }
  }

  const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet);
  console.log('Multi teacher subject IDs:', multiTeacherSubjectIds);

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
        duration: 1,
        slotIndex: slotIdx++
      });
      hoursLeft -= 1;
    }
    slotCounters.set(counterKey, slotIdx);
  });

  console.log('Total blocks to assign:', blocksToAssign.length);
  const multiBlocks = blocksToAssign.filter(b => multiTeacherSubjectIds.includes(b.subject_id));
  console.log('Multi teacher blocks to assign:', multiBlocks.length);
  console.log('Multi blocks details:', multiBlocks.map(b => ({ subj: b.subject_name, teacher: b.teacher_id, slot: b.slotIndex, group: b.group_name })));

  const generator = new ScheduleGenerator();
  const config: GeneratorConfig = {
    curriculum: blocksToAssign,
    context,
    days: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'],
    periodsPerDay: 7,
    breakPeriods: [4],
    groupPeriods: {}
  };

  const result = await generator.generate(config, (p, msg) => {
    console.log(`[Progress ${p}%] ${msg}`);
  });
  console.log('--- GENERATOR RESULT ---');
  console.log('Total scheduled sessions:', result.schedule.length);
  console.log('Total unassigned blocks:', result.unassigned?.length);
  if (result.unassigned && result.unassigned.length > 0) {
    console.log('Unassigned blocks details:');
    result.unassigned.forEach((u: any, idx: number) => {
      console.log(`[${idx+1}] Group: ${u.group_name || u.group_id} | Subj: ${u.subject_name || u.subject_id} | Teacher: ${u.teacher_id} | Slot: ${u.slotIndex} | Reason: ${u.reason}`);
    });
  }
}
testGen();
