import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, Pencil, RefreshCw, Shield, UserPlus, X } from 'lucide-react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { boardsApi, type AdminOverview } from '../../services/boards';
import { usersApi, type User } from '../../services/users';

type OverviewUser = AdminOverview['users'][number];
type OverviewBoard = AdminOverview['boards'][number];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function boardCountForUser(boards: OverviewBoard[], userId: string) {
  return boards.filter((b) =>
    b.userId === userId || b.members.some((m) => m.user.id === userId),
  ).length;
}

function userRoleOnBoard(board: OverviewBoard, userId: string): string | null {
  if (board.userId === userId) return 'OWNER';
  const member = board.members.find((m) => m.user.id === userId);
  return member?.role ?? null;
}

export default function AdminScreen() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<OverviewUser | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  // Admin overview — users + boards + membership
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => boardsApi.getAdminOverview(),
  });

  const grantMutation = useMutation({
    mutationFn: ({ boardId, userId, role }: { boardId: string; userId: string; role: 'VIEWER' | 'EDITOR' }) =>
      boardsApi.addMemberById(boardId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ boardId, userId }: { boardId: string; userId: string }) =>
      boardsApi.removeMemberByUserId(boardId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      usersApi.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedUser(null);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () => usersApi.invite(inviteEmail.trim().toLowerCase(), inviteName.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const raw = (overview as any)?.data ?? overview;
  const users: OverviewUser[] = raw?.users ?? [];
  const boards: OverviewBoard[] = raw?.boards ?? [];

  function handleToggleRole(user: OverviewUser) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    Alert.alert('Change Role', `Make ${user.name} a${newRole === 'ADMIN' ? 'n Admin' : ' User'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateRoleMutation.mutate({ id: user.id, role: newRole }) },
    ]);
  }

  function handleDeleteUser(user: OverviewUser) {
    Alert.alert('Remove User', `Remove ${user.name} from the workspace?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(user.id) },
    ]);
  }

  function handleGrantAccess(board: OverviewBoard, userId: string, role: 'VIEWER' | 'EDITOR') {
    grantMutation.mutate({ boardId: board.id, userId, role });
  }

  function handleRevokeAccess(board: OverviewBoard, userId: string) {
    Alert.alert('Revoke Access', `Remove access to "${board.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate({ boardId: board.id, userId }) },
    ]);
  }

  // Keep selectedUser in sync after re-fetch
  const freshSelected = selectedUser ? users.find((u) => u.id === selectedUser.id) ?? selectedUser : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader
        right={
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => refetch()}
              className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
              <RefreshCw size={15} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInvite(true)}
              className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2">
              <UserPlus size={14} color="#fff" />
              <Text className="text-sm text-white font-semibold">Invite</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading ? (
        <LoadingSpinner message="Loading..." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          renderItem={({ item: user }) => {
            const count = boardCountForUser(boards, user.id);
            return (
              <TouchableOpacity
                onPress={() => setSelectedUser(user)}
                className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: stringToColor(user.name) + '22' }}>
                      <Text className="text-base font-bold" style={{ color: stringToColor(user.name) }}>
                        {initials(user.name ?? '?')}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{user.name}</Text>
                      <Text className="text-xs text-gray-400" numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <View className={`px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs font-semibold ${user.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-500'}`}>
                        {user.role}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400">{count} board{count !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState title="No users" subtitle="Invite team members to get started" />}
        />
      )}

      {/* Board Access Modal */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedUser(null)}
      >
        {freshSelected && (
          <View className="flex-1 bg-white">
            {/* User header */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: stringToColor(freshSelected.name) + '22' }}>
                    <Text className="text-lg font-bold" style={{ color: stringToColor(freshSelected.name) }}>
                      {initials(freshSelected.name ?? '?')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">{freshSelected.name}</Text>
                    <Text className="text-xs text-gray-400">{freshSelected.email}</Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded-full ${freshSelected.role === 'ADMIN' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs font-semibold ${freshSelected.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-500'}`}>
                      {freshSelected.role}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)} className="ml-3">
                  <X size={22} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Actions row */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => handleToggleRole(freshSelected)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2"
                >
                  <Shield size={13} color="#6b7280" />
                  <Text className="text-xs font-medium text-gray-600">
                    Make {freshSelected.role === 'ADMIN' ? 'User' : 'Admin'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteUser(freshSelected)}
                  className="flex-row items-center justify-center gap-1.5 border border-red-200 bg-red-50 rounded-xl px-4 py-2"
                >
                  <X size={13} color="#ef4444" />
                  <Text className="text-xs font-medium text-red-600">Remove</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Board Access */}
            <View className="px-4 pt-3 pb-1">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide">Board Access</Text>
            </View>

            <FlatList
              data={boards}
              keyExtractor={(b) => b.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              renderItem={({ item: board }) => {
                const role = userRoleOnBoard(board, freshSelected.id);
                const isOwner = role === 'OWNER';

                return (
                  <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center">
                        <Text className="text-xs">📋</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                          {board.name}
                        </Text>
                        {isOwner && (
                          <Text className="text-xs text-green-600 font-medium">Owner</Text>
                        )}
                        {!isOwner && role && (
                          <Text className="text-xs text-blue-600 font-medium">{role}</Text>
                        )}
                        {!role && (
                          <Text className="text-xs text-gray-400">No access</Text>
                        )}
                      </View>
                    </View>

                    {!isOwner && (
                      <View className="flex-row gap-1.5">
                        {/* View only button */}
                        <TouchableOpacity
                          onPress={() => {
                            if (role === 'VIEWER') {
                              handleRevokeAccess(board, freshSelected.id);
                            } else {
                              handleGrantAccess(board, freshSelected.id, 'VIEWER');
                            }
                          }}
                          disabled={grantMutation.isPending || revokeMutation.isPending}
                          className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                            role === 'VIEWER'
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <Eye size={11} color={role === 'VIEWER' ? '#fff' : '#6b7280'} />
                          <Text className={`text-xs font-medium ${role === 'VIEWER' ? 'text-white' : 'text-gray-600'}`}>
                            View only
                          </Text>
                        </TouchableOpacity>

                        {/* Grant Edit button */}
                        <TouchableOpacity
                          onPress={() => {
                            if (role === 'EDITOR') {
                              handleRevokeAccess(board, freshSelected.id);
                            } else {
                              handleGrantAccess(board, freshSelected.id, 'EDITOR');
                            }
                          }}
                          disabled={grantMutation.isPending || revokeMutation.isPending}
                          className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                            role === 'EDITOR'
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <Pencil size={11} color={role === 'EDITOR' ? '#fff' : '#2563eb'} />
                          <Text className={`text-xs font-medium ${role === 'EDITOR' ? 'text-white' : 'text-blue-600'}`}>
                            {role === 'EDITOR' ? 'Editor ✓' : 'Grant Edit'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowInvite(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Invite User</Text>
            <TouchableOpacity onPress={() => setShowInvite(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="gap-4">
            <Input label="Name (optional)" value={inviteName} onChangeText={setInviteName}
              placeholder="Their name" autoCapitalize="words" />
            <Input label="Email address" value={inviteEmail} onChangeText={setInviteEmail}
              placeholder="colleague@example.com" keyboardType="email-address"
              autoCapitalize="none" autoFocus />
            <Button title="Send Invitation" onPress={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending} disabled={!inviteEmail.trim()} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Deterministic color from a name string
function stringToColor(str: string) {
  const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#be185d', '#65a30d'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
