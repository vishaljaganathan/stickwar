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
// 5 = legs (complete stickman - READY)
// 6 = armed (with weapon)
export type StickmanStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CellState {
  stage: StickmanStage;
  weapon?: WeaponType;
  isDestroyed: boolean;
  justUpdated?: boolean;
}

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4';

export interface PlayerConfig {
  id: PlayerId;
  name: string;
  inkColor: string;
  avatar: string;
  label: string;
}

export const PLAYER_CONFIGS: Record<PlayerId, PlayerConfig> = {
  p1: { id: 'p1', name: 'Player 1', inkColor: '#1e3a8a', avatar: '🤠', label: 'BLUE SQUAD' },
  p2: { id: 'p2', name: 'Player 2', inkColor: '#b91c1c', avatar: '🥷', label: 'RED SQUAD' },
  p3: { id: 'p3', name: 'Player 3', inkColor: '#047857', avatar: '🧙', label: 'GREEN SQUAD' },
  p4: { id: 'p4', name: 'Player 4', inkColor: '#6d28d9', avatar: '🤖', label: 'PURPLE SQUAD' }
};

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
  | 'revealing_roll'   // Center screen big number pop-up for 1.2s before executing action
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

export interface RollAnnouncement {
  playerId: PlayerId;
  roll: DiceRoll;
  type: 'odd_miss' | 'even_draw' | 'even_arm' | 'even_attack' | 'dead_roll';
  title: string;
  subtitle: string;
  stageName?: string;
}

export interface GameState {
  mode: GameMode;
  maxPlayers: number;
  playerOrder: PlayerId[];
  currentTurn: PlayerId;
  phase: GamePhase;
  lastRoll: DiceRoll | null;
  lastRollPlayer: PlayerId | null;
  rollAnnouncement: RollAnnouncement | null;
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

export const createInitialGameState = (mode: GameMode = 'local', maxPlayers: number = 2): GameState => {
  const activeIds: PlayerId[] =
    maxPlayers === 4 ? ['p1', 'p2', 'p3', 'p4'] :
    maxPlayers === 3 ? ['p1', 'p2', 'p3'] :
    ['p1', 'p2'];

  return {
    mode,
    maxPlayers,
    playerOrder: activeIds,
    currentTurn: 'p1',
    phase: 'turn_ready',
    lastRoll: null,
    lastRollPlayer: null,
    rollAnnouncement: null,
    pendingRowTarget: null,
    attackAnim: null,
    log: [`Match started (${maxPlayers} Players)! Roll the 10-sided die. Even numbers assemble warriors!`],
    winner: null,
    players: {
      p1: createInitialPlayer('p1', PLAYER_CONFIGS.p1.name, PLAYER_CONFIGS.p1.inkColor),
      p2: createInitialPlayer('p2', mode === 'ai' ? 'StickBot 3000' : PLAYER_CONFIGS.p2.name, PLAYER_CONFIGS.p2.inkColor),
      p3: createInitialPlayer('p3', PLAYER_CONFIGS.p3.name, PLAYER_CONFIGS.p3.inkColor),
      p4: createInitialPlayer('p4', PLAYER_CONFIGS.p4.name, PLAYER_CONFIGS.p4.inkColor)
    }
  };
};
