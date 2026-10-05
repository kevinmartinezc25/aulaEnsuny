'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import { 
  BookOpen, TrendingUp, Star, Wrench, ArrowLeft, 
  Target, Award, ChevronRight, ChevronDown, 
  User, FileText, Search, RotateCcw, AlertTriangle, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { getStudentAssistedReport, PlanillaSubjectReport, PlanillaAchievement } from '@/modules/planilla-asistida/application/studentGradesActions'

const COMPONENT_CONFIG: Record<'hacer' | 'saber' | 'ser', { label: string; icon: React.ReactNode }> = {
  hacer: { label: 'Hacer', icon: <Wrench size={14} /> },
  saber: { label: 'Saber', icon: <BookOpen size={14} /> },
  ser: { label: 'Ser', icon: <Star size={14} /> },
}

export function GradesScreen() {
  const shouldReduceMotion = useReducedMotion()
  const [report, setReport] = useState<{
    subjects: PlanillaSubjectReport[]
    generalAverage: number
    generalPerformanceLevel: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedAchievementIndex, setSelectedAchievementIndex] = useState<number>(0)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getStudentAssistedReport()
        setReport(data)
      } catch (err: any) {
        console.error('Error cargando boletín asistido:', err)
        setError('No se pudo cargar el boletín. Intenta de nuevo más tarde.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const availablePeriods = useMemo(() => {
    if (!report?.subjects) return []
    const set = new Set<string>()
    report.subjects.forEach(s => {
      if (s.period) set.add(s.period.trim())
    })
    return Array.from(set).sort()
  }, [report?.subjects])

  const filteredSubjects = useMemo(() => {
    if (!report?.subjects) return []
    return report.subjects.filter(sub => {
      const matchesSearch = sub.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.teacherName && sub.teacherName.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesPeriod = selectedPeriod === 'all' || sub.period === selectedPeriod
      return matchesSearch && matchesPeriod
    })
  }, [report?.subjects, searchQuery, selectedPeriod])

  const summaryStats = useMemo(() => {
    if (!report?.subjects) return { total: 0, approved: 0, failed: 0 }
    const total = report.subjects.length
    const approved = report.subjects.filter(s => (s.finalAverage || 0) >= 3.0).length
    const failed = report.subjects.filter(s => s.finalAverage !== null && s.finalAverage < 3.0).length
    return { total, approved, failed }
  }, [report?.subjects])

  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.05 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  const cssStyles = `
    .sg-page {
      --sg-bg: #e9f0ec;
      --sg-tile: #fff;
      --sg-tile-b: #d9e4de;
      --sg-ink: #10231c;
      --sg-mute: #5f776b;
      --sg-hi: #0f3d2e;
      --sg-hi-ink: #fff;
      --sg-hi-mute: #9fd9bf;
      --sg-acc: #12a374;
      --sg-bad: #e5484d;
      --sg-warn: #d9831a;
      --sg-hero: #0f3d2e;
      --sg-soft: #eef4f0;
      --sg-accbg: rgba(18,163,116,.12);
      
      padding: 20px 16px 40px;
      margin: 0 auto;
      max-width: 1100px;
      box-sizing: border-box;
      color: var(--sg-ink);
    }

    .dark .sg-page {
      --sg-bg: #0c1512;
      --sg-tile: #15221d;
      --sg-tile-b: #22352d;
      --sg-ink: #eaf4ef;
      --sg-mute: #8aa399;
      --sg-hi: #123325;
      --sg-hi-ink: #fff;
      --sg-hi-mute: #6f9e8a;
      --sg-acc: #5ee0b0;
      --sg-bad: #ff7a85;
      --sg-warn: #f2b04b;
      --sg-hero: #123325;
      --sg-soft: #1c2c26;
      --sg-accbg: rgba(94,224,176,.12);
    }

    @media (min-width: 760px) {
      .sg-page { padding: 28px 32px 56px; }
    }

    .sg-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 22px;
    }
    .sg-back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--sg-tile);
      border: 1px solid var(--sg-tile-b);
      color: var(--sg-ink);
      text-decoration: none;
      transition: transform 0.15s;
      flex-shrink: 0;
    }
    .sg-back-btn:active { transform: scale(0.95); }
    .sg-back-btn:focus-visible { outline: 2px solid var(--sg-acc); outline-offset: 3px; }
    
    .sg-title-area { flex: 1; min-width: 0; }
    .sg-title {
      margin: 0;
      font-size: clamp(24px, 5vw, 34px);
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -1px;
    }
    .sg-subtitle {
      margin: 4px 0 0;
      color: var(--sg-mute);
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Stats Grid */
    .sg-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 760px) {
      .sg-stats { grid-template-columns: repeat(5, 1fr); gap: 16px; }
    }
    .sg-stat-tile {
      background: var(--sg-tile);
      border: 1px solid var(--sg-tile-b);
      border-radius: 24px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 110px;
    }
    .sg-stat-tile small { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--sg-mute); text-transform: uppercase; margin-bottom: 8px; display: block; }
    .sg-stat-tile strong { font-size: 32px; font-weight: 700; line-height: 1; color: var(--sg-ink); }

    .sg-stat-hi { background: var(--sg-hi); border-color: transparent; color: var(--sg-hi-ink); grid-column: 1 / -1; min-height: 120px; }
    @media (min-width: 760px) {
      .sg-stat-hi { grid-column: span 1; min-height: 110px; }
    }
    .sg-stat-hi small { color: var(--sg-hi-mute); }
    .sg-stat-hi strong { color: var(--sg-hi-ink); }

    /* Tools */
    .sg-tools {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 760px) { .sg-tools { flex-direction: row; align-items: center; } }
    
    .sg-search {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 20px;
      height: 52px;
      border-radius: 20px;
      background: var(--sg-tile);
      border: 1px solid var(--sg-tile-b);
      width: 100%;
      transition: border-color 0.15s;
    }
    .sg-search:focus-within { border-color: var(--sg-acc); }
    @media (min-width: 760px) { .sg-search { flex: 1; height: 56px; width: auto; } }
    .sg-search svg { color: var(--sg-mute); flex: none; }
    .sg-search input { flex: 1; min-width: 0; background: transparent; border: 0; color: var(--sg-ink); font: inherit; font-size: 15px; outline: none; }
    .sg-search input::placeholder { color: var(--sg-mute); }
    
    .sg-period {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--sg-mute);
    }
    .sg-sel { position: relative; }
    .sg-sel select {
      appearance: none; background: var(--sg-tile); color: var(--sg-ink);
      border: 1px solid var(--sg-tile-b); border-radius: 20px;
      height: 44px; padding: 0 42px 0 18px; font: inherit; font-size: 14px; font-weight: 600;
      cursor: pointer; outline: none; transition: border-color 0.15s;
    }
    .sg-sel select:focus { outline: 2px solid var(--sg-acc); border-color: transparent; }
    .sg-sel svg { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--sg-mute); }

    /* Cards */
    .sg-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (min-width: 600px) { .sg-cards { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; } }
    @media (min-width: 760px) { .sg-cards { gap: 16px; } }

    .sg-card {
      background: var(--sg-tile); border: 1px solid var(--sg-tile-b);
      border-radius: 20px; padding: 14px; display: flex; flex-direction: column; gap: 12px;
      cursor: pointer; text-decoration: none; color: inherit; height: 100%;
    }
    @media (min-width: 480px) {
      .sg-card { padding: 18px; border-radius: 24px; gap: 14px; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .sg-card { transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1); }
      .sg-card:active { transform: scale(0.97); }
    }
    .sg-card:focus-visible { outline: 2px solid var(--sg-acc); outline-offset: 2px; }
    
    .sg-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .sg-tag { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--sg-mute); font-weight: 600; flex-wrap: wrap; }
    @media (min-width: 480px) { .sg-tag { font-size: 11px; gap: 6px; } }
    .sg-tag b { background: var(--sg-soft); color: var(--sg-ink); border-radius: 99px; padding: 3px 6px; font-weight: 700; }
    .sg-go { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--sg-soft); display: grid; place-items: center; color: var(--sg-mute); }
    @media (min-width: 480px) { .sg-go { width: 32px; height: 32px; } }
    .sg-card h3 { margin: 0; font-size: 14px; font-weight: 700; line-height: 1.25; color: var(--sg-ink); word-break: break-word; }
    @media (min-width: 480px) { .sg-card h3 { font-size: 17px; } }
    .sg-teacher { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--sg-mute); margin-top: 4px; }
    @media (min-width: 480px) { .sg-teacher { gap: 6px; font-size: 13px; margin-top: 6px; } }
    
    .sg-bar-container { margin-top: auto; border-top: 1px solid var(--sg-tile-b); padding-top: 14px; }
    .sg-meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; font-weight: 600; }
    .sg-meta span:last-child { color: var(--sg-mute); }
    .sg-bar { height: 6px; border-radius: 3px; background: var(--sg-soft); overflow: hidden; margin-top: 4px; }
    .sg-bar b { display: block; height: 100%; border-radius: 3px; background: var(--sg-acc); transition: width 0.5s ease; }
    
    .sg-badges { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .sg-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 99px; background: var(--sg-soft); color: var(--sg-mute); display: flex; align-items: center; gap: 4px; }
    .sg-badge.ok { background: var(--sg-accbg); color: var(--sg-acc); }

    /* Detail View */
    .sg-detail-content { max-width: 800px; margin: 0 auto; }
    .sg-select-large {
      width: 100%; appearance: none; background: var(--sg-tile); color: var(--sg-ink);
      border: 1px solid var(--sg-tile-b); border-radius: 20px; padding: 16px 40px 16px 20px;
      font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 24px; outline: none;
      transition: border-color 0.15s;
    }
    .sg-select-large:focus { outline: 2px solid var(--sg-acc); border-color: transparent; }
    .sg-select-large-wrapper { position: relative; }
    .sg-select-large-wrapper svg { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--sg-mute); }

    .sg-ach-title { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: var(--sg-ink); line-height: 1.2; }
    .sg-ach-desc { font-size: 14px; color: var(--sg-mute); margin: 0 0 24px; line-height: 1.5; }

    .sg-comp-card {
      background: var(--sg-tile); border: 1px solid var(--sg-tile-b); border-radius: 20px;
      padding: 16px 20px; margin-bottom: 16px;
    }
    .sg-comp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--sg-tile-b); padding-bottom: 12px; }
    .sg-comp-label { font-size: 13px; font-weight: 700; color: var(--sg-ink); text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
    .sg-comp-avg { font-size: 14px; font-weight: 700; color: var(--sg-acc); }
    .sg-comp-avg.bad { color: var(--sg-bad); }

    .sg-act-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; gap: 16px; border-bottom: 1px solid var(--sg-soft); }
    .sg-act-row:last-child { border-bottom: none; }
    .sg-act-name { font-size: 14px; font-weight: 600; color: var(--sg-mute); flex: 1; line-height: 1.4; }
    .sg-act-grade { 
      font-size: 14px; font-weight: 700; background: var(--sg-soft); color: var(--sg-ink);
      padding: 6px 14px; border-radius: 12px; min-width: 54px; text-align: center;
    }
    .sg-act-grade.bad { background: color-mix(in srgb, var(--sg-bad) 14%, transparent); color: var(--sg-bad); }

    .sg-final-card {
      background: var(--sg-hero); color: var(--sg-hi-ink);
      border-radius: 24px; padding: 32px 24px; text-align: center; margin-top: 24px;
    }
    .sg-final-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--sg-hi-ink); }
    .sg-final-grade { font-size: 48px; font-weight: 700; line-height: 1; margin-bottom: 8px; color: var(--sg-hi-mute); }
    .sg-final-grade.bad { color: var(--sg-bad); }
    .sg-final-level { font-size: 14px; font-weight: 600; color: var(--sg-hi-mute); text-transform: uppercase; letter-spacing: 1px; }

    /* Skeletons */
    .sg-skel-header { height: 60px; background: var(--sg-tile); border-radius: 12px; opacity: 0.5; margin-bottom: 22px; }
    .sg-skel-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .sg-skel-stat { height: 110px; background: var(--sg-tile); border-radius: 24px; opacity: 0.5; }
    @media (min-width: 760px) {
      .sg-skel-stats { grid-template-columns: repeat(5, 1fr); gap: 16px; }
    }
  `

  if (loading) {
    return (
      <div className="sg-page">
        <style>{cssStyles}</style>
        <div className="sg-skel-header animate-pulse" />
        <div className="sg-skel-stats">
          {[1,2,3,4,5].map(i => <div key={i} className="sg-skel-stat animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sg-page">
        <style>{cssStyles}</style>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--sg-tile)', borderRadius: '24px', color: 'var(--sg-bad)' }}>
          {error}
        </div>
      </div>
    )
  }

  const selectedSubject = report?.subjects.find(s => s.subjectId === selectedSubjectId)

  if (selectedSubject) {
    const achievements = selectedSubject.achievements || []
    const activeAchievement = achievements[selectedAchievementIndex] || achievements[0]
    
    const COMPONENTS_ORDER = [
      { key: 'hacer' as const, label: 'HACER', percentage: 35 },
      { key: 'saber' as const, label: 'SABER', percentage: 35 },
      { key: 'ser' as const, label: 'SER', percentage: 30 },
    ]
    
    const compStats = COMPONENTS_ORDER.map(comp => {
      const compActivities = activeAchievement?.activities.filter(a => a.componentType === comp.key) || []
      const gradedActivities = compActivities.filter(a => a.grade !== null)
      const average = gradedActivities.length > 0 
        ? gradedActivities.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedActivities.length 
        : null
      return { ...comp, activities: compActivities, average }
    })

    const activeComps = compStats.filter(c => c.average !== null)
    let achievementAvg: number | null = null
    if (activeComps.length > 0) {
      const totalWeight = activeComps.reduce((acc, curr) => acc + curr.percentage, 0)
      const weightedSum = activeComps.reduce((acc, curr) => acc + (curr.average! * curr.percentage), 0)
      achievementAvg = totalWeight > 0 ? (weightedSum / totalWeight) : null
    } else if (activeAchievement?.achievementAverage !== null && activeAchievement?.achievementAverage !== undefined) {
      achievementAvg = activeAchievement.achievementAverage
    }

    const isFailing = achievementAvg !== null && achievementAvg < 3.0
    const perfLevel = achievementAvg === null ? 'Pendiente' : achievementAvg >= 4.6 ? 'Superior' : achievementAvg >= 4.0 ? 'Alto' : achievementAvg >= 3.0 ? 'Básico' : 'Bajo'

    return (
      <div className="sg-page">
        <style>{cssStyles}</style>
        <div className="sg-detail-content">
          <motion.header variants={iv} initial="hidden" animate="show" className="sg-header">
            <button onClick={() => setSelectedSubjectId(null)} className="sg-back-btn" aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <div className="sg-title-area">
              <h1 className="sg-title" style={{ fontSize: '24px' }}>{selectedSubject.subjectName}</h1>
              <p className="sg-subtitle">Detalle de Calificaciones</p>
            </div>
          </motion.header>

          <motion.div variants={cv} initial="hidden" animate="show">
            {achievements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--sg-tile)', borderRadius: '24px', border: '1px dashed var(--sg-tile-b)', color: 'var(--sg-mute)' }}>
                El docente aún no ha publicado logros evaluativos.
              </div>
            ) : (
              <>
                <motion.div variants={iv} className="sg-select-large-wrapper">
                  <select 
                    value={selectedAchievementIndex} 
                    onChange={e => setSelectedAchievementIndex(Number(e.target.value))}
                    className="sg-select-large"
                  >
                    {achievements.map((ach, idx) => (
                      <option key={ach.achievementId} value={idx}>
                        Logro {idx + 1}: {ach.name || `Logro ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={20} />
                </motion.div>

                <motion.div variants={iv}>
                  <h2 className="sg-ach-title">{activeAchievement?.name || `Logro ${selectedAchievementIndex + 1}`}</h2>
                  {activeAchievement?.description && <p className="sg-ach-desc">{activeAchievement.description}</p>}
                </motion.div>

                {compStats.map((comp) => (
                  <motion.div variants={iv} key={comp.key} className="sg-comp-card">
                    <div className="sg-comp-head">
                      <div className="sg-comp-label">
                        {COMPONENT_CONFIG[comp.key].icon} {comp.label} <span style={{fontWeight:'normal', color:'var(--sg-mute)'}}>{comp.percentage}%</span>
                      </div>
                      <div className={`sg-comp-avg ${comp.average !== null && comp.average < 3.0 ? 'bad' : ''}`}>
                        {comp.average !== null ? comp.average.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div>
                      {comp.activities.length === 0 ? (
                        <div style={{fontSize:'13px', color:'var(--sg-mute)', fontStyle:'italic', padding: '8px 0'}}>Sin actividades registradas</div>
                      ) : (
                        comp.activities.map(act => (
                          <div key={act.activityId} className="sg-act-row">
                            <div className="sg-act-name">{act.name}</div>
                            <div className={`sg-act-grade ${act.grade !== null && act.grade < 3.0 ? 'bad' : ''}`}>
                              {act.grade !== null ? act.grade.toFixed(1) : '—'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                ))}

                <motion.div variants={iv} className="sg-final-card">
                  <div className="sg-final-title">Promedio del Logro</div>
                  <div className={`sg-final-grade ${isFailing ? 'bad' : ''}`}>
                    {achievementAvg !== null ? achievementAvg.toFixed(1) : '—'}
                  </div>
                  <div className="sg-final-level">Desempeño {perfLevel}</div>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <div className="sg-page">
      <style>{cssStyles}</style>
      <motion.div variants={cv} initial="hidden" animate="show">
        <motion.header variants={iv} className="sg-header">
          <Link href="/student/dashboard" className="sg-back-btn" aria-label="Volver">
            <ArrowLeft size={22} />
          </Link>
          <div className="sg-title-area">
            <h1 className="sg-title">Reporte de Calificaciones</h1>
            <p className="sg-subtitle">Registro de notas y desempeño académico</p>
          </div>
        </motion.header>

        <motion.section variants={iv} className="sg-stats">
          <div className="sg-stat-tile sg-stat-hi">
            <small>PROMEDIO GENERAL</small>
            <strong>{report?.generalAverage && report.generalAverage > 0 ? report.generalAverage.toFixed(1) : '—'}</strong>
          </div>
          <div className="sg-stat-tile">
            <small>MATERIAS</small>
            <strong>{summaryStats.total}</strong>
          </div>
          <div className="sg-stat-tile">
            <small>DESEMPEÑO</small>
            <strong style={{fontSize: '20px', lineHeight: '32px'}}>{report?.generalPerformanceLevel || '—'}</strong>
          </div>
          <div className="sg-stat-tile">
            <small>APROBADAS</small>
            <strong style={{color: 'var(--sg-acc)'}}>{summaryStats.approved}</strong>
          </div>
          <div className="sg-stat-tile">
            <small>POR MEJORAR</small>
            <strong style={{color: 'var(--sg-bad)'}}>{summaryStats.failed}</strong>
          </div>
        </motion.section>

        <motion.section variants={iv} className="sg-tools">
          <div className="sg-search">
            <Search size={20} />
            <input 
              type="search" 
              placeholder="Buscar materia o docente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {availablePeriods.length > 1 && (
            <div className="sg-period">
              Período:
              <div className="sg-sel">
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                  <option value="all">Todos los períodos</option>
                  {availablePeriods.map(p => <option key={p} value={p}>P.{p}</option>)}
                </select>
                <ChevronDown size={16} />
              </div>
            </div>
          )}
        </motion.section>

        <motion.section variants={iv} className="sg-cards">
          {filteredSubjects.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'var(--sg-tile)', borderRadius: '24px', border: '1px dashed var(--sg-tile-b)', color: 'var(--sg-mute)' }}>
              No hay materias que coincidan con la búsqueda.
            </div>
          ) : (
            filteredSubjects.map((sub) => {
              const hasGrade = sub.finalAverage !== null && sub.finalAverage !== undefined
              const avg = sub.finalAverage || 0
              const progressPct = hasGrade ? Math.min(100, Math.max(0, (avg / 5) * 100)) : 0
              const isFailing = hasGrade && avg < 3.0

              return (
                <div 
                  key={sub.subjectId} 
                  className="sg-card"
                  onClick={() => {
                    setSelectedSubjectId(sub.subjectId)
                    setSelectedAchievementIndex(0)
                  }}
                >
                  <div className="sg-card-head">
                    <div className="sg-tag">
                      {sub.period && <b>P.{sub.period}</b>}
                      {sub.grade && <span>G{sub.grade}-{sub.groupNumber || 1}</span>}
                    </div>
                    <span className="sg-go"><ChevronRight size={16} /></span>
                  </div>
                  
                  <div>
                    <h3>{sub.subjectName}</h3>
                    {sub.teacherName && (
                      <div className="sg-teacher"><User size={14} /> {sub.teacherName}</div>
                    )}
                  </div>

                  <div className="sg-bar-container">
                    <div className="sg-meta">
                      <span style={{ color: hasGrade ? (isFailing ? 'var(--sg-bad)' : 'var(--sg-ink)') : 'var(--sg-mute)' }}>
                        {hasGrade ? avg.toFixed(1) : 'Sin notas'}
                      </span>
                      <span>Promedio</span>
                    </div>
                    <div className="sg-bar">
                      <b style={{ width: `${progressPct}%`, background: hasGrade ? (isFailing ? 'var(--sg-bad)' : 'var(--sg-acc)') : 'transparent' }}></b>
                    </div>
                    <div className="sg-badges">
                      {hasGrade && sub.performanceLevel && sub.performanceLevel !== '-' && (
                        <div className={`sg-badge ${!isFailing ? 'ok' : ''}`}>
                          <Award size={12} /> {sub.performanceLevel}
                        </div>
                      )}
                      <div className="sg-badge"><Target size={12} /> {sub.achievements?.length || 0} logros</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </motion.section>
      </motion.div>
    </div>
  )
}
