import { ClassSession, IScheduleRule, RuleContext, RuleResult } from '../types';

export class TeacherOverlapRule implements IScheduleRule {
  readonly code = 'TEACHER_OVERLAP';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    // Agrupar por teacher -> day -> period
    const map = new Map<string, string[]>();

    // Las materias en normalWorkloadSubjectIds son materias "extra" como Comité de Investigación
    // que se asignan a docentes adicionales sin bloquear su horario regular.
    const normalWorkloadSubjectIds = new Set<string>(context.normalWorkloadSubjectIds || []);

    for (const session of schedule) {
      if (!session.teacherId) continue;
      // Las sesiones de materias extra (Comité, Núcleo) no bloquean el horario del docente
      if (normalWorkloadSubjectIds.has(session.subjectId)) continue;
      
      // Si la duración es 2, ocupa periodId y periodId + 1
      for (let i = 0; i < session.duration; i++) {
        const key = `${session.teacherId}-${session.dayOfWeek}-${session.periodId + i}`;
        if (map.has(key)) {
          conflicts.push(session.id || '');
        } else {
          map.set(key, [session.id || '']);
        }
      }
    }

    if (conflicts.length > 0) {
      return { isValid: false, scorePenalty: 100, message: 'Superposición de docente detectada', conflictingSessionIds: conflicts };
    }
    return { isValid: true, scorePenalty: 0 };
  }
}

export class GroupOverlapRule implements IScheduleRule {
  readonly code = 'GROUP_OVERLAP';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const map = new Map<string, ClassSession[]>();

    for (const session of schedule) {
      if (!session.groupId) continue;
      
      for (let i = 0; i < session.duration; i++) {
        const key = `${session.groupId}-${session.dayOfWeek}-${session.periodId + i}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(session);
      }
    }

    for (const [_, sessions] of map.entries()) {
      if (sessions.length > 1) {
        // Permitir múltiples docentes en el mismo grupo y periodo SOLO SI es la misma materia (co-teaching / multi-docente)
        const firstSubj = sessions[0].subjectId;
        const hasDifferentSubject = sessions.some(s => s.subjectId !== firstSubj);
        if (hasDifferentSubject) {
          conflicts.push(...sessions.map(s => s.id || '').filter(Boolean));
        }
      }
    }

    if (conflicts.length > 0) {
      return { isValid: false, scorePenalty: 100, message: 'Superposición de grupo detectada con materias diferentes', conflictingSessionIds: conflicts };
    }
    return { isValid: true, scorePenalty: 0 };
  }
}

export class ClassroomOverlapRule implements IScheduleRule {
  readonly code = 'CLASSROOM_OVERLAP';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const map = new Map<string, ClassSession[]>();

    for (const session of schedule) {
      if (!session.classroomId) continue;

      for (let i = 0; i < session.duration; i++) {
        const key = `${session.classroomId}-${session.dayOfWeek}-${session.periodId + i}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(session);
      }
    }

    for (const [_, sessions] of map.entries()) {
      if (sessions.length > 1) {
        // Las materias multi-docente / co-docencia comparten la misma aula de forma válida
        const firstSubj = sessions[0].subjectId;
        const firstGroup = sessions[0].groupId;
        const hasDifferentSubjectOrGroup = sessions.some(s => s.subjectId !== firstSubj && s.groupId !== firstGroup);

        if (hasDifferentSubjectOrGroup) {
          conflicts.push(...sessions.map(s => s.id || '').filter(Boolean));
        }
      }
    }

    if (conflicts.length > 0) {
      return { isValid: false, scorePenalty: 100, message: 'Superposición de aula detectada entre materias o grupos diferentes', conflictingSessionIds: conflicts };
    }
    return { isValid: true, scorePenalty: 0 };
  }
}


export class TimeOffRule implements IScheduleRule {
  readonly code = 'TIME_OFF_VIOLATION';
  readonly isMandatory = true; // Por defecto es mandatoria si el estatus es FORBIDDEN

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    let penalty = 0;

    for (const session of schedule) {
      for (let i = 0; i < session.duration; i++) {
        const currentPeriod = session.periodId + i;
        
        // Buscar si hay bloqueos para este teacher, group o classroom en este dia/periodo
        const block = context.timeOff.find(t => 
          t.dayOfWeek === session.dayOfWeek && 
          t.periodId === currentPeriod &&
          (t.teacherId === session.teacherId || t.groupId === session.groupId || (session.classroomId && t.classroomId === session.classroomId))
        );

        if (block) {
          if (block.status === 'FORBIDDEN') {
            conflicts.push(session.id || '');
            return { isValid: false, scorePenalty: 100, message: 'Violación de tiempo libre prohibido', conflictingSessionIds: conflicts };
          } else if (block.status === 'DISCOURAGED') {
            penalty += 10; // Penalización por usar tiempo "no recomendado"
          }
        }
      }
    }

    return { isValid: true, scorePenalty: penalty };
  }
}

export class GroupNoGapsRule implements IScheduleRule {
  readonly code = 'GROUP_NO_GAPS';
  readonly isMandatory = false; // Cambiado a false para que sea una restricción suave (fuerte penalización pero permite continuar)

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const groupSchedules = new Map<string, Map<string, { min: number, max: number, periods: Set<number>, ids: string[] }>>();

    for (const session of schedule) {
      if (!session.groupId) continue;

      if (!groupSchedules.has(session.groupId)) {
        groupSchedules.set(session.groupId, new Map());
      }

      const dayMap = groupSchedules.get(session.groupId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, { min: 999, max: -1, periods: new Set(), ids: [] });
      }

      const stats = dayMap.get(session.dayOfWeek)!;
      
      const sessionMin = session.periodId;
      const sessionMax = session.periodId + session.duration - 1;

      if (sessionMin < stats.min) stats.min = sessionMin;
      if (sessionMax > stats.max) stats.max = sessionMax;
      
      for (let i = 0; i < session.duration; i++) {
        stats.periods.add(session.periodId + i);
      }
      if (session.id) stats.ids.push(session.id);
    }

    for (const [groupId, dayMap] of groupSchedules.entries()) {
      for (const [day, stats] of dayMap.entries()) {
        if (stats.periods.size === 0) continue;
        
        const span = stats.max - stats.min + 1;
        
        let breaksInSpan = 0;
        if (context.breakPeriods) {
          for (let p = stats.min; p <= stats.max; p++) {
            if (context.breakPeriods.includes(p)) {
              breaksInSpan++;
            }
          }
        }
        
        // Si el lapso (descontando los recreos) es mayor a las horas de clase impartidas, hay un hueco.
        if ((span - breaksInSpan) > stats.periods.size) {
          conflicts.push(...stats.ids);
          return { 
            isValid: true, 
            scorePenalty: 500, // Alta penalización para que el algoritmo lo evite a toda costa, pero lo use si es la única opción
            message: `El grupo tiene huecos intercalados el ${day}`, 
            conflictingSessionIds: conflicts 
          };
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class SubjectMaxHoursPerDayRule implements IScheduleRule {
  readonly code = 'SUBJECT_MAX_HOURS_PER_DAY';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const subjectDailyHours = new Map<string, Map<string, Map<string, { periods: Set<number>, ids: string[] }>>>();

    for (const session of schedule) {
      if (!session.groupId || !session.subjectId) continue;

      if (!subjectDailyHours.has(session.groupId)) {
        subjectDailyHours.set(session.groupId, new Map());
      }
      
      const dayMap = subjectDailyHours.get(session.groupId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, new Map());
      }

      const subjectMap = dayMap.get(session.dayOfWeek)!;
      if (!subjectMap.has(session.subjectId)) {
        subjectMap.set(session.subjectId, { periods: new Set(), ids: [] });
      }

      const stats = subjectMap.get(session.subjectId)!;
      for (let i = 0; i < session.duration; i++) {
        stats.periods.add(session.periodId + i);
      }
      if (session.id) stats.ids.push(session.id);
    }

    for (const [groupId, dayMap] of subjectDailyHours.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, stats] of subjectMap.entries()) {
          if (stats.periods.size > 2) {
            conflicts.push(...stats.ids);
            return {
              isValid: false,
              scorePenalty: 100,
              message: 'Una materia excede las 2 horas máximas permitidas por día en un grupo',
              conflictingSessionIds: conflicts
            };
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}


export class TeacherRequiredRule implements IScheduleRule {
  readonly code = 'TEACHER_REQUIRED';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];

    for (const session of schedule) {
      if (!session.teacherId || session.teacherId.trim() === '') {
        if (session.id) conflicts.push(session.id);
        return {
          isValid: false,
          scorePenalty: 100,
          message: 'La materia no tiene docente titular asignado. Es un requisito obligatorio.',
          conflictingSessionIds: conflicts
        };
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class SubjectOncePerDayRule implements IScheduleRule {
  readonly code = 'SUBJECT_ONCE_PER_DAY';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const subjectDailyPeriods = new Map<string, Map<string, Map<string, Set<number>>>>();

    for (const session of schedule) {
      if (!session.groupId || !session.subjectId) continue;

      if (!subjectDailyPeriods.has(session.groupId)) {
        subjectDailyPeriods.set(session.groupId, new Map());
      }
      
      const dayMap = subjectDailyPeriods.get(session.groupId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, new Map());
      }

      const subjectMap = dayMap.get(session.dayOfWeek)!;
      if (!subjectMap.has(session.subjectId)) {
        subjectMap.set(session.subjectId, new Set());
      }

      const periodsSet = subjectMap.get(session.subjectId)!;
      for (let i = 0; i < session.duration; i++) {
        periodsSet.add(session.periodId + i);
      }
    }

    for (const [groupId, dayMap] of subjectDailyPeriods.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, periodsSet] of subjectMap.entries()) {
          const periods = Array.from(periodsSet).sort((a, b) => a - b);
          // Si los periodos ocupados son más de 2 o si no son consecutivos (ej. periodos 1 y 4)
          if (periods.length > 2) {
            return {
              isValid: false,
              scorePenalty: 100,
              message: 'Una materia excede el límite de bloques diarios.',
              conflictingSessionIds: conflicts
            };
          } else if (periods.length === 2 && periods[1] - periods[0] !== 1) {
            return {
              isValid: false,
              scorePenalty: 100,
              message: 'Una materia está siendo asignada en bloques separados el mismo día.',
              conflictingSessionIds: conflicts
            };
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class BlockSubjectSeparateDaysRule implements IScheduleRule {
  readonly code = 'BLOCK_SUBJECT_SEPARATE_DAYS';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    const subjectDailySessions = new Map<string, Map<string, Map<string, ClassSession[]>>>();

    for (const session of schedule) {
      if (!session.groupId || !session.subjectId) continue;

      if (!subjectDailySessions.has(session.groupId)) {
        subjectDailySessions.set(session.groupId, new Map());
      }
      const dayMap = subjectDailySessions.get(session.groupId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, new Map());
      }
      const subjectMap = dayMap.get(session.dayOfWeek)!;
      if (!subjectMap.has(session.subjectId)) {
        subjectMap.set(session.subjectId, []);
      }
      subjectMap.get(session.subjectId)!.push(session);
    }

    for (const [groupId, dayMap] of subjectDailySessions.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, sessions] of subjectMap.entries()) {
          const uniquePeriods = new Set<number>();
          sessions.forEach(s => {
            for (let p = 0; p < (s.duration || 1); p++) {
              uniquePeriods.add(s.periodId + p);
            }
          });

          if (uniquePeriods.size > 2) {
            sessions.forEach(s => s.id && conflicts.push(s.id));
            return {
              isValid: false,
              scorePenalty: 100,
              message: 'Una materia configurada en bloques excede las 2 horas diarias permitidas (la hora restante debe agendarse en otro espacio/día).',
              conflictingSessionIds: conflicts
            };
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}


export class SubjectRulesRule implements IScheduleRule {
  readonly code = 'SUBJECT_RULES_VIOLATION';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];

    // Find all active SUBJECT_RULES constraints
    const subjectRules = context.constraints.filter(c => c.ruleType === 'SUBJECT_RULES' && c.isActive !== false);
    if (subjectRules.length === 0) {
      return { isValid: true, scorePenalty: 0 };
    }

    // Build map of rules per subject
    const subjectRulesMap = new Map<string, { startPeriod?: number; endPeriod?: number; maxHoursPerDay?: number }>();
    for (const rule of subjectRules) {
      if (!rule.targetEntityId) continue;
      subjectRulesMap.set(rule.targetEntityId, {
        startPeriod: rule.parameters?.start_period,
        endPeriod: rule.parameters?.end_period,
        maxHoursPerDay: rule.parameters?.max_hours_per_day,
      });
    }

    // Track daily hours per subject per group using a Set of unique periods to avoid double counting co-teachers
    const groupSubjectDailyHours = new Map<string, Map<string, Map<string, { periods: Set<number>, ids: string[] }>>>();

    for (const session of schedule) {
      if (!session.subjectId) continue;

      const rule = subjectRulesMap.get(session.subjectId);
      if (!rule) continue;

      // 1. Validate Time Window
      const startPeriod = rule.startPeriod;
      const endPeriod = rule.endPeriod;
      if (startPeriod !== undefined && endPeriod !== undefined) {
        const sessionStart = session.periodId;
        const sessionEnd = session.periodId + session.duration - 1;

        if (sessionStart < startPeriod || sessionEnd > endPeriod) {
          conflicts.push(session.id || '');
          return {
            isValid: false,
            scorePenalty: 100,
            message: `Materia fuera del horario establecido (Rango permitido: Periodo ${startPeriod} a ${endPeriod})`,
            conflictingSessionIds: conflicts
          };
        }
      }

      // 2. Track daily hours for maxHoursPerDay validation
      if (rule.maxHoursPerDay !== undefined && session.groupId) {
        if (!groupSubjectDailyHours.has(session.groupId)) {
          groupSubjectDailyHours.set(session.groupId, new Map());
        }
        const dayMap = groupSubjectDailyHours.get(session.groupId)!;
        if (!dayMap.has(session.dayOfWeek)) {
          dayMap.set(session.dayOfWeek, new Map());
        }
        const subjectMap = dayMap.get(session.dayOfWeek)!;
        if (!subjectMap.has(session.subjectId)) {
          subjectMap.set(session.subjectId, { periods: new Set<number>(), ids: [] });
        }
        const stats = subjectMap.get(session.subjectId)!;
        
        for (let i = 0; i < session.duration; i++) {
          stats.periods.add(session.periodId + i);
        }
        
        if (session.id) stats.ids.push(session.id);
      }
    }

    // Validate Max Hours Per Day
    for (const [groupId, dayMap] of groupSubjectDailyHours.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, stats] of subjectMap.entries()) {
          const rule = subjectRulesMap.get(subjectId);
          if (rule && rule.maxHoursPerDay !== undefined && stats.periods.size > rule.maxHoursPerDay) {
            conflicts.push(...stats.ids);
            return {
              isValid: false,
              scorePenalty: 100,
              message: `La materia excede el límite de ${rule.maxHoursPerDay} horas permitidas por día para este grupo`,
              conflictingSessionIds: conflicts
            };
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class MultiTeacherSameSlotRule implements IScheduleRule {
  readonly code = 'MULTI_TEACHER_SAME_SLOT';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];

    // Buscar la restricción activa MULTI_TEACHER_SAME_SLOT
    const rule = context.constraints.find(
      c => c.ruleType === 'MULTI_TEACHER_SAME_SLOT' && c.isActive !== false
    );
    if (!rule) {
      return { isValid: true, scorePenalty: 0 };
    }

    // Extraer lista de reglas (soporta múltiples reglas o regla única legacy)
    const ruleEntries: Array<{ subject_id?: string; fixed_day?: string; fixed_period?: number }> = 
      Array.isArray(rule.parameters?.rules) && rule.parameters.rules.length > 0
        ? rule.parameters.rules
        : [{
            subject_id: rule.parameters?.subject_id || rule.targetEntityId,
            fixed_day: rule.parameters?.fixed_day,
            fixed_period: rule.parameters?.fixed_period ? Number(rule.parameters.fixed_period) : undefined
          }];

    const multiTeacherSubjectIdsSet = new Set<string>(context.multiTeacherSubjectIds || []);

    for (const entry of ruleEntries) {
      const fixedDay = entry.fixed_day;
      const fixedPeriod = entry.fixed_period ? Number(entry.fixed_period) : undefined;
      const selectedSubjectId = entry.subject_id;

      // Agrupar sesiones por (groupId, subjectId)
      const groupSubjectMap = new Map<string, ClassSession[]>();
      for (const session of schedule) {
        if (!session.subjectId || !session.groupId) continue;
        if (selectedSubjectId && selectedSubjectId !== 'ALL' && session.subjectId !== selectedSubjectId) {
          continue;
        }
        const key = `${session.groupId}-${session.subjectId}`;
        if (!groupSubjectMap.has(key)) {
          groupSubjectMap.set(key, []);
        }
        groupSubjectMap.get(key)!.push(session);
      }

      for (const [_, sessions] of groupSubjectMap.entries()) {
        if (sessions.length === 0) continue;

        const allTeachers = Array.from(new Set(sessions.map(s => s.teacherId).filter(Boolean)));
        const subjectId = sessions[0].subjectId;
        const isMultiTeacher = allTeachers.length > 1 || multiTeacherSubjectIdsSet.has(subjectId);

        if (isMultiTeacher && allTeachers.length > 1) {
          // Agrupar las sesiones por slot (dayOfWeek - periodId)
          const slotMap = new Map<string, Set<string>>();
          for (const session of sessions) {
            const slotKey = `${session.dayOfWeek}-${session.periodId}`;
            if (!slotMap.has(slotKey)) {
              slotMap.set(slotKey, new Set());
            }
            if (session.teacherId) {
              slotMap.get(slotKey)!.add(session.teacherId);
            }
          }

          // CoGroup handles synchronizing the 1st shared meeting hour (slot0)
          // Individual slots (slotIndex > 0) are scheduled independently per teacher
          // without incurring penalties for asynchronous teacher presence.
        }

        // Validar fixedDay y fixedPeriod si están definidos en los parámetros de la regla
        if (fixedDay || fixedPeriod) {
          for (const session of sessions) {
            const isDayMismatch = fixedDay && fixedDay !== 'ANY' && session.dayOfWeek !== fixedDay;
            const expectedPeriod = fixedPeriod ? (fixedPeriod + (session.slotIndex || 0)) : undefined;
            const isPeriodMismatch = fixedPeriod && fixedPeriod > 0 && session.periodId !== fixedPeriod && session.periodId !== expectedPeriod;

            if (isDayMismatch || isPeriodMismatch) {
              if (session.id && !session.id.startsWith('existing-')) conflicts.push(session.id);
              let msg = `La materia / comité multi-docente debe programarse en el día o periodo configurado.`;
              if (isDayMismatch) {
                msg = `La materia / comité debe programarse el día ${fixedDay}.`;
              } else if (isPeriodMismatch) {
                const hourLabel = `${fixedPeriod}ª Hora`;
                msg = `La materia / comité debe programarse en la ${hourLabel}.`;
              }
              return {
                isValid: false,
                scorePenalty: 100,
                message: msg,
                conflictingSessionIds: conflicts
              };
            }
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class MultiTeacherAtLeastOneSharedHourRule implements IScheduleRule {
  readonly code = 'MULTI_TEACHER_MIN_ONE_SHARED_HOUR';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];

    // Agrupar todas las sesiones por (groupId, subjectId)
    const groupSubjectSessions = new Map<string, ClassSession[]>();
    for (const session of schedule) {
      if (!session.groupId || !session.subjectId) continue;
      const key = `${session.groupId}-${session.subjectId}`;
      if (!groupSubjectSessions.has(key)) {
        groupSubjectSessions.set(key, []);
      }
      groupSubjectSessions.get(key)!.push(session);
    }

    for (const [key, sessions] of groupSubjectSessions.entries()) {
      // Recopilar docentes únicos asignados a esta materia en este grupo
      const allTeacherIds = Array.from(new Set(sessions.map(s => s.teacherId).filter(Boolean)));

      // Evaluar si es una materia multi-docente (al menos 2 profesores asignados)
      if (allTeacherIds.length > 1) {
        // Mapear docentes presentes por cada slot (dayOfWeek - periodId)
        const slotTeacherMap = new Map<string, Set<string>>();
        for (const session of sessions) {
          if (!session.teacherId) continue;
          for (let p = 0; p < (session.duration || 1); p++) {
            const slotKey = `${session.dayOfWeek}-${session.periodId + p}`;
            if (!slotTeacherMap.has(slotKey)) {
              slotTeacherMap.set(slotKey, new Set());
            }
            slotTeacherMap.get(slotKey)!.add(session.teacherId);
          }
        }

        // Verificar que exista AL MENOS UN slot donde TODOS los profesores estén simultáneamente juntos
        let hasSharedSlotWithAllTeachers = false;
        for (const teachersInSlot of slotTeacherMap.values()) {
          if (allTeacherIds.every(tId => teachersInSlot.has(tId))) {
            hasSharedSlotWithAllTeachers = true;
            break;
          }
        }

        if (!hasSharedSlotWithAllTeachers) {
          sessions.forEach(s => s.id && conflicts.push(s.id));
          return {
            isValid: false,
            scorePenalty: 100,
            message: 'Materia multi-docente sin encuentro simultáneo: todos los profesores asignados deben coincidir juntos al menos 1 hora a la semana.',
            conflictingSessionIds: conflicts
          };
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}

export class TeacherMaxFullDaysRule implements IScheduleRule {
  readonly code = 'TEACHER_MAX_FULL_DAYS';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const ruleConfig = context.constraints.find(c => c.ruleType === 'TEACHER_MAX_FULL_DAYS');
    if (ruleConfig && ruleConfig.isActive === false) {
      return { isValid: true, scorePenalty: 0 };
    }

    const targetFullDays = ruleConfig?.parameters?.max_full_days ?? 2; // Exactamente 2 días objetivo
    const fullDayThreshold = ruleConfig?.parameters?.full_day_hours ?? 6; // Jornada completa de 6 horas
    const weightMultiplier = ruleConfig?.weight === 'STRICT' ? 100 : ruleConfig?.weight === 'HIGH' ? 50 : 25;

    const multiTeacherSubjectIdsSet = new Set<string>(context.multiTeacherSubjectIds || []);
    const normalWorkloadSubjectIdsSet = new Set<string>(context.normalWorkloadSubjectIds || []);

    const teacherDailyHours = new Map<string, Map<string, { totalHours: number; sessionIds: string[] }>>();

    for (const session of schedule) {
      if (!session.teacherId) continue;

      if (
        session.subjectId &&
        multiTeacherSubjectIdsSet.has(session.subjectId) &&
        !normalWorkloadSubjectIdsSet.has(session.subjectId)
      ) {
        continue;
      }

      if (!teacherDailyHours.has(session.teacherId)) {
        teacherDailyHours.set(session.teacherId, new Map());
      }

      const dayMap = teacherDailyHours.get(session.teacherId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, { totalHours: 0, sessionIds: [] });
      }

      const dayInfo = dayMap.get(session.dayOfWeek)!;
      dayInfo.totalHours += session.duration || 1;
      if (session.id) dayInfo.sessionIds.push(session.id);
    }

    const conflictingSessionIds: string[] = [];
    let totalPenalty = 0;
    let hasFailure = false;
    let failureMsg = '';

    for (const [teacherId, dayMap] of teacherDailyHours.entries()) {
      let fullDaysCount = 0;
      let totalWeeklyHours = 0;
      const allTeacherSessions: string[] = [];

      for (const [day, dayInfo] of dayMap.entries()) {
        totalWeeklyHours += dayInfo.totalHours;
        allTeacherSessions.push(...dayInfo.sessionIds);
        if (dayInfo.totalHours >= fullDayThreshold) {
          fullDaysCount++;
        }
      }

      // Si sobrepasa el máximo permitido de 2 días con 6 horas
      if (fullDaysCount > targetFullDays) {
        hasFailure = true;
        totalPenalty += (fullDaysCount - targetFullDays) * weightMultiplier * 2;
        conflictingSessionIds.push(...allTeacherSessions);
        if (!failureMsg) {
          failureMsg = `Un docente supera el límite máximo de ${targetFullDays} días con 6 horas completas (encontrados: ${fullDaysCount} días).`;
        }
      }
      // Si tiene suficiente carga lectiva (>= 12h) pero no completa los 2 días de 6 horas
      else if (totalWeeklyHours >= targetFullDays * fullDayThreshold && fullDaysCount < targetFullDays) {
        totalPenalty += (targetFullDays - fullDaysCount) * weightMultiplier;
      }
    }

    if (hasFailure) {
      const isStrict = !ruleConfig || ruleConfig.weight === 'STRICT';
      return {
        isValid: !isStrict,
        scorePenalty: totalPenalty > 0 ? totalPenalty : 100,
        message: failureMsg,
        conflictingSessionIds
      };
    }

    return { isValid: true, scorePenalty: totalPenalty };
  }
}




