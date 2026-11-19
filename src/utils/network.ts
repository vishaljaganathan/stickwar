import { GameState, PlayerId } from '../types/game';

export type NetworkRole = 'host' | 'guest' | 'offline';

export interface NetworkMessage {
  type: 'SYNC_STATE' | 'ROLL' | 'SELECT_WEAPON' | 'ATTACK' | 'RESET' | 'REACTION' | 'PING' | 'PONG';
  payload?: any;
}

export interface NetworkPacket {
  senderId: string;
  senderRole: NetworkRole;
  type: 'HELLO' | 'WELCOME' | 'SYNC_STATE' | 'NAME_UPDATE' | 'START_MATCH' | 'REACTION' | 'PING' | 'PONG' | 'DISCONNECT';
  playerName?: string;
  payload?: any;
  timestamp: number;
}

export interface PlayerRosterEntry {
  id: PlayerId;
  name: string;
}

type ListenerMap = {
  playerJoined: (playerId: PlayerId, name: string, count: number, max: number, namedRoster: Record<PlayerId, string>) => void;
  nameUpdated: (playerId: PlayerId, newName: string) => void;
  matchStarted: (payload: { maxPlayers: number; roster: Record<string, PlayerRosterEntry>; namedRoster: Record<PlayerId, string> }) => void;
  guestConnected: (assignedId: PlayerId, roster: Record<string, PlayerRosterEntry>, hostName: string) => void;
  rosterUpdated: (roster: Record<string, PlayerRosterEntry>) => void;
  statusChange: (status: string) => void;
  opponentJoining: (guestName: string) => void;
  opponentDisconnected: (name?: string) => void;
  reaction: (emoji: string) => void;
  stateSync: (state: Partial<GameState>) => void;
};

/**
 * High-Speed, Universal Cross-Network Multiplayer Manager (2-4 Players)
 * Operates over pure standard HTTPS & WSS (PORT 443).
 *
 * Supports:
 * - 2, 3, or 4 player rooms chosen by the host.
 * - Dynamic slot assignment (Host = p1, 1st Guest = p2, 2nd Guest = p3, 3rd Guest = p4).
 * - Realtime username synchronization.
 * - Guest Waiting Lobby & Host Waiting Lobby with live roster.
 * - Unified START_MATCH synchronization.
 * - Standard Port 443 HTTPS/WSS (never blocked by cellular carriers like Jio/Airtel 5G).
 */
export class P2PNetworkManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  public clientId: string = '';
  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public isConnected: boolean = false;
  public localPlayerName: string = '';
  public myPlayerId: PlayerId = 'p1';
  public maxPlayers: number = 2;

  // Connected roster: senderId -> { id, name }
  public roster: Record<string, PlayerRosterEntry> = {};

  private presenceAnnouncementInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private guestRetryInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private guestConnectedCallback: ((assignedId: PlayerId, roster: Record<string, PlayerRosterEntry>, hostName: string) => void) | null = null;

  // Multi-subscriber Event Listeners (Prevents callback clobbering)
  private listeners: { [K in keyof ListenerMap]: Array<ListenerMap[K]> } = {
    playerJoined: [],
    nameUpdated: [],
    matchStarted: [],
    guestConnected: [],
    rosterUpdated: [],
    statusChange: [],
    opponentJoining: [],
    opponentDisconnected: [],
    reaction: [],
    stateSync: []
  };

  // Backwards-compatible single callback hooks
  public onStateSync?: (state: Partial<GameState>) => void;
  public onOpponentJoining?: (guestName: string) => void;
  public onPlayerJoined?: (playerId: PlayerId, name: string, count: number, max: number, namedRoster: Record<PlayerId, string>) => void;
  public onNameUpdated?: (playerId: PlayerId, newName: string) => void;
  public onOpponentDisconnected?: (opponentName?: string) => void;
  public onReaction?: (reaction: string) => void;
  public onStatusChange?: (status: string) => void;
  public onMatchStarted?: (payload: any) => void;

  constructor() {
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return 'sm_' + Math.random().toString(36).substring(2, 11);
  }

  // Register multi-subscriber listener
  public addListener<K extends keyof ListenerMap>(event: K, fn: ListenerMap[K]): () => void {
    this.listeners[event].push(fn as any);
    return () => {
      this.listeners[event] = this.listeners[event].filter((f) => f !== fn) as any;
    };
  }

  // Emit event to both classic single callback and all multi-subscribers
  public emit<K extends keyof ListenerMap>(event: K, ...args: Parameters<ListenerMap[K]>) {
    if (event === 'playerJoined' && this.onPlayerJoined) {
      try { (this.onPlayerJoined as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'nameUpdated' && this.onNameUpdated) {
      try { (this.onNameUpdated as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'matchStarted' && this.onMatchStarted) {
      try { (this.onMatchStarted as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'statusChange' && this.onStatusChange) {
      try { (this.onStatusChange as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'opponentJoining' && this.onOpponentJoining) {
      try { (this.onOpponentJoining as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'opponentDisconnected' && this.onOpponentDisconnected) {
      try { (this.onOpponentDisconnected as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'reaction' && this.onReaction) {
      try { (this.onReaction as any)(...args); } catch (e) { console.error(e); }
    } else if (event === 'stateSync' && this.onStateSync) {
      try { (this.onStateSync as any)(...args); } catch (e) { console.error(e); }
    }

    this.listeners[event].forEach((fn) => {
      try {
        (fn as any)(...args);
      } catch (err) {
        console.error(`[NetworkManager] Error in listener for ${event}:`, err);
      }
    });
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

  // Normalize any user input into consistent clean code
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
    return `stickman_v6_${cleanCode.toLowerCase()}`;
  }

  public getNamedRoster(): Record<PlayerId, string> {
    const res: Record<PlayerId, string> = {
      p1: '',
      p2: '',
      p3: '',
      p4: ''
    };
    Object.values(this.roster).forEach((entry) => {
      if (entry.id && entry.name) {
        res[entry.id] = entry.name;
      }
    });
    return res;
  }

  // Host a new match room (supports 2 to 4 players)
  hostRoom(
    roomCode: string,
    hostPlayerName: string = 'Player 1',
    maxPlayers: number = 2,
    onReady: (code: string) => void,
    onError: (err: string) => void
  ) {
    this.cleanup();
    this.role = 'host';
    this.localPlayerName = hostPlayerName.trim() || 'Player 1';
    this.myPlayerId = 'p1';
    this.maxPlayers = maxPlayers;

    this.roster = {
      [this.clientId]: { id: 'p1', name: this.localPlayerName }
    };

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    this.emit('statusChange', `Creating ${maxPlayers}-Player match on Port 443...`);

    const topic = this.getTopic(cleanCode);
    this.connectLiveStream(
      topic,
      () => {
        console.log(`[Host] Room active for ${maxPlayers} players:`, displayCode);
        this.emit('statusChange', `Room active! Waiting for players to join (1/${maxPlayers})...`);
        onReady(displayCode);

        // Periodically announce host presence with maxPlayers info
        this.startHostPresenceAnnouncement(topic);
      },
      (err) => onError(err)
    );
  }

  // Join an existing match room
  joinRoom(
    roomCode: string,
    guestPlayerName: string = 'Player 2',
    onConnected: (assignedId: PlayerId, roster: Record<string, PlayerRosterEntry>, hostName: string) => void,
    onError: (err: string) => void
  ) {
    this.cleanup();
    this.role = 'guest';
    this.localPlayerName = guestPlayerName.trim() || 'Player 2';
    this.guestConnectedCallback = onConnected;

    const { displayCode, cleanCode } = P2PNetworkManager.normalizeRoomCode(roomCode);
    this.roomCode = displayCode;

    if (!cleanCode) {
      onError('Please enter a valid room code (e.g. SM-XXXX)');
      return;
    }

    this.emit('statusChange', `Connecting to room ${displayCode} on Port 443...`);

    // Timeout guard: 16 seconds
    this.connectionTimeout = window.setTimeout(() => {
      if (!this.isConnected) {
        const msg = `Could not reach room ${displayCode}. Please make sure the host has created the match and is waiting!`;
        this.emit('statusChange', msg);
        onError(msg);
        this.cleanup();
      }
    }, 16000);

    const topic = this.getTopic(cleanCode);
    this.connectLiveStream(
      topic,
      () => {
        this.emit('statusChange', 'Found room! Requesting player slot...');
        // Send initial HELLO with guest name
        this.publishPacket(topic, {
          senderId: this.clientId,
          senderRole: 'guest',
          type: 'HELLO',
          playerName: this.localPlayerName,
          timestamp: Date.now()
        });

        // Start repeating join request until host assigns slot
        this.startGuestJoinRetry(topic);
      },
      (err) => onError(err)
    );
  }

  // Update commander name in real-time and broadcast to all players
  updateLocalName(newName: string) {
    const cleanName = newName.trim();
    if (!cleanName) return;
    this.localPlayerName = cleanName;

    if (this.roster[this.clientId]) {
      this.roster[this.clientId].name = cleanName;
    }

    if (this.roomCode) {
      const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
      const topic = this.getTopic(cleanCode);
      this.publishPacket(topic, {
        senderId: this.clientId,
        senderRole: this.role,
        type: 'NAME_UPDATE',
        playerName: cleanName,
        payload: {
          id: this.myPlayerId,
          newName: cleanName
        },
        timestamp: Date.now()
      });
    }

    this.emit('nameUpdated', this.myPlayerId, cleanName);
  }

  // Host launches the match for all connected players
  startMatch(finalPlayerCount?: number) {
    if (!this.roomCode) return;
    const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
    const topic = this.getTopic(cleanCode);

    if (finalPlayerCount) {
      this.maxPlayers = finalPlayerCount;
    }

    const payload = {
      maxPlayers: this.maxPlayers,
      roster: this.roster,
      namedRoster: this.getNamedRoster()
    };

    this.publishPacket(topic, {
      senderId: this.clientId,
      senderRole: 'host',
      type: 'START_MATCH',
      playerName: this.localPlayerName,
      payload,
      timestamp: Date.now()
    });

    this.emit('matchStarted', payload);
  }

  // Connects via Port 443 WSS with auto SSE fallback
  private connectLiveStream(
    topic: string,
    onSuccess: () => void,
    onError: (err: string) => void
  ) {
    try {
      const wsUrl = `wss://ntfy.sh/${topic}/ws`;
      this.ws = new WebSocket(wsUrl);

      let opened = false;
      this.ws.onopen = () => {
        opened = true;
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
          this.connectSSEFallback(topic, onSuccess, onError);
        }
      };

      this.ws.onclose = () => {
        if (this.isConnected) {
          this.emit('statusChange', 'Reconnecting stream...');
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
        this.emit('statusChange', msg);
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
        return; // Ignore own published packets
      }

      console.log(`[Relay Received] ${packet.type} from ${packet.senderRole} (${packet.playerName || packet.senderId})`);

      const { cleanCode } = P2PNetworkManager.normalizeRoomCode(this.roomCode);
      const topic = this.getTopic(cleanCode);

      // --- CASE 1: HELLO PACKET ---
      if (packet.type === 'HELLO') {
        // Host receives Guest's join request
        if (this.role === 'host' && packet.senderRole === 'guest') {
          const guestName = packet.playerName || 'Guest';

          // Assign slot if not yet in roster
          let assignedId: PlayerId;
          if (this.roster[packet.senderId]) {
            assignedId = this.roster[packet.senderId].id;
            this.roster[packet.senderId].name = guestName;
          } else {
            // Find which slots are currently in use
            const takenSlots = new Set(Object.values(this.roster).map((entry) => entry.id));
            const availableSlots: PlayerId[] = (['p2', 'p3', 'p4'] as PlayerId[]).slice(0, this.maxPlayers - 1);
            const freeSlot = availableSlots.find((s) => !takenSlots.has(s));

            if (!freeSlot) {
              console.warn(`[Host] Room full (${takenSlots.size}/${this.maxPlayers}). Cannot add ${guestName}`);
              return;
            }

            assignedId = freeSlot;
            this.roster[packet.senderId] = { id: assignedId, name: guestName };
          }

          const totalJoined = Object.keys(this.roster).length;
          this.emit('opponentJoining', guestName);
          this.emit('statusChange', `⚡ ${guestName} joined as ${assignedId.toUpperCase()} (${totalJoined}/${this.maxPlayers})`);
          this.isConnected = true;

          // Reply with WELCOME packet containing assigned slot & full roster
          this.publishPacket(topic, {
            senderId: this.clientId,
            senderRole: 'host',
            type: 'WELCOME',
            playerName: this.localPlayerName,
            payload: {
              targetSenderId: packet.senderId,
              assignedId,
              newGuestName: guestName,
              maxPlayers: this.maxPlayers,
              hostName: this.localPlayerName,
              roster: this.roster
            },
            timestamp: Date.now()
          });

          // Notify host UI of player join and roster update
          this.emit('playerJoined', assignedId, guestName, totalJoined, this.maxPlayers, this.getNamedRoster());
          this.emit('rosterUpdated', this.roster);
        }

        // Guest receives Host's presence announcement
        if (this.role === 'guest' && packet.senderRole === 'host') {
          const hostName = packet.playerName || 'Host Player';
          if (packet.payload?.maxPlayers) {
            this.maxPlayers = packet.payload.maxPlayers;
          }
          if (packet.payload?.roster) {
            this.roster = packet.payload.roster;
            this.emit('rosterUpdated', this.roster);
          }

          // ONLY reply with HELLO if guest is NOT yet connected/assigned!
          if (!this.isConnected) {
            this.emit('statusChange', `Found ${hostName}'s room! Requesting slot...`);
            this.publishPacket(topic, {
              senderId: this.clientId,
              senderRole: 'guest',
              type: 'HELLO',
              playerName: this.localPlayerName,
              timestamp: Date.now()
            });
          }
        }
      }

      // --- CASE 2: WELCOME PACKET ---
      if (packet.type === 'WELCOME') {
        if (this.role === 'guest' && packet.senderRole === 'host') {
          // Check if this welcome is intended for this guest
          if (packet.payload?.targetSenderId === this.clientId) {
            const assignedId: PlayerId = packet.payload.assignedId || 'p2';
            const hostName = packet.playerName || packet.payload?.hostName || 'Host Player';
            this.myPlayerId = assignedId;
            this.maxPlayers = packet.payload.maxPlayers || 2;
            this.roster = packet.payload.roster || {};

            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout);
              this.connectionTimeout = null;
            }
            if (this.guestRetryInterval) {
              clearInterval(this.guestRetryInterval);
              this.guestRetryInterval = null;
            }

            this.isConnected = true;
            this.emit('statusChange', `Assigned ${assignedId.toUpperCase()} in ${hostName}'s match!`);

            if (this.guestConnectedCallback) {
              this.guestConnectedCallback(assignedId, this.roster, hostName);
              this.guestConnectedCallback = null;
            }
            this.emit('guestConnected', assignedId, this.roster, hostName);
            this.emit('rosterUpdated', this.roster);
          } else if (packet.payload?.roster) {
            // Update local roster copy when other guests join
            this.roster = packet.payload.roster;
            const currentCount = Object.keys(this.roster).length;
            this.emit('rosterUpdated', this.roster);

            const newId = packet.payload.assignedId;
            const newName = packet.payload.newGuestName || 'New Player';
            if (newId && newId !== this.myPlayerId) {
              this.emit('playerJoined', newId, newName, currentCount, this.maxPlayers, this.getNamedRoster());
            }
          }
        }
      }

      // --- CASE 3: START_MATCH PACKET ---
      if (packet.type === 'START_MATCH') {
        if (this.role === 'guest') {
          if (packet.payload?.maxPlayers) {
            this.maxPlayers = packet.payload.maxPlayers;
          }
          if (packet.payload?.roster) {
            this.roster = packet.payload.roster;
          }
          this.emit('matchStarted', packet.payload);
        }
      }

      // --- CASE 4: NAME UPDATE PACKET ---
      if (packet.type === 'NAME_UPDATE' && packet.payload) {
        const { id, newName } = packet.payload;
        if (id && newName) {
          if (this.roster[packet.senderId]) {
            this.roster[packet.senderId].name = newName;
          }
          this.emit('nameUpdated', id, newName);
        }
      }

      // --- CASE 5: GAME STATE SYNC ---
      if (packet.type === 'SYNC_STATE' && packet.payload) {
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
        }

        this.emit('stateSync', packet.payload);
      }

      // --- CASE 6: REACTION ---
      if (packet.type === 'REACTION' && packet.payload) {
        this.emit('reaction', packet.payload);
      }

      // --- CASE 7: DISCONNECT ---
      if (packet.type === 'DISCONNECT') {
        const leavingEntry = this.roster[packet.senderId];
        const name = leavingEntry?.name || packet.playerName || 'Player';
        delete this.roster[packet.senderId];
        this.emit('statusChange', `${name} left the room`);
        this.emit('opponentDisconnected', name);
        this.emit('rosterUpdated', this.roster);
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

    // Broadcast host presence every 1.5s until room is full
    this.presenceAnnouncementInterval = window.setInterval(() => {
      const currentCount = Object.keys(this.roster).length;
      if (currentCount < this.maxPlayers) {
        this.publishPacket(topic, {
          senderId: this.clientId,
          senderRole: 'host',
          type: 'HELLO',
          playerName: this.localPlayerName,
          payload: {
            hostName: this.localPlayerName,
            maxPlayers: this.maxPlayers,
            currentCount,
            roster: this.roster
          },
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
    this.roster = {};
  }
}

export const networkManager = new P2PNetworkManager();
