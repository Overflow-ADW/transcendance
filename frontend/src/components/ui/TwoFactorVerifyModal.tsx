"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib_front/api";

interface TwoFactorVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: any) => void;
  tempUserId: number;
  username: string;
}

export const TwoFactorVerifyModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  tempUserId, 
  username 
}: TwoFactorVerifyModalProps) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode || (useBackupCode ? verificationCode.length !== 9 : verificationCode.length !== 6)) {
      setError(useBackupCode ? "Please enter a valid backup code (XXXX-XXXX)" : "Please enter a 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.verify2FA(verificationCode, tempUserId);
      if (response.success) {
        onSuccess(response);
      } else {
        setError(response.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      setError(error.message || 'Failed to verify 2FA code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleVerify();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Two-Factor Authentication</h2>
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
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Welcome back, {username}!
              </h3>
              <p className="text-gray-600 text-sm">
                {useBackupCode 
                  ? "Enter one of your backup codes to complete sign in"
                  : "Enter the verification code from your authenticator app to complete sign in"
                }
              </p>
            </div>

            {/* Verification Code Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {useBackupCode ? "Backup Code" : "Verification Code"}
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  if (useBackupCode) {
                    // Format backup code: XXXX-XXXX
                    const value = e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '');
                    const formatted = value.replace(/(.{4})(?=.)/g, '$1-').slice(0, 9);
                    setVerificationCode(formatted);
                  } else {
                    // Only digits for TOTP
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-blue-500"
                maxLength={useBackupCode ? 9 : 6}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Switch between TOTP and backup code */}
            <div className="text-center mb-4">
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setVerificationCode("");
                  setError("");
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline transition-colors"
              >
                {useBackupCode ? "Use authenticator app" : "Use backup code instead"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            <button
              onClick={handleVerify}
              disabled={
                isLoading || 
                (useBackupCode ? verificationCode.length !== 9 : verificationCode.length !== 6)
              }
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Verify
            </button>
          </div>

          {/* Help text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Having trouble? Contact support for assistance with your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
