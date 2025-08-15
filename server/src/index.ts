import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
app.use(cors());
app.use(express.json());

function ensureFirebase() {
  if (getApps().length) return;
  // Preferred: GOOGLE_APPLICATION_CREDENTIALS pointing to a JSON key file
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath && fs.existsSync(credsPath)) {
    const raw = fs.readFileSync(credsPath, 'utf8');
    const json = JSON.parse(raw);
    initializeApp({ credential: cert(json as any) });
    return;
  }

  // Fallback: separate env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  // Support either literal \n sequences or real newlines
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Missing or invalid Firebase Admin credentials. Provide GOOGLE_APPLICATION_CREDENTIALS path or FIREBASE_* envs.');
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

app.post('/createWash', async (req, res) => {
  try {
    ensureFirebase();
    const db = getFirestore();
    const { plate, model, services, service, amount, method, timestamp } = req.body || {};
    if (!plate || !model || (!services && !service) || typeof amount !== 'number' || !method || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const doc = await db.collection('washes').add({
      plate,
      model,
      services: Array.isArray(services) ? services : undefined,
      service: !services && service ? service : undefined,
      amount,
      method,
      timestamp,
      paid: false,
      createdAt: Date.now(),
    });
    return res.json({ ok: true, id: doc.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

app.post('/markPaid', async (req, res) => {
  try {
    ensureFirebase();
    const db = getFirestore();
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const receiptNo = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-3)}`;
    await db.doc(`washes/${id}`).set({ paid: true, receiptNo }, { merge: true });
    const snap = await db.doc(`washes/${id}`).get();
    return res.json({ ok: true, id, receiptNo, data: snap.exists ? snap.data() : undefined });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});


