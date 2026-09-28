'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle, XCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { changePasswordFirstLogin } from '@/modules/auth/application/actions'

const REQS = [
  { label: 'Minimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Al menos una mayuscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Al menos un numero', test: (v: string) => /[0-9]/.test(v) },
  { label: 'Al menos un caracter especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

function getStrength(p: string) {
  const met = REQS.filter(r => r.test(p)).length
  if (met === 0) return { score: 0, label: '', color: '' }
  if (met === 1) return { score: 25, label: 'Debil', color: 'bg-red-400' }
  if (met === 2) return { score: 50, label: 'Regular', color: 'bg-amber-400' }
  if (met === 3) return { score: 75, label: 'Buena', color: 'bg-emerald-400' }
  return { score: 100, label: 'Fuerte', color: 'bg-emerald-500' }
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getStrength(password)
  const allMet = REQS.every(r => r.test(password))
  const match = password === confirm && confirm.length > 0

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!allMet) { setError('La contrasena no cumple todos los requisitos.'); return }
    if (!match) { setError('Las contrasenias no coinciden.'); return }
    setLoading(true)
    try {
      const res = await changePasswordFirstLogin(password)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/student/dashboard'
        }, 500)
      }
    } catch {
      setError('Error al guardar la contrasena. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [password, confirm, allMet, match])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 240 }} className="w-full max-w-md">
        <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[32px] border border-slate-200/80 dark:border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#1F4E31] via-emerald-400 to-teal-400" />
          <div className="p-8 sm:p-10">

            <div className="text-center mb-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1F4E31] to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1.5">Crea tu contraseña</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                Define una contraseña segura y personal antes de acceder a tu portal.
              </p>
            </div>

            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white mb-1">Contrasena guardada</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Redirigiendo a tu portal...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="np" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nueva contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input id="np" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 8 caracteres" autoComplete="new-password"
                      className="w-full pl-10 pr-11 h-11 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E31]/25 focus:border-[#1F4E31] dark:focus:ring-emerald-500/25 dark:focus:border-emerald-500 transition-all" />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="pt-0.5 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div className={'h-full rounded-full ' + strength.color} animate={{ width: strength.score + '%' }} transition={{ duration: 0.4 }} />
                      </div>
                      {strength.label && <p className={'text-[11px] font-semibold ' + (strength.score === 100 ? 'text-emerald-600 dark:text-emerald-400' : strength.score >= 50 ? 'text-amber-600' : 'text-red-500')}>{strength.label}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cp" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirmar contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input id="cp" type={showCf ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite tu contrasena" autoComplete="new-password"
                      className={'w-full pl-10 pr-11 h-11 rounded-2xl border bg-slate-50/60 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ' + (confirm.length > 0 && !match ? 'border-red-400 focus:ring-red-400/25' : confirm.length > 0 && match ? 'border-emerald-400 focus:ring-emerald-400/25' : 'border-slate-200/90 dark:border-slate-700/60 focus:ring-[#1F4E31]/25 focus:border-[#1F4E31]')} />
                    <button type="button" onClick={() => setShowCf(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && !match && <p className="text-[11px] text-red-500">Las contrasenias no coinciden.</p>}
                  {confirm.length > 0 && match && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Las contrasenias coinciden</p>}
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Requisitos</p>
                  <div className="space-y-2">
                    {REQS.map((r, i) => {
                      const met = r.test(password)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          {met ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
                          <span className={'text-xs ' + (met ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>{r.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/50 px-4 py-3">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <button type="submit" disabled={loading || !allMet || !match}
                  className="w-full h-12 rounded-2xl bg-[#1F4E31] hover:bg-[#183e27] text-white text-sm font-bold shadow-sm shadow-emerald-950/20 active:scale-[0.98] transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Guardando...</span></> : 'Guardar y acceder a mi portal'}
                </button>

                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">Esta es tu contrasena personal. No la compartas con nadie.</p>
              </form>
            )}

          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-5">Escuela Normal Superior del Nordeste · aulaEnsuny</p>
      </motion.div>
    </div>
  )
}
