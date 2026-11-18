import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#fffefb] rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[10px_10px_0px_#0f172a] p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        {/* Retro Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-2 border-[#0f172a]" />

        <div className="flex items-center justify-between mt-1 mb-3 border-b-2 border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2 className="text-xl sm:text-2xl font-retro font-black text-[#0f172a] uppercase tracking-wide">
              COMBAT RULEBOOK & FAIR PLAY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border-2 border-[#0f172a] bg-white hover:bg-slate-100 flex items-center justify-center font-retro font-black text-slate-800 text-xs shadow-xs"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 font-retro text-[#0f172a] text-xs sm:text-sm">
          <div className="p-3 bg-amber-200/80 rounded-2xl border-2 border-[#0f172a] shadow-xs">
            <span className="font-black text-amber-950">🎯 MISSION OBJECTIVE:</span> Eliminate all 5 lanes of your opponent's stickman army before they eliminate yours!
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-300">
            <h3 className="font-black text-sm text-[#0f172a] flex items-center gap-1.5">
              <span>🎲</span> THE 10-NUMBER DIE & LIVE CENTER REVEAL:
            </h3>
            <div className="space-y-1 mt-1 text-xs font-hand">
              <p>
                Every roll is revealed in a <strong>big center-screen pop-up card for 1.2 seconds</strong> to both players before the action executes, so no move is ever missed!
              </p>
              <p>
                <strong className="text-emerald-700 font-retro font-black">EVEN [0, 2, 4, 6, 8]:</strong> Advances recruitment or triggers attack on that specific lane!
              </p>
              <p>
                <strong className="text-amber-700 font-retro font-black">ODD [1, 3, 5, 7, 9]:</strong> Turn skipped! You must wait for your next turn to roll an even number.
              </p>
            </div>
          </div>

          {/* 50/50 Balance Section */}
          <div className="p-2.5 rounded-xl bg-blue-50 border-2 border-blue-400">
            <h3 className="font-black text-sm text-blue-900 flex items-center gap-1.5">
              <span>⚖️</span> 50/50 FAIR COMBAT & ANTI-SNOWBALL RULES:
            </h3>
            <ul className="space-y-1.5 mt-1.5 text-xs">
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-blue-200 border border-blue-700 text-blue-950 font-black text-[9px] shrink-0">1-USE WEAPON</span>
                <span><strong>Weapon Durability:</strong> Attacking consumes your weapon! The stickman stays alive (Stage 5 Assembled), but must re-arm to attack again. This prevents infinite attack spam!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-amber-200 border border-amber-700 text-amber-950 font-black text-[9px] shrink-0">DEFENSE</span>
                <span><strong>Weapon Clash:</strong> If you strike an opponent lane that is ALSO armed, the weapons CLASH! Both weapons shatter, and the target lane is SAVED from death!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-emerald-200 border border-emerald-700 text-emerald-950 font-black text-[9px] shrink-0">COMEBACK</span>
                <span><strong>Adrenaline Re-roll:</strong> Rolling an already destroyed lane grants a free instant re-roll, keeping trailing players in the fight!</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-300">
            <h3 className="font-black text-sm text-[#0f172a] flex items-center gap-1.5">
              <span>✏️</span> 6-STEP SEQUENTIAL ASSEMBLY:
            </h3>
            <ul className="space-y-1 mt-1 text-xs">
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-600 text-blue-900 font-black text-[9px] shrink-0">STEP 1</span>
                <span><strong>Head Circle:</strong> 1st roll draws empty round head contour.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-600 text-blue-900 font-black text-[9px] shrink-0">STEP 2</span>
                <span><strong>Face & Smile:</strong> 2nd roll sketches fighter eyes & smile.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-600 text-blue-900 font-black text-[9px] shrink-0">STEP 3</span>
                <span><strong>Torso Spine:</strong> 3rd roll draws backbone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-600 text-blue-900 font-black text-[9px] shrink-0">STEP 4</span>
                <span><strong>Combat Arms:</strong> 4th roll adds arms & hands.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-600 text-emerald-900 font-black text-[9px] shrink-0">STEP 5</span>
                <span><strong>Legs (Assembled):</strong> 5th roll adds legs — stickman is fully formed & READY!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.2 rounded bg-amber-200 border border-amber-700 text-amber-950 font-black text-[9px] shrink-0">STEP 6</span>
                <span><strong>Armory Weapon:</strong> 6th roll equips weapon from armory.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="btn-retro px-6 py-2 bg-amber-400 hover:bg-amber-300 font-retro font-black text-sm text-[#0f172a] rounded-xl shadow-[3px_3px_0px_#0f172a]"
            >
              GOT IT! RETURN TO BATTLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
