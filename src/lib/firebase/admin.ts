import * as admin from 'firebase-admin';

// Evita la reinicialización en entornos de desarrollo con "hot-reloading"
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Reemplaza caracteres de escape en la clave privada
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

// Exporta la instancia de admin como exportación por defecto
export default admin;