import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, Platform, RefreshControl,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Lock, Plus, Search, Users, X } from 'lucide-react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { workspacesApi, type Workspace } from '../../services/workspaces';
import { useAuth } from '../../context/AuthContext';

export default function WorkspacesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owner' | 'member'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrivacy, setNewPrivacy] = useState<'OPEN' | 'CLOSED'>('OPEN');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspacesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => workspacesApi.create(newName.trim(), newPrivacy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setNewName('');
      setNewPrivacy('OPEN');
    },
    onError: (e: Error) => Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workspacesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
    onError: (e: Error) => Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message),
  });

  function handleDelete(ws: Workspace) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${ws.name}"?\n\nThis cannot be undone.`)) deleteMutation.mutate(ws.id);
    } else {
      Alert.alert('Delete Workspace', `Delete "${ws.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(ws.id) },
      ]);
    }
  }

  const all: Workspace[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const filtered = all.filter((ws) => {
    const matchSearch = ws.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'owner' && ws.userRole === 'OWNER') ||
      (filter === 'member' && ws.userRole === 'MEMBER');
    return matchSearch && matchFilter;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'owner', label: 'Owner' },
    { key: 'member', label: 'Member' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900">Workspaces</Text>
          <Text className="text-xs text-gray-500">{all.length} workspaces</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2"
        >
          <Plus size={14} color="#fff" />
          <Text className="text-sm text-white font-semibold">New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-4 pt-3 pb-2 bg-white">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2">
          <Search size={14} color="#9ca3af" />
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search workspaces..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* Filter tabs */}
        <View className="flex-row gap-2 mt-2">
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full border ${
                filter === f.key
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  filter === f.key ? 'text-white' : 'text-gray-600'
                }`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading workspaces..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(ws) => ws.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                    <Building2 size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <View
                        className={`flex-row items-center gap-0.5 ${
                          item.privacy === 'CLOSED' ? 'opacity-100' : 'opacity-60'
                        }`}
                      >
                        {item.privacy === 'CLOSED' && <Lock size={10} color="#6b7280" />}
                        <Text className="text-xs text-gray-500">
                          {item.privacy === 'CLOSED' ? 'Private' : 'Open'}
                        </Text>
                      </View>
                      {item._count && (
                        <>
                          <Text className="text-xs text-gray-300">·</Text>
                          <View className="flex-row items-center gap-1">
                            <Users size={10} color="#9ca3af" />
                            <Text className="text-xs text-gray-400">
                              {item._count.members}
                            </Text>
                          </View>
                        </>
                      )}
                      <Text className="text-xs text-gray-300">·</Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          item.userRole === 'OWNER' ? 'bg-green-50' : 'bg-gray-50'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            item.userRole === 'OWNER' ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          {item.userRole}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {item.userRole === 'OWNER' && (
                  <TouchableOpacity onPress={() => handleDelete(item)} className="p-1.5 ml-2">
                    <X size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No workspaces found"
              subtitle={search ? 'Try a different search term' : 'Create your first workspace'}
            />
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">New Workspace</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            <Input
              label="Workspace name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Sales Team"
              autoFocus
            />

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Privacy</Text>
              <View className="flex-row gap-3">
                {(['OPEN', 'CLOSED'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setNewPrivacy(p)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      newPrivacy === p
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        newPrivacy === p ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {p === 'OPEN' ? 'Open' : 'Private'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Create Workspace"
              onPress={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!newName.trim()}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
