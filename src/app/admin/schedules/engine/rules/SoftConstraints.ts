import { ClassSession, IScheduleRule, RuleContext, RuleResult } from '../types';

export class TeacherMaxGapsRule implements IScheduleRule {
  readonly code = 'TEACHER_MAX_GAPS';
  readonly isMandatory = false;

  validate(schedule: ClassSession[], context: RuleContext): RuleResult {
    let totalPenalty = 0;
    
    // Config: Obtener el límite de huecos (gaps) desde el contexto. Si no hay, por defecto 2.
    const ruleConfig = context.constraints.find(c => c.ruleType === 'MAX_GAPS_DAY');
    const maxAllowedGaps = ruleConfig?.parameters?.max_gaps ?? 2;
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
        // Nota: esto asume que no hay solapamientos (ya validados por HardConstraints)
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

        if (gaps > maxAllowedGaps) {
          totalPenalty += (gaps - maxAllowedGaps) * weightMultiplier;
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

