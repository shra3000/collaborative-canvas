// server/server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// IMPORTANT: import the handlers from rooms (use .js so runtime resolves compiled files)
import { handleJoinRoom, handleDrawingData, handleUndo } from "./rooms.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve client folder (works when running compiled JS from dist/server)
app.use(express.static(path.join(__dirname, "../../client")));

app.get("/health", (_req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId: string) => {
    try {
      handleJoinRoom(io, socket, roomId);
    } catch (err) {
      console.error("joinRoom handler error:", err);
    }
  });

  socket.on("drawingData", (data: any) => {
    try {
      handleDrawingData(io, socket, data);
    } catch (err) {
      console.error("drawingData handler error:", err);
    }
  });

  socket.on("undo", (payload: any) => {
    try {
      handleUndo(io, socket, payload);
    } catch (err) {
      console.error("undo handler error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = Number(process.env.PORT || 3000);
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
