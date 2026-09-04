// ============================================================
// DK MUSIC — 3D AUDIO ENGINE, VINYL TURNTABLE & 3D VISUALIZER
// ============================================================

class DK_3DAudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.dataArray = null;
    this.isInitialized = false;

    // Visualizer state
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.visualizerMode = 'rings'; // 'rings', 'bars', 'cosmic'
    this.rotationAngle = 0;

    // Vinyl state
    this.vinylEl = null;
    this.tonearmEl = null;
    this.rpm = 33;
    this.isSpinning = false;
  }

  /**
   * Initializes Web Audio Context connected to the audio element
   */
  initWebAudio(audioElement) {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[3D Audio] Web Audio API not supported in this browser.');
        return;
      }

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      // Connect source to analyser and then destination
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('[3D Audio] Web Audio Analyser connected successfully.');
    } catch (err) {
      console.warn('[3D Audio] Web Audio initialization deferred or prevented by browser policy:', err);
    }
  }

  /**
   * Ensures AudioContext is resumed upon user interaction
   */
  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Sets up the 3D Canvas Visualizer
   */
  setupVisualizer(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    if (!this.animFrameId) {
      this.startRenderLoop();
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 400) * dpr;
    this.canvas.height = (rect.height || 300) * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  setVisualizerMode(mode) {
    this.visualizerMode = mode;
  }

  /**
   * Main 3D render loop
   */
  startRenderLoop() {
    const render = () => {
      this.animFrameId = requestAnimationFrame(render);
      if (!this.ctx || !this.canvas) return;

      const width = this.canvas.width / (window.devicePixelRatio || 1);
      const height = this.canvas.height / (window.devicePixelRatio || 1);

      // Get frequency data
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
      } else {
        // Simulated idle subtle rhythm if audio node isn't streaming yet
        if (!this.dummyData) this.dummyData = new Uint8Array(128);
        const t = Date.now() * 0.003;
        for (let i = 0; i < this.dummyData.length; i++) {
          this.dummyData[i] = Math.max(0, Math.sin(t + i * 0.2) * 40 + 20);
        }
        this.dataArray = this.dummyData;
      }

      // Clear with slight trailing dark fade for glowing motion blur
      this.ctx.fillStyle = 'rgba(7, 7, 10, 0.28)';
      this.ctx.fillRect(0, 0, width, height);

      this.rotationAngle += 0.008;

      if (this.visualizerMode === 'rings') {
        this.draw3DRings(width, height);
      } else if (this.visualizerMode === 'bars') {
        this.draw3DBars(width, height);
      } else {
        this.drawCosmicVortex(width, height);
      }
    };

    render();
  }

  /**
   * Mode A: 3D Holographic Concentric Rings
   */
  draw3DRings(w, h) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;
    const data = this.dataArray;
    const numRings = 4;
    const baseRadius = Math.min(w, h) * 0.22;

    // Calculate energy (average of bass bands)
    let bass = 0;
    for (let i = 0; i < 16; i++) bass += (data[i] || 0);
    bass = bass / 16;
    const pulse = (bass / 255) * 35;

    for (let r = 0; r < numRings; r++) {
      const ringRadius = baseRadius + r * 22 + pulse * (1 - r * 0.15);
      const points = 48;
      const angleStep = (Math.PI * 2) / points;

      ctx.beginPath();
      for (let p = 0; p <= points; p++) {
        const angle = p * angleStep + this.rotationAngle * (r % 2 === 0 ? 1 : -1);
        const dataIdx = Math.floor((p / points) * 64) + r * 8;
        const val = (data[dataIdx % data.length] || 0) / 255;
        const offset = val * (28 + r * 8);

        // 3D perspective projection effect
        const radius = ringRadius + offset;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * (radius * 0.65); // Elliptical 3D tilt

        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Holographic Neon Gradients
      const hue = (260 + r * 35 + bass * 0.2) % 360;
      ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.65 - r * 0.12})`;
      ctx.lineWidth = 2.5 + (r === 0 ? 2 : 0);
      ctx.shadowColor = `hsla(${hue}, 95%, 60%, 0.7)`;
      ctx.shadowBlur = 16 + (bass / 255) * 20;
      ctx.stroke();
    }

    // Central pulsing core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + pulse);
    coreGrad.addColorStop(0, 'rgba(139, 92, 246, 0.7)');
    coreGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.3)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 45 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * Mode B: 3D Mirrored Frequency Bars
   */
  draw3DBars(w, h) {
    const ctx = this.ctx;
    const cy = h * 0.55;
    const data = this.dataArray;
    const numBars = 36;
    const barWidth = (w * 0.8) / numBars;
    const startX = w * 0.1;

    for (let i = 0; i < numBars; i++) {
      const val = (data[i * 2] || 0) / 255;
      const barHeight = val * (h * 0.42);
      const x = startX + i * barWidth;

      const grad = ctx.createLinearGradient(0, cy - barHeight, 0, cy + barHeight * 0.4);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#8b5cf6');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0.2)');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
      ctx.shadowBlur = 10;

      // Draw top bar
      ctx.fillRect(x, cy - barHeight, barWidth - 3, barHeight);

      // Draw 3D floor reflection bar with lower opacity
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(x, cy + 4, barWidth - 3, barHeight * 0.35);
    }
    ctx.shadowBlur = 0;
  }

  /**
   * Mode C: Cosmic Particle Vortex
   */
  drawCosmicVortex(w, h) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;
    const data = this.dataArray;
    const numParticles = 60;

    for (let i = 0; i < numParticles; i++) {
      const val = (data[i % 32] || 0) / 255;
      const dist = (i / numParticles) * Math.min(w, h) * 0.45 + val * 20;
      const angle = i * 0.3 + this.rotationAngle * 1.5;

      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * (dist * 0.7);

      const size = 2 + val * 4;
      ctx.fillStyle = i % 2 === 0 ? '#a78bfa' : '#38bdf8';
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ── 3D Vinyl Turntable Engine ───────────────────────────────

  bindTurntable(vinylElement, tonearmElement) {
    this.vinylEl = vinylElement;
    this.tonearmEl = tonearmElement;
  }

  setTurntablePlaying(isPlaying) {
    this.isSpinning = isPlaying;
    if (this.vinylEl) {
      if (isPlaying) {
        this.vinylEl.classList.add('spinning');
        this.vinylEl.style.animationPlayState = 'running';
      } else {
        this.vinylEl.style.animationPlayState = 'paused';
      }
    }
    if (this.tonearmEl) {
      this.tonearmEl.classList.toggle('playing', isPlaying);
    }
  }

  setSpeed(rpm) {
    this.rpm = rpm;
    if (this.vinylEl) {
      const dur = rpm === 45 ? '1.33s' : '1.8s';
      this.vinylEl.style.animationDuration = dur;
    }
  }

  updateVinylCover(coverUrl) {
    const labelImg = document.getElementById('vinylCenterLabelImg');
    const labelPlaceholder = document.getElementById('vinylCenterPlaceholder');
    if (labelImg) {
      if (coverUrl) {
        labelImg.src = coverUrl;
        labelImg.style.display = 'block';
        if (labelPlaceholder) labelPlaceholder.style.display = 'none';
      } else {
        labelImg.style.display = 'none';
        if (labelPlaceholder) labelPlaceholder.style.display = 'flex';
      }
    }
  }
}

// ── 3D Card Parallax Tilt Effect ─────────────────────────────
function init3DCardTilt() {
  document.querySelectorAll('.album-card, .playlist-card, .quick-card, .hero-banner').forEach(card => {
    if (card._hasTilt) return;
    card._hasTilt = true;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

window.DK_3DAudio = new DK_3DAudioEngine();
window.DK_Init3DTilt = init3DCardTilt;
