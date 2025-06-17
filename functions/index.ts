
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Callable function to set custom user claims (role).
 *
 * This function expects 'uid' and 'role' in the data payload.
 * The caller must be authenticated and have an 'admin' custom claim.
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  // Check if the authenticated user is an admin
  const callerRole = context.auth.token.role;
  if (callerRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Permission denied. Only admins can set user roles."
    );
  }

  const { uid, role } = data;

  // Validate input data
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'uid' (string) argument."
    );
  }

  const validRoles = ["admin", "journalist", "user"];
  if (!role || typeof role !== "string" || !validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `The function must be called with a valid 'role' argument (${validRoles.join(", ")}).`
    );
  }

  try {
    // Set custom claims for the target user
    await admin.auth().setCustomUserClaims(uid, { role: role });

    // Optionally, you might want to update the user's profile in Firestore here as well
    // to ensure consistency, though the current app structure updates Firestore separately.
    // Example: await admin.firestore().collection('users').doc(uid).update({ role: role });

    functions.logger.info(`Successfully set role '${role}' for user ${uid} by admin ${context.auth.uid}`);
    return {
      message: `Success! User ${uid} has been assigned the role of ${role}.`,
      uid: uid,
      newRole: role,
    };
  } catch (error: any) {
    functions.logger.error(`Error setting custom claims for user ${uid}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      "An internal error occurred while trying to set custom claims.",
      error.message
    );
  }
});

// You can add more Cloud Functions here as needed.
