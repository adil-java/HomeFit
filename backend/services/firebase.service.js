import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";

import serviceAccount  from "../utils/firebaseAdmin.js";

class FirebaseServices {
  static instance;

  constructor() {
    if (FirebaseServices.instance) {
      return FirebaseServices.instance;
    }

    this.app = initializeApp({
      credential: cert(serviceAccount),
    });

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
      const decoded = await this.auth.verifyIdToken(idToken);
      const user = await this.auth.getUser(decoded.uid);
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
      };
    } catch (error) {
      console.error("Error verifying token:", error);
      throw error;
    }
  }
}

export default new FirebaseServices();

