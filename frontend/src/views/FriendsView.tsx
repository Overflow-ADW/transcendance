"use client";
import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from '../lib_front/api';
import type {
  Friend,
  PendingInvitation,
  FriendsResponse,
  UserSearchResult
} from '../lib_front/types';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (username: string) => void;
}

const AddFriendModal = ({ isOpen, onClose, onAdd }: AddFriendModalProps) => {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoading(true);
      try {
        await onAdd(username.trim());
        setUsername("");
      } catch (error) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-black border-4 border-purple-400 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          Add Friend
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:border-purple-400 focus:outline-none"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function FriendsView() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getAvatarDisplay = (user: Friend | PendingInvitation) => {
    if (user.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={`${user.username}'s avatar`}
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold">
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  const handleVisitProfile = (friendId: number) => {
    router.push(`/profile?userId=${friendId}`);
  };

  const fetchFriends = async () => {
    try {
      const response = await apiClient.request('/api/users/friends');
      if (response.ok) {
        const data: FriendsResponse = await response.json();
        setFriends(data.friends || []);
        setPendingInvitations(data.pendingRequests || []);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      setFriends([]);
      setPendingInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (username: string) => {
    if (user && username.toLowerCase() === user.username.toLowerCase()) {
      showNotification("Vous ne pouvez pas vous inviter vous-même !", 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.request('/api/users/friends', {
        method: 'POST',
        body: JSON.stringify({ username: username })
      });

      if (response.ok) {
        await fetchFriends();
        setShowAddModal(false);
        showNotification(`Demande d'ami envoyée à ${username} !`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400) {
          showNotification("Vous ne pouvez pas vous inviter vous-même !", 'error');
        } else if (response.status === 409) {
          showNotification("Vous êtes déjà ami avec cette personne ou une demande est en cours !", 'error');
        } else if (response.status === 404) {
          showNotification("Utilisateur non trouvé !", 'error');
        } else {
          showNotification(errorData.message || "Erreur lors de l'envoi de la demande d'ami", 'error');
        }
      }
    } catch (error: any) {
      showNotification("Erreur lors de l'envoi de la demande d'ami", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiClient.request(`/api/users/friends/${id}/accept`, {
        method: 'PUT',
        body: JSON.stringify({})
      });

      if (response.ok) {
        await fetchFriends();
        showNotification("Demande d'ami acceptée !", 'success');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      showNotification("Erreur lors de l'acceptation de l'invitation", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvitation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiClient.request(`/api/users/friends/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFriends();
        showNotification("Demande d'ami refusée", 'info');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      showNotification("Erreur lors du refus de l'invitation", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiClient.request(`/api/users/friends/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFriends();
        showNotification("Ami supprimé", 'info');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      showNotification("Erreur lors de la suppression de l'ami", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="min-h-screen h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-6">LOADING FRIENDS...</h1>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  const onlineFriends = friends.filter(f => f.online_status === 'online');
  const offlineFriends = friends.filter(f => f.online_status === 'offline');
  const receivedInvitations = pendingInvitations.filter(inv => inv.request_type === 'incoming');
  const sentInvitations = pendingInvitations.filter(inv => inv.request_type === 'outgoing');

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wider">
            FRIENDS
          </h1>
          <p className="text-white/70 text-lg mt-2">
            Manage your friendships
          </p>
        </div>

        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-2 max-w-md ${notification.type === 'success'
            ? 'bg-green-500/90 border-green-400 text-white'
            : notification.type === 'error'
              ? 'bg-red-500/90 border-red-400 text-white'
              : 'bg-blue-500/90 border-blue-400 text-white'
            }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-black border-4 border-green-400 rounded-lg p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-400 text-center">
                  ONLINE ({onlineFriends.length})
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  + ADD FRIEND
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {onlineFriends.length > 0 ? (
                  onlineFriends.map((friend) => (
                    <div key={friend.user_id} className="flex items-center justify-between p-3 bg-green-400/10 border border-green-400/30 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        {getAvatarDisplay(friend)}
                        <div className="flex-1">
                          <button
                            onClick={() => handleVisitProfile(friend.user_id)}
                            className="text-white font-medium hover:text-green-400 transition-colors text-left w-full"
                          >
                            {friend.display_name || friend.username}
                          </button>
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${friend.online_status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                              }`}></div>
                            <span className={`text-xs ${friend.online_status === 'online' ? 'text-green-400' : 'text-gray-400'
                              }`}>
                              {friend.online_status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-green-400/60 py-4">
                    <p>No friends online</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black border-4 border-gray-400 rounded-lg p-6 flex-1">
              <h2 className="text-xl font-bold text-gray-400 text-center mb-4">
                OFFLINE ({offlineFriends.length})
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {offlineFriends.length > 0 ? (
                  offlineFriends.map((friend) => (
                    <div key={friend.user_id} className="flex items-center justify-between p-3 bg-gray-400/10 border border-gray-400/30 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="opacity-50">
                          {getAvatarDisplay(friend)}
                        </div>
                        <div className="flex-1">
                          <button
                            onClick={() => handleVisitProfile(friend.user_id)}
                            className="text-gray-300 font-medium hover:text-white transition-colors text-left w-full"
                          >
                            {friend.display_name || friend.username}
                          </button>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            <span className="text-gray-500 text-xs">Offline</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors opacity-60 hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400/60 py-4">
                    <p>No offline friends</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:w-80 flex flex-col gap-4">
            <div className="bg-black border-4 border-yellow-400 rounded-lg p-6 flex-1">
              <h2 className="text-xl font-bold text-yellow-400 text-center mb-4">
                RECEIVED ({receivedInvitations.length})
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {receivedInvitations.length > 0 ? (
                  receivedInvitations.map((invitation) => (
                    <div key={invitation.id} className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        {getAvatarDisplay(invitation)}
                        <div>
                          <span className="text-white font-medium text-sm">{invitation.display_name || invitation.username}</span>
                          <p className="text-yellow-400/80 text-xs">wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvitation(invitation.friendship_id)}
                          className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvitation(invitation.friendship_id)}
                          className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-yellow-400/60 py-4">
                    <p className="text-sm">No pending requests</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex-1">
              <h2 className="text-xl font-bold text-blue-400 text-center mb-4">
                SENT ({sentInvitations.length})
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sentInvitations.length > 0 ? (
                  sentInvitations.map((invitation) => (
                    <div key={invitation.id} className="p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getAvatarDisplay(invitation)}
                          <div>
                            <span className="text-white font-medium text-sm">{invitation.display_name || invitation.username}</span>
                            <p className="text-blue-400/80 text-xs">Request sent</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeclineInvitation(invitation.friendship_id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-blue-400/60 py-4">
                    <p className="text-sm">No sent requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/settings')}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            ← BACK TO MENU
          </button>
        </div>
      </div>

      <AddFriendModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddFriend}
      />
    </GradientBackground>
  );
}