'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import {
  Search, ChevronDown, ChevronRight, User,
  CheckCircle2, XCircle, BookOpen, AlertTriangle, ArrowLeft, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useUserSessionStore } from '@/store/useUserSessionStore'
import { getStudentAttendanceOverview, type StudentAttendanceOverview } from '@/modules/planilla-asistida/application/studentAttendanceQueries'

export function StudentAttendanceScreen() {
  const shouldReduceMotion = useReducedMotion()
  const sessionUser = useUserSessionStore(s => s.user)
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [data, setData] = useState<StudentAttendanceOverview | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const result = await getStudentAttendanceOverview()
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        console.error('Error fetching attendance overview:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [])

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.subjects.filter(item => {
      const matchPeriod = selectedPeriod === '' || item.period === selectedPeriod
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchPeriod && matchSearch
    })
  }, [data, searchQuery, selectedPeriod])

  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.05 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  if (loading) {
    return (
      <div className="sa-page">
        <style>{`.sa-page { padding: 20px 16px 40px; max-width: 1100px; margin: 0 auto; } .sa-header-sk { height: 60px; background: var(--sa-tile, #fff); border-radius: 12px; opacity: 0.5; margin-bottom: 22px; } .sa-hero-sk { height: 86px; background: var(--sa-hero, #0f3d2e); border-radius: 24px; opacity: 0.5; margin-bottom: 16px; } .sa-stats-sk { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; } .sa-stat-sk { height: 132px; background: var(--sa-tile, #fff); border-radius: 24px; opacity: 0.5; } .dark .sa-page { --sa-tile: #15221d; --sa-hero: #13392c; } @media (min-width: 760px) { .sa-page { padding: 28px 32px 56px; } .sa-hero-sk { height: 104px; border-radius: 32px; } .sa-stats-sk { grid-template-columns: repeat(4, 1fr); gap: 16px; } .sa-stat-sk { border-radius: 28px; } }`}</style>
        <div className="sa-header-sk animate-pulse" />
        <div className="sa-hero-sk animate-pulse" />
        <div className="sa-stats-sk">
          {[1,2,3,4].map(i => <div key={i} className="sa-stat-sk animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="sa-page">
      <style>{`
        .sa-page {
          --sa-bg: #e9f0ec;
          --sa-tile: #fff;
          --sa-tile-b: #d9e4de;
          --sa-ink: #10231c;
          --sa-mute: #5f776b;
          --sa-hi: #0f3d2e;
          --sa-hi-ink: #fff;
          --sa-hi-mute: #9fd9bf;
          --sa-acc: #12a374;
          --sa-bad: #e5484d;
          --sa-warn: #d9831a;
          --sa-hero: #0f3d2e;
          --sa-soft: #eef4f0;
          --sa-accbg: rgba(18,163,116,.12);
          
          padding: 20px 16px 40px;
          margin: 0 auto;
          max-width: 1100px;
          box-sizing: border-box;
          color: var(--sa-ink);
        }

        .dark .sa-page {
          --sa-bg: #0c1512;
          --sa-tile: #15221d;
          --sa-tile-b: #22352d;
          --sa-ink: #eaf4ef;
          --sa-mute: #8aa399;
          --sa-hi: #123325;
          --sa-hi-ink: #fff;
          --sa-hi-mute: #6f9e8a;
          --sa-acc: #5ee0b0;
          --sa-bad: #ff7a85;
          --sa-warn: #f2b04b;
          --sa-hero: #123325;
          --sa-soft: #1c2c26;
          --sa-accbg: rgba(94,224,176,.12);
        }

        @media (min-width: 760px) {
          .sa-page { padding: 28px 32px 56px; }
        }

        .sa-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 22px;
        }
        .sa-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--sa-tile);
          border: 1px solid var(--sa-tile-b);
          color: var(--sa-ink);
          text-decoration: none;
          transition: transform 0.15s;
          flex-shrink: 0;
        }
        .sa-back-btn:active { transform: scale(0.95); }
        .sa-back-btn:focus-visible { outline: 2px solid var(--sa-acc); outline-offset: 3px; }
        
        .sa-title-area {
          flex: 1;
          min-width: 0;
        }
        .sa-title {
          margin: 0;
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.05;
          font-weight: 700;
          letter-spacing: -1.2px;
        }
        .sa-subtitle {
          margin: 6px 0 0;
          color: var(--sa-mute);
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sa-subtitle b {
          color: var(--sa-ink);
          font-weight: 600;
        }
        @media (min-width: 760px) {
          .sa-title { font-size: 44px; }
        }

        .sa-hero {
          position: relative;
          overflow: hidden;
          background: var(--sa-hero);
          color: #fff;
          border-radius: 24px;
          padding: 22px 24px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        @media (min-width: 760px) {
          .sa-hero { padding: 28px 32px; border-radius: 32px; margin-bottom: 20px; }
        }
        .sa-hero small {
          display: block;
          color: var(--sa-hi-mute);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.4px;
          margin-bottom: 6px;
        }
        .sa-hero strong {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.6px;
        }
        .sa-hero-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,.14);
          border-radius: 99px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 500;
        }
        .sa-hero-pill i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e9b56a;
        }

        .sa-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 760px) {
          .sa-stats { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        .sa-stat-tile {
          position: relative;
          background: var(--sa-tile);
          border: 1px solid var(--sa-tile-b);
          border-radius: 24px;
          padding: 18px;
          min-height: 132px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sa-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sa-stat-tile small {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: var(--sa-mute);
        }
        .sa-stat-ic {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--sa-soft);
        }
        .sa-stat-tile strong {
          font-size: 40px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -1.5px;
          color: var(--sa-ink);
        }
        @media (min-width: 760px) {
          .sa-stat-tile { border-radius: 28px; }
          .sa-stat-tile strong { font-size: 44px; }
        }

        .sa-stat-hi { background: var(--sa-hi); border-color: transparent; color: var(--sa-hi-ink); }
        .sa-stat-hi small { color: var(--sa-hi-mute); }
        .sa-stat-hi strong { color: var(--sa-hi-ink); }
        .sa-stat-hi .sa-stat-ic { background: rgba(128,128,128,.25); color: var(--sa-hi-ink); }

        .sa-stat-ok strong { color: var(--sa-acc); }
        .sa-stat-ok .sa-stat-ic { color: var(--sa-acc); background: var(--sa-accbg); }

        .sa-stat-bad strong { color: var(--sa-bad); }
        .sa-stat-bad .sa-stat-ic { color: var(--sa-bad); background: color-mix(in srgb, var(--sa-bad) 14%, transparent); }

        .sa-stat-warn strong { color: var(--sa-warn); }
        .sa-stat-warn .sa-stat-ic { color: var(--sa-warn); background: color-mix(in srgb, var(--sa-warn) 16%, transparent); }

        .sa-tools {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0;
        }
        @media (min-width: 760px) {
          .sa-tools { flex-direction: row; align-items: center; }
        }
        
        .sa-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          height: 52px;
          border-radius: 20px;
          background: var(--sa-tile);
          border: 1px solid var(--sa-tile-b);
          width: 100%;
          transition: border-color 0.15s;
        }
        .sa-search:focus-within { border-color: var(--sa-acc); }
        @media (min-width: 760px) { .sa-search { flex: 1; height: 56px; width: auto; } }
        .sa-search svg { color: var(--sa-mute); flex: none; }
        .sa-search input {
          flex: 1; min-width: 0; border: 0; background: transparent; 
          color: var(--sa-ink); font: inherit; font-size: 15px; outline: none;
        }
        .sa-search input::placeholder { color: var(--sa-mute); }

        .sa-period {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--sa-mute);
        }
        .sa-sel { position: relative; }
        .sa-sel select {
          appearance: none;
          background: var(--sa-tile);
          color: var(--sa-ink);
          border: 1px solid var(--sa-tile-b);
          border-radius: 20px;
          height: 44px;
          padding: 0 42px 0 18px;
          font: inherit; font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s;
          outline: none;
        }
        .sa-sel select:focus { outline: 2px solid var(--sa-acc); border-color: transparent; }
        .sa-sel svg {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--sa-mute);
        }

        .sa-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (min-width: 600px) {
          .sa-cards { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        }
        @media (min-width: 760px) {
          .sa-cards { gap: 16px; }
        }

        .sa-card {
          background: var(--sa-tile);
          border: 1px solid var(--sa-tile-b);
          border-radius: 28px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-decoration: none;
          color: inherit;
          height: 100%;
        }
        @media (prefers-reduced-motion: no-preference) {
          .sa-card { transition: transform 0.15s, box-shadow 0.15s; }
          .sa-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
          .sa-card:active { transform: scale(0.97); }
        }
        .sa-card:focus-visible { outline: 2px solid var(--sa-acc); outline-offset: 2px; }

        .sa-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        
        .sa-card .h { display: flex; align-items: flex-start; gap: 12px; }
        .sa-card .h .sa-go { background: var(--sa-accbg); width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--sa-acc); flex: none; }
        .sa-card h3 { flex: 1; margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.2; color: var(--sa-ink); padding-top: 4px; word-break: break-word; }
        
        .sa-gg { display: grid; grid-template-columns: 1fr 1fr; background: var(--sa-soft); border-radius: 22px; padding: 14px 0; text-align: center; }
        .sa-gg div+div { border-left: 1px solid var(--sa-tile-b); }
        .sa-gg small { display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.3px; color: var(--sa-mute); }
        .sa-gg b { font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -1px; color: var(--sa-acc); display: block; margin-top: 2px; }
        
        .sa-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .sa-chips span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; border-radius: 99px; padding: 5px 12px; }
        .sa-chips .p { background: var(--sa-accbg); color: var(--sa-acc); }
        .sa-chips .e { background: color-mix(in srgb, #c97a0e 16%, transparent); color: #c97a0e; }
        .dark .sa-chips .e { background: color-mix(in srgb, #f2b04b 16%, transparent); color: #f2b04b; }

        .sa-meta-cnt {
          border-top: 1px solid var(--sa-tile-b);
          padding-top: 12px;
          margin-top: 4px;
        }

        .sa-bar { height: 6px; border-radius: 3px; background: var(--sa-soft); overflow: hidden; }
        .sa-bar b { display: block; height: 100%; border-radius: 3px; background: var(--sa-acc); transition: width 0.4s ease; }
        
        .sa-cnt { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
        .sa-cnt span { display: flex; align-items: center; gap: 4px; border-radius: 99px; padding: 4px 8px; font-size: 11px; font-weight: 700; background: var(--sa-soft); color: var(--sa-mute); }
        .sa-cnt span.sa-cnt-ok { background: var(--sa-accbg); color: var(--sa-acc); }
        .sa-cnt span.sa-cnt-bad { background: color-mix(in srgb, var(--sa-bad) 14%, transparent); color: var(--sa-bad); }
        .sa-cnt span.sa-cnt-warn { background: color-mix(in srgb, var(--sa-warn) 16%, transparent); color: var(--sa-warn); }

        .sa-open-btn { margin-top: auto; display: flex; justify-content: center; align-items: center; gap: 8px; height: 48px; border: 0; border-radius: 99px; background: var(--sa-hero); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; transition: transform 0.15s; outline: none; }
        .sa-open-btn:active { transform: scale(0.97); }
        .sa-open-btn:focus-visible { outline: 2px solid var(--sa-acc); outline-offset: 2px; }

        .sa-empty {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--sa-mute);
          padding: 40px 20px;
          font-size: 15px;
          background: var(--sa-tile);
          border-radius: 28px;
          border: 1px dashed var(--sa-tile-b);
        }
      `}</style>

      <motion.div variants={cv} initial="hidden" animate="show">
        <motion.header variants={iv} className="sa-header">
          <Link href="/student/dashboard" className="sa-back-btn" aria-label="Volver al inicio">
            <ArrowLeft size={22} />
          </Link>
          <div className="sa-title-area">
            <h1 className="sa-title">Asistencia Escolar</h1>
            <p className="sa-subtitle">Registro general de asistencia para <b>{sessionUser?.name || 'Estudiante'}</b></p>
          </div>
        </motion.header>

        <motion.section variants={iv} className="sa-hero">
          <div>
            <small>GENERAL</small>
            <strong>{data?.summary.overallPercentage ?? 0}% Asistencia</strong>
          </div>
          <span className="sa-hero-pill">
            <i style={{ background: (data?.summary.overallPercentage ?? 0) >= 80 ? 'var(--sa-acc)' : 'var(--sa-warn)' }}></i>
            {(data?.summary.overallPercentage ?? 0) >= 80 ? 'Buen estado' : 'Atención requerida'}
          </span>
        </motion.section>

        <motion.section variants={iv} className="sa-stats">
          <div className="sa-stat-tile sa-stat-hi">
            <div className="sa-stat-top">
              <small>MATERIAS</small>
              <span className="sa-stat-ic"><BookOpen size={18} /></span>
            </div>
            <strong>{data?.summary.totalSubjects ?? 0}</strong>
          </div>
          
          <div className="sa-stat-tile sa-stat-ok">
            <div className="sa-stat-top">
              <small>ASISTENCIAS</small>
              <span className="sa-stat-ic"><CheckCircle2 size={20} /></span>
            </div>
            <strong>{data?.summary.totalAttended ?? 0}</strong>
          </div>

          <div className="sa-stat-tile sa-stat-bad">
            <div className="sa-stat-top">
              <small>FALTAS</small>
              <span className="sa-stat-ic"><XCircle size={20} /></span>
            </div>
            <strong>{data?.summary.totalUnjustified ?? 0}</strong>
          </div>

          <div className="sa-stat-tile sa-stat-warn">
            <div className="sa-stat-top">
              <small>EXC / RET</small>
              <span className="sa-stat-ic"><AlertTriangle size={18} /></span>
            </div>
            <strong>{(data?.summary.totalExcused ?? 0) + (data?.summary.totalTardy ?? 0)}</strong>
          </div>
        </motion.section>

        <motion.section variants={iv} className="sa-tools">
          <label className="sa-search">
            <Search size={20} />
            <input 
              type="search" 
              placeholder="Buscar materia o docente…" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="sa-period">
            Período:
            <div className="sa-sel">
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} aria-label="Período">
                <option value="">Todos los períodos</option>
                <option value="P.1">P.1</option>
                <option value="P.2">P.2</option>
                <option value="P.3">P.3</option>
                <option value="P.4">P.4</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        </motion.section>

        <motion.section variants={iv} className="sa-cards">
          {filteredData.length > 0 ? (
            filteredData.map((item) => {
              const progress = item.attendancePercentage;
              const hasClasses = item.totalSessions > 0;
              return (
                <motion.div key={item.id} variants={iv}>
                  <Link href={`/student/attendance/${item.id}`} className="sa-card">
                    <div className="sa-card-head">
                      <div className="h">
                        <span className="sa-go"><BookOpen size={20} strokeWidth={2.5} /></span>
                        <h3>{item.name}</h3>
                      </div>
                    </div>
                    
                    <div className="sa-gg">
                      <div>
                        <small>GRADO</small>
                        <b>{item.grade === 12 ? 'P-12' : item.grade === 13 ? 'P-13' : item.grade === 0 ? 'Niv' : (item.grade || '-')}</b>
                      </div>
                      <div>
                        <small>GRUPO</small>
                        <b>{item.group_number || '1'}</b>
                      </div>
                    </div>

                    <div className="sa-chips">
                      {item.period && <span className="p">Periodo {item.period}</span>}
                      <span className="e"><User size={14} strokeWidth={2.5}/> {item.teacherName || 'Docente'}</span>
                    </div>

                    <div className="sa-meta-cnt">
                      <div className="sa-bar">
                        <b style={{ width: `${progress}%`, background: progress >= 80 ? 'var(--sa-acc)' : (progress >= 60 ? 'var(--sa-warn)' : 'var(--sa-bad)') }}></b>
                      </div>
                      <div className="sa-cnt">
                        <span className="sa-cnt-ok" title="Asistencias"><CheckCircle2 size={15} /> {item.attendedCount}</span>
                        <span className="sa-cnt-bad" title="Inasistencias"><XCircle size={15} /> {item.unjustifiedAbsences}</span>
                        {(item.tardyCount > 0 || item.excusedAbsences > 0) && (
                          <span className="sa-cnt-warn" title="Retardos / Excusas"><AlertTriangle size={15} /> {item.tardyCount + item.excusedAbsences}</span>
                        )}
                      </div>
                    </div>

                    <div className="sa-open-btn">
                      Ver Asistencia <ArrowRight size={18} strokeWidth={2.5} />
                    </div>
                  </Link>
                </motion.div>
              )
            })
          ) : (
            <motion.div variants={iv} className="sa-empty">
              No hay materias que coincidan con tu búsqueda.
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </div>
  )
}
