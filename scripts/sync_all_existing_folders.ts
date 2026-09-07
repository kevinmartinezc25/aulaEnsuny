import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

interface FolderRecord {
  id: string
  name: string
  parent_id: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function syncAllFolders() {
  const gasUrl = process.env.GOOGLE_DRIVE_GAS_URL
  const token = process.env.GOOGLE_DRIVE_SECURITY_TOKEN
  const rootDocsFolderId = process.env.GOOGLE_DRIVE_DOCS_FOLDER_ID || '1tRgiAtNrxMlirnX5xenRUsX8CFsJMLfO'

  if (!gasUrl || !token) {
    console.error('Faltan variables de entorno GOOGLE_DRIVE_GAS_URL o GOOGLE_DRIVE_SECURITY_TOKEN')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('====================================================')
  console.log('SINCRONIZACIÓN JERÁRQUICA DE CARPETAS CON DRIVE')
  console.log(`Raíz del Portal en Drive: ${rootDocsFolderId}`)
  console.log('====================================================\n')

  const { data: allFolders, error } = await supabase
    .from('doc_folders')
    .select('id, name, parent_id, drive_folder_id, drive_folder_url')
    .order('created_at', { ascending: true })

  if (error || !allFolders) {
    console.error('Error al obtener carpetas de Supabase:', error)
    process.exit(1)
  }

  const driveMap = new Map<string, string>()
  const nameMap = new Map<string, string>()

  allFolders.forEach(f => {
    nameMap.set(f.id, f.name)
    if (f.drive_folder_id) {
      driveMap.set(f.id, f.drive_folder_id)
      console.log(`[YA SINCRONIZADA] "${f.name}" -> ${f.drive_folder_id}`)
    }
  })

  let pending = allFolders.filter(f => !f.drive_folder_id)
  console.log(`\nTotal pendientes por sincronizar: ${pending.length} carpetas.\n`)

  async function createInDrive(folderName: string, parentDriveId: string) {
    const payload = JSON.stringify({
      token,
      action: 'createFolder',
      context: 'docs',
      folderName,
      parentFolderId: parentDriveId,
      docsFolderId: rootDocsFolderId
    })

    const res = await fetch(gasUrl!, {
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
      throw new Error(`Respuesta no es JSON: ${text.substring(0, 200)}`)
    }

    if (!data.success || !data.folderId) {
      throw new Error(data.error || 'Sin identificador retornado')
    }

    return {
      folderId: data.folderId as string,
      folderUrl: (data.folderUrl as string) || `https://drive.google.com/drive/folders/${data.folderId}`
    }
  }

  let level = 1
  let totalSuccess = 0
  let totalErrors = 0

  while (pending.length > 0 && level <= 10) {
    console.log(`--- Procesando Nivel ${level} (${pending.length} carpetas restantes) ---`)

    const ready: FolderRecord[] = []
    const notReady: FolderRecord[] = []

    for (const f of pending) {
      if (!f.parent_id || driveMap.has(f.parent_id)) {
        ready.push(f)
      } else {
        notReady.push(f)
      }
    }

    if (ready.length === 0) {
      console.warn('Advertencia: No se detectaron dependencias directas resueltas. Procesando con raíz por defecto.')
      ready.push(...notReady)
      notReady.length = 0
    }

    for (const folder of ready) {
      const parentDriveId = folder.parent_id ? driveMap.get(folder.parent_id) : rootDocsFolderId
      const parentName = folder.parent_id ? (nameMap.get(folder.parent_id) || 'Carpeta padre') : 'RAÍZ DEL PORTAL'

      process.stdout.write(`Creando "${folder.name}" en [${parentName}]... `)

      try {
        const driveResult = await createInDrive(folder.name, parentDriveId || rootDocsFolderId)
        
        // Guardar en Supabase
        const { error: updateErr } = await supabase
          .from('doc_folders')
          .update({
            drive_folder_id: driveResult.folderId,
            drive_folder_url: driveResult.folderUrl
          })
          .eq('id', folder.id)

        if (updateErr) {
          console.log(`❌ Error al actualizar en Supabase: ${updateErr.message}`)
          totalErrors++
        } else {
          driveMap.set(folder.id, driveResult.folderId)
          console.log(`✅ OK (${driveResult.folderId})`)
          totalSuccess++
        }
      } catch (err: any) {
        console.log(`❌ Falló en Drive: ${err.message}`)
        totalErrors++
      }

      // Pequeña pausa para no saturar rate limits de Google Apps Script
      await sleep(400)
    }

    pending = notReady
    level++
  }

  console.log('\n====================================================')
  console.log('RESUMEN DE SINCRONIZACIÓN')
  console.log(`✅ Carpetas sincronizadas con éxito: ${totalSuccess}`)
  console.log(`❌ Errores: ${totalErrors}`)
  console.log(`Total sincronizadas en Drive: ${driveMap.size} de ${allFolders.length}`)
  console.log('====================================================')
}

syncAllFolders()
