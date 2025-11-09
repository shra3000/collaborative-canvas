// server/rooms.ts
import { Server, Socket } from "socket.io";
import { addDrawingSegment, getRoomSegments, undoLastByUser } from "./drawing-state.js";

export function handleJoinRoom(io: Server, socket: Socket, roomId: string) {
  socket.join(roomId);
  const existing = getRoomSegments(roomId);
  console.log(`Socket ${socket.id} joined room ${roomId} (segments=${existing.length})`);
  socket.emit("initState", existing);
}

export function handleDrawingData(io: Server, socket: Socket, data: any) {
  try {
    if (!data || typeof data !== "object") return;
    const roomId = data.roomId || "main";

    const seg = {
      roomId,
      userId: socket.id,  // always use the connected socket ID
      strokeId: data.strokeId,  // carry over stroke grouping ID
      x1: data.x1,
      y1: data.y1,
      x2: data.x2,
      y2: data.y2,
      color: data.color,
      size: data.size,
      ts: data.ts || Date.now(),
    };

    addDrawingSegment(roomId, seg);
    io.to(roomId).emit("remoteDraw", seg);
  } catch (err) {
    console.error("handleDrawingData error:", err);
  }
}


export function handleUndo(io: Server, socket: Socket, payload: any) {
  try {
    const roomId = payload?.roomId || "main";
    const userId = socket.id;

    const removed = undoLastByUser(roomId, userId);
if (removed) {
  console.log(`User ${userId} undid their last stroke in room ${roomId}`);
  console.log("Removed segment:", removed);

  // Emit to everyone in the room, including the sender
  io.to(roomId).emit("removeSegment", {
    ts: removed.ts,
    userId: userId, // <-- use socket.id from this scope, not removed.userId
  });
}

    else {
      console.log(
        `Undo skipped — no strokes found for ${userId} in room ${roomId}`
      );
      socket.emit("toast", "Nothing to undo");
    }
  } catch (err) {
    console.error("handleUndo error:", err);
  }
}

