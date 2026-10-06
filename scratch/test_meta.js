function parseMetadataFromNotes(notes, defaultSede = 'Sede Principal', defaultMod = 'Tradicional') {
  if (!notes) return { sede: defaultSede, modalidad: defaultMod };
  const sedeMatch = notes.match(/\[Sede:\s*([^|\]]+)/i);
  const modMatch = notes.match(/Modalidad:\s*([^\]]+)\]/i);
  return {
    sede: sedeMatch ? sedeMatch[1].trim() : defaultSede,
    modalidad: modMatch ? modMatch[1].trim() : defaultMod
  };
}

function buildNotesWithMetadata(existingNotes, sede, modalidad) {
  const cleanExisting = (existingNotes || '').replace(/\[Sede:[^\]]+\]/g, '').trim();
  const metaTag = `[Sede: ${sede || 'Sede Principal'} | Modalidad: ${modalidad || 'Tradicional'}]`;
  return cleanExisting ? `${metaTag} ${cleanExisting}` : metaTag;
}

const tag = buildNotesWithMetadata('Estudiante transferido', 'Sede San José', 'Escuela Nueva');
console.log('Formatted notes:', tag);
console.log('Parsed back:', parseMetadataFromNotes(tag));
