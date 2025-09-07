// src/components/ui/NotificationToast.tsx
"use client";

import { useApp } from "@/lib_front/store";
import { useEffect } from "react";

export function NotificationToast() {
  const { notifications, removeNotification } = useApp();

  useEffect(() => {
    // Auto-remove notifications after their duration
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg border max-w-sm ${
            notification.type === 'success'
              ? 'bg-green-500/90 border-green-400 text-white'
              : notification.type === 'error'
              ? 'bg-red-500/90 border-red-400 text-white'
              : notification.type === 'warning'
              ? 'bg-yellow-500/90 border-yellow-400 text-black'
              : 'bg-blue-500/90 border-blue-400 text-white'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-lg leading-none hover:opacity-70"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
