'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, FileSpreadsheet, FileText, MoreVertical, Edit2, Trash2, Loader2, Users, ArrowRight } from 'lucide-react'
import { getAssistedSubjects, deleteAssistedSubject, AssistedSubject } from '../../application/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { CreateSubjectModal } from '../components/CreateSubjectModal'

export interface PlanillaAsistidaListProps {
  initialSubjects?: AssistedSubject[]
}

export function PlanillaAsistidaListScreen({ initialSubjects }: PlanillaAsistidaListProps = {}) {
  const [subjects, setSubjects] = useState<AssistedSubject[]>(initialSubjects || [])
  const [isLoading, setIsLoading] = useState(!initialSubjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<AssistedSubject | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const data = await getAssistedSubjects()
      setSubjects(data)
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar las materias')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialSubjects) {
      loadSubjects()
    }
    
    // Cerrar dropdown globalmente
    const handleGlobalClick = () => setOpenDropdownId(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [initialSubjects])

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(prev => prev === id ? null : id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenDropdownId(null)
    
    toast.error('¿Estás seguro de eliminar esta planilla?', {
      description: 'Todos los estudiantes y notas asociadas se perderán permanentemente.',
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            setDeletingId(id)
            await deleteAssistedSubject(id)
            toast.success('Planilla eliminada exitosamente')
            loadSubjects()
          } catch (error) {
            toast.error('Error al eliminar la planilla')
          } finally {
            setDeletingId(null)
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const uniqueGrades = React.useMemo(() => Array.from(new Set(subjects.map(s => s.grade?.toString()).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [subjects])
  const uniqueGroups = React.useMemo(() => Array.from(new Set(subjects.map(s => s.group_number?.toString() || (s.grade === 12 || s.grade === 13 ? '1' : '')).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [subjects])
  const uniqueSubjects = React.useMemo(() => Array.from(new Set(subjects.map(s => s.name).filter(Boolean))).sort(), [subjects])
  const uniquePeriods = React.useMemo(() => Array.from(new Set(subjects.map(s => s.period?.toString()).filter(Boolean))).sort(), [subjects])

  const filteredSubjects = React.useMemo(() => subjects.filter(subject => {
    const isPfc12 = subject.grade === 12
    const isPfc13 = subject.grade === 13
    const isNivelatorio = subject.grade === 0 || subject.name.toLowerCase().includes('nivelat')
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.grade !== undefined && subject.grade !== null && subject.grade.toString().includes(searchQuery)) ||
      (isPfc12 && 'pfc-12'.includes(searchQuery.toLowerCase())) ||
      (isPfc13 && 'pfc-13'.includes(searchQuery.toLowerCase())) ||
      (isNivelatorio && 'nivelatorio'.includes(searchQuery.toLowerCase())) ||
      subject.period?.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesGrade = selectedGrade === 'all' || subject.grade?.toString() === selectedGrade
    const matchesGroup = selectedGroup === 'all' || 
      subject.group_number?.toString() === selectedGroup || 
      (!subject.group_number && selectedGroup === '1' && (isPfc12 || isPfc13 || isNivelatorio))
    const matchesSubject = selectedSubject === 'all' || subject.name === selectedSubject
    const matchesPeriod = selectedPeriod === 'all' || subject.period?.toString() === selectedPeriod

    return matchesSearch && matchesGrade && matchesGroup && matchesSubject && matchesPeriod
  }), [subjects, searchQuery, selectedGrade, selectedGroup, selectedSubject, selectedPeriod])

  return (
    <div className="pl-page">
      <style>{`
        .pl-page {
          --pl-bg: #e9f0ec;
          --pl-tile: #fff;
          --pl-tile-b: #d9e4de;
          --pl-ink: #10231c;
          --pl-mute: #5f776b;
          --pl-soft: #eef4f0;
          --pl-hi: #123325;
          --pl-hi-ink: #fff;
          --pl-hi-mute: #6f9e8a;
          --pl-acc: #12a374;
          --pl-accbg: rgba(18,163,116,.12);
          --pl-bad: #e5484d;
          --pl-w: #c97a0e;
          padding: 20px 16px 40px;
          margin: 0 auto;
          max-width: 1100px;
          color: var(--pl-ink);
        }
        .dark .pl-page {
          --pl-bg: #0c1512;
          --pl-tile: #15221d;
          --pl-tile-b: #22352d;
          --pl-ink: #eaf4ef;
          --pl-mute: #8aa399;
          --pl-soft: #1c2c26;
          --pl-hi: #123325;
          --pl-hi-ink: #fff;
          --pl-hi-mute: #6f9e8a;
          --pl-acc: #5ee0b0;
          --pl-accbg: rgba(94,224,176,.12);
          --pl-bad: #ff7a85;
          --pl-w: #f2b04b;
        }
        @media(min-width: 760px) { .pl-page { padding: 28px 32px 56px; } }

        .pl-ptop { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        .pl-ptop h1 { margin: 0; font-size: clamp(28px, 5vw, 36px); line-height: 1.05; font-weight: 700; letter-spacing: -1.2px; display: flex; align-items: center; gap: 14px; }
        .pl-ptop h1 .pl-go { width: 48px; height: 48px; background: var(--pl-accbg); border-radius: 50%; display: grid; place-items: center; color: var(--pl-acc); flex: none; }
        .pl-ptop .pl-sub { margin: 10px 0 0; color: var(--pl-mute); font-size: 15px; max-width: 46em; }
        
        .pl-btn { border: 0; background: var(--pl-hi); color: var(--pl-hi-ink); border-radius: 99px; padding: 12px 22px; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.15s; outline: none; }
        .pl-btn:active { transform: scale(0.96); }
        .pl-btn:focus-visible { outline: 2px solid var(--pl-acc); outline-offset: 2px; }
        .pl-btn.pl-add { height: 48px; }

        .pl-tabs { display: inline-flex; gap: 4px; padding: 5px; border-radius: 99px; background: var(--pl-tile); border: 1px solid var(--pl-tile-b); margin-bottom: 22px; overflow-x: auto; max-width: 100%; }
        .pl-tabs button { border: 0; background: transparent; border-radius: 99px; padding: 10px 20px; font-size: 14px; font-weight: 700; color: var(--pl-mute); cursor: pointer; white-space: nowrap; transition: all 0.2s; outline: none; }
        .pl-tabs button.on { background: var(--pl-hi); color: var(--pl-hi-ink); }
        .pl-tabs button:focus-visible { outline: 2px solid var(--pl-acc); outline-offset: 2px; }

        .pl-fil { background: var(--pl-tile); border: 1px solid var(--pl-tile-b); padding: 20px; margin-bottom: 24px; border-radius: 28px; }
        .pl-frow { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .pl-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 18px; border-radius: 99px; background: var(--pl-soft); border: 1px solid var(--pl-tile-b); color: var(--pl-mute); transition: border-color 0.15s; }
        .pl-search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--pl-ink); font: inherit; font-size: 14px; outline: 0; }
        .pl-search input::placeholder { color: var(--pl-mute); }
        .pl-search:focus-within { border-color: var(--pl-acc); }
        
        .pl-count { font-size: 13px; font-weight: 700; color: var(--pl-acc); background: var(--pl-accbg); border-radius: 99px; padding: 11px 16px; white-space: nowrap; }
        
        .pl-sels { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--pl-tile-b); }
        @media(min-width: 760px) { .pl-sels { grid-template-columns: repeat(3, 1fr); } }
        .pl-sels label { display: block; font-size: 12px; font-weight: 700; color: var(--pl-mute); margin: 0 0 6px 8px; }
        .pl-sel { position: relative; }
        .pl-sel select { appearance: none; -webkit-appearance: none; width: 100%; height: 46px; border-radius: 99px; border: 1px solid var(--pl-tile-b); background: var(--pl-soft); color: var(--pl-ink); font: inherit; font-size: 14px; font-weight: 600; padding: 0 40px 0 18px; cursor: pointer; outline: none; transition: border-color 0.15s; }
        .pl-sel select:focus { border-color: var(--pl-acc); }
        .pl-sel svg { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; pointer-events: none; color: var(--pl-mute); }

        .pl-pgrid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media(min-width: 600px) { .pl-pgrid { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; } }
        
        .pl-pc { background: var(--pl-tile); border: 1px solid var(--pl-tile-b); border-radius: 20px; padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; }
        @media(min-width: 600px) { .pl-pc { border-radius: 28px; padding: 20px; gap: 14px; } }
        @media(prefers-reduced-motion: no-preference) { .pl-pc { transition: transform 0.15s, box-shadow 0.15s; } .pl-pc:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.03); } }
        .pl-pc .h { display: flex; align-items: flex-start; gap: 10px; padding-right: 32px; }
        @media(min-width: 600px) { .pl-pc .h { gap: 12px; padding-right: 40px; } }
        .pl-pc .h .pl-go { background: var(--pl-accbg); width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: var(--pl-acc); flex: none; }
        @media(min-width: 600px) { .pl-pc .h .pl-go { width: 40px; height: 40px; } }
        .pl-pc h3 { flex: 1; margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; color: var(--pl-ink); padding-top: 2px; word-break: break-word; hyphens: auto; }
        @media(min-width: 600px) { .pl-pc h3 { font-size: 17px; padding-top: 4px; } }
        
        .pl-kebab { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.7); backdrop-filter: blur(4px); color: var(--pl-mute); display: grid; place-items: center; cursor: pointer; transition: background 0.15s; z-index: 10; }
        .dark .pl-kebab { background: rgba(0,0,0,0.3); }
        @media(min-width: 600px) { .pl-kebab { top: 18px; right: 18px; width: 36px; height: 36px; background: transparent; } }
        .pl-kebab:hover { background: var(--pl-soft); }
        
        .pl-gg { display: flex; flex-wrap: wrap; gap: 6px; }
        @media(min-width: 600px) { .pl-gg { display: grid; grid-template-columns: 1fr 1fr; background: var(--pl-soft); border-radius: 22px; padding: 14px 0; text-align: center; gap: 0; } }
        @media(min-width: 600px) { .pl-gg div+div { border-left: 1px solid var(--pl-tile-b); } }
        .pl-gg small { display: none; }
        @media(min-width: 600px) { .pl-gg small { display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.3px; color: var(--pl-mute); } }
        .pl-gg b { font-size: 12px; font-weight: 700; background: var(--pl-soft); padding: 4px 10px; border-radius: 99px; color: var(--pl-ink); }
        @media(min-width: 600px) { .pl-gg b { font-size: 34px; line-height: 1.1; letter-spacing: -1px; color: var(--pl-acc); display: block; margin-top: 2px; background: transparent; padding: 0; } }
        
        .pl-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .pl-chips span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; border-radius: 99px; padding: 5px 12px; }
        .pl-chips .p { background: var(--pl-accbg); color: var(--pl-acc); }
        .pl-chips .e { display: none; background: color-mix(in srgb, var(--pl-w) 16%, transparent); color: var(--pl-w); }
        @media(min-width: 600px) { .pl-chips .e { display: inline-flex; } }
        
        .pl-rep { display: none; font-size: 12px; color: var(--pl-mute); font-weight: 500; border-top: 1px solid var(--pl-tile-b); padding-top: 12px; line-height: 1.4; -webkit-box-orient: vertical; overflow: hidden; }
        @media(min-width: 600px) { .pl-rep { display: -webkit-box; -webkit-line-clamp: 2; } }
        
        .pl-open-btn { margin-top: auto; display: flex; justify-content: center; align-items: center; gap: 6px; height: 36px; width: 100%; border: 0; border-radius: 99px; background: var(--pl-hi); color: var(--pl-hi-ink); font-size: 13px; font-weight: 700; text-decoration: none; transition: transform 0.15s; outline: none; }
        @media(min-width: 600px) { .pl-open-btn { height: 48px; gap: 8px; font-size: 14px; } }
        .pl-open-btn:active { transform: scale(0.97); }
        .pl-open-btn:focus-visible { outline: 2px solid var(--pl-acc); outline-offset: 2px; }
        
        .pl-btn-txt { display: none; }
        @media(min-width: 600px) { .pl-btn-txt { display: inline; } }
        
        .pl-none { grid-column: 1/-1; text-align: center; color: var(--pl-mute); padding: 40px; font-size: 14px; background: var(--pl-tile); border: 1px dashed var(--pl-tile-b); border-radius: 28px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .pl-none .pl-go { width: 56px; height: 56px; background: var(--pl-soft); border-radius: 50%; display: grid; place-items: center; color: var(--pl-mute); }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-ptop">
        <div>
          <h1>
            <span className="pl-go"><FileSpreadsheet size={24} strokeWidth={2} /></span>
            Planilla Asistida
          </h1>
          <p className="pl-sub">
            Registra y calcula las calificaciones de tus estudiantes de forma rápida y sencilla, independiente de los cursos oficiales.
          </p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="pl-btn pl-add">
          <Plus size={20} strokeWidth={2.5} />
          Crear planilla
        </button>
      </motion.div>

      {uniquePeriods.length > 0 && (
        <div className="pl-tabs" role="tablist">
          <button
            className={selectedPeriod === 'all' ? 'on' : ''}
            onClick={() => setSelectedPeriod('all')}
            role="tab"
          >
            Todos los periodos
          </button>
          {uniquePeriods.map(p => (
            <button
              key={p}
              className={selectedPeriod === p ? 'on' : ''}
              onClick={() => setSelectedPeriod(p as string)}
              role="tab"
            >
              Periodo {p}
            </button>
          ))}
        </div>
      )}

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-fil">
        <div className="pl-frow">
          <label className="pl-search">
            <Search size={20} strokeWidth={2.5} />
            <input
              type="search"
              placeholder="Buscar por nombre, grado o periodo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <span className="pl-count">
            {filteredSubjects.length} {filteredSubjects.length === 1 ? 'materia' : 'materias'}
          </span>
        </div>
        <div className="pl-sels">
          <div>
            <label htmlFor="fm">Materia</label>
            <div className="pl-sel">
              <select id="fm" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="all">Todas las materias</option>
                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div>
            <label htmlFor="fg">Grado</label>
            <div className="pl-sel">
              <select id="fg" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                <option value="all">Todos los grados</option>
                {uniqueGrades.map(g => (
                  <option key={g} value={g}>
                    {g === '12' ? 'PFC-12 (12°)' : g === '13' ? 'PFC-13 (13°)' : g === '0' ? 'Nivelatorio' : `Grado ${g}°`}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div>
            <label htmlFor="fr">Grupo</label>
            <div className="pl-sel">
              <select id="fr" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                <option value="all">Todos los grupos</option>
                {uniqueGroups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        </div>
      </motion.section>

      {isLoading ? (
        <div className="pl-pgrid">
          {[1, 2, 3].map(i => (
            <div key={i} className="pl-pc" style={{ minHeight: '280px', opacity: 0.5, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="pl-pgrid">
          {filteredSubjects.map((subject, index) => (
            <motion.article
              key={subject.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="pl-pc"
            >
              <div className="h">
                <span className="pl-go"><FileText size={20} strokeWidth={2.5} /></span>
                <h3 style={{ fontSize: '19px', fontWeight: 600 }}>{subject.name}</h3>
              </div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: 0 }}>
                  <button 
                    className="pl-kebab" 
                    aria-label="Opciones"
                    onClick={(e) => toggleDropdown(subject.id, e)}
                    disabled={deletingId === subject.id}
                  >
                    {deletingId === subject.id ? <Loader2 size={20} className="animate-spin" /> : <MoreVertical size={20} />}
                  </button>
                  {openDropdownId === subject.id && (
                    <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] z-20 py-1.5 overflow-hidden font-semibold text-sm" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => { 
                          e.preventDefault()
                          setOpenDropdownId(null)
                          setEditingSubject(subject)
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2.5 transition-colors"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button 
                        onClick={(e) => handleDelete(subject.id, e)}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  )}
              </div>

              <div className="pl-gg">
                <div>
                  <small>GRADO</small>
                  <b>{subject.grade === 12 ? 'P-12' : subject.grade === 13 ? 'P-13' : subject.grade === 0 ? 'Niv' : (subject.grade ? `${subject.grade}` : '-')}</b>
                </div>
                <div>
                  <small>GRUPO</small>
                  <b>{subject.group_number !== undefined && subject.group_number !== null ? subject.group_number : '1'}</b>
                </div>
              </div>

              <div className="pl-chips">
                {subject.period && <span className="p">Periodo {subject.period}</span>}
                <span className="e"><Users size={14} strokeWidth={2.5}/> {subject.students_count || 0} estudiantes</span>
              </div>

              {subject.description ? (
                <div className="pl-rep" title={subject.description}>{subject.description}</div>
              ) : (
                <div className="pl-rep">Reporte de notas del periodo</div>
              )}

              <Link href={`/teacher/planilla-asistida/${subject.id}`} className="pl-open-btn">
                <span className="pl-btn-txt">Abrir Planilla</span> <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="pl-pgrid">
          <div className="pl-none">
            <span className="pl-go"><FileSpreadsheet size={28} /></span>
            <div>No hay planillas que coincidan con los filtros.</div>
            <button onClick={() => setIsCreateModalOpen(true)} className="pl-btn pl-add" style={{ marginTop: '8px' }}>
              Crear planilla
            </button>
          </div>
        </div>
      )}

      <CreateSubjectModal 
        isOpen={isCreateModalOpen || editingSubject !== null}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
        }}
        initialData={editingSubject}
        existingSubjects={subjects}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          setEditingSubject(null)
          loadSubjects()
        }}
      />
    </div>
  )
}
