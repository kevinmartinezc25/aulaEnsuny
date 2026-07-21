export interface ClassSession {
  id?: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  classroomId?: string;
  dayOfWeek: string;
  periodId: number;
  duration: number; // En periodos (ej. 1 o 2)
}

export interface RuleResult {
  isValid: boolean;
  scorePenalty: number;
  message?: string;
  conflictingSessionIds?: string[];
}

export interface RuleContext {
  // Configuración cargada desde la BD
  maxPeriodsPerDay: number;
  breakPeriods?: number[];
  timeOff: {
    teacherId?: string;
    groupId?: string;
    classroomId?: string;
    dayOfWeek: string;
    periodId: number;
    status: 'FORBIDDEN' | 'DISCOURAGED';
  }[];
  constraints: {
    ruleType: string;
    targetEntityType?: string;
    targetEntityId?: string;
    parameters: any;
    weight: 'STRICT' | 'HIGH' | 'MEDIUM' | 'LOW';
    isActive?: boolean;
  }[];
}

export interface IScheduleRule {
  readonly code: string;
  readonly isMandatory: boolean; // Si es true y falla, isValid = false. Si es false, penaliza el score.

  validate(schedule: ClassSession[], context: RuleContext): RuleResult;
}
