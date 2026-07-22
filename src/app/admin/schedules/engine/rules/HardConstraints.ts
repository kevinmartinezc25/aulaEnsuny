import { ClassSession, IScheduleRule, RuleContext, RuleResult } from '../types';

export class TeacherOverlapRule implements IScheduleRule {
  readonly code = 'TEACHER_OVERLAP';
  readonly isMandatory = true;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    const conflicts: string[] = [];
    // Agrupar por teacher -> day -> period
    const map = new Map<string, string[]>();

    for (const session of schedule) {
      if (!session.teacherId) continue;
      
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
            isValid: false, 
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

    // Track daily hours per subject per group
    const groupSubjectDailyHours = new Map<string, Map<string, Map<string, { hours: number, ids: string[] }>>>();

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
          subjectMap.set(session.subjectId, { hours: 0, ids: [] });
        }
        const stats = subjectMap.get(session.subjectId)!;
        stats.hours += session.duration;
        if (session.id) stats.ids.push(session.id);
      }
    }

    // Validate Max Hours Per Day
    for (const [groupId, dayMap] of groupSubjectDailyHours.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, stats] of subjectMap.entries()) {
          const rule = subjectRulesMap.get(subjectId);
          if (rule && rule.maxHoursPerDay !== undefined && stats.hours > rule.maxHoursPerDay) {
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

      // Agrupar sesiones por materia
      const subjectSessionsMap = new Map<string, ClassSession[]>();
      for (const session of schedule) {
        if (!session.subjectId) continue;
        // Si se especificó una materia o grupo específico (no 'ALL'), ignorar otras materias
        if (selectedSubjectId && selectedSubjectId !== 'ALL' && session.subjectId !== selectedSubjectId) {
          continue;
        }
        if (!subjectSessionsMap.has(session.subjectId)) {
          subjectSessionsMap.set(session.subjectId, []);
        }
        subjectSessionsMap.get(session.subjectId)!.push(session);
      }

      for (const [subjectId, sessions] of subjectSessionsMap.entries()) {
        if (sessions.length === 0) continue;

        const uniqueTeachers = new Set(sessions.map(s => s.teacherId).filter(Boolean));
        const isExplicitTarget = selectedSubjectId && selectedSubjectId !== 'ALL' && selectedSubjectId === subjectId;
        const isMultiTeacherSubject = multiTeacherSubjectIdsSet.has(subjectId);

        // Aplica si hay más de 1 docente asignado, o si la materia es multi-docente globalmente, o si fue seleccionada explícitamente
        if (uniqueTeachers.size > 1 || isExplicitTarget || isMultiTeacherSubject || sessions.length > 1) {
          const firstSession = sessions[0];

          for (const session of sessions) {
            const isSlotMismatch = session.dayOfWeek !== firstSession.dayOfWeek || session.periodId !== firstSession.periodId;
            const isDayMismatch = fixedDay && fixedDay !== 'ANY' && session.dayOfWeek !== fixedDay;
            const isPeriodMismatch = fixedPeriod && fixedPeriod > 0 && session.periodId !== fixedPeriod;

            if (isSlotMismatch || isDayMismatch || isPeriodMismatch) {
              if (session.id && !session.id.startsWith('existing-')) conflicts.push(session.id);

              let msg = `La materia / grupo tiene varias clases o docentes y debe programarse en la misma hora y día para todos (Núcleo / Comité / Taller).`;
              if (isDayMismatch) {
                msg = `La materia o grupo (Núcleo / Comité / Proyecto) debe programarse el día ${fixedDay}.`;
              } else if (isPeriodMismatch) {
                const hourLabel = fixedPeriod === 1 ? '1era Hora' : fixedPeriod === 2 ? '2da Hora' : fixedPeriod === 3 ? '3ra Hora' : fixedPeriod === 4 ? '4ta Hora' : fixedPeriod === 5 ? '5ta Hora' : fixedPeriod === 6 ? '6ta Hora' : fixedPeriod === 7 ? '7ma Hora' : `${fixedPeriod}ª Hora`;
                msg = `La materia o grupo (Núcleo / Comité / Proyecto) debe programarse en la ${hourLabel}.`;
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




