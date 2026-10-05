'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import {
  Search,
  Plus,
  Calendar,
  Filter,
  FileText,
  ChevronRight,
  ChevronDown,
  Clock,
  ShieldAlert,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import {
  DisciplinaryReport,
  ReportStatus,
  getTeacherReports,
  getTeacherAssignedGroups
} from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'

export function DisciplinaryReportsListScreen() {
  const shouldReduceMotion = useReducedMotion()

  const [reports, setReports] = useState<DisciplinaryReport[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')

  const [teacherGroups, setTeacherGroups] = useState<{ id: string; name: string; level: string }[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [data, groups] = await Promise.all([
          getTeacherReports(),
          getTeacherAssignedGroups()
        ])
        setReports(data)
        setTeacherGroups(groups)
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>()
    teacherGroups.forEach((g) => {
      const match = g.name.match(/\d+/)
      if (match) grades.add(match[0] + '°')
    })
    return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b))
  }, [teacherGroups])

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(teacherGroups.map((g) => g.name))).filter(Boolean).sort()
  }, [teacherGroups])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSearch =
        r.studentFullName.toLowerCase().includes(search.toLowerCase()) ||
        (r.studentDocument || '').includes(search) ||
        r.situationSnapshot.code.toLowerCase().includes(search.toLowerCase())

      const matchGrade =
        !gradeFilter ||
        r.studentGrade === gradeFilter ||
        r.studentGrade === gradeFilter.replace('°', '') ||
        r.studentGrade === `${gradeFilter.replace('°', '')}°`

      const cleanStr = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const matchGroup =
        !groupFilter ||
        cleanStr(r.studentGroup) === cleanStr(groupFilter) ||
        cleanStr(`${r.studentGrade}${r.studentGroup}`) === cleanStr(groupFilter) ||
        r.studentGroup === groupFilter

      return matchStatus && matchSearch && matchGrade && matchGroup
    })
  }, [reports, search, statusFilter, gradeFilter, groupFilter])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = filteredReports.length
    const thisMonth = filteredReports.filter((r) => {
      const [year, month] = r.reportDate.split('-').map(Number)
      const now = new Date()
      return month - 1 === now.getMonth() && year === now.getFullYear()
    }).length
    const active = filteredReports.filter((r) =>
      ['registered', 'reviewing', 'following'].includes(r.status)
    ).length

    return { total, thisMonth, active }
  }, [filteredReports])

  const isFiltered = Boolean(search || statusFilter !== 'all' || gradeFilter || groupFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setGradeFilter('')
    setGroupFilter('')
  }

  // Animaciones Apple Design con resortes de amortiguación crítica
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 260,
        mass: 0.8,
      },
    },
  }

  return (
    <div className="app">
      <style>{`
        .app {
          --bg:#e9f0ec;--tile:#fff;--tile-b:#d9e4de;--ink:#10231c;--mute:#5f776b;
          --hi:#0f3d2e;--hi-ink:#fff;--hi-mute:#9fd9bf;--acc:#12a374;--bad:#e5484d;
          --warn:#d9831a;--hero:#0f3d2e;--soft:#eef4f0;--accbg:rgba(18,163,116,.12);
          max-width: 1100px; margin: 0 auto; padding: 16px 16px 40px;
          color: var(--ink);
        }
        .dark .app {
          --bg:#0c1512;--tile:#15221d;--tile-b:#22352d;--ink:#eaf4ef;--mute:#8aa399;
          --hi:#f4f8f6;--hi-ink:#10231c;--hi-mute:#4d6b5d;--acc:#5ee0b0;--bad:#ff7a85;
          --warn:#f2b04b;--hero:#13392c;--soft:#1c2c26;--accbg:rgba(94,224,176,.12);
        }
        .app h1 { margin: 0; font-size: 34px; line-height: 1.05; font-weight: 600; letter-spacing: -1.2px; }
        .app .sub { margin: 8px 0 22px; color: var(--mute); font-size: 15px; max-width: 500px; line-height: 1.4; }
        .app .sub b { color: var(--ink); font-weight: 600; }
        
        .app .hero { position: relative; overflow: hidden; background: var(--hero); color: #fff; border-radius: 32px; padding: 22px 24px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .app .hero small { display: block; color: var(--hi-mute); font-size: 12px; font-weight: 600; letter-spacing: 1.4px; margin-bottom: 6px; }
        .app .hero strong { font-size: 26px; font-weight: 600; letter-spacing: -0.6px; }
        .app .hero .pill { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.14); border-radius: 99px; padding: 9px 16px; font-size: 14px; text-decoration: none; color: #fff; font-weight: 600; cursor: pointer; transition: transform 0.15s; }
        .app .hero .pill:active { transform: scale(0.96); }
        
        .app .stats { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .app .stats { grid-template-columns: 1fr 1fr; } }
        
        .app .tile { position: relative; background: var(--tile); border: 1px solid var(--tile-b); border-radius: 28px; color: inherit; text-decoration: none; }
        .app .stat { padding: 18px; min-height: 132px; display: flex; flex-direction: column; justify-content: space-between; }
        .app .stat .top { display: flex; justify-content: space-between; align-items: center; }
        .app .stat small { font-size: 12px; font-weight: 600; letter-spacing: 1.2px; color: var(--mute); }
        .app .stat .ic { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--soft); }
        .app .stat .ic svg { width: 18px; color: inherit; }
        .app .stat strong { font-size: 44px; line-height: 1; font-weight: 700; letter-spacing: -1.5px; }
        
        .app .stat.hi { background: var(--hi); border-color: transparent; color: var(--hi-ink); }
        .app .stat.hi small { color: var(--hi-mute); }
        .app .stat.hi .ic { background: rgba(128,128,128,.25); color: var(--hi-ink); }
        .app .ok strong { color: var(--acc); } .app .ok .ic { color: var(--acc); background: var(--accbg); }
        .app .bad strong { color: var(--bad); } .app .bad .ic { color: var(--bad); background: color-mix(in srgb, var(--bad) 14%, transparent); }
        .app .warn strong { color: var(--warn); } .app .warn .ic { color: var(--warn); background: color-mix(in srgb, var(--warn) 16%, transparent); }
        
        .app .tools { display: flex; flex-direction: column; gap: 12px; margin: 22px 0; }
        .app .search { display: flex; align-items: center; gap: 12px; padding: 0 20px; height: 56px; border-radius: 99px; }
        .app .search svg { width: 20px; color: var(--mute); flex: none; }
        .app .search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--ink); font: inherit; font-size: 15px; outline: none; }
        .app .search input::placeholder { color: var(--mute); }
        .app .search:focus-within { outline: 2px solid var(--acc); outline-offset: 2px; }
        
        .app .period { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; color: var(--mute); flex-wrap: wrap; }
        .app .sel { position: relative; }
        .app .sel select { appearance: none; -webkit-appearance: none; background: var(--tile); color: var(--ink); border: 1px solid var(--tile-b); border-radius: 99px; height: 44px; padding: 0 42px 0 18px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; outline: none; }
        .app .sel select:focus { outline: 2px solid var(--acc); outline-offset: 2px; }
        .app .sel svg { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); width: 16px; pointer-events: none; color: var(--mute); }
        
        .app .cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .app .cards { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); } }
        
        .app .card { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; cursor: pointer; }
        .app .card .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .app .tag { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--mute); flex-wrap: wrap; }
        .app .tag b { background: var(--accbg); color: var(--acc); border-radius: 99px; padding: 4px 10px; font-weight: 700; }
        .app .tag b.warn { background: color-mix(in srgb, var(--warn) 16%, transparent); color: var(--warn); }
        .app .tag b.bad { background: color-mix(in srgb, var(--bad) 14%, transparent); color: var(--bad); }
        .app .tag b.hi { background: var(--soft); color: var(--mute); }
        .app .tag b.ok { background: var(--accbg); color: var(--acc); }
        
        .app .go { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--soft); display: grid; place-items: center; color: var(--mute); transition: all 0.2s; }
        .app .go svg { width: 16px; }
        
        .app .card h3 { margin: 0; font-size: 17px; line-height: 1.2; font-weight: 600; letter-spacing: -0.4px; word-break: break-word; color: var(--ink); }
        .app .card .teacher { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--mute); margin-top: 6px; }
        .app .card .teacher svg { width: 15px; flex: none; }
        
        .app .card .meta { display: flex; justify-content: space-between; gap: 6px; font-size: 12px; color: var(--mute); border-top: 1px solid var(--tile-b); padding-top: 12px; }
        .app .card .meta span:first-child { color: var(--ink); font-weight: 600; }
        
        .app .empty { grid-column: 1 / -1; text-align: center; color: var(--mute); padding: 40px; font-size: 15px; border: 1px dashed var(--tile-b); border-radius: 28px; background: var(--tile); }
        
        @media (min-width: 760px) {
          .app { padding: 28px 32px 56px; }
          .app h1 { font-size: 44px; }
          .app .stats { grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .app .tools { flex-direction: row; align-items: center; }
          .app .search { flex: 1; }
          .app .cards { gap: 16px; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .app .card { transition: transform 0.15s; }
          .app .card:hover { transform: translateY(-3px); }
          .app .card:hover .go { background: var(--hero); color: #fff; transform: translateX(2px); }
          .app .card:active { transform: scale(0.98); }
        }
      `}</style>

      <h1>Convivencia</h1>
      <p className="sub">Gestiona los reportes de novedad disciplinaria de tus estudiantes con rigor y debido proceso.</p>

      <section className="hero">
        <div>
          <small>NOVEDADES</small>
          <strong>Reportes disciplinarios</strong>
        </div>
        <Link href="/teacher/disciplinary/new" className="pill">
          <Plus size={18} strokeWidth={2.5} /> Nuevo
        </Link>
      </section>

      <section className="stats">
        <div className="tile stat hi">
          <div className="top">
            <small>TOTAL REPORTES</small>
            <span className="ic"><FileText /></span>
          </div>
          <strong>{stats.total}</strong>
        </div>
        
        <div className="tile stat warn">
          <div className="top">
            <small>EN PROCESO</small>
            <span className="ic"><Clock /></span>
          </div>
          <strong>{stats.active}</strong>
        </div>
        
        <div className="tile stat ok">
          <div className="top">
            <small>ESTE MES</small>
            <span className="ic"><Calendar /></span>
          </div>
          <strong>{stats.thisMonth}</strong>
        </div>
      </section>

      <section className="tools">
        <label className="tile search">
          <Search />
          <input 
            type="search" 
            placeholder="Buscar por estudiante, documento o falta..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        
        <div className="period">
          <div className="sel">
            <select aria-label="Estado" value={statusFilter} onChange={e => setStatusFilter(e.target.value as ReportStatus | 'all')}>
              <option value="all">Todos los estados</option>
              <option value="registered">Registrado</option>
              <option value="reviewing">En revisión</option>
              <option value="following">En seguimiento</option>
              <option value="closed">Cerrado</option>
            </select>
            <ChevronDown />
          </div>
          
          <div className="sel">
            <select aria-label="Grado" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="">Todos los grados</option>
              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown />
          </div>
          
          {isFiltered && (
            <button onClick={clearFilters} style={{ background: 'var(--soft)', color: 'var(--mute)', border: 'none', borderRadius: '99px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={16} /> Limpiar
            </button>
          )}
        </div>
      </section>

      <section className="cards">
        {loading ? (
          <div className="empty">Cargando reportes...</div>
        ) : filteredReports.length === 0 ? (
          <div className="empty">No hay reportes que coincidan con tu búsqueda.</div>
        ) : (
          filteredReports.map(report => (
            <Link key={report.id} href={`/teacher/disciplinary/${report.id}`} className="tile card">
              <div className="head">
                <div className="tag">
                  <b className={
                    report.status === 'registered' ? 'warn' : 
                    report.status === 'reviewing' ? 'warn' : 
                    report.status === 'following' ? 'ok' : 'hi'
                  }>
                    {report.status === 'registered' ? 'Registrado' : 
                     report.status === 'reviewing' ? 'Revisión' : 
                     report.status === 'following' ? 'Seguimiento' : 'Cerrado'}
                  </b>
                  {report.studentGrade} - {report.studentGroup}
                </div>
                <span className="go"><ChevronRight /></span>
              </div>
              
              <div>
                <h3>{report.studentFullName}</h3>
                <div className="teacher">
                  <AlertCircle />
                  {report.situationSnapshot.title}
                </div>
              </div>
              
              <div className="meta">
                <span>
                  {new Date(`${report.reportDate}T${report.reportTime || '00:00:00'}`).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <span>
                  {new Date(`${report.reportDate}T${report.reportTime || '00:00:00'}`).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
