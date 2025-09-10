"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import { apiClient } from "@/lib_front/api";

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
              // Vérifier que le nom d'utilisateur ne contient que des caractères valides
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
              // Vérifier si le mot de passe contient au moins une majuscule, une minuscule, un chiffre et un caractère spécial
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
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const languages: LanguageOption[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
  ];

  // Charger la langue actuelle depuis le backend ou localStorage
  useEffect(() => {
    const loadCurrentLanguage = async () => {
      try {
        // TODO: Remplacer par votre appel API
        // const response = await fetch('/api/user/settings');
        // const data = await response.json();
        // setCurrentLanguage(data.language || 'en');

        // Fallback sur localStorage pour la simulation
        const savedLang = localStorage.getItem('user-language') as Language;
        if (savedLang && ['en', 'fr', 'nl'].includes(savedLang)) {
          setCurrentLanguage(savedLang);
        }
      } catch (error) {
        console.error('Error loading language settings:', error);
      }
    };

    loadCurrentLanguage();
  }, []);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === currentLanguage) return;

    setIsSavingLanguage(true);
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/settings/language', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ language: newLanguage })
      // });
      // 
      // if (response.ok) {
      //   setCurrentLanguage(newLanguage);
      //   // Optionnel: recharger la page pour appliquer la nouvelle langue
      //   window.location.reload();
      // } else {
      //   throw new Error('Failed to update language');
      // }

      // Simulation temporaire
      console.log('Changing language to:', newLanguage);
      localStorage.setItem('user-language', newLanguage);
      setCurrentLanguage(newLanguage);
      
      // Simuler un délai d'API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error updating language:', error);
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
      
      // Update local storage user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...userData, username: newUsername }));
      
      // Recommander à l'utilisateur de se reconnecter
      alert('Please log out and log back in to see the changes in all parts of the application.');
    } catch (error: any) {
      console.error('Username change error:', error);
      
      // Afficher un message d'erreur plus détaillé
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
      
      // Recommander à l'utilisateur de se reconnecter avec le nouveau mot de passe
      alert('Please log out and log back in with your new password.');
    } catch (error: any) {
      console.error('Password change error:', error);
      
      // Afficher un message d'erreur plus détaillé
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
      // TODO: Remplacer par votre appel API de déconnexion
      // const response = await fetch('/api/auth/logout', {
      //   method: 'POST'
      // });
      // 
      // if (response.ok) {
      //   // Nettoyer le localStorage/sessionStorage
      //   localStorage.clear();
      //   sessionStorage.clear();
      //   
      //   // Rediriger vers la page de connexion
      //   router.push('/login');
      // } else {
      //   throw new Error('Logout failed');
      // }

      // Simulation temporaire
      console.log('Logging out...');
      
      // Nettoyer les données locales
      localStorage.clear();
      sessionStorage.clear();
      
      // Simuler un délai d'API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Rediriger vers la page de connexion
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
      setShowLogoutModal(false);
    }
  };

  const clearGameData = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/data/clear', {
      //   method: 'DELETE'
      // });
      // 
      // if (response.ok) {
      //   alert('Game data cleared successfully');
      // } else {
      //   throw new Error('Failed to clear data');
      // }

      // Simulation temporaire
      localStorage.removeItem('tournament-players');
      localStorage.removeItem('duel-players');
      localStorage.removeItem('game-mode');
      localStorage.removeItem('ai-difficulty');
      
      alert('Game data cleared successfully');
    } catch (error) {
      console.error('Error clearing game data:', error);
      alert('Failed to clear game data');
    }
  };

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wider">
            SETTINGS
          </h1>
        </div>

        {/* Container principal */}
        <div className="flex-1 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            
            {/* Section gauche - Langues */}
            <div className="flex flex-col space-y-4">
              {/* Language Settings */}
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
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-between ${
                        currentLanguage === lang.code
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

            {/* Section droite - Compte et données */}
            <div className="flex flex-col space-y-4">
              {/* Account Settings */}
              <div className="bg-black border-4 border-red-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-red-400 text-center mb-6">
                  ACCOUNT
                </h2>
                
                <div className="space-y-4">
                  {/* Change Username Button */}
                  <button
                    onClick={() => setShowUsernameModal(true)}
                    disabled={isChangingUsername}
                    className="w-full p-4 bg-purple-600/20 border-2 border-purple-400 text-purple-400 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingUsername ? 'CHANGING USERNAME...' : 'CHANGE USERNAME'}
                  </button>

                  {/* Change Password Button */}
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    disabled={isChangingPassword}
                    className="w-full p-4 bg-blue-600/20 border-2 border-blue-400 text-blue-400 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-blue-600 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? 'CHANGING PASSWORD...' : 'CHANGE PASSWORD'}
                  </button>

                  {/* Logout Button */}
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

          {/* Navigation Buttons */}
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

        {/* Modals */}
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
      </div>
    </GradientBackground>
  );
}