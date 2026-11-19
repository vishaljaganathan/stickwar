import React from 'react';
import { GameMode, PlayerId, PlayerState, ROW_NUMBERS, PLAYER_CONFIGS } from '../types/game';
import { VoiceChatBar } from './VoiceChatBar';

interface NotebookHeaderProps {
  mode: GameMode;
  roomCode?: string;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenRules: () => void;
  onOpenModes: () => void;
  onResetGame: () => void;
  onOpenCreateRoom: () => void;
  players: Record<PlayerId, PlayerState>;
  playerOrder: PlayerId[];
  currentTurn: PlayerId;
  lastLogEntry: string;
  localPlayerId?: PlayerId | null;
  speakingSlots?: Record<PlayerId, boolean>;
  mutedSlots?: Record<PlayerId, boolean>;
}

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({
  mode,
  roomCode,
  isAudioEnabled,
  onToggleAudio,
  onOpenRules,
  onOpenModes,
  onResetGame,
  onOpenCreateRoom,
  players,
  playerOrder = ['p1', 'p2'],
  currentTurn,
  lastLogEntry,
  localPlayerId,
  speakingSlots = { p1: false, p2: false, p3: false, p4: false },
  mutedSlots = { p1: false, p2: false, p3: false, p4: false }
}) => {
  const getTheme = (id: PlayerId) => {
    switch (id) {
      case 'p1':
        return {
          bgActive: 'bg-blue-900/80 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] ring-1 ring-blue-300',
          bgIdle: 'bg-slate-800/60 border-slate-700 opacity-75',
          text: 'text-blue-200',
          avatarBg: 'bg-blue-600',
          avatar: PLAYER_CONFIGS.p1.avatar
        };
      case 'p2':
        return {
          bgActive: 'bg-rose-900/80 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] ring-1 ring-rose-300',
          bgIdle: 'bg-slate-800/60 border-slate-700 opacity-75',
          text: 'text-rose-200',
          avatarBg: 'bg-rose-600',
          avatar: mode === 'ai' ? '🤖' : PLAYER_CONFIGS.p2.avatar
        };
      case 'p3':
        return {
          bgActive: 'bg-emerald-900/80 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] ring-1 ring-emerald-300',
          bgIdle: 'bg-slate-800/60 border-slate-700 opacity-75',
          text: 'text-emerald-200',
          avatarBg: 'bg-emerald-600',
          avatar: PLAYER_CONFIGS.p3.avatar
        };
      case 'p4':
        return {
          bgActive: 'bg-purple-900/80 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)] ring-1 ring-purple-300',
          bgIdle: 'bg-slate-800/60 border-slate-700 opacity-75',
          text: 'text-purple-200',
          avatarBg: 'bg-purple-600',
          avatar: PLAYER_CONFIGS.p4.avatar
        };
    }
  };

  return (
    <header className="w-full max-w-5xl mx-auto px-0.5 sm:px-1 pt-0.5 sm:pt-1 shrink-0 select-none">
      {/* Top Main Game Navigation Bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 bg-[#1e293b]/95 border sm:border-2 border-[#0f172a] rounded-xl sm:rounded-2xl px-1.5 py-1 sm:px-2.5 sm:py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] text-white backdrop-blur-md">
        {/* Dynamic Player HUD Cards */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap flex-1 min-w-0">
          {playerOrder.map((pid) => {
            const player = players[pid];
            if (!player) return null;
            const theme = getTheme(pid);
            const isTurn = currentTurn === pid;
            const isLocal = localPlayerId === pid;
            const isEliminated = ROW_NUMBERS.every((r) => player.cells[r].isDestroyed);

            return (
              <div
                key={pid}
                className={`flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 rounded-lg sm:rounded-xl border transition-all ${
                  isEliminated
                    ? 'opacity-40 grayscale bg-slate-900/60 border-slate-800'
                    : isTurn
                    ? theme.bgActive
                    : theme.bgIdle
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-5 h-5 sm:w-7 sm:h-7 rounded sm:rounded-lg ${theme.avatarBg} border border-white flex items-center justify-center text-[10px] sm:text-xs shadow-xs shrink-0 transition-transform ${
                    speakingSlots[pid] ? 'ring-2 ring-emerald-400 animate-pulse scale-105' : ''
                  }`}
                >
                  {isEliminated ? '💀' : theme.avatar}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-0.5 sm:gap-1 leading-none">
                    <span
                      className={`font-retro font-black text-[9px] sm:text-xs ${theme.text} tracking-wider truncate max-w-[50px] xs:max-w-[75px] sm:max-w-[110px]`}
                    >
                      {player.name}
                    </span>
                    {speakingSlots[pid] && (
                      <span className="text-[8px] animate-bounce shrink-0" title="Speaking">
                        🎙️
                      </span>
                    )}
                    {mutedSlots[pid] && !speakingSlots[pid] && (
                      <span className="text-[7px] text-slate-400 shrink-0" title="Muted">
                        🔇
                      </span>
                    )}
                    {isLocal && (
                      <span className="px-1 py-0 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[6px] sm:text-[7px] leading-tight shrink-0">
                        YOU
                      </span>
                    )}
                    {isEliminated && (
                      <span className="px-1 py-0 rounded bg-rose-950 text-rose-300 border border-rose-500/50 font-mono font-black text-[6px] sm:text-[7px] leading-tight shrink-0">
                        OUT
                      </span>
                    )}
                    {isTurn && !isEliminated && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
                    )}
                  </div>

                  {/* Health Hearts */}
                  <div className="flex gap-0.5 text-[7px] sm:text-[9px] leading-none mt-0.5">
                    {ROW_NUMBERS.map((r) => (
                      <span
                        key={r}
                        className={player.cells[r].isDestroyed ? 'opacity-25 grayscale' : 'animate-pulse'}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center / Action Ticker */}
        <div className="hidden md:flex flex-col items-center justify-center px-1 text-center max-w-[180px]">
          <span className="px-1.5 py-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-300 text-[#0f172a] font-retro font-black text-[8px] tracking-wider uppercase shadow-xs">
            {mode === 'local' ? `${playerOrder.length}P PASS & PLAY` : mode === 'ai' ? 'VS AI' : `ROOM: ${roomCode || 'CLOUD'}`}
          </span>
          <span className="text-[9px] font-hand font-bold text-amber-200 truncate mt-0.5 max-w-full drop-shadow">
            ✏️ {lastLogEntry}
          </span>
        </div>

        {/* COMPACT MENU BUTTONS */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-0.5">
          {/* Live WebRTC Voice Chat Widget */}
          <VoiceChatBar
            isOnline={mode === 'online_p2p' || mode === 'online_firebase'}
            localPlayerId={localPlayerId || 'p1'}
            players={players}
          />

          <button
            onClick={onOpenCreateRoom}
            className="game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-retro font-black rounded-md sm:rounded-lg text-[9px] sm:text-xs flex items-center gap-0.5 shadow-xs"
            title="Create or Join Room Match"
          >
            <span>🌐</span>
            <span className="hidden sm:inline">ROOM</span>
          </button>
          <button
            onClick={onOpenModes}
            className="game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-retro font-black rounded-md sm:rounded-lg text-[9px] sm:text-xs shadow-xs"
            title="Select Mode"
          >
            MODES
          </button>
          <button
            onClick={onResetGame}
            className="game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 bg-slate-700 hover:bg-slate-600 text-white font-retro font-bold rounded-md sm:rounded-lg text-[9px] sm:text-xs shadow-xs"
            title="Reset Battle"
          >
            🔄
          </button>
          <button
            onClick={onToggleAudio}
            className={`game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-retro shadow-xs ${
              isAudioEnabled ? 'bg-amber-400/90 text-slate-950' : 'bg-slate-700 text-slate-400'
            }`}
            title={isAudioEnabled ? 'Mute SFX' : 'Unmute SFX'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={onOpenRules}
            className="game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white hover:bg-slate-100 text-slate-900 font-retro font-black rounded-md sm:rounded-lg text-[9px] sm:text-xs shadow-xs"
            title="Rules"
          >
            📖
          </button>
        </div>
      </div>
    </header>
  );
};
