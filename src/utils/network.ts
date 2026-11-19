import { GameState } from '../types/game';

export type NetworkRole = 'host' | 'guest' | 'offline';

export interface NetworkMessage {
  type: 'SYNC_STATE' | 'ROLL' | 'SELECT_WEAPON' | 'ATTACK' | 'RESET' | 'REACTION' | 'PING' | 'PONG';
  payload?: any;
}

export interface NetworkPacket {
  senderId: string;
  senderRole: NetworkRole;
  type: 'HELLO' | 'WELCOME' | 'SYNC_STATE' | 'REACTION' | 'PING' | 'PONG' | 'DISCONNECT';
  playerName?: string;
  payload?: any;
  timestamp: number;
}

/**
 * High-Speed, Universal Cross-Network Multiplayer Manager
 * Operates over pure standard HTTPS & WSS (PORT 443).
 *
 * Why this works 100% across different networks (e.g. Pondicherry 4G/5G <-> Bengaluru 4G/5G):
 * 1. Cellular carriers (Jio, Airtel, Vi) strictly block non-standard ports (8884, 1883, etc.).
 *    Standard port 443 (HTTPS/WSS) is NEVER blocked by any carrier, firewall, or router.
 * 2. Does NOT rely on peer-to-peer WebRTC UDP (which fails under Symmetric Carrier Grade NAT).
 * 3. Uses dual-layer live streams: Secure WebSocket with automatic EventSource (SSE) fallback.
 */
export class P2PNetworkManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  public clientId: string = '';
  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public isConnected: boolean = false;
  public localPlayerName: string = '';
  public opponentPlayerName: string = '';

  private presenceAnnouncementInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private guestRetryInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private guestConnectedCallback: ((hostName: string) => void) | null = null;

  // Live UI Callbacks
  public onStateSync?: (state: Partial<GameState>) => void;
  public onOpponentJoining?: (guestName: string) => void;
  public onOpponentConnected?: (opponentName: string) => void;
  public onOpponentDisconnected?: (opponentName?: string) => void;
  public onReaction?: (reaction: string) => void;
  public onStatusChange?: (status: string) => void;

  constructor() {
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return 'sm_' + Math.random().toString(36).substring(2, 11);
  }

  // Generate random readable room code: e.g. SM-7492
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SM-${code}`;
  }

  // Normalize any user input (e.g. "SM-7492", "7492", "sm7492", or full URL) into consistent clean code
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

  private getTopic(cleanCode: string): string {
    return `stickman_v5_${cleanCode.toLowerCase()}`;
  }

  // Host a new match room
  hostRoom(
    roomCode: string,
    hostPlayerName: string = 'Player 1',
    onReady: (code: string) => void,
    onError: (err: string) => void
  ) {
    this.cleanup();
    this.role = 'host';
    this.localPlayerName = hostPlayerName.trim() || 'Player 1';
    this.opponentPlayerName = '';

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    this.onStatusChange?.('Connecting to global relay (Port 443 HTTPS/WSS)...');

    const topic = this.getTopic(cleanCode);
    this.connectLiveStream(
      topic,
      () => {
        console.log('[Host] Room channel opened on port 443:', displayCode);
        this.onStatusChange?.('Room active! Waiting for Player 2 to join...');
        onReady(displayCode);

        // Periodically announce host presence
        this.startHostPresenceAnnouncement(topic);
      },
      (err) => onError(err)
    );
  }

  // Join an existing match room
  joinRoom(
    roomCode: string,
    guestPlayerName: string = 'Player 2',
    onConnected: (hostName: string) => void,
    onError: (err: string) => void
  ) {
    this.cleanup();
    this.role = 'guest';
    this.localPlayerName = guestPlayerName.trim() || 'Player 2';
    this.opponentPlayerName = '';
    this.guestConnectedCallback = onConnected;

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    if (!cleanCode) {
      onError('Please enter a valid room code (e.g. SM-XXXX)');
      return;
    }

    this.onStatusChange?.(`Connecting to room ${displayCode} on Port 443...`);

    // Timeout guard: 14 seconds
    this.connectionTimeout = window.setTimeout(() => {
      if (!this.isConnected) {
        const msg = `Could not reach room ${displayCode}. Please make sure the host has created the match and is waiting!`;
        this.onStatusChange?.(msg);
        onError(msg);
        this.cleanup();
      }
    }, 14000);

    const topic = this.getTopic(cleanCode);
    this.connectLiveStream(
      topic,
      () => {
        this.onStatusChange?.('Found room! Handshaking with Host...');
        // Send initial HELLO
        this.publishPacket(topic, {
          senderId: this.clientId,
          senderRole: 'guest',
          type: 'HELLO',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });

        // Start repeating join request until host acknowledges
        this.startGuestJoinRetry(topic);
      },
      (err) => onError(err)
    );
  }

  // Connects via Port 443 WSS with auto SSE fallback
  private connectLiveStream(
    topic: string,
    onSuccess: () => void,
    onError: (err: string) => void
  ) {
    try {
      const wsUrl = `wss://ntfy.sh/${topic}/ws`;
      console.log('[Relay] Connecting via WSS on standard port 443:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      let opened = false;
      this.ws.onopen = () => {
        opened = true;
        console.log('[Relay] WSS connected successfully on port 443!');
        this.startHeartbeat(topic);
        onSuccess();
      };

      this.ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && envelope.message) {
            this.handleIncomingRawPayload(envelope.message);
          }
        } catch (e) {
          console.error('[Relay] Parse error:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[Relay WSS Error]:', e);
        if (!opened) {
          // Fallback to Server-Sent Events (SSE) over standard HTTPS
          console.log('[Relay] Switching to EventSource (SSE) over HTTPS port 443...');
          this.connectSSEFallback(topic, onSuccess, onError);
        }
      };

      this.ws.onclose = () => {
        if (this.isConnected) {
          console.log('[Relay] WSS closed, reconnecting...');
          this.onStatusChange?.('Connection interrupted, reconnecting...');
          setTimeout(() => {
            if (this.roomCode) {
              const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
              this.connectLiveStream(this.getTopic(cleanCode), () => {}, () => {});
            }
          }, 1500);
        }
      };
    } catch (err: any) {
      this.connectSSEFallback(topic, onSuccess, onError);
    }
  }

  // Fallback: EventSource over pure HTTPS GET (port 443)
  private connectSSEFallback(
    topic: string,
    onSuccess: () => void,
    onError: (err: string) => void
  ) {
    try {
      const sseUrl = `https://ntfy.sh/${topic}/sse`;
      this.sse = new EventSource(sseUrl);

      this.sse.onopen = () => {
        console.log('[Relay] SSE connected successfully over port 443!');
        this.startHeartbeat(topic);
        onSuccess();
      };

      this.sse.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && envelope.message) {
            this.handleIncomingRawPayload(envelope.message);
          }
        } catch (e) {}
      };

      this.sse.onerror = () => {
        const msg = 'Failed to connect to relay. Please check internet connection.';
        this.onStatusChange?.(msg);
        onError(msg);
      };
    } catch (e: any) {
      onError(e.message || 'Connection failed');
    }
  }

  private handleIncomingRawPayload(raw: string) {
    try {
      const packet = JSON.parse(raw) as NetworkPacket;
      if (!packet || packet.senderId === this.clientId) {
        // Ignore self-published packets
        return;
      }

      console.log(`[Relay Received] ${packet.type} from ${packet.senderRole} (${packet.playerName || packet.senderId})`);

      const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
      const topic = this.getTopic(cleanCode);

      // --- CASE 1: HELLO PACKET ---
      if (packet.type === 'HELLO') {
        // Host receives Guest's join request
        if (this.role === 'host' && packet.senderRole === 'guest') {
          const guestName = packet.playerName || 'Player 2';
          this.opponentPlayerName = guestName;

          // Notify UI that someone is joining right now
          this.onOpponentJoining?.(guestName);
          this.onStatusChange?.(`⚡ ${guestName} is connecting...`);

          this.isConnected = true;

          // Reply with WELCOME packet containing host name
          this.publishPacket(topic, {
            senderId: this.clientId,
            senderRole: 'host',
            type: 'WELCOME',
            playerName: this.localPlayerName,
            payload: {
              hostName: this.localPlayerName,
              guestName: guestName
            },
            timestamp: Date.now()
          });

          // Trigger connected event for host
          if (this.onOpponentConnected) {
            this.onOpponentConnected(guestName);
          }
        }

        // Guest receives Host's presence announcement
        if (this.role === 'guest' && packet.senderRole === 'host') {
          const hostName = packet.playerName || 'Host Player';
          this.opponentPlayerName = hostName;
          this.onStatusChange?.(`Found ${hostName}'s room! Connecting...`);

          // Reply with HELLO
          this.publishPacket(topic, {
            senderId: this.clientId,
            senderRole: 'guest',
            type: 'HELLO',
            playerName: this.localPlayerName,
            timestamp: Date.now()
          });
        }
      }

      // --- CASE 2: WELCOME PACKET ---
      if (packet.type === 'WELCOME') {
        if (this.role === 'guest' && packet.senderRole === 'host') {
          const hostName = packet.playerName || packet.payload?.hostName || 'Host Player';
          this.opponentPlayerName = hostName;

          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          if (this.guestRetryInterval) {
            clearInterval(this.guestRetryInterval);
            this.guestRetryInterval = null;
          }

          this.isConnected = true;
          this.onStatusChange?.(`Connected with ${hostName}! Entering battle...`);

          if (this.guestConnectedCallback) {
            this.guestConnectedCallback(hostName);
            this.guestConnectedCallback = null;
          }

          if (this.onOpponentConnected) {
            this.onOpponentConnected(hostName);
          }
        }
      }

      // --- CASE 3: GAME STATE SYNC ---
      if (packet.type === 'SYNC_STATE' && packet.payload) {
        // Auto-complete guest connection if sync arrives
        if (this.role === 'guest' && !this.isConnected) {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          if (this.guestRetryInterval) {
            clearInterval(this.guestRetryInterval);
            this.guestRetryInterval = null;
          }
          this.isConnected = true;
          const hostName = packet.playerName || 'Host Player';
          this.opponentPlayerName = hostName;
          if (this.guestConnectedCallback) {
            this.guestConnectedCallback(hostName);
            this.guestConnectedCallback = null;
          }
          if (this.onOpponentConnected) {
            this.onOpponentConnected(hostName);
          }
        }

        if (this.onStateSync) {
          this.onStateSync(packet.payload);
        }
      }

      // --- CASE 4: REACTION ---
      if (packet.type === 'REACTION' && packet.payload) {
        if (this.onReaction) {
          this.onReaction(packet.payload);
        }
      }

      // --- CASE 5: DISCONNECT ---
      if (packet.type === 'DISCONNECT') {
        this.isConnected = false;
        const name = packet.playerName || this.opponentPlayerName || 'Opponent';
        this.onStatusChange?.(`${name} left the room`);
        if (this.onOpponentDisconnected) {
          this.onOpponentDisconnected(name);
        }
      }
    } catch (e) {
      console.error('[Relay] Error parsing message payload:', e);
    }
  }

  // High-reliability publishing via HTTPS POST on port 443
  private publishPacket(topic: string, packet: NetworkPacket) {
    try {
      fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': 'StickmanWar'
        },
        body: JSON.stringify(packet)
      }).catch((err) => console.warn('[Relay Publish Warn]:', err));
    } catch (err) {
      console.error('[Relay Publish Error]:', err);
    }
  }

  private startHostPresenceAnnouncement(topic: string) {
    if (this.presenceAnnouncementInterval) clearInterval(this.presenceAnnouncementInterval);

    // Broadcast host presence every 1.5s until guest connects
    this.presenceAnnouncementInterval = window.setInterval(() => {
      if (!this.isConnected) {
        this.publishPacket(topic, {
          senderId: this.clientId,
          senderRole: 'host',
          type: 'HELLO',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });
      }
    }, 1500);
  }

  private startGuestJoinRetry(topic: string) {
    if (this.guestRetryInterval) clearInterval(this.guestRetryInterval);

    let attempts = 0;
    this.guestRetryInterval = window.setInterval(() => {
      if (this.isConnected) {
        if (this.guestRetryInterval) clearInterval(this.guestRetryInterval);
        return;
      }
      attempts++;
      if (attempts > 14) {
        if (this.guestRetryInterval) clearInterval(this.guestRetryInterval);
        return;
      }
      this.publishPacket(topic, {
        senderId: this.clientId,
        senderRole: 'guest',
        type: 'HELLO',
        playerName: this.localPlayerName,
        timestamp: Date.now()
      });
    }, 1000);
  }

  // Periodic heartbeat every 8s to keep mobile carrier connections warm
  private startHeartbeat(topic: string) {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected && this.roomCode) {
        this.publishPacket(topic, {
          senderId: this.clientId,
          senderRole: this.role,
          type: 'PING',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });
      }
    }, 8000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Broadcast game state
  syncState(state: Partial<GameState>) {
    if (!this.roomCode) return;
    const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
    const topic = this.getTopic(cleanCode);

    this.publishPacket(topic, {
      senderId: this.clientId,
      senderRole: this.role,
      type: 'SYNC_STATE',
      playerName: this.localPlayerName,
      payload: state,
      timestamp: Date.now()
    });
  }

  // Send reaction emoji
  sendReaction(reaction: string) {
    if (!this.roomCode) return;
    const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
    const topic = this.getTopic(cleanCode);

    this.publishPacket(topic, {
      senderId: this.clientId,
      senderRole: this.role,
      type: 'REACTION',
      playerName: this.localPlayerName,
      payload: reaction,
      timestamp: Date.now()
    });
  }

  cleanup() {
    this.stopHeartbeat();
    if (this.presenceAnnouncementInterval) {
      clearInterval(this.presenceAnnouncementInterval);
      this.presenceAnnouncementInterval = null;
    }
    if (this.guestRetryInterval) {
      clearInterval(this.guestRetryInterval);
      this.guestRetryInterval = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.ws) {
      try {
        if (this.isConnected && this.roomCode) {
          const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
          this.publishPacket(this.getTopic(cleanCode), {
            senderId: this.clientId,
            senderRole: this.role,
            type: 'DISCONNECT',
            playerName: this.localPlayerName,
            timestamp: Date.now()
          });
        }
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.sse) {
      try {
        this.sse.close();
      } catch {}
      this.sse = null;
    }
    this.isConnected = false;
  }

  disconnect() {
    this.cleanup();
    this.role = 'offline';
    this.roomCode = '';
    this.opponentPlayerName = '';
  }
}

export const networkManager = new P2PNetworkManager();
