# CareMeds

CareMeds is a smart medication management, adherence tracking, and pill reminder application with a decoupled **Frontend** (Expo / React Native) and **Backend** (Node.js / Express / TypeScript REST API).

---

## 📁 Repository Structure

```
Care-Meds/
├── frontend/             # Mobile Application (React Native + Expo SDK 57)
│   ├── src/
│   │   ├── navigation/   # RootNavigator & MainTabs (Home, Calendar, History, Settings)
│   │   ├── screens/      # Add/Edit, Calendar, History, Home, Detail, Scan, Settings
│   │   ├── services/     # api.ts (REST API client communicating with backend)
│   │   ├── storage/      # medicineStorage.ts (Resilient offline-first storage)
│   │   ├── theme/        # Color palette & styles
│   │   ├── types/        # TypeScript interfaces (Medicine, AdherenceLog, Settings)
│   │   └── utils/        # Expiry safety evaluator, OCR parser, voice reminder
│   ├── .env.example      # Frontend environment variables template
│   ├── app.json          # Expo configuration
│   └── package.json
│
├── backend/              # REST API Server (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── database/     # db.ts (Persistent JSON database with seed data)
│   │   ├── routes/       # /api/medicines, /api/adherence, /api/settings
│   │   ├── types/        # Domain entity models
│   │   └── server.ts     # Express app, CORS, and health endpoints
│   ├── data/             # Persistent data storage (caremeds.json)
│   ├── .env.example      # Backend environment variables template
│   └── package.json
│
├── android-native/       # Native Android Kotlin Jetpack Compose implementation
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher recommended; v24.x tested)
- **npm** (v9 or higher)
- **Expo Go** mobile app (available on Google Play Store and Apple App Store)

---

## 1. 🖥️ Starting the Backend

The backend provides the REST API endpoints and data persistence.

```bash
cd backend
npm install
npm run dev
```

The server will start at:
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Medicines API**: `http://localhost:5000/api/medicines`
- **Adherence API**: `http://localhost:5000/api/adherence`
- **Settings API**: `http://localhost:5000/api/settings`

### Backend Environment Variables (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*
DATA_FILE_PATH=./data/caremeds.json
```

---

## 2. 📱 Starting the Frontend

The frontend is an Expo / React Native mobile application that can run on physical iOS/Android devices, emulators, or web.

```bash
cd frontend
npm install
npx expo start
```

### Frontend Environment Variables (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

> **Connecting from Devices / Emulators:**
> - **Default / Web / iOS Simulator**: `http://localhost:5000/api`
> - **Android Emulator**: `http://10.0.2.2:5000/api` (Android emulator routes `10.0.2.2` to the host computer)
> - **Physical Phone (Expo Go via Wi-Fi)**: Set `EXPO_PUBLIC_API_URL` to your computer's local network IP, for example: `http://192.168.0.103:5000/api`

---

## 🔄 Offline-First & API Architecture

The CareMeds frontend is designed with an **offline-first architecture**:
1. When the backend server is reachable, the frontend automatically synchronizes medicines, adherence logs, and settings to the server in real-time.
2. If the backend is unreachable or offline, the app seamlessly falls back to local `AsyncStorage` and in-memory caching without interruption or error screens.

---

## 🧪 Testing & Validation

### Backend
```bash
cd backend
npx tsc --noEmit     # Type check
npm run build        # Build production bundle
```

### Frontend
```bash
cd frontend
npx tsc --noEmit     # Type check
npx expo export -p android  # Metro bundle check
```
