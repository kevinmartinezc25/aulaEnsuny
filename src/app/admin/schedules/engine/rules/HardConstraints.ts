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
    const map = new Map<string, string[]>();

    for (const session of schedule) {
      if (!session.groupId) continue;
      
      for (let i = 0; i < session.duration; i++) {
        const key = `${session.groupId}-${session.dayOfWeek}-${session.periodId + i}`;
        if (map.has(key)) {
          conflicts.push(session.id || '');
        } else {
          map.set(key, [session.id || '']);
        }
      }
    }

    if (conflicts.length > 0) {
      return { isValid: false, scorePenalty: 100, message: 'Superposición de grupo detectada', conflictingSessionIds: conflicts };
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
    const groupSchedules = new Map<string, Map<string, { min: number, max: number, count: number, ids: string[] }>>();

    for (const session of schedule) {
      if (!session.groupId) continue;

      if (!groupSchedules.has(session.groupId)) {
        groupSchedules.set(session.groupId, new Map());
      }

      const dayMap = groupSchedules.get(session.groupId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, { min: 999, max: -1, count: 0, ids: [] });
      }

      const stats = dayMap.get(session.dayOfWeek)!;
      
      const sessionMin = session.periodId;
      const sessionMax = session.periodId + session.duration - 1;

      if (sessionMin < stats.min) stats.min = sessionMin;
      if (sessionMax > stats.max) stats.max = sessionMax;
      
      stats.count += session.duration;
      if (session.id) stats.ids.push(session.id);
    }

    for (const [groupId, dayMap] of groupSchedules.entries()) {
      for (const [day, stats] of dayMap.entries()) {
        if (stats.count === 0) continue;
        
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
        if ((span - breaksInSpan) > stats.count) {
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
    const subjectDailyHours = new Map<string, Map<string, Map<string, { hours: number, ids: string[] }>>>();

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
        subjectMap.set(session.subjectId, { hours: 0, ids: [] });
      }

      const stats = subjectMap.get(session.subjectId)!;
      stats.hours += session.duration;
      if (session.id) stats.ids.push(session.id);
    }

    for (const [groupId, dayMap] of subjectDailyHours.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, stats] of subjectMap.entries()) {
          if (stats.hours > 2) {
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
    const subjectDailySessions = new Map<string, Map<string, Map<string, string[]>>>();

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

      const ids = subjectMap.get(session.subjectId)!;
      if (session.id) ids.push(session.id);
    }

    for (const [groupId, dayMap] of subjectDailySessions.entries()) {
      for (const [day, subjectMap] of dayMap.entries()) {
        for (const [subjectId, ids] of subjectMap.entries()) {
          // Si una materia tiene más de 1 bloque/sesión en un solo día, es inválido
          if (ids.length > 1) {
            conflicts.push(...ids);
            return {
              isValid: false,
              scorePenalty: 100,
              message: 'Una materia está siendo asignada en múltiples bloques separados en el mismo día.',
              conflictingSessionIds: conflicts
            };
          }
        }
      }
    }

    return { isValid: true, scorePenalty: 0 };
  }
}
