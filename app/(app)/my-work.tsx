import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList, RefreshControl, ScrollView, SectionList,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar, ChevronDown, ChevronRight, EyeOff, Search,
} from 'lucide-react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ItemDetailModal } from '../../components/boards/ItemDetailModal';
import { useAuth } from '../../context/AuthContext';
import { boardsApi } from '../../services/boards';
import { groupsApi, type BoardItem } from '../../services/board-groups';

type ViewMode = 'status' | 'priority' | 'board' | 'date';

interface WorkItem extends BoardItem {
  boardId: string;
  boardName: string;
}

const DONE_STATUSES = ['Charger Live', 'Onboarded', 'Not Feasible'];

function getDateBucket(dueDate?: string): string {
  if (!dueDate) return 'No Date';
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return 'Past Due';
  if (diff === 0) return 'Today';
  if (diff <= 7) return 'This Week';
  if (diff <= 14) return 'Next Week';
  return 'Later';
}

const DATE_BUCKET_ORDER = ['Past Due', 'Today', 'This Week', 'Next Week', 'Later', 'No Date'];

function groupItems(items: WorkItem[], mode: ViewMode): { title: string; data: WorkItem[] }[] {
  const map = new Map<string, WorkItem[]>();

  for (const item of items) {
    let key: string;
    if (mode === 'status') key = item.status ?? 'No Status';
    else if (mode === 'priority') key = item.priority ?? 'No Priority';
    else if (mode === 'board') key = item.boardName;
    else key = getDateBucket(item.dueDate);

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const sections = Array.from(map.entries()).map(([title, data]) => ({ title, data }));

  if (mode === 'date') {
    sections.sort(
      (a, b) => DATE_BUCKET_ORDER.indexOf(a.title) - DATE_BUCKET_ORDER.indexOf(b.title),
    );
  }

  return sections;
}

export default function MyWorkScreen() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [search, setSearch] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const boardsRes = await boardsApi.getAll();
      const boards = Array.isArray(boardsRes) ? boardsRes : (boardsRes as any).data ?? [];
      const workItems: WorkItem[] = [];

      await Promise.all(
        boards.map(async (board: any) => {
          try {
            const groupsRes = await groupsApi.getAll(board.id);
            const groups = Array.isArray(groupsRes) ? groupsRes : (groupsRes as any).data ?? [];
            for (const group of groups) {
              for (const item of group.items) {
                if (
                  item.owner?.toLowerCase() === user?.name?.toLowerCase() ||
                  item.owner?.toLowerCase() === user?.email?.toLowerCase()
                ) {
                  workItems.push({ ...item, boardId: board.id, boardName: board.name });
                }
              }
            }
          } catch {
            // skip boards with errors
          }
        }),
      );

      setAllItems(workItems);
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

  function toggleCollapse(title: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = allItems;
    if (hideDone) result = result.filter((i) => !DONE_STATUSES.includes(i.status ?? ''));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.boardName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allItems, hideDone, search]);

  const sections = useMemo(() => groupItems(filtered, viewMode), [filtered, viewMode]);

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'board', label: 'Board' },
    { key: 'date', label: 'Date' },
  ];

  function renderItem({ item }: { item: WorkItem }) {
    return (
      <TouchableOpacity
        onPress={() => setSelectedItem(item)}
        className="bg-white rounded-2xl p-4 mb-2 border border-gray-100"
      >
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-sm font-medium text-gray-900 flex-1 mr-2" numberOfLines={2}>
            {item.name}
          </Text>
          {item.status && <StatusBadge label={item.status} type="status" />}
        </View>
        <Text className="text-xs text-blue-500 mb-2">{item.boardName}</Text>
        <View className="flex-row gap-2 flex-wrap">
          {item.priority && <StatusBadge label={item.priority} type="priority" />}
          {item.city && <Text className="text-xs text-gray-400">{item.city}</Text>}
          {item.dueDate && (
            <View className="flex-row items-center gap-1">
              <Calendar size={10} color="#9ca3af" />
              <Text className="text-xs text-gray-400">
                {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderSectionHeader({ section }: { section: { title: string; data: WorkItem[] } }) {
    const isCollapsed = collapsed.has(section.title);
    return (
      <TouchableOpacity
        onPress={() => toggleCollapse(section.title)}
        className="flex-row items-center justify-between py-2 px-1 mb-1"
      >
        <View className="flex-row items-center gap-2">
          {isCollapsed
            ? <ChevronRight size={14} color="#6b7280" />
            : <ChevronDown size={14} color="#6b7280" />}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {section.title}
          </Text>
          <View className="bg-gray-100 rounded-full px-2 py-0.5">
            <Text className="text-xs text-gray-500">{section.data.length}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader />
      {/* Subheader */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-gray-500">{filtered.length} items assigned to you</Text>
          <TouchableOpacity
            onPress={() => setHideDone((v) => !v)}
            className={`flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 border ${
              hideDone ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <EyeOff size={13} color={hideDone ? '#2563eb' : '#9ca3af'} />
            <Text className={`text-xs font-medium ${hideDone ? 'text-blue-600' : 'text-gray-500'}`}>
              Hide Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2 mb-2">
          <Search size={14} color="#9ca3af" />
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search items or boards..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* View mode tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {VIEW_MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setViewMode(m.key)}
                className={`px-3 py-1 rounded-full border ${
                  viewMode === m.key
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    viewMode === m.key ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading your items..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No items assigned to you"
          subtitle="Items where you are listed as owner will appear here"
        />
      ) : (
        <SectionList
          sections={sections.map((s) => ({
            ...s,
            data: collapsed.has(s.title) ? [] : s.data,
          }))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
        />
      )}

      <ItemDetailModal
        item={selectedItem}
        boardId={selectedItem?.boardId ?? ''}
        groupId={selectedItem?.groupId ?? ''}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={(updated) => {
          setAllItems((prev) =>
            prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
          );
          setSelectedItem(null);
        }}
        onDelete={() => {
          setAllItems((prev) => prev.filter((i) => i.id !== selectedItem?.id));
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>
  );
}
