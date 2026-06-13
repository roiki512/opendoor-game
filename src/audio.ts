// Tiny WebAudio synth — no audio files. All sfx are generated oscillators.

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Must be called from a user gesture (autoplay policy). */
  unlock() {
    // Warm the speech-synthesis voice list (it loads asynchronously).
    try {
      window.speechSynthesis.getVoices();
    } catch {
      // no speech synth in this browser
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.18,
    slideTo?: number
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(start: number, duration: number, volume = 0.25) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + start;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start(t0);
  }

  jump() {
    this.tone(280, 0, 0.14, 'square', 0.12, 560);
  }

  hit() {
    this.noise(0, 0.25, 0.3);
    this.tone(160, 0, 0.3, 'sawtooth', 0.2, 55);
  }

  shieldBlock() {
    this.tone(700, 0, 0.1, 'triangle', 0.2, 1100);
    this.tone(1100, 0.08, 0.12, 'triangle', 0.15);
  }

  milestone() {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((f, i) => this.tone(f, i * 0.09, 0.18, 'square', 0.14));
    this.sayFaster();
  }

  /** Pick the most drill-sergeant-ish voice the browser has. */
  private drillVoice(): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices();
      // Deep male voices first; names vary per OS/browser.
      const preferred = [
        'Microsoft David',
        'Microsoft Mark',
        'Google US English',
        'Daniel',
        'Alex',
        'Fred',
      ];
      for (const name of preferred) {
        const v = voices.find((v) => v.name.includes(name));
        if (v) return v;
      }
      return voices.find((v) => v.lang.startsWith('en')) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * A barked "FASTER!" — drill-sergeant style: snare hits + a riser under
   * the deepest male voice the browser offers. (Browser TTS can't truly
   * shout; for a real army bark, drop in a recorded clip.)
   */
  private sayFaster() {
    if (this.muted) return;
    // Two snare raps + a whoosh riser, like a drill cadence
    this.noise(0, 0.07, 0.3);
    this.noise(0.12, 0.07, 0.3);
    this.tone(120, 0.1, 0.5, 'sawtooth', 0.1, 720);
    try {
      const u = new SpeechSynthesisUtterance('FASTER!');
      const v = this.drillVoice();
      if (v) u.voice = v;
      u.rate = 1.15; // clipped and urgent, but not chipmunk
      u.pitch = 0.1; // as deep as the engine allows
      u.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      // no speech synth available — the percussion still plays
    }
  }

  pickup() {
    this.tone(880, 0, 0.09, 'triangle', 0.18);
    this.tone(1320, 0.07, 0.14, 'triangle', 0.16);
  }

  /** Opendoor-logo pickup: a quick rising "cha-ching" arpeggio. */
  boostPickup() {
    const notes = [659, 880, 1175];
    notes.forEach((f, i) => this.tone(f, i * 0.06, 0.12, 'triangle', 0.16));
    this.tone(1760, 0.2, 0.18, 'sine', 0.12);
  }

  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone(f, i * 0.13, 0.3, 'square', 0.15));
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, i * 0.18, 0.32, 'sawtooth', 0.16));
    this.noise(0, 0.4, 0.18);
  }
}
