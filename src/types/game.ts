export type RowIndex = 0 | 2 | 4 | 6 | 8;
export const ROW_NUMBERS: RowIndex[] = [0, 2, 4, 6, 8];

export type DiceRoll = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const DICE_NUMBERS: DiceRoll[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

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

// Assembly stages:
// 0 = empty
// 1 = head circle
// 2 = face (eyes + mouth)
// 3 = body (torso)
// 4 = hands (arms)
// 5 = legs (complete stickman)
// 6 = armed (with weapon)
export type StickmanStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CellState {
  stage: StickmanStage;
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
  | 'weapon_select'    // Active player just reached stage 5 and must choose weapon
  | 'attack_target'    // Stickman is armed (stage 6) and player must choose opponent row to destroy
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
  lastRoll: DiceRoll | null;
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
  log: ['Match started! Roll the 10-sided die (0-9). Even numbers recruit stickmen, odd numbers skip turn!'],
  winner: null,
  players: {
    p1: createInitialPlayer('p1', 'Player 1', '#1e3a8a'), // Classic blue pen ink
    p2: createInitialPlayer('p2', mode === 'ai' ? 'StickBot 3000' : 'Player 2', '#b91c1c') // Red ink
  }
});
