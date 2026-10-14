import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Users,
  Mail,
  UserCheck,
  Edit,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Save,
  Info
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/product';
import {
  PRIMARY_ADMIN_EMAIL,
  isPrimaryAdmin,
  updateUserProfileDetails,
  updateUserRoleByAdmin,
  preAssignUserByEmail,
  subscribeToAllUsers
} from '../services/userService';

interface UserManagementViewProps {
  currentUserProfile: UserProfile | null;
  onBack: () => void;
  onGoToList?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onOpenLoginModal?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUserProfile,
  onBack,
  onGoToList,
  onProfileUpdated,
  onOpenLoginModal
}) => {
  // Profile form state
  const [displayName, setDisplayName] = useState(currentUserProfile?.displayName || '');
  const [secondaryEmail, setSecondaryEmail] = useState(currentUserProfile?.secondaryEmail || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Admin user list state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newSecondaryEmail, setNewSecondaryEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  const isAdmin = currentUserProfile?.role === 'admin' || isPrimaryAdmin(currentUserProfile?.email);

  useEffect(() => {
    if (currentUserProfile) {
      setDisplayName(currentUserProfile.displayName || '');
      setSecondaryEmail(currentUserProfile.secondaryEmail || '');
    }
  }, [currentUserProfile]);

  // Subscribe to all users if Admin
  useEffect(() => {
    if (isAdmin) {
      const unsub = subscribeToAllUsers((usersList) => {
        setAllUsers(usersList);
      });
      return () => unsub();
    }
  }, [isAdmin]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;

    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      await updateUserProfileDetails(currentUserProfile.uid, {
        displayName: displayName.trim(),
        secondaryEmail: secondaryEmail.trim()
      });

      const updated: UserProfile = {
        ...currentUserProfile,
        displayName: displayName.trim(),
        secondaryEmail: secondaryEmail.trim()
      };

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }

      setProfileSuccessMsg('Adatlap sikeresen frissítve!');
      setTimeout(() => setProfileSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileErrorMsg(err?.message || 'Hiba történt az adatlap mentésekor.');
      setTimeout(() => setProfileErrorMsg(null), 4000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRoleChange = async (targetUser: UserProfile, role: UserRole) => {
    setAdminActionMsg(null);
    setAdminErrorMsg(null);

    try {
      await updateUserRoleByAdmin(targetUser.uid, targetUser.email, role);
      setAdminActionMsg(`"${targetUser.displayName || targetUser.email}" jogosultsága módosítva: ${getRoleBadgeText(role)}.`);
      setTimeout(() => setAdminActionMsg(null), 3500);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setAdminErrorMsg(err?.message || 'Nem sikerült módosítani a jogosultságot.');
      setTimeout(() => setAdminErrorMsg(null), 4000);
    }
  };

  const handlePreAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsAddingUser(true);
    setAdminActionMsg(null);
    setAdminErrorMsg(null);

    try {
      await preAssignUserByEmail(
        newEmail.trim(),
        newRole,
        newName.trim() || undefined,
        newSecondaryEmail.trim() || undefined
      );

      setAdminActionMsg(`Felhasználó jogosultsága rögzítve: ${newEmail.trim()} (${getRoleBadgeText(newRole)})`);
      setNewEmail('');
      setNewName('');
      setNewSecondaryEmail('');
      setNewRole('viewer');
      setTimeout(() => setAdminActionMsg(null), 3500);
    } catch (err: any) {
      console.error('Error pre-assigning user:', err);
      setAdminErrorMsg(err?.message || 'Hiba történt a jogosultság hozzárendelésekor.');
      setTimeout(() => setAdminErrorMsg(null), 4000);
    } finally {
      setIsAddingUser(false);
    }
  };

  const getRoleBadgeText = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Adminisztrátor';
      case 'editor':
        return 'Szerkesztő';
      case 'viewer':
        return 'Megtekintő (Csak olvasás)';
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold';
      case 'editor':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
      case 'viewer':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Bar with Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#DBD8D5] shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-extrabold text-base transition-colors cursor-pointer border border-[#DBD8D5]"
            title="Visszalépés 1 lépést"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A5D6B]" />
            <span>Vissza</span>
          </button>
          {onGoToList && (
            <button
              type="button"
              onClick={onGoToList}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-base transition-colors cursor-pointer border border-emerald-300"
              title="Vissza a fő terméklistához (a szűrés megmarad)"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Vissza a listához</span>
            </button>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-[#211E1B] flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-[#3A5D6B]" />
          <span>Felhasználók & Jogosultságok</span>
        </h1>
      </div>

      {/* Profile Card / Not Logged In Warning */}
      {!currentUserProfile ? (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-amber-300 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#211E1B]">Nincs bejelentkezve</h2>
            <p className="text-gray-600 mt-1 max-w-lg mx-auto">
              Jelenleg névtelen látogatóként használja a rendszert <strong>Megtekintő</strong> jogosultsággal. Jelentkezzen be az adatlap beállításához vagy az adminisztrációhoz!
            </p>
          </div>
          {onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-6 py-3 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-lg transition-colors cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <UserIcon className="w-5 h-5 text-[#79B6B8]" />
              <span>Bejelentkezés vagy Adatlap Beállítás</span>
            </button>
          )}
        </div>
      ) : (
        /* User Profile Section */
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DBD8D5] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#3A5D6B] text-white flex items-center justify-center font-black text-2xl shadow-sm border-2 border-[#79B6B8]">
                {(currentUserProfile.displayName || currentUserProfile.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-[#211E1B]">
                    {currentUserProfile.displayName || 'Felhasználói Adatlap'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs border ${getRoleBadgeClass(currentUserProfile.role)}`}>
                    {getRoleBadgeText(currentUserProfile.role)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-mono mt-0.5">
                  {currentUserProfile.email}
                  {isPrimaryAdmin(currentUserProfile.email) && (
                    <span className="ml-2 font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                      Fő Rendszergazda (Admin)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Role explanation pill */}
            <div className="text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-xs text-gray-700">
              <span className="font-bold block text-[#3A5D6B] mb-0.5">Az Ön jogosultsági szintje:</span>
              {currentUserProfile.role === 'admin' && (
                <span>Teljes hozzáférés: termék törlés, szerkesztés, importálás, felhasználókezelés.</span>
              )}
              {currentUserProfile.role === 'editor' && (
                <span>Szerkesztő: termékek hozzáadása, módosítása, alkatrészek csatolása, CSV importálás.</span>
              )}
              {currentUserProfile.role === 'viewer' && (
                <span>Csak megtekintő: adatok böngészése, keresés, szűrés, kimutatások megtekintése.</span>
              )}
            </div>
          </div>

          {/* Form to update Name & Secondary Email */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-lg font-bold text-[#211E1B] flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#3A5D6B]" />
              <span>Saját Adatlap szerkesztése</span>
            </h3>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Felhasználó Neve (Megjelenítendő név)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="pl. Kovács Roland, Raktáros János..."
                  className="w-full text-base font-bold p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Másik / Értesítési e-mail cím (Nem Google fiók esetén is)
                </label>
                <input
                  type="email"
                  value={secondaryEmail}
                  onChange={(e) => setSecondaryEmail(e.target.value)}
                  placeholder="pl. roland.kovacs@worldwires.hu"
                  className="w-full text-base font-bold p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  Itt megadható egy másodlagos munkahelyi vagy értesítési e-mail cím.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-base transition-colors cursor-pointer shadow-xs disabled:bg-gray-400"
              >
                <Save className="w-5 h-5 text-[#79B6B8]" />
                <span>{isSavingProfile ? 'Mentés...' : 'Adatlap Mentése'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN ONLY: FULL RBAC MANAGEMENT (Felhasználók & Jogosultságok)        */}
      {/* ===================================================================== */}
      {isAdmin && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-purple-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2.5">
                <ShieldCheck className="w-7 h-7 text-purple-700" />
                <span>Rendszergazdai Felhasználókezelés (RBAC)</span>
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Adminisztrátorként Ön határozza meg, hogy a World Wires kft. munkatársai milyen jogosultsággal rendelkeznek.
              </p>
            </div>

            {/* Quick counters */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                Admin: {allUsers.filter((u) => u.role === 'admin').length}
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                Szerkesztő: {allUsers.filter((u) => u.role === 'editor').length}
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                Megtekintő: {allUsers.filter((u) => u.role === 'viewer').length}
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {adminActionMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{adminActionMsg}</span>
            </div>
          )}

          {adminErrorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{adminErrorMsg}</span>
            </div>
          )}

          {/* Add / Pre-assign User Form */}
          <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4">
            <h3 className="text-lg font-bold text-purple-950 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-700" />
              <span>Új munkatárs vagy jogosultság rögzítése e-mail cím alapján</span>
            </h3>

            <form onSubmit={handlePreAssignUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    E-mail cím *
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="munkatars@worldwires.hu"
                    className="w-full text-sm font-bold p-2.5 border-2 border-purple-200 focus:border-purple-600 rounded-xl bg-white text-[#211E1B]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Munkatárs neve (opcionális)
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="pl. Kiss Péter"
                    className="w-full text-sm font-bold p-2.5 border-2 border-purple-200 focus:border-purple-600 rounded-xl bg-white text-[#211E1B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Másik / Értesítési e-mail
                  </label>
                  <input
                    type="email"
                    value={newSecondaryEmail}
                    onChange={(e) => setNewSecondaryEmail(e.target.value)}
                    placeholder="masodlagos@gmail.com"
                    className="w-full text-sm font-bold p-2.5 border-2 border-purple-200 focus:border-purple-600 rounded-xl bg-white text-[#211E1B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Kiosztandó Jogosultság *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-sm font-bold p-2.5 border-2 border-purple-200 focus:border-purple-600 rounded-xl bg-white text-[#211E1B]"
                  >
                    <option value="viewer">Megtekintő (Csak olvasás)</option>
                    <option value="editor">Szerkesztő (Módosítás & Új termék)</option>
                    <option value="admin">Adminisztrátor (Teljes jog)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newEmail.trim() || isAddingUser}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm transition-colors cursor-pointer shadow-xs disabled:bg-gray-400 inline-flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isAddingUser ? 'Mentés...' : 'Jogosultság Rögzítése'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Users Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#211E1B] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#3A5D6B]" />
                <span>Rendszerben nyilvántartott felhasználók ({allUsers.length} fő)</span>
              </span>
              <span className="text-xs text-gray-500 font-normal">
                Kattintson a gombokra a jogosultság azonnali átállításához
              </span>
            </h3>

            <div className="overflow-x-auto border border-[#DBD8D5] rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse text-sm sm:text-base min-w-[700px]">
                <thead className="bg-[#3A5D6B] text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Munkatárs / Név</th>
                    <th className="p-3.5">Elsődleges E-mail</th>
                    <th className="p-3.5">Másik E-mail cím</th>
                    <th className="p-3.5">Jelenlegi Jogosultság</th>
                    <th className="p-3.5 text-center">Jogosultság módosítása</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DBD8D5] bg-white">
                  {allUsers.map((user) => {
                    const isProtected = isPrimaryAdmin(user.email);
                    return (
                      <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                        {/* Name */}
                        <td className="p-3.5 font-bold text-[#211E1B]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center font-bold text-xs text-gray-700">
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <span>{user.displayName || 'Névtelen munkatárs'}</span>
                              {isProtected && (
                                <span className="block text-[11px] font-bold text-emerald-700">
                                  ★ Rendszergazda (kovacsroli@gmail.com)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Primary Email */}
                        <td className="p-3.5 font-mono text-xs sm:text-sm text-gray-700">
                          {user.email}
                        </td>

                        {/* Secondary Email */}
                        <td className="p-3.5 font-mono text-xs sm:text-sm text-gray-600">
                          {user.secondaryEmail || (
                            <span className="text-gray-400 italic">Nincs megadva</span>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td className="p-3.5">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs border ${getRoleBadgeClass(user.role)}`}>
                            {getRoleBadgeText(user.role)}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="p-3.5 text-center">
                          {isProtected ? (
                            <span className="text-xs text-gray-400 italic font-semibold">
                              Zárolt (Fő admin)
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
                              <button
                                type="button"
                                onClick={() => handleRoleChange(user, 'viewer')}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                                  user.role === 'viewer'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Beállítás: Csak megtekintő (olvasási jog)"
                              >
                                Megtekintő
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRoleChange(user, 'editor')}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                                  user.role === 'editor'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Beállítás: Szerkesztő (módosítás, új termék)"
                              >
                                Szerkesztő
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRoleChange(user, 'admin')}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                                  user.role === 'admin'
                                    ? 'bg-purple-700 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Beállítás: Adminisztrátor (teljes hozzáférés)"
                              >
                                Admin
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
