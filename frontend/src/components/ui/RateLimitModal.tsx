// src/components/ui/RateLimitModal.tsx
"use client";

import { useEffect, useState } from "react";

interface RateLimitModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  const [remainingTime, setRemainingTime] = useState(15 * 60);
  const [isBlocked, setIsBlocked] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const savedEndTime = localStorage.getItem('rateLimitEndTime');
    const now = Date.now();
    
    if (savedEndTime) {
      const endTime = parseInt(savedEndTime);
      const remainingMs = endTime - now;
      
      if (remainingMs > 0) {
        setRemainingTime(Math.ceil(remainingMs / 1000));
      } else {
        localStorage.removeItem('rateLimitEndTime');
        setIsBlocked(false);
        setRemainingTime(0);
        return;
      }
    } else {
      const endTime = now + (15 * 60 * 1000);
      localStorage.setItem('rateLimitEndTime', endTime.toString());
      setRemainingTime(15 * 60);
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsBlocked(false);
          localStorage.removeItem('rateLimitEndTime');
          clearInterval(interval);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (!isBlocked && onClose) {
      onClose();
    }
  };

  const handleForceClose = () => {
      localStorage.removeItem('rateLimitEndTime');
      setIsBlocked(false);
      setRemainingTime(0);
      if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-red-600 text-white rounded-lg shadow-2xl max-w-md w-full border-2 border-red-500">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-4">
            Rate Limit Exceeded
          </h2>

          <div className="text-center mb-6">
            <p className="text-lg mb-2">
              Too many requests have been sent.
            </p>
            <p className="text-sm opacity-90">
              To prevent server overload, access is temporarily suspended.
            </p>
          </div>

          {isBlocked ? (
            <div className="bg-red-500 rounded-lg p-4 mb-6 text-center">
              <div className="text-sm opacity-90 mb-1">Time remaining:</div>
              <div className="text-3xl font-mono font-bold">
                {formatTime(remainingTime)}
              </div>
              <div className="text-sm opacity-90 mt-1">minutes</div>
            </div>
          ) : (
            <div className="bg-green-500 rounded-lg p-4 mb-6 text-center">
              <div className="text-lg font-bold">✅ Access restored</div>
              <div className="text-sm opacity-90">You can now continue using the site</div>
            </div>
          )}

          <div className="bg-red-500 rounded-lg p-3 mb-6">
            <h3 className="font-semibold mb-2 text-sm">Why this limitation?</h3>
            <ul className="text-xs space-y-1 opacity-90">
              <li>• Protection against denial of service attacks</li>
              <li>• Maintaining performance for all users</li>
              <li>• Preserving server resources</li>
            </ul>
          </div>

          <div className="text-center">
            <button
              onClick={handleClose}
              disabled={isBlocked}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isBlocked 
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
              }`}
            >
              {isBlocked ? 'Please wait...' : 'Continue'}
            </button>
            

              <button
                onClick={handleForceClose}
                className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Force Close (Dev)
              </button>

          </div>

          <div className="text-xs text-center mt-4 opacity-75">
            This window will close automatically when the timeout ends
          </div>
        </div>
      </div>
    </div>
  );
}
