import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { RuleEngine } from '../src/app/admin/schedules/engine/RuleEngine';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext, ClassSession } from '../src/app/admin/schedules/engine/types';

async function testFixedMultiTeacher() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase
    .from('sch_curriculum')
    .select('*, group:sch_groups(name), subject:sch_subjects(name)');

  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');

  // Fix A: Proper delimiter for UUIDs
  const groupSubjectTeachers = new Map<string, Set<string>>();
  const multiTeacherSubjSet = new Set<string>();

  currData?.forEach((row: any) => {
    if (!row.group_id || !row.subject_id || !row.teacher_id) return;
    const key = `${row.group_id}___${row.subject_id}`;
    if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set());
    groupSubjectTeachers.get(key)!.add(row.teacher_id);
  });
  for (const [key, tSet] of groupSubjectTeachers.entries()) {
    if (tSet.size > 1) {
      const subjectId = key.split('___')[1];
      if (subjectId) multiTeacherSubjSet.add(subjectId);
    }
  }

  const explicitRules = (constraintsData || []).filter((c: any) => c.rule_type === 'MULTI_TEACHER_SAME_SLOT' && c.is_active !== false);
  explicitRules.forEach(r => {
    if (r.parameters?.rules && Array.isArray(r.parameters.rules)) {
      r.parameters.rules.forEach((entry: any) => {
        if (entry.subject_id && entry.subject_id !== 'ALL') multiTeacherSubjSet.add(entry.subject_id);
      });
    } else if (r.parameters?.subject_id && r.parameters.subject_id !== 'ALL') {
      multiTeacherSubjSet.add(r.parameters.subject_id);
    }
  });

  const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet);
  console.log('Detected Multi-Teacher Subjects:', multiTeacherSubjectIds);

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
    const counterKey = `${c.group_id}-${c.subject_id}-${c.teacher_id}`;
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

  const committeeBlocks = blocksToAssign.filter(b => b.subject_id === '5772b40c-5143-47d1-99d1-09c845526636');
  console.log(`Committee blocks to assign: ${committeeBlocks.length}`);

  // Now, let's see how RuleEngine evaluates slot 0 vs slot 1, 2, 3
  const engine = new RuleEngine();
  console.log('RuleEngine initialized with rules count:', (engine as any).rules.length);
}
testFixedMultiTeacher();
