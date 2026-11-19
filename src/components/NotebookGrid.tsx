import React from 'react';
import { GameState, RowIndex, ROW_NUMBERS, PlayerId, PLAYER_CONFIGS } from '../types/game';
import { StickmanCell } from './StickmanCell';

interface NotebookGridProps {
  gameState: GameState;
  onAttackCell: (targetPlayerId: PlayerId, targetRow: RowIndex) => void;
  localPlayerId?: PlayerId | null;
}

export const NotebookGrid: React.FC<NotebookGridProps> = ({
  gameState,
  onAttackCell,
  localPlayerId
}) => {
  const { players, playerOrder = ['p1', 'p2'], currentTurn, phase, lastRoll, pendingRowTarget } = gameState;

  const isMyTurnToAttack = !localPlayerId || localPlayerId === currentTurn;

  const canAttackTarget = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    if (phase !== 'attack_target') return false;
    if (!isMyTurnToAttack) return false;
    // Cannot attack oneself!
    if (targetPlayerId === currentTurn) return false;
    if (!playerOrder.includes(targetPlayerId)) return false;
    const targetCell = players[targetPlayerId]?.cells?.[targetRow];
    return targetCell ? !targetCell.isDestroyed : false;
  };

  const getSquadBadgeColor = (pid: PlayerId) => {
    switch (pid) {
      case 'p1': return 'bg-blue-50 border-blue-200 text-blue-900 dot-blue-600';
      case 'p2': return 'bg-rose-50 border-rose-200 text-rose-900 dot-rose-600';
      case 'p3': return 'bg-emerald-50 border-emerald-200 text-emerald-900 dot-emerald-600';
      case 'p4': return 'bg-purple-50 border-purple-200 text-purple-900 dot-purple-600';
    }
  };

  return (
    <div className="relative flex-1 min-h-0 w-full bg-[#fffefb] rounded-xl sm:rounded-3xl border-2 sm:border-4 border-[#0f172a] shadow-[0_8px_25px_rgba(0,0,0,0.4)] overflow-hidden notebook-arena flex flex-col select-none">
      {/* Retro Chrome Binder Clips (Left edge) */}
      <div className="absolute left-0.5 sm:left-2 top-0 bottom-0 z-30 flex flex-col justify-around py-1 sm:py-2 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 border border-[#0f172a] shadow-inner" />
            <div className="w-1 h-0.5 sm:w-2 sm:h-1.5 -ml-0.5 sm:-ml-1 bg-slate-500 rounded-xs" />
          </div>
        ))}
      </div>

      {/* Red Double Margin Line */}
      <div className="absolute left-4 sm:left-10 top-0 bottom-0 w-0.5 bg-rose-400/90 z-20 pointer-events-none" />
      <div className="absolute left-5 sm:left-11 top-0 bottom-0 w-0.5 bg-rose-300/40 z-20 pointer-events-none hidden sm:block" />

      {/* Main Arena Container */}
      <div className="pl-5 sm:pl-14 pr-1 sm:pr-4 py-0.5 sm:py-1.5 flex flex-col flex-1 min-h-0">
        {/* Arena Lane Header */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 pb-0.5 sm:pb-1 border-b border-slate-300 font-retro font-black text-[8px] sm:text-xs shrink-0">
          <div className="w-6 xs:w-8 sm:w-11 shrink-0 text-center text-slate-500 font-mono tracking-widest text-[8px] sm:text-xs">
            LANE
          </div>
          {playerOrder.map((pid) => {
            const player = players[pid];
            if (!player) return null;
            const badgeClasses = getSquadBadgeColor(pid);
            const isTurn = currentTurn === pid;

            return (
              <div
                key={pid}
                className={`flex-1 min-w-0 text-center flex items-center justify-center gap-0.5 sm:gap-1 py-0.2 sm:py-0.5 rounded sm:rounded-lg border transition-all ${
                  isTurn ? 'ring-1 ring-amber-400 font-black' : ''
                } ${badgeClasses.split(' ').slice(0, 3).join(' ')}`}
              >
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0"
                  style={{ backgroundColor: player.inkColor }}
                />
                <span className="tracking-wider truncate uppercase text-[8px] sm:text-[10px] md:text-xs">
                  {player.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* 5 Combat Lanes: Strict Grid Rows 5 strictly guarantees equal vertical space */}
        <div className="grid grid-rows-5 flex-1 min-h-0 gap-0.5 sm:gap-1.5 py-0.5">
          {ROW_NUMBERS.map((rowNum) => {
            return (
              <div key={rowNum} className="flex items-stretch gap-0.5 sm:gap-1.5 min-h-0 h-full">
                {/* Lane Shield Badge */}
                <div className="w-6 xs:w-8 sm:w-11 shrink-0 flex items-center justify-center h-full">
                  <div className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 rounded sm:rounded-xl border sm:border-2 border-[#0f172a] bg-gradient-to-b from-amber-300 to-amber-400 flex items-center justify-center font-retro font-black text-[10px] sm:text-sm text-[#0f172a] shadow-xs select-none">
                    {rowNum}
                  </div>
                </div>

                {/* Player Columns (2, 3, or 4 players) */}
                {playerOrder.map((pid) => {
                  const player = players[pid];
                  if (!player) return null;
                  const cell = player.cells[rowNum];
                  const isTurnRow = currentTurn === pid && lastRoll === rowNum;
                  const isAttacker = currentTurn === pid && pendingRowTarget === rowNum;
                  const canBeAttacked = canAttackTarget(pid, rowNum);

                  return (
                    <div key={pid} className="flex-1 min-w-0 h-full">
                      <StickmanCell
                        rowIndex={rowNum}
                        cell={cell}
                        playerId={pid}
                        inkColor={player.inkColor}
                        isCurrentTurnRow={isTurnRow}
                        isAttacker={isAttacker}
                        canBeAttacked={canBeAttacked}
                        onAttackClick={() => onAttackCell(pid, rowNum)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
