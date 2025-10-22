// Sound utility functions using Web Audio API for smooth, pleasant game sounds

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume: number = 0.2) {
    if (!this.enabled || !this.audioContext) return;

    frequencies.forEach(freq => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = type;
      oscillator.frequency.value = freq;

      gainNode.gain.setValueAtTime(volume, this.audioContext!.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);

      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + duration);
    });
  }

  playClick() {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 800;

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  playWin() {
    if (!this.enabled || !this.audioContext) return;

    // Victory melody: C -> E -> G -> C (higher)
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.15 },   // E5
      { freq: 783.99, time: 0.3 },    // G5
      { freq: 1046.50, time: 0.45 }   // C6
    ];

    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, 0.2, 'sine', 0.3);
      }, note.time * 1000);
    });
  }

  playLose() {
    if (!this.enabled || !this.audioContext) return;

    // Descending sad tones: A -> F -> D -> C
    const notes = [
      { freq: 440, time: 0 },         // A4
      { freq: 349.23, time: 0.15 },   // F4
      { freq: 293.66, time: 0.3 },    // D4
      { freq: 261.63, time: 0.45 }    // C4
    ];

    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, 0.25, 'sine', 0.25);
      }, note.time * 1000);
    });
  }

  playTie() {
    if (!this.enabled || !this.audioContext) return;

    // Neutral ascending then descending: C -> E -> C
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.15 },   // E5
      { freq: 523.25, time: 0.3 }     // C5
    ];

    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, 0.2, 'sine', 0.25);
      }, note.time * 1000);
    });
  }
}

export const soundManager = new SoundManager();
