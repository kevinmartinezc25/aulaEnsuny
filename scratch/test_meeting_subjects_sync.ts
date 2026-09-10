import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { ScheduleGenerator, GeneratorConfig } from '../src/app/admin/schedules/engine/Generator';
import { RuleContext, ClassSession } from '../src/app/admin/schedules/engine/types';
import { isOfficialGradeGroup } from '../src/app/admin/schedules/utils/groupFilters';

async function testMeetingSync() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: currData } = await supabase.from('sch_curriculum').select('*, group:sch_groups(name), subject:sch_subjects(name, is_academic_workload)');
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

  const multiTeacherSubjectIds = Array.from(multiTeacherSubjSet);
  const context: RuleContext = {
    multiTeacherSubjectIds,
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
  console.log('--- GENERATION RESULT ---');
  console.log('Total Scheduled:', result.schedule.length);
  console.log('Total Unassigned Blocks:', result.unassigned.length);

  // Group scheduled sessions by subject for meeting subjects
  const meetingSubjects = ['Núcleo', 'Comité', 'DOCENTES_INSTITUCIONAL'];
  const meetingSessionsBySubj = new Map<string, ClassSession[]>();
  for (const s of result.schedule) {
    const currItem = currData?.find(c => c.subject_id === s.subjectId && c.group_id === s.groupId);
    const subjName = currItem?.subject?.name || s.subjectId;
    const isMeeting = meetingSubjects.some(m => subjName.includes(m)) || !isOfficialGradeGroup(currItem?.group?.name || s.groupId);
    if (isMeeting) {
      if (!meetingSessionsBySubj.has(subjName)) meetingSessionsBySubj.set(subjName, []);
      meetingSessionsBySubj.get(subjName)!.push(s);
    }
  }

  for (const [subj, sessions] of meetingSessionsBySubj.entries()) {
    console.log(`\n=== Subject: ${subj} (Total sessions scheduled: ${sessions.length}) ===`);
    // group by day and period
    const slots = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      const slotKey = `${s.dayOfWeek} P${s.periodId}`;
      if (!slots.has(slotKey)) slots.set(slotKey, []);
      slots.get(slotKey)!.push(s);
    }
    for (const [slot, sessList] of slots.entries()) {
      const details = sessList.map(s => `${s.teacherId?.substring(0, 8)} [slot ${s.slotIndex}]`).join(', ');
      console.log(`  Slot ${slot}: ${sessList.length} teachers (${details})`);
    }
  }

  if (result.unassigned.length > 0) {
    console.log('\n=== UNASSIGNED BLOCKS DETAILS ===');
    for (const ub of result.unassigned) {
      console.log(`  Unassigned: Subj=${ub.subject_name || ub.subject_id} | Group=${ub.group_name || ub.group_id} | Teacher=${ub.teacher_id?.substring(0,8)} | SlotIdx=${ub.slotIndex} | Reason=${ub.reason}`);
    }
  }
}

testMeetingSync();
