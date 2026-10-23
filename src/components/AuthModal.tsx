import React, { useState } from 'react';
import { X, LogIn, Mail, User, ShieldCheck, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { loginWithGoogle } from '../firebase';
import {
  syncOrCreateUserProfile,
  saveCustomUserSession,
  isPrimaryAdmin,
  PRIMARY_ADMIN_EMAIL
} from '../services/userService';
import { UserProfile } from '../types/product';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'custom'>('google');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDirectAdminLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const customUid = 'usr_' + PRIMARY_ADMIN_EMAIL.replace(/[^a-zA-Z0-9]/g, '_');
      const profile = await syncOrCreateUserProfile(
        customUid,
        PRIMARY_ADMIN_EMAIL,
        'Kovács Roland (Adminisztrátor)'
      );
      saveCustomUserSession(profile);
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Direct admin login failed:', err);
      setErrorMessage(err?.message || 'Nem sikerült a bejelentkezés.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    try {
      const cred = await loginWithGoogle();
      if (cred && cred.user) {
        const u = cred.user;
        const profile = await syncOrCreateUserProfile(
          u.uid,
          u.email || '',
          u.displayName || undefined
        );
        onSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      const isDomainError =
        err?.code === 'auth/unauthorized-domain' ||
        (err?.message && err.message.includes('unauthorized-domain'));

      if (isDomainError) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedDomain(currentHost);
        setErrorMessage(
          `A(z) "${currentHost}" webcím nincs engedélyezve a Firebase projektben.`
        );
      } else {
        setErrorMessage(err?.message || 'Nem sikerült a Google bejelentkezés.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      setErrorMessage('Kérjük, adja meg az e-mail címet!');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const customUid = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const profile = await syncOrCreateUserProfile(
        customUid,
        cleanEmail,
        cleanName || cleanEmail.split('@')[0],
        secondaryEmail.trim() || undefined
      );

      // Save custom user session
      saveCustomUserSession(profile);

      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Custom login failed:', err);
      setErrorMessage(err?.message || 'Nem sikerült a bejelentkezés.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#DBD8D5]">
        {/* Modal Header */}
        <div className="bg-[#3A5D6B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <KeyRound className="w-5 h-5 text-[#79B6B8]" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Bejelentkezés & Adatlap</h2>
              <p className="text-xs text-[#DBD8D5]">World Wires kft. Rendszer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Ablak bezárása"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Switch Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-[#F8F9FA] border-b border-[#DBD8D5] gap-1">
          <button
            type="button"
            onClick={() => setAuthMethod('google')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
              authMethod === 'google'
                ? 'bg-white text-[#211E1B] shadow-2xs border border-[#DBD8D5]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Google Fiókkal
          </button>

          <button
            type="button"
            onClick={() => setAuthMethod('custom')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
              authMethod === 'custom'
                ? 'bg-white text-[#211E1B] shadow-2xs border border-[#DBD8D5]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Egyéni E-mail / Név
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {unauthorizedDomain ? (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 text-xs sm:text-sm text-amber-950 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-900">
                    Firebase: Nem engedélyezett domain (auth/unauthorized-domain)
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    A Firebase Auth Google belépéshez a jelenlegi webcím még nincs felvéve a Firebase projekt engedélyezett domainjei közé:
                  </p>
                  <code className="block my-2 p-2 bg-white rounded-lg border border-amber-300 font-mono text-xs font-bold text-stone-900 select-all">
                    {unauthorizedDomain}
                  </code>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <p className="font-bold text-stone-800">Hogyan engedélyezhető a Google fiókos belépéshez:</p>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px] sm:text-xs">
                  <li>
                    Nyissa meg a Firebase Konzol beállításait:{' '}
                    <a
                      href="https://console.firebase.google.com/project/folkloric-origin-pxctm/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1e6075] font-bold underline hover:text-[#3A5D6B]"
                    >
                      Firebase Auth Settings megnyitása ↗
                    </a>
                  </li>
                  <li>
                    Kattintson az <strong>Engedélyezett domainek (Authorized domains)</strong> fülre
                  </li>
                  <li>
                    Kattintson a <strong>Domain hozzáadása</strong> gombra, és illessze be:{' '}
                    <span className="font-mono font-bold text-amber-900">{unauthorizedDomain}</span>
                  </li>
                </ol>
              </div>

              <div className="pt-1">
                <p className="text-xs text-stone-600 mb-2 font-medium">
                  Azonnal használhatja a rendszert beállítás nélkül is az alábbi gombbal:
                </p>
                <button
                  type="button"
                  onClick={handleDirectAdminLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Azonnali belépés Adminisztrátorként ({PRIMARY_ADMIN_EMAIL})</span>
                </button>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {authMethod === 'google' ? (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm text-gray-600">
                Jelentkezzen be meglévő Google fiókjával vagy használja a közvetlen belépést:
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-[#DBD8D5] hover:border-[#3A5D6B] bg-white hover:bg-slate-50 text-[#211E1B] font-extrabold text-base flex items-center justify-center gap-3 transition-colors shadow-xs cursor-pointer disabled:bg-gray-100"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Bejelentkezés folyamatban...' : 'Belépés Google fiókkal'}</span>
              </button>

              {/* Direct Admin Login Quick Action */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleDirectAdminLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-[#3A5D6B] text-slate-800 hover:text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-300"
                >
                  <ShieldCheck className="w-4 h-4 text-[#79B6B8]" />
                  <span>Közvetlen belépés: {PRIMARY_ADMIN_EMAIL} (Admin)</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <span className="text-xs text-gray-500 block font-semibold mb-0.5">
                  Tipp a rendszergazdának:
                </span>
                <p className="text-xs text-gray-700">
                  A <strong>{PRIMARY_ADMIN_EMAIL}</strong> fiókkal belépve automatikusan teljes <strong>Adminisztrátor</strong> jogosultságot kap.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomLogin} className="space-y-3.5">
              <p className="text-xs text-gray-600">
                Ha nem rendelkezik Google fiókkal, adja meg a nevét és e-mail címét:
              </p>

              <div>
                <label className="block text-xs font-bold text-[#3A5D6B] mb-1">
                  Munkatárs Neve (Megjelenítendő név)
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-gray-400 absolute left-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="pl. Nagy István vagy Raktáros"
                    className="w-full text-sm font-bold pl-9 pr-3 py-2.5 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3A5D6B] mb-1">
                  E-mail cím *
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="munkatars@worldwires.hu"
                    className="w-full text-sm font-bold pl-9 pr-3 py-2.5 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3A5D6B] mb-1">
                  Másik / Értesítési e-mail cím (opcionális)
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3" />
                  <input
                    type="email"
                    value={secondaryEmail}
                    onChange={(e) => setSecondaryEmail(e.target.value)}
                    placeholder="magan@freemail.hu"
                    className="w-full text-sm font-bold pl-9 pr-3 py-2.5 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-sm transition-colors cursor-pointer shadow-xs disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-[#79B6B8]" />
                  <span>{isLoading ? 'Rögzítés...' : 'Belépés és Adatlap Mentése'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
