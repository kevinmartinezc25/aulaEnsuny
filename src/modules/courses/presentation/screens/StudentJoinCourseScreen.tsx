'use client'

import React, { useState } from 'react'
import { BookOpen, Loader2, Sparkles } from 'lucide-react'
import { createJoinRequest } from '../../application/joinRequestsActions'

export function StudentJoinCourseScreen() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const courseId = code.trim()
      if (!courseId) {
        throw new Error('Ingresa el código o el identificador del curso')
      }

      const result = await createJoinRequest({ courseId, code })
      setMessage(`Solicitud enviada correctamente. ID: ${result.id}`)
      setCode('')
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Unirse a un curso</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ingresa un código de invitación para solicitar acceso.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Código del curso</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej. TEC10A-7F9KQ"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F4E31] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#153823] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Solicitar ingreso
        </button>
      </form>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p> : null}
      {message ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p> : null}
    </div>
  )
}
