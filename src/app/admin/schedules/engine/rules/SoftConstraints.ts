import { ClassSession, IScheduleRule, RuleContext, RuleResult } from '../types';

export class TeacherMaxGapsRule implements IScheduleRule {
  readonly code = 'TEACHER_MAX_GAPS';
  readonly isMandatory = false;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    let totalPenalty = 0;
    
    // Config: Obtener el límite de huecos (gaps) desde el contexto. Si no hay, por defecto min 1, max 4.
    const ruleConfig = context.constraints.find(c => c.ruleType === 'MAX_GAPS_DAY');
    if (ruleConfig && ruleConfig.isActive === false) {
      return { isValid: true, scorePenalty: 0 };
    }

    const minAllowedGaps = ruleConfig?.parameters?.min_gaps ?? 1;
    const maxAllowedGaps = ruleConfig?.parameters?.max_gaps ?? 4;
    const weightMultiplier = ruleConfig?.weight === 'STRICT' ? 50 : ruleConfig?.weight === 'HIGH' ? 30 : 10;

    // Agrupar clases por profesor y luego por día
    const teacherSchedules = new Map<string, Map<string, number[]>>();

    for (const session of schedule) {
      if (!session.teacherId) continue;
      
      if (!teacherSchedules.has(session.teacherId)) {
        teacherSchedules.set(session.teacherId, new Map());
      }
      
      const dayMap = teacherSchedules.get(session.teacherId)!;
      if (!dayMap.has(session.dayOfWeek)) {
        dayMap.set(session.dayOfWeek, []);
      }
      
      const periods = dayMap.get(session.dayOfWeek)!;
      for (let i = 0; i < session.duration; i++) {
        periods.push(session.periodId + i);
      }
    }

    // Analizar huecos (gaps) por día
    for (const [teacherId, dayMap] of teacherSchedules.entries()) {
      for (const [day, periods] of dayMap.entries()) {
        if (periods.length <= 1) continue;
        
        periods.sort((a, b) => a - b);
        const minPeriod = periods[0];
        const maxPeriod = periods[periods.length - 1];
        
        // Número total de slots desde la primera clase hasta la última = max - min + 1
        // Número de gaps = total slots - clases reales impartidas
        const totalSpan = maxPeriod - minPeriod + 1;
        
        let breaksInSpan = 0;
        if (context.breakPeriods) {
          for (let p = minPeriod; p <= maxPeriod; p++) {
            if (context.breakPeriods.includes(p)) {
              breaksInSpan++;
            }
          }
        }
        
        const gaps = totalSpan - breaksInSpan - periods.length;

        if (gaps > 0) {
          if (gaps < minAllowedGaps) {
            totalPenalty += (minAllowedGaps - gaps) * weightMultiplier;
          } else if (gaps > maxAllowedGaps) {
            totalPenalty += (gaps - maxAllowedGaps) * weightMultiplier;
          }
        }
      }
    }

    return { isValid: true, scorePenalty: totalPenalty };
  }
}

export class TeacherMaxHoursRule implements IScheduleRule {
  readonly code = 'TEACHER_MAX_HOURS';
  readonly isMandatory = false;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    let totalPenalty = 0;
    
    const ruleConfig = context.constraints.find(c => c.ruleType === 'MAX_HOURS_DAY');
    const maxAllowedHours = ruleConfig?.parameters?.max_hours ?? 6; // default 6 hrs
    const weightMultiplier = ruleConfig?.weight === 'STRICT' ? 50 : ruleConfig?.weight === 'HIGH' ? 30 : 10;
    const multiTeacherSubjectIdsSet = new Set<string>(context.multiTeacherSubjectIds || []);
    const normalWorkloadSubjectIdsSet = new Set<string>(context.normalWorkloadSubjectIds || []);

    const teacherSchedules = new Map<string, Map<string, number>>();

    for (const session of schedule) {
      if (!session.teacherId) continue;
      
      // Eximir materias multi-docente del conteo de horas docentes A MENOS que se hayan configurado como "Carga Normal"
      if (
        session.subjectId &&
        multiTeacherSubjectIdsSet.has(session.subjectId) &&
        !normalWorkloadSubjectIdsSet.has(session.subjectId)
      ) {
        continue;
      }

      
      if (!teacherSchedules.has(session.teacherId)) {
        teacherSchedules.set(session.teacherId, new Map());
      }
      
      const dayMap = teacherSchedules.get(session.teacherId)!;
      const currentHours = dayMap.get(session.dayOfWeek) || 0;
      dayMap.set(session.dayOfWeek, currentHours + session.duration);
    }

    for (const [teacherId, dayMap] of teacherSchedules.entries()) {
      for (const [day, hours] of dayMap.entries()) {
        if (hours > maxAllowedHours) {
          totalPenalty += (hours - maxAllowedHours) * weightMultiplier;
        }
      }
    }

    return { isValid: true, scorePenalty: totalPenalty };
  }
}

export class TeacherFiveDaysDistributionRule implements IScheduleRule {
  readonly code = 'EVEN_DISTRIBUTION';
  readonly isMandatory = false;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    let totalPenalty = 0;

    const ruleConfig = context.constraints.find(c => c.ruleType === 'EVEN_DISTRIBUTION');
    if (ruleConfig && ruleConfig.isActive === false) {
      return { isValid: true, scorePenalty: 0 };
    }

    const weightMultiplier = ruleConfig?.weight === 'STRICT' ? 50 : ruleConfig?.weight === 'HIGH' ? 30 : 15;
    const workDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const teacherDayCounts = new Map<string, Map<string, number>>();

    for (const session of schedule) {
      if (!session.teacherId) continue;
      if (!workDays.includes(session.dayOfWeek)) continue;

      if (!teacherDayCounts.has(session.teacherId)) {
        teacherDayCounts.set(session.teacherId, new Map());
      }
      const dayMap = teacherDayCounts.get(session.teacherId)!;
      dayMap.set(session.dayOfWeek, (dayMap.get(session.dayOfWeek) || 0) + 1);
    }

    for (const [teacherId, dayMap] of teacherDayCounts.entries()) {
      const activeDaysCount = dayMap.size;
      const totalSessions = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);

      // Si el docente tiene días sin clases pero agrupa múltiples sesiones en un mismo día,
      // penalizamos la concentración desigual en ese día.
      if (activeDaysCount < 5 && totalSessions >= 2) {
        for (const [day, count] of dayMap.entries()) {
          if (count > 1) {
            totalPenalty += (count - 1) * (5 - activeDaysCount) * weightMultiplier;
          }
        }
      }
    }

    return { isValid: true, scorePenalty: totalPenalty };
  }
}


