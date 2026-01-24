# 🚀 HomeFitAR - Local Setup Guide

Complete guide to get the entire E-Commerce platform running on your local machine in under 10 minutes!

## 📋 What You'll Need

### Required Software
- ✅ **Java SE** (JDK 17 or later) ([Download](https://www.oracle.com/java/technologies/javase-jdk17-downloads.html))
- ✅ **Node.js** v18+ ([Download](https://nodejs.org/))
- ✅ **MySQL** v8.x ([Download](https://dev.mysql.com/downloads/mysql/))

### Optional (Already Configured)
The project comes with pre-configured `sample.env` files. You only need to:
- Update MySQL and other sample.env credentials  
- Add your Firebase `google-services.json` file
- That's it! Ready to run.

---

## 🎯 Step-by-Step Setup

### STEP 1: Extract & Install Dependencies

```bash
# Extract the ZIP file
# Navigate to the extracted folder
cd E-Commerce

# Install backend dependencies
cd backend
npm install

# Install admin dependencies
cd ../Admin
npm install

# Install mobile app dependencies
cd ../frontend
npm install

cd ..
```

### STEP 2: Setup MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE ecommerce;
exit;
```

### STEP 3: Update Backend Configuration

```bash
cd backend

```env
# Find this line in sample.env and update YOUR_MYSQL_PASSWORD
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/ecommerce"
```

**Save and exit** (Ctrl+X, then Y, then Enter)

### STEP 4: Initialize Database and setup Prisma ORM

```bash
# Still in backend directory
npx prisma migrate deploy
npx prisma generate
```

### STEP 5: Setup Firebase for Mobile App

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: **fir-auth01-10f58** (or create if needed)
3. **Download google-services.json:**
   - Go to Project Settings → Your apps → Android app
   - Click "Download google-services.json"
4. **Copy to project:**
   ```bash
   # Replace /path/to/downloaded/ with actual path
   cp /path/to/downloaded/google-services.json ./google-services.json
   ```

### STEP 6: Update Mobile App API URL

```bash
cd ../frontend

# Get your computer's local IP address
# macOS/Linux:
ipconfig getifaddr en0

# Windows (PowerShell):
# (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress

# Open .env file and update YOUR_LOCAL_IP
nano .env
```

**Update this line with your actual IP:**
```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:8080/api
# Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080/api
```

**Save and exit** (Ctrl+X, then Y, then Enter)

### STEP 7: Start Everything! 🎉

**Terminal 1 - Backend:**
```bash
cd E-Commerce/backend
npm run dev
```
✅ Backend running at `http://localhost:8080`

**Terminal 2 - Admin Dashboard:**
```bash
cd E-Commerce/Admin
npm run dev
```
✅ Admin at `http://localhost:5173`

**Terminal 3 - Mobile App:**
```bash
cd E-Commerce/frontend
npm run dev
```
✅ Scan QR code with Expo Go app

---

## 📱 Testing the Mobile App

### Option 1: Expo Go (Quick Test - Limited Features)
1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan QR code from Terminal 3
3. ⚠️ **Note:** Google Sign-In and Stripe won't work in Expo Go

### Option 2: Development Build (Full Features - Recommended)
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create account if needed)
eas login

# Build for Android cloud based on expo eas dashboard
cd E-Commerce/frontend
eas build --profile development --platform android

After build completes, download and install the APK/IPA on your device.

# Build for Android locally
cd E-Commerce/frontend
eas build --local --platform android --profile preview

## ✅ Verify Everything Works

### Test Backend:
```bash
curl http://localhost:8080/api/products
```
Should return product list (or empty array)

### Test Admin:
1. Open `http://localhost:3001` in browser
2. You should see the admin dashboard

### Test Mobile:
1. Open app on phone
2. Browse products
3. Test Google Sign-In (requires development build)

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **"Cannot connect to database"** | 1. Check MySQL is running: `mysql -u root -p`<br>2. Verify `DATABASE_URL` in `backend/config/config.env`<br>3. Ensure database exists: `CREATE DATABASE ecommerce;` |
| **"Mobile can't reach API"** | 1. Use local IP (not `localhost`) in `frontend/.env`<br>2. Ensure phone and computer on same WiFi<br>3. Check firewall allows port 8080 |
| **"Prisma Client not found"** | Run: `cd backend && npx prisma generate` |
| **"Google Sign-In error"** | 1. Ensure `google-services.json` is in `frontend/` folder<br>2. Build development build with EAS (won't work in Expo Go)<br>3. Use the correct Firebase project |
| **"Module not found"** | Delete `node_modules` folder and run `npm install` again |
| **"Port already in use"** | Kill the process: `lsof -ti:8080 \| xargs kill -9` (or change PORT in `config/config.env`) |

---

## 🎨 What's Next?

- ✅ **Add Products:** Use Admin Dashboard (`http://localhost:5173`) to add products
- ✅ **Test Payments:** Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)
- ✅ **Explore Features:** Try cart, wishlist, AR preview, and order tracking
- ✅ **Customize:** Update colors, branding, and features to match your brand
- ✅ **Deploy:** Follow deployment guides for production when ready

## ⚙️ Pre-Configured Services

The project includes pre-configured credentials for:
- ✅ Firebase Authentication (Google Sign-In)
- ✅ Stripe Payments (Test Mode)
- ✅ Cloudinary (Image Storage)
- ✅ JWT Authentication

**You only need to:**
1. Update MySQL password
2. Add `google-services.json` for mobile app

---

## 📚 Useful Commands

```bash
# View database in browser
cd backend 
npx prisma studio

# Reset database (⚠️ Deletes all data)
cd backend 
npx prisma migrate reset

# Check backend logs
cd backend
npm run dev


```
---

## 🆘 Need Help?

1. Check the [Common Issues](#-common-issues--fixes) section
2. Verify all prerequisites are installed
3. Ensure all environment variables are set correctly
4. Check terminal logs for specific error messages

---

``` bash
Authors: 
Muhammad Yaafay SE-23023
Adil Javed SE-23025
```
