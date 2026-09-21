import fs from 'fs'

const data = `No;Apellidos y Nombres;Asignatura;6°-1;6°-2;7°-1;7°-2;8°-1;8°-2;9°-1;9°-2;10°-1;10°-2;11°-1;11°-2;Nivelatorio;PFC-12;PFC-13
1;Manuel Naspiran;Proyecto de Vida;;;;;;;;;;;;;2;;;2
1;Manuel Naspiran;Comité De Investigación;;;;;;;;;;;;;;;;1
1;Manuel Naspiran;Urbanidad y Cívica ;;;;;;;;1;;;;;;;;1
1;Manuel Naspiran;Investigación ;;;;;;;;;;;;;;5;5
1;Manuel Naspiran;Ética y Valores ;;;;;;;;2;1;1;1;1
1;Manuel Naspiran;Didáctica de Ética y Valores;;;;;;;;;;;;;;;2;2
2;Daniela Patiño;Economía y Política ;;;;;;;;;2;2;;;;;;4
2;Daniela Patiño;Sociales ;3;3;;;;;3;3;1;1;1;1
2;Daniela Patiño;Psicología  del desarrollo;;;;;;;;;;;;;;2;;2
3;Julio Tolosa;Matemáticas ;;;;;4;4;4;4
3;Julio Tolosa;Emprendimiento;;;;;1;1
3;Julio Tolosa;Artística ;;2;;2
4;Diego Guerrero;Legislación Educativa;;;;;;;;;;;;;;2;;2
4;Diego Guerrero;Gestión Educativa;;;;;;;;;;;;;;;4;4
4;Diego Guerrero;Tecnología e Informática ;2;2;2;2;2;2;2;2
5;Camilo Idarraga;Didáctica de las Ciencias Naturales;;;;;;;;;;;;;;4;;4
5;Camilo Idarraga;Semillero de Investigación;;;;;;;;;;;;;;;;2
5;Camilo Idarraga;Química ;;;;;;;;;3;3;3;3
5;Camilo Idarraga;Ingles ;2;2
6;Julian Velilla;Didáctica de la Religión ;;;;;;;;;;;;;;;2;2
6;Julian Velilla;Filosofía ;;;;;;;;;2;2;2;2
6;Julian Velilla;Religión ;2;2;2;2;;;;;1;1
6;Julian Velilla;Comité De Investigación;;;;;;;;;;;;;;;;1
6;Julian Velilla;Urbanidad y Cívica ;;1
7;Gloria Patricia Ruiz;Ciencias Naturales ;;;;;4;4;4;4
7;Gloria Patricia Ruiz;Religión ;;;;;;;2;2;;;1;1
8;Elkin Mejia Valencia;Comité De Investigación;;;;;;;;;;;;;;;;1
8;Elkin Mejia Valencia;Español;;;;;4;4;4;4
8;Elkin Mejia Valencia;Formación Humana II;;;;;;;;;;;;;;2;;2
8;Elkin Mejia Valencia;Urbanidad y Cívica ;;;;;;;1
8;Elkin Mejia Valencia;Seminario de Proyecto Pedagógico ;;;;;;;1;1
9;Franci Zuleta;Evaluacion Escolar;;;;;;;;;;;;;;;2;2
9;Franci Zuleta;Modelos Pedagógicos;;;;;;;;;;;;;;;2;2
9;Franci Zuleta;Artística ;;;;;2;2;2;2;2;2;2;2
9;Franci Zuleta;Educación Física ;2
10;Gloria Cecilia Patiño;Religión ;;;;;2;2
10;Gloria Cecilia Patiño;Seminario de Investigación;;;;;;;;;;;2;2;;;;4
10;Gloria Cecilia Patiño;Lineamientos Curriculares Preescolar;;;;;;;;;;;;;;;4;4
10;Gloria Cecilia Patiño;Fundamentación Pedagógica;;;;;;;;;2;2;2;2;2
11;Edwin Tamayo;Educación Física ;;2;2;2;2;2;2;2;2;2;2;2
12;Doralba Cadavid;Español;5;5;5;5
12;Doralba Cadavid;Ética y Valores ;;;;2
13;Sandra Patiño Agudelo;Practicas Pedagógicas ;;;;;;;;;2;2
13;Sandra Patiño Agudelo;Didáctica General ;;;;;;;;;2;2
13;Sandra Patiño Agudelo;Proyecto pedagógico Investigativo ;;;;;;;;;;;;;4;;;4
13;Sandra Patiño Agudelo;Artística ;;;2
13;Sandra Patiño Agudelo;Emprendimiento;1;1;1;1
13;Sandra Patiño Agudelo;Seminario de Investigación;;;;;;;;;2;2
14;Ana Cecilia González;Proc. Logic-Matemáticos;;;;;;;;;;;;4;;;4
14;Ana Cecilia González;Matemáticas ;4;4;4;4
14;Ana Cecilia González;Artística ;2
15;Luz Mery Querubín;Coord. Práctica;;;;;;;;;;;;;;3;3;6
15;Luz Mery Querubín;Población Vulnerable;;;;;;;;;;;;;;;4;4
15;Luz Mery Querubín;Didáctica General ;;;;;;;;;;;2;2;2
15;Luz Mery Querubín;Modelos Flexibles I;;;;;;;;;;;;;;2;;2
15;Luz Mery Querubín;Practicas Pedagógicas ;;;;;;;;;;;2;2
16;Edilber Rentería;Didáctica de Ingles ;;;;;;;;;;;;;;2;;2
16;Edilber Rentería;Ingles ;;;2;2;2;2;2;2;2;2;2;2
17;Esteban Aristizábal;Pedagogía  e Historia - educación;;;;;;;;;;;;;;2;;2
17;Esteban Aristizábal;Ética y Valores ;;;;;;;2
17;Esteban Aristizábal;Español;;;;;;;;;3;3;3;3
17;Esteban Aristizábal;Seminario de lect y Esc Ped;;;;;1;1
17;Esteban Aristizábal;Habilidades Comunicativas;;;;;;;;;;;;;4;;;4
18;Victor Manuel Alvarez Aguirre;Comité De Investigación;;;;;;;;;;;;;;;;1
18;Victor Manuel Alvarez Aguirre;Sociales ;;;3;3;3;3
18;Victor Manuel Alvarez Aguirre;Didáctica de las Ciencias Sociales ;;;;;;;;;;;;;;4;;4
18;Victor Manuel Alvarez Aguirre;Economía y Política ;;;;;;;;;;;2;2
18;Victor Manuel Alvarez Aguirre;Urbanidad y Cívica ;1
19;Luz Gicela Gonzalez Acevedo;Ciencias Naturales ;4;4;4;4
19;Luz Gicela Gonzalez Acevedo;Ética y Valores ;2;2;2
20;Laura Cordoba;Matemáticas ;;;;;;;;;3;3;3;3
20;Laura Cordoba;Emprendimiento;;;;;;;1;1
20;Laura Cordoba;Emprendimiento -Urb Civic;;;;;;;;;1;1;1;1
20;Laura Cordoba;Ética y Valores ;;;;;2;2
21;Kevin Martínez;Urbanidad y Cívica ;;;1;1;1;1
21;Kevin Martínez;Tecnología e Informática ;;;;;;;;;2;2;2;2
21;Kevin Martínez;Física Matemáticas ;;;;;;;;;2;2;2;2
21;Kevin Martínez;Comité De Investigación;;;;;;;;;;;;;;;;2`

const lines = data.trim().split('\n')
const header = lines[0].split(';')

const groups = header.slice(3) // 6°-1, 6°-2, etc.

const teachers = new Set<string>()
const subjects = new Set<string>()

const groupMap: Record<string, string> = {}
groups.forEach((g, i) => { groupMap[g] = 'G' + i })

const teacherMap: Record<string, string> = {}
const subjectMap: Record<string, string> = {}

let tCounter = 1
let sCounter = 1

interface Lesson { id: string; teacherId: string; subjectId: string; groupId: string; hours: number }
const lessons: Lesson[] = []
let lCounter = 1

lines.slice(1).forEach(line => {
  const parts = line.split(';')
  const teacher = parts[1].trim()
  const subject = parts[2].trim()

  if (!teacherMap[teacher]) teacherMap[teacher] = 'T' + tCounter++
  if (!subjectMap[subject]) subjectMap[subject] = 'S' + sCounter++

  groups.forEach((g, i) => {
    const val = parts[3 + i]
    if (val && parseInt(val) > 0) {
      lessons.push({
        id: 'L' + lCounter++,
        teacherId: teacherMap[teacher],
        subjectId: subjectMap[subject],
        groupId: groupMap[g],
        hours: parseInt(val)
      })
    }
  })
})

const ascDays = ['10000', '01000', '00100', '00010', '00001']
let cCounter = 1
let cardsXml = ''

lessons.forEach(l => {
  for (let i = 0; i < l.hours; i++) {
    const day = ascDays[Math.floor(Math.random() * 5)]
    const period = Math.floor(Math.random() * 7) + 1
    cardsXml += `      <card lessonid="${l.id}" classroomids="" period="${period}" days="${day}"/>\n`
  }
})

let xml = `<?xml version="1.0" encoding="windows-1252"?>
<timetable>
   <periods>
      <period name="1" short="1" period="1" starttime="8:00" endtime="8:45"/>
      <period name="2" short="2" period="2" starttime="9:00" endtime="9:45"/>
      <period name="3" short="3" period="3" starttime="10:00" endtime="10:45"/>
      <period name="4" short="4" period="4" starttime="11:00" endtime="11:45"/>
      <period name="5" short="5" period="5" starttime="12:00" endtime="12:45"/>
      <period name="6" short="6" period="6" starttime="13:00" endtime="13:45"/>
      <period name="7" short="7" period="7" starttime="14:00" endtime="14:45"/>
   </periods>
   <daysdefs>
      <daysdef id="DB07EC40571DBDEC" name="Lunes" short="Lu" days="10000"/>
      <daysdef id="46356E02560B19D4" name="Martes" short="Ma" days="01000"/>
      <daysdef id="172C9202074662F7" name="Miercoles" short="Mi" days="00100"/>
      <daysdef id="267527FD78002C4B" name="Jueves" short="Ju" days="00010"/>
      <daysdef id="BC3CB88C66687C92" name="Viernes" short="Vi" days="00001"/>
   </daysdefs>
   <subjects>
${Object.entries(subjectMap).map(([name, id]) => `      <subject id="${id}" name="${name}" short="${name.substring(0,3)}"/>`).join('\n')}
   </subjects>
   <teachers>
${Object.entries(teacherMap).map(([name, id]) => `      <teacher id="${id}" name="${name}" short="${name.substring(0,2)}"/>`).join('\n')}
   </teachers>
   <classrooms>
      <classroom id="C1" name="Aula General" short="A1" />
   </classrooms>
   <classes>
${Object.entries(groupMap).map(([name, id]) => `      <class id="${id}" name="${name}" short="${name}"/>`).join('\n')}
   </classes>
   <groups>
${Object.entries(groupMap).map(([name, id]) => `      <group id="${id}_all" name="La clase entera" classid="${id}" entireclass="1" />`).join('\n')}
   </groups>
   <lessons>
${lessons.map(l => `      <lesson id="${l.id}" classids="${l.groupId}" subjectid="${l.subjectId}" periodspercard="1" periodsperweek="${l.hours}" teacherids="${l.teacherId}" groupids="${l.groupId}_all" />`).join('\n')}
   </lessons>
   <cards>
${cardsXml}
   </cards>
</timetable>
`

fs.writeFileSync('horario_demo_real.xml', xml)
console.log('Generado en horario_demo_real.xml')
