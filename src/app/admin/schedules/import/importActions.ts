'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'
import { AscParsedData, SIN_DOCENTE_ID } from '../utils/AscXmlParser'

export interface ScheduleImportMappings {
  teachers?: Record<string, string> // xmlTeacherId -> dbTeacherId
  groups?: Record<string, string>   // xmlGroupId -> dbGroupId
}

export async function commitImportedSchedule(
  data: AscParsedData, 
  fileName: string, 
  mappings?: ScheduleImportMappings
) {
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

    // 3. Procesar Materias (reutilizando IDs existentes si coincide external_id o nombre)
    const { data: existingSubjects } = await adminClient.from('sch_subjects').select('id, name, external_id')
    const subByExtId = new Map(existingSubjects?.filter(s => s.external_id).map(s => [s.external_id, s.id]))
    const subByName = new Map(existingSubjects?.map(s => [s.name.trim().toLowerCase(), s.id]))
    
    // Deduplicar materias del XML por external_id y nombre
    const uniqueSubjects = Array.from(new Map(data.subjects.map(s => [s.id, s])).values())
    const existingSubjectsMap = new Map<string, any>()
    const newSubjectsPayload: any[] = []
    const subjectsExtIdConflicts = new Set<string>()
    const subjectXmlToDbIdMap = new Map<string, string>()

    uniqueSubjects.forEach(s => {
      const matchId = subByExtId.get(s.id) || subByName.get(s.name.trim().toLowerCase())
      
      // Si el external_id estaba en otra materia distinta a matchId, liberarlo
      const oldSubId = subByExtId.get(s.id)
      if (oldSubId && (!matchId || oldSubId !== matchId)) {
        subjectsExtIdConflicts.add(oldSubId)
      }

      if (matchId) {
        existingSubjectsMap.set(matchId, {
          id: matchId,
          external_id: s.id,
          name: s.name,
          is_active: true
        })
        subjectXmlToDbIdMap.set(s.id, matchId)
      } else {
        newSubjectsPayload.push({
          external_id: s.id,
          name: s.name,
          is_active: true
        })
      }
    })

    if (subjectsExtIdConflicts.size > 0) {
      await adminClient.from('sch_subjects')
        .update({ external_id: null })
        .in('id', Array.from(subjectsExtIdConflicts))
    }

    const existingSubjectsPayload = Array.from(existingSubjectsMap.values())
    if (existingSubjectsPayload.length > 0) {
      const { error: subErr } = await adminClient
        .from('sch_subjects')
        .upsert(existingSubjectsPayload, { onConflict: 'id' })
      if (subErr) throw new Error(`Error upsert materias existentes: ${subErr.message}`)
    }
    if (newSubjectsPayload.length > 0) {
      const { data: inserted, error: subErr } = await adminClient
        .from('sch_subjects')
        .insert(newSubjectsPayload)
        .select('id, external_id')
      if (subErr) throw new Error(`Error insert nuevas materias: ${subErr.message}`)
      if (inserted) {
        inserted.forEach(i => {
          if (i.external_id) subjectXmlToDbIdMap.set(i.external_id, i.id)
        })
      }
    }

    // 4. Procesar Grupos (reutilizando IDs existentes por mapeo manual o por nombre)
    const { data: existingGroups } = await adminClient.from('sch_groups').select('id, name, director_id, external_id')
    const grpByExtId = new Map(existingGroups?.filter(g => g.external_id).map(g => [g.external_id, g]))
    const grpByName = new Map(existingGroups?.map(g => [g.name.trim().toLowerCase(), g]))
    const grpById = new Map(existingGroups?.map(g => [g.id, g]))

    const uniqueGroups = Array.from(new Map(data.groups.map(g => [g.id, g])).values())
    const existingGroupsMap = new Map<string, any>()
    const newGroupsPayload: any[] = []
    const groupsExtIdConflicts = new Set<string>()
    const groupXmlToDbIdMap = new Map<string, string>()

    uniqueGroups.forEach(g => {
      // Prioridad 1: Mapeo manual proporcionado por el usuario
      const mappedDbId = mappings?.groups?.[g.id]
      const mappedGroup = mappedDbId ? grpById.get(mappedDbId) : undefined
      
      // Prioridad 2: Match por external_id o nombre normalizado
      const match = mappedGroup || grpByExtId.get(g.id) || grpByName.get(g.name.trim().toLowerCase())

      // Si este external_id estaba asignado a otro grupo distinto, debemos liberarlo para evitar constraint error
      const oldGroup = grpByExtId.get(g.id)
      if (oldGroup && (!match || oldGroup.id !== match.id)) {
        groupsExtIdConflicts.add(oldGroup.id)
      }

      if (match) {
        existingGroupsMap.set(match.id, {
          id: match.id,
          external_id: g.id,
          name: match.name,
          director_id: match.director_id || null,
          is_active: true
        })
        groupXmlToDbIdMap.set(g.id, match.id)
      } else {
        newGroupsPayload.push({
          external_id: g.id,
          name: g.name,
          director_id: null,
          is_active: true
        })
      }
    })

    if (groupsExtIdConflicts.size > 0) {
      await adminClient.from('sch_groups')
        .update({ external_id: null })
        .in('id', Array.from(groupsExtIdConflicts))
    }

    const existingGroupsPayload = Array.from(existingGroupsMap.values())
    if (existingGroupsPayload.length > 0) {
      const { error: grpErr } = await adminClient
        .from('sch_groups')
        .upsert(existingGroupsPayload, { onConflict: 'id' })
      if (grpErr) throw new Error(`Error upsert grupos existentes: ${grpErr.message}`)
    }
    if (newGroupsPayload.length > 0) {
      const { data: inserted, error: grpErr } = await adminClient
        .from('sch_groups')
        .insert(newGroupsPayload)
        .select('id, external_id')
      if (grpErr) throw new Error(`Error insert nuevos grupos: ${grpErr.message}`)
      if (inserted) {
        inserted.forEach(i => {
          if (i.external_id) groupXmlToDbIdMap.set(i.external_id, i.id)
        })
      }
    }
    // 4b. Asegurar existencia del grupo virtual "Jornada Institucional"
    // Este grupo se usa como centinela para asignaciones sin grupo en el XML (asesorías, coordinación, etc.)
    const VIRTUAL_GROUP_EXT_ID = '__JORNADA_INSTITUCIONAL__'
    const VIRTUAL_GROUP_NAME = 'Jornada Institucional'
    let virtualGroupDbId: string
    const existingVirtual = grpByExtId.get(VIRTUAL_GROUP_EXT_ID) || grpByName.get(VIRTUAL_GROUP_NAME.toLowerCase())
    if (existingVirtual) {
      virtualGroupDbId = existingVirtual.id
    } else {
      const { data: vg, error: vgErr } = await adminClient
        .from('sch_groups')
        .insert({ external_id: VIRTUAL_GROUP_EXT_ID, name: VIRTUAL_GROUP_NAME, director_id: null, is_active: true })
        .select('id')
        .single()
      if (vgErr) throw new Error(`Error creando grupo virtual Jornada Institucional: ${vgErr.message}`)
      virtualGroupDbId = vg!.id
    }
    // Asegurarnos de que el external_id quede correctamente asignado
    await adminClient
      .from('sch_groups')
      .update({ external_id: VIRTUAL_GROUP_EXT_ID, name: VIRTUAL_GROUP_NAME, is_active: true })
      .eq('id', virtualGroupDbId)
    groupXmlToDbIdMap.set(VIRTUAL_GROUP_EXT_ID, virtualGroupDbId)

    // 5. Procesar Docentes
    const { data: existingTeachers } = await adminClient.from('academic_teachers').select('id, full_name, profile_id, external_id')
    const tchByExtId = new Map(existingTeachers?.filter(t => t.external_id).map(t => [t.external_id, t]))
    const tchByName = new Map(existingTeachers?.map(t => [t.full_name.trim().toLowerCase(), t]))
    const tchByProfileId = new Map(existingTeachers?.filter(t => t.profile_id).map(t => [t.profile_id, t]))
    
    // Obtener los perfiles para sacar el nombre formal si es que se mapeó uno manualmente
    const { data: allProfiles } = await adminClient.from('profiles').select('id, first_name, last_name')
    const profileById = new Map(allProfiles?.map(p => [p.id, p]))

    const uniqueTeachers = Array.from(new Map(data.teachers.map(t => [t.id, t])).values())
    const existingTeachersMap = new Map<string, any>()
    const newTeachersPayload: any[] = []
    const teacherXmlToDbIdMap = new Map<string, string>()

    for (const t of uniqueTeachers) {
      // Prioridad 1: Mapeo manual explícito (mappings?.teachers[t.id] contiene el profile_id)
      const mappedProfileId = mappings?.teachers?.[t.id]
      
      let match = null
      let profileFullName = null

      if (mappedProfileId) {
        match = tchByProfileId.get(mappedProfileId)
        const p = profileById.get(mappedProfileId)
        profileFullName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : null

        if (!match) {
          match = tchByExtId.get(t.id) || tchByName.get(t.name.trim().toLowerCase())
        }
      } else {
        match = tchByExtId.get(t.id) || tchByName.get(t.name.trim().toLowerCase())
      }

      // Si este external_id estaba asignado a otro docente distinto, resolver conflicto
      const oldTeacher = tchByExtId.get(t.id)
      if (oldTeacher && (!match || oldTeacher.id !== match.id)) {
        if (!oldTeacher.profile_id) {
          // Es un docente fantasma sin cuenta vinculada: reasignar referencias y eliminarlo
          if (match) {
            await adminClient.from('sch_schedule_slots').update({ teacher_id: match.id }).eq('teacher_id', oldTeacher.id)
            await adminClient.from('academic_assignments').update({ teacher_id: match.id }).eq('teacher_id', oldTeacher.id)
          }
          // Cambiamos external_id temporal para no violar UNIQUE y luego eliminamos
          const tempExt = `conflict_${oldTeacher.id.slice(0, 8)}_${Date.now()}`
          await adminClient.from('academic_teachers').update({ external_id: tempExt }).eq('id', oldTeacher.id)
          await adminClient.from('academic_teachers').delete().eq('id', oldTeacher.id)
          tchByExtId.delete(t.id)
        } else {
          // Docente real de otra cuenta: renombrar su external_id para no bloquear
          const reassignedExt = `old_${oldTeacher.external_id}_${Date.now().toString(36)}`
          await adminClient.from('academic_teachers').update({ external_id: reassignedExt }).eq('id', oldTeacher.id)
          oldTeacher.external_id = reassignedExt
          tchByExtId.delete(t.id)
          tchByExtId.set(reassignedExt, oldTeacher)
        }
      }

      if (match) {
        existingTeachersMap.set(match.id, {
          id: match.id,
          external_id: t.id,
          full_name: profileFullName || match.full_name,
          profile_id: mappedProfileId || match.profile_id || null,
          is_active: true
        })
        teacherXmlToDbIdMap.set(t.id, match.id)
      } else {
        newTeachersPayload.push({
          external_id: t.id,
          full_name: profileFullName || t.name,
          profile_id: mappedProfileId || null,
          is_active: true
        })
      }
    }

    const existingTeachersPayload = Array.from(existingTeachersMap.values())
    if (existingTeachersPayload.length > 0) {
      const { error: tchErr } = await adminClient
        .from('academic_teachers')
        .upsert(existingTeachersPayload, { onConflict: 'id' })
      if (tchErr) throw new Error(`Error upsert docentes existentes: ${tchErr.message}`)
    }
    if (newTeachersPayload.length > 0) {
      const { data: inserted, error: tchErr } = await adminClient
        .from('academic_teachers')
        .insert(newTeachersPayload)
        .select('id, external_id')
      if (tchErr) throw new Error(`Error insert nuevos docentes: ${tchErr.message}`)
      if (inserted) {
        inserted.forEach(i => {
          if (i.external_id) teacherXmlToDbIdMap.set(i.external_id, i.id)
        })
      }
    }

    // 6. Preparar Asignaciones Académicas únicas (Carga Académica)
    const assignmentMap = new Map<string, any>()
    data.slots.forEach(slot => {
      const isAutonomous = !slot.teacher_id || slot.teacher_id === SIN_DOCENTE_ID
      const tDbId = isAutonomous ? null : (teacherXmlToDbIdMap.get(slot.teacher_id) || null)
      const sDbId = subjectXmlToDbIdMap.get(slot.subject_id)
      const gDbId = groupXmlToDbIdMap.get(slot.group_id)

      const key = `${tDbId || 'TA'}-${sDbId}-${gDbId}`
      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, {
          import_id: importId,
          teacher_id: tDbId,
          subject_id: sDbId,
          group_id: gDbId,
          hours_per_week: 1 // base, sumaremos
        })
      } else {
        assignmentMap.get(key).hours_per_week++
      }
    })

    // Se incluyen asignaciones válidas: materias con docente, o materias autónomas de grupo
    const assignmentsPayload = Array.from(assignmentMap.values()).filter(a => a.subject_id && (a.teacher_id || a.group_id))

    
    // Desactivamos temporalmente las foreign keys estrictas si la limpieza no se hace por CASCADE, 
    // pero con import_id el history queda trackeado. En este caso limpiamos todo el histórico activo para publicarlo.
    // (Por seguridad, limpiamos slots viejos del lienzo general, en un futuro se filtra por import_id activo)
    await adminClient.from('sch_schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await adminClient.from('academic_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 6b. Marcar como is_active=false los docentes que ya no vienen en el nuevo XML
    // Solo se desactivan los que NO tienen cuenta de plataforma vinculada (profile_id IS NULL)
    // Los docentes con profile_id se preservan siempre para no romper el acceso a sus cuentas.
    const incomingTeacherDbIds = new Set(Array.from(teacherXmlToDbIdMap.values()))
    const obsoleteTeacherIds = (existingTeachers || [])
      .filter(t => !incomingTeacherDbIds.has(t.id) && !t.profile_id)
      .map(t => t.id)

    if (obsoleteTeacherIds.length > 0) {
      await adminClient
        .from('academic_teachers')
        .update({ is_active: false })
        .in('id', obsoleteTeacherIds)
      console.log(`[ImportActions] ${obsoleteTeacherIds.length} docente(s) marcado(s) como inactivos (no presentes en nuevo XML).`)
    }

    const { data: dbAssignments, error: asgErr } = await adminClient
      .from('academic_assignments')
      .insert(assignmentsPayload)
      .select('id, teacher_id, subject_id, group_id')
    if (asgErr) throw new Error(`Error insertando asignaciones: ${asgErr.message}`)

    // 7. Insertar Slots Horarios
    const rawSlotsPayload = data.slots.map(slot => {
      const isAutonomous = !slot.teacher_id || slot.teacher_id === SIN_DOCENTE_ID
      const tId = isAutonomous ? null : (teacherXmlToDbIdMap.get(slot.teacher_id) || null)
      const sId = subjectXmlToDbIdMap.get(slot.subject_id)
      const gId = groupXmlToDbIdMap.get(slot.group_id)
      const assignment = dbAssignments?.find(a => 
        (isAutonomous ? a.teacher_id === null : a.teacher_id === tId) && 
        a.subject_id === sId && 
        a.group_id === gId
      )
      
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
    }).filter(s => s.assignment_id && s.subject_id && (s.teacher_id || s.group_id))


    // Deduplicación para evitar el error de constraint único
    const seenGroupSlots = new Set<string>()
    const seenTeacherSlots = new Set<string>()
    const slotsPayload: any[] = []

    for (const s of rawSlotsPayload) {
      const gKey = `G-${s.group_id}-${s.day_of_week}-${s.period_id}`
      const tKey = s.teacher_id ? `T-${s.teacher_id}-${s.day_of_week}-${s.period_id}` : null
      
      const isVirtualGroup = s.group_id === virtualGroupDbId;
      
      // La base de datos no permite que un grupo o un profesor tengan más de una clase en el mismo slot exacto.
      // (Excepción: el grupo virtual de Jornada Institucional permite a varios docentes al mismo tiempo)
      // aSc a veces duplica cards si hay semanas A/B o co-enseñanza. Filtramos el primero.
      const groupTaken = !isVirtualGroup && seenGroupSlots.has(gKey);
      const teacherTaken = tKey ? seenTeacherSlots.has(tKey) : false;

      if (!groupTaken && !teacherTaken) {
        if (!isVirtualGroup) seenGroupSlots.add(gKey);
        if (tKey) seenTeacherSlots.add(tKey);
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

/**
 * Obtiene los docentes y grupos existentes en la plataforma para el paso de cotejo interactivo
 */
export async function getScheduleEntitiesAction() {
  try {
    const adminClient = await createAdminClient()
    const [teachersRes, groupsRes, profilesRes] = await Promise.all([
      // academic_teachers: docentes ya en el catálogo académico
      // NOTA: profiles no tiene columna 'email' (esa columna vive en auth.users)
      adminClient
        .from('academic_teachers')
        .select('id, full_name, profile_id, profiles(first_name, last_name)')
        .order('full_name'),
      // Grupos escolares sin filtro extra, para poblar el combobox de grupos
      adminClient
        .from('sch_groups')
        .select('id, name')
        .order('name'),
      // Perfiles de la plataforma con rol 'teacher' (mismo query que en /groups/page.tsx)
      adminClient
        .from('profiles')
        .select('id, first_name, last_name, roles!inner(name)')
        .eq('roles.name', 'teacher')
        .eq('status', 'active')
        .order('first_name')
    ])

    if (teachersRes.error) console.error('[getScheduleEntitiesAction] academic_teachers error:', teachersRes.error)
    if (profilesRes.error) console.error('[getScheduleEntitiesAction] profiles error:', profilesRes.error)
    if (groupsRes.error) console.error('[getScheduleEntitiesAction] sch_groups error:', groupsRes.error)

    // Docentes académicos ya registrados (pueden o no tener profile_id)
    const academicTeachers = (teachersRes.data || []).map((t: any) => ({
      id: t.id,
      full_name: t.full_name,
      profile_id: t.profile_id,
      profile_name: t.profiles
        ? `${t.profiles.first_name || ''} ${t.profiles.last_name || ''}`.trim()
        : null,
      email: null,
      is_academic_teacher: true
    }))

    // Perfiles con rol 'teacher' en la plataforma (tienen cuenta activa)
    const platformProfiles = (profilesRes.data || []).map((p: any) => ({
      id: p.id,
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      profile_id: p.id,
      profile_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: null,
      is_platform_profile: true
    }))

    return {
      teachers: academicTeachers,
      profiles: platformProfiles,
      groups: groupsRes.data || []
    }
  } catch (e: any) {
    console.error('Error al obtener entidades para mapeo:', e)
    return { teachers: [], profiles: [], groups: [] }
  }
}


