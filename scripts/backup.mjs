// Respaldo de la coleccion `appointments` a un archivo JSON local.
//
// USO:
//   pnpm backup        -> respalda desarrollo (lee .env.local)
//   pnpm backup:prod   -> respalda produccion (lee .env.prod)
//
// POR QUE EXISTE:
// Firestore en plan Spark (gratis) no incluye respaldos automaticos ni
// recuperacion a un punto en el tiempo. Si alguien borra la coleccion
// -un atacante, un bug, o el propio barbero sin querer- no hay forma
// de recuperarla. Este script es la red de seguridad.
//
// NO necesita autenticacion: las reglas permiten `allow read: if true`
// sobre appointments. Si algun dia eso cambia (ver el TODO de
// firestore.rules sobre privacidad), habra que autenticar aqui tambien.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const COLECCION = 'appointments';
const CARPETA_SALIDA = 'backups';

const VARIABLES_REQUERIDAS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
];

function leerConfig() {
  const faltantes = VARIABLES_REQUERIDAS.filter((v) => !process.env[v]);

  if (faltantes.length > 0) {
    console.error('\nERROR: faltan variables de entorno:');
    faltantes.forEach((v) => console.error(`  - ${v}`));
    console.error('\nRecuerda pasar el archivo de entorno:');
    console.error('  node --env-file=.env.local scripts/backup.mjs');
    console.error('  node --env-file=.env.prod  scripts/backup.mjs\n');
    process.exit(1);
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Fecha y hora local en formato apto para nombre de archivo: 2026-10-12_1435
function marcaDeTiempo() {
  const ahora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}` +
    `_${p(ahora.getHours())}${p(ahora.getMinutes())}`
  );
}

async function main() {
  const config = leerConfig();

  console.log(`\nRespaldando proyecto: ${config.projectId}`);
  console.log(`Coleccion: ${COLECCION}`);

  const app = initializeApp(config);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, COLECCION));

  const documentos = snapshot.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));

  if (documentos.length === 0) {
    console.warn('\nAVISO: la coleccion esta vacia. Se guarda igual,');
    console.warn('pero revisa que el proyecto sea el correcto.\n');
  }

  const respaldo = {
    proyecto: config.projectId,
    coleccion: COLECCION,
    fecha: new Date().toISOString(),
    totalDocumentos: documentos.length,
    documentos,
  };

  await mkdir(CARPETA_SALIDA, { recursive: true });

  const nombreArchivo = `${config.projectId}-${COLECCION}-${marcaDeTiempo()}.json`;
  const ruta = join(CARPETA_SALIDA, nombreArchivo);

  await writeFile(ruta, JSON.stringify(respaldo, null, 2), 'utf8');

  console.log(`\nOK: ${documentos.length} documentos guardados`);
  console.log(`Archivo: ${ruta}\n`);

  // Firestore mantiene la conexion abierta; sin esto el proceso no termina.
  await terminate(db);
}

main().catch((error) => {
  console.error('\nFALLO EL RESPALDO:');
  console.error(error);
  process.exit(1);
});
