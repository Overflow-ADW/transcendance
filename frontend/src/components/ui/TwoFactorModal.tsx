"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib_front/api";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'setup' | 'disable';
}

interface SetupData {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  instructions: {
    fr: string;
    en: string;
  };
}

export const TwoFactorModal = ({ isOpen, onClose, onSuccess, mode }: TwoFactorModalProps) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'disable'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(mode === 'disable' ? 'disable' : 'setup');
      setSetupData(null);
      setVerificationCode("");
      setPassword("");
      setError("");
      setBackupCodes([]);
      
      if (mode === 'setup') {
        initiate2FASetup();
      }
    }
  }, [isOpen, mode]);

  const initiate2FASetup = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await apiClient.setup2FA();
      if (response.success && response.setup) {
        setSetupData(response.setup);
        setStep('verify');
      } else {
        setError(response.error || 'Failed to setup 2FA');
      }
    } catch (error: any) {
      console.error('2FA setup error:', error);
      setError(error.message || 'Failed to setup 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.enable2FA(verificationCode);
      if (response.success) {
        setBackupCodes(response.backupCodes || []);
        onSuccess();
        // Don't close immediately, show backup codes first
      } else {
        setError(response.error || 'Failed to enable 2FA');
      }
    } catch (error: any) {
      console.error('Enable 2FA error:', error);
      setError(error.message || 'Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      setError("Password is required");
      return;
    }
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.disable2FA(password, verificationCode);
      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      console.error('Disable 2FA error:', error);
      setError(error.message || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSetupStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-block p-4 bg-blue-100 rounded-lg">
          <svg className="w-12 h-12 text-blue-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-4">Setting up Two-Factor Authentication</h3>
      <p className="text-gray-600 mb-6">
        We're generating your QR code and secret key...
      </p>
      {isLoading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );

  const renderVerifyStep = () => (
    <div>
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Scan QR Code</h3>
      
      {setupData && (
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <img 
                src={setupData.qrCode} 
                alt="2FA QR Code" 
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>1. Open Google Authenticator or any TOTP app</p>
            <p>2. Scan this QR code</p>
            <p>3. Enter the 6-digit code below</p>
          </div>

          {/* Manual entry */}
          <details className="text-center">
            <summary className="cursor-pointer text-blue-600 text-sm">
              Can't scan? Enter manually
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono break-all">
              {setupData.manualEntryKey}
            </div>
          </details>

          {/* Verification Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError("");
              }}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-blue-500"
              maxLength={6}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderDisableStep = () => (
    <div>
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Disable Two-Factor Authentication</h3>
      
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 text-sm font-medium">
              Warning: This will remove all 2FA protection from your account
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Enter your current password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Code
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError("");
            }}
            placeholder="000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-red-500"
            maxLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the current 6-digit code from your authenticator app or use a backup code
          </p>
        </div>
      </div>
    </div>
  );

  const renderBackupCodes = () => (
    <div>
      <h3 className="text-xl font-bold text-green-600 mb-4 text-center">✅ 2FA Enabled Successfully!</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-yellow-800 text-sm font-medium mb-1">Save These Backup Codes</p>
            <p className="text-yellow-700 text-xs">
              Store these codes safely. You can use them to access your account if you lose your authenticator.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-white p-2 rounded border text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onClose}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {mode === 'disable' ? 'Disable 2FA' : 'Enable 2FA'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {backupCodes.length > 0 ? renderBackupCodes() :
             step === 'setup' ? renderSetupStep() :
             step === 'verify' ? renderVerifyStep() :
             step === 'disable' ? renderDisableStep() : null}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          {backupCodes.length === 0 && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              
              {step === 'verify' && (
                <button
                  onClick={handleEnable2FA}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Enable 2FA
                </button>
              )}

              {step === 'disable' && (
                <button
                  onClick={handleDisable2FA}
                  disabled={isLoading || !password || verificationCode.length !== 6}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Disable 2FA
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
