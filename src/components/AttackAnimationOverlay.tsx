import React, { useEffect, useState } from 'react';
import { AttackAnimationData, WEAPONS } from '../types/game';

interface AttackAnimationOverlayProps {
  animData: AttackAnimationData | null;
  onAnimationComplete: () => void;
}

export const AttackAnimationOverlay: React.FC<AttackAnimationOverlayProps> = ({
  animData,
  onAnimationComplete
}) => {
  const [phase, setPhase] = useState<'charging' | 'projectile' | 'impact'>('charging');

  useEffect(() => {
    if (!animData) return;

    setPhase('charging');

    const timer1 = setTimeout(() => {
      setPhase('projectile');
    }, 280);

    const timer2 = setTimeout(() => {
      setPhase('impact');
    }, 720);

    const timer3 = setTimeout(() => {
      onAnimationComplete();
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [animData]);

  if (!animData) return null;

  const weaponInfo = WEAPONS.find((w) => w.id === animData.weapon) || WEAPONS[0];
  const isP1Attacker = animData.fromPlayer === 'p1';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-fade-in p-2 select-none">
      {/* Background Dim */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] transition-opacity" />

      {/* Retro Attack Announcement Banner */}
      <div className="relative z-10 -mt-8 sm:-mt-14 mb-2 animate-bounce max-w-[95vw]">
        <div className="px-4 sm:px-6 py-2 rounded-2xl bg-[#fffefb] border-3 sm:border-4 border-[#0f172a] shadow-[6px_6px_0px_#0f172a] flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">{weaponInfo.icon}</span>
          <div>
            <div
              className="font-retro font-black text-lg sm:text-2xl text-[#0f172a] uppercase tracking-wider leading-tight"
            >
              {weaponInfo.name} STRIKE!
            </div>
            <div className="text-[11px] sm:text-xs font-retro font-bold text-slate-600">
              {isP1Attacker ? 'PLAYER 1' : 'PLAYER 2'} (Row {animData.fromRow}) ➔ Row {animData.targetRow}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Weapon Animation Stage */}
      <div className="relative w-full max-w-xl h-44 sm:h-56 flex items-center justify-center">
        {/* WEAPON 1: SWORD */}
        {animData.weapon === 'sword' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className={`absolute inset-0 transition-transform duration-300 flex items-center justify-center ${
                phase === 'charging'
                  ? 'scale-75 -rotate-45 opacity-50'
                  : 'scale-120 rotate-12 opacity-100'
              }`}
            >
              <svg viewBox="0 0 400 200" className="w-full h-full">
                <path
                  d={isP1Attacker ? "M 50 180 Q 200 20 350 90" : "M 350 180 Q 200 20 50 90"}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="animate-draw-stroke"
                />
                <path
                  d={isP1Attacker ? "M 70 170 Q 200 35 340 100" : "M 330 170 Q 200 35 60 100"}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx={isP1Attacker ? "320" : "80"} cy="100" r="16" fill="#facc15" className="animate-ping" />
              </svg>
            </div>
          </div>
        )}

        {/* WEAPON 2: SNIPER */}
        {animData.weapon === 'sniper' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 400 100" className="w-full h-full">
              {phase !== 'charging' && (
                <line
                  x1={isP1Attacker ? '40' : '360'}
                  y1="50"
                  x2={isP1Attacker ? '360' : '40'}
                  y2="50"
                  stroke="#ef4444"
                  strokeWidth="5"
                  strokeDasharray="10 5"
                  className="animate-pulse"
                />
              )}
            </svg>
            <div
              className={`absolute transition-all duration-300 w-18 h-18 sm:w-22 sm:h-22 rounded-full border-3 sm:border-4 border-rose-600 flex items-center justify-center ${
                isP1Attacker ? 'right-6 sm:right-12' : 'left-6 sm:left-12'
              } ${phase === 'impact' ? 'scale-125 bg-rose-500/30' : 'scale-100 animate-spin'}`}
            >
              <div className="w-full h-0.5 bg-rose-600 absolute" />
              <div className="h-full w-0.5 bg-rose-600 absolute" />
            </div>
            {phase === 'impact' && (
              <div
                className={`absolute text-2xl sm:text-3xl font-retro font-black text-rose-600 animate-ping ${
                  isP1Attacker ? 'right-10 sm:right-16' : 'left-10 sm:left-16'
                }`}
              >
                💥 HEADSHOT!
              </div>
            )}
          </div>
        )}

        {/* WEAPON 3: BAZOOKA */}
        {animData.weapon === 'bazooka' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className={`absolute transition-all duration-500 flex items-center ${
                phase === 'charging'
                  ? isP1Attacker ? 'left-6 scale-75' : 'right-6 scale-75'
                  : phase === 'projectile'
                  ? 'left-1/2 -translate-x-1/2 scale-110'
                  : isP1Attacker ? 'right-8 sm:right-12 scale-135' : 'left-8 sm:left-12 scale-135'
              }`}
            >
              {phase !== 'impact' ? (
                <div className={`flex items-center gap-1 ${!isP1Attacker ? 'rotate-180' : ''}`}>
                  <span className="text-3xl animate-pulse">💨</span>
                  <span className="text-5xl sm:text-6xl">🚀</span>
                </div>
              ) : (
                <div className="relative animate-bounce text-center">
                  <div className="text-7xl sm:text-8xl animate-ping">💥</div>
                  <div className="font-retro font-black text-xl sm:text-2xl text-[#0f172a] -rotate-12 bg-amber-300 px-3 py-1 rounded-xl border-3 border-[#0f172a] shadow mt-1">
                    KABOOM!!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEAPON 4: BOW */}
        {animData.weapon === 'bow' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className={`absolute transition-all duration-400 flex items-center ${
                phase === 'charging'
                  ? isP1Attacker ? 'left-6 scale-90' : 'right-6 scale-90'
                  : phase === 'projectile'
                  ? 'left-1/2 -translate-x-1/2 scale-110'
                  : isP1Attacker ? 'right-8 sm:right-14 scale-125' : 'left-8 sm:left-14 scale-125'
              }`}
            >
              <div className={`flex items-center text-5xl sm:text-6xl ${!isP1Attacker ? 'rotate-180' : ''}`}>
                🏹
              </div>
            </div>
            {phase === 'impact' && (
              <div
                className={`absolute text-2xl sm:text-3xl font-retro font-black text-amber-900 animate-bounce ${
                  isP1Attacker ? 'right-6 sm:right-10' : 'left-6 sm:left-10'
                }`}
              >
                🎯 BULLSEYE!
              </div>
            )}
          </div>
        )}

        {/* WEAPON 5: LASER */}
        {animData.weapon === 'laser' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 500 100" className="w-full h-full">
              <line
                x1={isP1Attacker ? '30' : '470'}
                y1="50"
                x2={isP1Attacker ? '470' : '30'}
                y2="50"
                stroke="#06b6d4"
                strokeWidth="12"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <line
                x1={isP1Attacker ? '30' : '470'}
                y1="50"
                x2={isP1Attacker ? '470' : '30'}
                y2="50"
                stroke="#facc15"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
            {phase === 'impact' && (
              <div
                className={`absolute text-2xl sm:text-3xl font-retro font-black text-cyan-600 animate-ping ${
                  isP1Attacker ? 'right-8 sm:right-12' : 'left-8 sm:left-12'
                }`}
              >
                ⚡ ZZZAP!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
