'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createAssistedAchievement, AchievementCodeConfig } from '../../application/actions'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface CreateAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  subjectId: string
  initialData?: { id: string, name: string, description: string, code_config?: AchievementCodeConfig }
}

export function CreateAchievementModal({ isOpen, onClose, onSuccess, subjectId, initialData }: CreateAchievementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  
  const [codeType, setCodeType] = useState<'none' | 'single' | 'by_range'>(initialData?.code_config?.type || 'none')
  const [singleCode, setSingleCode] = useState(initialData?.code_config?.singleCode || '')
  const [rangeCodes, setRangeCodes] = useState({
    bajo: initialData?.code_config?.rangeCodes?.bajo || '',
    basico: initialData?.code_config?.rangeCodes?.basico || '',
    alto: initialData?.code_config?.rangeCodes?.alto || '',
    superior: initialData?.code_config?.rangeCodes?.superior || '',
  })

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
      setDescription(initialData?.description || '')
      setCodeType(initialData?.code_config?.type || 'none')
      setSingleCode(initialData?.code_config?.singleCode || '')
      setRangeCodes({
        bajo: initialData?.code_config?.rangeCodes?.bajo || '',
        basico: initialData?.code_config?.rangeCodes?.basico || '',
        alto: initialData?.code_config?.rangeCodes?.alto || '',
        superior: initialData?.code_config?.rangeCodes?.superior || '',
      })
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('El nombre del logro es obligatorio')

    try {
      setIsSubmitting(true)
      const codeConfig: AchievementCodeConfig = {
        type: codeType,
        singleCode: codeType === 'single' ? String(singleCode).trim() : undefined,
        rangeCodes: codeType === 'by_range' ? {
          bajo: String(rangeCodes.bajo).trim(),
          basico: String(rangeCodes.basico).trim(),
          alto: String(rangeCodes.alto).trim(),
          superior: String(rangeCodes.superior).trim(),
        } : undefined
      }

      const { usePlanillaStore } = await import('@/store/usePlanillaStore')

      if (initialData) {
        // Modo edición
        const { updateAssistedAchievement } = await import('../../application/actions')
        await updateAssistedAchievement(initialData.id, name.trim(), description.trim(), codeConfig)
        usePlanillaStore.getState().updateAchievement(initialData.id, name.trim().toUpperCase(), description.trim(), codeConfig)
        toast.success('Logro actualizado exitosamente')
      } else {
        // Modo creación
        const newAch = await createAssistedAchievement(subjectId, name.trim(), description.trim(), codeConfig)
        usePlanillaStore.getState().addAchievement(newAch)
        toast.success('Logro creado exitosamente')
      }
      setName('')
      setDescription('')
      setCodeType('none')
      setSingleCode('')
      setRangeCodes({ bajo: '', basico: '', alto: '', superior: '' })
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || `Error al ${initialData ? 'actualizar' : 'crear'} el logro`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Logro' : 'Nuevo Logro'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los datos del desempeño o logro.' : 'Agrega un nuevo desempeño o logro para organizar tus actividades.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del logro *</Label>
            <Input
              id="name"
              placeholder="Ej: Logro 1 - Comprende los conceptos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción / Competencia (Opcional)</Label>
            <Input
              id="description"
              placeholder="Detalles de la competencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label className="font-semibold text-slate-800 dark:text-slate-200">Configuración de Código</Label>
            <RadioGroup value={codeType} onValueChange={(v: 'none' | 'single' | 'by_range') => setCodeType(v)} className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="r-none" />
                <Label htmlFor="r-none" className="font-normal cursor-pointer text-slate-600">Sin código adicional</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="r-single" />
                <Label htmlFor="r-single" className="font-normal cursor-pointer text-slate-600">Un solo código para cualquier nota</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="by_range" id="r-range" />
                <Label htmlFor="r-range" className="font-normal cursor-pointer text-slate-600">Un código distinto por rango de nota (Desempeño)</Label>
              </div>
            </RadioGroup>

            {codeType === 'single' && (
              <div className="pl-6 pt-2">
                <Label htmlFor="singleCode" className="text-xs text-slate-500">Código del Logro</Label>
                <Input
                  id="singleCode"
                  type="text"
                  className="mt-1"
                  placeholder="Ej: L1-ALL"
                  value={singleCode}
                  onChange={e => setSingleCode(e.target.value)}
                  required
                />
              </div>
            )}

            {codeType === 'by_range' && (
              <div className="pl-6 pt-2 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">1.0 a 2.9 (Bajo)</Label>
                  <Input type="text" placeholder="Código..." value={rangeCodes.bajo} onChange={e => setRangeCodes(prev => ({...prev, bajo: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">3.0 a 3.9 (Básico)</Label>
                  <Input type="text" placeholder="Código..." value={rangeCodes.basico} onChange={e => setRangeCodes(prev => ({...prev, basico: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">4.0 a 4.59 (Alto)</Label>
                  <Input type="text" placeholder="Código..." value={rangeCodes.alto} onChange={e => setRangeCodes(prev => ({...prev, alto: e.target.value}))} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">4.6 a 5.0 (Superior)</Label>
                  <Input type="text" placeholder="Código..." value={rangeCodes.superior} onChange={e => setRangeCodes(prev => ({...prev, superior: e.target.value}))} required />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Guardar Cambios' : 'Crear Logro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
