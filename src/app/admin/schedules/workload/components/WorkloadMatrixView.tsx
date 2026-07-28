'use client'

import React, { useState, useMemo } from 'react'
import { Download, Printer, Search, FileSpreadsheet, Users, Briefcase } from 'lucide-react'

interface WorkloadMatrixViewProps {
  teachers: any[]
  groups: any[]
  curriculumRows: any[]
  settingsMap: Map<string, number>
  normalWorkloadSubjectIds?: Set<string>
}

// Function to map subjects to Core Areas (Núcleo)
function getNucleoForSubject(subjectName: string): string {
  const name = subjectName.toLowerCase()
  if (name.includes('matemátic') || name.includes('física') || name.includes('química') || name.includes('ciencias natur') || name.includes('tecnolog') || name.includes('informátic') || name.includes('biolog') || name.includes('logic')) {
    return 'Ciencia y tecnología'
  }
  if (name.includes('español') || name.includes('inglés') || name.includes('humanidad') || name.includes('lengua') || name.includes('social') || name.includes('ética') || name.includes('religió') || name.includes('filosof') || name.includes('cívic')) {
    return 'Humanidades'
  }
  if (name.includes('física') && name.includes('educac')) {
    return 'Lúdico artístico'
  }
  if (name.includes('artístic') || name.includes('música') || name.includes('danza') || name.includes('lúdic')) {
    return 'Lúdico artístico'
  }
  return 'Ciencia y tecnología'
}

// Parse grade and short subgroup name from group name
function parseGroupInfo(groupName: string) {
  const name = groupName.trim()
  
  if (/^6/i.test(name)) {
    return { gradeKey: '6', gradeLabel: 'GRADO 6º', headerBg: 'bg-slate-700 text-white', colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' }
  }
  if (/^7/i.test(name)) {
    return { gradeKey: '7', gradeLabel: 'GRADO 7º', headerBg: 'bg-slate-800 text-white', colBg: 'bg-sky-50/40 dark:bg-sky-950/10' }
  }
  if (/^8/i.test(name)) {
    return { gradeKey: '8', gradeLabel: 'GRADO 8º', headerBg: 'bg-amber-800 text-white', colBg: 'bg-amber-50/40 dark:bg-amber-950/10' }
  }
  if (/^9/i.test(name)) {
    return { gradeKey: '9', gradeLabel: 'GRADO 9º', headerBg: 'bg-blue-800 text-white', colBg: 'bg-blue-50/40 dark:bg-blue-950/10' }
  }
  if (/^10/i.test(name)) {
    return { gradeKey: '10', gradeLabel: 'GRADO 10º', headerBg: 'bg-yellow-400 text-slate-900 font-bold', colBg: 'bg-yellow-50/40 dark:bg-yellow-950/10' }
  }
  if (/^11/i.test(name)) {
    return { gradeKey: '11', gradeLabel: 'GRADO 11º', headerBg: 'bg-red-600 text-white', colBg: 'bg-emerald-100/40 dark:bg-emerald-900/10' }
  }
  if (/12/i.test(name)) {
    return { gradeKey: '12', gradeLabel: 'GRADO 12º(II)', headerBg: 'bg-emerald-700 text-white', colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' }
  }
  if (/13/i.test(name)) {
    return { gradeKey: '13', gradeLabel: 'GRADO 13º(IV)', headerBg: 'bg-emerald-800 text-white', colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' }
  }
  if (/nivelatorio/i.test(name)) {
    return { gradeKey: 'niv', gradeLabel: 'Nivelatorio', headerBg: 'bg-emerald-600 text-white', colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' }
  }

  // Si es un grupo personalizado (ej. Transición, PFC, Jardín, etc.), usar su nombre real en lugar de "OTRO"
  const cleanLabel = name.split(/[\s-_\d]/)[0] || name
  const gradeKey = cleanLabel.toLowerCase()
  return { 
    gradeKey, 
    gradeLabel: cleanLabel.toUpperCase(), 
    headerBg: 'bg-slate-700 text-white', 
    colBg: 'bg-slate-50 dark:bg-slate-900' 
  }
}

export default function WorkloadMatrixView({
  teachers,
  groups,
  curriculumRows,
  settingsMap,
  normalWorkloadSubjectIds
}: WorkloadMatrixViewProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // 2. Identify multi-teacher (group, subject) pairs
  const multiTeacherKeys = useMemo(() => {
    const set = new Set<string>()
    const groupSubjectTeachers = new Map<string, Set<string>>()
    if (curriculumRows) {
      curriculumRows.forEach((row: any) => {
        if (!row.group_id || !row.subject_id || !row.teacher_id) return
        const key = `${row.group_id}-${row.subject_id}`
        if (!groupSubjectTeachers.has(key)) groupSubjectTeachers.set(key, new Set())
        groupSubjectTeachers.get(key)!.add(row.teacher_id)
      })
      for (const [key, tSet] of groupSubjectTeachers.entries()) {
        if (tSet.size > 1) set.add(key)
      }
    }
    return set
  }, [curriculumRows])

  // Filter groups to exclude pseudo-groups created specifically for multi-teacher subjects
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const gName = g.name.toLowerCase()
      // Filter out groups named like multi-teacher subjects (e.g. "Núcleo", "Comité")
      if (gName.includes('núcleo') || gName.includes('comité') || gName.includes('co-docencia')) return false
      return true
    })
  }, [groups])

  // Re-organize gradeGroups based on filteredGroups
  const { gradeGroups, sortedGroups } = useMemo(() => {
    const sorted = [...filteredGroups].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    
    const gradeMap = new Map<string, { gradeKey: string; gradeLabel: string; headerBg: string; colBg: string; groups: any[] }>()

    sorted.forEach(g => {
      const info = parseGroupInfo(g.name)
      if (!gradeMap.has(info.gradeKey)) {
        gradeMap.set(info.gradeKey, {
          gradeKey: info.gradeKey,
          gradeLabel: info.gradeLabel,
          headerBg: info.headerBg,
          colBg: info.colBg,
          groups: []
        })
      }
      let shortName = g.name
      const parts = g.name.split(/[-°_\s]+/)
      if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
        shortName = parts[parts.length - 1]
      } else {
        const numbers = g.name.match(/\d+/g)
        if (numbers && numbers.length > 1) {
          shortName = numbers[numbers.length - 1]
        } else if (numbers && numbers.length === 1) {
          shortName = numbers[0]
        }
      }
      if (shortName.length === 1) shortName = `0${shortName}`
      if (!shortName) shortName = g.name

      gradeMap.get(info.gradeKey)!.groups.push({
        ...g,
        shortName
      })
    })

    return {
      gradeGroups: Array.from(gradeMap.values()),
      sortedGroups: sorted
    }
  }, [filteredGroups])

  // 3. Build teacher rows & details map
  const matrixData = useMemo(() => {
    const map = new Map<string, any>()

    // Initialize all teachers
    teachers.forEach((t, idx) => {
      const dirGrp = groups.find(g => g.director_id === t.id)

      map.set(t.id, {
        index: idx + 1,
        teacherId: t.id,
        teacherName: t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Sin Nombre',
        email: t.email,
        subjects: new Map<string, { subjectId: string; subjectName: string; hoursByGroup: Map<string, number>; subtotal: number; isMultiTeacher: boolean }>(),
        totalHours: 0,
        maxHours: settingsMap.get(t.id) || 22,
        dirGroup: dirGrp ? dirGrp.name : '-',
        nucleos: new Set<string>()
      })
    })

    // Populate from curriculum
    if (curriculumRows) {
      curriculumRows.forEach(row => {
        if (!row.teacher_id) return
        let tData = map.get(row.teacher_id)
        if (!tData) {
          tData = {
            index: map.size + 1,
            teacherId: row.teacher_id,
            teacherName: 'Docente',
            subjects: new Map(),
            totalHours: 0,
            maxHours: 22,
            dirGroup: '-',
            nucleos: new Set()
          }
          map.set(row.teacher_id, tData)
        }

        const subjId = row.subject_id || 'unknown'
        const subjName = row.sch_subjects?.name || 'Materia'
        const hours = row.hours_per_week || 0

        const pairKey = `${row.group_id}-${row.subject_id}`
        const isMultiTeacher = multiTeacherKeys.has(pairKey) || 
          subjName.toLowerCase().includes('núcleo') || 
          subjName.toLowerCase().includes('comité') || 
          subjName.toLowerCase().includes('co-docencia')

        if (!tData.subjects.has(subjId)) {
          tData.subjects.set(subjId, {
            subjectId: subjId,
            subjectName: subjName,
            hoursByGroup: new Map<string, number>(),
            subtotal: 0,
            isMultiTeacher
          })
        }

        const sData = tData.subjects.get(subjId)!
        if (isMultiTeacher) {
          sData.isMultiTeacher = true
        }

        // Las materias multi-docente NO colocan números en las columnas de grupo
        if (!isMultiTeacher && row.group_id) {
          const currentGrpHours = sData.hoursByGroup.get(row.group_id) || 0
          sData.hoursByGroup.set(row.group_id, currentGrpHours + hours)
        }

        sData.subtotal += hours
        tData.totalHours += hours

        const nucleo = getNucleoForSubject(subjName)
        tData.nucleos.add(nucleo)
      })
    }

    // Convert map to structured array
    return Array.from(map.values())
      .filter(t => t.totalHours > 0 || t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(t => 
        !searchTerm || 
        t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Array.from(t.subjects.values()).some((s: any) => s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  }, [teachers, groups, curriculumRows, settingsMap, searchTerm])

  const handleExportCSV = () => {
    let csv = 'No;Apellidos y Nombres;Asignatura;'
    sortedGroups.forEach(g => {
      csv += `${g.name};`
    })
    csv += 'Subtotal Asignatura;Total Horas Por Docente;Total Horas Extras;Dir. Grupo;Núcleo\n'

    matrixData.forEach(t => {
      const subjList = Array.from(t.subjects.values())
      const totalExtras = Math.max(0, t.totalHours - t.maxHours)
      const nucleoStr = Array.from(t.nucleos).join(' / ') || 'Ciencia y tecnología'

      if (subjList.length === 0) {
        csv += `${t.index};"${t.teacherName}";Sin Asignaciones;`
        sortedGroups.forEach(() => { csv += '0;' })
        csv += `0;${t.totalHours};${totalExtras};"${t.dirGroup}";"${nucleoStr}"\n`
      } else {
        subjList.forEach((s: any, sIdx: number) => {
          csv += `${t.index};"${t.teacherName}";"${s.subjectName}";`
          sortedGroups.forEach(g => {
            const h = s.hoursByGroup.get(g.id) || ''
            csv += `${h};`
          })
          csv += `${s.subtotal};`
          if (sIdx === 0) {
            csv += `${t.totalHours};${totalExtras};"${t.dirGroup}";"${nucleoStr}"`
          } else {
            csv += `;;;`
          }
          csv += '\n'
        })
      }
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Carga_Academica_Institucional_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar docente o asignatura en la matriz..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Exportar Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Imprimir Consolidado
          </button>
        </div>
      </div>

      {/* Main Excel Matrix Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:border-none print:shadow-none">
        <table className="w-full text-center border-collapse text-xs select-none">
          <thead>
            {/* Header Row 1: Main Grade Groups */}
            <tr className="border-b border-slate-300 dark:border-slate-700 font-bold">
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-10">
                Nº
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[180px] text-left">
                APELLIDOS Y NOMBRES
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[160px] text-left">
                ASIGNATURA
              </th>

              {gradeGroups.map(gg => (
                <th
                  key={gg.gradeKey}
                  colSpan={gg.groups.length}
                  className={`p-2 border-r border-slate-300 dark:border-slate-700 text-xs font-extrabold uppercase ${gg.headerBg}`}
                >
                  {gg.gradeLabel}
                </th>
              ))}

              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-20">
                Subtotal Asignatura
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-24">
                Total Horas Por Docente
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-20">
                Total Horas Extras
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-20">
                Dir. Grupo
              </th>
              <th rowSpan={2} className="p-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[140px]">
                Núcleo
              </th>
            </tr>

            {/* Header Row 2: Subgroups (01, 02...) */}
            <tr className="border-b border-slate-300 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
              {gradeGroups.flatMap(gg =>
                gg.groups.map(g => (
                  <th
                    key={g.id}
                    className={`p-1.5 border-r border-slate-300 dark:border-slate-700 text-[11px] font-bold min-w-[36px] ${gg.colBg}`}
                    title={g.name}
                  >
                    {g.shortName}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {matrixData.map((t) => {
              const subjList = Array.from(t.subjects.values())
              const rowSpanCount = Math.max(1, subjList.length)
              const totalExtras = Math.max(0, t.totalHours - t.maxHours)
              const nucleoText = Array.from(t.nucleos).join(' / ') || 'Ciencia y tecnología'

              if (subjList.length === 0) {
                return (
                  <tr key={t.teacherId} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50">
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold bg-yellow-300 text-slate-900">
                      {t.index}
                    </td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold bg-yellow-300 text-slate-900 text-left uppercase text-xs">
                      {t.teacherName}
                    </td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 text-left text-slate-400 italic">
                      Sin Asignatura
                    </td>
                    {gradeGroups.flatMap(gg =>
                      gg.groups.map(g => (
                        <td key={g.id} className={`p-2 border-r border-slate-200 dark:border-slate-800 ${gg.colBg}`} />
                      ))
                    )}
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold text-slate-400">0</td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-200">0</td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold text-slate-400">0</td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-800 text-xs font-semibold">{t.dirGroup}</td>
                    <td className="p-2 border-slate-300 dark:border-slate-800 text-xs font-semibold text-left">{nucleoText}</td>
                  </tr>
                )
              }

              return subjList.map((s: any, sIdx: number) => (
                <tr key={`${t.teacherId}-${s.subjectId}`} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 transition-colors">
                  {/* Index and Teacher Name spanned across subject rows */}
                  {sIdx === 0 && (
                    <>
                      <td
                        rowSpan={rowSpanCount}
                        className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold bg-yellow-300 dark:bg-yellow-500/80 text-slate-900 align-middle text-xs"
                      >
                        {t.index}
                      </td>
                      <td
                        rowSpan={rowSpanCount}
                        className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold bg-yellow-300 dark:bg-yellow-500/80 text-slate-900 align-middle text-left uppercase text-xs"
                      >
                        {t.teacherName}
                      </td>
                    </>
                  )}

                  {/* Subject Name */}
                  <td className="p-2 border-r border-slate-300 dark:border-slate-800 text-left font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {s.subjectName}
                  </td>

                  {/* Group Hours */}
                  {gradeGroups.flatMap(gg =>
                    gg.groups.map(g => {
                      const h = s.hoursByGroup.get(g.id)
                      return (
                        <td
                          key={g.id}
                          className={`p-1.5 border-r border-slate-200 dark:border-slate-800 font-bold text-xs ${
                            h ? 'text-indigo-700 dark:text-indigo-300 font-black' : 'text-slate-300 dark:text-slate-700'
                          } ${gg.colBg}`}
                        >
                          {h || ''}
                        </td>
                      )
                    })
                  )}

                  {/* Subtotal Asignatura */}
                  <td className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    {s.subtotal}
                  </td>

                  {/* Spanned Total Columns */}
                  {sIdx === 0 && (
                    <>
                      <td
                        rowSpan={rowSpanCount}
                        className="p-2 border-r border-slate-300 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white align-middle text-sm bg-slate-50 dark:bg-slate-800/40"
                      >
                        {t.totalHours}
                      </td>
                      <td
                        rowSpan={rowSpanCount}
                        className={`p-2 border-r border-slate-300 dark:border-slate-800 font-bold align-middle text-xs ${
                          totalExtras > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-400'
                        }`}
                      >
                        {totalExtras}
                      </td>
                      <td
                        rowSpan={rowSpanCount}
                        className="p-2 border-r border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 align-middle text-xs"
                      >
                        {t.dirGroup}
                      </td>
                      <td
                        rowSpan={rowSpanCount}
                        className="p-2 border-slate-300 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 text-left align-middle text-xs"
                      >
                        {nucleoText}
                      </td>
                    </>
                  )}
                </tr>
              ))
            })}

            {matrixData.length === 0 && (
              <tr>
                <td
                  colSpan={4 + sortedGroups.length + 5}
                  className="p-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No se encontraron asignaciones académicas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
