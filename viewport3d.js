/**
 * Viewport3D — A canvas-based 3D viewport for photography prompt building.
 * Renders a stick-figure mannequin with interactive camera orbit, zoom,
 * joint rigging, pose presets, and a control panel that derives
 * photography-prompt text values from the 3D scene state.
 *
 * Usage:
 *   const vp = new Viewport3D(containerEl, {
 *     onAccept: (settings) => { ... },
 *     width: 'auto',
 *     theme: 'dark'
 *   });
 *   vp.reset();
 *   vp.getSettings();
 *   vp.setTheme('light');
 */
;(function () {
  'use strict';

  // Polyfill roundRect for older browsers
  if (typeof CanvasRenderingContext2D !== 'undefined' &&
      !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0);
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.arcTo(x + w, y, x + w, y + r, r);
      this.lineTo(x + w, y + h - r);
      this.arcTo(x + w, y + h, x + w - r, y + h, r);
      this.lineTo(x + r, y + h);
      this.arcTo(x, y + h, x, y + h - r, r);
      this.lineTo(x, y + r);
      this.arcTo(x, y, x + r, y, r);
      return this;
    };
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  §1  VECTOR / MATRIX MATH
   * ════════════════════════════════════════════════════════════════════════ */

  const V3 = {
    create(x = 0, y = 0, z = 0) { return { x, y, z }; },
    add(a, b)  { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
    sub(a, b)  { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
    scale(v, s){ return { x: v.x * s, y: v.y * s, z: v.z * s }; },
    len(v)     { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); },
    norm(v)    { const l = V3.len(v) || 1; return V3.scale(v, 1 / l); },
    dot(a, b)  { return a.x * b.x + a.y * b.y + a.z * b.z; },
    cross(a, b){
      return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      };
    },
    lerp(a, b, t) {
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    },
    clone(v) { return { x: v.x, y: v.y, z: v.z }; }
  };

  /** Rotation around X axis */
  function rotX(v, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
  }
  /** Rotation around Y axis */
  function rotY(v, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
  }
  /** Rotation around Z axis */
  function rotZ(v, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
  }

  /** Perspective project a world-space point → canvas coords */
  function project(p, cam, W, H) {
    // Translate relative to camera
    let v = V3.sub(p, cam.pos);
    // Rotate by negative camera yaw/pitch
    v = rotY(v, -cam.yaw);
    v = rotX(v, -cam.pitch);

    const fov = cam.fov || 600;
    const d = v.z === 0 ? 0.001 : v.z;
    const scale = fov / (fov + d);
    return {
      x: W / 2 + v.x * scale,
      y: H / 2 - v.y * scale,   // flip Y
      z: d,
      scale
    };
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  §2  MANNEQUIN DEFINITION  (joints + bones + poses)
   * ════════════════════════════════════════════════════════════════════════ */

  const JOINT_NAMES = [
    'head', 'neck',
    'shoulderL', 'elbowL', 'wristL',
    'shoulderR', 'elbowR', 'wristR',
    'spine', 'hip',
    'hipL', 'kneeL', 'ankleL',
    'hipR', 'kneeR', 'ankleR'
  ];

  const BONES = [
    ['head', 'neck'],
    ['neck', 'shoulderL'], ['shoulderL', 'elbowL'], ['elbowL', 'wristL'],
    ['neck', 'shoulderR'], ['shoulderR', 'elbowR'], ['elbowR', 'wristR'],
    ['neck', 'spine'], ['spine', 'hip'],
    ['hip', 'hipL'], ['hipL', 'kneeL'], ['kneeL', 'ankleL'],
    ['hip', 'hipR'], ['hipR', 'kneeR'], ['kneeR', 'ankleR']
  ];

  /** Default standing pose — all coords in local subject space, Y-up */
  function makePose(name) {
    const poses = {
      standing: {
        head:      { x:  0,   y: 170, z: 0 },
        neck:      { x:  0,   y: 150, z: 0 },
        shoulderL: { x: -22,  y: 145, z: 0 },
        elbowL:    { x: -28,  y: 115, z: 5 },
        wristL:    { x: -22,  y:  88, z: 3 },
        shoulderR: { x:  22,  y: 145, z: 0 },
        elbowR:    { x:  28,  y: 115, z: 5 },
        wristR:    { x:  22,  y:  88, z: 3 },
        spine:     { x:  0,   y: 120, z: 0 },
        hip:       { x:  0,   y:  90, z: 0 },
        hipL:      { x: -12,  y:  86, z: 0 },
        kneeL:     { x: -14,  y:  50, z: 2 },
        ankleL:    { x: -14,  y:   5, z: 0 },
        hipR:      { x:  12,  y:  86, z: 0 },
        kneeR:     { x:  14,  y:  50, z: 2 },
        ankleR:    { x:  14,  y:   5, z: 0 }
      },
      sitting: {
        head:      { x:  0,   y: 145, z: 0 },
        neck:      { x:  0,   y: 127, z: 0 },
        shoulderL: { x: -22,  y: 122, z: 0 },
        elbowL:    { x: -30,  y: 100, z: 15 },
        wristL:    { x: -22,  y:  82, z: 25 },
        shoulderR: { x:  22,  y: 122, z: 0 },
        elbowR:    { x:  30,  y: 100, z: 15 },
        wristR:    { x:  22,  y:  82, z: 25 },
        spine:     { x:  0,   y: 100, z: 0 },
        hip:       { x:  0,   y:  72, z: 0 },
        hipL:      { x: -12,  y:  68, z: 0 },
        kneeL:     { x: -14,  y:  40, z: 40 },
        ankleL:    { x: -14,  y:   5, z: 42 },
        hipR:      { x:  12,  y:  68, z: 0 },
        kneeR:     { x:  14,  y:  40, z: 40 },
        ankleR:    { x:  14,  y:   5, z: 42 }
      },
      leaning: {
        head:      { x:  10,  y: 165, z: -12 },
        neck:      { x:  8,   y: 147, z: -8 },
        shoulderL: { x: -14,  y: 142, z: -6 },
        elbowL:    { x: -30,  y: 120, z: -20 },
        wristL:    { x: -38,  y: 108, z: -28 },
        shoulderR: { x:  30,  y: 142, z: -6 },
        elbowR:    { x:  42,  y: 125, z: -12 },
        wristR:    { x:  42,  y: 110, z: -5 },
        spine:     { x:  5,   y: 118, z: -5 },
        hip:       { x:  0,   y:  90, z: 0 },
        hipL:      { x: -12,  y:  86, z: 0 },
        kneeL:     { x: -16,  y:  46, z: 6 },
        ankleL:    { x: -16,  y:   5, z: 3 },
        hipR:      { x:  12,  y:  86, z: 0 },
        kneeR:     { x:  18,  y:  48, z: -8 },
        ankleR:    { x:  18,  y:   5, z: -10 }
      },
      walking: {
        head:      { x:  0,   y: 168, z: 2 },
        neck:      { x:  0,   y: 149, z: 2 },
        shoulderL: { x: -22,  y: 144, z: 2 },
        elbowL:    { x: -26,  y: 118, z: -18 },
        wristL:    { x: -22,  y:  98, z: -24 },
        shoulderR: { x:  22,  y: 144, z: 2 },
        elbowR:    { x:  26,  y: 118, z: 20 },
        wristR:    { x:  22,  y:  98, z: 26 },
        spine:     { x:  0,   y: 119, z: 2 },
        hip:       { x:  0,   y:  90, z: 0 },
        hipL:      { x: -12,  y:  86, z: 0 },
        kneeL:     { x: -14,  y:  50, z: 25 },
        ankleL:    { x: -14,  y:   8, z: 18 },
        hipR:      { x:  12,  y:  86, z: 0 },
        kneeR:     { x:  14,  y:  50, z: -22 },
        ankleR:    { x:  14,  y:   8, z: -16 }
      },
      crouching: {
        head:      { x:  0,   y: 120, z: 10 },
        neck:      { x:  0,   y: 105, z:  8 },
        shoulderL: { x: -22,  y: 100, z:  8 },
        elbowL:    { x: -30,  y:  80, z: 22 },
        wristL:    { x: -24,  y:  60, z: 30 },
        shoulderR: { x:  22,  y: 100, z:  8 },
        elbowR:    { x:  30,  y:  80, z: 22 },
        wristR:    { x:  24,  y:  60, z: 30 },
        spine:     { x:  0,   y:  80, z:  6 },
        hip:       { x:  0,   y:  55, z:  0 },
        hipL:      { x: -12,  y:  52, z:  0 },
        kneeL:     { x: -18,  y:  30, z: 35 },
        ankleL:    { x: -16,  y:   5, z: 20 },
        hipR:      { x:  12,  y:  52, z:  0 },
        kneeR:     { x:  18,  y:  30, z: 35 },
        ankleR:    { x:  16,  y:   5, z: 20 }
      }
    };
    return poses[name] || poses.standing;
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  §3  THEMES & CSS VARIABLES
   * ════════════════════════════════════════════════════════════════════════ */

  const THEMES = {
    dark: {
      '--viewport-bg':     '#0d0d14',
      '--viewport-grid':   '#1a1a2a',
      '--viewport-figure': '#7c6aff',
      '--viewport-joint':  '#e8d84a',
      '--viewport-camera': '#6ee06b',
      '--viewport-frame':  'rgba(255,255,255,0.3)',
      '--vp-panel-bg':     '#111118',
      '--vp-panel-border': '#2a2a38',
      '--vp-text':         '#ccc',
      '--vp-text-muted':   '#777',
      '--vp-btn-bg':       '#1e1e2a',
      '--vp-btn-hover':    '#2a2a3e',
      '--vp-btn-active':   '#7c6aff',
      '--vp-slider-track': '#2a2a3e',
      '--vp-slider-thumb': '#7c6aff',
      '--vp-accept-bg':    '#4ade80',
      '--vp-accept-text':  '#0a0a0c',
      '--vp-joint-hover':  '#ff9f43',
      '--vp-joint-select': '#ff6b6b',
      '--vp-crosshair':    'rgba(255,255,255,0.18)',
      '--vp-grid-accent':  '#2a2a50'
    },
    light: {
      '--viewport-bg':     '#f0f0ee',
      '--viewport-grid':   '#d4d4cc',
      '--viewport-figure': '#5b46e0',
      '--viewport-joint':  '#9e8c10',
      '--viewport-camera': '#2d8a2a',
      '--viewport-frame':  'rgba(0,0,0,0.2)',
      '--vp-panel-bg':     '#ffffff',
      '--vp-panel-border': '#d0d0cc',
      '--vp-text':         '#333',
      '--vp-text-muted':   '#888',
      '--vp-btn-bg':       '#eeeee8',
      '--vp-btn-hover':    '#e0e0d8',
      '--vp-btn-active':   '#5b46e0',
      '--vp-slider-track': '#d8d8d0',
      '--vp-slider-thumb': '#5b46e0',
      '--vp-accept-bg':    '#22a355',
      '--vp-accept-text':  '#fff',
      '--vp-joint-hover':  '#e87a20',
      '--vp-joint-select': '#dc2626',
      '--vp-crosshair':    'rgba(0,0,0,0.12)',
      '--vp-grid-accent':  '#c0c0b8'
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  §4  VIEWPORT3D CLASS
   * ════════════════════════════════════════════════════════════════════════ */

  class Viewport3D {
    constructor(container, opts = {}) {
      this._container = typeof container === 'string'
        ? document.querySelector(container)
        : container;
      if (!this._container) throw new Error('Viewport3D: container element not found');

      this._onAccept   = opts.onAccept || null;
      this._theme      = opts.theme || 'dark';

      // State
      this._cam = {
        yaw:   0.45,     // orbit azimuth
        pitch: 0.2,      // orbit elevation
        dist:  420,       // distance from origin
        fov:   600,
        pos:   V3.create()
      };
      this._subjectRotation = 0;        // degrees 0-360
      this._cameraHeight    = 0.5;      // 0 = worm, 0.5 = eye, 1 = bird
      this._cameraTilt      = 0;        // degrees -45 to 45
      this._cameraDistance   = 0.5;      // normalised 0..1
      this._headDirection   = 'facing_camera';
      this._currentPose     = 'standing';

      this._joints = {};
      this._animJoints = {};   // interpolation target
      this._animT = 1;

      this._hoveredJoint  = null;
      this._selectedJoint = null;
      this._isDragging    = false;
      this._isJointDrag   = false;
      this._lastMouse     = { x: 0, y: 0 };

      // Build DOM
      this._build();
      this._applyTheme();
      this._setPose('standing', true);
      this._updateCameraFromSliders();

      // Start render loop
      this._raf = null;
      this._startLoop();

      // Resize observer
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this._container);
    }

    /* ─── public API ─── */

    reset() {
      this._subjectRotation = 0;
      this._cameraHeight    = 0.5;
      this._cameraTilt      = 0;
      this._cameraDistance   = 0.5;
      this._headDirection   = 'facing_camera';
      this._cam.yaw   = 0.45;
      this._cam.pitch = 0.2;
      this._selectedJoint = null;
      this._hoveredJoint  = null;
      this._setPose('standing', true);
      this._syncControlsToState();
      this._updateCameraFromSliders();
    }

    getSettings() {
      return this._deriveSettings();
    }

    setTheme(t) {
      this._theme = (t === 'light') ? 'light' : 'dark';
      this._applyTheme();
    }

    destroy() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root);
    }

    /* ─── DOM construction ─── */

    _build() {
      const root = document.createElement('div');
      root.className = 'vp3d-root';
      root.style.cssText = 'width:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;';

      // Canvas wrapper (4:3)
      const cw = document.createElement('div');
      cw.className = 'vp3d-canvas-wrap';
      cw.style.cssText = 'position:relative;width:100%;padding-bottom:75%;overflow:hidden;border-radius:10px 10px 0 0;cursor:grab;';

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
      cw.appendChild(canvas);

      // Info overlay (top-left)
      const info = document.createElement('div');
      info.className = 'vp3d-info';
      info.style.cssText = 'position:absolute;top:10px;left:12px;font-size:10px;pointer-events:none;line-height:1.6;';
      cw.appendChild(info);

      // Joint tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'vp3d-tooltip';
      tooltip.style.cssText = 'position:absolute;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:600;pointer-events:none;display:none;white-space:nowrap;letter-spacing:0.04em;text-transform:uppercase;';
      cw.appendChild(tooltip);

      root.appendChild(cw);

      // Controls panel
      const panel = document.createElement('div');
      panel.className = 'vp3d-panel';
      panel.style.cssText = 'padding:14px 16px 10px;border-radius:0 0 10px 10px;';

      panel.innerHTML = this._panelHTML();
      root.appendChild(panel);

      this._container.appendChild(root);

      // Cache refs
      this._root    = root;
      this._canvasWrap = cw;
      this._canvas  = canvas;
      this._ctx     = canvas.getContext('2d');
      this._info    = info;
      this._tooltip = tooltip;
      this._panel   = panel;

      this._resize();
      this._bindEvents();
    }

    _panelHTML() {
      const sl = (id, label, min, max, step, val, unit = '') =>
        `<div class="vp3d-ctrl">
          <label class="vp3d-lbl">${label}</label>
          <div class="vp3d-slider-row">
            <input type="range" class="vp3d-range" id="vp-${id}" min="${min}" max="${max}" step="${step}" value="${val}">
            <span class="vp3d-val" id="vp-${id}-val">${val}${unit}</span>
          </div>
        </div>`;

      return `
        <div class="vp3d-ctrl-grid">
          ${sl('subRot',    'Subject Rotation',  0, 360, 1,  0,   '°')}
          ${sl('camHeight', 'Camera Height',     0, 100, 1, 50,   '%')}
          ${sl('camTilt',   'Camera Tilt',     -45,  45, 1,  0,   '°')}
          ${sl('camDist',   'Camera Distance',   0, 100, 1, 50,   '%')}
        </div>
        <div class="vp3d-ctrl-row" style="margin-top:10px;">
          <div class="vp3d-ctrl" style="flex:1;">
            <label class="vp3d-lbl">Head Direction</label>
            <select class="vp3d-select" id="vp-headDir">
              <option value="facing_camera">Facing Camera</option>
              <option value="left">Looking Left</option>
              <option value="right">Looking Right</option>
              <option value="up">Looking Up</option>
              <option value="down">Looking Down</option>
              <option value="over_shoulder">Over Shoulder</option>
            </select>
          </div>
        </div>
        <div class="vp3d-ctrl" style="margin-top:10px;">
          <label class="vp3d-lbl">Body Pose</label>
          <div class="vp3d-pose-btns" id="vp-poseBtns">
            <button class="vp3d-pose-btn active" data-pose="standing">Standing</button>
            <button class="vp3d-pose-btn" data-pose="sitting">Sitting</button>
            <button class="vp3d-pose-btn" data-pose="leaning">Leaning</button>
            <button class="vp3d-pose-btn" data-pose="walking">Walking</button>
            <button class="vp3d-pose-btn" data-pose="crouching">Crouching</button>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;">
          <button class="vp3d-btn vp3d-btn-reset" id="vp-resetBtn">↺ Reset</button>
          <button class="vp3d-btn vp3d-btn-accept" id="vp-acceptBtn">✓ Accept & Apply</button>
        </div>
      `;
    }

    /* ─── theme ─── */

    _applyTheme() {
      const vars = THEMES[this._theme] || THEMES.dark;
      for (const [k, v] of Object.entries(vars)) {
        this._root.style.setProperty(k, v);
      }
      this._injectStyles();
    }

    _injectStyles() {
      if (this._styleEl) this._styleEl.remove();
      const s = document.createElement('style');
      s.textContent = `
        .vp3d-root {
          --_bg: var(--viewport-bg, #0d0d14);
          --_grid: var(--viewport-grid, #1a1a2a);
          --_fig: var(--viewport-figure, #7c6aff);
          --_jnt: var(--viewport-joint, #e8d84a);
          --_cam: var(--viewport-camera, #6ee06b);
          --_frame: var(--viewport-frame, rgba(255,255,255,0.3));
        }
        .vp3d-canvas-wrap { background: var(--viewport-bg); }
        .vp3d-info { color: var(--vp-text-muted); }
        .vp3d-tooltip { background: var(--viewport-joint); color: #0a0a0c; }
        .vp3d-panel {
          background: var(--vp-panel-bg);
          border: 1px solid var(--vp-panel-border);
          border-top: none;
        }
        .vp3d-ctrl-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px;
        }
        .vp3d-ctrl-row { display: flex; gap: 14px; }
        .vp3d-lbl {
          display: block; font-size: 9px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--vp-text-muted); margin-bottom: 4px;
        }
        .vp3d-slider-row { display: flex; align-items: center; gap: 8px; }
        .vp3d-range {
          flex: 1; -webkit-appearance: none; appearance: none;
          height: 4px; border-radius: 2px;
          background: var(--vp-slider-track);
          outline: none; cursor: pointer;
        }
        .vp3d-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: var(--vp-slider-thumb);
          border: 2px solid var(--vp-panel-bg); cursor: pointer;
        }
        .vp3d-range::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--vp-slider-thumb);
          border: 2px solid var(--vp-panel-bg); cursor: pointer;
        }
        .vp3d-val {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          color: var(--vp-text); min-width: 34px; text-align: right;
        }
        .vp3d-select {
          width: 100%; padding: 6px 10px; border-radius: 6px;
          border: 1px solid var(--vp-panel-border);
          background: var(--vp-btn-bg); color: var(--vp-text);
          font-size: 11px; font-family: inherit; cursor: pointer;
        }
        .vp3d-select:focus { outline: none; border-color: var(--viewport-figure); }
        .vp3d-pose-btns { display: flex; gap: 4px; flex-wrap: wrap; }
        .vp3d-pose-btn {
          padding: 5px 10px; border-radius: 5px; border: 1px solid var(--vp-panel-border);
          background: var(--vp-btn-bg); color: var(--vp-text);
          font-size: 10px; font-family: inherit; cursor: pointer;
          transition: all 0.15s; font-weight: 500;
        }
        .vp3d-pose-btn:hover { background: var(--vp-btn-hover); }
        .vp3d-pose-btn.active {
          background: var(--vp-btn-active); color: #fff;
          border-color: var(--vp-btn-active);
        }
        .vp3d-btn {
          flex: 1; padding: 9px 12px; border-radius: 6px; border: none;
          font-size: 11px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.15s; text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .vp3d-btn-reset {
          background: var(--vp-btn-bg); color: var(--vp-text);
          border: 1px solid var(--vp-panel-border);
        }
        .vp3d-btn-reset:hover { background: var(--vp-btn-hover); }
        .vp3d-btn-accept {
          background: var(--vp-accept-bg); color: var(--vp-accept-text);
        }
        .vp3d-btn-accept:hover { opacity: 0.88; }

        @media (max-width: 500px) {
          .vp3d-ctrl-grid { grid-template-columns: 1fr; }
        }
      `;
      this._root.appendChild(s);
      this._styleEl = s;
    }

    /* ─── resize ─── */

    _resize() {
      const rect = this._canvasWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this._W = rect.width;
      this._H = rect.height;
      this._canvas.width  = this._W * dpr;
      this._canvas.height = this._H * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ─── events ─── */

    _bindEvents() {
      const c = this._canvas;

      // Mouse down
      c.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        c.setPointerCapture(e.pointerId);
        this._lastMouse = { x: e.clientX, y: e.clientY };

        // Check if click hits a joint
        const hit = this._hitTestJoint(e);
        if (hit) {
          this._selectedJoint = hit;
          this._isJointDrag = true;
          this._canvasWrap.style.cursor = 'move';
        } else {
          this._isDragging = true;
          this._selectedJoint = null;
          this._canvasWrap.style.cursor = 'grabbing';
        }
      });

      // Mouse move
      c.addEventListener('pointermove', (e) => {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;

        if (this._isDragging) {
          this._cam.yaw   += dx * 0.006;
          this._cam.pitch += dy * 0.004;
          this._cam.pitch  = Math.max(-1.2, Math.min(1.2, this._cam.pitch));
          this._lastMouse  = { x: e.clientX, y: e.clientY };
        } else if (this._isJointDrag && this._selectedJoint) {
          // Move joint in screen-projected space
          const j = this._joints[this._selectedJoint];
          if (j) {
            j.x += dx * 0.6;
            j.y -= dy * 0.6;
          }
          this._lastMouse = { x: e.clientX, y: e.clientY };
        } else {
          // Hover detection
          const prev = this._hoveredJoint;
          this._hoveredJoint = this._hitTestJoint(e);
          if (this._hoveredJoint) {
            this._canvasWrap.style.cursor = 'pointer';
            // Tooltip
            const rect = c.getBoundingClientRect();
            const jname = this._hoveredJoint
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/L$/, 'Left').replace(/R$/, 'Right');            this._tooltip.textContent = jname;
            this._tooltip.style.display = 'block';
            this._tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
            this._tooltip.style.top  = (e.clientY - rect.top - 8)  + 'px';
          } else {
            this._canvasWrap.style.cursor = 'grab';
            this._tooltip.style.display = 'none';
          }
        }
      });

      // Mouse up
      c.addEventListener('pointerup', () => {
        this._isDragging  = false;
        this._isJointDrag = false;
        this._canvasWrap.style.cursor = this._hoveredJoint ? 'pointer' : 'grab';
      });

      // Scroll zoom
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        this._cam.dist += e.deltaY * 0.5;
        this._cam.dist = Math.max(150, Math.min(900, this._cam.dist));
      }, { passive: false });

      // Sliders
      const listen = (id, cb) => {
        const el = this._panel.querySelector('#vp-' + id);
        if (!el) return;
        el.addEventListener('input', () => {
          const v = parseFloat(el.value);
          const valEl = this._panel.querySelector('#vp-' + id + '-val');
          cb(v, valEl);
        });
      };

      listen('subRot', (v, el) => {
        this._subjectRotation = v;
        el.textContent = v + '°';
      });
      listen('camHeight', (v, el) => {
        this._cameraHeight = v / 100;
        el.textContent = v + '%';
        this._updateCameraFromSliders();
      });
      listen('camTilt', (v, el) => {
        this._cameraTilt = v;
        el.textContent = v + '°';
        this._updateCameraFromSliders();
      });
      listen('camDist', (v, el) => {
        this._cameraDistance = v / 100;
        el.textContent = v + '%';
        this._updateCameraFromSliders();
      });

      // Head direction select
      const headSel = this._panel.querySelector('#vp-headDir');
      if (headSel) {
        headSel.addEventListener('change', () => {
          this._headDirection = headSel.value;
        });
      }

      // Pose buttons
      const poseBtns = this._panel.querySelectorAll('.vp3d-pose-btn');
      poseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          poseBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._setPose(btn.dataset.pose);
        });
      });

      // Reset button
      const resetBtn = this._panel.querySelector('#vp-resetBtn');
      if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

      // Accept button
      const acceptBtn = this._panel.querySelector('#vp-acceptBtn');
      if (acceptBtn) acceptBtn.addEventListener('click', () => {
        const settings = this._deriveSettings();
        if (this._onAccept) this._onAccept(settings);
      });

      // Prevent context menu on canvas
      c.addEventListener('contextmenu', e => e.preventDefault());
    }

    _hitTestJoint(e) {
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const cam = this._getCamera();
      let closest = null;
      let closestDist = 18; // pixel hit radius

      for (const name of JOINT_NAMES) {
        const j = this._joints[name];
        if (!j) continue;
        const wp = this._worldJoint(name);
        const sp = project(wp, cam, this._W, this._H);
        if (sp.z < 0) continue; // behind camera
        const dx = sp.x - mx;
        const dy = sp.y - my;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) {
          closestDist = d;
          closest = name;
        }
      }
      return closest;
    }

    /* ─── camera ─── */

    _updateCameraFromSliders() {
      // Map height slider to pitch: 0→ worm (pitch ≈ -0.7), 0.5→ eye (0), 1→ bird (0.7)
      const heightPitch = (this._cameraHeight - 0.5) * 1.4;
      this._cam.pitch = heightPitch + (this._cameraTilt * Math.PI / 180) * 0.5;

      // Map distance slider: 0→ very close (180), 1→ far (800)
      this._cam.dist = 180 + this._cameraDistance * 620;
    }

    _getCamera() {
      // Compute camera position from orbit params
      const dist  = this._cam.dist;
      const yaw   = this._cam.yaw;
      const pitch = this._cam.pitch;

      const cy = Math.cos(pitch), sy = Math.sin(pitch);
      const cx = Math.cos(yaw),   sx = Math.sin(yaw);

      const pos = {
        x: dist * cy * sx,
        y: dist * sy + 90,  // orbit around chest-height
        z: dist * cy * cx
      };

      return {
        pos,
        yaw,
        pitch,
        fov: this._cam.fov
      };
    }

    /* ─── poses ─── */

    _setPose(name, instant = false) {
      this._currentPose = name;
      const target = makePose(name);

      if (instant || !this._joints || Object.keys(this._joints).length === 0) {
        // Clone directly
        this._joints = {};
        for (const k of JOINT_NAMES) {
          this._joints[k] = V3.clone(target[k]);
        }
        this._animT = 1;
      } else {
        // Set up interpolation
        this._animSource = {};
        for (const k of JOINT_NAMES) {
          this._animSource[k] = V3.clone(this._joints[k]);
        }
        this._animTarget = target;
        this._animT = 0;
      }
    }

    _tickAnimation(dt) {
      if (this._animT >= 1) return;
      this._animT = Math.min(1, this._animT + dt * 3.5);
      const t = this._easeInOut(this._animT);
      for (const k of JOINT_NAMES) {
        this._joints[k] = V3.lerp(this._animSource[k], this._animTarget[k], t);
      }
    }

    _easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /** Transform a joint from local pose space to world space (with subject rotation) */
    _worldJoint(name) {
      const j = this._joints[name];
      if (!j) return V3.create();
      const a = this._subjectRotation * Math.PI / 180;
      return rotY(j, a);
    }

    /* ─── sync controls ─── */

    _syncControlsToState() {
      const set = (id, val) => {
        const el = this._panel.querySelector('#vp-' + id);
        if (el) el.value = val;
        const valEl = this._panel.querySelector('#vp-' + id + '-val');
        if (valEl) {
          const unit = id === 'camHeight' || id === 'camDist' ? '%' : '°';
          valEl.textContent = val + unit;
        }
      };
      set('subRot',    Math.round(this._subjectRotation));
      set('camHeight', Math.round(this._cameraHeight * 100));
      set('camTilt',   Math.round(this._cameraTilt));
      set('camDist',   Math.round(this._cameraDistance * 100));

      const headSel = this._panel.querySelector('#vp-headDir');
      if (headSel) headSel.value = this._headDirection;

      const poseBtns = this._panel.querySelectorAll('.vp3d-pose-btn');
      poseBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.pose === this._currentPose);
      });
    }

    /* ─── render loop ─── */

    _startLoop() {
      let last = performance.now();
      const loop = (now) => {
        const dt = (now - last) / 1000;
        last = now;
        this._tickAnimation(dt);
        this._render();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* ════════════════════════════════════════════════════════════════════════
     *  §5  RENDERING
     * ════════════════════════════════════════════════════════════════════════ */

    _render() {
      const ctx = this._ctx;
      const W = this._W;
      const H = this._H;
      if (W <= 0 || H <= 0) return;

      const cam = this._getCamera();
      const vars = THEMES[this._theme] || THEMES.dark;

      // Clear
      ctx.fillStyle = vars['--viewport-bg'];
      ctx.fillRect(0, 0, W, H);

      // Draw grid floor
      this._drawGrid(ctx, cam, W, H, vars);

      // Draw mannequin
      this._drawFigure(ctx, cam, W, H, vars);

      // Draw camera indicator
      this._drawCameraIndicator(ctx, cam, W, H, vars);

      // Draw viewfinder frame
      this._drawViewfinder(ctx, W, H, vars);

      // Draw info overlay
      this._drawInfo(vars);
    }

    _drawGrid(ctx, cam, W, H, vars) {
      const gridColor  = vars['--viewport-grid'];
      const accentColor = vars['--vp-grid-accent'];
      const extent = 200;
      const step   = 40;

      ctx.lineWidth = 0.5;

      for (let x = -extent; x <= extent; x += step) {
        const a = project(V3.create(x, 0, -extent), cam, W, H);
        const b = project(V3.create(x, 0,  extent), cam, W, H);
        if (a.z > -cam.fov && b.z > -cam.fov) {
          ctx.strokeStyle = x === 0 ? accentColor : gridColor;
          ctx.lineWidth   = x === 0 ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (let z = -extent; z <= extent; z += step) {
        const a = project(V3.create(-extent, 0, z), cam, W, H);
        const b = project(V3.create( extent, 0, z), cam, W, H);
        if (a.z > -cam.fov && b.z > -cam.fov) {
          ctx.strokeStyle = z === 0 ? accentColor : gridColor;
          ctx.lineWidth   = z === 0 ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    _drawFigure(ctx, cam, W, H, vars) {
      const figColor  = vars['--viewport-figure'];
      const jntColor  = vars['--viewport-joint'];
      const hoverColor = vars['--vp-joint-hover'];
      const selectColor = vars['--vp-joint-select'];

      // Project all joints
      const proj = {};
      for (const name of JOINT_NAMES) {
        const wp = this._worldJoint(name);
        proj[name] = project(wp, cam, W, H);
      }

      // Sort bones by average z-depth (painter's algo, draw far first)
      const sortedBones = [...BONES].sort((a, b) => {
        const za = (proj[a[0]].z + proj[a[1]].z) / 2;
        const zb = (proj[b[0]].z + proj[b[1]].z) / 2;
        return zb - za;  // farther first
      });

      // Draw bones
      ctx.lineCap = 'round';
      for (const [j1, j2] of sortedBones) {
        const a = proj[j1];
        const b = proj[j2];
        if (a.z < -cam.fov * 0.8 || b.z < -cam.fov * 0.8) continue;

        const thick = 2.5 * Math.max(a.scale, b.scale);
        ctx.strokeStyle = figColor;
        ctx.lineWidth = Math.max(1.5, thick);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw joints
      // Sort by z so nearer joints draw on top
      const sortedJoints = [...JOINT_NAMES].sort((a, b) => proj[b].z - proj[a].z);

      for (const name of sortedJoints) {
        const p = proj[name];
        if (p.z < -cam.fov * 0.8) continue;

        const isHead     = name === 'head';
        const isHovered  = name === this._hoveredJoint;
        const isSelected = name === this._selectedJoint;

        let radius = isHead ? 14 * p.scale : 5 * p.scale;
        radius = Math.max(isHead ? 8 : 3, radius);

        // Glow for hover/select
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? selectColor + '44' : hoverColor + '44';
          ctx.fill();
        }

        // Joint circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? selectColor : isHovered ? hoverColor : (isHead ? figColor : jntColor);
        ctx.fill();

        // Head inner detail
        if (isHead) {
          // Face direction indicator
          const headWP = this._worldJoint('head');
          const neckWP = this._worldJoint('neck');
          const faceOffset = this._headFaceOffset();
          const facePt = V3.add(headWP, faceOffset);
          const fp = project(facePt, cam, W, H);

          ctx.beginPath();
          ctx.arc(fp.x, fp.y, 3 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = jntColor;
          ctx.fill();
        }

        // Outline for non-head joints
        if (!isHead) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = figColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    _headFaceOffset() {
      const d = 8;
      const a = this._subjectRotation * Math.PI / 180;
      switch (this._headDirection) {
        case 'left':          return rotY({ x: -d, y: 0, z: 0 }, a);
        case 'right':         return rotY({ x:  d, y: 0, z: 0 }, a);
        case 'up':            return rotY({ x:  0, y: d, z: 0 }, a);
        case 'down':          return rotY({ x:  0, y:-d, z: 0 }, a);
        case 'over_shoulder': return rotY({ x: -d * 0.7, y: 0, z: -d * 0.7 }, a);
        case 'facing_camera':
        default:              return rotY({ x:  0, y: 0, z:-d }, a);
      }
    }

    _drawCameraIndicator(ctx, cam, W, H, vars) {
      const color = vars['--viewport-camera'];

      // Draw a small camera icon in the lower-right of canvas (2D overlay)
      const cx = W - 55;
      const cy = H - 30;
      const s  = 14;

      ctx.save();
      ctx.translate(cx, cy);

      // Camera body
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(-s, -s * 0.6, s * 2, s * 1.2, 3);
      ctx.fill();

      // Lens
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = vars['--viewport-bg'];
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Flash
      ctx.fillStyle = color;
      ctx.fillRect(s * 0.4, -s * 0.6 - 4, s * 0.5, 4);

      ctx.globalAlpha = 1;
      ctx.restore();

      // Label
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.textAlign = 'center';
      ctx.fillText('CAMERA', cx, cy + s + 8);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';

      // Also draw a small orbit position indicator in 3D space
      // Draw camera frustum outline at origin pointing toward subject
      const camPos = cam.pos;
      const pCam = project(camPos, cam, W, H);
      // Not useful to project camera to its own view — skip 3D indicator
    }

    _drawViewfinder(ctx, W, H, vars) {
      const frameColor = vars['--viewport-frame'];
      const crossColor = vars['--vp-crosshair'];

      const pad   = 28;
      const markL = 18;

      ctx.strokeStyle = frameColor;
      ctx.lineWidth   = 1.5;

      // Corner brackets
      const corners = [
        [pad, pad],             // TL
        [W - pad, pad],         // TR
        [W - pad, H - pad],     // BR
        [pad, H - pad]          // BL
      ];
      const dirs = [
        [[1, 0], [0, 1]],       // TL → right, down
        [[-1, 0], [0, 1]],      // TR → left, down
        [[-1, 0], [0, -1]],     // BR → left, up
        [[1, 0], [0, -1]]       // BL → right, up
      ];
      for (let i = 0; i < 4; i++) {
        const [cx, cy] = corners[i];
        const [[dx1, dy1], [dx2, dy2]] = dirs[i];
        ctx.beginPath();
        ctx.moveTo(cx + dx1 * markL, cy + dy1 * markL);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx2 * markL, cy + dy2 * markL);
        ctx.stroke();
      }

      // Center crosshair
      const midX = W / 2, midY = H / 2;
      const cLen = 12;
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(midX - cLen, midY); ctx.lineTo(midX + cLen, midY);
      ctx.moveTo(midX, midY - cLen); ctx.lineTo(midX, midY + cLen);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(midX, midY, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Rule-of-thirds lines (faint)
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 0.3;
      ctx.setLineDash([4, 4]);
      const third = (W - 2 * pad) / 3;
      const thirdH = (H - 2 * pad) / 3;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(pad + third * i, pad);
        ctx.lineTo(pad + third * i, H - pad);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad, pad + thirdH * i);
        ctx.lineTo(W - pad, pad + thirdH * i);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    _drawInfo(vars) {
      const settings = this._deriveSettings();
      this._info.innerHTML = `
        <span style="color:${vars['--viewport-figure']};font-weight:600">POSE</span> ${settings.body_pose}<br>
        <span style="color:${vars['--viewport-camera']};font-weight:600">CAM</span> ${settings.camera_position}<br>
        <span style="color:${vars['--viewport-joint']};font-weight:600">HEAD</span> ${settings.head_direction}<br>
        <span style="color:${vars['--vp-text-muted']}">SHOT</span> ${settings.shot_size}
      `;
    }

    /* ════════════════════════════════════════════════════════════════════════
     *  §6  SETTINGS DERIVATION
     * ════════════════════════════════════════════════════════════════════════ */

    _deriveSettings() {
      return {
        subject_rotation: this._deriveSubjectRotation(),
        camera_position:  this._deriveCameraPosition(),
        camera_height:    this._deriveCameraHeight(),
        camera_tilt:      this._deriveCameraTilt(),
        camera_roll:      'level',
        head_direction:   this._deriveHeadDirection(),
        body_pose:        this._currentPose,
        shot_size:        this._deriveShotSize()
      };
    }

    _deriveSubjectRotation() {
      const d = ((this._subjectRotation % 360) + 360) % 360;
      if (d < 15 || d >= 345) return 'front facing';
      if (d < 60)  return 'front three-quarter right';
      if (d < 105) return 'profile right';
      if (d < 150) return 'rear three-quarter right';
      if (d < 210) return 'back facing';
      if (d < 255) return 'rear three-quarter left';
      if (d < 300) return 'profile left';
      return 'front three-quarter left';
    }

    _deriveCameraPosition() {
      // Combine yaw with height description
      const yawDeg = ((this._cam.yaw * 180 / Math.PI) % 360 + 360) % 360;
      let pos = '';
      if (yawDeg < 30 || yawDeg >= 330) pos = 'front';
      else if (yawDeg < 80)  pos = 'front-right';
      else if (yawDeg < 110) pos = 'right side';
      else if (yawDeg < 160) pos = 'rear-right';
      else if (yawDeg < 200) pos = 'behind';
      else if (yawDeg < 250) pos = 'rear-left';
      else if (yawDeg < 280) pos = 'left side';
      else pos = 'front-left';

      const h = this._deriveCameraHeight();
      return pos + ', ' + h;
    }

    _deriveCameraHeight() {
      const h = this._cameraHeight;
      if (h < 0.12) return "worm's eye extreme low";
      if (h < 0.28) return 'low angle power';
      if (h < 0.42) return 'slightly low angle';
      if (h < 0.58) return 'eye level neutral';
      if (h < 0.72) return 'slight high angle';
      if (h < 0.88) return 'high angle';
      return "bird's eye overhead";
    }

    _deriveCameraTilt() {
      const t = this._cameraTilt;
      if (Math.abs(t) < 5)  return 'level';
      if (t < -20)           return 'strong downward tilt';
      if (t < -5)            return 'slight downward tilt';
      if (t > 20)            return 'strong upward tilt';
      return 'slight upward tilt';
    }

    _deriveHeadDirection() {
      const map = {
        'facing_camera': 'direct eye contact facing camera',
        'left':          'looking left profile',
        'right':         'looking right profile',
        'up':            'looking up aspirational',
        'down':          'looking down introspective',
        'over_shoulder': 'looking over shoulder'
      };
      return map[this._headDirection] || 'facing camera';
    }

    _deriveShotSize() {
      const d = this._cameraDistance;
      if (d < 0.15)     return 'extreme close up face detail';
      if (d < 0.28)     return 'tight headshot';
      if (d < 0.42)     return 'medium close up chest up';
      if (d < 0.58)     return 'waist up half body';
      if (d < 0.72)     return 'three-quarter body';
      if (d < 0.88)     return 'full body';
      return 'wide environmental full body';
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  §7  EXPORT
   * ════════════════════════════════════════════════════════════════════════ */

  window.Viewport3D = Viewport3D;

})();
