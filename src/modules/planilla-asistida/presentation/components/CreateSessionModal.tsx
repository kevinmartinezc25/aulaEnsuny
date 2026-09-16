'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { createAssistedSession, updateAssistedSession, AssistedSession } from '../../application/attendanceActions'
import { toast } from 'sonner'
import { usePlanillaStore } from '@/store/usePlanillaStore'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  subjectId: string
  onSuccess: () => void
  sessionToEdit?: AssistedSession | null
}

export function CreateSessionModal({ isOpen, onClose, subjectId, onSuccess, sessionToEdit }: CreateSessionModalProps) {
  const [date, setDate] = useState('')
  const [topic, setTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addSession = usePlanillaStore(state => state.addSession)
  const updateSession = usePlanillaStore(state => state.updateSession)

  useEffect(() => {
    if (isOpen) {
      if (sessionToEdit) {
        setDate(sessionToEdit.date)
        setTopic(sessionToEdit.topic || '')
      } else {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        setDate(`${year}-${month}-${day}`)
        setTopic('')
      }
    }
  }, [isOpen, sessionToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!date) {
      toast.error('La fecha es requerida')
      return
    }

    try {
      setIsSubmitting(true)
      if (sessionToEdit) {
        const updated = await updateAssistedSession(sessionToEdit.id, date, topic)
        updateSession(updated)
        toast.success('Clase actualizada exitosamente')
      } else {
        const newSession = await createAssistedSession(subjectId, date, topic)
        addSession(newSession)
        toast.success('Clase creada exitosamente')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la clase')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nueva Clase</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha de la clase *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="topic">Tema tratado (Opcional)</Label>
            <Input
              id="topic"
              placeholder="Ej. Ecuaciones de primer grado"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Clase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
