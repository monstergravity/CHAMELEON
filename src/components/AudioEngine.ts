/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicInterval: any = null;
  private isMuted: boolean = false;
  private isPlayingMusic: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.3, this.ctx.currentTime);
    }
  }

  toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  playSplat() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  playCollect() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t); // C5
    osc1.frequency.setValueAtTime(659.25, t + 0.08); // E5
    osc1.frequency.setValueAtTime(783.99, t + 0.16); // G5
    osc1.frequency.setValueAtTime(1046.50, t + 0.24); // C6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, t);
    osc2.frequency.setValueAtTime(1318.51, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);
  }

  playAlert(intensity: number) {
    // intensity 0 to 1
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400 + intensity * 600, t);
    osc.frequency.linearRampToValueAtTime(300 + intensity * 400, t + 0.1);

    gain.gain.setValueAtTime(0.15 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  playSpotted() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.5);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  playWin() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C Major scale
    const delay = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * delay);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + idx * delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * delay + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + idx * delay);
      osc.stop(t + idx * delay + 0.35);
    });
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.isPlayingMusic) return;
    this.isPlayingMusic = true;

    let step = 0;
    // Simple 8-bit bassline/arpeggio loop (stealth mood)
    const notes = [110.00, 110.00, 130.81, 146.83, 110.00, 110.00, 164.81, 146.83]; // A2 bass notes
    const melodies = [220.00, 0, 261.63, 0, 220.00, 329.63, 293.66, 0];

    const playStep = () => {
      if (this.isMuted || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      
      // Bass Synth
      const bassFreq = notes[step % notes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, t);
      
      bassGain.gain.setValueAtTime(0.08, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain!);
      
      bassOsc.start(t);
      bassOsc.stop(t + 0.32);

      // Random stealthy high bell sound occasionally
      if (melodies[step % melodies.length] > 0 && Math.random() > 0.4) {
        const melFreq = melodies[step % melodies.length] * 2;
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        
        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(melFreq, t);
        
        melGain.gain.setValueAtTime(0.03, t);
        melGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        
        melOsc.connect(melGain);
        melGain.connect(this.musicGain!);
        
        melOsc.start(t);
        melOsc.stop(t + 0.22);
      }

      step++;
    };

    // Run interval
    this.musicInterval = setInterval(playStep, 350);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isPlayingMusic = false;
  }
}

export const audio = new AudioEngine();
