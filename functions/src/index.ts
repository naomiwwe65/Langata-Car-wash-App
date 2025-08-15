import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import sgMail from '@sendgrid/mail';

admin.initializeApp();
const db = admin.firestore();
const handleCors = cors({ origin: true });

// Read SendGrid key from functions config (firebase functions:config:set sendgrid.key="SG_...")
const SENDGRID_KEY = (functions.config()?.sendgrid?.key as string) || '';
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

export const mpesaCallback = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      // Example payload contains an orderId pointing to wash doc id
      const { orderId, status } = req.body || {};
      if (!orderId) return res.status(400).json({ error: 'Missing orderId' });
      if (status === 'SUCCESS') {
        const receiptNo = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-3)}`;
        await db.doc(`washes/${orderId}`).set({ paid: true, receiptNo }, { merge: true });
      }
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

export const sendReceiptEmail = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      if (!SENDGRID_KEY) return res.status(500).json({ error: 'Email not configured' });
      const { washId, to, businessName } = req.body || {};
      if (!washId || !to) return res.status(400).json({ error: 'Missing washId or to' });
      const snap = await db.doc(`washes/${washId}`).get();
      if (!snap.exists) return res.status(404).json({ error: 'Not found' });
      const w = snap.data() as any;
      const services = (w.services && w.services.length ? w.services.join(', ') : w.service) || '';
      const dateStr = new Date(w.timestamp).toLocaleDateString();
      const timeStr = new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const subject = `${businessName || 'Car Wash'} Receipt ${w.receiptNo ?? ''}`.trim();
      const text = `Thank you for your payment.\n\nReceipt: ${w.receiptNo ?? w.id}\nPlate: ${w.plate}\nModel: ${w.model}\nServices: ${services}\nAmount: KES ${w.amount}\nMethod: ${String(w.method).toUpperCase()}\nDate: ${dateStr} ${timeStr}`;
      await sgMail.send({ to, from: to, subject, text });
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// Create a new wash entry
export const createWash = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const {
        plate,
        model,
        services,
        service,
        amount,
        method,
        timestamp,
      } = req.body || {};
      if (!plate || !model || (!services && !service) || typeof amount !== 'number' || !method || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const docRef = await db.collection('washes').add({
        plate,
        model,
        services: Array.isArray(services) ? services : undefined,
        service: !services && service ? service : undefined,
        amount,
        method,
        timestamp,
        paid: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ ok: true, id: docRef.id });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// Mark a wash as paid and generate a receipt number
export const markPaid = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const receiptNo = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-3)}`;
      await db.doc(`washes/${id}`).set({ paid: true, receiptNo }, { merge: true });
      const snap = await db.doc(`washes/${id}`).get();
      return res.json({ ok: true, id, receiptNo, data: snap.exists ? snap.data() : undefined });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});



