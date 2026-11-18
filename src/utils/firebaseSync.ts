import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, off, Database } from 'firebase/database';
import { GameState } from '../types/game';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = 'stickman_firebase_config';

export class FirebaseSyncManager {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private currentListenerRef: any = null;

  getSavedConfig(): FirebaseConfig | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Check vite env
    if (import.meta.env.VITE_FIREBASE_DATABASE_URL && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'stickman-war'
      };
    }
    return null;
  }

  saveConfig(config: FirebaseConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    this.init(config);
  }

  init(config?: FirebaseConfig): boolean {
    const activeConfig = config || this.getSavedConfig();
    if (!activeConfig || !activeConfig.databaseURL || !activeConfig.apiKey) {
      return false;
    }

    try {
      if (!getApps().length) {
        this.app = initializeApp(activeConfig);
      } else {
        this.app = getApps()[0];
      }
      this.db = getDatabase(this.app);
      return true;
    } catch (err) {
      console.error('Failed to init Firebase:', err);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!(this.db || this.init());
  }

  // Create room in Firebase Realtime Database
  async createRoom(roomCode: string, initialGameState: GameState): Promise<boolean> {
    if (!this.init()) throw new Error('Firebase is not configured yet');
    const roomRef = ref(this.db!, `rooms/${roomCode}`);
    await set(roomRef, {
      ...initialGameState,
      guestConnected: false,
      createdAt: Date.now()
    });
    return true;
  }

  // Guest joins room in Firebase
  async joinRoom(roomCode: string): Promise<boolean> {
    if (!this.init()) throw new Error('Firebase is not configured yet');
    const roomRef = ref(this.db!, `rooms/${roomCode}`);
    await update(roomRef, {
      guestConnected: true
    });
    return true;
  }

  // Sync state update to Firebase
  async syncState(roomCode: string, partialState: Partial<GameState>) {
    if (!this.db) return;
    try {
      const roomRef = ref(this.db, `rooms/${roomCode}`);
      await update(roomRef, partialState);
    } catch (err) {
      console.error('Firebase sync error:', err);
    }
  }

  // Listen to realtime changes with onValue()
  listenToRoom(roomCode: string, callback: (data: GameState & { guestConnected?: boolean }) => void) {
    if (!this.db) return;
    if (this.currentListenerRef) {
      off(this.currentListenerRef);
    }
    const roomRef = ref(this.db, `rooms/${roomCode}`);
    this.currentListenerRef = roomRef;

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  }

  stopListening() {
    if (this.currentListenerRef) {
      off(this.currentListenerRef);
      this.currentListenerRef = null;
    }
  }
}

export const firebaseSync = new FirebaseSyncManager();
