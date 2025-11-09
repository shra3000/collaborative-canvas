// server/drawing-state.ts
export type Segment = {
  roomId: string;
  userId: string;
  strokeId: string; // add this line
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  size: number;
  ts: number;
};


const roomSegments: Record<string, Segment[]> = {};

export function addDrawingSegment(roomId: string, seg: Segment) {
  if (!roomSegments[roomId]) roomSegments[roomId] = [];
  roomSegments[roomId].push(seg);
  console.log("Added segment for user:", seg.userId, "strokeId:", seg.strokeId);
}


export function getRoomSegments(roomId: string): Segment[] {
  return roomSegments[roomId] || [];
}

export function undoLastByUser(roomId: string, userId: string): { strokeId?: string, removedCount: number, ts?: number } | null {
  const arr = roomSegments[roomId];
  if (!arr || arr.length === 0) return null;

  // Find the last segment drawn by this user
  let idx = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].userId === userId) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return null; // no match

  // Identify that entire stroke
  const strokeId = arr[idx].strokeId;
  const ts = arr[idx].ts;

  if (strokeId) {
    // Remove all segments of that stroke
    const before = arr.length;
    roomSegments[roomId] = arr.filter(
      s => !(s.userId === userId && s.strokeId === strokeId)
    );
    const removedCount = before - roomSegments[roomId].length;
    console.log(
      `Removed stroke ${strokeId} of user ${userId} from room ${roomId} (segments=${removedCount})`
    );
    return { strokeId, removedCount, ts };
  } else {
    // fallback if no strokeId exists
    const removed = arr.splice(idx, 1)[0];
    console.log(
      `Removed single segment of user ${userId} from room ${roomId}`
    );
    return { strokeId: undefined, removedCount: 1, ts: removed.ts };
  }
}
