import { ClassSession, RuleContext } from './types';
import { RuleEngine } from './RuleEngine';

export interface CurriculumBlock {
  subject_id: string;
  teacher_id?: string;
  group_id: string;
  duration: number; // 1 o 2
}

export interface GeneratorConfig {
  curriculum: CurriculumBlock[];
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
    const { curriculum, context, days, periodsPerDay, breakPeriods } = config;
    
    let currentSchedule: ClassSession[] = [];
    let unassigned: CurriculumBlock[] = [];

    // 1. Ordenar bloques heurísticamente
    // Prioridad: bloques de 2 horas primero. (Otras heurísticas pueden sumarse aquí).
    const sortedBlocks = [...curriculum].sort((a, b) => b.duration - a.duration);
    
    const totalBlocks = sortedBlocks.length;
    let processed = 0;

    for (const block of sortedBlocks) {
      // Ceder control al event loop cada N bloques para actualizar UI
      if (processed % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      processed++;
      if (onProgress) {
        const percent = Math.round((processed / totalBlocks) * 100);
        onProgress(percent, `Evaluando clase ${processed} de ${totalBlocks}...`);
      }

      let bestSlot: { day: string, periodId: number } | null = null;
      let bestScore = -1;

      // Buscar todos los posibles slots (Día y Hora)
      for (const day of days) {
        for (let p = 1; p <= periodsPerDay; p++) {
          // Ignorar si el bloque cae en un recreo
          if (breakPeriods.includes(p)) continue;
          
          // Si dura 2 horas, asegurar que el siguiente periodo no es recreo ni excede el día
          if (block.duration === 2) {
            if (p + 1 > periodsPerDay) continue;
            if (breakPeriods.includes(p + 1)) continue;
          }

          // Crear sesión candidata
          const candidateSession: ClassSession = {
            id: `temp-${processed}`,
            groupId: block.group_id || '',
            teacherId: block.teacher_id || '',
            subjectId: block.subject_id || '',
            dayOfWeek: day,
            periodId: p,
            duration: block.duration
          };

          // Evaluar añadiendo el candidato al horario actual
          currentSchedule.push(candidateSession);
          
          const report = this.engine.evaluate(currentSchedule, context);
          
          if (report.isValid) {
            // Es un slot legal. Verificamos si es el que mejor puntaje de reglas suaves tiene
            if (report.score > bestScore) {
              bestScore = report.score;
              bestSlot = { day, periodId: p };
            }
          }

          // Retirar candidato para probar el siguiente
          currentSchedule.pop();
        }
      }

      // Si encontramos un slot válido, lo asignamos definitivamente
      if (bestSlot) {
        currentSchedule.push({
          id: `assigned-${processed}`,
          groupId: block.group_id || '',
          teacherId: block.teacher_id || '',
          subjectId: block.subject_id || '',
          dayOfWeek: bestSlot.day,
          periodId: bestSlot.periodId,
          duration: block.duration
        });
      } else {
        // No hay hueco legal para esta clase. (Puede requerir revisión manual).
        unassigned.push(block);
      }
    }

    // Evaluación Final
    const finalReport = this.engine.evaluate(currentSchedule, context);

    if (onProgress) {
      onProgress(100, `¡Generación completada! Score final: ${Math.round(finalReport.score)}/100`);
    }

    return {
      schedule: currentSchedule,
      unassigned,
      score: finalReport.score
    };
  }
}
