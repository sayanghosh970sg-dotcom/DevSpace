# DevSpace - Architecture & Technical Implementation Plan

DevSpace is a real-time collaborative developer playground enabling multiple developers to write code (HTML, CSS, JS) collaboratively, chat, view live output previews, and track peer presence. This document details the technical review of the current implementation, outlines best practices researched online, and proposes an architectural and code-level implementation plan.

---

## 1. Codebase Audit & Current State Analysis

The current directory structure is divided into `frontend/` (Next.js 16, React 19, Tailwind CSS, Monaco Editor) and `backend/` (Node.js, Express, Socket.io).

### Frontend Component (`frontend/src/app/room/[roomId]/page.tsx`)
- **Monaco Editor Integration**: Loaded via `@monaco-editor/react`. 
- **Socket.io connection**: Direct socket connection is initialized per-component load via `io('http://localhost:5000')`.
- **Sync Method**: A naive text-replacement approach. On `code-change`, the full string is sent over websockets. The receiver uses `editorRef.current.setValue(newCode)`.
- **Cursor Sync**: Local changes in cursor positions are tracked via `onDidChangeCursorPosition` and broadcasted. Remote cursors are rendered using dynamically injected CSS styles (`document.createElement('style')`) and Monaco's `deltaDecorations` API.
- **Preview Compiler**: Renders HTML/CSS/JS in an `<iframe>` sandbox using the `srcDoc` attribute, with overridden `console.log` forwarding logs to the parent via `postMessage`.

### Backend Component (`backend/server.js`)
- **Server**: Standard Node HTTP server wrapped with `Socket.io` using wildcard CORS.
- **Memory Storage**: Active rooms are stored in-memory using an ES6 `Map` (`rooms = new Map()`), holding ephemeral code structures, room messages, and active user socket information.

### Critical Deficiencies in the Current Implementation
1. **Naive Syncing (Race Conditions)**: Sending the entire document content on every keystroke (`code-change`) will lead to serious typing collisions, caret jumps, selection resets, and data loss when multiple users edit concurrently.
2. **Dynamic Style Pollution**: Injecting `<style>` tags directly into `document.head` for user cursors without cleanups will cause performance bottlenecks and memory leaks over longer sessions.
3. **Iframe Sandbox Risks**: The iframe does not enforce strict origin verification on the `postMessage` listener. The parent listens to all message events without validating `event.origin` or sanitizing inputs.
4. **Lack of DB Persistence**: All rooms and documents exist solely in server memory. If the backend restarts, all active code and chat logs are wiped.
5. **No Network Resiliency**: There is no recovery mechanism for brief client disconnections, leading to sync drift between users.

---

## 2. Best Practices & Design Decisions

### A. Conflict-Free Collaborative Syncing (CRDTs)
To prevent editor collisions and caret jumps, the system should move away from full-string replacements and employ **Conflict-free Replicated Data Types (CRDTs)**.
- **Yjs Ecosystem**: Standardize on `Yjs` for shared document models.
- **y-monaco / y-protocols**: Use Yjs Monaco bindings. It automatically binds Monaco's underlying text model to a Yjs `SharedDoc`, translating local edits into delta-operations and syncs them automatically.
- **Remote Cursors**: Yjs's awareness module (`y-protocols/awareness`) should handle remote cursors and selections out of the box, removing the need for manual cursor event broadcasting and custom style injections.

```
┌────────────────────────────────────────────────────────┐
│                      Client A                          │
│  ┌─────────────────┐             ┌──────────────────┐  │
│  │  Monaco Editor  │◄───────────►│    Yjs Doc A     │  │
│  └─────────────────┘             └────────┬─────────┘  │
└───────────────────────────────────────────┼────────────┘
                                            │ Sync Deltas
                                            ▼
                                ┌────────────────────────┐
                                │ Socket.io Room Server  │
                                └───────────┬────────────┘
                                            │ Sync Deltas
                                            ▼
┌───────────────────────────────────────────┼────────────┐
│                      Client B             │            │
│  ┌─────────────────┐             ┌────────┴─────────┐  │
│  │  Monaco Editor  │◄───────────►│    Yjs Doc B     │  │
│  └─────────────────┘             └──────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### B. Secure Environment Preview Sandboxing
Running user-generated JavaScript inside the browser must be insulated to prevent Cross-Site Scripting (XSS) and session hijacking.
- **Sandbox Attribute**: The iframe must have `sandbox="allow-scripts"` but **exclude** `allow-same-origin`. Disabling `allow-same-origin` forces the iframe into a unique origin, blocking it from accessing the parent document's cookies, local storage, or DOM.
- **Origin Validation**: The parent listener must explicitly check if the incoming `postMessage` event has a valid origin (or `null` if origin is forced to unique by sandboxing) and validate the message schema before printing logs.
- **Isolated CSS Context**: CSS styles within the iframe must be isolated to avoid styling pollution of the outer IDE.

### C. Scalable Room & Network State Management
- **Socket.io Redis Adapter**: For production scaling, Socket.io sessions should be backed by a Redis Adapter, allowing horizontal scaling across multiple Node.js instances.
- **Persistence Layer**: Integrate MongoDB (using Mongoose schemas) to persist room codes, messages, and configurations.
- **Connection Heartbeat**: Leverage Socket.io's built-in ping/pong system along with Yjs's state synchronization protocols to reconcile state difference when a user reconnects after a drop.

---

## 3. Detailed Technical Implementation Plan

### Phase 1: Real-Time Sockets & Backend Refactoring
Re-architect the Node/Express backend to decouple the websocket event hub and prepare for persistence:
1. **Module Cleanups**: Wrap Socket.io connections inside a helper utility class or service in the backend.
2. **Yjs WebSocket Integration**: Implement Yjs server-side provider mapping. Manage a centralized shared document model for each active Room ID.
3. **Database Integration**:
   - Schema for `Room`: `roomId` (indexed string), `html` (text), `css` (text), `js` (text), `createdAt` (date).
   - Schema for `Chat`: `roomId`, `sender`, `message`, `timestamp`.
   - On room creation, check database first; fallback to creating a new entry with boilerplate code.
   - Run periodic background debounced saves of active Yjs document states to MongoDB.

### Phase 2: Editor Integration with Yjs CRDT Engine
Upgrade the Next.js Monaco workspace from string-replace logic to Yjs delta syncs:
1. **Dependency Installation**: Install `yjs`, `y-websocket` (or Socket.io-specific adapter like `y-socket.io`), and `y-monaco`.
2. **Yjs Binding Hook**:
   - Write a custom React hook `useCollabEditor` to initialize a Yjs document (`Y.Doc`) and associate it with a Monaco editor instance on mount.
   - Connect the local `Y.Doc` to the server-side Socket.io room channel.
3. **Awareness & Presence**:
   - Configure the Yjs awareness manager to coordinate usernames, cursors, and selections.
   - Leverage `y-monaco`'s built-in remote cursor manager to display colored peer cursors automatically, bypassing manual head injections.

### Phase 3: Interactive Execution, Preview, & Sandbox Security
Harden the sandbox compiler and compile client-side console logs:
1. **Secure Iframe Sandbox**:
   - Implement the Preview panel using `<iframe sandbox="allow-scripts" srcDoc={compiledHTML} />`.
2. **Console Capture Redirection**:
   - Embed an interception script inside the rendered `srcDoc` header:
     ```javascript
     const originalLog = console.log;
     console.log = (...args) => {
       originalLog(...args);
       window.parent.postMessage({ type: 'DEVSPACE_CONSOLE_LOG', payload: args.join(' ') }, '*');
     };
     ```
3. **Parent Event Listener & Terminal**:
   - Build a clean terminal panel beneath the editor to render compiler outputs.
   - Attach a secure `message` listener on the parent:
     ```typescript
     useEffect(() => {
       const handleMessage = (e: MessageEvent) => {
         if (e.data && e.data.type === 'DEVSPACE_CONSOLE_LOG') {
           setLogs(prev => [...prev, { text: e.data.payload, type: 'log' }]);
         }
       };
       window.addEventListener('message', handleMessage);
       return () => window.removeEventListener('message', handleMessage);
     }, []);
     ```

### Phase 4: Room Management, Real-Time Chat, & Collaborator Features
Enhance peripheral collaborative tools in the application:
1. **User Connection / Disconnection lifecycle**:
   - Update room sidebar with active usernames parsed from Yjs's awareness data structure.
   - Implement elegant avatar icons with random unique colors calculated from username hashes.
2. **Chat Component**:
   - Improve chat room styling, allowing scroll locks and visual tags when users are mentioned.
   - Maintain a local state of historical messages synced with the database.
3. **Utility Integrations**:
   - Implement a copy link button that saves the exact routing pattern (`${window.location.origin}/room/${roomId}`) to the user's clipboard.
   - Display visual connection indicators (Connected / Reconnecting / Disconnected).

### Phase 5: UI/UX Refinement & Responsive Grid
1. **Flexible Panel Resizing**:
   - Integrate CSS Grid/Flexbox layouts that scale responsively from large screens to smaller layouts.
   - (Optional) Implement draggable panels for resizing editor, preview, and chat sidebar zones.
2. **Aesthetic Enhancements**:
   - Implement smooth transition animations for sidebar tab switches.
   - Refine light/dark themes to support full Monaco color shifts dynamically.

---

## 4. Verification and Testing Strategy

### Automated & Integration Checks
- **Build validation**: Execute `npm run build` inside `frontend/` to confirm Next.js compiler passes and Typescript is sound.
- **API Tests**: Validate backend HTTP server response states via `/health` endpoint.

### Manual Real-time Integration Protocol
1. **Multi-client test**: Open two separate browser contexts (one normal, one private window) side-by-side.
2. **Verification checklist**:
   - Confirm room joint events trigger joining notification system logs in the chat.
   - Verify concurrent edits from both screens do not overwrite or force editor caret jumps.
   - Check that selecting code text highlights the same selection bounds in the secondary screen.
   - Run a test script in Monaco containing `console.log("DevSpace Sync Test")` and confirm the log displays in the IDE's custom terminal drawer.
   - Disconnect internet connectivity of one client, edit code on the active client, restore connectivity, and verify states reconcile without conflict.
