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
  payload?: any;
  timestamp: number;
}

interface BrokerEndpoint {
  host: string;
  port: number;
  path: string;
  name: string;
}

// High-speed, public cloud WebSocket brokers supporting WSS (TLS) - 100% bypasses mobile CGNAT & carrier firewalls
const BROKERS: BrokerEndpoint[] = [
  // Primary: EMQX Global Cloud Relay (Singapore/Asia edge, ultra-low latency to India: Pondicherry & Bengaluru)
  { host: 'broker.emqx.io', port: 8084, path: '/mqtt', name: 'EMQX Asia-Pacific' },
  // Secondary / Failover: HiveMQ Global Public WSS Relay
  { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', name: 'HiveMQ Global' }
];

export class P2PNetworkManager {
  private client: Paho.Client | null = null;
  public clientId: string = '';
  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public isConnected: boolean = false;

  private currentBrokerIndex: number = 0;
  private heartbeatInterval: number | null = null;
  private presenceAnnouncementInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private isConnecting: boolean = false;
  private guestJoinHandshakeDone: boolean = false;
  private guestConnectedCallback: (() => void) | null = null;

  // Callbacks
  public onStateSync?: (state: Partial<GameState>) => void;
  public onOpponentConnected?: () => void;
  public onOpponentDisconnected?: () => void;
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
    return `stickmanwar/v3/${cleanCode.toLowerCase()}`;
  }

  // Host a new room
  hostRoom(roomCode: string, onReady: (code: string) => void, onError: (err: string) => void) {
    this.cleanup();
    this.role = 'host';
    this.guestJoinHandshakeDone = false;

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    this.onStatusChange?.(`Connecting to cloud relay (${BROKERS[0].name})...`);
    this.connectToBroker(
      0,
      () => {
        const topic = `${this.getTopicBase(cleanCode)}/#`;
        console.log('[Host] Subscribing to topic:', topic);
        this.client?.subscribe(topic, {
          qos: 1,
          onSuccess: () => {
            console.log('[Host] Room active on cloud relay:', displayCode);
            this.onStatusChange?.('Room active! Waiting for Player 2 to join...');
            onReady(displayCode);

            // Announce presence periodically so guest gets it immediately when joining
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

  // Join an existing room
  joinRoom(roomCode: string, onConnected: () => void, onError: (err: string) => void) {
    this.cleanup();
    this.role = 'guest';
    this.guestJoinHandshakeDone = false;
    this.guestConnectedCallback = onConnected;

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    if (!cleanCode) {
      onError('Please enter a valid room code (e.g. SM-XXXX)');
      return;
    }

    this.onStatusChange?.(`Connecting to room ${displayCode} via cloud relay...`);

    // Timeout guard: 12 seconds
    this.connectionTimeout = window.setTimeout(() => {
      if (!this.isConnected) {
        const msg = `Could not reach room ${displayCode}. Make sure the host has opened the room and is online!`;
        this.onStatusChange?.(msg);
        onError(msg);
        this.cleanup();
      }
    }, 12000);

    this.connectToBroker(
      0,
      () => {
        const topic = `${this.getTopicBase(cleanCode)}/#`;
        console.log('[Guest] Subscribing to room topic:', topic);
        this.client?.subscribe(topic, {
          qos: 1,
          onSuccess: () => {
            this.onStatusChange?.('Connected to room! Handshaking with Host...');
            // Send guest HELLO announcement to trigger host sync
            this.publishPacket(cleanCode, 'presence', {
              senderId: this.clientId,
              senderRole: 'guest',
              type: 'HELLO',
              timestamp: Date.now()
            });

            // Start polling join announce until host responds
            this.startGuestJoinRetry(cleanCode, onConnected);
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
          if (this.onOpponentDisconnected) this.onOpponentDisconnected();
        }
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message);
      };

      this.client.connect({
        useSSL: true,
        timeout: 6,
        keepAliveInterval: 15,
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
            this.onStatusChange?.(`Relay failover to ${BROKERS[brokerIndex + 1].name}...`);
            this.connectToBroker(brokerIndex + 1, onSuccess, onError);
          } else {
            const failMsg = `Failed to connect to multiplayer cloud relay. Please check internet.`;
            this.onStatusChange?.(failMsg);
            onError(failMsg);
          }
        }
      });
    } catch (e: any) {
      onError(e.message || 'Error initializing WebSocket relay');
    }
  }

  private handleIncomingMessage(message: Paho.Message) {
    try {
      const packet = JSON.parse(message.payloadString) as NetworkPacket;
      if (!packet || packet.senderId === this.clientId) {
        // Ignore self-published packets
        return;
      }

      console.log(`[Relay Packet Received] ${packet.type} from ${packet.senderRole} (${packet.senderId})`);

      const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);

      // Handle Presence Handshake
      if (packet.type === 'HELLO') {
        if (this.role === 'host' && packet.senderRole === 'guest') {
          console.log('[Host] Guest joined! Sending WELCOME response...');
          this.isConnected = true;
          this.guestJoinHandshakeDone = true;
          this.onStatusChange?.('Opponent connected! Match ready.');

          // Send WELCOME packet
          this.publishPacket(cleanCode, 'presence', {
            senderId: this.clientId,
            senderRole: 'host',
            type: 'WELCOME',
            timestamp: Date.now()
          });

          if (this.onOpponentConnected) {
            this.onOpponentConnected();
          }
        }
      }

      if (packet.type === 'WELCOME') {
        if (this.role === 'guest' && packet.senderRole === 'host') {
          console.log('[Guest] Host acknowledged presence! Connected.');
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.isConnected = true;
          this.guestJoinHandshakeDone = true;
          this.onStatusChange?.('Connected! Entering battle...');

          if (this.guestConnectedCallback) {
            this.guestConnectedCallback();
            this.guestConnectedCallback = null;
          }

          if (this.onOpponentConnected) {
            this.onOpponentConnected();
          }
        }
      }

      // Handle Game State Sync
      if (packet.type === 'SYNC_STATE' && packet.payload) {
        // If guest receives sync before handshake finished, complete handshake
        if (this.role === 'guest' && !this.isConnected) {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.isConnected = true;
          if (this.guestConnectedCallback) {
            this.guestConnectedCallback();
            this.guestConnectedCallback = null;
          }
          if (this.onOpponentConnected) this.onOpponentConnected();
        }

        if (this.onStateSync) {
          this.onStateSync(packet.payload);
        }
      }

      // Handle Emoji Reactions
      if (packet.type === 'REACTION' && packet.payload) {
        if (this.onReaction) {
          this.onReaction(packet.payload);
        }
      }

      // Handle Disconnect
      if (packet.type === 'DISCONNECT') {
        this.isConnected = false;
        this.onStatusChange?.('Opponent left the room');
        if (this.onOpponentDisconnected) {
          this.onOpponentDisconnected();
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

    // Broadcast host presence every 2 seconds until guest connects
    this.presenceAnnouncementInterval = window.setInterval(() => {
      if (!this.isConnected && this.client && this.client.isConnected()) {
        this.publishPacket(cleanCode, 'presence', {
          senderId: this.clientId,
          senderRole: 'host',
          type: 'HELLO',
          timestamp: Date.now()
        });
      }
    }, 2000);
  }

  private startGuestJoinRetry(cleanCode: string, onConnectedSuccess: () => void) {
    let attempts = 0;
    const interval = window.setInterval(() => {
      if (this.isConnected) {
        clearInterval(interval);
        onConnectedSuccess();
        return;
      }
      attempts++;
      if (attempts > 12) {
        clearInterval(interval);
        return;
      }
      if (this.client && this.client.isConnected()) {
        console.log(`[Guest] Pinging Host in ${cleanCode} (attempt ${attempts})...`);
        this.publishPacket(cleanCode, 'presence', {
          senderId: this.clientId,
          senderRole: 'guest',
          type: 'HELLO',
          timestamp: Date.now()
        });
      }
    }, 1200);
  }

  // Periodic heartbeat to prevent mobile carrier timeout
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.client && this.client.isConnected() && this.roomCode) {
        const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
        this.publishPacket(cleanCode, 'heartbeat', {
          senderId: this.clientId,
          senderRole: this.role,
          type: 'PING',
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
      payload: reaction,
      timestamp: Date.now()
    });
  }

  // Send custom network message
  send(message: NetworkMessage) {
    if (message.type === 'SYNC_STATE') {
      this.syncState(message.payload);
    } else if (message.type === 'REACTION') {
      this.sendReaction(message.payload);
    }
  }

  cleanup() {
    this.stopHeartbeat();
    if (this.presenceAnnouncementInterval) {
      clearInterval(this.presenceAnnouncementInterval);
      this.presenceAnnouncementInterval = null;
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
            timestamp: Date.now()
          });
          this.client.disconnect();
        }
      } catch {}
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.guestJoinHandshakeDone = false;
  }

  disconnect() {
    this.cleanup();
    this.role = 'offline';
    this.roomCode = '';
  }
}

export const networkManager = new P2PNetworkManager();
