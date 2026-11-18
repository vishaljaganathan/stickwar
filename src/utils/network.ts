import Peer, { DataConnection } from 'peerjs';
import { GameState, RowIndex, WeaponType, PlayerId } from '../types/game';

export type NetworkRole = 'host' | 'guest' | 'offline';

export interface NetworkMessage {
  type: 'SYNC_STATE' | 'ROLL' | 'SELECT_WEAPON' | 'ATTACK' | 'RESET' | 'REACTION';
  payload?: any;
}

export class P2PNetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public roomCode: string = '';
  public role: NetworkRole = 'offline';
  public onStateSync?: (state: Partial<GameState>) => void;
  public onOpponentConnected?: () => void;
  public onOpponentDisconnected?: () => void;
  public onReaction?: (reaction: string) => void;
  public isConnected: boolean = false;

  // Generate random readable room code: e.g. SM-7492
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SM-${code}`;
  }

  // Host a new room
  hostRoom(roomCode: string, onReady: (code: string) => void, onError: (err: string) => void) {
    this.role = 'host';
    this.roomCode = roomCode;

    // Destroy existing
    if (this.peer) this.peer.destroy();

    const peerId = `stickmanwar-${roomCode.toLowerCase()}`;
    this.peer = new Peer(peerId);

    this.peer.on('open', () => {
      onReady(roomCode);
    });

    this.peer.on('connection', (connection) => {
      this.conn = connection;
      this.setupConnectionHandlers();
      this.isConnected = true;
      if (this.onOpponentConnected) this.onOpponentConnected();
    });

    this.peer.on('error', (err) => {
      onError(err.message || 'Error creating room');
    });
  }

  // Join an existing room
  joinRoom(roomCode: string, onConnected: () => void, onError: (err: string) => void) {
    this.role = 'guest';
    this.roomCode = roomCode;

    if (this.peer) this.peer.destroy();

    this.peer = new Peer();

    this.peer.on('open', () => {
      const targetPeerId = `stickmanwar-${roomCode.toLowerCase()}`;
      const connection = this.peer!.connect(targetPeerId);
      this.conn = connection;
      this.setupConnectionHandlers();

      connection.on('open', () => {
        this.isConnected = true;
        onConnected();
        if (this.onOpponentConnected) this.onOpponentConnected();
      });

      connection.on('error', (err) => {
        onError(err.message || 'Could not connect to host');
      });
    });

    this.peer.on('error', (err) => {
      onError(err.message || 'Error joining room');
    });
  }

  private setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      if (msg.type === 'SYNC_STATE' && this.onStateSync) {
        this.onStateSync(msg.payload);
      } else if (msg.type === 'REACTION' && this.onReaction) {
        this.onReaction(msg.payload);
      }
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      if (this.onOpponentDisconnected) this.onOpponentDisconnected();
    });
  }

  // Send message to peer
  send(message: NetworkMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(message);
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

  disconnect() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.isConnected = false;
    this.role = 'offline';
  }
}

export const networkManager = new P2PNetworkManager();
