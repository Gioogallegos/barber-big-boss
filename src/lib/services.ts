// Catalogo de servicios de la barberia.
//
// Separar los datos del JSX permite:
//   - agregar un servicio sin tocar el componente
//   - que la vista de contabilidad del admin lea la MISMA lista
//   - tener un solo lugar donde vive la verdad de precios y nombres
//
// FUENTE: la lista que mando Daniel el 2026-11-14. Los textos van
// TAL CUAL los escribio el. Donde el puso "FALTA", aca va vacio: un
// campo vacio dice la verdad ("todavia no lo tenemos") y un texto
// inventado por nosotros no.
//
// Las fotos fueron verificadas una por una contra su servicio.

export type Service = {
  /** Identificador estable y UNICO. Si algun dia se guarda en Firestore,
   *  NO cambiarlo: las citas viejas quedarian apuntando a un id que ya
   *  no existe y la contabilidad historica se rompe. */
  id: string;

  /** Nombre visible, como lo escribe Daniel. Este SI puede cambiar
   *  cuando el quiera, porque nada depende de el. Por eso los archivos
   *  de fotos llevan el id y no el nombre. */
  name: string;

  /** En pesos, sin puntos ni simbolo. El formato se aplica al mostrar. */
  price: number;

  /**
   * Duracion real en MINUTOS. Opcional: Daniel todavia no mando la de
   * Perfilado de cejas.
   *
   * Dos decisiones a proposito:
   *
   * 1. Minutos, no "bloques de agenda". Cuantos bloques ocupa un
   *    servicio depende de cuanto dure un bloque, y eso es una decision
   *    de la agenda que todavia no esta tomada. Los minutos son un
   *    hecho del negocio; los bloques son una politica que puede
   *    cambiar sin que este archivo se entere.
   *
   * 2. Numero, no texto. "3 horas y media" no se puede sumar, y
   *    parsearlo con una expresion regular se rompe el dia que alguien
   *    escriba "3 hrs" o "3:30". El texto visible se deriva con
   *    formatDuration(), nunca al reves.
   */
  durationMinutes?: number;

  /** Lo que Daniel puso en "INCLUYE", separado por el "+" que el usa.
   *  Vacio si no lo mando. Se muestra como lista al expandir: en un
   *  celular se lee mucho mejor que enterrado en el parrafo. */
  incluye: string[];

  /** El texto de "DESCRIPCION", tal cual. Opcional: si Daniel no lo
   *  mando, la fila se expande igual y muestra solo lo que hay. */
  description?: string;

  /** Archivos dentro de /public. Opcional.
   *
   *  Los nombres van en minuscula, sin espacios ni tildes. Vercel corre
   *  sobre Linux, que distingue mayusculas; Windows no. Una foto mal
   *  nombrada funciona en localhost y da 404 en produccion. */
  photos?: string[];
  addon?: boolean;
};

// ---------------------------------------------------------------------
// ORDEN DE LA LISTA
// ---------------------------------------------------------------------
// Primero los servicios completos (descripcion + fotos), despues los
// que les falta algo. Un servicio sin foto ni descripcion arriba de
// todo hace que el catalogo entero se vea a medio hacer.
//
// PENDIENTE de Daniel:
//   Perfilado de cejas -> duracion, incluye, descripcion y fotos
//   Disenos            -> incluye y descripcion
//   Barba              -> fotos
//   Bloque de color    -> solo tiene 1 foto
//   Global fantasia    -> solo tiene 1 foto
//
// NOTA: el "retoque cada 12 dias por 10000" vive dentro de la
// descripcion de Global Fantasia porque asi lo escribio Daniel. En
// algun momento conviene preguntarle si quiere que sea un servicio
// aparte: tiene nombre, precio y es recurrente, o sea ingreso
// predecible que la contabilidad podria mostrar por separado.
// ---------------------------------------------------------------------

export const SERVICES: Service[] = [
  {
    id: 'corte-pelo',
    name: 'Corte de pelo',
    price: 12000,
    durationMinutes: 60,
    incluye: ['Lavado capilar', 'Asesoría', 'Servicio de corte de pelo'],
    description:
      'El procedimiento comienza con un lavado capilar para preparar el ' +
      'cabello. Luego se realiza una asesoría o revisión de una ' +
      'referencia del cliente, seguida de la ejecución del corte según ' +
      'el estilo acordado.',
    photos: [
      'corte-pelo-1.png',
      'corte-pelo-2.png',
      'corte-pelo-3.png',
      'corte-pelo-4.png',
      'corte-pelo-5.png',
      'corte-pelo-6.png',
    ],
  },
  {
    id: 'disenos',
    name: 'Diseños',
    price: 2000,
    durationMinutes: 10,
    incluye: [], // FALTA
    // FALTA: descripcion
    photos: ['disenos-1.png', 'disenos-2.png', 'disenos-3.png'],
  },
  {
    id: 'bloque-de-color',
    name: 'Bloque de color',
    price: 35000,
    durationMinutes: 120,
    incluye: ['Bloque de color', 'Servicio de corte de pelo', 'Lavado capilar'],
    description:
      'El bloque de color es un servicio de coloración que crea un ' +
      'contraste definido y personalizado en el cabello mediante la ' +
      'aplicación de tonos sólidos en zonas estratégicas. Es ideal para ' +
      'quienes buscan un estilo moderno, atrevido y con identidad propia.',
    photos: ['bloque-de-color-1.png'],
  },
  {
    id: 'visos-platinados',
    name: 'Visos platinados',
    price: 60000,
    durationMinutes: 210,
    incluye: ['Visos platinados', 'Servicio de corte de pelo', 'Lavado capilar'],
    description:
      'Los visos platinados son un servicio de decoloración que busca ' +
      'lograr reflejos rubios fríos, luminosos y sofisticados, creando ' +
      'contraste y dimensión en el cabello. Son ideales para quienes ' +
      'buscan un estilo moderno, definido y con un acabado elegante. El ' +
      'servicio también incluye el corte de pelo.',
    photos: ['visos-platinados-1.png', 'visos-platinados-2.png'],
  },
  {
    id: 'global-fantasia',
    name: 'Global fantasía',
    price: 50000,
    durationMinutes: 150,
    incluye: ['Global fantasía', 'Servicio de corte de pelo', 'Lavado capilar'],
    description:
      'El global de fantasía es un servicio de coloración que transforma ' +
      'por completo el cabello mediante la aplicación de tonos vibrantes ' +
      'y creativos. Es ideal para quienes buscan un estilo único, audaz ' +
      'y lleno de personalidad, con un color que destaque y exprese su ' +
      'esencia. El servicio también incluye el corte de pelo. Para ' +
      'mantener el color, se recomienda realizar un retoque ' +
      'aproximadamente cada 12 días, con un valor adicional de 10000.',
    photos: ['global-fantasia-1.png'],
  },
  {
    id: 'global-platinado',
    name: 'Global platinado',
    price: 70000,
    durationMinutes: 240,
    incluye: ['Global platinado', 'Servicio de corte de pelo', 'Lavado capilar'],
    description:
      'El platinado global es un servicio de decoloración integral que ' +
      'busca alcanzar un tono rubio platinado uniforme, luminoso y ' +
      'sofisticado en todo el cabello. Es ideal para quienes buscan una ' +
      'transformación impactante, con un acabado moderno, limpio y lleno ' +
      'de estilo. El servicio también incluye el corte de pelo.',
    photos: ['global-platinado-1.png', 'global-platinado-2.png'],
  },

  // --- Desde aca, servicios a los que les falta informacion ---

  {
    id: 'barba',
    name: 'Barba',
    price: 5000,
    durationMinutes: 20,
    incluye: ['Servicio de barba', 'Asesoría'],
    description:
      'El procedimiento consiste en el perfilado de la barba y la ' +
      'definición de los rasgos del rostro. Se busca conseguir un ' +
      'resultado que proyecte de la mejor manera el perfil del cliente.',
    addon: true,
  },
  {
    id: 'cejas',
    name: 'Perfilado de cejas',
    price: 1000,
    // FALTA: duracion
    incluye: [], // FALTA
    // FALTA: descripcion
    addon: true,
  },
];

/** El corte base. Mientras sea el unico servicio reservable,
 *  el sistema de reservas toma su precio de aqui.
 *  Lo buscamos por id y no por posicion: el orden del array es
 *  presentacion (en que orden se ven las filas) y puede cambiar. */
const corteBase = SERVICES.find((s) => s.id === 'corte-pelo');
if (!corteBase) {
  throw new Error("services.ts: falta el servicio con id 'corte-pelo'");
}
export const CORTE_DE_PELO = corteBase;

/** 12000 -> "$12.000" */
export const formatPrice = (clp: number) => `$${clp.toLocaleString('es-CL')}`;

/**
 * 60 -> "1 hora" | 210 -> "3 h 30 min" | 10 -> "10 minutos"
 *
 * Esta es la UNICA fuente del texto de duracion. Si manana Daniel
 * quiere que diga "3.5 hrs", se cambia aca y cambia en toda la app.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;

  const horas = Math.floor(minutes / 60);
  const resto = minutes % 60;

  if (resto === 0) return horas === 1 ? '1 hora' : `${horas} horas`;
  return `${horas} h ${resto} min`;
}
