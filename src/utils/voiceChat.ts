import { PlayerId } from '../types/game';
import { networkManager } from './network';

export interface VoicePeerStatus {
  clientId: string;
  slot: PlayerId;
  playerName: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

export interface VoiceState {
  isSupported: boolean;
  isJoined: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  error: string | null;
  activePeersCount: number;
  // Live status indexed by player slot ('p1' | 'p2' | 'p3' | 'p4')
  speakingSlots: Record<PlayerId, boolean>;
  mutedSlots: Record<PlayerId, boolean>;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // Free Public STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:relay.metered.ca:80' },
    // Metered Open Relay TURN Servers (UDP & TCP ports 80 & 443)
    // Critical for Indian mobile networks (Jio 5G, Airtel, Vi) behind symmetric CGNAT
    {
      urls: 'turn:relay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turns:relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle'
};

export class VoiceChatManager {
  public isSupported: boolean = false;
  public isJoined: boolean = false;
  public isConnecting: boolean = false;
  public isMuted: boolean = false;
  public isSpeaking: boolean = false;
  public error: string | null = null;

  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speechCheckInterval: number | null = null;
  private presenceHeartbeat: number | null = null;
  private isUnlockAttached: boolean = false;

  // Peer connections: remoteClientId -> RTCPeerConnection
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  // Remote audio elements: remoteClientId -> HTMLAudioElement
  private remoteAudios: Map<string, HTMLAudioElement> = new Map();
  // Queued ICE candidates before remote description is set: remoteClientId -> RTCIceCandidateInit[]
  private iceCandidateQueues: Map<string, RTCIceCandidateInit[]> = new Map();
  // Remote peer details: remoteClientId -> VoicePeerStatus
  private remotePeers: Map<string, VoicePeerStatus> = new Map();

  private myClientId: string = '';
  private mySlot: PlayerId = 'p1';
  private myPlayerName: string = '';
  private unsubSignal: (() => void) | null = null;

  private listeners: Array<(state: VoiceState) => void> = [];

  constructor() {
    this.isSupported = typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window.RTCPeerConnection === 'function';
  }

  // Attach touch/click listener to ensure AudioContext and HTML Audio are never blocked by mobile OS
  private attachAudioUnlock() {
    if (this.isUnlockAttached || typeof window === 'undefined') return;
    this.isUnlockAttached = true;

    const unlock = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      this.remoteAudios.forEach((audio) => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {});
        }
      });
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  public subscribe(listener: (state: VoiceState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (e) {
        console.error('[Voice] Error notifying listener:', e);
      }
    });
  }

  public getState(): VoiceState {
    const speakingSlots: Record<PlayerId, boolean> = {
      p1: false,
      p2: false,
      p3: false,
      p4: false
    };
    const mutedSlots: Record<PlayerId, boolean> = {
      p1: false,
      p2: false,
      p3: false,
      p4: false
    };

    if (this.isJoined) {
      speakingSlots[this.mySlot] = this.isSpeaking;
      mutedSlots[this.mySlot] = this.isMuted;
    }

    this.remotePeers.forEach((peer) => {
      if (peer.slot) {
        speakingSlots[peer.slot] = peer.isSpeaking;
        mutedSlots[peer.slot] = peer.isMuted;
      }
    });

    const activePeersCount = (this.isJoined ? 1 : 0) + this.remotePeers.size;

    return {
      isSupported: this.isSupported,
      isJoined: this.isJoined,
      isConnecting: this.isConnecting,
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
      error: this.error,
      activePeersCount,
      speakingSlots,
      mutedSlots
    };
  }

  // Join Voice Channel
  public async joinVoice(mySlot: PlayerId, myPlayerName: string): Promise<boolean> {
    if (!this.isSupported) {
      this.error = 'Voice chat is not supported on this browser';
      this.notify();
      return false;
    }

    if (this.isJoined || this.isConnecting) {
      return true;
    }

    this.isConnecting = true;
    this.error = null;
    this.myClientId = networkManager.clientId;
    this.mySlot = mySlot;
    this.myPlayerName = myPlayerName;
    this.notify();

    try {
      // 1. Request microphone access with high quality speech processing
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });

      this.localStream = stream;
      this.isMuted = false;
      this.isJoined = true;
      this.isConnecting = false;

      // 2. Start audio level analyser & attach touch unlock
      this.startAudioAnalyser(stream);
      this.attachAudioUnlock();

      // 3. Listen for signaling packets from room
      this.unsubSignal = networkManager.addListener('voiceSignal', (signal) => {
        this.handleVoiceSignal(signal);
      });

      // 4. Announce join to room
      networkManager.sendVoiceSignal({
        signalType: 'join',
        fromClientId: this.myClientId,
        slot: this.mySlot,
        playerName: this.myPlayerName,
        isMuted: this.isMuted
      });

      // 5. Start periodic presence announcement every 3.5s
      this.stopHeartbeat();
      this.presenceHeartbeat = window.setInterval(() => {
        if (this.isJoined) {
          networkManager.sendVoiceSignal({
            signalType: 'presence',
            fromClientId: this.myClientId,
            slot: this.mySlot,
            playerName: this.myPlayerName,
            isMuted: this.isMuted,
            isSpeaking: this.isSpeaking
          });
        }
      }, 3500);

      this.notify();
      return true;
    } catch (err: any) {
      console.error('[Voice] Failed to acquire microphone:', err);
      this.isConnecting = false;
      this.isJoined = false;
      this.error = err?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone in browser.'
        : 'Could not access microphone.';
      this.notify();
      return false;
    }
  }

  private stopHeartbeat() {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat);
      this.presenceHeartbeat = null;
    }
  }

  // Leave Voice Channel
  public leaveVoice() {
    if (!this.isJoined && !this.isConnecting) return;

    this.stopHeartbeat();

    // Send leave announcement
    if (this.isJoined) {
      try {
        networkManager.sendVoiceSignal({
          signalType: 'leave',
          fromClientId: this.myClientId
        });
      } catch {}
    }

    this.cleanup();
    this.notify();
  }

  // Update assigned player slot
  public updateSlot(newSlot: PlayerId, newName?: string) {
    this.mySlot = newSlot;
    if (newName) {
      this.myPlayerName = newName;
    }
    if (this.isJoined && this.localStream) {
      networkManager.sendVoiceSignal({
        signalType: 'join',
        fromClientId: this.myClientId,
        slot: this.mySlot,
        playerName: this.myPlayerName,
        isMuted: this.isMuted
      });
      this.notify();
    }
  }

  // Toggle Mute / Unmute
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;

    const nextMuted = !this.isMuted;
    this.isMuted = nextMuted;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (nextMuted) {
      this.isSpeaking = false;
    }

    // Broadcast status
    try {
      networkManager.sendVoiceSignal({
        signalType: 'status',
        fromClientId: this.myClientId,
        slot: this.mySlot,
        isMuted: this.isMuted,
        isSpeaking: this.isSpeaking
      });
    } catch {}

    this.notify();
    return this.isMuted;
  }

  // Web Audio Analyser for Speaking Detection
  private startAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingDebounce = 0;

      this.speechCheckInterval = window.setInterval(() => {
        if (!this.isJoined || this.isMuted || !this.analyser) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.broadcastSpeakingStatus();
            this.notify();
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        // Threshold for human voice
        const isCurrentlySpeaking = avg > 16;

        if (isCurrentlySpeaking) {
          speakingDebounce = 3; // hold speaking state for ~300ms
        } else if (speakingDebounce > 0) {
          speakingDebounce--;
        }

        const nextSpeaking = speakingDebounce > 0;
        if (nextSpeaking !== this.isSpeaking) {
          this.isSpeaking = nextSpeaking;
          this.broadcastSpeakingStatus();
          this.notify();
        }
      }, 100);
    } catch (e) {
      console.warn('[Voice] Audio analyser init failed:', e);
    }
  }

  private broadcastSpeakingStatus() {
    try {
      networkManager.sendVoiceSignal({
        signalType: 'status',
        fromClientId: this.myClientId,
        slot: this.mySlot,
        isMuted: this.isMuted,
        isSpeaking: this.isSpeaking
      });
    } catch {}
  }

  // Handle Incoming WebRTC Signaling
  private async handleVoiceSignal(signal: any) {
    if (!this.isJoined || !signal || signal.fromClientId === this.myClientId) {
      return;
    }

    const { signalType, fromClientId, toClientId } = signal;

    // CASE 1: Peer Joined Voice
    if (signalType === 'join') {
      console.log(`[Voice] Peer joined: ${signal.playerName} (${signal.slot}) from ${fromClientId}`);
      this.remotePeers.set(fromClientId, {
        clientId: fromClientId,
        slot: signal.slot,
        playerName: signal.playerName || 'Commander',
        isMuted: !!signal.isMuted,
        isSpeaking: false
      });
      this.notify();

      // Immediately respond with our presence so the joining peer knows we are already in voice!
      networkManager.sendVoiceSignal({
        signalType: 'presence',
        fromClientId: this.myClientId,
        toClientId: fromClientId,
        slot: this.mySlot,
        playerName: this.myPlayerName,
        isMuted: this.isMuted,
        isSpeaking: this.isSpeaking
      });

      // Tie-breaker: the peer with higher string id initiates the offer
      if (this.myClientId > fromClientId) {
        console.log(`[Voice] Initiating connection to ${fromClientId} (I am offerer)`);
        this.initiatePeerConnection(fromClientId, signal.slot, signal.playerName);
      }
      return;
    }

    // CASE 1B: Presence Announced (from existing peers or periodic heartbeat)
    if (signalType === 'presence') {
      if (toClientId && toClientId !== this.myClientId) {
        return; // Targeted to someone else
      }
      const existing = this.remotePeers.get(fromClientId);
      this.remotePeers.set(fromClientId, {
        clientId: fromClientId,
        slot: signal.slot || existing?.slot || 'p2',
        playerName: signal.playerName || existing?.playerName || 'Commander',
        isMuted: !!signal.isMuted,
        isSpeaking: !!signal.isSpeaking
      });
      this.notify();

      // If we are the offerer (higher clientId) and we don't have a peer connection yet, initiate!
      if (this.myClientId > fromClientId && !this.peerConnections.has(fromClientId)) {
        console.log(`[Voice] Initiating connection to existing peer ${fromClientId} (I am offerer)`);
        this.initiatePeerConnection(fromClientId, signal.slot || 'p2', signal.playerName || 'Commander');
      }
      return;
    }

    // CASE 2: Peer Status Update (Mute / Speaking)
    if (signalType === 'status') {
      const peer = this.remotePeers.get(fromClientId);
      if (peer) {
        peer.isMuted = !!signal.isMuted;
        peer.isSpeaking = !!signal.isSpeaking;
        this.notify();
      }
      return;
    }

    // CASE 3: Peer Left Voice
    if (signalType === 'leave') {
      console.log(`[Voice] Peer left: ${fromClientId}`);
      this.closePeer(fromClientId);
      this.remotePeers.delete(fromClientId);
      this.notify();
      return;
    }

    // Targeted signals: must be addressed to this client
    if (toClientId !== this.myClientId) {
      return;
    }

    // CASE 4: Offer Received
    if (signalType === 'offer' && signal.sdp) {
      console.log(`[Voice] Received offer from ${fromClientId}`);
      await this.handleOffer(fromClientId, signal.sdp, signal.slot, signal.playerName);
      return;
    }

    // CASE 5: Answer Received
    if (signalType === 'answer' && signal.sdp) {
      console.log(`[Voice] Received answer from ${fromClientId}`);
      await this.handleAnswer(fromClientId, signal.sdp);
      return;
    }

    // CASE 6: ICE Candidate Received
    if (signalType === 'ice' && signal.candidate) {
      await this.handleIceCandidate(fromClientId, signal.candidate);
      return;
    }
  }

  // Create Peer Connection and Initiate Offer
  private async initiatePeerConnection(targetClientId: string, targetSlot: PlayerId, targetName: string) {
    try {
      const pc = this.getOrCreatePeerConnection(targetClientId, targetSlot, targetName);

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      networkManager.sendVoiceSignal({
        signalType: 'offer',
        fromClientId: this.myClientId,
        toClientId: targetClientId,
        slot: this.mySlot,
        playerName: this.myPlayerName,
        sdp: pc.localDescription
      });
    } catch (err) {
      console.error(`[Voice] Error creating offer for ${targetClientId}:`, err);
    }
  }

  // Handle Incoming Offer
  private async handleOffer(fromClientId: string, sdp: RTCSessionDescriptionInit, slot: PlayerId, name: string) {
    try {
      const pc = this.getOrCreatePeerConnection(fromClientId, slot, name);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process any queued ICE candidates
      this.flushIceQueue(fromClientId, pc);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      networkManager.sendVoiceSignal({
        signalType: 'answer',
        fromClientId: this.myClientId,
        toClientId: fromClientId,
        slot: this.mySlot,
        playerName: this.myPlayerName,
        sdp: pc.localDescription
      });
    } catch (err) {
      console.error(`[Voice] Error answering offer from ${fromClientId}:`, err);
    }
  }

  // Handle Incoming Answer
  private async handleAnswer(fromClientId: string, sdp: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(fromClientId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this.flushIceQueue(fromClientId, pc);
      }
    } catch (err) {
      console.error(`[Voice] Error setting remote answer from ${fromClientId}:`, err);
    }
  }

  // Handle Incoming ICE Candidate
  private async handleIceCandidate(fromClientId: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peerConnections.get(fromClientId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidate until remote description is set
        const queue = this.iceCandidateQueues.get(fromClientId) || [];
        queue.push(candidate);
        this.iceCandidateQueues.set(fromClientId, queue);
      }
    } catch (err) {
      console.warn(`[Voice] ICE candidate error from ${fromClientId}:`, err);
    }
  }

  private flushIceQueue(clientId: string, pc: RTCPeerConnection) {
    const queue = this.iceCandidateQueues.get(clientId);
    if (queue && queue.length > 0) {
      queue.forEach((cand) => {
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      });
      this.iceCandidateQueues.delete(clientId);
    }
  }

  // Get or Create RTCPeerConnection for a remote peer
  private getOrCreatePeerConnection(clientId: string, slot: PlayerId, name: string): RTCPeerConnection {
    let pc = this.peerConnections.get(clientId);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(clientId, pc);

    // Save peer info
    if (!this.remotePeers.has(clientId)) {
      this.remotePeers.set(clientId, {
        clientId,
        slot,
        playerName: name || 'Commander',
        isMuted: false,
        isSpeaking: false
      });
      this.notify();
    }

    // Add local audio tracks to peer connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc!.addTrack(track, this.localStream!);
      });
    }

    // Ensure audio transceiver direction is sendrecv
    try {
      const transceivers = pc.getTransceivers();
      const audioT = transceivers.find((t) => t.receiver.track.kind === 'audio');
      if (audioT) {
        audioT.direction = 'sendrecv';
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.warn('[Voice] Transceiver config error:', e);
    }

    // On ICE candidate generated
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        networkManager.sendVoiceSignal({
          signalType: 'ice',
          fromClientId: this.myClientId,
          toClientId: clientId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // On remote audio track received
    pc.ontrack = (event) => {
      console.log(`[Voice] Audio track received from ${clientId} (${name})`, event.streams);
      const stream = event.streams[0] || new MediaStream([event.track]);

      // Route 1: Web Audio API (Direct to hardware speakers, immune to mobile HTML5 autoplay policy)
      try {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) this.audioContext = new AudioCtx();
        }
        if (this.audioContext) {
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
          const source = this.audioContext.createMediaStreamSource(stream);
          source.connect(this.audioContext.destination);
          console.log(`[Voice] Connected remote stream to AudioContext destination for ${clientId}`);
        }
      } catch (err) {
        console.warn('[Voice] Web Audio routing error:', err);
      }

      // Route 2: HTML Audio element with mobile playsInline & auto-resume
      let audio = this.remoteAudios.get(clientId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audio.volume = 1.0;
        audio.muted = false;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        this.remoteAudios.set(clientId, audio);
      }
      audio.srcObject = stream;
      audio.play().catch((e) => {
        console.warn('[Voice] Remote audio autoplay blocked:', e);
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE state with ${clientId}:`, pc?.iceConnectionState);
      if (pc?.iceConnectionState === 'failed') {
        console.warn(`[Voice] ICE connection failed with ${clientId}. Attempting restart...`);
        try {
          if (typeof (pc as any).restartIce === 'function') {
            (pc as any).restartIce();
          }
        } catch {}
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] PC state with ${clientId}:`, pc?.connectionState);
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        this.closePeer(clientId);
        this.remotePeers.delete(clientId);
        this.notify();
      }
    };

    return pc;
  }

  private closePeer(clientId: string) {
    const pc = this.peerConnections.get(clientId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      this.peerConnections.delete(clientId);
    }

    const audio = this.remoteAudios.get(clientId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
      this.remoteAudios.delete(clientId);
    }

    this.iceCandidateQueues.delete(clientId);
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.speechCheckInterval) {
      clearInterval(this.speechCheckInterval);
      this.speechCheckInterval = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
      this.analyser = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    this.peerConnections.clear();

    this.remoteAudios.forEach((audio) => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
    });
    this.remoteAudios.clear();

    this.iceCandidateQueues.clear();
    this.remotePeers.clear();

    if (this.unsubSignal) {
      this.unsubSignal();
      this.unsubSignal = null;
    }

    this.isJoined = false;
    this.isConnecting = false;
    this.isSpeaking = false;
    this.isMuted = false;
  }
}

export const voiceManager = new VoiceChatManager();
