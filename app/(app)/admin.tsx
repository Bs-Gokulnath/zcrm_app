import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, X, Trash2, ChevronDown } from 'lucide-react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { usersApi, type User } from '../../services/users';

export default function AdminScreen() {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const { data: users, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => usersApi.invite(inviteEmail.trim().toLowerCase(), inviteName.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      usersApi.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  function handleToggleRole(user: User) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    Alert.alert(
      'Change Role',
      `Make ${user.name} a${newRole === 'ADMIN' ? 'n Admin' : ' User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateRoleMutation.mutate({ id: user.id, role: newRole }) },
      ],
    );
  }

  function handleDelete(user: User) {
    Alert.alert(
      'Remove User',
      `Remove ${user.name} from the workspace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(user.id) },
      ],
    );
  }

  const userList = Array.isArray(users) ? users : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900">Admin</Text>
          <Text className="text-xs text-gray-500">{userList.length} users</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowInvite(true)}
          className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2"
        >
          <UserPlus size={14} color="#fff" />
          <Text className="text-sm text-white font-semibold">Invite</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading users..." />
      ) : (
        <FlatList
          data={userList}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                    <Text className="text-base font-bold text-blue-600">
                      {item.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-gray-900">{item.name}</Text>
                    <Text className="text-xs text-gray-400">{item.email}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  className="p-1.5"
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleRole(item)}
                className={`self-start flex-row items-center gap-1 rounded-full px-3 py-1 border ${
                  item.role === 'ADMIN'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-xs font-medium ${
                  item.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-600'
                }`}>
                  {item.role}
                </Text>
                <ChevronDown size={10} color={item.role === 'ADMIN' ? '#7c3aed' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No users yet"
              subtitle="Invite team members to get started"
            />
          }
        />
      )}

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
            <Input
              label="Name (optional)"
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Their name"
              autoCapitalize="words"
            />
            <Input
              label="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="colleague@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Button
              title="Send Invitation"
              onPress={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
              disabled={!inviteEmail.trim()}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
