import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext, ClassSession } from '../src/app/admin/schedules/engine/types';
import { isOfficialGradeGroup } from '../src/app/admin/schedules/utils/groupFilters';

async function testVerifyNoTeacherOverlap() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase.from('sch_curriculum').select('*, group:sch_groups(name), subject:sch_subjects(name)');
  const { data: constraintsData } = await supabase.from('sch_constraints').select('*');
  const { data: timeOffData } = await supabase.from('sch_time_off').select('*');

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

  const explicitRulesList = (constraintsData || []).filter((c: any) => c.rule_type === 'MULTI_TEACHER_SAME_SLOT' && c.isActive !== false);
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

  const generator = new ScheduleGenerator();
  const config: GeneratorConfig = {
    curriculum: blocksToAssign,
    context,
    days: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'],
    periodsPerDay: 7,
    breakPeriods: [4],
    groupPeriods: {}
  };

  const result = await generator.generate(config);
  console.log('Total scheduled sessions:', result.schedule.length);

  // Check for any teacher overlap in the resulting schedule
  const teacherOccupancy = new Map<string, ClassSession[]>();
  let totalOverlapsFound = 0;

  for (const s of result.schedule) {
    if (!s.teacherId) continue;
    for (let p = 0; p < (s.duration || 1); p++) {
      const key = `${s.teacherId}___${s.dayOfWeek}___${s.periodId + p}`;
      if (!teacherOccupancy.has(key)) {
        teacherOccupancy.set(key, []);
      }
      teacherOccupancy.get(key)!.push(s);
    }
  }

  for (const [key, list] of teacherOccupancy.entries()) {
    if (list.length > 1) {
      totalOverlapsFound++;
      const [tId, day, p] = key.split('___');
      console.log(`[OVERLAP DETECTED] Teacher: ${tId.substring(0,8)} | Day: ${day} | Period: ${p}`);
      list.forEach(item => {
        console.log(`   -> Group: ${item.groupId} | Subj: ${item.subjectId} | Slot: ${item.slotIndex}`);
      });
    }
  }

  if (totalOverlapsFound === 0) {
    console.log(' SUCCESS: ZERO teacher overlaps found! Every teacher has at most 1 session per time slot!');
  } else {
    console.error(` FAILED: Found ${totalOverlapsFound} teacher overlaps!`);
  }
}

testVerifyNoTeacherOverlap();
