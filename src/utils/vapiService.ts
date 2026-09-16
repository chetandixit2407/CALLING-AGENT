import Vapi from '@vapi-ai/web';

export const DEFAULT_VAPI_ASSISTANT_ID = 'ed825f7a-e951-444b-81a7-1d6917e439c5';

export type VapiCallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error' | 'key_required';

export interface VapiTranscriptMessage {
  id: string;
  sender: 'agent' | 'candidate';
  text: string;
  timestamp: string;
}

type StatusListener = (status: VapiCallStatus, errorMessage?: string) => void;
type TranscriptListener = (msg: VapiTranscriptMessage) => void;
type VolumeListener = (volume: number) => void;
type SpeakingListener = (isAgentSpeaking: boolean) => void;

/**
 * Vapi Voice Assistant Service for White Collar Realty
 * Enables ultra-low latency, natural turn-taking WebRTC calls
 * using configured Assistant ID: ed825f7a-e951-444b-81a7-1d6917e439c5
 */
class VapiClientService {
  private vapi: Vapi | null = null;
  private currentApiKey: string | null = null;
  private callStatus: VapiCallStatus = 'idle';
  private errorMessage: string | null = null;
  private isMutedState: boolean = false;

  private statusListeners: Set<StatusListener> = new Set();
  private transcriptListeners: Set<TranscriptListener> = new Set();
  private volumeListeners: Set<VolumeListener> = new Set();
  private speakingListeners: Set<SpeakingListener> = new Set();

  /**
   * Save a user-supplied Vapi Public Key locally and in session
   */
  public setStoredPublicKey(key: string): void {
    if (!key || typeof key !== 'string') return;
    const trimmed = key.trim();
    if (trimmed.length > 5) {
      this.currentApiKey = trimmed;
      try {
        localStorage.setItem('VAPI_PUBLIC_KEY', trimmed);
      } catch (e) {
        // LocalStorage might be restricted in some iframes
      }
      // Also notify server to cache
      fetch('/api/vapi-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: trimmed }),
      }).catch(() => {});
    }
  }

  /**
   * Retrieve cached public key if available
   */
  public getStoredPublicKey(): string | null {
    if (this.currentApiKey) return this.currentApiKey;
    try {
      const stored = localStorage.getItem('VAPI_PUBLIC_KEY') || localStorage.getItem('vapi_public_key');
      if (stored && stored.trim().length > 5 && !stored.startsWith('npm')) {
        this.currentApiKey = stored.trim();
        return this.currentApiKey;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Quick check if a public key is configured without throwing
   */
  public async isKeyConfigured(): Promise<boolean> {
    try {
      const key = await this.resolvePublicKey();
      return Boolean(key && key.length > 5);
    } catch {
      return false;
    }
  }

  /**
   * Resolves the Vapi Public Key securely.
   * Priority:
   * 1. Explicitly passed parameter
   * 2. In-memory cached key or localStorage
   * 3. Fetched from server /api/vapi-config (checks process.env.VAPI_PUBLIC_KEY)
   * 4. import.meta.env.VITE_VAPI_PUBLIC_KEY
   */
  public async resolvePublicKey(explicitKey?: string): Promise<string> {
    if (explicitKey?.trim()) {
      const cleaned = explicitKey.trim();
      this.currentApiKey = cleaned;
      return cleaned;
    }

    // Check localStorage or cached
    const stored = this.getStoredPublicKey();
    if (stored) {
      return stored;
    }

    // Check server endpoint (has sanitized key from container environment)
    try {
      const res = await fetch('/api/vapi-config');
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey && typeof data.publicKey === 'string' && data.publicKey.trim()) {
          const trimmed = data.publicKey.trim();
          if (!trimmed.startsWith('npm') && trimmed.length > 5) {
            this.currentApiKey = trimmed;
            return this.currentApiKey;
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch Vapi config from /api/vapi-config:', e);
    }

    // Check client Vite env
    const clientKey = (import.meta as any).env?.VITE_VAPI_PUBLIC_KEY;
    if (clientKey && typeof clientKey === 'string' && clientKey.trim()) {
      const trimmed = clientKey.trim();
      if (!trimmed.startsWith('npm') && trimmed.length > 5) {
        this.currentApiKey = trimmed;
        return this.currentApiKey;
      }
    }

    throw new Error(
      'Vapi Public API Key not detected. Please provide your Vapi Public Key to connect to the live assistant.'
    );
  }

  /**
   * Initializes or returns the Vapi Web SDK client instance.
   */
  public init(publicKey: string): Vapi {
    if (!this.vapi || this.currentApiKey !== publicKey) {
      this.vapi = new Vapi(publicKey);
      this.currentApiKey = publicKey;
      this.bindVapiEvents(this.vapi);
    }
    return this.vapi;
  }

  private bindVapiEvents(client: Vapi) {
    client.on('call-start', () => {
      this.setCallStatus('active');
    });

    client.on('call-end', () => {
      this.setCallStatus('ended');
    });

    client.on('speech-start', () => {
      this.speakingListeners.forEach((l) => l(true));
    });

    client.on('speech-end', () => {
      this.speakingListeners.forEach((l) => l(false));
    });

    client.on('volume-level', (vol: number) => {
      this.volumeListeners.forEach((l) => l(vol));
    });

    client.on('message', (message: any) => {
      this.handleVapiMessage(message);
    });

    client.on('error', (err: any) => {
      console.error('Vapi client error:', err);
      const friendlyMsg = this.formatErrorMessage(err);
      this.errorMessage = friendlyMsg;
      this.setCallStatus('error', friendlyMsg);
    });

    client.on('call-start-failed', (event: any) => {
      console.error('Vapi call-start-failed:', event);
      const friendlyMsg = this.formatErrorMessage(event?.error || 'Failed to start call');
      this.errorMessage = friendlyMsg;
      this.setCallStatus('error', friendlyMsg);
    });
  }

  private lastOutputText: string = '';
  private counter: number = 0;

  private handleVapiMessage(message: any) {
    if (!message) return;

    // Transcript event (primary transcript for both assistant and user)
    if (message.type === 'transcript') {
      const isFinal = message.transcriptType === 'final';
      const role = message.role;
      const text = message.transcript;

      if (isFinal && text?.trim()) {
        this.counter += 1;
        const transcriptMsg: VapiTranscriptMessage = {
          id: `vapi-tr-${Date.now()}-${this.counter}-${Math.random().toString(36).substring(2, 9)}`,
          sender: role === 'assistant' ? 'agent' : 'candidate',
          text: text.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        this.lastOutputText = text.trim();
        this.transcriptListeners.forEach((l) => l(transcriptMsg));
      }
    }

    // Model speech output (only add if not already captured in transcript)
    if (message.type === 'model-output' && message.output?.trim()) {
      const outputText = message.output.trim();
      if (outputText !== this.lastOutputText) {
        this.counter += 1;
        this.lastOutputText = outputText;
        const transcriptMsg: VapiTranscriptMessage = {
          id: `vapi-model-${Date.now()}-${this.counter}-${Math.random().toString(36).substring(2, 9)}`,
          sender: 'agent',
          text: outputText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        this.transcriptListeners.forEach((l) => l(transcriptMsg));
      }
    }
  }

  private formatErrorMessage(err: any): string {
    let raw = '';
    if (typeof err === 'string') {
      raw = err;
    } else if (err && typeof err === 'object') {
      if (typeof err.message === 'string') {
        raw = err.message;
      } else if (typeof err.error === 'string') {
        raw = err.error;
      } else if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
        raw = err.error.message;
      } else {
        try {
          raw = JSON.stringify(err);
        } catch {
          raw = String(err);
        }
      }
    } else {
      raw = String(err || '');
    }

    const lower = (typeof raw === 'string' ? raw : '').toLowerCase();

    if (lower.includes('notallowederror') || lower.includes('permission denied') || lower.includes('microphone')) {
      return 'Microphone permission was denied. Please allow microphone access in your browser address bar to speak with Arjun.';
    }
    if (lower.includes('notfounderror') || lower.includes('device')) {
      return 'No microphone found. Please connect an audio input device and try again.';
    }
    if (lower.includes('public key') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('api key')) {
      return 'Invalid or missing Vapi Public Key. Please check VITE_VAPI_PUBLIC_KEY in your environment/secrets.';
    }
    if (lower.includes('assistant') && (lower.includes('404') || lower.includes('not found'))) {
      return `Vapi Assistant (ID: ${DEFAULT_VAPI_ASSISTANT_ID}) was not found or is not accessible with this API key.`;
    }
    if (lower.includes('webrtc') || lower.includes('network') || lower.includes('ice') || lower.includes('failed to fetch')) {
      return 'Network connection issue connecting to Vapi audio servers. Please check your internet connection.';
    }

    return raw || 'An error occurred while connecting to the Vapi voice assistant.';
  }

  /**
   * Pre-validates microphone permission before starting WebRTC stream
   */
  public async verifyMicrophonePermission(): Promise<void> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Your browser does not support microphone audio capture required for live voice calls.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release test audio tracks immediately so Daily/Vapi WebRTC can bind cleanly
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No microphone detected. Please connect a microphone to continue.');
      }
      throw new Error(`Microphone access error: ${err.message || 'Unable to access microphone'}`);
    }
  }

  /**
   * Start a live call with Vapi Assistant
   */
  public async startCall(
    assistantId: string = DEFAULT_VAPI_ASSISTANT_ID,
    assistantOverrides?: any,
    explicitKey?: string
  ): Promise<any> {
    this.errorMessage = null;
    this.setCallStatus('connecting');

    try {
      // 1. Check microphone access first for graceful handling
      await this.verifyMicrophonePermission();

      // 2. Resolve public API key
      const key = await this.resolvePublicKey(explicitKey);

      // 3. Initialize Vapi instance
      const client = this.init(key);

      // 4. Start call using assistant ID
      const targetAssistantId = assistantId || DEFAULT_VAPI_ASSISTANT_ID;
      const call = await client.start(targetAssistantId, assistantOverrides);
      return call;
    } catch (err: any) {
      console.error('Error starting Vapi call:', err);
      const friendlyMsg = this.formatErrorMessage(err);
      this.errorMessage = friendlyMsg;
      this.setCallStatus('error', friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }

  /**
   * Stop the active Vapi call
   */
  public stopCall(): void {
    if (this.vapi) {
      try {
        this.vapi.stop();
      } catch (e) {
        console.error('Error stopping Vapi call:', e);
      }
    }
    this.setCallStatus('ended');
  }

  /**
   * Reset call status back to idle
   */
  public resetToIdle(): void {
    this.errorMessage = null;
    this.isMutedState = false;
    this.setCallStatus('idle');
  }

  /**
   * Set microphone mute state
   */
  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    if (this.vapi) {
      try {
        this.vapi.setMuted(muted);
      } catch (e) {
        console.error('Error muting Vapi client:', e);
      }
    }
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public getCallStatus(): VapiCallStatus {
    return this.callStatus;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  private setCallStatus(status: VapiCallStatus, errorMsg?: string) {
    this.callStatus = status;
    if (errorMsg) {
      this.errorMessage = errorMsg;
    }
    this.statusListeners.forEach((l) => l(status, errorMsg || this.errorMessage || undefined));
  }

  // Event Subscription methods
  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onTranscript(listener: TranscriptListener): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  public onVolume(listener: VolumeListener): () => void {
    this.volumeListeners.add(listener);
    return () => this.volumeListeners.delete(listener);
  }

  public onSpeaking(listener: SpeakingListener): () => void {
    this.speakingListeners.add(listener);
    return () => this.speakingListeners.delete(listener);
  }
}

export const vapiService = new VapiClientService();
