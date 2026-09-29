import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, CloudCheck, LogIn, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';

interface FirebaseSyncBarProps {
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  onManualSync?: () => void;
}

export const FirebaseSyncBar: React.FC<FirebaseSyncBarProps> = ({
  isSyncing = false,
  lastSyncedAt,
  onManualSync
}) => {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-blue-100/80 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Cloud status */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Cloud size={13} className="text-emerald-600" />
          <span>Firebase Cloud: Đã kết nối (asia-southeast1)</span>
        </span>

        {lastSyncedAt && (
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Cập nhật lần cuối: <strong>{new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}</strong>
          </span>
        )}

        {onManualSync && (
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Đồng bộ lại với Firebase Cloud"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Làm mới Cloud</span>
          </button>
        )}
      </div>

      {/* User Auth */}
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="text-[11px] text-slate-400">Đang kiểm tra...</span>
        ) : user ? (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full border border-blue-200 object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                <UserIcon size={12} />
              </div>
            )}
            <span className="font-bold text-slate-700 max-w-[140px] truncate" title={user.displayName || user.email || ''}>
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <LogIn size={13} />
            <span>Đăng nhập Google</span>
          </button>
        )}
      </div>
    </div>
  );
};
