import { createServer, Tool, StdioServerTransport } from "@modelcontextprotocol/sdk/server/index.js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
function ensureFirebase() {
    if (getApps().length > 0) {
        return { app: getApps()[0] };
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.");
    }
    const app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
    return { app };
}
const firestoreGetTool = new Tool({
    name: "firestore.get",
    description: "Read a Firestore document by path, e.g. 'washes/abc123'",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Document path" },
        },
        required: ["path"],
    },
    async execute({ path }) {
        const { app } = ensureFirebase();
        const db = getFirestore(app);
        const snap = await db.doc(path).get();
        if (!snap.exists)
            return { ok: false, error: "not-found" };
        return { ok: true, data: { id: snap.id, path: snap.ref.path, ...snap.data() } };
    },
});
const firestoreSetTool = new Tool({
    name: "firestore.set",
    description: "Create or update a Firestore document at a path with data (merge optional)",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string" },
            data: { type: "object" },
            merge: { type: "boolean" },
        },
        required: ["path", "data"],
    },
    async execute({ path, data, merge }) {
        const { app } = ensureFirebase();
        const db = getFirestore(app);
        await db.doc(path).set(data, { merge: Boolean(merge) });
        return { ok: true };
    },
});
const firestoreQueryTool = new Tool({
    name: "firestore.query",
    description: "Run a simple Firestore collection query with where and limit",
    inputSchema: {
        type: "object",
        properties: {
            collection: { type: "string", description: "Collection path" },
            where: {
                type: "array",
                description: "Array of [field, op, value] filters",
                items: { type: "array", items: [{}, {}, {}] },
            },
            limit: { type: "number" },
            orderBy: { type: "string" },
            order: { type: "string", enum: ["asc", "desc"] },
        },
        required: ["collection"],
    },
    async execute({ collection, where = [], limit, orderBy, order }) {
        const { app } = ensureFirebase();
        const db = getFirestore(app);
        let q = db.collection(collection);
        for (const filter of where) {
            const [field, op, value] = filter;
            q = q.where(field, op, value);
        }
        if (orderBy) {
            q = q.orderBy(orderBy, order === "desc" ? "desc" : "asc");
        }
        if (typeof limit === "number") {
            q = q.limit(limit);
        }
        const snap = await q.get();
        return {
            ok: true,
            data: snap.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() })),
        };
    },
});
async function main() {
    const transport = new StdioServerTransport();
    const server = createServer({ name: "firebase-mcp-server", version: "0.1.0" }, { transport });
    server.addTool(firestoreGetTool);
    server.addTool(firestoreSetTool);
    server.addTool(firestoreQueryTool);
    await server.connect();
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
