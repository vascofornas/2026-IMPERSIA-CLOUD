export const AXES = [
  {
    id: "personal",
    name: "Vida personal",
    modules: [
      {
        id: "agenda",
        label: "Agenda",
        blurb: "Citas, cumpleaños, ocio y recordatorios. Médicas, familiares y planes de ocio llevan detalle propio.",
        examples: [
          ["Cine el viernes a las 21", "con amigos"],
          ["Partido de tenis", "sábado por la mañana"],
        ],
      },
      {
        id: "casa",
        label: "Casa",
        blurb: "Compra, mantenimiento y suministros.",
        examples: [
          ["Comprar leche", ""],
          ["Cambiar el filtro del aire", ""],
        ],
      },
      {
        id: "habitos",
        label: "Hábitos",
        blurb: "Rutinas, ejercicio, lectura, sueño.",
        examples: [
          ["Caminar 30 minutos", "cada día"],
          ["Lectura antes de dormir", ""],
        ],
      },
      {
        id: "viajes",
        label: "Viajes",
        blurb: "Vuelos, hoteles, itinerario, equipaje y presupuesto.",
        examples: [
          ["Lisboa, 20 al 24 de octubre", "vuelo y hotel"],
          ["Lista de equipaje", ""],
        ],
      },
      {
        id: "diario",
        label: "Diario",
        blurb: "Lo que ha pasado, el ánimo y la nota del día.",
        examples: [
          ["He dormido mal", "hoy"],
          ["El cielo estaba gris esta mañana", ""],
        ],
      },
      {
        id: "deseos",
        label: "Deseos",
        blurb: "Cosas, lugares, libros y restaurantes pendientes.",
        examples: [
          ["Cenar en ese restaurante de Lisboa", ""],
          ["El libro que anoté", ""],
        ],
      },
    ],
  },
  {
    id: "professional",
    name: "Profesional",
    modules: [
      {
        id: "proyectos",
        label: "Proyectos",
        blurb: "Trabajos con partes, hitos y entregas.",
        examples: [
          ["Capenergy 2026", "proyecto"],
          ["Foros de la web26", "parte de Capenergy"],
        ],
      },
      {
        id: "reuniones",
        label: "Reuniones",
        blurb: "Citas de trabajo, llamadas y lo que quedó dicho.",
        examples: [
          ["Llamada con el proveedor", "martes, 11:00"],
          ["Acta: decidir el alcance de Foros", ""],
        ],
      },
      {
        id: "memoria",
        label: "Segunda memoria",
        blurb: "Lo que quieres poder recuperar: lecturas, guías, apuntes.",
        examples: [
          ["Nota sobre búsqueda semántica", ""],
          ["Resumen del artículo de ayer", ""],
        ],
      },
      {
        id: "ideas",
        label: "Ideas",
        blurb: "Borradores, propuestas y lo que aún no es un proyecto.",
        examples: [
          ["Impersia: todo entra por Entrada", ""],
          ["Una guía corta para el primer usuario", ""],
        ],
      },
    ],
  },
  {
    id: "social",
    name: "Social",
    modules: [
      {
        id: "muro",
        label: "Muro",
        blurb: "Lo que podrías publicar: un avance, una lectura, un hito. Sigue en privado.",
        examples: [
          ["Avance de Impersia", "privado"],
          ["Lectura terminada", "privado"],
        ],
      },
      {
        id: "listas",
        label: "Listas",
        blurb: "Un itinerario o una lista que más adelante se puede compartir.",
        examples: [
          ["Itinerario de Lisboa", "sin compartir"],
          ["Lista de regalos", "sin compartir"],
        ],
      },
      {
        id: "circulos",
        label: "Círculos",
        blurb: "Un grupo pequeño para un hábito o un reto.",
        examples: [
          ["Caminar con Ana y Luis", ""],
          ["Reto de lectura de octubre", ""],
        ],
      },
      {
        id: "espacios",
        label: "Espacios",
        blurb: "Algo que organizas con otra persona: un viaje, una boda, un trabajo.",
        examples: [
          ["Lisboa con acompañante", ""],
          ["Capenergy, decisiones con el equipo", ""],
        ],
      },
    ],
  },
];

export function findModule(id) {
  for (const axis of AXES) {
    const found = axis.modules.find((mod) => mod.id === id);
    if (found) return { ...found, axis: axis.name, axisId: axis.id };
  }
  return null;
}

export function labelOf(id) {
  return findModule(id)?.label || id;
}
