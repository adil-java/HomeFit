import admin from "firebase-admin";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account key
const serviceAccount = JSON.parse(
  readFileSync(`${__dirname}/serviceAccountKey.json`, "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
