// client/main.js
(function () {
  function $id(id) { return document.getElementById(id); }

  window.addEventListener('load', () => {
    if (typeof CanvasApp === 'undefined' || !CanvasApp.init) {
      console.error('CanvasApp not found. Include canvas.js first.');
      return;
    }
    CanvasApp.init();

    const colorEl = $id('color');
    const sizeEl  = $id('size');
    const undoEl  = $id('undo');

    if (colorEl) {
      colorEl.addEventListener('input', (e) => CanvasApp.setColor(e.target.value));
      CanvasApp.setColor(colorEl.value);
    }
    if (sizeEl) {
      sizeEl.addEventListener('input', (e) => CanvasApp.setSize(e.target.value));
      CanvasApp.setSize(sizeEl.value);
    }

    if (undoEl) {
      undoEl.addEventListener('click', () => {
        console.log('[UI] Undo clicked');
        if (typeof window.requestUndo === 'function') {
          window.requestUndo();
        } else {
          console.warn('[UI] requestUndo not available');
        }
      });
    }

    // Called when server sends a single remote segment
    window.onRemoteSegment = function(seg) {
      CanvasApp.remoteDrawSegment(seg);
    };

    // Replace stored segments when server sends authoritative list
    window.onInitState = function(segments) {
      CanvasApp.replaceSegments(Array.isArray(segments) ? segments : []);
    };

    // remove segment delta (server told us which to remove)
    window.onRemoveSegment = function(info) {
      console.log('[Main] onRemoveSegment', info);
      if (typeof CanvasApp.removeSegment === 'function') {
        CanvasApp.removeSegment(info);
      } else {
        console.warn('[Main] CanvasApp.removeSegment not implemented');
        // fallback: request a full initState (not ideal)
        // (You could request a full state by emitting a "requestState" event; not implemented here)
      }
    };
  });
})();
