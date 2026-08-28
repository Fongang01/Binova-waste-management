# BINOVA — Intelligent Smart Waste Collection Management System

BINOVA is an end-to-end municipal smart waste collection platform comprising:
1. **Node.js Express + Prisma PostgreSQL Backend** (`backend/`)
2. **React + Vite Admin Web Dashboard** (`admin-dashboard/`)
3. **Flutter Driver Mobile Application** (`lib/`)

---

## 🏗️ System Architecture

```
                 ONE BINOVA BACKEND (0.0.0.0:3000)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
      ADMIN WEB DASHBOARD           DRIVER MOBILE APP
       (Mapbox GL JS)               (Mapbox Mobile Map)
               │                             │
               └──────────────┬──────────────┘
                              ▼
                    PostgreSQL Database
```

---

## 🚀 Quick Start Guide

### 1. PostgreSQL Database
Ensure your PostgreSQL server is active.
Configure the database connection string in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/binova_db?schema=public"
JWT_SECRET="your_jwt_secret_here"
PORT=3000
HOST=0.0.0.0
```

### 2. Backend Server (Node.js Express)
Run the backend server (listens on `0.0.0.0:3000` for LAN access):
```bash
cd backend
npm install
npx prisma generate
npm start
```
Health Check Endpoint: `http://localhost:3000/api/health`

### 3. Admin Web Dashboard (React + Vite)
Configure environment in `admin-dashboard/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```
Start the development server:
```bash
cd admin-dashboard
npm install
npm run dev
```
Open in browser: `http://localhost:5173`

---

## 📱 Flutter Driver Application Network Connectivity

The Flutter Driver App supports three development connection workflows:

### Scenario A: Android Emulator
- **Server Address**: `http://10.0.2.2:3000`
- **Setup**: Start the emulator and run:
  ```bash
  flutter run
  ```
  The app automatically defaults to `http://10.0.2.2:3000` when running on Android.

---

### Scenario B: Physical Android Device over Wi-Fi / LAN
1. Ensure your PC and Android phone are connected to the **SAME Wi-Fi network**.
2. Find your PC's current LAN IPv4 address:
   - On Windows: Run `ipconfig` in Command Prompt (e.g. `192.168.1.45`).
   - On macOS/Linux: Run `ifconfig` or `ip a`.
3. In the mobile app (Login Screen or Driver Profile Screen):
   - Tap the **Server Status / DNS icon**.
   - Tap **Auto-Detect** or enter: `http://<YOUR-PC-IP>:3000` (e.g. `http://192.168.1.45:3000`).
   - Tap **Test Connection** (calls `/api/health` and provides instant diagnostic feedback).
   - Tap **Save & Apply**. The app permanently saves this URL to device storage.

> **Wi-Fi Troubleshooting Tips**:
> - **Windows Firewall**: Ensure Windows Firewall permits incoming TCP traffic on port 3000.
> - **Client Isolation**: If connection times out, verify your Wi-Fi router does not have "AP/Client Isolation" enabled.

---

### Scenario C: Physical Android Device over USB (`adb reverse`)
If Wi-Fi is restricted or PC and phone cannot communicate over LAN:
1. Connect your phone to the PC via USB with USB Debugging enabled.
2. Forward port 3000 from the device to your PC:
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. In the app's server configuration sheet, tap the **USB ADB (127.0.0.1)** preset chip.
4. The phone will now communicate with the PC backend over the USB cable at `http://127.0.0.1:3000`.

---

## 🗺️ Mapbox Map Configuration

Both the Admin Dashboard and the Driver Mobile App utilize real-world Mapbox maps centered on **Yaoundé, Cameroon** (`[11.5021, 3.8480]` / `LatLng(3.8480, 11.5021)`).

### Mapbox Features:
- **Real Streets & Roads**: Mapbox Streets-v12 high-resolution raster tiles.
- **Driver GPS Tracking**: Real-time pulsing blue dot indicator with live coordinates.
- **Color-Coded Smart Bins**:
  - 🟢 **Normal**: < 50% fill level (Green)
  - 🟠 **Moderate**: 50% – 79% fill level (Orange)
  - 🔴 **Critical**: ≥ 80% fill level (Red with animated pulse ring)
- **Interactive Bin Popups**: View bin code, address, capacity, fill level, and execute collection tasks directly from the map.
- **Future AI Route Ready**: Polyline line layer configured for real road-following collection routes.

### Passing Mapbox Token at Launch (Mobile):
```bash
flutter run --dart-define=MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```
*(If omitted, the app uses the configured project development token).*
