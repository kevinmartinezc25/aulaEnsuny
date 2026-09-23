'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { AscParsedData } from '../utils/AscXmlParser'

export async function importDailyNovedadesXML(parsedData: AscParsedData, targetDateStr: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No autorizado.")

    // 1. Determinar el día de la semana de la fecha objetivo
    const targetDate = new Date(`${targetDateStr}T12:00:00Z`) // Forzar mediodía UTC para evitar desfases de zona horaria
    const jsDayOfWeek = targetDate.getUTCDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    if (jsDayOfWeek === 0 || jsDayOfWeek === 6) {
      throw new Error("La fecha seleccionada corresponde a un fin de semana (Sábado o Domingo).")
    }
    
    // aSc TimeTables usa Lunes = 1, Martes = 2, ..., Viernes = 5
    const targetAscDay = jsDayOfWeek 
    
    // 2. Filtrar los slots del XML que correspondan EXCLUSIVAMENTE a este día
    const daySlots = parsedData.slots.filter(s => s.day_of_week === targetAscDay)
    if (daySlots.length === 0) {
      throw new Error(`El archivo XML no contiene programación de clases para el día seleccionado (Día ${targetAscDay}).`)
    }

    // 3. Cargar las entidades maestras de la Base de Datos para hacer el cruce (Mapping)
    const { data: existingSubjects } = await adminClient.from('sch_subjects').select('id, name, external_id')
    const { data: existingGroups } = await adminClient.from('sch_groups').select('id, name, external_id')
    const { data: existingTeachers } = await adminClient.from('academic_teachers').select('id, full_name, external_id')
    const { data: existingClassrooms } = await adminClient.from('sch_classrooms').select('id, name, short')

    // Diccionarios para búsqueda rápida
    const subByExtId = new Map(existingSubjects?.filter(s => s.external_id).map(s => [s.external_id, s.id]))
    const subByName = new Map(existingSubjects?.map(s => [s.name.trim().toLowerCase(), s.id]))

    const grpByExtId = new Map(existingGroups?.filter(g => g.external_id).map(g => [g.external_id, g.id]))
    const grpByName = new Map(existingGroups?.map(g => [g.name.trim().toLowerCase(), g.id]))

    const tchByExtId = new Map(existingTeachers?.filter(t => t.external_id).map(t => [t.external_id, t.id]))
    const tchByName = new Map(existingTeachers?.map(t => [t.full_name.trim().toLowerCase(), t.id]))

    const clsById = new Map(existingClassrooms?.map(c => [c.short, c.id])) // short acts as xml external_id sometimes or we can use name
    // En aSc, el classroom_id que extrajimos es en realidad el id del xml. Pero en nuestra db sch_classrooms no hay external_id!
    // Usaremos el name o el id
    const clsByXmlId = new Map(parsedData.classrooms.map(c => [c.id, c.name.trim().toLowerCase()]))
    const clsByName = new Map(existingClassrooms?.map(c => [c.name.trim().toLowerCase(), c.id]))

    // Para evitar errores en grupos institucionales
    const VIRTUAL_GROUP_EXT_ID = '__JORNADA_INSTITUCIONAL__'
    const VIRTUAL_GROUP_NAME = 'Jornada Institucional'
    const virtualGroupId = grpByExtId.get(VIRTUAL_GROUP_EXT_ID) || grpByName.get(VIRTUAL_GROUP_NAME.toLowerCase())

    // 4. Preparar las inserciones
    const overridesToInsert: any[] = []
    let unmappedTeachers = 0
    let unmappedSubjects = 0

    for (const slot of daySlots) {
      // Intentar mapear Docente
      let tDbId = tchByExtId.get(slot.teacher_id)
      if (!tDbId) {
        const teacherXmlName = parsedData.teachers.find(t => t.id === slot.teacher_id)?.name
        if (teacherXmlName) tDbId = tchByName.get(teacherXmlName.trim().toLowerCase())
      }
      
      // Intentar mapear Materia
      let sDbId = subByExtId.get(slot.subject_id)
      if (!sDbId) {
        const subjectXmlName = parsedData.subjects.find(s => s.id === slot.subject_id)?.name
        if (subjectXmlName) sDbId = subByName.get(subjectXmlName.trim().toLowerCase())
      }

      // Intentar mapear Grupo
      let gDbId = null
      if (slot.group_id === VIRTUAL_GROUP_EXT_ID) {
        gDbId = virtualGroupId
      } else {
        gDbId = grpByExtId.get(slot.group_id)
        if (!gDbId) {
          const groupXmlName = parsedData.groups.find(g => g.id === slot.group_id)?.name
          if (groupXmlName) gDbId = grpByName.get(groupXmlName.trim().toLowerCase())
        }
      }

      // Intentar mapear Aula
      let cDbId = null
      if (slot.classroom_id) {
        const clsName = clsByXmlId.get(slot.classroom_id)
        if (clsName) {
          cDbId = clsByName.get(clsName)
        }
      }

      // Validar integridad mínima: Si no encontramos al docente o materia, contamos el error pero omitimos el slot o lo insertamos nulo
      // Para un horario de Novedad es crítico tener al docente.
      if (!tDbId) unmappedTeachers++
      if (!sDbId) unmappedSubjects++

      if (tDbId && sDbId && gDbId) {
        overridesToInsert.push({
          target_date: targetDateStr,
          teacher_id: tDbId,
          subject_id: sDbId,
          group_id: gDbId,
          day_of_week: slot.day_of_week,
          period_id: slot.period.toString(),
          duration: 1, // aSc TimeTables export standard
          classroom_id: cDbId || null
        })
      }
    }

    if (overridesToInsert.length === 0) {
      throw new Error(`No se pudo mapear ninguna clase. Verifica que los docentes y grupos del XML coincidan con los de la base de datos (faltan ${unmappedTeachers} docentes y ${unmappedSubjects} materias por reconocer).`)
    }

    // 5. Borrar cualquier novedad existente para este día exacto
    await adminClient.from('sch_daily_overrides').delete().eq('target_date', targetDateStr)

    // 6. Insertar el nuevo horario de novedad
    // Lo haremos en chunks (lotes) de 1000 por si hay muchas clases
    const chunkSize = 1000
    for (let i = 0; i < overridesToInsert.length; i += chunkSize) {
      const chunk = overridesToInsert.slice(i, i + chunkSize)
      const { error: insertError } = await adminClient.from('sch_daily_overrides').insert(chunk)
      if (insertError) throw new Error(`Error al insertar las novedades en BDD: ${insertError.message}`)
    }

    return { 
      success: true, 
      count: overridesToInsert.length,
      unmappedTeachers,
      unmappedSubjects
    }

  } catch (error: any) {
    throw new Error(error.message)
  }
}

export async function deleteDailyNovedades(targetDateStr: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No autorizado.")

    const { error } = await adminClient
      .from('sch_daily_overrides')
      .delete()
      .eq('target_date', targetDateStr)

    if (error) {
      throw new Error(`Error al eliminar las novedades: ${error.message}`)
    }

    return { success: true }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export async function checkDailyNovedadesCount(targetDateStr: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await adminClient
      .from('sch_daily_overrides')
      .select('*', { count: 'exact', head: true })
      .eq('target_date', targetDateStr)

    if (error) {
      return 0
    }

    return count || 0
  } catch (error: any) {
    return 0
  }
}
