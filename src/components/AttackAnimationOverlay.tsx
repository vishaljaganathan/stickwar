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

    // 0ms -> 300ms: Charging / aim
    const timer1 = setTimeout(() => {
      setPhase('projectile');
    }, 280);

    // 300ms -> 750ms: Projectile flight
    const timer2 = setTimeout(() => {
      setPhase('impact');
    }, 720);

    // 750ms -> 1150ms: Impact / finish
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
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      {/* Background Dim & Paper Shake */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity" />

      {/* Top Attack Announcement Banner */}
      <div className="relative z-10 -mt-16 mb-4 animate-bounce">
        <div className="px-5 py-2 rounded-2xl bg-[#fdfbf7] border-4 border-gray-900 shadow-[6px_6px_0px_#1e293b] flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">{weaponInfo.icon}</span>
          <div>
            <div
              className="font-extrabold text-xl sm:text-2xl text-gray-900 uppercase tracking-wider"
              style={{ fontFamily: "'Architects Daughter', cursive" }}
            >
              {weaponInfo.name} ATTACK!
            </div>
            <div className="text-xs sm:text-sm font-hand font-bold text-gray-600">
              {isP1Attacker ? 'Player 1' : 'Player 2'} (Row {animData.fromRow}) ➔ Target (Row {animData.targetRow})
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Weapon Animation Stage */}
      <div className="relative w-full max-w-2xl h-56 flex items-center justify-center">
        {/* WEAPON 1: SWORD (INK KATANA) */}
        {animData.weapon === 'sword' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Slash lines */}
            <div
              className={`absolute inset-0 transition-transform duration-300 flex items-center justify-center ${
                phase === 'charging'
                  ? 'scale-75 -rotate-45 opacity-50'
                  : 'scale-125 rotate-12 opacity-100'
              }`}
            >
              <svg viewBox="0 0 400 200" className="w-full h-full">
                {/* Curved broadsword slash arc */}
                <path
                  d={isP1Attacker ? "M 50 180 Q 200 20 350 90" : "M 350 180 Q 200 20 50 90"}
                  fill="none"
                  stroke="#1e293b"
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
                {/* Slash sparks */}
                <circle cx={isP1Attacker ? "320" : "80"} cy="100" r="16" fill="#facc15" className="animate-ping" />
                <path
                  d={isP1Attacker ? "M 300 80 L 340 120 M 340 80 L 300 120" : "M 60 80 L 100 120 M 100 80 L 60 120"}
                  stroke="#dc2626"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>
        )}

        {/* WEAPON 2: SNIPER (BALLPOINT SNIPER) */}
        {animData.weapon === 'sniper' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Red Laser Tracer Line */}
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

            {/* Target Reticle Crosshair */}
            <div
              className={`absolute transition-all duration-300 w-24 h-24 rounded-full border-4 border-rose-600 flex items-center justify-center ${
                isP1Attacker ? 'right-12' : 'left-12'
              } ${phase === 'impact' ? 'scale-125 bg-rose-500/30' : 'scale-100 animate-spin'}`}
            >
              <div className="w-full h-0.5 bg-rose-600 absolute" />
              <div className="h-full w-0.5 bg-rose-600 absolute" />
              <div className="w-4 h-4 rounded-full border-2 border-rose-600" />
            </div>

            {phase === 'impact' && (
              <div
                className={`absolute text-2xl font-doodle font-extrabold text-rose-600 animate-ping ${
                  isP1Attacker ? 'right-16' : 'left-16'
                }`}
              >
                💥 HEADSHOT!
              </div>
            )}
          </div>
        )}

        {/* WEAPON 3: BAZOOKA (ERASER BAZOOKA) */}
        {animData.weapon === 'bazooka' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Flying Rocket with Smoke Trails */}
            <div
              className={`absolute transition-all duration-500 flex items-center ${
                phase === 'charging'
                  ? isP1Attacker
                    ? 'left-8 scale-75'
                    : 'right-8 scale-75'
                  : phase === 'projectile'
                  ? 'left-1/2 -translate-x-1/2 scale-110'
                  : isP1Attacker
                  ? 'right-12 scale-150'
                  : 'left-12 scale-150'
              }`}
            >
              {phase !== 'impact' ? (
                <div className={`flex items-center gap-1 ${!isP1Attacker ? 'rotate-180' : ''}`}>
                  <span className="text-3xl animate-pulse">💨</span>
                  <span className="text-5xl">🚀</span>
                </div>
              ) : (
                /* Cartoon Explosion */
                <div className="relative animate-bounce">
                  <div className="text-7xl animate-ping">💥</div>
                  <div className="absolute inset-0 flex items-center justify-center font-doodle font-extrabold text-2xl text-amber-900 -rotate-12 bg-yellow-300 px-3 py-1 rounded-xl border-3 border-gray-900 shadow">
                    KABOOM!!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEAPON 4: BOW (RULER BOW) */}
        {animData.weapon === 'bow' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Arrow flying */}
            <div
              className={`absolute transition-all duration-400 flex items-center ${
                phase === 'charging'
                  ? isP1Attacker
                    ? 'left-8 scale-90'
                    : 'right-8 scale-90'
                  : phase === 'projectile'
                  ? 'left-1/2 -translate-x-1/2 scale-110'
                  : isP1Attacker
                  ? 'right-16 scale-125'
                  : 'left-16 scale-125'
              }`}
            >
              <div className={`flex items-center text-5xl ${!isP1Attacker ? 'rotate-180' : ''}`}>
                🏹
              </div>
            </div>

            {phase === 'impact' && (
              <div
                className={`absolute text-2xl font-doodle font-extrabold text-amber-900 animate-bounce ${
                  isP1Attacker ? 'right-10' : 'left-10'
                }`}
              >
                🎯 BULLSEYE!
              </div>
            )}
          </div>
        )}

        {/* WEAPON 5: LASER (HIGHLIGHTER BLASTER) */}
        {animData.weapon === 'laser' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Electric Laser Beam */}
            <svg viewBox="0 0 500 100" className="w-full h-full">
              <line
                x1={isP1Attacker ? '40' : '460'}
                y1="50"
                x2={isP1Attacker ? '460' : '40'}
                y2="50"
                stroke="#06b6d4"
                strokeWidth="14"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <line
                x1={isP1Attacker ? '40' : '460'}
                y1="50"
                x2={isP1Attacker ? '460' : '40'}
                y2="50"
                stroke="#facc15"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Lightning zaps */}
              <circle cx={isP1Attacker ? '450' : '50'} cy="50" r="28" fill="#fef08a" className="animate-ping" />
            </svg>
            {phase === 'impact' && (
              <div
                className={`absolute text-2xl font-doodle font-extrabold text-cyan-600 animate-ping ${
                  isP1Attacker ? 'right-12' : 'left-12'
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
