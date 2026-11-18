import Peer, { DataConnection } from 'peerjs';
import { GameState } from '../types/game';

export type NetworkRole = 'host' | 'guest' | 'offline';

export interface NetworkMessage {
  type: 'SYNC_STATE' | 'ROLL' | 'SELECT_WEAPON' | 'ATTACK' | 'RESET' | 'REACTION' | 'PING' | 'PONG';
  payload?: any;
}

// Enterprise-grade public STUN and free TURN relay servers for cross-network (NAT/Cellular) traversal
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Google Public STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },

  // Cloudflare STUN server
  { urls: 'stun:stun.cloudflare.com:3478' },

  // Free OpenRelay TURN servers (Metered.ca) - enables cross-carrier 4G/5G mobile & symmetric NAT traversal
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export class P2PNetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private heartbeatInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private retryAttempts: number = 0;
  private maxRetries: number = 4;
  private retryTimer: number | null = null;

  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public isConnected: boolean = false;

  // Callbacks
  public onStateSync?: (state: Partial<GameState>) => void;
  public onOpponentConnected?: () => void;
  public onOpponentDisconnected?: () => void;
  public onReaction?: (reaction: string) => void;
  public onStatusChange?: (status: string) => void;

  // Generate random readable room code: e.g. SM-7492
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SM-${code}`;
  }

  // Normalize any user input (e.g. "SM-7492", "7492", "sm7492", or full URL) into consistent display and peer IDs
  static normalizeRoomCode(input: string): { displayCode: string; peerId: string; cleanCode: string } {
    let clean = (input || '').trim();
    if (clean.includes('room=')) {
      clean = clean.split('room=')[1].split('&')[0];
    }
    clean = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('SM') && clean.length > 2) {
      clean = clean.substring(2);
    }
    clean = clean.slice(0, 6);
    return {
      cleanCode: clean,
      displayCode: clean ? `SM-${clean}` : '',
      peerId: `stickmanwar-${clean.toLowerCase()}`
    };
  }

  // Host a new room
  hostRoom(roomCode: string, onReady: (code: string) => void, onError: (err: string) => void) {
    this.cleanup();
    this.role = 'host';

    const { displayCode, peerId } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    this.onStatusChange?.('Connecting to public signaling relay...');

    try {
      this.peer = new Peer(peerId, {
        config: {
          iceServers: DEFAULT_ICE_SERVERS,
          iceCandidatePoolSize: 10
        },
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('[P2P Host] Registered with ID:', id);
        this.onStatusChange?.('Room active! Waiting for opponent to join...');
        onReady(displayCode);
      });

      this.peer.on('connection', (connection) => {
        console.log('[P2P Host] Incoming peer connection received');
        this.conn = connection;
        this.setupConnectionHandlers();
      });

      this.peer.on('error', (err: any) => {
        console.error('[P2P Host Error]:', err);
        let msg = err.message || 'Failed to create room';
        if (err.type === 'unavailable-id') {
          msg = `Room code ${displayCode} is already in use. Please generate a new code.`;
        } else if (err.type === 'network') {
          msg = 'Network connection issue with signaling server. Checking connection...';
        }
        this.onStatusChange?.(`Error: ${msg}`);
        onError(msg);
      });

      this.peer.on('disconnected', () => {
        console.warn('[P2P Host] Disconnected from signaling server, attempting reconnect...');
        this.peer?.reconnect();
      });
    } catch (e: any) {
      onError(e.message || 'Failed to initialize WebRTC host');
    }
  }

  // Join an existing room
  joinRoom(roomCode: string, onConnected: () => void, onError: (err: string) => void) {
    this.cleanup();
    this.role = 'guest';

    const { displayCode, peerId: targetPeerId, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    if (!cleanCode) {
      onError('Please enter a valid room code (e.g. SM-XXXX)');
      return;
    }

    this.retryAttempts = 0;
    this.attemptJoin(targetPeerId, displayCode, onConnected, onError);
  }

  private attemptJoin(
    targetPeerId: string,
    displayCode: string,
    onConnected: () => void,
    onError: (err: string) => void
  ) {
    this.onStatusChange?.(
      this.retryAttempts > 0
        ? `Connecting to ${displayCode} (Attempt ${this.retryAttempts + 1}/${this.maxRetries})...`
        : `Locating Match Room ${displayCode}...`
    );

    try {
      this.peer = new Peer({
        config: {
          iceServers: DEFAULT_ICE_SERVERS,
          iceCandidatePoolSize: 10
        },
        debug: 1
      });

      // Overall connection timeout guard (15s)
      this.connectionTimeout = window.setTimeout(() => {
        if (!this.isConnected) {
          const timeoutMsg = `Could not reach Host room ${displayCode}. Make sure the host has opened the room and is online.`;
          this.onStatusChange?.(timeoutMsg);
          onError(timeoutMsg);
          this.cleanup();
        }
      }, 15000);

      this.peer.on('open', (guestId) => {
        console.log('[P2P Guest] Registered self ID:', guestId, 'Connecting to host:', targetPeerId);
        this.onStatusChange?.('Found room! Negotiating cross-network STUN/TURN connection...');

        const connection = this.peer!.connect(targetPeerId, {
          reliable: true,
          serialization: 'json'
        });

        this.conn = connection;
        this.setupConnectionHandlers(onConnected);
      });

      this.peer.on('error', (err: any) => {
        console.error('[P2P Guest Error]:', err);
        // If host peer is not yet available, retry smoothly
        if (err.type === 'peer-unavailable' && this.retryAttempts < this.maxRetries - 1) {
          this.retryAttempts++;
          this.onStatusChange?.(`Host initializing... Retrying in 1.5s (${this.retryAttempts}/${this.maxRetries})...`);
          this.retryTimer = window.setTimeout(() => {
            if (this.peer) this.peer.destroy();
            this.attemptJoin(targetPeerId, displayCode, onConnected, onError);
          }, 1500);
          return;
        }

        let msg = err.message || 'Error connecting to room';
        if (err.type === 'peer-unavailable') {
          msg = `Room ${displayCode} not found. Please check that the host is active and code is correct.`;
        }
        this.onStatusChange?.(`Failed: ${msg}`);
        onError(msg);
      });
    } catch (e: any) {
      onError(e.message || 'Failed to initialize WebRTC guest');
    }
  }

  private setupConnectionHandlers(onConnectedCallback?: () => void) {
    if (!this.conn) return;

    this.conn.on('open', () => {
      console.log('[P2P Connection Established] Tunnel open with peer!');
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      this.isConnected = true;
      this.onStatusChange?.('Connected! Entering battle...');
      this.startHeartbeat();

      if (onConnectedCallback) onConnectedCallback();
      if (this.onOpponentConnected) this.onOpponentConnected();
    });

    this.conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      if (!msg) return;

      if (msg.type === 'PING') {
        this.send({ type: 'PONG' });
        return;
      }
      if (msg.type === 'PONG') {
        // Keepalive acknowledged
        return;
      }
      if (msg.type === 'SYNC_STATE' && this.onStateSync) {
        this.onStateSync(msg.payload);
      } else if (msg.type === 'REACTION' && this.onReaction) {
        this.onReaction(msg.payload);
      }
    });

    this.conn.on('close', () => {
      console.warn('[P2P Connection] Connection closed by peer');
      this.isConnected = false;
      this.stopHeartbeat();
      this.onStatusChange?.('Opponent disconnected');
      if (this.onOpponentDisconnected) this.onOpponentDisconnected();
    });

    this.conn.on('error', (err) => {
      console.error('[P2P Connection Error]:', err);
    });

    // Monitor underlying RTCPeerConnection ICE states
    const pc = (this.conn as any).peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('[WebRTC ICE State]:', state);
        if (state === 'checking') {
          this.onStatusChange?.('Punching NAT / Connecting via STUN & TURN...');
        } else if (state === 'connected' || state === 'completed') {
          this.onStatusChange?.('P2P connection established!');
        } else if (state === 'failed') {
          console.warn('[WebRTC ICE Failed] Attempting ICE restart...');
          if (typeof (pc as any).restartIce === 'function') {
            (pc as any).restartIce();
          }
        }
      };
    }
  }

  // Periodic ping to keep UDP/TCP NAT translation tables alive on mobile networks
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.conn && this.conn.open) {
        try {
          this.conn.send({ type: 'PING' });
        } catch {
          // Ignore transient send glitches
        }
      }
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send message to peer
  send(message: NetworkMessage) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(message);
      } catch (err) {
        console.error('[P2P Send Error]:', err);
      }
    }
  }

  // Broadcast full or partial state sync
  syncState(state: Partial<GameState>) {
    this.send({
      type: 'SYNC_STATE',
      payload: state
    });
  }

  // Send fun reaction emoji/stamp
  sendReaction(reaction: string) {
    this.send({
      type: 'REACTION',
      payload: reaction
    });
  }

  cleanup() {
    this.stopHeartbeat();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.isConnected = false;
  }

  disconnect() {
    this.cleanup();
    this.role = 'offline';
    this.roomCode = '';
  }
}

export const networkManager = new P2PNetworkManager();
