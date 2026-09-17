// Web Speech API and Web Audio API helpers for natural Voice Calling experience

export class VoiceAudioManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCtx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.activeVoice = this.findBestIndianVoice();
  }

  // Find the most natural Indian accent voice available in the browser/OS
  private findBestIndianVoice(preferredLang?: 'English' | 'Hindi' | 'Auto', sampleText = ''): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) {
        this.voices = this.synth.getVoices();
      }
    }
    if (!this.voices || this.voices.length === 0) return null;

    const isHindi =
      preferredLang === 'Hindi' ||
      /[\u0900-\u097F]/.test(sampleText) ||
      sampleText.toLowerCase().includes('namaste') ||
      sampleText.toLowerCase().includes('shukriya');

    // 1. If Hindi mode or Hindi text detected, pick top natural Hindi engine
    if (isHindi) {
      const hindiVoice =
        this.voices.find((v) => (v.lang === 'hi-IN' || v.lang === 'hi_IN') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) ||
        this.voices.find((v) => v.lang === 'hi-IN' || v.lang === 'hi_IN') ||
        this.voices.find((v) => v.lang.startsWith('hi')) ||
        this.voices.find((v) => v.name.toLowerCase().includes('hindi'));
      if (hindiVoice) return hindiVoice;
    }

    // 2. High-priority search for Indian English Voice (Arjun - White Collar HR)
    // E.g. Microsoft Prabhat Online (Natural), Madhav, Ravi, Google English (India)
    const naturalIndianMale = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isIndian = lang.includes('en-in') || lang.includes('en_in') || name.includes('india');
      const isMale = name.includes('prabhat') || name.includes('madhav') || name.includes('ravi') || 
                     name.includes('rishi') || name.includes('male') || name.includes('arjun');
      return isIndian && isMale;
    });
    if (naturalIndianMale) return naturalIndianMale;

    const naturalIndian = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isIndian = lang.includes('en-in') || lang.includes('en_in') || name.includes('india');
      const isNaturalOrNeural = name.includes('natural') || name.includes('neural') || name.includes('online') || name.includes('google');
      return isIndian && isNaturalOrNeural;
    });
    if (naturalIndian) return naturalIndian;

    // 3. Any Indian English Voice (Arjun - White Collar HR)
    const indianVoice = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isIndian = lang.includes('en-in') || lang.includes('en_in') || name.includes('india');
      return isIndian;
    });
    if (indianVoice) return indianVoice;

    // 4. Any Google / Microsoft Natural English Voice (Alexa / Assistant tier)
    const googleAssistantVoice = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      return (name.includes('google') && v.lang.startsWith('en')) || 
             (name.includes('natural') && (name.includes('jenny') || name.includes('aria') || name.includes('sonia')));
    });
    if (googleAssistantVoice) return googleAssistantVoice;

    // 5. Any Indian English Voice (en-IN, en_IN, India)
    const indianAny = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      return lang === 'en-in' || lang === 'en_in' || lang.startsWith('en-in') || name.includes('india');
    });
    if (indianAny) return indianAny;

    // 6. Natural sounding female English voice (Siri/Alexa/Google Assistant grade fallback)
    const naturalFemale = this.voices.find((v) => {
      const name = v.name.toLowerCase();
      return (name.includes('natural') || name.includes('neural') || name.includes('samantha') || name.includes('zira') || name.includes('karen')) && v.lang.startsWith('en');
    });
    if (naturalFemale) return naturalFemale;

    // 6. Default English voice
    return this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  // Get current active voice information for UI display
  getActiveVoiceInfo(): { name: string; isIndianAccent: boolean; lang: string } {
    const voice = this.activeVoice || this.findBestIndianVoice();
    if (!voice) {
      return { name: 'Indian English Engine (Synthesized)', isIndianAccent: true, lang: 'en-IN' };
    }
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    const isIndian = lang.includes('in') || name.includes('india') || name.includes('heera') || name.includes('neerja') || name.includes('hindi') || name.includes('veena');
    return {
      name: voice.name,
      isIndianAccent: isIndian,
      lang: voice.lang,
    };
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play realistic phone ring tone
  playRingTone(): () => void {
    try {
      const ctx = this.getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      return () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        } catch {}
      };
    } catch {
      return () => {};
    }
  }

  // Play call connected beep
  playConnectChime() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }

  // Play subtle Google Assistant / Alexa style listening earcon
  playListeningStartChime() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {}
  }

  // Play call disconnect beep
  playDisconnectTone() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }

  // Human Cadence Defaults
  public static readonly DEFAULT_RATE = 0.98;
  public static readonly DEFAULT_PITCH = 1.02;
  public static readonly SENTENCE_PAUSE_MS = 220; // Human breathing interval at sentence ends (. ? ! ।)
  public static readonly CLAUSE_PAUSE_MS = 110;   // Human breathing interval at clause breaks (, ; : — -)
  public static readonly VOCAL_TRANSITION_MS = 35; // Transition between micro-chunks

  private speechQueue: Array<{
    id: string;
    text: string;
    pauseAfterMs: number;
    options: {
      language?: 'English' | 'Hindi' | 'Auto';
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (e: any) => void;
    };
  }> = [];

  private isQueueRunning: boolean = false;
  private activeWord: string = '';
  private wordSubscribers: Set<(word: string) => void> = new Set();
  private pauseTimer: any = null;
  private wordTimerInterval: any = null;

  // Active word subscription for real-time visual UI badge
  subscribeActiveWord(listener: (word: string) => void): () => void {
    this.wordSubscribers.add(listener);
    listener(this.activeWord);
    return () => {
      this.wordSubscribers.delete(listener);
    };
  }

  getActiveWord(): string {
    return this.activeWord;
  }

  private setActiveWord(word: string) {
    this.activeWord = word;
    this.wordSubscribers.forEach((fn) => fn(word));
  }

  // Speak single text directly (interrupts previous speech)
  speak(
    text: string,
    options: {
      language?: 'English' | 'Hindi' | 'Auto';
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (e: any) => void;
    } = {}
  ): void {
    this.stopSpeaking();
    this.enqueueSentence(text, {
      ...options,
      isImmediate: true,
    });
  }

  /**
   * Micro-Token Streaming Pipeline:
   * Dispatches Sentence-by-Sentence with Natural Human Cadence & Micro-Pauses.
   */
  enqueueSentence(
    text: string,
    options: {
      language?: 'English' | 'Hindi' | 'Auto';
      rate?: number;
      pitch?: number;
      isImmediate?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (e: any) => void;
    } = {}
  ): void {
    const cleanedText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanedText) {
      options.onEnd?.();
      return;
    }

    // Determine cadence breathing pause based on punctuation
    let pauseMs = VoiceAudioManager.VOCAL_TRANSITION_MS;
    if (/[.?!।\n]/.test(cleanedText.slice(-2))) {
      pauseMs = VoiceAudioManager.SENTENCE_PAUSE_MS; // 220ms
    } else if (/[,;:—-]/.test(cleanedText.slice(-2))) {
      pauseMs = VoiceAudioManager.CLAUSE_PAUSE_MS; // 110ms
    }

    const item = {
      id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: cleanedText,
      pauseAfterMs: pauseMs,
      options,
    };

    if (options.isImmediate) {
      this.speechQueue = [item];
    } else {
      this.speechQueue.push(item);
    }

    if (!this.isQueueRunning) {
      this.processQueue();
    }
  }

  // Backwards-compatible speakQueue signature used by live audio callers
  speakQueue(
    text: string,
    options: {
      language?: 'English' | 'Hindi' | 'Auto';
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (e: any) => void;
    } = {}
  ): void {
    this.enqueueSentence(text, options);
  }

  private processQueue(): void {
    if (!this.synth || this.speechQueue.length === 0) {
      this.isQueueRunning = false;
      this.setActiveWord('');
      return;
    }

    this.isQueueRunning = true;

    // Resume synth if browser suspended it
    if (this.synth.paused) {
      this.synth.resume();
    }

    const nextItem = this.speechQueue.shift();
    if (!nextItem) {
      this.isQueueRunning = false;
      this.setActiveWord('');
      return;
    }

    const { text, pauseAfterMs, options } = nextItem;
    const utterance = new SpeechSynthesisUtterance(text);

    // Natural Human Cadence: 0.98 conversational rate, 1.02 pitch
    utterance.rate = options.rate ?? VoiceAudioManager.DEFAULT_RATE;
    utterance.pitch = options.pitch ?? VoiceAudioManager.DEFAULT_PITCH;

    const selectedVoice = this.findBestIndianVoice(options.language, text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = options.language === 'Hindi' ? 'hi-IN' : 'en-IN';
    }

    // Split words for fallback active word simulation if onboundary is not emitted
    const words = text.split(/\s+/).filter(Boolean);
    let fallbackWordIdx = 0;

    utterance.onstart = () => {
      options.onStart?.();

      if (words.length > 0) {
        this.setActiveWord(words[0].replace(/[^\w\u0900-\u097F]/g, ''));
      }

      // Smooth fallback word ticker (~180 words/min at rate 0.98 = ~300ms per word)
      const msPerWord = Math.max(180, Math.floor(330 / (utterance.rate || 1)));
      if (this.wordTimerInterval) clearInterval(this.wordTimerInterval);
      this.wordTimerInterval = setInterval(() => {
        fallbackWordIdx++;
        if (fallbackWordIdx < words.length) {
          const w = words[fallbackWordIdx].replace(/[^\w\u0900-\u097F]/g, '');
          if (w) this.setActiveWord(w);
        }
      }, msPerWord);
    };

    // Real-time word boundary hook from browser SpeechSynthesis
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word') {
        const remaining = text.slice(event.charIndex);
        const match = remaining.match(/^\S+/);
        if (match) {
          const spokenWord = match[0].replace(/[^\w\u0900-\u097F]/g, '');
          if (spokenWord) {
            this.setActiveWord(spokenWord);
          }
        }
      }
    };

    const handleSentenceFinish = () => {
      if (this.wordTimerInterval) {
        clearInterval(this.wordTimerInterval);
        this.wordTimerInterval = null;
      }
      this.setActiveWord('');
      this.currentUtterance = null;
      options.onEnd?.();

      // Natural breathing micro-pause before next queue item or silence
      if (this.speechQueue.length > 0) {
        this.pauseTimer = setTimeout(() => {
          this.processQueue();
        }, pauseAfterMs);
      } else {
        this.isQueueRunning = false;
      }
    };

    utterance.onend = () => {
      handleSentenceFinish();
    };

    utterance.onerror = (err) => {
      console.warn('SpeechSynthesis utterance error:', err);
      options.onError?.(err);
      handleSentenceFinish();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Instant Barge-In Protection:
   * Maintained zero-latency floor-yielding; candidate speech instantly silences
   * speech synthesis and clears the word queue.
   */
  stopSpeaking(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.wordTimerInterval) {
      clearInterval(this.wordTimerInterval);
      this.wordTimerInterval = null;
    }

    this.speechQueue = [];
    this.isQueueRunning = false;
    this.setActiveWord('');

    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return !!(this.isQueueRunning || (this.synth && this.synth.speaking));
  }
}

export const voiceAudio = new VoiceAudioManager();
