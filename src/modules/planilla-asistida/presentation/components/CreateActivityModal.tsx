'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createAssistedActivity } from '../../application/actions'
import { Loader2 } from 'lucide-react'

interface CreateActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  achievementId: string
  componentType: 'hacer' | 'saber' | 'ser'
  initialData?: { id: string, name: string }
}

export function CreateActivityModal({ isOpen, onClose, onSuccess, achievementId, componentType, initialData }: CreateActivityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(initialData?.name || '')

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('El nombre de la actividad es obligatorio')

    try {
      setIsSubmitting(true)
      if (initialData) {
        const { updateAssistedActivity } = await import('../../application/actions')
        const { usePlanillaStore } = await import('@/store/usePlanillaStore')
        await updateAssistedActivity(initialData.id, name.trim())
        usePlanillaStore.getState().updateActivity(initialData.id, name.trim())
        toast.success('Actividad actualizada exitosamente')
      } else {
        await createAssistedActivity(achievementId, componentType, name.trim())
        toast.success('Actividad agregada exitosamente')
      }
      setName('')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || `Error al ${initialData ? 'actualizar' : 'agregar'} la actividad`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica el nombre de la actividad.' : `Agrega una nueva actividad para el componente ${componentType.toUpperCase()}.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre corto de la actividad *</Label>
            <Input
              id="name"
              placeholder="Ej: Act. 1, Taller, Evaluación..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={20}
            />
            <p className="text-xs text-slate-500">Usa un nombre corto. En la planilla se mostrará rotado verticalmente.</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Guardar Cambios' : 'Agregar Actividad'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
