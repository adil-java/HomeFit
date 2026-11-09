import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";

import serviceAccount  from "../utils/firebaseAdmin.js";
import logger from '../utils/logger.js';

class FirebaseServices {
  static instance;

  constructor() {
    if (FirebaseServices.instance) {
      return FirebaseServices.instance;
    }

    logger.debug('[Firebase Service DEBUG] Initializing Firebase Admin SDK');
    logger.debug('[Firebase Service DEBUG] Project ID:', serviceAccount?.project_id);
    logger.debug('[Firebase Service DEBUG] Client Email:', serviceAccount?.client_email);
    
    this.app = initializeApp({
      credential: cert(serviceAccount),
    });
    
    logger.debug('[Firebase Service DEBUG] Firebase Admin SDK initialized successfully');

    this.messaging = getMessaging(this.app);
    this.auth = getAuth(this.app);

    FirebaseServices.instance = this;

    this.getUserById = async (userId) => {
      return this.auth.getUser(userId);
    };

    this.listUsers = async () => {
      const users = [];
      let listUsersResult = await this.auth.listUsers();
      do {
        users.push(...listUsersResult.users);
        listUsersResult = await listUsersResult.nextPage();
      } while (listUsersResult.pageToken);
      return users;
    };
    this.sendPushNotification = async (title, body, token) => {
      const message = {
        notification: {
          title: title,
          body: body,
        },
        token: token,
      };
      return this.messaging.send(message);
    };
  }

  
  async verifyToken(idToken) {
    try {
      logger.debug('[Firebase DEBUG] verifyToken called');
      logger.debug('[Firebase DEBUG] Token (first 50 chars):', idToken?.substring(0, 50) + '...');
      logger.debug('[Firebase DEBUG] Project ID from service account:', process.env.FIREBASE_PROJECT_ID);
      
      const decoded = await this.auth.verifyIdToken(idToken);
      logger.debug('[Firebase DEBUG] Token decoded successfully, UID:', decoded.uid);
      
      const user = await this.auth.getUser(decoded.uid);
      logger.debug('[Firebase DEBUG] User fetched from Firebase:', user.uid, user.email);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
      };
    } catch (error) {
      logger.error("[Firebase DEBUG] Error verifying token:", error.code, error.message);
      logger.error("[Firebase DEBUG] Full error:", error);
      throw error;
    }
  }
}

export default new FirebaseServices();

