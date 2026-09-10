'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  CornerDownLeft, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Copy,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { ForumReply } from '../../application/forumActions'
import { MiniForumEditor } from '@/core/components/MiniForumEditor'

interface ForumReplyCardProps {
  reply: ForumReply
  currentUserId?: string | null
  currentUserRole?: string
  allReplies?: ForumReply[]
  level?: number
  onLike?: (replyId: string) => Promise<void> | void
  onStartEdit?: (reply: ForumReply) => void
  onSaveEdit?: (replyId: string, content: string) => Promise<void> | void
  onCancelEdit?: () => void
  isEditing?: boolean
  editContent?: string
  setEditContent?: (val: string) => void
  onDelete?: (replyId: string) => Promise<void> | void
  onVerify?: (replyId: string, verified: boolean) => Promise<void> | void
  replyingToId?: string | null
  setReplyingToId?: (id: string | null) => void
  onSubmitReply?: (parentId: string, content: string) => Promise<void> | void
  allowNestedReplies?: boolean
  isThreadLocked?: boolean
}

// 1. Deterministic initials generator (2 uppercase letters)
export function getInitials(name: string): string {
  if (!name) return 'US'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  // For 4 names (FirstName MiddleName Surname1 Surname2), extract FirstName + FirstSurname
  // e.g. "Alfreidy Alejandra Materano mantilla" -> "AM", "Saray mazo Mazo granda" -> "SM"
  if (parts.length >= 4) {
    return (parts[0][0] + parts[2][0]).toUpperCase()
  }
  // For 2 or 3 names (e.g. "Juliana Arango Granada" -> "JA", "Carlos Docente" -> "CD")
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// 2. Deterministic vibrant color palette matching modern Apple-inspired designs
const AVATAR_COLORS = [
  'bg-[#3b82f6]', // Blue (like SM in screenshot)
  'bg-[#6366f1]', // Indigo (like JA in screenshot)
  'bg-[#10b981]', // Emerald (like AM in screenshot)
  'bg-[#8b5cf6]', // Violet
  'bg-[#06b6d4]', // Cyan
  'bg-[#f59e0b]', // Amber
  'bg-[#f43f5e]', // Rose
  'bg-[#0ea5e9]'  // Sky
]

export function getAvatarBg(name: string): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// 3. Format timestamp like reference: "12 ago, 09:58"
export function formatReplyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const day = d.getDate()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const month = months[d.getMonth()]
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day} ${month}, ${hours}:${minutes}`
  } catch {
    return ''
  }
}

// 4. Formatter to handle blocks and blockquotes with the distinctive blue border
export function formatReplyContent(html: string): string {
  if (!html) return ''

  // Filter out any lingering mock debate sentence
  let processed = html
    .replace(/<p[^>]*>\s*Debate:\s*Estoy\s*de\s*acuerdo\s*con\s*la\s*opinion\s*de\s*mi\s*compañero[\s\S]*?años\s*atrás\.?\s*<\/p>/gi, '')
    .replace(/Debate:\s*Estoy\s*de\s*acuerdo\s*con\s*la\s*opinion\s*de\s*mi\s*compañero[\s\S]*?años\s*atrás\.?/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/(<\/(?:span|strong|b|em|i|u|p|div|h[1-6]|li|a)>)([A-Za-z0-9áéíóúÁÉÍÓÚñÑ])/g, '$1 $2')

  // Ensure all anchor links have target="_blank" and rel="noopener noreferrer"
  processed = processed.replace(/<a(?![^>]*target=)([^>]+)>/gi, '<a$1 target="_blank" rel="noopener noreferrer">')

  // If already contains forum-debate-quote class, keep it clean
  if (processed.includes('forum-debate-quote')) {
    return processed
  }

  // If text contains "Debate:" outside tags or in paragraphs, wrap into the debate block
  const debateRegex = /(<p[^>]*>)?\s*(Debate:\s*[\s\S]*?)(<\/p>|$)/gi
  if (debateRegex.test(processed)) {
    processed = processed.replace(debateRegex, (_match, _pOpen, debateText, _pClose) => {
      return `<div class="forum-debate-quote">${debateText}</div>`
    })
  }

  return processed
}

export function ForumReplyCard({
  reply,
  currentUserId,
  currentUserRole = 'student',
  allReplies = [],
  level = 0,
  onLike,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  isEditing = false,
  editContent = '',
  setEditContent,
  onDelete,
  onVerify,
  replyingToId,
  setReplyingToId,
  onSubmitReply,
  allowNestedReplies = true,
  isThreadLocked = false
}: ForumReplyCardProps) {
  const [likesCount, setLikesCount] = useState<number>(reply.likesCount ?? 0)
  const [hasLiked, setHasLiked] = useState<boolean>(reply.hasLiked ?? false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inlineReply, setInlineReply] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Update local state when reply props change
  useEffect(() => {
    setLikesCount(reply.likesCount ?? 0)
    setHasLiked(reply.hasLiked ?? false)
  }, [reply.likesCount, reply.hasLiked])

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const initials = getInitials(reply.authorName)
  const avatarBg = getAvatarBg(reply.authorName)
  const formattedDate = formatReplyDate(reply.createdAt)
  const isAuthor = currentUserId === reply.authorId
  const isTeacherOrAdmin = currentUserRole === 'teacher' || currentUserRole === 'admin'
  const isReplying = replyingToId === reply.id

  const handleLikeClick = async () => {
    // Instant optimistic toggle
    const newLiked = !hasLiked
    const newCount = Math.max(0, likesCount + (newLiked ? 1 : -1))
    setHasLiked(newLiked)
    setLikesCount(newCount)

    if (onLike) {
      try {
        await onLike(reply.id)
      } catch (err) {
        // Rollback on error
        setHasLiked(!newLiked)
        setLikesCount(likesCount)
      }
    }
  }

  const handleCopyText = () => {
    const div = document.createElement('div')
    div.innerHTML = reply.content
    const text = div.textContent || div.innerText || ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Texto copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
    setIsMenuOpen(false)
  }

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inlineReply.trim()) return
    try {
      setSubmittingReply(true)
      if (onSubmitReply) {
        await onSubmitReply(reply.id, inlineReply)
      }
      setInlineReply('')
      if (setReplyingToId) {
        setReplyingToId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingReply(false)
    }
  }

  // Nested child replies
  const childReplies = allReplies
    .filter(r => r.parentId === reply.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className={`transition-all duration-200 ${level > 0 ? 'ml-4 sm:ml-10 mt-3 border-l-2 border-slate-100 dark:border-slate-800 pl-3 sm:pl-5' : ''}`}>
      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/70 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar with 2 uppercase initials and vibrant solid color */}
            <div 
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${avatarBg} text-white font-bold text-sm sm:text-[15px] flex items-center justify-center shrink-0 shadow-sm select-none`}
            >
              {initials}
            </div>

            {/* Author info */}
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm sm:text-[15px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {reply.authorName}
                </span>

                {/* Role Pill Badge */}
                {reply.authorRole === 'teacher' ? (
                  <span className="bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center">
                    Docente
                  </span>
                ) : (
                  <span className="bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center">
                    Estudiante
                  </span>
                )}

                {reply.isTeacherVerified && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                    Verificado
                  </span>
                )}
              </div>

              {/* Timestamp below name */}
              <div className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                {formattedDate}
              </div>
            </div>
          </div>

          {/* Three dots Context Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title="Opciones de respuesta"
              aria-label="Opciones"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1.5 z-20"
                >
                  {isAuthor && onStartEdit && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        onStartEdit(reply)
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                      Editar aportación
                    </button>
                  )}

                  {isTeacherOrAdmin && onVerify && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        onVerify(reply.id, !reply.isTeacherVerified)
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <CheckCircle className={`h-3.5 w-3.5 ${reply.isTeacherVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {reply.isTeacherVerified ? 'Quitar verificación' : 'Marcar como verificada'}
                    </button>
                  )}

                  <button
                    onClick={handleCopyText}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                    {copied ? 'Copiado' : 'Copiar texto'}
                  </button>

                  {(isAuthor || isTeacherOrAdmin) && onDelete && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        if (confirm('¿Estás seguro de que deseas eliminar esta aportación?')) {
                          onDelete(reply.id)
                        }
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      Eliminar aportación
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Card Content Body or Inline Edit Form */}
        {isEditing ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              if (onSaveEdit) onSaveEdit(reply.id, editContent)
            }} 
            className="space-y-3 mt-4"
          >
            <MiniForumEditor
              value={editContent}
              onChange={setEditContent || (() => {})}
              placeholder="Edita tu respuesta..."
              minHeight="110px"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white shadow border-none cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3.5 space-y-3">
            {/* Formatted body text with support for Debate: block with thick blue border */}
            <div 
              className="text-sm sm:text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal forum-reply-body"
              dangerouslySetInnerHTML={{ __html: formatReplyContent(reply.content) }}
            />
          </div>
        )}

        {/* Card Action Footer */}
        <div className="flex items-center gap-6 pt-3 mt-1 select-none text-slate-500 dark:text-slate-400 text-xs font-medium">
          {/* Like Button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleLikeClick}
            className={`flex items-center gap-1.5 border-none bg-transparent cursor-pointer transition-colors p-0 ${
              hasLiked 
                ? 'text-rose-600 dark:text-rose-500 font-semibold' 
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
            title="Me gusta"
          >
            <Heart 
              className={`h-4 w-4 transition-transform ${
                hasLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-500 dark:text-slate-400'
              }`} 
            />
            <span>{likesCount > 0 ? likesCount : ''}</span>
          </motion.button>

          {/* Responder Button */}
          {allowNestedReplies && !isThreadLocked && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (setReplyingToId) {
                  setReplyingToId(isReplying ? null : reply.id)
                  setInlineReply('')
                }
              }}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border-none bg-transparent cursor-pointer transition-colors p-0"
              title="Responder a este comentario"
            >
              <CornerDownLeft className="h-4 w-4" />
              <span>Responder</span>
            </motion.button>
          )}
        </div>

        {/* Expandable Inline Reply Form */}
        <AnimatePresence>
          {isReplying && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onSubmit={handleCreateReply}
              className="overflow-hidden space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Respondiendo a {reply.authorName}</span>
                <button
                  type="button"
                  onClick={() => setReplyingToId && setReplyingToId(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <MiniForumEditor
                value={inlineReply}
                onChange={setInlineReply}
                placeholder={`Escribe tu respuesta a ${reply.authorName}...`}
                minHeight="90px"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingToId && setReplyingToId(null)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReply || !inlineReply.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 text-xs font-bold text-white shadow border-none cursor-pointer"
                >
                  {submittingReply ? 'Publicando...' : 'Publicar respuesta'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Recursive rendering of nested children */}
      {childReplies.length > 0 && (
        <div className="space-y-3 mt-3">
          {childReplies.map(child => (
            <ForumReplyCard
              key={child.id}
              reply={child}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              allReplies={allReplies}
              level={level + 1}
              onLike={onLike}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              isEditing={isEditing}
              editContent={editContent}
              setEditContent={setEditContent}
              onDelete={onDelete}
              onVerify={onVerify}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onSubmitReply={onSubmitReply}
              allowNestedReplies={allowNestedReplies}
              isThreadLocked={isThreadLocked}
            />
          ))}
        </div>
      )}
    </div>
  )
}
