import Paho from 'paho-mqtt';
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

interface BrokerEndpoint {
  host: string;
  port: number;
  path: string;
  name: string;
  userName?: string;
  password?: string;
}

// Rock-solid, verified public WSS (TLS WebSocket) brokers that connect in milliseconds
// Tested & verified over cellular data (4G/5G) and broadband across cities (e.g. Pondicherry <-> Bengaluru)
const BROKERS: BrokerEndpoint[] = [
  // Primary: HiveMQ Global Public WSS Relay (High-speed, 99.9% uptime, no credentials required)
  { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', name: 'HiveMQ Global WSS' },
  // Secondary / Failover: Shiftr Cloud Public WSS Relay
  { host: 'public.cloud.shiftr.io', port: 443, path: '/mqtt', name: 'Shiftr Cloud WSS', userName: 'public', password: 'public' }
];

export class P2PNetworkManager {
  private client: Paho.Client | null = null;
  public clientId: string = '';
  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public isConnected: boolean = false;
  public localPlayerName: string = '';
  public opponentPlayerName: string = '';

  private currentBrokerIndex: number = 0;
  private heartbeatInterval: number | null = null;
  private presenceAnnouncementInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private guestRetryInterval: number | null = null;
  private isConnecting: boolean = false;
  private guestConnectedCallback: ((hostName: string) => void) | null = null;

  // Live Callbacks
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
    return 'sm_' + Math.random().toString(36).substring(2, 10);
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

  private getTopicBase(cleanCode: string): string {
    return `stickmanwar/v4/${cleanCode.toLowerCase()}`;
  }

  // Host a new room with host's custom commander name
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

    this.onStatusChange?.(`Connecting to cloud relay (${BROKERS[0].name})...`);
    this.connectToBroker(
      0,
      () => {
        const topic = `${this.getTopicBase(cleanCode)}/#`;
        console.log('[Host] Subscribing to room topic:', topic);
        this.client?.subscribe(topic, {
          qos: 1,
          onSuccess: () => {
            console.log('[Host] Room active on cloud relay:', displayCode);
            this.onStatusChange?.('Room active! Waiting for Player 2 to join...');
            onReady(displayCode);

            // Announce presence periodically with host name
            this.startHostPresenceAnnouncement(cleanCode);
          },
          onFailure: (err) => {
            onError(`Failed to subscribe to room: ${err.errorMessage}`);
          }
        });
      },
      onError
    );
  }

  // Join an existing room with guest's custom commander name
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

    this.onStatusChange?.(`Connecting to room ${displayCode} via cloud relay...`);

    // Timeout guard: 14 seconds
    this.connectionTimeout = window.setTimeout(() => {
      if (!this.isConnected) {
        const msg = `Could not reach room ${displayCode}. Please make sure the host has created the match and is waiting!`;
        this.onStatusChange?.(msg);
        onError(msg);
        this.cleanup();
      }
    }, 14000);

    this.connectToBroker(
      0,
      () => {
        const topic = `${this.getTopicBase(cleanCode)}/#`;
        console.log('[Guest] Subscribing to room topic:', topic);
        this.client?.subscribe(topic, {
          qos: 1,
          onSuccess: () => {
            this.onStatusChange?.('Found room! Handshaking with Host...');
            // Immediately send HELLO packet with guest name
            this.publishPacket(cleanCode, 'presence', {
              senderId: this.clientId,
              senderRole: 'guest',
              type: 'HELLO',
              playerName: this.localPlayerName,
              timestamp: Date.now()
            });

            // Start repeating join request until host responds
            this.startGuestJoinRetry(cleanCode);
          },
          onFailure: (err) => {
            onError(`Could not join room topic: ${err.errorMessage}`);
          }
        });
      },
      onError
    );
  }

  private connectToBroker(
    brokerIndex: number,
    onSuccess: () => void,
    onError: (err: string) => void
  ) {
    this.currentBrokerIndex = brokerIndex;
    const broker = BROKERS[brokerIndex];
    this.clientId = this.generateClientId();

    console.log(`[Relay] Connecting to ${broker.name} (${broker.host}:${broker.port})...`);
    this.isConnecting = true;

    try {
      this.client = new Paho.Client(broker.host, broker.port, broker.path, this.clientId);

      this.client.onConnectionLost = (responseObject) => {
        console.warn('[Relay Connection Lost]:', responseObject.errorMessage);
        this.isConnected = false;
        if (responseObject.errorCode !== 0) {
          this.onStatusChange?.('Connection lost, auto-reconnecting...');
          if (this.onOpponentDisconnected) this.onOpponentDisconnected(this.opponentPlayerName);
        }
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message);
      };

      const connectOptions: Paho.ConnectionOptions = {
        useSSL: true,
        timeout: 4,
        keepAliveInterval: 20,
        cleanSession: true,
        reconnect: true,
        onSuccess: () => {
          console.log(`[Relay] Successfully connected to ${broker.name}!`);
          this.isConnecting = false;
          this.startHeartbeat();
          onSuccess();
        },
        onFailure: (err) => {
          console.warn(`[Relay] Failed to connect to ${broker.name}:`, err.errorMessage);
          this.isConnecting = false;

          // Attempt fallback broker if available
          if (brokerIndex + 1 < BROKERS.length) {
            console.log(`[Relay] Trying fallback broker (${BROKERS[brokerIndex + 1].name})...`);
            this.onStatusChange?.(`Switching to backup relay (${BROKERS[brokerIndex + 1].name})...`);
            this.connectToBroker(brokerIndex + 1, onSuccess, onError);
          } else {
            const failMsg = `Failed to connect to multiplayer cloud relay. Please check your internet connection.`;
            this.onStatusChange?.(failMsg);
            onError(failMsg);
          }
        }
      };

      if (broker.userName) {
        connectOptions.userName = broker.userName;
        connectOptions.password = broker.password;
      }

      this.client.connect(connectOptions);
    } catch (e: any) {
      onError(e.message || 'Error initializing WebSocket relay');
    }
  }

  private handleIncomingMessage(message: Paho.Message) {
    try {
      const packet = JSON.parse(message.payloadString) as NetworkPacket;
      if (!packet || packet.senderId === this.clientId) {
        // Ignore own published packets
        return;
      }

      console.log(`[Relay Packet Received] ${packet.type} from ${packet.senderRole} (${packet.playerName || packet.senderId})`);

      const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);

      // --- CASE 1: HELLO PACKET ---
      if (packet.type === 'HELLO') {
        // Host receives Guest's join request
        if (this.role === 'host' && packet.senderRole === 'guest') {
          const guestName = packet.playerName || 'Player 2';
          console.log(`[Host] Guest "${guestName}" is joining!`);
          this.opponentPlayerName = guestName;

          // Notify UI that someone is joining right now
          this.onOpponentJoining?.(guestName);
          this.onStatusChange?.(`⚡ ${guestName} is connecting...`);

          this.isConnected = true;

          // Reply with WELCOME packet containing host name
          this.publishPacket(cleanCode, 'presence', {
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
          console.log(`[Guest] Detected Host "${hostName}" in room! Responding...`);
          this.opponentPlayerName = hostName;
          this.onStatusChange?.(`Found ${hostName}'s room! Connecting...`);

          // Immediately reply with HELLO to trigger host's welcome
          this.publishPacket(cleanCode, 'presence', {
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
          console.log(`[Guest] Connected to Host "${hostName}"!`);
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

  private publishPacket(cleanCode: string, subTopic: string, packet: NetworkPacket) {
    if (!this.client || !this.client.isConnected()) return;

    try {
      const topic = `${this.getTopicBase(cleanCode)}/${subTopic}`;
      const message = new Paho.Message(JSON.stringify(packet));
      message.destinationName = topic;
      message.qos = 1;
      this.client.send(message);
    } catch (err) {
      console.error('[Relay Publish Error]:', err);
    }
  }

  private startHostPresenceAnnouncement(cleanCode: string) {
    if (this.presenceAnnouncementInterval) clearInterval(this.presenceAnnouncementInterval);

    // Broadcast host presence every 1.5 seconds until guest connects
    this.presenceAnnouncementInterval = window.setInterval(() => {
      if (!this.isConnected && this.client && this.client.isConnected()) {
        this.publishPacket(cleanCode, 'presence', {
          senderId: this.clientId,
          senderRole: 'host',
          type: 'HELLO',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });
      }
    }, 1500);
  }

  private startGuestJoinRetry(cleanCode: string) {
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
      if (this.client && this.client.isConnected()) {
        console.log(`[Guest] Pinging Host in ${cleanCode} as "${this.localPlayerName}" (attempt ${attempts})...`);
        this.publishPacket(cleanCode, 'presence', {
          senderId: this.clientId,
          senderRole: 'guest',
          type: 'HELLO',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });
      }
    }, 1000);
  }

  // Periodic heartbeat to prevent mobile carrier timeouts
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.client && this.client.isConnected() && this.roomCode) {
        const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
        this.publishPacket(cleanCode, 'heartbeat', {
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

  // Broadcast full or partial state sync
  syncState(state: Partial<GameState>) {
    if (!this.roomCode) return;
    const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);

    this.publishPacket(cleanCode, 'game', {
      senderId: this.clientId,
      senderRole: this.role,
      type: 'SYNC_STATE',
      playerName: this.localPlayerName,
      payload: state,
      timestamp: Date.now()
    });
  }

  // Send fun reaction emoji/stamp
  sendReaction(reaction: string) {
    if (!this.roomCode) return;
    const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);

    this.publishPacket(cleanCode, 'game', {
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
    if (this.client) {
      try {
        if (this.client.isConnected() && this.roomCode) {
          const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
          this.publishPacket(cleanCode, 'presence', {
            senderId: this.clientId,
            senderRole: this.role,
            type: 'DISCONNECT',
            playerName: this.localPlayerName,
            timestamp: Date.now()
          });
          this.client.disconnect();
        }
      } catch {}
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  disconnect() {
    this.cleanup();
    this.role = 'offline';
    this.roomCode = '';
    this.opponentPlayerName = '';
  }
}

export const networkManager = new P2PNetworkManager();
