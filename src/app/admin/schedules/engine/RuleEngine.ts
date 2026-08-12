import { ClassSession, IScheduleRule, RuleContext, RuleResult } from './types';
import { GroupOverlapRule, TeacherOverlapRule, ClassroomOverlapRule, TimeOffRule, GroupNoGapsRule, SubjectMaxHoursPerDayRule, TeacherRequiredRule, SubjectOncePerDayRule, BlockSubjectSeparateDaysRule, SubjectRulesRule, MultiTeacherSameSlotRule, MultiTeacherAtLeastOneSharedHourRule, TeacherMaxFullDaysRule } from './rules/HardConstraints';
import { TeacherMaxGapsRule, TeacherMaxHoursRule, TeacherFiveDaysDistributionRule } from './rules/SoftConstraints';

export interface EvaluationReport {
  score: number; // 0 a 100 (100 = perfecto)
  isValid: boolean;
  violations: {
    ruleCode: string;
    message?: string;
    penalty: number;
    conflictingSessionIds?: string[];
  }[];
}

export class RuleEngine {
  private rules: IScheduleRule[] = [];

  constructor() {
    // Registrar reglas activas
    this.rules.push(new TeacherOverlapRule());
    this.rules.push(new GroupOverlapRule());
    this.rules.push(new ClassroomOverlapRule());
    this.rules.push(new TimeOffRule());
    this.rules.push(new GroupNoGapsRule());
    this.rules.push(new SubjectMaxHoursPerDayRule());
    this.rules.push(new TeacherRequiredRule());
    this.rules.push(new SubjectOncePerDayRule());
    this.rules.push(new BlockSubjectSeparateDaysRule());
    this.rules.push(new SubjectRulesRule());
    this.rules.push(new MultiTeacherSameSlotRule());
    this.rules.push(new MultiTeacherAtLeastOneSharedHourRule());
    this.rules.push(new TeacherMaxFullDaysRule());
    
    // Reglas suaves
    this.rules.push(new TeacherMaxGapsRule());
    this.rules.push(new TeacherMaxHoursRule());
    this.rules.push(new TeacherFiveDaysDistributionRule());
  }

  /**
   * Evalúa un horario completo contra todas las reglas registradas.
   */
  public evaluate(schedule: ClassSession[], context: RuleContext): EvaluationReport {
    let isValid = true;
    let totalPenalty = 0;
    const violations: EvaluationReport['violations'] = [];

    for (const rule of this.rules) {
      const result = rule.validate(schedule, context);

      if (!result.isValid && rule.isMandatory) {
        isValid = false;
      }

      if (result.scorePenalty > 0 || !result.isValid) {
        totalPenalty += result.scorePenalty;
        violations.push({
          ruleCode: rule.code,
          message: result.message,
          penalty: result.scorePenalty,
          conflictingSessionIds: result.conflictingSessionIds
        });
      }
    }

    // El score se calcula de forma continua sin colapsar prematuramente a 0
    // para mantener precisión al comparar slots candidatos durante la autogeneración.
    let score = 100 - (totalPenalty / 100);
    if (score < 0.01) score = 0.01;
    if (!isValid) score = 0; // Si falla una regla dura, score = 0 absoluto

    return {
      score,
      isValid,
      violations
    };
  }
}
