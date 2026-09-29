import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, CloudOff, LogIn, LogOut, User as UserIcon, RefreshCw, AlertCircle, X } from 'lucide-react';

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
  const { user, loading, authError, clearAuthError, signInWithGoogle, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      <div className="flex items-center gap-2 flex-wrap">
        {isOnline ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Cloud size={13} className="text-emerald-600" />
            <span>Firebase Cloud: Đã kết nối (asia-southeast1)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
            <CloudOff size={13} className="text-amber-600" />
            <span>Chế độ ngoại tuyến (Dữ liệu lưu an toàn trên máy)</span>
          </span>
        )}

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
            <span className="hidden md:inline">{isSyncing ? 'Đang đồng bộ...' : 'Làm mới Cloud'}</span>
          </button>
        )}

        {authError && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 text-[11px] border border-red-200">
            <AlertCircle size={12} className="text-red-500 shrink-0" />
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="p-0.5 hover:bg-red-100 rounded text-red-500 cursor-pointer"
              title="Đóng thông báo"
            >
              <X size={12} />
            </button>
          </span>
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
            <span>{isLoggingIn ? 'Đang mở đăng nhập...' : 'Đăng nhập Google'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
