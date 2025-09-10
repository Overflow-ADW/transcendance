"use client";
import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { TwoFactorModal } from "@/components/ui/TwoFactorModal";
import { useRouter } from 'next/navigation';
import { apiClient } from "@/lib_front/api";
import { useAuth } from "@/lib_front/AuthContext";

type Language = 'fr' | 'en' | 'nl';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  title: string;
}

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ChangeUsernameModal = ({ isOpen, onClose, onConfirm, title }: ModalProps) => {
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">{title}</h2>
        <div className="mb-4">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => {
              setNewUsername(e.target.value);
              setError("");
            }}
            placeholder="New username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newUsername.length < 3) {
                setError("Username must be at least 3 characters long");
                return;
              }
              if (newUsername.length > 20) {
                setError("Username must be at most 20 characters long");
                return;
              }
              if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
                setError("Username can only contain letters, numbers, and underscores");
                return;
              }
              onConfirm(newUsername);
            }}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ isOpen, onClose, onConfirm, title }: ModalProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">{title}</h2>
        <div className="space-y-4">
          <div>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
              }}
              placeholder="Current password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
              placeholder="New password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newPassword !== confirmPassword) {
                setError("Passwords do not match");
                return;
              }
              if (newPassword.length < 8) {
                setError("Password must be at least 8 characters long");
                return;
              }
              if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
                setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)");
                return;
              }
              onConfirm({ currentPassword, newPassword });
            }}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
};

const LogoutModal = ({ isOpen, onClose, onConfirm }: LogoutModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">Confirm Logout</h2>
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to logout? You'll need to sign in again to access your account.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TrueSettingsView() {
  const router = useRouter();
  const { logout } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFA2FAMode, setTwoFA2FAMode] = useState<'setup' | 'disable'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState({
    enabled: false,
    setupInProgress: false,
    remainingBackupCodes: 0,
    loading: true
  });

  const languages: LanguageOption[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
  ];

  useEffect(() => {
    const loadCurrentLanguage = async () => {
      try {
        const savedLang = localStorage.getItem('user-language') as Language;
        if (savedLang && ['en', 'fr', 'nl'].includes(savedLang)) {
          setCurrentLanguage(savedLang);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    const load2FAStatus = async () => {
      try {
        const status = await apiClient.get2FAStatus();
        setTwoFAStatus({
          enabled: status.enabled,
          setupInProgress: status.setupInProgress,
          remainingBackupCodes: status.remainingBackupCodes,
          loading: false
        });
      } catch (error) {
        setTwoFAStatus(prev => ({ ...prev, loading: false }));
      }
    };

    loadCurrentLanguage();
    load2FAStatus();
  }, []);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === currentLanguage) return;

    setIsSavingLanguage(true);
    try {
      localStorage.setItem('user-language', newLanguage);
      setCurrentLanguage(newLanguage);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      alert('Failed to update language settings');
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleChangeUsername = async (newUsername: string) => {
    setIsChangingUsername(true);
    try {
      const response = await apiClient.changeUsername(newUsername);
      alert('Username changed successfully!');
      setShowUsernameModal(false);

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...userData, username: newUsername }));
      alert('Please log out and log back in to see the changes in all parts of the application.');
    } catch (error: any) {
      if (error.message && error.message.includes('Username already taken')) {
        alert('This username is already taken. Please choose another one.');
      } else if (error.message && error.message.includes('VALIDATION_ERROR')) {
        alert('Username does not meet requirements. Username should be between 3 and 20 characters.');
      } else {
        alert(error.message || 'Failed to change username');
      }
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleChangePassword = async (data: { currentPassword: string; newPassword: string }) => {
    setIsChangingPassword(true);
    try {
      const response = await apiClient.changePassword(data);
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      alert('Please log out and log back in with your new password.');
    } catch (error: any) {
      if (error.message && error.message.includes('Mot de passe actuel incorrect')) {
        alert('Current password is incorrect. Please try again.');
      } else if (error.message && error.message.includes('VALIDATION_ERROR')) {
        alert('Password does not meet requirements: Must be at least 8 characters with uppercase, lowercase letters, numbers, and at least one special character (!@#$%^&*).');
      } else {
        alert(error.message || 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      alert('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
      setShowLogoutModal(false);
    }
  };

  const clearGameData = async () => {
    try {
      localStorage.removeItem('tournament-players');
      localStorage.removeItem('duel-players');
      localStorage.removeItem('game-mode');
      localStorage.removeItem('ai-difficulty');
      alert('Game data cleared successfully');
    } catch (error) {
      alert('Failed to clear game data');
    }
  };

  const handle2FAToggle = () => {
    if (twoFAStatus.enabled) {
      setTwoFA2FAMode('disable');
    } else {
      setTwoFA2FAMode('setup');
    }
    setShow2FAModal(true);
  };

  const handle2FASuccess = async () => {
    try {
      const status = await apiClient.get2FAStatus();
      setTwoFAStatus({
        enabled: status.enabled,
        setupInProgress: status.setupInProgress,
        remainingBackupCodes: status.remainingBackupCodes,
        loading: false
      });
    } catch (error) {
      // Silent error handling
    }
  };

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wider">
            SETTINGS
          </h1>
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <div className="flex flex-col space-y-4">
              <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-blue-400 text-center mb-6">
                  LANGUAGE / LANGUE / TAAL
                </h2>
                <div className="space-y-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      disabled={isSavingLanguage}
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-between ${currentLanguage === lang.code
                        ? 'bg-blue-400/20 border-blue-400 text-blue-400'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40'
                        } ${isSavingLanguage ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="font-bold text-lg">{lang.name}</span>
                      </div>
                      {currentLanguage === lang.code && (
                        <div className="text-blue-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {isSavingLanguage && (
                  <div className="mt-4 text-center">
                    <p className="text-blue-400 text-sm">Saving language preference...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="bg-black border-4 border-red-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-red-400 text-center mb-6">
                  ACCOUNT
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowUsernameModal(true)}
                    disabled={isChangingUsername}
                    className="w-full p-4 bg-purple-600/20 border-2 border-purple-400 text-purple-400 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingUsername ? 'CHANGING USERNAME...' : 'CHANGE USERNAME'}
                  </button>

                  <button
                    onClick={() => setShowPasswordModal(true)}
                    disabled={isChangingPassword}
                    className="w-full p-4 bg-blue-600/20 border-2 border-blue-400 text-blue-400 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-blue-600 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? 'CHANGING PASSWORD...' : 'CHANGE PASSWORD'}
                  </button>

                  <button
                    onClick={handle2FAToggle}
                    disabled={twoFAStatus.loading}
                    className={`w-full p-4 border-2 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${twoFAStatus.enabled
                      ? 'bg-orange-600/20 border-orange-400 text-orange-400 hover:bg-orange-600 hover:text-white'
                      : 'bg-green-600/20 border-green-400 text-green-400 hover:bg-green-600 hover:text-white'
                      }`}
                  >
                    {twoFAStatus.loading ? 'LOADING...' :
                      twoFAStatus.enabled ? 'DISABLE 2FA' : 'ENABLE 2FA'}
                  </button>

                  {twoFAStatus.enabled && !twoFAStatus.loading && (
                    <div className="text-center text-sm space-y-1">
                      <p className="text-green-400">✅ Two-Factor Authentication is enabled</p>
                      {twoFAStatus.remainingBackupCodes > 0 && (
                        <p className="text-yellow-400">
                          {twoFAStatus.remainingBackupCodes} backup code{twoFAStatus.remainingBackupCodes > 1 ? 's' : ''} remaining
                        </p>
                      )}
                      {twoFAStatus.remainingBackupCodes === 0 && (
                        <p className="text-red-400">⚠️ No backup codes remaining</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setShowLogoutModal(true)}
                    disabled={isLoading}
                    className="w-full p-4 bg-red-600/20 border-2 border-red-400 text-red-400 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-red-600 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'LOGGING OUT...' : 'LOGOUT'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <button
              onClick={() => router.push("/profile")}
              className="px-8 py-3 bg-transparent border-4 border-purple-400 text-purple-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-purple-400 hover:text-white hover:scale-105"
            >
              PROFILE
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-transparent border-4 border-white text-white text-lg font-bold rounded-lg transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
            >
              HOME
            </button>
          </div>
        </div>

        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />

        <ChangeUsernameModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          onConfirm={handleChangeUsername}
          title="Change Username"
        />

        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onConfirm={handleChangePassword}
          title="Change Password"
        />

        <TwoFactorModal
          isOpen={show2FAModal}
          onClose={() => setShow2FAModal(false)}
          onSuccess={handle2FASuccess}
          mode={twoFA2FAMode}
        />
      </div>
    </GradientBackground>
  );
}