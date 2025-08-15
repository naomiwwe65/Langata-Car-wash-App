"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaid = exports.createWash = exports.sendReceiptEmail = exports.mpesaCallback = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
admin.initializeApp();
const db = admin.firestore();
const handleCors = (0, cors_1.default)({ origin: true });
// Read SendGrid key from functions config (firebase functions:config:set sendgrid.key="SG_...")
const SENDGRID_KEY = functions.config()?.sendgrid?.key || '';
if (SENDGRID_KEY)
    mail_1.default.setApiKey(SENDGRID_KEY);
exports.mpesaCallback = functions.https.onRequest((req, res) => {
    handleCors(req, res, async () => {
        try {
            // Example payload contains an orderId pointing to wash doc id
            const { orderId, status } = req.body || {};
            if (!orderId)
                return res.status(400).json({ error: 'Missing orderId' });
            if (status === 'SUCCESS') {
                const receiptNo = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-3)}`;
                await db.doc(`washes/${orderId}`).set({ paid: true, receiptNo }, { merge: true });
            }
            return res.json({ ok: true });
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});
exports.sendReceiptEmail = functions.https.onRequest((req, res) => {
    handleCors(req, res, async () => {
        try {
            if (!SENDGRID_KEY)
                return res.status(500).json({ error: 'Email not configured' });
            const { washId, to, businessName } = req.body || {};
            if (!washId || !to)
                return res.status(400).json({ error: 'Missing washId or to' });
            const snap = await db.doc(`washes/${washId}`).get();
            if (!snap.exists)
                return res.status(404).json({ error: 'Not found' });
            const w = snap.data();
            const services = (w.services && w.services.length ? w.services.join(', ') : w.service) || '';
            const dateStr = new Date(w.timestamp).toLocaleDateString();
            const timeStr = new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const subject = `${businessName || 'Car Wash'} Receipt ${w.receiptNo ?? ''}`.trim();
            const text = `Thank you for your payment.\n\nReceipt: ${w.receiptNo ?? w.id}\nPlate: ${w.plate}\nModel: ${w.model}\nServices: ${services}\nAmount: KES ${w.amount}\nMethod: ${String(w.method).toUpperCase()}\nDate: ${dateStr} ${timeStr}`;
            await mail_1.default.send({ to, from: to, subject, text });
            return res.json({ ok: true });
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});
// Create a new wash entry
exports.createWash = functions.https.onRequest((req, res) => {
    handleCors(req, res, async () => {
        try {
            if (req.method !== 'POST')
                return res.status(405).json({ error: 'Method not allowed' });
            const { plate, model, services, service, amount, method, timestamp, } = req.body || {};
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
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});
// Mark a wash as paid and generate a receipt number
exports.markPaid = functions.https.onRequest((req, res) => {
    handleCors(req, res, async () => {
        try {
            if (req.method !== 'POST')
                return res.status(405).json({ error: 'Method not allowed' });
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
            return res.status(500).json({ error: 'Server error' });
        }
    });
});
