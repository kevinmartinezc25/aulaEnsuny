'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Users, UserCircle } from 'lucide-react'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipient: { name: string; email: string } | null
  onSend: (subject: string, message: string) => void
}

export function MessageModal({ isOpen, onClose, recipient, onSend }: MessageModalProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const isGlobal = !recipient

  useEffect(() => {
    if (!isOpen) {
      setSubject('')
      setMessage('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = () => {
    if (!subject || !message) return
    onSend(subject, message)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm dark:bg-black/40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 p-5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {isGlobal ? 'Comunicado Masivo' : 'Mensaje Directo'}
                </h2>
                <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                      {isGlobal ? <Users className="h-5 w-5" /> : <UserCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Para:</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {isGlobal ? 'Todos los estudiantes inscritos' : `${recipient.name} (${recipient.email})`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Asunto</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. Recordatorio de Entrega Final"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mensaje</label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe aquí el contenido..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 p-5 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button onClick={handleSend} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm">
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
