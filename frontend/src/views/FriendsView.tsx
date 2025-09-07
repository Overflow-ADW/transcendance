"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';

interface Friend {
  id: string;
  username: string;
  isOnline: boolean;
  avatar?: string;
}

interface PendingInvitation {
  id: string;
  username: string;
  type: 'sent' | 'received';
  avatar?: string;
}

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (username: string) => void;
}

const AddFriendModal = ({ isOpen, onClose, onAdd }: AddFriendModalProps) => {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && !isLoading) {
      setIsLoading(true);
      try {
        await onAdd(username.trim());
        setUsername("");
      } catch (error) {
        console.error('Error adding friend:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">Add Friend</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-black text-sm font-bold mb-2">
              Username or ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username or #ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fonctions pour les appels API (à implémenter avec votre backend)
  const fetchFriends = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/friends');
      // const data = await response.json();
      // setFriends(data.friends);
      
      // Simulation temporaire
      setFriends([]);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/friends/invitations');
      // const data = await response.json();
      // setPendingInvitations(data.invitations);
      
      // Simulation temporaire
      setPendingInvitations([]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleAddFriend = async (username: string) => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/friends/invite', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username })
      // });
      // 
      // if (response.ok) {
      //   await fetchPendingInvitations(); // Refresh la liste
      //   setShowAddModal(false);
      // } else {
      //   throw new Error('Failed to send friend request');
      // }

      // Simulation temporaire
      console.log('Sending friend request to:', username);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch(`/api/friends/invitations/${id}/accept`, {
      //   method: 'POST'
      // });
      // 
      // if (response.ok) {
      //   await fetchFriends();
      //   await fetchPendingInvitations();
      // }

      // Simulation temporaire
      console.log('Accepting invitation:', id);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDeclineInvitation = async (id: string) => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch(`/api/friends/invitations/${id}/decline`, {
      //   method: 'POST'
      // });
      // 
      // if (response.ok) {
      //   await fetchPendingInvitations();
      // }

      // Simulation temporaire
      console.log('Declining invitation:', id);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const handleRemoveFriend = async (id: string) => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch(`/api/friends/${id}`, {
      //   method: 'DELETE'
      // });
      // 
      // if (response.ok) {
      //   await fetchFriends();
      // }

      // Simulation temporaire
      console.log('Removing friend:', id);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleInviteToGame = async (friendId: string) => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/game/invite', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ friendId })
      // });

      // Simulation temporaire
      console.log('Inviting friend to game:', friendId);
    } catch (error) {
      console.error('Error inviting to game:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchFriends(),
        fetchPendingInvitations()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading friends...</h2>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  const onlineFriends = friends.filter(f => f.isOnline);
  const offlineFriends = friends.filter(f => !f.isOnline);
  const receivedInvitations = pendingInvitations.filter(inv => inv.type === 'received');
  const sentInvitations = pendingInvitations.filter(inv => inv.type === 'sent');

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wider">
            FRIENDS
          </h1>
        </div>

        {/* Container principal */}
        <div className="flex-1 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            
            {/* Section gauche - Amis Online/Offline */}
            <div className="flex flex-col space-y-4">
              {/* Add Friend Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-green-600 border-4 border-green-400 text-white px-6 py-4 rounded-lg text-xl font-bold transition-all duration-300 hover:bg-green-500 hover:scale-105"
              >
                + ADD FRIEND
              </button>

              {/* Online Friends */}
              <div className="bg-black border-4 border-green-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-green-400 text-center mb-4">
                  ONLINE ({onlineFriends.length})
                </h2>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {onlineFriends.length > 0 ? (
                    onlineFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-green-400/10 border border-green-400/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold">
                            {friend.username.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-medium">{friend.username}</span>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-green-400 text-xs">Online</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleInviteToGame(friend.id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                          >
                            Invite
                          </button>
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

              {/* Offline Friends */}
              <div className="bg-black border-4 border-gray-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-gray-400 text-center mb-4">
                  OFFLINE ({offlineFriends.length})
                </h2>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {offlineFriends.length > 0 ? (
                    offlineFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-400/10 border border-gray-400/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold opacity-50">
                            {friend.username.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white/70 font-medium">{friend.username}</span>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-gray-400 text-xs">Offline</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
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

            {/* Section droite - Invitations */}
            <div className="flex flex-col space-y-4">
              {/* Received Invitations */}
              <div className="bg-black border-4 border-yellow-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-yellow-400 text-center mb-4">
                  FRIEND REQUESTS ({receivedInvitations.length})
                </h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {receivedInvitations.length > 0 ? (
                    receivedInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold">
                            {invitation.username.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-medium">{invitation.username}</span>
                            <p className="text-yellow-400 text-xs">wants to be friends</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-yellow-400/60 py-4">
                      <p>No friend requests</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sent Invitations */}
              <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex-1">
                <h2 className="text-xl font-bold text-blue-400 text-center mb-4">
                  PENDING REQUESTS ({sentInvitations.length})
                </h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sentInvitations.length > 0 ? (
                    sentInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                            {invitation.username.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-medium">{invitation.username}</span>
                            <p className="text-blue-400 text-xs">request sent</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                          title="Cancel request"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-blue-400/60 py-4">
                      <p>No pending requests</p>
                    </div>
                  )}
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
              onClick={() => router.push("/play")}
              className="px-8 py-3 bg-transparent border-4 border-yellow-400 text-yellow-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
            >
              PLAY
            </button>
          </div>
        </div>

        {/* Add Friend Modal */}
        <AddFriendModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddFriend}
        />
      </div>
    </GradientBackground>
  );
}