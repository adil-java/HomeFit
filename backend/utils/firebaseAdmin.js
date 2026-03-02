console.log('[Firebase Admin DEBUG] Loading Firebase Admin credentials...');

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
const b64PrivateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64 || '';
const resolvedPrivateKey = rawPrivateKey
  ? rawPrivateKey.replace(/\\n/g, '\n')
  : (b64PrivateKey ? Buffer.from(b64PrivateKey, 'base64').toString('utf8') : undefined);

console.log('[Firebase Admin DEBUG] Raw private key present:', !!rawPrivateKey, 'length:', rawPrivateKey?.length);
console.log('[Firebase Admin DEBUG] Base64 private key present:', !!b64PrivateKey, 'length:', b64PrivateKey?.length);
console.log('[Firebase Admin DEBUG] Resolved private key present:', !!resolvedPrivateKey, 'length:', resolvedPrivateKey?.length);

if (!resolvedPrivateKey) {
  console.error('[Firebase Admin DEBUG] Missing FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64');
  throw new Error('Missing FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64');
}

console.log('[Firebase Admin DEBUG] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('[Firebase Admin DEBUG] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);

if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
  console.error('[Firebase Admin DEBUG] Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PROJECT_ID');
  throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PROJECT_ID');
}

console.log('[Firebase Admin DEBUG] All required Firebase credentials loaded successfully');

const serviceAccount = {
  "type": process.env.FIREBASE_TYPE,
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": resolvedPrivateKey,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_AUTH_URI,
  "token_uri": process.env.FIREBASE_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};
//  }

//JSON.parse(
//   readFileSync(`${__dirname}/serviceAccountKey.json`, "utf-8")
// );

export default serviceAccount;

