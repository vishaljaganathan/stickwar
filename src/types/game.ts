export type RowIndex = 0 | 2 | 4 | 6 | 8;
export const ROW_NUMBERS: RowIndex[] = [0, 2, 4, 6, 8];

export type WeaponType = 'sword' | 'sniper' | 'bazooka' | 'bow' | 'laser';

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  icon: string;
  doodleDesc: string;
}

export const WEAPONS: WeaponInfo[] = [
  { id: 'sword', name: 'Ink Katana', icon: '🗡️', doodleDesc: 'Classic pencil broadsword' },
  { id: 'sniper', name: 'Ballpoint Sniper', icon: '🎯', doodleDesc: 'Long-range precision ink rifle' },
  { id: 'bazooka', name: 'Eraser Bazooka', icon: '🚀', doodleDesc: 'Explosive doodle rocket launcher' },
  { id: 'bow', name: 'Ruler Bow', icon: '🏹', doodleDesc: 'Curved wood ruler & sharp pencil arrows' },
  { id: 'laser', name: 'Highlighter Blaster', icon: '⚡', doodleDesc: 'Neon highlighter laser cannon' }
];

export interface CellState {
  stage: 0 | 1 | 2 | 3; // 0 = empty, 1 = head, 2 = body, 3 = armed
  weapon?: WeaponType;
  isDestroyed: boolean;
  justUpdated?: boolean;
}

export type PlayerId = 'p1' | 'p2';

export interface PlayerState {
  id: PlayerId;
  name: string;
  inkColor: string; // ink color on notebook
  cells: Record<RowIndex, CellState>;
}

export type GameMode = 'local' | 'ai' | 'online_p2p' | 'online_firebase';

export type GamePhase = 
  | 'turn_ready'       // Waiting for player to roll die
  | 'rolling'          // Die tumble animation in progress
  | 'weapon_select'    // Active player just reached stage 3 and must choose weapon
  | 'attack_target'    // Stickman is armed (stage 3) and player must choose opponent row to destroy
  | 'animating_attack' // Projectile & scribble animation playing
  | 'game_over';       // Winner found

export interface AttackAnimationData {
  fromPlayer: PlayerId;
  fromRow: RowIndex;
  targetPlayer: PlayerId;
  targetRow: RowIndex;
  weapon: WeaponType;
}

export interface GameState {
  mode: GameMode;
  currentTurn: PlayerId;
  phase: GamePhase;
  lastRoll: RowIndex | null;
  lastRollPlayer: PlayerId | null;
  pendingRowTarget: RowIndex | null;
  attackAnim: AttackAnimationData | null;
  log: string[];
  winner: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  roomCode?: string;
}

export const createInitialPlayer = (id: PlayerId, name: string, inkColor: string): PlayerState => ({
  id,
  name,
  inkColor,
  cells: {
    0: { stage: 0, isDestroyed: false },
    2: { stage: 0, isDestroyed: false },
    4: { stage: 0, isDestroyed: false },
    6: { stage: 0, isDestroyed: false },
    8: { stage: 0, isDestroyed: false },
  }
});

export const createInitialGameState = (mode: GameMode = 'local'): GameState => ({
  mode,
  currentTurn: 'p1',
  phase: 'turn_ready',
  lastRoll: null,
  lastRollPlayer: null,
  pendingRowTarget: null,
  attackAnim: null,
  log: ['Match started! Roll the notebook die to recruit stickmen.'],
  winner: null,
  players: {
    p1: createInitialPlayer('p1', 'Player 1', '#1e3a8a'), // Classic blue pen ink
    p2: createInitialPlayer('p2', mode === 'ai' ? 'StickBot 3000' : 'Player 2', '#b91c1c') // Red ink
  }
});
