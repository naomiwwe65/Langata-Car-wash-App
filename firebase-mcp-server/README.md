Firebase MCP Server

This MCP server exposes simple Firestore tools for Cursor/Claude to use via the Model Context Protocol.

Tools
- firestore.get: Read a document by path (e.g., washes/abc123)
- firestore.set: Create/update a document at a path with data (merge optional)
- firestore.query: Query a collection with basic where/order/limit

Setup
1) Create a Firebase service account in your project and generate a JSON key. Collect:
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY (escape newlines as \n in env variables)

2) Provide env vars to Cursor (recommended via your system environment):
   - Windows PowerShell example:
     $env:FIREBASE_PROJECT_ID = "your-project-id"
     $env:FIREBASE_CLIENT_EMAIL = "firebase-adminsdk@your-project-id.iam.gserviceaccount.com"
     $env:FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

3) Build the server:
   npm --prefix firebase-mcp-server install
   npm --prefix firebase-mcp-server run build

4) Cursor picks it up via .cursor/mcp.json. You can also run locally:
   npm --prefix firebase-mcp-server run dev

Security
- Use a dedicated service account with least privileges required for the collections you access.
- Never commit secrets. Env vars are read at runtime.



