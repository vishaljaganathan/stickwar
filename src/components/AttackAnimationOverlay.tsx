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
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-fade-in p-2">
      {/* Background Dim */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity" />

      {/* Attack Announcement Banner */}
      <div className="relative z-10 -mt-8 sm:-mt-14 mb-2 animate-bounce max-w-[95vw]">
        <div className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl bg-[#fdfbf7] border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_#1e293b] flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-4xl">{weaponInfo.icon}</span>
          <div>
            <div
              className="font-extrabold text-base sm:text-2xl text-gray-900 uppercase tracking-wider leading-tight"
              style={{ fontFamily: "'Architects Daughter', cursive" }}
            >
              {weaponInfo.name} ATTACK!
            </div>
            <div className="text-[11px] sm:text-sm font-hand font-bold text-gray-600">
              {isP1Attacker ? 'Player 1' : 'Player 2'} (Row {animData.fromRow}) ➔ Row {animData.targetRow}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Weapon Animation Stage */}
      <div className="relative w-full max-w-xl h-40 sm:h-52 flex items-center justify-center">
        {/* WEAPON 1: SWORD */}
        {animData.weapon === 'sword' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className={`absolute inset-0 transition-transform duration-300 flex items-center justify-center ${
                phase === 'charging'
                  ? 'scale-75 -rotate-45 opacity-50'
                  : 'scale-115 rotate-12 opacity-100'
              }`}
            >
              <svg viewBox="0 0 400 200" className="w-full h-full">
                <path
                  d={isP1Attacker ? "M 50 180 Q 200 20 350 90" : "M 350 180 Q 200 20 50 90"}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="animate-draw-stroke"
                />
                <path
                  d={isP1Attacker ? "M 70 170 Q 200 35 340 100" : "M 330 170 Q 200 35 60 100"}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx={isP1Attacker ? "320" : "80"} cy="100" r="14" fill="#facc15" className="animate-ping" />
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
                  strokeWidth="4"
                  strokeDasharray="10 5"
                  className="animate-pulse"
                />
              )}
            </svg>
            <div
              className={`absolute transition-all duration-300 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 border-rose-600 flex items-center justify-center ${
                isP1Attacker ? 'right-6 sm:right-12' : 'left-6 sm:left-12'
              } ${phase === 'impact' ? 'scale-125 bg-rose-500/30' : 'scale-100 animate-spin'}`}
            >
              <div className="w-full h-0.5 bg-rose-600 absolute" />
              <div className="h-full w-0.5 bg-rose-600 absolute" />
            </div>
            {phase === 'impact' && (
              <div
                className={`absolute text-xl sm:text-2xl font-doodle font-extrabold text-rose-600 animate-ping ${
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
                  : isP1Attacker ? 'right-8 sm:right-12 scale-130' : 'left-8 sm:left-12 scale-130'
              }`}
            >
              {phase !== 'impact' ? (
                <div className={`flex items-center gap-1 ${!isP1Attacker ? 'rotate-180' : ''}`}>
                  <span className="text-2xl animate-pulse">💨</span>
                  <span className="text-4xl sm:text-5xl">🚀</span>
                </div>
              ) : (
                <div className="relative animate-bounce text-center">
                  <div className="text-6xl sm:text-7xl animate-ping">💥</div>
                  <div className="font-doodle font-extrabold text-lg sm:text-xl text-amber-900 -rotate-12 bg-yellow-300 px-2 py-0.5 rounded-lg border-2 border-gray-900 shadow mt-1">
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
                  : isP1Attacker ? 'right-8 sm:right-14 scale-120' : 'left-8 sm:left-14 scale-120'
              }`}
            >
              <div className={`flex items-center text-4xl sm:text-5xl ${!isP1Attacker ? 'rotate-180' : ''}`}>
                🏹
              </div>
            </div>
            {phase === 'impact' && (
              <div
                className={`absolute text-xl sm:text-2xl font-doodle font-extrabold text-amber-900 animate-bounce ${
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
                strokeWidth="10"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <line
                x1={isP1Attacker ? '30' : '470'}
                y1="50"
                x2={isP1Attacker ? '470' : '30'}
                y2="50"
                stroke="#facc15"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            {phase === 'impact' && (
              <div
                className={`absolute text-xl sm:text-2xl font-doodle font-extrabold text-cyan-600 animate-ping ${
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
