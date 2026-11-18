import React, { useState, useEffect } from 'react';
import { P2PNetworkManager } from '../utils/network';
import { firebaseSync } from '../utils/firebaseSync';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'modes' | 'host' | 'join';
  onClose: () => void;
  onSelectLocal: () => void;
  onSelectAI: () => void;
  onStartOnlineHost: (mode: 'online_p2p' | 'online_firebase', roomCode: string) => void;
  onStartOnlineJoin: (mode: 'online_p2p' | 'online_firebase', roomCode: string) => void;
  onOpenFirebaseConfig: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  initialTab = 'modes',
  onClose,
  onSelectLocal,
  onSelectAI,
  onStartOnlineHost,
  onStartOnlineJoin,
  onOpenFirebaseConfig
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'host' | 'join'>(initialTab);
  const [onlineType, setOnlineType] = useState<'p2p' | 'firebase'>('p2p');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'host') {
        const code = P2PNetworkManager.generateRoomCode();
        setRoomCode(code);
        setActiveTab('host');
        onStartOnlineHost('online_p2p', code);
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleStartHosting = (type: 'p2p' | 'firebase') => {
    if (type === 'firebase' && !firebaseSync.isConfigured()) {
      onOpenFirebaseConfig();
      return;
    }

    const code = P2PNetworkManager.generateRoomCode();
    setRoomCode(code);
    setOnlineType(type);
    setActiveTab('host');
    setErrorMessage('');
    onStartOnlineHost(type === 'firebase' ? 'online_firebase' : 'online_p2p', code);
  };

  const handleStartJoining = (type: 'p2p' | 'firebase') => {
    if (type === 'firebase' && !firebaseSync.isConfigured()) {
      onOpenFirebaseConfig();
      return;
    }
    setOnlineType(type);
    setActiveTab('join');
    setErrorMessage('');
  };

  const submitJoin = () => {
    if (!inputCode.trim()) {
      setErrorMessage('Please enter a room code');
      return;
    }
    setIsConnecting(true);
    setErrorMessage('');
    onStartOnlineJoin(onlineType === 'firebase' ? 'online_firebase' : 'online_p2p', inputCode.trim().toUpperCase());
  };

  const copyCodeOnly = () => {
    navigator.clipboard.writeText(roomCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const copyMatchLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const inviteUrl = `${origin}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#fdfbf7] rounded-3xl border-4 border-gray-900 shadow-[8px_8px_0px_#1e293b] p-5 sm:p-6 overflow-hidden">
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-amber-400 border-b-2 border-gray-800" />

        <div className="flex items-center justify-between mt-1 mb-3 border-b-2 border-blue-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <h2
              className="text-2xl font-extrabold text-gray-900"
              style={{ fontFamily: "'Patrick Hand', cursive" }}
            >
              {activeTab === 'host'
                ? 'Online Room Match Created'
                : activeTab === 'join'
                ? 'Join Room Match'
                : 'Select Game Mode'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border-2 border-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mb-2.5 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-hand font-bold">
            {errorMessage}
          </div>
        )}

        {/* TAB: MODES */}
        {activeTab === 'modes' && (
          <div className="space-y-2.5 font-hand">
            {/* Quick Online Match Section */}
            <div className="p-3.5 bg-amber-50/90 border-2 border-dashed border-amber-400 rounded-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🌐</span>
                  <span className="font-bold text-base text-gray-900">Real-Time Room Match (WebRTC)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                  Instant / Free
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2.5">
                Play on different devices or tabs in real-time. Share the room code with your friend!
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartHosting('p2p')}
                  className="py-2 px-3 bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-gray-900 rounded-xl font-bold text-sm text-gray-900 shadow-[2px_2px_0px_#1e293b]"
                >
                  ⚔️ Create Match
                </button>
                <button
                  onClick={() => handleStartJoining('p2p')}
                  className="py-2 px-3 bg-white hover:bg-gray-100 active:scale-95 border-2 border-gray-900 rounded-xl font-bold text-sm text-gray-800 shadow-[2px_2px_0px_#1e293b]"
                >
                  🔑 Join Match
                </button>
              </div>
            </div>

            {/* Local Pass & Play */}
            <button
              onClick={() => {
                onSelectLocal();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-amber-100/60 active:scale-[0.98] border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_#1e293b] text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 border-2 border-blue-800 flex items-center justify-center text-xl shrink-0">
                  👥
                </div>
                <div>
                  <div className="font-bold text-base text-gray-900 leading-tight">Pass & Play (Local 2P)</div>
                  <div className="text-[11px] text-gray-500">Play together on this same screen</div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700">Play Now →</span>
            </button>

            {/* Solo vs AI */}
            <button
              onClick={() => {
                onSelectAI();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-amber-100/60 active:scale-[0.98] border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_#1e293b] text-left transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-100 border-2 border-purple-800 flex items-center justify-center text-xl shrink-0">
                  🤖
                </div>
                <div>
                  <div className="font-bold text-base text-gray-900 leading-tight">Solo vs StickBot (AI)</div>
                  <div className="text-[11px] text-gray-500">Practice against intelligent automated bot</div>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700">Fight AI →</span>
            </button>

            {/* Firebase option */}
            <div className="pt-1.5 flex items-center justify-between border-t border-gray-200 text-xs">
              <span className="text-gray-500 text-[11px]">Firebase Realtime Database mode:</span>
              <div className="flex gap-2">
                <button onClick={onOpenFirebaseConfig} className="text-blue-700 underline font-bold hover:text-blue-900">
                  Config
                </button>
                <button onClick={() => handleStartHosting('firebase')} className="text-amber-800 font-bold hover:underline">
                  Host via Firebase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HOST ROOM */}
        {activeTab === 'host' && (
          <div className="text-center font-hand py-2 space-y-3">
            <div className="inline-block px-3 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs font-bold text-amber-900">
              Host Match Code
            </div>

            <div className="space-y-1">
              <div
                className="text-4xl font-extrabold tracking-widest text-blue-900 select-all cursor-pointer bg-white py-2.5 px-4 rounded-xl border-3 border-dashed border-blue-400 max-w-xs mx-auto shadow-inner"
                onClick={copyCodeOnly}
              >
                {roomCode}
              </div>
              <span className="text-[11px] text-gray-500">Tap room code to copy</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={copyCodeOnly}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_#1e293b] active:scale-95 text-xs inline-flex items-center gap-1"
              >
                <span>{copyCodeSuccess ? '✓ Code Copied!' : '📋 Copy Code'}</span>
              </button>
              <button
                onClick={copyMatchLink}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_#1e293b] active:scale-95 text-xs inline-flex items-center gap-1"
              >
                <span>{copyLinkSuccess ? '✓ Link Copied!' : '🔗 Copy Match Link'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 pt-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Waiting for Player 2 to join...</span>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <button onClick={() => setActiveTab('modes')} className="text-xs text-gray-600 hover:underline">
                ← Back to Mode Selection
              </button>
            </div>
          </div>
        )}

        {/* TAB: JOIN ROOM */}
        {activeTab === 'join' && (
          <div className="font-hand py-2 space-y-3">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Enter Match Room Code</h3>
              <p className="text-xs text-gray-500">Ask the host for their 4-letter or 6-character room code</p>
            </div>

            <div className="max-w-xs mx-auto">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. SM-7492"
                maxLength={10}
                className="w-full text-center text-3xl font-extrabold tracking-widest uppercase bg-white border-3 border-blue-500 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
              />
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => setActiveTab('modes')}
                className="px-4 py-1.5 border-2 border-gray-700 rounded-lg font-bold text-gray-700 hover:bg-gray-100 text-xs"
              >
                Back
              </button>
              <button
                onClick={submitJoin}
                disabled={isConnecting}
                className="px-5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 font-bold text-gray-900 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_#1e293b] text-xs"
              >
                {isConnecting ? 'Connecting...' : '⚔️ Join Match'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
