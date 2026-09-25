import React from 'react'
import { NovedadesImportView } from './components/NovedadesImportView'

import { getScheduleEntitiesAction } from '../import/importActions'

export const metadata = {
  title: 'Horario Novedades - aulaEnsuny',
}

export default async function SubstitutionsPage() {
  const initialEntities = await getScheduleEntitiesAction()

  return <NovedadesImportView 
    initialTeachers={initialEntities.teachers || []} 
    initialGroups={initialEntities.groups || []} 
  />
}
