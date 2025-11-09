// client/websocket.js
const socket = io(); // connect to same origin

socket.on('connect', () => {
  console.log('[WS] connected', socket.id);

  // Make socket.id globally available to canvas.js
  window.socketId = socket.id;

  // Update connection status
  const status = document.getElementById('status');
  if (status) status.textContent = 'Connected';

  socket.emit('joinRoom', 'main');
});

socket.on('disconnect', (reason) => {
  console.log('[WS] disconnected', reason);
  const status = document.getElementById('status');
  if (status) status.textContent = 'Disconnected';
});

socket.on('joinedRoom', (roomId) => {
  console.log('[WS] joined room', roomId);
});

socket.on('remoteDraw', (seg) => {
  console.log('[WS] remoteDraw', seg && {
    x1: seg.x1,
    y1: seg.y1,
    x2: seg.x2,
    y2: seg.y2,
    ts: seg.ts
  });
  if (window.onRemoteSegment) window.onRemoteSegment(seg);
});

socket.on('initState', (segments) => {
  console.log('[WS] initState', Array.isArray(segments) ? segments.length : segments);
  if (window.onInitState) window.onInitState(segments || []);
});

socket.on('removeSegment', (info) => {
  console.log('[WS] removeSegment >>> RECEIVED', info);
  if (window.onRemoveSegment) window.onRemoveSegment(info);
});

socket.on('toast', (msg) => {
  console.log('[WS] toast', msg);
  showToast(String(msg));
});

// Send drawing data to server
window.appSend = function (msg) {
  if (msg && msg.type === 'move') {
    const payload = {
      roomId: 'main',
      userId: window.socketId || 'local', // ensure proper userId
      x1: msg.x1,
      y1: msg.y1,
      x2: msg.x2,
      y2: msg.y2,
      color: msg.color,
      size: msg.size,
      ts: Date.now()
    };
    console.log('[WS] sending drawingData', payload);
    socket.emit('drawingData', payload);
  }
};

// Request undo from server
// undo requester
// undo requester
window.requestUndo = function() {
  const payload = { roomId: 'main' };
  console.log('[WS] sending undo request', payload);
  socket.emit('undo', payload);
};


// Simple in-page toast message
function showToast(text) {
  let el = document.getElementById('__app_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__app_toast';
    el.style.position = 'fixed';
    el.style.right = '12px';
    el.style.top = '72px';
    el.style.padding = '8px 12px';
    el.style.background = 'rgba(0,0,0,0.75)';
    el.style.color = 'white';
    el.style.borderRadius = '4px';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
  }, 1800);
}
