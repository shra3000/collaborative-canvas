(() => {
  const canvas = document.getElementById('board');  // <--- Correct ID
  const ctx = canvas.getContext('2d');
  let color = '#000000';
  let size = 4;
  let drawing = false;
  let last = { x: 0, y: 0 };
  let currentStrokeId = null;
  const segments = [];

  // === Resize canvas dynamically ===
  function resizeCanvas() {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50;
    ctx.putImageData(imgData, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // === Draw a single line segment ===
  function drawLine(x1, y1, x2, y2, color, size) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // === Pointer handlers ===
  function pointerDown(e) {
    drawing = true;
    const r = canvas.getBoundingClientRect();
    last = { x: e.clientX - r.left, y: e.clientY - r.top };
    currentStrokeId = `${Date.now()}-${Math.floor(Math.random()*100000)}`;
  }

  function pointerMove(e) {
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    drawLine(last.x, last.y, x, y, color, size);

    const seg = {
      userId: window.socketId || 'local',
      x1: last.x,
      y1: last.y,
      x2: x,
      y2: y,
      color,
      size,
      ts: Date.now(),
    };

    segments.push(seg);
    if (window.appSend) window.appSend({ type: 'move', ...seg });

    last = { x, y };
    e.preventDefault();
  }

  function pointerUp() {
    drawing = false;
  }

  // === Remote draw from server ===
  function remoteDrawSegment(seg) {
    if (!seg || typeof seg.x1 !== 'number') return;
    drawLine(seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.size);

    segments.push({
      userId: seg.userId || 'remote',
      x1: seg.x1,
      y1: seg.y1,
      x2: seg.x2,
      y2: seg.y2,
      color: seg.color,
      size: seg.size,
      ts: seg.ts || Date.now(),
    });
  }

  // === Replace segments (initial sync) ===
  function replaceSegments(newSegs) {
    segments.length = 0;
    if (Array.isArray(newSegs)) segments.push(...newSegs);
    replayAllSegments();
  }

  // === Clear canvas ===
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // === Redraw all segments ===
  function replayAllSegments() {
    clearCanvas();
    segments.forEach((s) => drawLine(s.x1, s.y1, s.x2, s.y2, s.color, s.size));
  }

  // === Handle undo from server ===
  function removeSegment(info) {
    if (!info || typeof info.ts === 'undefined') return;

    const { ts, userId } = info;
    console.log('[Canvas] removeSegment called', info);

    let idx = segments.findIndex((s) => {
      const timeDiff = Math.abs(Number(s.ts) - Number(ts));
      return s.userId === userId && timeDiff < 1500; // 1.5s tolerance
    });

    if (idx < 0) {
      console.warn('[Canvas] No close ts match, removing last stroke for user:', userId);
      for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].userId === userId) {
          idx = i;
          break;
        }
      }
    }

    if (idx < 0) {
      console.warn('[Canvas] removeSegment: not found. Dumping last few segments:');
      console.table(
        segments.slice(-5).map((s) => ({
          userId: s.userId,
          ts: s.ts,
          diff: Math.abs(Number(s.ts) - Number(ts)),
        }))
      );
      return;
    }

    console.log(`[Canvas] Removing segment idx=${idx}, userId=${segments[idx].userId}, ts=${segments[idx].ts}`);
    segments.splice(idx, 1);
    replayAllSegments();
  }

  // === Debug helper ===
  window.__debugSegments = function () {
    console.log('=== SEGMENT DEBUG DUMP ===');
    segments.forEach((s, i) => console.log(i, 'userId:', s.userId, 'ts:', s.ts));
    console.log('=== END DUMP ===');
    return segments.length;
  };

  // === Event bindings ===
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);

  // === Expose CanvasApp ===
  window.CanvasApp = {
    init: () => {
      console.log('[Canvas] initialized');
      clearCanvas();
    },
    setColor: (c) => (color = c),
    setSize: (s) => (size = s),
    remoteDrawSegment,
    replaceSegments,
    clearCanvas,
    removeSegment,
  };

  // === Bind to websocket.js ===
  window.onRemoteSegment = remoteDrawSegment;
  window.onInitState = replaceSegments;
  window.onRemoveSegment = removeSegment;
})();
