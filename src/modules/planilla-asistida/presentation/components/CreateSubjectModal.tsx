'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createAssistedSubject, updateAssistedSubject, AssistedSubject, getTeacherScheduleSubjects, getPlanillaInstitutionalSedes } from '../../application/actions'
import { Loader2 } from 'lucide-react'

interface CreateSubjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: AssistedSubject | null
  existingSubjects: AssistedSubject[]
}

export function CreateSubjectModal({ isOpen, onClose, onSuccess, initialData, existingSubjects }: CreateSubjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [scheduleSubjects, setScheduleSubjects] = useState<string[]>([])
  const [institutionalSedes, setInstitutionalSedes] = useState<{id: string, name: string}[]>([])
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    group_number: '',
    period: '',
    description: '',
    sede: ''
  })

  // Cargar materias del horario oficial y sedes
  React.useEffect(() => {
    if (isOpen) {
      getTeacherScheduleSubjects().then(setScheduleSubjects).catch(console.error)
      getPlanillaInstitutionalSedes().then(setInstitutionalSedes).catch(console.error)
    }
  }, [isOpen])

  // Cargar datos iniciales cuando se abre en modo edición
  React.useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name,
        grade: initialData.grade !== undefined && initialData.grade !== null ? initialData.grade.toString() : '',
        group_number: initialData.group_number?.toString() || '',
        period: initialData.period || '',
        description: initialData.description || '',
        sede: initialData.sede || ''
      })
    } else if (isOpen && !initialData) {
      setFormData({ name: '', grade: '', group_number: '', period: '', description: '', sede: '' })
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('El nombre de la materia es obligatorio')
      return
    }

    let newGrade: number | undefined = undefined
    if (formData.grade !== '') {
      const num = parseInt(formData.grade.trim(), 10)
      if (!isNaN(num)) newGrade = num
    }

    const newGroup = formData.group_number ? parseInt(formData.group_number, 10) : undefined

    const isDuplicate = existingSubjects.some(s => 
      s.name.toLowerCase() === formData.name.toLowerCase() && 
      s.grade?.toString() === formData.grade &&
      s.group_number?.toString() === formData.group_number &&
      s.period?.toString() === formData.period &&
      (s.sede || '') === formData.sede &&
      s.id !== initialData?.id
    )

    if (isDuplicate) {
      setShowWarningModal(true)
      return
    }

    try {
      setIsSubmitting(true)
      const submitData = {
        name: formData.name.trim(),
        grade: newGrade,
        group_number: newGroup,
        period: formData.period.trim(),
        description: formData.description.trim(),
        sede: formData.sede || undefined
      }

      if (initialData) {
        await updateAssistedSubject(initialData.id, submitData)
        toast.success('Planilla actualizada')
      } else {
        await createAssistedSubject(submitData)
        toast.success('Planilla creada exitosamente')
      }
      setFormData({ name: '', grade: '', group_number: '', period: '', description: '', sede: '' })
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la planilla')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Planilla' : 'Nueva Planilla Asistida'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los datos de la planilla.' : 'Crea una planilla aislada para calificar a tu manera. Solo tú tendrás acceso a estos datos.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subject_name">Nombre de la materia *</Label>
            <Input
              id="subject_name"
              name="subject_name"
              autoComplete="off"
              list="existing-subjects-list"
              placeholder="Ej: Tecnología e Informática"
              value={formData.name}
              onChange={(e) => {
                const val = e.target.value
                const formatted = val
                  .split(' ')
                  .map(word => {
                    if (word.length > 1) {
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    }
                    return word
                  })
                  .join(' ')
                setFormData(prev => ({ ...prev, name: formatted }))
              }}
              required
            />
            <datalist id="existing-subjects-list">
              {Array.from(new Set([...existingSubjects.map(s => s.name), ...scheduleSubjects])).map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grado</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  placeholder="Ej: 7"
                  value={formData.grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="group_number">Grupo</Label>
                <Input
                  id="group_number"
                  type="number"
                  min="1"
                  placeholder="Ej: 1"
                  value={formData.group_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, group_number: e.target.value }))}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="sede">Sede (Opcional pero Recomendado)</Label>
                <select
                  id="sede"
                  value={formData.sede}
                  onChange={(e) => setFormData(prev => ({ ...prev, sede: e.target.value }))}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                >
                  <option value="">Sede Principal (Por defecto)</option>
                  {institutionalSedes.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="period">Período</Label>
                <Input
                  id="period"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Ej: 1"
                  value={formData.period}
                  onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Notas adicionales..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {initialData ? 'Guardar Cambios' : 'Crear Planilla'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              ⚠️ Planilla Duplicada
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300 text-base pt-2">
              Ya tienes una planilla registrada con el nombre <strong>{formData.name.toUpperCase()}</strong> para el <strong>Grado {formData.grade}</strong> y <strong>Grupo {formData.group_number}</strong>{formData.sede ? <> en la sede <strong>{formData.sede}</strong></> : ''}.
              <br/><br/>
              Por favor, revisa tus planillas existentes o cambia el nombre, grado, grupo o sede para evitar confusiones.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowWarningModal(false)} className="bg-amber-500 hover:bg-amber-600 text-white">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
