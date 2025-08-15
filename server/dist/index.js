import express from 'express';
import cors from 'cors';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const app = express();
app.use(cors());
app.use(express.json());
function ensureFirebase() {
    if (getApps().length)
        return;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase Admin env vars');
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
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message || 'Server error' });
    }
});
app.post('/markPaid', async (req, res) => {
    try {
        ensureFirebase();
        const db = getFirestore();
        const { id } = req.body || {};
        if (!id)
            return res.status(400).json({ error: 'Missing id' });
        const receiptNo = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-3)}`;
        await db.doc(`washes/${id}`).set({ paid: true, receiptNo }, { merge: true });
        const snap = await db.doc(`washes/${id}`).get();
        return res.json({ ok: true, id, receiptNo, data: snap.exists ? snap.data() : undefined });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message || 'Server error' });
    }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`API listening on :${port}`);
});
