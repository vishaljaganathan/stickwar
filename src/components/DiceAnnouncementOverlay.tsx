import React from 'react';
import { RollAnnouncement, PlayerId, PlayerState } from '../types/game';

interface DiceAnnouncementOverlayProps {
  announcement: RollAnnouncement | null;
  players: Record<PlayerId, PlayerState>;
}

export const DiceAnnouncementOverlay: React.FC<DiceAnnouncementOverlayProps> = ({
  announcement,
  players
}) => {
  if (!announcement) return null;

  const { playerId, roll, type, title, subtitle, stageName } = announcement;
  const player = players[playerId];
  const isOdd = roll % 2 !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-fade-in pointer-events-none select-none">
      <div className="relative w-full max-w-xs sm:max-w-sm bg-[#fffefb] rounded-3xl border-4 border-[#0f172a] shadow-[10px_10px_0px_#0f172a] p-5 text-center overflow-hidden transform animate-scale-in">
        {/* Retro Top Color Ribbon */}
        <div
          className="absolute top-0 left-0 right-0 h-4 border-b-2 border-[#0f172a]"
          style={{ backgroundColor: player?.inkColor || '#3b82f6' }}
        />

        {/* Roller Header Badge */}
        <div className="mt-1 mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white border-2 border-[#0f172a] shadow-xs">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: player?.inkColor || '#60a5fa' }}
          />
          <span className="font-retro font-black text-xs uppercase tracking-wider">
            {player?.name || 'PLAYER'} ROLLED
          </span>
        </div>

        {/* Center Gigantic 3D Rolled Digit */}
        <div className="my-1 flex items-center justify-center">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-white to-slate-100 border-4 border-[#0f172a] shadow-[0_8px_16px_rgba(0,0,0,0.35)] flex items-center justify-center">
            <span
              className="font-retro font-black text-6xl sm:text-7xl leading-none select-none drop-shadow-md"
              style={{
                color: isOdd ? '#d97706' : player?.inkColor || '#1d4ed8'
              }}
            >
              {roll}
            </span>

            {/* Odd/Even Stamp */}
            <span
              className={`absolute -bottom-2.5 px-2 py-0.5 rounded-full border-2 border-[#0f172a] text-[9px] font-retro font-black shadow-xs ${
                isOdd ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
              }`}
            >
              {isOdd ? 'ODD ROLL' : 'EVEN ROLL'}
            </span>
          </div>
        </div>

        {/* Action / Outcome Ribbon */}
        <div className="mt-4 space-y-1">
          <div
            className={`inline-block px-3 py-1 rounded-xl border-2 border-[#0f172a] text-xs font-retro font-black uppercase shadow-xs ${
              type === 'odd_miss'
                ? 'bg-amber-300 text-amber-950'
                : type === 'dead_roll'
                ? 'bg-slate-300 text-slate-950'
                : type === 'even_arm'
                ? 'bg-amber-400 text-slate-950'
                : type === 'even_attack'
                ? 'bg-rose-500 text-white'
                : 'bg-emerald-400 text-slate-950'
            }`}
          >
            {title}
          </div>

          <p className="text-xs font-hand font-bold text-slate-700">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
