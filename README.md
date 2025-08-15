# Lang'ata Car Wash App

A monorepo for a car wash management system with:
- Expo React Native app (my-app)
- Express + TypeScript backend (server)
- Firebase Cloud Functions (unctions)

Repo: https://github.com/naomiwwe65/Langata-Car-wash-App.git

## Prerequisites
- Node.js 18+
- npm or yarn or pnpm
- Expo CLI (
px expo)
- Firebase CLI (for functions): 
pm i -g firebase-tools

## Project Structure
`
Car-wash-app/
  my-app/       # Expo mobile app
  server/       # Express API (TypeScript)
  functions/    # Firebase Cloud Functions
`

## Setup
Install dependencies per workspace:
`ash
# Mobile app
yarn --cwd my-app install
# or: npm install --prefix my-app

# Backend API
yarn --cwd server install
# or: npm install --prefix server

# Firebase Functions
yarn --cwd functions install
# or: npm install --prefix functions
`

## Running
### 1) Mobile (Expo)
`ash
cd my-app
npx expo start
`

### 2) Backend API (Express)
`ash
cd server
# Dev (watch)
npm run dev
# Build + start
npm run build && npm start
`
The API listens on http://localhost:3000 by default.

#### Backend environment
The backend uses Firebase Admin. Provide credentials via one of:
- GOOGLE_APPLICATION_CREDENTIALS path to a service-account JSON file, or
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (supports \n in the key)

Example (PowerShell):
`powershell
 = "C:\\path\\to\\service-account.json"
# or
car--wash--project = "your-project-id"
 = "service-account@your-project-id.iam.gserviceaccount.com"
 = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
`

### 3) Firebase Functions
`ash
cd functions
# Emulators
npm run serve
# Deploy selected resources
npm run deploy
`

## API Endpoints (server)
- POST /createWash
  - body: { plate, model, services?: string[], service?: string, amount: number, method: string, timestamp: number }
  - response: { ok: true, id }
- POST /markPaid
  - body: { id }
  - response: { ok: true, id, receiptNo, data }

## Notes
- 
ode_modules, build outputs, and .env* files are ignored via .gitignore.
- Ensure you configure Firebase Admin credentials before hitting the API.

## License
Add your preferred license.
