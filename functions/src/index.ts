
/**
 * Firebase Cloud Functions to manage user roles and custom claims.
 */
import * as logger from "firebase-functions/logger";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

interface SetCustomUserClaimsData {
  userId: string;
  role: "admin" | "journalist" | "user"; // Corrected role type
}

interface SetCustomUserClaimsResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Callable function to set custom claims for a user.
 * Requires the caller to be an admin.
 */
export const setCustomUserClaims = onCall<
  SetCustomUserClaimsData,
  Promise<SetCustomUserClaimsResult>
>(
  async (request) => {
    logger.info("setCustomUserClaims called with data:", request.data);

    // Check if the caller is authenticated and an admin
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
      // Set custom claims in Firebase Auth
      await admin.auth().setCustomUserClaims(userId, {role});
      logger.info(
        `Successfully set custom claims for user ${userId} to ${role}.`
      );

      // Update role in Firestore user profile, creating it if it doesn't exist
      const userDocRef = db.collection("users").doc(userId);
      await userDocRef.set({role}, {merge: true}); // Changed from update to set with merge
      logger.info(
        `Successfully set/updated Firestore role for user ${userId} to ${role}.`
      );

      return {
        success: true,
        message: `Successfully set role '${role}' for user ${userId}.`,
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error(`Error setting custom claims for user ${userId}:`, error);
      throw new HttpsError(
        "internal",
        `An error occurred: ${error.message || "Unknown error"}`
      );
    }
  }
);

/**
 * HTTP GET function to assign the 'admin' role to fabianmunozpuello@gmail.com.
 */
export const setFabianAdminRole = onRequest(async (request, response) => {
  logger.info("setFabianAdminRole HTTP function triggered.");

  if (request.method !== "GET") {
    logger.warn(`Method Not Allowed: ${request.method}`);
    response.status(405).send("Method Not Allowed. Please use GET.");
    return;
  }

  const targetEmail = "fabianmunozpuello@gmail.com";
  const roleToSet: SetCustomUserClaimsData["role"] = "admin";

  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const userId = userRecord.uid;
    logger.info(`Found user ${targetEmail} with UID: ${userId}.`);

    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, {role: roleToSet});
    logger.info(
      `Successfully set custom claims for user ${targetEmail} to ${roleToSet}.`
    );

    // Update role in Firestore, creating it if it doesn't exist
    const userDocRef = db.collection("users").doc(userId);
    await userDocRef.set({role: roleToSet}, {merge: true}); // Changed from update to set with merge
    logger.info(
      `Successfully set/updated role for user ${targetEmail} to ${roleToSet} in Firestore.`
    );

    response.status(200).send(
      `Successfully assigned role '${roleToSet}' to ${targetEmail}.`
    );
  } catch (caughtError: unknown) {
    logger.error(`Error processing request for ${targetEmail}:`, caughtError);

    let responseMessage = "An error occurred: Unknown error";
    let errorCode: string | undefined;

    if (typeof caughtError === "object" && caughtError !== null) {
      // eslint-disable-next-line max-len
      if ("code"in caughtError && typeof (caughtError as {code: unknown}).code === "string") {
        errorCode = (caughtError as {code: string}).code;
      }
      // eslint-disable-next-line max-len
      if ("message" in caughtError && typeof (caughtError as {message: unknown}).message === "string") {
        const errMessage = (caughtError as {message: string}).message;
        if (errMessage) {
          responseMessage = `An error occurred: ${errMessage}`;
        }
      }
    } else if (typeof caughtError === "string" && caughtError) {
      responseMessage = `An error occurred: ${caughtError}`;
    }

    if (errorCode === "auth/user-not-found") {
      response.status(404).send(
        `User with email ${targetEmail} not found.`
      );
    } else {
      response.status(500).send(responseMessage);
    }
  }
});

