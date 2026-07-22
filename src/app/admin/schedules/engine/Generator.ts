import { ClassSession, RuleContext } from './types';
import { RuleEngine } from './RuleEngine';

export interface CurriculumBlock {
  subject_id: string;
  subject_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  group_id: string;
  group_name?: string;
  duration: number; // 1 o 2
  slotIndex?: number;
  reason?: string;
}



export interface GeneratorConfig {
  curriculum: CurriculumBlock[];
  existingSchedule?: ClassSession[];
  context: RuleContext;
  days: string[];
  periodsPerDay: number; // ej. 7
  breakPeriods: number[]; // id de periodos que son recreo
}

export interface GeneratorResult {
  schedule: ClassSession[];
  unassigned: CurriculumBlock[];
  score: number;
}

export class ScheduleGenerator {
  private engine: RuleEngine;

  constructor() {
    this.engine = new RuleEngine();
  }

  /**
   * Genera el horario usando una heurística golosa (Greedy) con evaluación de motor de reglas.
   * Utiliza async/await y cede el control al event loop para no bloquear la UI y permitir
   * la actualización de una barra de progreso.
   */
  public async generate(
    config: GeneratorConfig,
    onProgress?: (progress: number, message: string) => void
  ): Promise<GeneratorResult> {
    const { curriculum, existingSchedule = [], context, days, periodsPerDay, breakPeriods } = config;
    
    let currentSchedule: ClassSession[] = [...existingSchedule];
    let unassigned: CurriculumBlock[] = [];

    // Identificar materias con múltiples docentes (locales y globales)
    const subjectTeacherMap = new Map<string, Set<string>>();
    for (const b of curriculum) {
      if (!subjectTeacherMap.has(b.subject_id)) {
        subjectTeacherMap.set(b.subject_id, new Set());
      }
      if (b.teacher_id) {
        subjectTeacherMap.get(b.subject_id)!.add(b.teacher_id);
      }
    }
    const multiTeacherSubjectIds = new Set<string>(context.multiTeacherSubjectIds || []);
    for (const [subjId, teachers] of subjectTeacherMap.entries()) {
      if (teachers.size > 1) {
        multiTeacherSubjectIds.add(subjId);
      }
    }

    // 1. Agrupar bloques por (group_id, subject_id, duration) para Co-Docencia Sincronizada
    interface CoGroup {
      key: string;
      groupId: string;
      subjectId: string;
      duration: number;
      blocks: CurriculumBlock[];
    }

    const coGroupMap = new Map<string, CoGroup>();
    for (const b of curriculum) {
      const slotKey = b.slotIndex !== undefined ? `slot${b.slotIndex}` : `rnd${Math.random()}`;
      const key = `${b.group_id}-${b.subject_id}-${slotKey}-${b.duration}`;
      if (!coGroupMap.has(key)) {
        coGroupMap.set(key, {
          key,
          groupId: b.group_id,
          subjectId: b.subject_id,
          duration: b.duration,
          blocks: []
        });
      }
      coGroupMap.get(key)!.blocks.push(b);
    }


    const coGroups = Array.from(coGroupMap.values());

    // Prioridad de ordenamiento:
    // 1° Materias Multi-Docente (Núcleo/Comité)
    // 2° Mayor duración (2 horas)
    coGroups.sort((a, b) => {
      const aIsMulti = multiTeacherSubjectIds.has(a.subjectId) || a.blocks.length > 1 ? 1 : 0;
      const bIsMulti = multiTeacherSubjectIds.has(b.subjectId) || b.blocks.length > 1 ? 1 : 0;
      if (aIsMulti !== bIsMulti) return bIsMulti - aIsMulti;
      return b.duration - a.duration;
    });

    const totalCoGroups = coGroups.length;
    let processed = 0;

    for (const coGroup of coGroups) {
      if (processed % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      processed++;
      if (onProgress) {
        const percent = Math.round((processed / totalCoGroups) * 90);
        onProgress(percent, `Evaluando bloque co-docente ${processed} de ${totalCoGroups}...`);
      }

      let bestSlot: { day: string, periodId: number } | null = null;
      let bestScore = -1;

      // Probar todos los slots posibles para TODOS los profesores del grupo simultáneamente
      for (const day of days) {
        for (let p = 1; p <= periodsPerDay; p++) {
          if (breakPeriods.includes(p)) continue;
          if (coGroup.duration === 2) {
            if (p + 1 > periodsPerDay || breakPeriods.includes(p + 1)) continue;
          }

          // Crear sesiones candidatas para TODOS los profesores asignados al grupo
          const candidateSessions: ClassSession[] = coGroup.blocks.map((b, idx) => ({
            id: `temp-${processed}-${idx}`,
            groupId: b.group_id || '',
            teacherId: b.teacher_id || '',
            subjectId: b.subject_id || '',
            dayOfWeek: day,
            periodId: p,
            duration: b.duration
          }));

          currentSchedule.push(...candidateSessions);
          const report = this.engine.evaluate(currentSchedule, context);

          if (report.isValid) {
            if (report.score > bestScore) {
              bestScore = report.score;
              bestSlot = { day, periodId: p };
            }
          }

          // Retirar candidatos
          currentSchedule.splice(-candidateSessions.length);
        }
      }

      if (bestSlot) {
        // Asignar a TODOS los docentes juntos en el mismo día y periodo
        for (const b of coGroup.blocks) {
          currentSchedule.push({
            id: `assigned-${Date.now()}-${Math.random()}`,
            groupId: b.group_id || '',
            teacherId: b.teacher_id || '',
            subjectId: b.subject_id || '',
            dayOfWeek: bestSlot.day,
            periodId: bestSlot.periodId,
            duration: b.duration
          });
        }
      } else {
        // Ningún slot estricto funcionó para todos los docentes juntos
        unassigned.push(...coGroup.blocks);
      }
    }

    // PASE 2: Rescate Garantizado manteniendo la Sincronización de Co-Docentes
    if (unassigned.length > 0) {
      if (onProgress) {
        onProgress(95, `Ejecutando pase de rescate para ${unassigned.length} bloques...`);
      }

      const relaxedContext: RuleContext = {
        ...context,
        constraints: context.constraints.filter(c => 
          c.ruleType === 'TEACHER_OVERLAP' || 
          c.ruleType === 'GROUP_OVERLAP' || 
          c.ruleType === 'CLASSROOM_OVERLAP' ||
          c.ruleType === 'MULTI_TEACHER_SAME_SLOT'
        )
      };

      // Re-agrupar unassigned por coGroup
      const rescueCoGroupMap = new Map<string, CoGroup>();
      for (const b of unassigned) {
        const slotKey = b.slotIndex !== undefined ? `slot${b.slotIndex}` : `rnd${Math.random()}`;
        const key = `${b.group_id}-${b.subject_id}-${slotKey}-${b.duration}`;
        if (!rescueCoGroupMap.has(key)) {
          rescueCoGroupMap.set(key, {
            key,
            groupId: b.group_id,
            subjectId: b.subject_id,
            duration: b.duration,
            blocks: []
          });
        }
        rescueCoGroupMap.get(key)!.blocks.push(b);
      }


      const stillUnassigned: CurriculumBlock[] = [];

      for (const coGroup of rescueCoGroupMap.values()) {
        let placed = false;

        for (const day of days) {
          if (placed) break;
          for (let p = 1; p <= periodsPerDay; p++) {
            if (breakPeriods.includes(p)) continue;
            if (coGroup.duration === 2) {
              if (p + 1 > periodsPerDay || breakPeriods.includes(p + 1)) continue;
            }

            const candidateSessions: ClassSession[] = coGroup.blocks.map((b, idx) => ({
              id: `rescued-${Date.now()}-${idx}-${Math.random()}`,
              groupId: b.group_id || '',
              teacherId: b.teacher_id || '',
              subjectId: b.subject_id || '',
              dayOfWeek: day,
              periodId: p,
              duration: b.duration
            }));

            currentSchedule.push(...candidateSessions);
            const report = this.engine.evaluate(currentSchedule, relaxedContext);

            if (report.isValid) {
              placed = true;
              break;
            }

            currentSchedule.splice(-candidateSessions.length);
          }
        }

        if (!placed) {
          for (const block of coGroup.blocks) {
            let reason = "El docente asignado se encuentra en clase con otro grupo en todos los periodos libres de este grupo.";
            if (block.teacher_id && context.timeOff?.some(t => t.teacherId === block.teacher_id && t.status === 'FORBIDDEN')) {
              reason = "El horario disponible del docente coincide con restricciones de disponibilidad (Time-Off / Permiso).";
            } else if (!block.teacher_id) {
              reason = "No se ha asignado un docente para esta materia en la malla curricular.";
            }

            stillUnassigned.push({
              ...block,
              reason
            });
          }
        }
      }

      unassigned = stillUnassigned;
    }


    // Evaluación Final
    const finalReport = this.engine.evaluate(currentSchedule, context);

    if (onProgress) {
      onProgress(100, `¡Generación completada! Score final: ${Math.round(finalReport.score)}/100`);
    }


    return {
      schedule: currentSchedule.filter(s => !s.id?.startsWith('existing-')),
      unassigned,
      score: finalReport.score
    };

  }
}
