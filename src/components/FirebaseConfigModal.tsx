import React, { useState } from 'react';
import { firebaseSync, FirebaseConfig } from '../utils/firebaseSync';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const existingConfig = firebaseSync.getSavedConfig();
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || '');
  const [databaseURL, setDatabaseURL] = useState(existingConfig?.databaseURL || '');
  const [projectId, setProjectId] = useState(existingConfig?.projectId || '');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !databaseURL) {
      alert('Please fill in at least API Key and Realtime Database URL');
      return;
    }

    firebaseSync.saveConfig({
      apiKey: apiKey.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim() || 'stickman-war'
    });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#fdfbf7] rounded-2xl border-4 border-gray-900 shadow-[8px_8px_0px_#1e293b] p-6">
        <h3
          className="text-2xl font-bold text-gray-900 mb-1"
          style={{ fontFamily: "'Architects Daughter', cursive" }}
        >
          🔥 Firebase Realtime Setup
        </h3>
        <p className="text-xs text-gray-600 mb-4 font-hand">
          Enter your Firebase project details to sync matches in Realtime Database. (Or use instant P2P WebRTC which works with zero keys!).
        </p>

        <form onSubmit={handleSave} className="space-y-3 font-hand">
          <div>
            <label className="block text-xs font-bold text-gray-700">API Key *</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
              className="w-full mt-1 px-3 py-1.5 text-sm bg-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">Realtime Database URL *</label>
            <input
              type="url"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://your-app-default-rtdb.firebaseio.com"
              required
              className="w-full mt-1 px-3 py-1.5 text-sm bg-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">Project ID (Optional)</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="my-stickman-project"
              className="w-full mt-1 px-3 py-1.5 text-sm bg-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-600 rounded-lg font-bold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 font-bold text-gray-900 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_#1e293b]"
            >
              Save Config
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
