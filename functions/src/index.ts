/* eslint-disable max-len */
import * as logger from "firebase-functions/logger";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as crypto from "crypto";
import {
  onDocumentCreated,
  FirestoreEvent,
} from "firebase-functions/v2/firestore";
import {QueryDocumentSnapshot} from "firebase-admin/firestore";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

interface SetCustomUserClaimsData {
  userId: string;
  role: "admin" | "journalist" | "user";
}

interface SetCustomUserClaimsResult {
  success: boolean;
  message: string;
  error?: string;
}

export const setCustomUserClaims = onCall<
  SetCustomUserClaimsData,
  Promise<SetCustomUserClaimsResult>
>(async (request) => {
  logger.info("setCustomUserClaims called with data:", request.data);

  if (!request.auth || request.auth.token.role !== "admin") {
    logger.error("Permission denied.", {auth: request.auth});
    throw new HttpsError(
      "permission-denied",
      "You must be an admin to perform this action."
    );
  }

  const {userId, role} = request.data;

  if (!userId || !role) {
    logger.error("Missing userId or role in request data.");
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with 'userId' and 'role' arguments."
    );
  }

  const validRoles: Array<SetCustomUserClaimsData["role"]> = [
    "admin",
    "journalist",
    "user",
  ];
  if (!validRoles.includes(role)) {
    logger.error(`Invalid role: ${role}`);
    throw new HttpsError(
      "invalid-argument",
      `Invalid role specified. Must be one of: ${validRoles.join(", ")}.`
    );
  }

  try {
    await admin.auth().setCustomUserClaims(userId, {role});
    logger.info(`Successfully set custom claims for user ${userId} to ${role}.`);

    const userDocRef = db.collection("users").doc(userId);
    await userDocRef.set({role}, {merge: true});
    logger.info(`Successfully set/updated Firestore role for user ${userId} to ${role}.`);

    return {
      success: true,
      message: `Successfully set role '${role}' for user ${userId}.`,
    };
  } catch (error) {
    logger.error(`Error setting custom claims for user ${userId}:`, error);
    throw new HttpsError(
      "internal",
      `An error occurred: ${(error as Error).message || "Unknown error"}`
    );
  }
});

// Configuración del transportador SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "validaciones@tecnosalud.cloud",
    pass: "@V1g@1l250822",
  },
});

/**
 * Genera un token aleatorio para verificación de email.
 * @return {string} Token generado.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Envía un correo de verificación al usuario cuando se crea un documento en la colección 'users'.
 * @param {FirestoreEvent<QueryDocumentSnapshot | undefined, { userId: string }>} event - Evento de Firestore con los datos del usuario.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el correo ha sido enviado.
 */
export const sendVerificationEmail = onDocumentCreated(
  {document: "users/{userId}"},
  async (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, { userId: string }>
  ): Promise<void> => {
    const snap = event.data;
    if (!snap || !snap.exists) return;

    const user = snap.data();
    if (!user || !user.email || !user.displayName) return;

    const token = generateToken();
    await snap.ref.update({
      emailVerificationToken: token,
      emailVerified: false,
    });

    const verifyUrl =
      `https://surco.vercel.app/verify-email?token=${token}` +
      `&uid=${event.params.userId}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #eee;padding:32px;border-radius:12px;">
        <h2 style="color:#222;">¡Bienvenido/a, ${user.displayName}!</h2>
        <p>Gracias por registrarte en nuestro sitio. Para poder comentar y participar,
        por favor verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#fec900;color:#222;
          text-decoration:none;padding:14px 32px;border-radius:8px;
          font-weight:bold;font-size:16px;display:inline-block;">
            Verificar mi correo
          </a>
        </div>
        <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        <hr style="margin:32px 0;">
        <p style="font-size:12px;color:#888;">
          Este correo fue enviado automáticamente. No respondas a este mensaje.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: "\"Validaciones\" <validaciones@tecnosalud.cloud>",
      to: user.email,
      subject: "Verifica tu correo electrónico",
      html,
    });
  }
);

