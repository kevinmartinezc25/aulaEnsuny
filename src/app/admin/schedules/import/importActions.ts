'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { AscParsedData } from '../utils/AscXmlParser'

export async function commitImportedSchedule(data: AscParsedData, fileName: string) {
  const supabase = await createClient() // Para obtener el usuario actual
  const adminClient = await createAdminClient() // Para saltar RLS en inserciones maestras
  
  try {
    // 1. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    
    // 2. Crear el registro de Importación (Control de Versiones)
    const { data: importRecord, error: importError } = await adminClient
      .from('academic_imports')
      .insert({
        file_name: fileName,
        status: 'PUBLICADO', // Para este MVP publicamos directamente
        uploaded_by: user?.id,
        records_detected: {
          teachers: data.teachers.length,
          subjects: data.subjects.length,
          groups: data.groups.length,
          slots: data.slots.length
        }
      })
      .select('id')
      .single()

    if (importError || !importRecord) {
      throw new Error(`Error creando registro de importación: ${importError?.message}`)
    }
    const importId = importRecord.id

    // 3. UPSERT Materias (reutilizando IDs existentes si coincide el nombre)
    const { data: existingSubjects } = await adminClient.from('sch_subjects').select('id, name')
    const subByName = new Map(existingSubjects?.map(s => [s.name.trim().toLowerCase(), s.id]))
    const subjectsPayload = data.subjects.map(s => ({
      id: subByName.get(s.name.trim().toLowerCase()) || undefined,
      external_id: s.id,
      name: s.name,
      is_active: true
    }))
    const { data: dbSubjects, error: subErr } = await adminClient
      .from('sch_subjects')
      .upsert(subjectsPayload, { onConflict: 'id' })
      .select('id, external_id')
    if (subErr) throw new Error(`Error upsert materias: ${subErr.message}`)

    // 4. UPSERT Grupos (reutilizando IDs existentes si coincide el nombre para conservar director_id)
    const { data: existingGroups } = await adminClient.from('sch_groups').select('id, name, director_id')
    const grpByName = new Map(existingGroups?.map(g => [g.name.trim().toLowerCase(), g]))
    const groupsPayload = data.groups.map(g => {
      const match = grpByName.get(g.name.trim().toLowerCase())
      return {
        id: match ? match.id : undefined,
        external_id: g.id,
        name: g.name,
        director_id: match?.director_id || null,
        is_active: true
      }
    })
    const { data: dbGroups, error: grpErr } = await adminClient
      .from('sch_groups')
      .upsert(groupsPayload, { onConflict: 'id' })
      .select('id, external_id')
    if (grpErr) throw new Error(`Error upsert grupos: ${grpErr.message}`)

    // 5. UPSERT Docentes (reutilizando IDs existentes si coincide el nombre para conservar profile_id)
    const { data: existingTeachers } = await adminClient.from('academic_teachers').select('id, full_name, profile_id')
    const tchByName = new Map(existingTeachers?.map(t => [t.full_name.trim().toLowerCase(), t]))
    const teachersPayload = data.teachers.map(t => {
      const match = tchByName.get(t.name.trim().toLowerCase())
      return {
        id: match ? match.id : undefined,
        external_id: t.id,
        full_name: t.name,
        profile_id: match?.profile_id || null,
        is_active: true
      }
    })
    const { data: dbTeachers, error: tchErr } = await adminClient
      .from('academic_teachers')
      .upsert(teachersPayload, { onConflict: 'id' })
      .select('id, external_id')
    if (tchErr) throw new Error(`Error upsert docentes: ${tchErr.message}`)

    // Mapas para cruzar IDs del XML con los UUID de Supabase
    const subMap = new Map(dbSubjects?.map(s => [s.external_id, s.id]))
    const grpMap = new Map(dbGroups?.map(g => [g.external_id, g.id]))
    const tchMap = new Map(dbTeachers?.map(t => [t.external_id, t.id]))

    // 6. Preparar Asignaciones Académicas únicas (Carga Académica)
    const assignmentMap = new Map<string, any>()
    data.slots.forEach(slot => {
      const key = `${slot.teacher_id}-${slot.subject_id}-${slot.group_id}`
      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, {
          import_id: importId,
          teacher_id: tchMap.get(slot.teacher_id),
          subject_id: subMap.get(slot.subject_id),
          group_id: grpMap.get(slot.group_id),
          hours_per_week: 1 // base, sumaremos
        })
      } else {
        assignmentMap.get(key).hours_per_week++
      }
    })

    const assignmentsPayload = Array.from(assignmentMap.values()).filter(a => a.teacher_id && a.subject_id && a.group_id)
    
    // Desactivamos temporalmente las foreign keys estrictas si la limpieza no se hace por CASCADE, 
    // pero con import_id el history queda trackeado. En este caso limpiamos todo el histórico activo para publicarlo.
    // (Por seguridad, limpiamos slots viejos del lienzo general, en un futuro se filtra por import_id activo)
    await adminClient.from('sch_schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await adminClient.from('academic_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { data: dbAssignments, error: asgErr } = await adminClient
      .from('academic_assignments')
      .insert(assignmentsPayload)
      .select('id, teacher_id, subject_id, group_id')
    if (asgErr) throw new Error(`Error insertando asignaciones: ${asgErr.message}`)

    // 7. Insertar Slots Horarios
    const rawSlotsPayload = data.slots.map(slot => {
      const tId = tchMap.get(slot.teacher_id)
      const sId = subMap.get(slot.subject_id)
      const gId = grpMap.get(slot.group_id)
      const assignment = dbAssignments?.find(a => a.teacher_id === tId && a.subject_id === sId && a.group_id === gId)
      
      return {
        import_id: importId,
        assignment_id: assignment?.id,
        teacher_id: tId,
        subject_id: sId,
        group_id: gId,
        day_of_week: slot.day_of_week,
        period_id: slot.period,
        duration: 1
      }
    }).filter(s => s.assignment_id)

    // Deduplicación para evitar el error de constraint único
    const seenGroupSlots = new Set<string>()
    const seenTeacherSlots = new Set<string>()
    const slotsPayload: any[] = []

    for (const s of rawSlotsPayload) {
      const gKey = `G-${s.group_id}-${s.day_of_week}-${s.period_id}`
      const tKey = `T-${s.teacher_id}-${s.day_of_week}-${s.period_id}`
      
      // La base de datos no permite que un grupo o un profesor tengan más de una clase en el mismo slot exacto.
      // aSc a veces duplica cards si hay semanas A/B o co-enseñanza. Filtramos el primero.
      if (!seenGroupSlots.has(gKey) && !seenTeacherSlots.has(tKey)) {
        seenGroupSlots.add(gKey)
        seenTeacherSlots.add(tKey)
        slotsPayload.push(s)
      }
    }

    // Inserción masiva de slots (en chunks si es muy grande)
    const chunkSize = 500
    for (let i = 0; i < slotsPayload.length; i += chunkSize) {
      const chunk = slotsPayload.slice(i, i + chunkSize)
      const { error: insertError } = await adminClient.from('sch_schedule_slots').insert(chunk)
      if (insertError) throw new Error(`Error insertando slots: ${insertError.message}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error fatal en commitImportedSchedule:", err)
    return { success: false, error: err.message }
  }
}
