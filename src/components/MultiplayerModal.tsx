import React, { useState, useEffect } from 'react';
import { P2PNetworkManager, networkManager } from '../utils/network';
import { firebaseSync } from '../utils/firebaseSync';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'modes' | 'host' | 'join';
  initialRoomCode?: string;
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
  initialRoomCode = '',
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
  const [inputCode, setInputCode] = useState<string>(initialRoomCode);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setNetworkStatus('');
      setIsConnecting(false);

      if (initialRoomCode) {
        setInputCode(initialRoomCode);
      }

      if (initialTab === 'host') {
        const code = P2PNetworkManager.generateRoomCode();
        setRoomCode(code);
        setActiveTab('host');
        onStartOnlineHost('online_p2p', code);
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, initialRoomCode]);

  // Hook into live network manager status
  useEffect(() => {
    networkManager.onStatusChange = (status: string) => {
      setNetworkStatus(status);
      if (status.toLowerCase().includes('connected')) {
        setIsConnecting(false);
      }
      if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
        setIsConnecting(false);
        setErrorMessage(status);
      }
    };
  }, []);

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
    setNetworkStatus('Creating room & registering with STUN/TURN relays...');
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
    setNetworkStatus('');
  };

  const submitJoin = () => {
    const normalized = P2PNetworkManager.normalizeRoomCode(inputCode);
    if (!normalized.cleanCode) {
      setErrorMessage('Please enter a valid room code (e.g. SM-7492)');
      return;
    }
    setIsConnecting(true);
    setErrorMessage('');
    setNetworkStatus('Connecting to room across internet (STUN/TURN)...');
    onStartOnlineJoin(onlineType === 'firebase' ? 'online_firebase' : 'online_p2p', normalized.displayCode);
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = P2PNetworkManager.normalizeRoomCode(text);
      if (normalized.displayCode) {
        setInputCode(normalized.displayCode);
      } else {
        setInputCode(text.trim().toUpperCase());
      }
    } catch {
      // Clipboard access denied, user can type manually
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#fffefb] rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[8px_8px_0px_#0f172a] p-5 sm:p-6 overflow-hidden">
        {/* Retro Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-amber-400 border-b-2 border-[#0f172a]" />

        <div className="flex items-center justify-between mt-1 mb-3 border-b-2 border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <h2 className="text-xl sm:text-2xl font-retro font-black text-[#0f172a] uppercase tracking-wide">
              {activeTab === 'host'
                ? 'ONLINE MATCH HOST'
                : activeTab === 'join'
                ? 'JOIN ROOM MATCH'
                : 'SELECT BATTLE MODE'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border-2 border-[#0f172a] bg-white hover:bg-slate-100 flex items-center justify-center font-retro font-bold text-slate-800 text-xs shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-2.5 p-2 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-800 text-xs font-retro font-bold flex items-start gap-1.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Live Network Status Indicator */}
        {networkStatus && !errorMessage && (
          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-mono font-bold flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{networkStatus}</span>
          </div>
        )}

        {/* TAB: MODES */}
        {activeTab === 'modes' && (
          <div className="space-y-2.5 font-retro">
            {/* Realtime Cloud Relay Section */}
            <div className="p-3.5 bg-amber-100/70 border-2 sm:border-3 border-[#0f172a] rounded-2xl shadow-[3px_3px_0px_#0f172a]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🌐</span>
                  <span className="font-black text-sm sm:text-base text-[#0f172a]">ONLINE ROOM MATCH</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 border border-[#0f172a] text-[9px] font-mono font-black text-[#0f172a]">
                  GLOBAL CLOUD RELAY
                </span>
              </div>
              <p className="text-xs font-hand font-bold text-slate-600 mb-1">
                Play across any city (Pondicherry ⇄ Bengaluru) on phone 4G/5G or Wi-Fi with instant room codes!
              </p>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 mb-2.5">
                <span>✓ 100% Connect Rate (Bypasses Mobile CGNAT & Firewalls)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartHosting('p2p')}
                  className="btn-retro py-2 px-3 bg-amber-400 hover:bg-amber-300 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  ⚔️ CREATE MATCH
                </button>
                <button
                  onClick={() => handleStartJoining('p2p')}
                  className="btn-retro py-2 px-3 bg-white hover:bg-slate-100 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  🔑 JOIN MATCH
                </button>
              </div>
            </div>

            {/* Local Pass & Play */}
            <button
              onClick={() => {
                onSelectLocal();
                onClose();
              }}
              className="btn-retro w-full flex items-center justify-between p-2.5 bg-white hover:bg-blue-50 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-200 border-2 border-[#0f172a] flex items-center justify-center text-xl shrink-0 shadow-xs">
                  👥
                </div>
                <div>
                  <div className="font-black text-sm text-[#0f172a]">PASS & PLAY (2 PLAYERS)</div>
                  <div className="text-[11px] font-hand font-bold text-slate-500">Play side-by-side on this same screen</div>
                </div>
              </div>
              <span className="text-xs font-black text-blue-700">PLAY →</span>
            </button>

            {/* Solo vs AI */}
            <button
              onClick={() => {
                onSelectAI();
                onClose();
              }}
              className="btn-retro w-full flex items-center justify-between p-2.5 bg-white hover:bg-purple-50 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-200 border-2 border-[#0f172a] flex items-center justify-center text-xl shrink-0 shadow-xs">
                  🤖
                </div>
                <div>
                  <div className="font-black text-sm text-[#0f172a]">SOLO VS STICKBOT (AI)</div>
                  <div className="text-[11px] font-hand font-bold text-slate-500">Battle against the automated notebook bot</div>
                </div>
              </div>
              <span className="text-xs font-black text-purple-700">FIGHT →</span>
            </button>

            {/* Firebase option */}
            <div className="pt-1.5 flex items-center justify-between border-t border-slate-200 text-xs">
              <span className="text-slate-500 text-[10px] font-mono">Firebase RTDB Backup:</span>
              <div className="flex gap-2">
                <button onClick={onOpenFirebaseConfig} className="text-blue-700 font-bold underline hover:text-blue-900 text-xs">
                  Config
                </button>
                <button onClick={() => handleStartHosting('firebase')} className="text-amber-800 font-black hover:underline text-xs">
                  Host via Firebase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HOST ROOM */}
        {activeTab === 'host' && (
          <div className="text-center py-2 space-y-3 font-retro">
            <span className="px-3 py-0.5 bg-amber-300 border-2 border-[#0f172a] rounded-full text-[10px] font-black uppercase tracking-wider text-[#0f172a] shadow-xs inline-block">
              YOUR MATCH ROOM CODE
            </span>

            <div className="space-y-1">
              <div
                className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-blue-900 select-all cursor-pointer bg-white py-2.5 px-4 rounded-2xl border-3 border-dashed border-blue-500 max-w-xs mx-auto shadow-inner"
                onClick={copyCodeOnly}
              >
                {roomCode}
              </div>
              <span className="text-[11px] font-hand font-bold text-slate-500">Tap code to copy</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={copyCodeOnly}
                className="btn-retro px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1"
              >
                <span>{copyCodeSuccess ? '✓ COPIED!' : '📋 COPY CODE'}</span>
              </button>
              <button
                onClick={copyMatchLink}
                className="btn-retro px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#0f172a] rounded-xl text-xs font-black inline-flex items-center gap-1"
              >
                <span>{copyLinkSuccess ? '✓ LINK COPIED!' : '🔗 COPY MATCH LINK'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-hand space-y-1">
              <p className="font-bold">Share this code or link with Player 2 on any phone or PC!</p>
              <p className="text-[10px] text-slate-500 font-mono">
                Works across different cities (Pondicherry ⇄ Bengaluru) on phone 4G/5G and Wi-Fi via Cloud Relay.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button onClick={() => setActiveTab('modes')} className="text-xs text-slate-600 font-bold hover:underline">
                ← Back to Modes
              </button>
            </div>
          </div>
        )}

        {/* TAB: JOIN ROOM */}
        {activeTab === 'join' && (
          <div className="py-2 space-y-3 font-retro">
            <div className="text-center">
              <h3 className="text-lg font-black text-[#0f172a] uppercase">ENTER MATCH CODE</h3>
              <p className="text-xs font-hand font-bold text-slate-500">Type or paste the 4-letter room code shared by the host</p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="SM-XXXX"
                  maxLength={10}
                  className="w-full text-center text-3xl font-mono font-black tracking-widest uppercase bg-white border-3 border-[#0f172a] rounded-2xl py-2 px-3 focus:outline-none focus:ring-4 focus:ring-amber-300 shadow-[3px_3px_0px_#0f172a]"
                  autoFocus
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="text-xs font-hand font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  📋 Paste from Clipboard
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setIsConnecting(false);
                  setActiveTab('modes');
                }}
                className="btn-retro px-4 py-1.5 bg-white text-[#0f172a] rounded-xl text-xs font-black"
              >
                BACK
              </button>
              <button
                onClick={submitJoin}
                disabled={isConnecting}
                className={`btn-retro px-5 py-1.5 text-[#0f172a] rounded-xl text-xs font-black ${
                  isConnecting ? 'bg-amber-200 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {isConnecting ? 'CONNECTING...' : '⚔️ JOIN MATCH'}
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                Supports cross-carrier cellular data and Wi-Fi NAT traversal
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
