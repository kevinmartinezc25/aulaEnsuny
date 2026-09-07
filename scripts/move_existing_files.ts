import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function moveExistingFiles() {
  const gasUrl = process.env.GOOGLE_DRIVE_GAS_URL
  const token = process.env.GOOGLE_DRIVE_SECURITY_TOKEN

  if (!gasUrl || !token) {
    console.error('Faltan variables de entorno GOOGLE_DRIVE_GAS_URL o GOOGLE_DRIVE_SECURITY_TOKEN')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('====================================================')
  console.log('REUBICACIÓN DE ARCHIVOS EXISTENTES EN GOOGLE DRIVE')
  console.log('====================================================\n')

  const { data: docs, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      drive_file_id,
      folder_id,
      doc_folders(id, name, drive_folder_id)
    `)
    .not('drive_file_id', 'is', null)
    .not('folder_id', 'is', null)

  if (error || !docs) {
    console.error('Error al obtener documentos:', error)
    process.exit(1)
  }

  console.log(`Documentos a reubicar: ${docs.length}\n`)

  let successCount = 0
  let errorCount = 0

  for (const doc of docs) {
    const folder = (doc as any).doc_folders
    if (!folder?.drive_folder_id) {
      console.log(`⚠️ Documento "${doc.title}" no tiene drive_folder_id asociado a su carpeta. Se omite.`)
      continue
    }

    process.stdout.write(`Moviendo "${doc.title.slice(0, 40)}..." -> [${folder.name}]... `)

    try {
      const payload = JSON.stringify({
        token,
        action: 'moveFile',
        fileId: doc.drive_file_id,
        targetFolderId: folder.drive_folder_id
      })

      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        redirect: 'follow'
      })

      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Respuesta no es JSON: ${text.substring(0, 150)}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Error reportado por Apps Script')
      }

      console.log(`✅ OK`)
      successCount++
    } catch (err: any) {
      console.log(`❌ Falló: ${err.message}`)
      errorCount++
    }

    await new Promise(r => setTimeout(r, 400))
  }

  console.log('\n====================================================')
  console.log(`Archivos movidos con éxito: ${successCount}`)
  console.log(`Errores: ${errorCount}`)
  console.log('====================================================')
}

moveExistingFiles()
