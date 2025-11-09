When Notepad opens, paste this entire content inside and save the file (Ctrl + S, then close):



\# Collaborative Canvas – Architecture Overview



This document describes the internal architecture, data flow, and synchronization design of the Collaborative Canvas application.



---



\## 1. System Overview



The system is a real-time multi-user drawing application.  

Each connected client interacts with a shared HTML5 Canvas through WebSocket communication managed by a Node.js backend.



---



\## 2. High-Level Architecture







┌──────────────────────┐

│ Client 1 │

│ (HTML5 Canvas + JS) │

└─────────┬────────────┘

│ WebSocket (Socket.IO)

┌─────────▼────────────┐

│ Node.js Server │

│ (Express + Socket.IO)│

└─────────▲────────────┘

│ WebSocket

┌─────────▼────────────┐

│ Client 2 │

│ (HTML5 Canvas + JS) │

└──────────────────────┘





All clients connect to the same Node.js WebSocket server, which manages:

\- Broadcasting drawing events between clients

\- Storing stroke history for each room

\- Handling undo actions per user



---



\## 3. Data Flow Diagram







\[User Action on Canvas]

│

▼

(Canvas.js)

Generate stroke segment

(x1, y1, x2, y2, color, size, userId)

│

▼

(WebSocket.js)

Emit "drawingData" event

│

▼

(Server - rooms.ts)

Broadcast to all clients in same room

│

▼

(Client)

Render the new stroke on canvas in real time





---



\## 4. WebSocket Protocol



| Event Name     | Direction | Description |

|----------------|------------|--------------|

| `joinRoom`     | Client → Server | Sent when a client connects and joins a specific room. |

| `drawingData`  | Client → Server | Contains stroke coordinates, color, size, and user ID. |

| `remoteDraw`   | Server → Clients | Broadcasted to all clients except sender with stroke data. |

| `undo`         | Client → Server | Requests undo of the last stroke drawn by the user. |

| `removeSegment`| Server → Clients | Instructs all clients to remove a specific stroke. |

| `initState`    | Server → Client | Sends existing strokes when a new client joins. |

| `toast`        | Server → Client | Sends system or status messages. |



---



\## 5. Undo/Redo Strategy



Each stroke is stored as a series of \*\*segments\*\* with a shared `strokeId` and associated `userId`.  

The server maintains a list of strokes per room in memory.



\*\*Undo logic (per-user):\*\*

1\. When a user clicks Undo, a `undo` event is sent to the server.

2\. The server finds the latest stroke for that `userId` in that room.

3\. The stroke is removed from the room’s segment list.

4\. A `removeSegment` event is broadcast to all clients.

5\. Each client removes that stroke locally and re-renders the remaining segments.



Global undo (affecting all users) is not supported to avoid conflicts.



---



\## 6. State Synchronization



\- The server acts as the single source of truth for all active rooms.

\- Each room maintains a list of stroke segments:

&nbsp; ```ts

&nbsp; Record<string, Segment\[]>  // roomId → list of strokes





When a new client joins:



The server sends the full current state (initState event).



The client replaces its local canvas state with the received data.



Any new stroke or undo event updates both the server and all connected clients in real time.



7\. Performance Considerations



Drawing events are batched per segment rather than per pixel.



Each segment contains only essential data (x1, y1, x2, y2, color, size).



Canvas re-rendering is done efficiently using a full redraw of stored segments on undo.



Undo is limited to user-level scope to reduce synchronization complexity.



8\. Error Handling



Missing or invalid WebSocket payloads are ignored safely on the server.



All major socket handlers are wrapped in try...catch blocks.



Clients receive fallback messages (toast) for user-facing errors (e.g., "Nothing to undo").



9\. Known Limitations



Undo affects only the most recent stroke per user.



Canvas state is stored in memory; it is not persistent.



No authentication or user identity beyond socket ID.



High-frequency simultaneous draws from many users may slightly lag.



10\. Future Enhancements



Add persistent storage (e.g., Redis or MongoDB) for saving sessions.



Support global redo.



Add shape tools (rectangle, circle).



Introduce optional authentication for user sessions.



Improve compression for large-scale real-time drawing.

