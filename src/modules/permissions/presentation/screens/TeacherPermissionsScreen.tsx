'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Clock,
  Download,
  Eye,
  XCircle,
  Loader2,
  RefreshCw,
  GraduationCap,
  Send,
  Trash2,
  UploadCloud,
  CheckCircle2,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { PermissionRequest, PermissionStatsSummary } from '../../domain/entities'
import {
  getTeacherPermissions,
  cancelPermissionRequest,
  submitDraftPermission,
  deleteDraftPermission
} from '../../application/actions'
import { generatePermissionPDF } from '../../infrastructure/PermissionPDFGenerator'
import { PermissionAdvanceNoticeModal } from '../components/PermissionAdvanceNoticeModal'
import { PermissionSupportOverdueModal } from '../components/PermissionSupportOverdueModal'
import { PermissionPostSupportModal } from '../components/PermissionPostSupportModal'

export function TeacherPermissionsScreen() {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const [requests, setRequests] = useState<PermissionRequest[]>([])
  const [stats, setStats] = useState<PermissionStatsSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    totalHoursAffected: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modales
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [overdueRequest, setOverdueRequest] = useState<PermissionRequest | null>(null)
  const [selectedPostSupportReq, setSelectedPostSupportReq] = useState<PermissionRequest | null>(null)

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const data = await getTeacherPermissions(statusFilter)
      setRequests(data.requests)
      setStats(data.stats)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const foundOverdue = data.requests.find(r => {
        if (r.status !== 'approved') return false
        if (r.postSupportStatus === 'submitted' || r.postSupportStatus === 'approved') return false
        const end = new Date(r.endDate)
        end.setHours(0, 0, 0, 0)
        const diffDays = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 5
      })

      if (foundOverdue) {
        setOverdueRequest(foundOverdue)
        setShowOverdueModal(true)
      }
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar solicitudes de permisos')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    let active = true
    getTeacherPermissions(statusFilter)
      .then(data => {
        if (!active) return
        setRequests(data.requests)
        setStats(data.stats)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const foundOverdue = data.requests.find(r => {
          if (r.status !== 'approved') return false
          if (r.postSupportStatus === 'submitted' || r.postSupportStatus === 'approved') return false
          const end = new Date(r.endDate)
          end.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 5
        })

        if (foundOverdue) {
          setOverdueRequest(foundOverdue)
          setShowOverdueModal(true)
        }
      })
      .catch(e => {
        console.error(e)
        if (active) toast.error('Error al cargar solicitudes de permisos')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [statusFilter])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        r.requestNumber.toLowerCase().includes(q) ||
        r.typeSnapshot?.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      )
    })
  }, [requests, search])

  const handleDownloadPDF = async (e: React.MouseEvent, req: PermissionRequest) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      toast.info('Generando constancia oficial de permiso...')
      await generatePermissionPDF(req)
      toast.success('Constancia PDF descargada con éxito')
    } catch {
      toast.error('No se pudo generar el documento PDF')
    }
  }

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await cancelPermissionRequest(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Solicitud cancelada correctamente')
        loadData(true)
      }
    } catch {
      toast.error('Error al cancelar solicitud')
    }
  }

  const handleDraftSubmit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Desea radicar oficialmente este borrador para revisión de Rectoría?')) return
    try {
      const res = await submitDraftPermission(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Borrador radicado exitosamente ante Rectoría')
        loadData(true)
      }
    } catch {
      toast.error('Error al radicar el borrador')
    }
  }

  const handleDraftDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Está seguro de eliminar este borrador permanentemente? Esta acción no se puede deshacer.')) return
    try {
      const res = await deleteDraftPermission(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Borrador eliminado correctamente')
        loadData(true)
      }
    } catch {
      toast.error('Error al eliminar el borrador')
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved': return 'ok'
      case 'rejected': return 'bad'
      case 'returned_correction': return 'warn'
      case 'pending': return 'warn'
      default: return 'hi'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobada'
      case 'rejected': return 'Rechazada'
      case 'returned_correction': return 'Devuelta'
      case 'pending': return 'En trámite'
      default: return 'Borrador'
    }
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
        .app .hero .pill { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.14); border-radius: 99px; padding: 9px 16px; font-size: 14px; text-decoration: none; color: #fff; font-weight: 600; cursor: pointer; transition: transform 0.15s; border: none; }
        .app .hero .pill:active { transform: scale(0.96); }
        
        .app .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 640px) { .app .stats { grid-template-columns: repeat(4, 1fr); } }
        
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
        
        .app .period { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; font-weight: 600; color: var(--mute); flex-wrap: wrap; }
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
        
        .app .cnt { display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap; }
        .app .cnt span { display: flex; align-items: center; gap: 5px; border-radius: 99px; padding: 6px 12px; font-size: 12px; font-weight: 700; background: var(--soft); color: var(--mute); transition: transform 0.1s; }
        .app .cnt span:hover { filter: brightness(0.95); }
        .app .cnt span:active { transform: scale(0.95); }
        .app .cnt span.active { background: var(--accbg); color: var(--acc); }
        .app .cnt span.bad { background: color-mix(in srgb, var(--bad) 14%, transparent); color: var(--bad); }
        .app .cnt span.hi { background: var(--hi); color: var(--hi-ink); }
        
        .app .empty { grid-column: 1 / -1; text-align: center; color: var(--mute); padding: 40px; font-size: 15px; border: 1px dashed var(--tile-b); border-radius: 28px; background: var(--tile); }
        
        @media (min-width: 760px) {
          .app { padding: 28px 32px 56px; }
          .app h1 { font-size: 44px; }
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

      <h1>Permisos Docentes</h1>
      <p className="sub">Gestione y consulte el historial institucional de sus solicitudes de permisos y licencias.</p>

      <section className="hero">
        <div>
          <small>NOVEDADES</small>
          <strong>Solicitudes de Permiso</strong>
        </div>
        <button onClick={() => setShowAdvanceModal(true)} className="pill">
          <Plus size={18} strokeWidth={2.5} /> Nuevo
        </button>
      </section>

      <section className="stats">
        <div className="tile stat hi">
          <div className="top">
            <small>TOTAL SOLICITUDES</small>
            <span className="ic"><FileText /></span>
          </div>
          <strong>{stats.total}</strong>
        </div>
        
        <div className="tile stat warn">
          <div className="top">
            <small>EN TRÁMITE</small>
            <span className="ic"><Clock /></span>
          </div>
          <strong>{stats.pending}</strong>
        </div>
        
        <div className="tile stat ok">
          <div className="top">
            <small>APROBADAS</small>
            <span className="ic"><CheckCircle2 /></span>
          </div>
          <strong>{stats.approved}</strong>
        </div>
        
        <div className="tile stat bad">
          <div className="top">
            <small>RECHAZADAS</small>
            <span className="ic"><XCircle /></span>
          </div>
          <strong>{stats.rejected}</strong>
        </div>
      </section>

      <section className="tools">
        <label className="tile search">
          <Search />
          <input 
            type="search" 
            placeholder="Buscar por radicado o motivo..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        
        <div className="period">
          <div className="flex items-center gap-2">
            <div className="sel">
              <select aria-label="Estado" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">Todos los estados</option>
                <option value="pending">En trámite</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="returned_correction">Devueltas</option>
                <option value="draft">Borradores</option>
              </select>
              <ChevronDown />
            </div>
            
            <button onClick={() => loadData(true)} className="tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: '1px solid var(--tile-b)', borderRadius: '99px', cursor: 'pointer', background: 'var(--tile)', color: 'var(--mute)' }}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </section>

      <section className="cards">
        {loading ? (
          <div className="empty">Cargando solicitudes...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty">No hay solicitudes que coincidan con tu búsqueda.</div>
        ) : (
          filteredRequests.map(req => {
            const isApproved = req.status === 'approved'
            const canCancel = ['draft', 'submitted', 'returned_correction'].includes(req.status)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            return (
              <div key={req.id} className="tile card" onClick={() => router.push(`/teacher/permissions/${req.id}`)}>
                <div className="head">
                  <div className="tag">
                    <b className={getStatusClass(req.status)}>
                      {getStatusText(req.status)}
                    </b>
                    {req.requestNumber}
                  </div>
                  <span className="go"><ChevronRight /></span>
                </div>
                
                <div>
                  <h3>{req.typeSnapshot?.name || 'Permiso'}</h3>
                  <div className="teacher">
                    <AlertCircle />
                    {req.reason.substring(0, 50)}{req.reason.length > 50 ? '...' : ''}
                  </div>
                </div>
                
                <div className="meta">
                  <span>
                    <Calendar size={15} />
                    {req.startDate === req.endDate ? req.startDate : `${req.startDate} al ${req.endDate}`}
                  </span>
                  <span>
                    <Clock size={15} />
                    {req.isFullDay ? 'Jornada Completa' : `${req.startTime} - ${req.endTime}`}
                  </span>
                </div>
                
                <div className="cnt" onClick={e => e.stopPropagation()}>
                  {req.status === 'draft' && (
                    <>
                      <span className="active" onClick={(e) => handleDraftSubmit(e, req.id)}>
                        <Send size={15} /> Enviar
                      </span>
                      <span className="bad" onClick={(e) => handleDraftDelete(e, req.id)}>
                        <Trash2 size={15} /> Borrar
                      </span>
                    </>
                  )}
                  
                  {isApproved && (
                    <>
                      <span className="active" onClick={(e) => handleDownloadPDF(e, req)}>
                        <Download size={15} /> PDF
                      </span>
                      
                      {today >= new Date(req.endDate) && (!req.postSupportStatus || req.postSupportStatus === 'pending_upload' || req.postSupportStatus === 'rejected') && (
                        <span className="warn" onClick={(e) => {
                          e.preventDefault()
                          setSelectedPostSupportReq(req)
                        }}>
                          <UploadCloud size={15} /> Soporte
                        </span>
                      )}
                    </>
                  )}
                  
                  {canCancel && (
                    <span className="bad" onClick={(e) => handleCancel(e, req.id)}>
                      <XCircle size={15} /> Cancelar
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* Modal Req 6: Aviso preventivo de 8 días de anticipación */}
      <PermissionAdvanceNoticeModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onConfirm={() => {
          setShowAdvanceModal(false)
          router.push('/teacher/permissions/new')
        }}
      />

      {/* Modal Req 3: Alerta pop-up de soporte vencido tras 5 días */}
      <PermissionSupportOverdueModal
        isOpen={showOverdueModal}
        overdueRequest={overdueRequest}
        onClose={() => setShowOverdueModal(false)}
        onOpenUpload={(req) => {
          setShowOverdueModal(false)
          setSelectedPostSupportReq(req)
        }}
      />

      {/* Modal Req 1 & 2: Adjuntar soporte post-permiso */}
      {selectedPostSupportReq && (
        <PermissionPostSupportModal
          requestId={selectedPostSupportReq.id}
          requestNumber={selectedPostSupportReq.requestNumber}
          isOpen={!!selectedPostSupportReq}
          onClose={() => setSelectedPostSupportReq(null)}
          onSuccess={() => loadData(true)}
        />
      )}
    </div>
  )
}

