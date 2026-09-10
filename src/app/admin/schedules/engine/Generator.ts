import { ClassSession, RuleContext } from './types';
import { RuleEngine } from './RuleEngine';
import { isOfficialGradeGroup, isMeetingSubject } from '../utils/groupFilters';

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
  is_academic_workload?: boolean;
}

export interface GeneratorConfig {
  curriculum: CurriculumBlock[];
  existingSchedule?: ClassSession[];
  context: RuleContext;
  days: string[];
  periodsPerDay: number; // ej. 7
  breakPeriods: number[]; // id de periodos que son recreo
  groupPeriods?: Record<string, number>;
}

export interface GeneratorResult {
  schedule: ClassSession[];
  unassigned: CurriculumBlock[];
  score: number;
}

interface CoGroup {
  key: string;
  groupId: string;
  subjectId: string;
  duration: number;
  blocks: CurriculumBlock[];
}

export class ScheduleGenerator {
  private engine: RuleEngine;

  constructor() {
    this.engine = new RuleEngine();
  }

  /**
   * Intenta asignar un CoGroup buscando el slot que proporcione el mejor Score.
   */
  private tryAssign(
    cg: CoGroup,
    currentSchedule: ClassSession[],
    context: RuleContext,
    days: string[],
    maxPeriodsAllowed: (gId: string) => number,
    breakPeriods: number[]
  ): boolean {
    let bestSlot: { day: string; periodId: number } | null = null;
    let bestScore = -1;
    const maxP = maxPeriodsAllowed(cg.groupId);

    for (const day of days) {
      for (let p = 1; p <= maxP; p++) {
        if (breakPeriods.includes(p)) continue;
        if (cg.duration === 2) {
          if (p + 1 > maxP || breakPeriods.includes(p + 1)) continue;
        }

        // Poda Rápida (Fast-Pruning): Si algún docente o el grupo oficial ya están ocupados en (day, p), saltar
        let hasConflict = false;
        for (const b of cg.blocks) {
          if (!b.teacher_id) continue;
          const isBusy = currentSchedule.some(s =>
            s.teacherId === b.teacher_id &&
            s.dayOfWeek === day &&
            (s.periodId === p || (s.duration === 2 && s.periodId + 1 === p) || (cg.duration === 2 && s.periodId === p + 1))
          );
          if (isBusy) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) continue;

        if (isOfficialGradeGroup(cg.groupId)) {
          const groupBusy = currentSchedule.some(s =>
            s.groupId === cg.groupId &&
            s.dayOfWeek === day &&
            (s.periodId === p || (s.duration === 2 && s.periodId + 1 === p) || (cg.duration === 2 && s.periodId === p + 1))
          );
          if (groupBusy) continue;
        }

        const candidateSessions: ClassSession[] = cg.blocks.map((b, idx) => ({
          id: `temp-${cg.key}-${idx}-${Math.random()}`,
          groupId: b.group_id || '',
          teacherId: b.teacher_id || '',
          subjectId: b.subject_id || '',
          dayOfWeek: day,
          periodId: p,
          duration: cg.duration,
          slotIndex: b.slotIndex
        }));

        currentSchedule.push(...candidateSessions);
        const report = this.engine.evaluate(currentSchedule, context);

        if (report.isValid) {
          if (report.score > bestScore) {
            bestScore = report.score;
            bestSlot = { day, periodId: p };
          }
        }
        currentSchedule.splice(-candidateSessions.length);
      }
    }

    if (bestSlot) {
      for (const b of cg.blocks) {
        currentSchedule.push({
          id: `assigned-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          groupId: b.group_id || '',
          teacherId: b.teacher_id || '',
          subjectId: b.subject_id || '',
          dayOfWeek: bestSlot.day,
          periodId: bestSlot.periodId,
          duration: cg.duration,
          slotIndex: b.slotIndex
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Operador de Búsqueda Local (1-Opt Ejection Chain Swap):
   * Si un bloque huérfano no encuentra celda vacía porque el docente está ocupado en otro grupo,
   * evalúa reubicar la clase previa del docente (víctima) en otro slot libre de ese otro grupo,
   * liberando la celda requerida.
   */
  private executeSwapPass(
    unassigned: CoGroup[],
    currentSchedule: ClassSession[],
    context: RuleContext,
    days: string[],
    maxPeriodsAllowed: (gId: string) => number,
    breakPeriods: number[]
  ): CoGroup[] {
    const remaining: CoGroup[] = [];

    for (const cg of unassigned) {
      let placedViaSwap = false;
      const targetTeacherId = cg.blocks[0]?.teacher_id;
      if (!targetTeacherId) {
        remaining.push(cg);
        continue;
      }

      const maxP = maxPeriodsAllowed(cg.groupId);

      for (const day of days) {
        if (placedViaSwap) break;
        for (let p = 1; p <= maxP; p++) {
          if (placedViaSwap) break;
          if (breakPeriods.includes(p)) continue;
          if (cg.duration === 2 && (p + 1 > maxP || breakPeriods.includes(p + 1))) continue;

          // 1. ¿El grupo del bloque huérfano está libre en (day, p)? (solo aplica a grupos oficiales de alumnos)
          const isNonOfficialGroup = !isOfficialGradeGroup(cg.groupId);
          const groupOccupied = !isNonOfficialGroup && currentSchedule.some(s =>
            s.groupId === cg.groupId &&
            s.dayOfWeek === day &&
            (s.periodId === p || (s.duration === 2 && s.periodId + 1 === p) || (cg.duration === 2 && s.periodId === p + 1))
          );
          if (groupOccupied) continue;

          // 2. ¿Quién ocupa al docente en (day, p)?
          const victimIndex = currentSchedule.findIndex(s =>
            s.teacherId === targetTeacherId &&
            s.dayOfWeek === day &&
            (s.periodId === p || (s.duration === 2 && s.periodId + 1 === p) || (cg.duration === 2 && s.periodId === p + 1))
          );

          if (victimIndex !== -1) {
            const victim = currentSchedule[victimIndex];

            // Protección de Reuniones Colegiadas / Co-docencia:
            // No desmantelar a un docente de una sesión sincronizada donde asiste con sus compañeros
            const isCoMeeting = currentSchedule.some(s =>
              s !== victim &&
              s.groupId === victim.groupId &&
              s.subjectId === victim.subjectId &&
              s.dayOfWeek === victim.dayOfWeek &&
              s.periodId === victim.periodId
            );
            if (isCoMeeting) continue;

            // Remover temporalmente a la víctima
            currentSchedule.splice(victimIndex, 1);

            let victimReallocated = false;
            const victimMaxP = maxPeriodsAllowed(victim.groupId);

            for (const altDay of days) {
              if (victimReallocated) break;
              for (let altP = 1; altP <= victimMaxP; altP++) {
                if (altDay === day && altP === p) continue;
                if (breakPeriods.includes(altP)) continue;
                if (victim.duration === 2 && (altP + 1 > victimMaxP || breakPeriods.includes(altP + 1))) continue;

                const testVictim: ClassSession = { ...victim, dayOfWeek: altDay, periodId: altP };
                currentSchedule.push(testVictim);
                const repVictim = this.engine.evaluate(currentSchedule, context);

                if (repVictim.isValid) {
                  // Probar si ahora el bloque huérfano cabe en (day, p)
                  const candidateSessions: ClassSession[] = cg.blocks.map((b, idx) => ({
                    id: `swap-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
                    groupId: b.group_id || '',
                    teacherId: b.teacher_id || '',
                    subjectId: b.subject_id || '',
                    dayOfWeek: day,
                    periodId: p,
                    duration: cg.duration,
                    slotIndex: b.slotIndex
                  }));

                  currentSchedule.push(...candidateSessions);
                  const repCand = this.engine.evaluate(currentSchedule, context);

                  if (repCand.isValid) {
                    placedViaSwap = true;
                    victimReallocated = true;
                    break;
                  } else {
                    currentSchedule.splice(-candidateSessions.length);
                  }
                }
                currentSchedule.pop(); // Retirar testVictim
              }
            }

            if (!placedViaSwap) {
              // Restaurar víctima si la permutación no fue exitosa
              currentSchedule.splice(victimIndex, 0, victim);
            }
          }
        }
      }

      if (!placedViaSwap) {
        remaining.push(cg);
      }
    }

    return remaining;
  }

  /**
   * Genera el horario escolar completo garantizando máxima cobertura sin cruces,
   * combinando heurística MRV (Most Constrained Variable First), flexibilización de bloques
   * y búsqueda local con cadenas de expulsión (1-Opt Swaps).
   */
  public async generate(
    config: GeneratorConfig,
    onProgress?: (progress: number, message: string) => void
  ): Promise<GeneratorResult> {
    const { curriculum, existingSchedule = [], context, days, periodsPerDay, breakPeriods, groupPeriods = {} } = config;

    let currentSchedule: ClassSession[] = [...existingSchedule];

    // 1. Identificar materias con múltiples docentes (locales y globales)
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

    // 2. Calcular Métrica de Rigidez (Tightness Score) por Docente para MRV:
    // Tightness = Horas Semanales Totales * Cantidad de Grupos Asignados
    const teacherTotalHours = new Map<string, number>();
    const teacherGroupsMap = new Map<string, Set<string>>();
    for (const b of curriculum) {
      if (b.teacher_id) {
        teacherTotalHours.set(b.teacher_id, (teacherTotalHours.get(b.teacher_id) || 0) + (b.duration || 1));
        if (b.group_id) {
          if (!teacherGroupsMap.has(b.teacher_id)) teacherGroupsMap.set(b.teacher_id, new Set());
          teacherGroupsMap.get(b.teacher_id)!.add(b.group_id);
        }
      }
    }

    const teacherTightness = new Map<string, number>();
    for (const [tId, hours] of teacherTotalHours.entries()) {
      const grpCount = teacherGroupsMap.get(tId)?.size || 1;
      teacherTightness.set(tId, hours * grpCount);
    }

    // 3. Agrupar bloques por CoGroup para Co-Docencia Sincronizada
    const coGroupMap = new Map<string, CoGroup>();
    const fallbackSlotCounters = new Map<string, number>();

    // Contar cuántos slots sincrónicos/compartidos están configurados por materia
    const activeMultiTeacherRules = (context.constraints || []).filter(
      c => c.ruleType === 'MULTI_TEACHER_SAME_SLOT' && c.isActive !== false
    );
    const sharedSlotsCountBySubject = new Map<string, number>();
    for (const rule of activeMultiTeacherRules) {
      const entries = Array.isArray(rule.parameters?.rules) && rule.parameters.rules.length > 0
        ? rule.parameters.rules
        : [{
            subject_id: rule.parameters?.subject_id || rule.targetEntityId || 'ALL',
            fixed_day: rule.parameters?.fixed_day,
            fixed_period: rule.parameters?.fixed_period ? Number(rule.parameters.fixed_period) : undefined
          }];
      for (const entry of entries) {
        const subId = entry.subject_id || 'ALL';
        sharedSlotsCountBySubject.set(subId, (sharedSlotsCountBySubject.get(subId) || 0) + 1);
      }
    }

    for (const b of curriculum) {
      let sIdx = b.slotIndex;
      if (sIdx === undefined) {
        const teacherKey = `${b.group_id}-${b.subject_id}-${b.teacher_id || 'unassigned'}`;
        sIdx = fallbackSlotCounters.get(teacherKey) || 0;
        fallbackSlotCounters.set(teacherKey, sIdx + 1);
        b.slotIndex = sIdx;
      }

      const isMeeting = isMeetingSubject(b.subject_name, b.group_name, b.group_id, b.is_academic_workload);
      const isMultiTeacherSubj = isMeeting || multiTeacherSubjectIds.has(b.subject_id) || !b.group_id || !isOfficialGradeGroup(b.group_name || b.group_id);
      const sharedCount = sharedSlotsCountBySubject.get(b.subject_id) ?? sharedSlotsCountBySubject.get('ALL') ?? (isMultiTeacherSubj ? 1 : 0);
      
      // Para materias tipo Horas Reunión, TODAS sus horas son de encuentro simultáneo para todos los docentes
      const isSharedSlot = isMeeting || (isMultiTeacherSubj && sIdx < sharedCount);

      // Si es slot compartido o reunión colegiada, todos los docentes coinciden en el mismo CoGroup (mismo slot)
      const key = (isSharedSlot || !isMultiTeacherSubj)
        ? `${b.group_id}-${b.subject_id}-slot${sIdx}`
        : `${b.group_id}-${b.subject_id}-${b.teacher_id || 'unassigned'}-slot${sIdx}`;

      if (!coGroupMap.has(key)) {
        coGroupMap.set(key, {
          key,
          groupId: b.group_id,
          subjectId: b.subject_id,
          duration: b.duration,
          blocks: []
        });
      }
      const cg = coGroupMap.get(key)!;
      if (b.duration > cg.duration) {
        cg.duration = b.duration;
      }
      cg.blocks.push(b);
    }

    const coGroups = Array.from(coGroupMap.values());

    // 4. Ordenamiento MRV (Most Constrained Variable First):
    // 1°: Materias Multi-docente / Horas Reunión: mayor cantidad de docentes a coordinar primero
    // 2°: Docentes con mayor Tightness (carga * grupos, ej. 22-25h en 10+ grupos)
    // 3°: Mayor duración (bloques dobles de 2 horas)
    coGroups.sort((a, b) => {
      const aMultiCount = a.blocks.length > 1 ? a.blocks.length : 0;
      const bMultiCount = b.blocks.length > 1 ? b.blocks.length : 0;
      if (aMultiCount !== bMultiCount) return bMultiCount - aMultiCount;

      const aTightness = Math.max(...a.blocks.map(bl => teacherTightness.get(bl.teacher_id || '') || 0), 0);
      const bTightness = Math.max(...b.blocks.map(bl => teacherTightness.get(bl.teacher_id || '') || 0), 0);
      if (aTightness !== bTightness) return bTightness - aTightness;

      return b.duration - a.duration;
    });

    const totalCoGroups = coGroups.length;
    let processed = 0;
    let unassignedCoGroups: CoGroup[] = [];

    // FASE 1: Asignación Voraz Ponderada con MRV
    for (const cg of coGroups) {
      if (processed % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      processed++;
      if (onProgress) {
        const percent = Math.round((processed / totalCoGroups) * 45);
        onProgress(percent, `Fase 1: Asignando bloque prioritario ${processed} de ${totalCoGroups}...`);
      }

      const assigned = this.tryAssign(
        cg,
        currentSchedule,
        context,
        days,
        gId => groupPeriods[gId] || periodsPerDay,
        breakPeriods
      );

      if (!assigned) {
        unassignedCoGroups.push(cg);
      }
    }

    // FASE 2: Descomposición Dinámica de Bloques Rígidos (Block Splitting)
    // Si un bloque de 2h no encuentra una franja continua, se divide en dos bloques de 1h
    let unassignedSingleHours: CoGroup[] = [];
    if (unassignedCoGroups.length > 0) {
      if (onProgress) {
        onProgress(50, `Fase 2: Flexibilizando ${unassignedCoGroups.length} bloques rígidos...`);
      }

      for (const cg of unassignedCoGroups) {
        if (cg.duration === 2) {
          const part1: CoGroup = {
            key: `${cg.key}-p1`,
            groupId: cg.groupId,
            subjectId: cg.subjectId,
            duration: 1,
            blocks: cg.blocks.map(b => ({ ...b, duration: 1 }))
          };
          const part2: CoGroup = {
            key: `${cg.key}-p2`,
            groupId: cg.groupId,
            subjectId: cg.subjectId,
            duration: 1,
            blocks: cg.blocks.map(b => ({ ...b, duration: 1 }))
          };

          const ok1 = this.tryAssign(part1, currentSchedule, context, days, gId => groupPeriods[gId] || periodsPerDay, breakPeriods);
          if (!ok1) unassignedSingleHours.push(part1);

          const ok2 = this.tryAssign(part2, currentSchedule, context, days, gId => groupPeriods[gId] || periodsPerDay, breakPeriods);
          if (!ok2) unassignedSingleHours.push(part2);
        } else {
          unassignedSingleHours.push(cg);
        }
      }
    }

    // FASE 3: Búsqueda Local con Permutación (1-Opt Ejection Chains / Swaps)
    let pendingBlocks = [...unassignedSingleHours];
    if (pendingBlocks.length > 0) {
      const maxSwapRounds = 3;
      for (let r = 1; r <= maxSwapRounds; r++) {
        if (pendingBlocks.length === 0) break;
        if (onProgress) {
          const pVal = 55 + (r * 10);
          onProgress(pVal, `Fase 3 (Ronda ${r}): Reubicando colisiones mediante búsqueda local...`);
        }
        await new Promise(resolve => setTimeout(resolve, 0));

        pendingBlocks = this.executeSwapPass(
          pendingBlocks,
          currentSchedule,
          context,
          days,
          gId => groupPeriods[gId] || periodsPerDay,
          breakPeriods
        );
      }
    }

    // FASE 4: Rescate en Franja Extendida (Periodo 7) para Grupos Saturados
    if (pendingBlocks.length > 0) {
      if (onProgress) {
        onProgress(85, `Fase 4: Optimizando periodos complementarios para ${pendingBlocks.length} bloques...`);
      }

      const stillPending: CoGroup[] = [];
      for (const cg of pendingBlocks) {
        const assigned = this.tryAssign(
          cg,
          currentSchedule,
          context,
          days,
          () => Math.max(periodsPerDay, 7),
          breakPeriods
        );
        if (!assigned) {
          stillPending.push(cg);
        }
      }

      pendingBlocks = stillPending;
    }

    // FASE 5: Swaps Finales en Franja Completa si aún quedase algún residuo
    if (pendingBlocks.length > 0) {
      if (onProgress) {
        onProgress(92, `Fase 5: Permutación final en matriz institucional completa...`);
      }

      pendingBlocks = this.executeSwapPass(
        pendingBlocks,
        currentSchedule,
        context,
        days,
        () => Math.max(periodsPerDay, 7),
        breakPeriods
      );
    }

    // 5. Consolidar Bloques No Asignados (si alguno sobrevive) con Diagnóstico Detallado
    const unassigned: CurriculumBlock[] = [];
    if (pendingBlocks.length > 0) {
      for (const cg of pendingBlocks) {
        for (const block of cg.blocks) {
          unassigned.push({
            ...block,
            duration: cg.duration,
            reason: block.teacher_id
              ? `El docente cuenta con alta densidad de carga horaria sin slots compatibles restantes en los días lectivos.`
              : `La materia no cuenta con docente titular asignado en la malla curricular.`
          });
        }
      }
    }

    // Evaluación Final con el Motor de Reglas
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
