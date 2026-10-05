'use client'

import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, User, Clock } from 'lucide-react'
import Link from 'next/link'
import { getStudentSubjectAttendanceTraceability } from '@/modules/planilla-asistida/application/studentAttendanceQueries'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function StudentAttendanceDetailScreen({ subjectId }: { subjectId: string }) {
  const shouldReduceMotion = useReducedMotion()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'A' | 'T' | 'I' | 'E'>('all')

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const result = await getStudentSubjectAttendanceTraceability(subjectId)
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        console.error('Error fetching detail:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [subjectId])

  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.05 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  if (loading) {
    return (
      <div className="sad-page">
        <style>{`.sad-page { padding: 20px 16px 40px; max-width: 800px; margin: 0 auto; } .sad-skeleton { background: var(--sa-tile, #fff); border-radius: 16px; opacity: 0.5; margin-bottom: 16px; } .dark .sad-page { --sa-tile: #15221d; }`}</style>
        <div className="sad-skeleton animate-pulse" style={{ height: '80px' }} />
        <div className="sad-skeleton animate-pulse" style={{ height: '140px', borderRadius: '24px' }} />
        <div className="sad-skeleton animate-pulse" style={{ height: '300px' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="sad-page" style={{ textAlign: 'center', paddingTop: '40px' }}>
         <p style={{ color: 'var(--sad-mute)' }}>No se encontró información para esta materia.</p>
         <Link href="/student/attendance" style={{ color: 'var(--sad-acc)', fontWeight: 600, marginTop: '12px', display: 'inline-block' }}>Volver al listado</Link>
      </div>
    )
  }

  const { subject, summary, sessions } = data

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'A': return <CheckCircle2 size={18} className="sad-st-icon ok" />
      case 'I': return <XCircle size={18} className="sad-st-icon bad" />
      case 'E': 
      case 'T': return <AlertTriangle size={18} className="sad-st-icon warn" />
      default: return <Clock size={18} className="sad-st-icon none" />
    }
  }

  const filteredSessions = sessions.filter((sess: any) => {
    if (selectedFilter === 'all') return true
    return sess.status === selectedFilter
  })

  return (
    <div className="sad-page">
      <style>{`
        .sad-page {
          --sad-bg: #e9f0ec;
          --sad-tile: #fff;
          --sad-tile-b: #d9e4de;
          --sad-ink: #10231c;
          --sad-mute: #5f776b;
          --sad-acc: #12a374;
          --sad-bad: #e5484d;
          --sad-warn: #d9831a;
          --sad-soft: #eef4f0;
          --sad-accbg: rgba(18,163,116,.12);
          
          padding: 20px 16px 40px;
          margin: 0 auto;
          max-width: 800px;
          box-sizing: border-box;
          color: var(--sad-ink);
        }

        .dark .sad-page {
          --sad-bg: #0c1512;
          --sad-tile: #15221d;
          --sad-tile-b: #22352d;
          --sad-ink: #eaf4ef;
          --sad-mute: #8aa399;
          --sad-acc: #5ee0b0;
          --sad-bad: #ff7a85;
          --sad-warn: #f2b04b;
          --sad-soft: #1c2c26;
          --sad-accbg: rgba(94,224,176,.12);
        }
        
        .sad-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }
        .sad-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--sad-tile);
          border: 1px solid var(--sad-tile-b);
          color: var(--sad-ink);
          text-decoration: none;
          flex-shrink: 0;
          transition: transform 0.15s;
        }
        .sad-back-btn:active { transform: scale(0.95); }
        .sad-title-area h1 {
          margin: 0;
          font-size: clamp(20px, 4vw, 28px);
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.5px;
        }
        .sad-title-area p {
          margin: 6px 0 0;
          color: var(--sad-mute);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .sad-summary {
          background: var(--sad-tile);
          border: 1px solid var(--sad-tile-b);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: space-between;
          align-items: center;
        }
        .sad-pct {
          display: flex;
          flex-direction: column;
        }
        .sad-pct strong {
          font-size: 40px;
          line-height: 1;
          letter-spacing: -1.5px;
        }
        .sad-pct span {
          font-size: 13px;
          color: var(--sad-mute);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 6px;
        }
        .sad-counters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sad-counter {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--sad-soft);
          padding: 8px 14px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
        }
        .sad-counter.ok { color: var(--sad-acc); background: var(--sad-accbg); }
        .sad-counter.bad { color: var(--sad-bad); background: color-mix(in srgb, var(--sad-bad) 14%, transparent); }
        .sad-counter.warn { color: var(--sad-warn); background: color-mix(in srgb, var(--sad-warn) 16%, transparent); }

        .sad-list-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--sad-mute);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .sad-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .sad-filter-group { display: flex; gap: 4px; padding: 4px; background: var(--sad-soft); border-radius: 16px; border: 1px solid var(--sad-tile-b); overflow-x: auto; max-width: 100%; }
        .sad-filter-btn { padding: 6px 14px; border-radius: 12px; font-size: 13px; font-weight: 700; border: none; background: transparent; color: var(--sad-mute); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .sad-filter-btn.active { background: var(--sad-tile); color: var(--sad-ink); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .sad-filter-btn.active.ok { color: var(--sad-acc); }
        .sad-filter-btn.active.warn { color: var(--sad-warn); }
        .sad-filter-btn.active.bad { color: var(--sad-bad); }

        .sad-list-card {
          background: var(--sad-tile);
          border: 1px solid var(--sad-tile-b);
          border-radius: 24px;
          overflow: hidden;
        }
        
        .sad-list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 16px;
          border-bottom: 1px solid var(--sad-tile-b);
        }
        .sad-list-row:last-child {
          border-bottom: none;
        }
        
        .sad-row-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .sad-row-date {
          flex-shrink: 0;
          text-align: center;
          width: 44px;
        }
        .sad-row-date b { display: block; font-size: 18px; line-height: 1; color: var(--sad-ink); }
        .sad-row-date span { display: block; font-size: 11px; text-transform: uppercase; color: var(--sad-mute); font-weight: 700; margin-top: 4px; }

        .sad-row-topic {
          font-size: 15px;
          font-weight: 600;
          color: var(--sad-ink);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sad-row-right {
          flex-shrink: 0;
        }
        .sad-row-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px 5px 8px;
          border-radius: 99px;
          background: var(--sad-soft);
          color: var(--sad-mute);
        }
        .sad-row-status.ok { color: var(--sad-acc); background: var(--sad-accbg); }
        .sad-row-status.bad { color: var(--sad-bad); background: color-mix(in srgb, var(--sad-bad) 14%, transparent); }
        .sad-row-status.warn { color: var(--sad-warn); background: color-mix(in srgb, var(--sad-warn) 16%, transparent); }
        
        @media (max-width: 480px) {
          .sad-row-status span { display: none; }
          .sad-row-status { padding: 6px; }
          .sad-row-left { gap: 12px; }
          .sad-list-row { padding: 14px 16px; }
        }

      `}</style>
      <motion.div variants={cv} initial="hidden" animate="show">
        <motion.header variants={iv} className="sad-header">
          <Link href="/student/attendance" className="sad-back-btn" aria-label="Volver">
            <ArrowLeft size={22} />
          </Link>
          <div className="sad-title-area">
            <h1>{subject.name}</h1>
            <p><User size={15} /> {subject.teacherName || 'Docente sin asignar'} • {subject.period}</p>
          </div>
        </motion.header>

        <motion.section variants={iv} className="sad-summary">
          <div className="sad-pct">
            <strong style={{ color: summary.attendancePercentage >= 80 ? 'var(--sad-acc)' : summary.attendancePercentage >= 60 ? 'var(--sad-warn)' : 'var(--sad-bad)' }}>
              {summary.attendancePercentage}%
            </strong>
            <span>Asistencia</span>
          </div>
          <div className="sad-counters">
            <div className="sad-counter ok"><CheckCircle2 size={16} /> {summary.attendedCount}</div>
            <div className="sad-counter bad"><XCircle size={16} /> {summary.unjustifiedAbsences}</div>
            {(summary.tardyCount > 0 || summary.excusedAbsences > 0) && (
              <div className="sad-counter warn"><AlertTriangle size={16} /> {summary.tardyCount + summary.excusedAbsences}</div>
            )}
          </div>
        </motion.section>

        <motion.h2 variants={iv} className="sad-list-title">Historial de Sesiones</motion.h2>

        {sessions.length > 0 && (
          <motion.div variants={iv} className="sad-filters">
            <div className="sad-filter-group">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`sad-filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
              >
                Todas ({sessions.length})
              </button>
              {summary.attendedCount > 0 && (
                <button
                  onClick={() => setSelectedFilter('A')}
                  className={`sad-filter-btn ${selectedFilter === 'A' ? 'active ok' : ''}`}
                >
                  Asistió ({summary.attendedCount})
                </button>
              )}
              {summary.tardyCount > 0 && (
                <button
                  onClick={() => setSelectedFilter('T')}
                  className={`sad-filter-btn ${selectedFilter === 'T' ? 'active warn' : ''}`}
                >
                  Llegó Tarde ({summary.tardyCount})
                </button>
              )}
              {summary.unjustifiedAbsences > 0 && (
                <button
                  onClick={() => setSelectedFilter('I')}
                  className={`sad-filter-btn ${selectedFilter === 'I' ? 'active bad' : ''}`}
                >
                  Inasistencias ({summary.unjustifiedAbsences})
                </button>
              )}
              {summary.excusedAbsences > 0 && (
                <button
                  onClick={() => setSelectedFilter('E')}
                  className={`sad-filter-btn ${selectedFilter === 'E' ? 'active warn' : ''}`}
                >
                  Excusas ({summary.excusedAbsences})
                </button>
              )}
            </div>
          </motion.div>
        )}

        <motion.div variants={iv}>
          {filteredSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sad-mute)', background: 'var(--sad-tile)', borderRadius: '24px', border: '1px dashed var(--sad-tile-b)' }}>
               {sessions.length === 0 ? 'El docente aún no ha registrado sesiones para esta materia.' : 'No hay sesiones que coincidan con este filtro.'}
            </div>
          ) : (
            <div className="sad-list-card">
              {filteredSessions.map((sess: any) => {
                const [y, m, d] = sess.date.split('-')
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
                const day = format(dateObj, 'd', { locale: es })
                const month = format(dateObj, 'MMM', { locale: es }).slice(0, 3)
                
                const statusClass = sess.status === 'A' ? 'ok' : sess.status === 'I' ? 'bad' : sess.status === 'NONE' ? '' : 'warn'

                return (
                  <div key={sess.sessionId} className="sad-list-row">
                    <div className="sad-row-left">
                      <div className="sad-row-date">
                        <b>{day}</b>
                        <span>{month}</span>
                      </div>
                      <p className="sad-row-topic" title={sess.topic || 'Sin tema registrado'}>
                        {sess.topic || 'Sin tema registrado'}
                      </p>
                    </div>
                    
                    <div className="sad-row-right">
                      <div className={`sad-row-status ${statusClass}`}>
                        {getStatusIcon(sess.status)}
                        <span>{sess.statusLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
