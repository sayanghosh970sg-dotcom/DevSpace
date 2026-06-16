# DevSpace - Real-Time Collaborative Coding Playground

DevSpace is a real-time collaborative coding platform. Users can create or join development rooms, write code (HTML, CSS, JS) collaboratively with live synchronized editing, cursor position indicators, live interactive preview, and a synchronized chat room.

## Project Structure

```text
devspace/
├── backend/            # Node.js + Express + Socket.io Server
│   ├── server.js       # Main server entrypoint
│   └── package.json    # Server dependencies
└── frontend/           # Next.js App Router (Tailwind CSS, Monaco Editor)
    ├── src/
    │   ├── app/        # Pages and routes
    │   └── lib/        # Socket manager
    └── package.json    # Client dependencies
```

## Running the Application

To run the application locally, you need to start both the backend server and the frontend client.

### 1. Start the Backend Server
Open a terminal in the `backend/` directory and run:
```bash
npm run start
```
The server will start on [http://localhost:5000](http://localhost:5000).

### 2. Start the Frontend Client
Open a new terminal in the `frontend/` directory and run:
```bash
npm run dev
```
The frontend dev server will start on [http://localhost:3000](http://localhost:3000).

## Key Features

- **Collaborative Editor**: Multi-tab code editor (HTML, CSS, JS) powered by Microsoft's Monaco Editor with syntax highlighting.
- **Conflict-free Sync**: Debounced real-time editor state syncing via Socket.io.
- **Live Collaborative Cursors**: See other users' caret positions, selections, and nicknames inside the editor with dynamic color coding.
- **Live Preview Sandbox**: A secure iframe compilation environment that compiles HTML, CSS, and JS styles on-the-fly with a manual refresh override.
- **Real-Time Sidebar Chat**: Instant room messaging with time indicators, system messages (joined/left alerts), and nickname tagging.
- **Room Management**: Custom and randomly generated 8-character Room IDs with a quick "Copy Invite Link" action.
- **Active Collaborator Counter**: Sidebar avatar indicators with online statuses.
