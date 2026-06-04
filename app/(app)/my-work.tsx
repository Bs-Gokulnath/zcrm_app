import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ItemDetailModal } from '../../components/boards/ItemDetailModal';
import { useAuth } from '../../context/AuthContext';
import { boardsApi } from '../../services/boards';
import { groupsApi, type BoardItem } from '../../services/board-groups';

interface WorkItem extends BoardItem {
  boardId: string;
  boardName: string;
}

export default function MyWorkScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  async function load() {
    try {
      const boardsRes = await boardsApi.getAll();
      const workItems: WorkItem[] = [];

      await Promise.all(
        boardsRes.data.map(async (board) => {
          try {
            const groupsRes = await groupsApi.getAll(board.id);
            for (const group of groupsRes.data) {
              for (const item of group.items) {
                if (item.owner?.toLowerCase() === user?.name?.toLowerCase() ||
                    item.owner?.toLowerCase() === user?.email?.toLowerCase()) {
                  workItems.push({ ...item, boardId: board.id, boardName: board.name });
                }
              }
            }
          } catch {
            // skip boards with errors
          }
        }),
      );

      setItems(workItems.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? '')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-2 pb-4 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">My Work</Text>
        <Text className="text-xs text-gray-500 mt-0.5">Items assigned to you</Text>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading your items..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row items-start justify-between mb-1">
                <Text className="text-sm font-medium text-gray-900 flex-1 mr-2" numberOfLines={2}>
                  {item.name}
                </Text>
                {item.status && <StatusBadge label={item.status} type="status" />}
              </View>
              <Text className="text-xs text-blue-500 mb-2">{item.boardName}</Text>
              <View className="flex-row gap-2">
                {item.priority && <StatusBadge label={item.priority} type="priority" />}
                {item.city && (
                  <Text className="text-xs text-gray-400">{item.city}</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No items assigned to you"
              subtitle="Items where you are listed as owner will appear here"
            />
          }
        />
      )}

      <ItemDetailModal
        item={selectedItem}
        boardId={selectedItem?.boardId ?? ''}
        groupId={selectedItem?.groupId ?? ''}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={(updated) => {
          setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, ...updated } : i));
          setSelectedItem(null);
        }}
        onDelete={() => {
          setItems((prev) => prev.filter((i) => i.id !== selectedItem?.id));
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>
  );
}
