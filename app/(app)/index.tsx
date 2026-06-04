import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BoardCard } from '../../components/boards/BoardCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { boardsApi, type BoardType } from '../../services/boards';

export default function BoardsScreen() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<BoardType>('NORMAL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => boardsApi.create(newName.trim(), newType, newDesc.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewType('NORMAL');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const boards = data?.data ?? [];
  const filtered = search
    ? boards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : boards;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-gray-900">Boards</Text>
            <Text className="text-xs text-gray-500">Hello, {user?.name}</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center"
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Sign out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: logout },
              ])}
              className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center"
            >
              <Text className="text-sm font-bold text-gray-600">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 gap-2">
          <Search size={16} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search boards..."
            placeholderTextColor="#9ca3af"
            className="flex-1 py-2.5 text-sm text-gray-900"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading boards..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <BoardCard
              board={item}
              onPress={() => router.push(`/board/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <EmptyState
              title={search ? 'No boards match your search' : 'No boards yet'}
              subtitle={search ? 'Try a different keyword' : 'Create your first board to get started'}
            />
          }
        />
      )}

      {/* Create Board Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreate(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">New Board</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            <Input
              label="Board name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. EV Site Tracker"
              autoFocus
            />
            <Input
              label="Description (optional)"
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="What is this board for?"
              multiline
            />

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-700">Type</Text>
              <View className="flex-row gap-2">
                {(['NORMAL', 'MULTI_LEVEL'] as BoardType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setNewType(t)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      newType === t ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${newType === t ? 'text-blue-600' : 'text-gray-600'}`}>
                      {t === 'NORMAL' ? 'Standard' : 'Multi-Level'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Create Board"
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
