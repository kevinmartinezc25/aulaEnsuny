'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion'
import { 
  ArrowLeft, ShieldCheck, ShieldAlert, FileText, Calendar, 
  Clock, User, Download, CheckCircle2, AlertTriangle, 
  Sparkles, ChevronDown, Info, BookOpen, Award
} from 'lucide-react'
import { DisciplinaryReport, StudentDisciplinaryHistory } from '@/modules/disciplinary/application/actions'
import { DisciplinaryStatusBadge } from '@/components/disciplinary/DisciplinaryStatusBadge'
import { generateDisciplinaryPDF } from '@/components/disciplinary/DisciplinaryPDFGenerator'

interface StudentDisciplinaryClientViewProps {
  summary: StudentDisciplinaryHistory
  reports: DisciplinaryReport[]
  studentName: string
  groupName?: string
}

export function StudentDisciplinaryClientView({
  summary,
  reports,
  studentName,
  groupName
}: StudentDisciplinaryClientViewProps) {
  const shouldReduceMotion = useReducedMotion()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Tipo I' | 'Tipo II' | 'Tipo III'>('all')
  const [expandedReportId, setExpandedReportId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  )
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filteredReports = reports.filter(r => {
    if (selectedFilter === 'all') return true
    return r.situationSnapshot?.type === selectedFilter
  })

  const handleDownloadPDF = async (report: DisciplinaryReport) => {
    try {
      setDownloadingId(report.id)
      await generateDisciplinaryPDF(report)
    } catch (err) {
      console.error('Error al generar PDF del reporte:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedReportId(prev => (prev === id ? null : id))
  }

  const cv: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.05 } } }
  const iv: Variants = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 260 } } }

  const cssStyles = `
    .sd-page {
      --sd-bg: #e9f0ec;
      --sd-tile: #fff;
      --sd-tile-b: #d9e4de;
      --sd-ink: #10231c;
      --sd-mute: #5f776b;
      --sd-acc: #12a374;
      --sd-bad: #e5484d;
      --sd-warn: #d9831a;
      --sd-info: #0284c7;
      --sd-soft: #eef4f0;
      
      padding: 20px 16px 40px;
      margin: 0 auto;
      max-width: 1100px;
      box-sizing: border-box;
      color: var(--sd-ink);
    }

    .dark .sd-page {
      --sd-bg: #0c1512;
      --sd-tile: #15221d;
      --sd-tile-b: #22352d;
      --sd-ink: #eaf4ef;
      --sd-mute: #8aa399;
      --sd-acc: #5ee0b0;
      --sd-bad: #ff7a85;
      --sd-warn: #f2b04b;
      --sd-info: #38bdf8;
      --sd-soft: #1c2c26;
    }

    @media (min-width: 760px) {
      .sd-page { padding: 28px 32px 56px; }
    }

    .sd-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .sd-back-btn { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: var(--sd-tile); border: 1px solid var(--sd-tile-b); color: var(--sd-ink); text-decoration: none; transition: transform 0.15s; flex-shrink: 0; }
    .sd-back-btn:active { transform: scale(0.95); }
    .sd-back-btn:focus-visible { outline: 2px solid var(--sd-acc); outline-offset: 3px; }
    .sd-title-area { flex: 1; min-width: 0; }
    .sd-title { margin: 0; font-size: clamp(24px, 5vw, 34px); line-height: 1.1; font-weight: 700; letter-spacing: -1px; }
    .sd-subtitle { margin: 4px 0 0; color: var(--sd-mute); font-size: 14px; }
    .sd-subtitle strong { color: var(--sd-ink); }

    /* Stats Grid */
    .sd-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    @media (min-width: 760px) { .sd-stats { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
    .sd-stat-tile { background: var(--sd-tile); border: 1px solid var(--sd-tile-b); border-radius: 24px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; }
    .sd-stat-tile small { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--sd-mute); text-transform: uppercase; margin-bottom: 8px; display: block; }
    .sd-stat-tile strong { font-size: 32px; font-weight: 700; line-height: 1; color: var(--sd-ink); }

    /* Filters */
    .sd-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .sd-filter-group { display: flex; gap: 4px; padding: 4px; background: var(--sd-soft); border-radius: 16px; border: 1px solid var(--sd-tile-b); overflow-x: auto; max-width: 100%; }
    .sd-filter-btn { padding: 6px 14px; border-radius: 12px; font-size: 13px; font-weight: 700; border: none; background: transparent; color: var(--sd-mute); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .sd-filter-btn.active { background: var(--sd-tile); color: var(--sd-ink); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .sd-filter-btn.active.info { color: var(--sd-info); }
    .sd-filter-btn.active.warn { color: var(--sd-warn); }
    .sd-filter-btn.active.bad { color: var(--sd-bad); }

    /* Accordion */
    .sd-list { display: flex; flex-direction: column; gap: 16px; }
    .sd-item { background: var(--sd-tile); border: 1px solid var(--sd-tile-b); border-radius: 24px; overflow: hidden; }
    .sd-item-head { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; transition: background 0.15s; }
    @media (min-width: 760px) { .sd-item-head { flex-direction: row; align-items: center; justify-content: space-between; } }
    .sd-item-head:hover { background: var(--sd-soft); }
    
    .sd-item-left { display: flex; gap: 16px; align-items: flex-start; flex: 1; min-width: 0; }
    .sd-item-icon { width: 44px; height: 44px; border-radius: 16px; display: grid; place-items: center; flex-shrink: 0; }
    .sd-item-icon.info { background: color-mix(in srgb, var(--sd-info) 10%, transparent); color: var(--sd-info); border: 1px solid color-mix(in srgb, var(--sd-info) 20%, transparent); }
    .sd-item-icon.warn { background: color-mix(in srgb, var(--sd-warn) 10%, transparent); color: var(--sd-warn); border: 1px solid color-mix(in srgb, var(--sd-warn) 20%, transparent); }
    .sd-item-icon.bad { background: color-mix(in srgb, var(--sd-bad) 10%, transparent); color: var(--sd-bad); border: 1px solid color-mix(in srgb, var(--sd-bad) 20%, transparent); }

    .sd-item-info { flex: 1; min-width: 0; }
    .sd-item-badges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
    .sd-type-badge { padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid; }
    .sd-type-badge.info { background: color-mix(in srgb, var(--sd-info) 10%, transparent); color: var(--sd-info); border-color: color-mix(in srgb, var(--sd-info) 20%, transparent); }
    .sd-type-badge.warn { background: color-mix(in srgb, var(--sd-warn) 10%, transparent); color: var(--sd-warn); border-color: color-mix(in srgb, var(--sd-warn) 20%, transparent); }
    .sd-type-badge.bad { background: color-mix(in srgb, var(--sd-bad) 10%, transparent); color: var(--sd-bad); border-color: color-mix(in srgb, var(--sd-bad) 20%, transparent); }

    .sd-item-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; line-height: 1.3; }
    .sd-item-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--sd-mute); font-weight: 600; }
    .sd-item-meta span { display: flex; align-items: center; gap: 4px; }

    .sd-item-actions { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--sd-tile-b); }
    @media (min-width: 760px) { .sd-item-actions { padding-top: 0; border-top: none; justify-content: flex-end; gap: 16px; } }
    
    .sd-btn-dl { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 12px; background: var(--sd-soft); color: var(--sd-ink); font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: transform 0.1s; }
    .sd-btn-dl:active { transform: scale(0.95); }
    .sd-btn-dl:disabled { opacity: 0.6; pointer-events: none; }
    .sd-btn-dl-text { display: none; }
    @media (min-width: 480px) { .sd-btn-dl-text { display: inline; } }

    .sd-chevron { color: var(--sd-mute); transition: transform 0.2s; }
    .sd-chevron.open { transform: rotate(180deg); }

    /* Expanded Content */
    .sd-item-body { border-top: 1px solid var(--sd-tile-b); padding: 20px; background: var(--sd-soft); }
    .sd-body-block { margin-bottom: 20px; }
    .sd-body-block:last-child { margin-bottom: 0; }
    
    .sd-block-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--sd-mute); margin-bottom: 8px; }
    .sd-block-box { background: var(--sd-tile); border: 1px solid var(--sd-tile-b); border-radius: 16px; padding: 14px; font-size: 14px; line-height: 1.5; color: var(--sd-ink); white-space: pre-line; }
    
    .sd-ref-box { background: color-mix(in srgb, var(--sd-info) 10%, transparent); border: 1px solid color-mix(in srgb, var(--sd-info) 20%, transparent); color: var(--sd-info); border-radius: 16px; padding: 12px 14px; font-size: 13px; display: flex; gap: 10px; margin-bottom: 20px; }
    .sd-ref-box svg { flex-shrink: 0; margin-top: 2px; }
    .sd-ref-box strong { font-weight: 700; }
    .sd-ref-box p { margin: 4px 0 0; opacity: 0.8; font-size: 12px; }

    .sd-commitment .sd-block-title { color: var(--sd-acc); }
    .sd-commitment .sd-block-box { background: color-mix(in srgb, var(--sd-acc) 10%, transparent); border-color: color-mix(in srgb, var(--sd-acc) 20%, transparent); color: var(--sd-ink); }

    .sd-footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--sd-tile-b); font-size: 13px; }
    .sd-footer-status { display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .sd-footer-status.ok { color: var(--sd-acc); }
    .sd-footer-status.warn { color: var(--sd-warn); }
    .sd-footer-btn { display: inline-flex; align-items: center; gap: 6px; color: var(--sd-info); font-weight: 700; background: none; border: none; cursor: pointer; padding: 0; }
    .sd-footer-btn:hover { text-decoration: underline; }

    /* Empty & Note */
    .sd-hero-empty { background: color-mix(in srgb, var(--sd-acc) 8%, transparent); border: 1px solid color-mix(in srgb, var(--sd-acc) 20%, transparent); border-radius: 32px; padding: 48px 24px; text-align: center; }
    .sd-hero-icon { width: 80px; height: 80px; border-radius: 50%; background: color-mix(in srgb, var(--sd-acc) 15%, transparent); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--sd-acc); }
    .sd-hero-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 99px; background: color-mix(in srgb, var(--sd-acc) 15%, transparent); color: var(--sd-acc); font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    .sd-hero-empty h3 { font-size: 24px; font-weight: 700; margin: 0 0 12px; }
    .sd-hero-empty p { font-size: 14px; color: var(--sd-mute); line-height: 1.5; max-width: 500px; margin: 0 auto; }

    .sd-info-note { display: flex; gap: 12px; align-items: flex-start; padding: 16px; background: var(--sd-soft); border-radius: 20px; border: 1px solid var(--sd-tile-b); font-size: 12px; line-height: 1.5; color: var(--sd-mute); margin-top: 32px; }
    .sd-info-note svg { flex-shrink: 0; color: var(--sd-mute); margin-top: 2px; }
  `

  return (
    <div className="sd-page">
      <style>{cssStyles}</style>
      
      <motion.div variants={cv} initial="hidden" animate="show">
        <motion.header variants={iv} className="sd-header">
          <Link href="/student/dashboard" className="sd-back-btn" aria-label="Volver">
            <ArrowLeft size={22} />
          </Link>
          <div className="sd-title-area">
            <h1 className="sd-title">Reporte de anotaciones</h1>
            <p className="sd-subtitle">Reportes y novedades de <strong>{studentName}</strong></p>
          </div>
        </motion.header>

        <motion.section variants={iv} className="sd-stats">
          <div className="sd-stat-tile">
            <small>Total Novedades</small>
            <strong>{summary.totalReports}</strong>
          </div>
          <div className="sd-stat-tile" style={{ background: 'color-mix(in srgb, var(--sd-info) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--sd-info) 20%, transparent)' }}>
            <small style={{ color: 'var(--sd-info)' }}>Tipo I (Leves)</small>
            <strong style={{ color: 'var(--sd-info)' }}>{summary.tipoI}</strong>
          </div>
          <div className="sd-stat-tile" style={{ background: 'color-mix(in srgb, var(--sd-warn) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--sd-warn) 20%, transparent)' }}>
            <small style={{ color: 'var(--sd-warn)' }}>Tipo II (Graves)</small>
            <strong style={{ color: 'var(--sd-warn)' }}>{summary.tipoII}</strong>
          </div>
          <div className="sd-stat-tile" style={{ background: 'color-mix(in srgb, var(--sd-bad) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--sd-bad) 20%, transparent)' }}>
            <small style={{ color: 'var(--sd-bad)' }}>Tipo III (Gravísimas)</small>
            <strong style={{ color: 'var(--sd-bad)' }}>{summary.tipoIII}</strong>
          </div>
        </motion.section>

        {reports.length === 0 ? (
          <motion.div variants={iv} className="sd-hero-empty">
            <div className="sd-hero-icon">
              <Award size={40} />
            </div>
            <div className="sd-hero-pill">
              <Sparkles size={14} /> ¡Comportamiento Ejemplar!
            </div>
            <h3 style={{ margin: 0 }}>No tienes reportes de convivencia registrados</h3>
          </motion.div>
        ) : (
          <motion.div variants={iv}>
            <div className="sd-filters">
              <div className="sd-filter-group">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`sd-filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
                >
                  Todos ({reports.length})
                </button>
                {summary.tipoI > 0 && (
                  <button
                    onClick={() => setSelectedFilter('Tipo I')}
                    className={`sd-filter-btn ${selectedFilter === 'Tipo I' ? 'active info' : ''}`}
                  >
                    Tipo I ({summary.tipoI})
                  </button>
                )}
                {summary.tipoII > 0 && (
                  <button
                    onClick={() => setSelectedFilter('Tipo II')}
                    className={`sd-filter-btn ${selectedFilter === 'Tipo II' ? 'active warn' : ''}`}
                  >
                    Tipo II ({summary.tipoII})
                  </button>
                )}
                {summary.tipoIII > 0 && (
                  <button
                    onClick={() => setSelectedFilter('Tipo III')}
                    className={`sd-filter-btn ${selectedFilter === 'Tipo III' ? 'active bad' : ''}`}
                  >
                    Tipo III ({summary.tipoIII})
                  </button>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--sd-mute)', fontWeight: 600 }}>
                Mostrando {filteredReports.length} {filteredReports.length === 1 ? 'reporte' : 'reportes'}
              </span>
            </div>

            <div className="sd-list">
              {filteredReports.map((report) => {
                const isExpanded = expandedReportId === report.id
                const typeClass = report.situationSnapshot?.type === 'Tipo I' ? 'info' : report.situationSnapshot?.type === 'Tipo II' ? 'warn' : 'bad'

                return (
                  <div key={report.id} className="sd-item">
                    <div className="sd-item-head" onClick={() => toggleExpand(report.id)}>
                      <div className="sd-item-left">
                        <div className={`sd-item-icon ${typeClass}`}>
                          <FileText size={20} />
                        </div>
                        <div className="sd-item-info">
                          <div className="sd-item-badges">
                            <span className={`sd-type-badge ${typeClass}`}>
                              {report.situationSnapshot?.type || 'Tipo I'}
                            </span>
                            <DisciplinaryStatusBadge status={report.status} />
                            {report.signatureConfirmed && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--sd-acc)' }}>
                                <CheckCircle2 size={14} /> Firmado
                              </span>
                            )}
                          </div>
                          <h4 className="sd-item-title">
                            {report.situationSnapshot?.title || 'Novedad de Convivencia'}
                          </h4>
                          <div className="sd-item-meta">
                            <span><Calendar size={14} /> {report.reportDate}</span>
                            {report.reportTime && <span><Clock size={14} /> {report.reportTime.slice(0, 5)}</span>}
                            <span><User size={14} /> Docente: {report.teacherName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="sd-item-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPDF(report)
                          }}
                          disabled={downloadingId === report.id}
                          className="sd-btn-dl"
                          title="Descargar constancia en PDF"
                        >
                          <Download size={14} />
                          <span className="sd-btn-dl-text">
                            {downloadingId === report.id ? 'Generando...' : 'Descargar PDF'}
                          </span>
                        </button>
                        <ChevronDown size={20} className={`sd-chevron ${isExpanded ? 'open' : ''}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="sd-item-body">
                            {report.situationSnapshot?.manualReference && (
                              <div className="sd-ref-box">
                                <BookOpen size={16} />
                                <div>
                                  <strong>Referencia Manual de Convivencia:</strong> <span>{report.situationSnapshot.manualReference}</span>
                                  {report.situationSnapshot.description && (
                                    <p>{report.situationSnapshot.description}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="sd-body-block">
                              <div className="sd-block-title">Descripción de los hechos y observaciones pedagógicas</div>
                              <div className="sd-block-box">
                                {report.teacherDescription || report.generatedReport || 'Sin descripción detallada.'}
                              </div>
                            </div>

                            {report.studentDefense && (
                              <div className="sd-body-block">
                                <div className="sd-block-title">Versión libre y aclaraciones del estudiante</div>
                                <div className="sd-block-box">
                                  {report.studentDefense}
                                </div>
                              </div>
                            )}

                            {report.studentCommitment && (
                              <div className="sd-body-block sd-commitment">
                                <div className="sd-block-title">Compromisos y acuerdos pedagógicos asumidos</div>
                                <div className="sd-block-box">
                                  {report.studentCommitment}
                                </div>
                              </div>
                            )}

                            <div className="sd-footer">
                              <div className={`sd-footer-status ${report.signatureConfirmed ? 'ok' : 'warn'}`}>
                                {report.signatureConfirmed ? (
                                  <><CheckCircle2 size={16} /> Reporte notificado y firmado por el estudiante</>
                                ) : (
                                  <><AlertTriangle size={16} /> Notificación formal registrada en sistema</>
                                )}
                              </div>
                              <button
                                onClick={() => handleDownloadPDF(report)}
                                disabled={downloadingId === report.id}
                                className="sd-footer-btn"
                              >
                                <Download size={14} />
                                Descargar copia del acta (.pdf)
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={iv} className="sd-info-note">
          <Info size={16} />
          <p>
            <strong>Marco Institucional de Convivencia:</strong> Los registros convivenciales forman parte del seguimiento formativo integral orientado por la Ley 1620 de 2013 y el Manual de Convivencia Escolar. Tienen como propósito el fortalecimiento de los valores pedagógicos, el diálogo constructivo y el debido proceso. Para cualquier inquietud o seguimiento adicional, comunícate con la Coordinación de Convivencia de la institución.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
