import React, { useState, useEffect } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Users, Trash2, ChevronDown, ChevronRight, LayoutGrid, Map } from 'lucide-react-native';
import { ItemCard } from '../../components/boards/ItemCard';
import { ItemDetailModal } from '../../components/boards/ItemDetailModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OlaMap, type MapMarker } from '../../components/ui/OlaMap';
import { boardsApi, type BoardMember } from '../../services/boards';
import { groupsApi, type BoardItem, type BoardGroup } from '../../services/board-groups';
import { resolveItem } from '../../services/geocoding';

type BoardTab = 'table' | 'map';

export default function BoardScreen() {
  const { id: boardId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<BoardTab>('table');
  const [selectedItem, setSelectedItem] = useState<{ item: BoardItem; groupId: string } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingItemToGroup, setAddingItemToGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showMembers, setShowMembers] = useState(false);

  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 });

  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getOne(boardId),
  });

  const { data: groupsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['board-groups', boardId],
    queryFn: () => groupsApi.getAll(boardId),
  });

  const { data: membersData } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardsApi.getMembers(boardId),
    enabled: showMembers,
  });

  const addGroupMutation = useMutation({
    mutationFn: () => groupsApi.create(boardId, newGroupName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] });
      setShowAddGroup(false);
      setNewGroupName('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => groupsApi.delete(boardId, groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      groupsApi.createItem(boardId, groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] });
      setAddingItemToGroup(null);
      setNewItemName('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ groupId, itemId }: { groupId: string; itemId: string }) =>
      groupsApi.deleteItem(boardId, groupId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] });
      setSelectedItem(null);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  function handleDeleteGroup(group: BoardGroup) {
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}" and all its items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroupMutation.mutate(group.id) },
      ],
    );
  }

  const board = boardData?.data;
  const groups = groupsData?.data ?? [];

  useEffect(() => {
    if (activeTab !== 'map' || groups.length === 0) return;
    let cancelled = false;
    setGeocoding(true);
    const allItems = groups.flatMap(g => g.items.map(item => ({ item, group: g })));
    setGeoProgress({ done: 0, total: allItems.length });

    (async () => {
      const markers: MapMarker[] = [];
      let done = 0;
      for (const { item, group } of allItems) {
        if (cancelled) break;
        const coords = await resolveItem(item);
        done++;
        if (!cancelled) setGeoProgress({ done, total: allItems.length });
        if (coords) {
          markers.push({
            id: item.id,
            latitude: coords[0],
            longitude: coords[1],
            title: item.name,
            city: item.city,
            state: item.state,
            location: item.location,
            status: item.status,
            priority: item.priority,
            owner: item.owner,
            phone: item.phone,
            email: item.email,
            investment: item.investment,
            powerAvailability: item.powerAvailability,
            availableParking: item.availableParking,
            propertyType: item.propertyType,
            googleRating: item.googleRating,
            noOfRatings: item.noOfRatings,
            landOwnerContact: item.landOwnerContact,
            notes: item.notes,
            groupName: group.name,
            groupColor: group.color,
          });
        }
      }
      if (!cancelled) { setMapMarkers(markers); setGeocoding(false); }
    })();

    return () => { cancelled = true; };
  }, [activeTab, groups]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.canGoBack() ? router.back() : router.replace('/(app)')} className="mr-3 p-1">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
            {board?.name ?? 'Board'}
          </Text>
          {board?.description ? (
            <Text className="text-xs text-gray-400" numberOfLines={1}>{board.description}</Text>
          ) : null}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowMembers(true)}
            className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center"
          >
            <Users size={16} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddGroup(true)}
            className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center"
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Tabs */}
      <View style={boardStyles.tabBar}>
        <TouchableOpacity
          style={[boardStyles.tab, activeTab === 'table' && boardStyles.tabActive]}
          onPress={() => setActiveTab('table')}
        >
          <LayoutGrid size={14} color={activeTab === 'table' ? '#0073EA' : '#676879'} />
          <Text style={[boardStyles.tabText, activeTab === 'table' && boardStyles.tabTextActive]}>
            Main Table
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[boardStyles.tab, activeTab === 'map' && boardStyles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Map size={14} color={activeTab === 'map' ? '#0073EA' : '#676879'} />
          <Text style={[boardStyles.tabText, activeTab === 'map' && boardStyles.tabTextActive]}>
            Map View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map tab */}
      {activeTab === 'map' && (
        <View style={boardStyles.mapContainer}>
          {geocoding ? (
            <View style={boardStyles.geocodingOverlay}>
              <ActivityIndicator size="large" color="#0073EA" />
              <Text style={boardStyles.geocodingTitle}>Plotting locations…</Text>
              <View style={boardStyles.progressBar}>
                <View style={[boardStyles.progressFill, {
                  width: geoProgress.total > 0 ? `${(geoProgress.done / geoProgress.total) * 100}%` : '0%'
                } as any]} />
              </View>
              <Text style={boardStyles.geocodingCount}>{geoProgress.done} / {geoProgress.total} items</Text>
            </View>
          ) : (
            <OlaMap markers={mapMarkers} style={StyleSheet.absoluteFillObject} />
          )}
          {!geocoding && mapMarkers.length > 0 && (
            <View style={boardStyles.legend}>
              <Text style={boardStyles.legendTitle}>
                {mapMarkers.length} / {groups.flatMap(g => g.items).length} plotted
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Table tab */}
      {activeTab === 'table' && isLoading ? (
        <LoadingSpinner message="Loading board..." />
      ) : activeTab === 'table' && groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          subtitle="Tap + to add your first group"
        />
      ) : activeTab === 'table' ? (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          renderItem={({ item: group }) => {
            const isCollapsed = collapsedGroups.has(group.id);
            return (
              <View className="mb-4">
                {/* Group Header */}
                <View
                  className="flex-row items-center justify-between px-3 py-2.5 rounded-t-xl"
                  style={{ backgroundColor: group.color + '18', borderBottomWidth: 2, borderBottomColor: group.color }}
                >
                  <TouchableOpacity
                    onPress={() => toggleGroup(group.id)}
                    className="flex-row items-center gap-2 flex-1"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={16} color={group.color} />
                    ) : (
                      <ChevronDown size={16} color={group.color} />
                    )}
                    <Text style={{ color: group.color }} className="text-sm font-bold">
                      {group.name}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      ({group.items.length})
                    </Text>
                  </TouchableOpacity>
                  <View className="flex-row gap-1">
                    <TouchableOpacity
                      onPress={() => { setAddingItemToGroup(group.id); setNewItemName(''); }}
                      className="px-2 py-1 rounded-lg"
                      style={{ backgroundColor: group.color + '20' }}
                    >
                      <Plus size={14} color={group.color} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group)}
                      className="px-2 py-1 rounded-lg bg-red-50"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items */}
                {!isCollapsed && (
                  <View className="bg-gray-50 rounded-b-xl border border-t-0 border-gray-100 px-3 py-2">
                    {group.items.length === 0 && addingItemToGroup !== group.id ? (
                      <Text className="text-xs text-gray-400 py-3 text-center">
                        No items — tap + to add one
                      </Text>
                    ) : (
                      group.items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onPress={() => setSelectedItem({ item, groupId: group.id })}
                        />
                      ))
                    )}

                    {/* Add Item inline */}
                    {addingItemToGroup === group.id && (
                      <View className="flex-row gap-2 mt-1">
                        <TextInput
                          value={newItemName}
                          onChangeText={setNewItemName}
                          placeholder="Item name..."
                          placeholderTextColor="#9ca3af"
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (newItemName.trim()) {
                              addItemMutation.mutate({ groupId: group.id, name: newItemName.trim() });
                            }
                          }}
                          className="flex-1 border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            if (newItemName.trim()) {
                              addItemMutation.mutate({ groupId: group.id, name: newItemName.trim() });
                            }
                          }}
                          disabled={addItemMutation.isPending || !newItemName.trim()}
                          className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center"
                        >
                          <Plus size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setAddingItemToGroup(null)}
                          className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                        >
                          <X size={14} color="#374151" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : null}

      {/* Add Group Modal */}
      <Modal
        visible={showAddGroup}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAddGroup(false)}
      >
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Add Group</Text>
            <TouchableOpacity onPress={() => setShowAddGroup(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="gap-4">
            <Input
              label="Group name"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. Mumbai Sites"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => newGroupName.trim() && addGroupMutation.mutate()}
            />
            <Button
              title="Create Group"
              onPress={() => addGroupMutation.mutate()}
              loading={addGroupMutation.isPending}
              disabled={!newGroupName.trim()}
            />
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal
        visible={showMembers}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMembers(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">Board Members</Text>
            <TouchableOpacity onPress={() => setShowMembers(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={membersData?.data ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: member }) => (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
                    <Text className="text-sm font-bold text-blue-600">
                      {member.user.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-gray-800">{member.user.name}</Text>
                    <Text className="text-xs text-gray-400">{member.user.email}</Text>
                  </View>
                </View>
                <View className={`px-2 py-1 rounded-full ${
                  member.role === 'ADMIN' ? 'bg-purple-50' :
                  member.role === 'EDITOR' ? 'bg-green-50' : 'bg-gray-100'
                }`}>
                  <Text className={`text-xs font-medium ${
                    member.role === 'ADMIN' ? 'text-purple-600' :
                    member.role === 'EDITOR' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {member.role}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text className="text-center text-gray-400 py-8">No members yet</Text>
            }
          />
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem?.item ?? null}
        boardId={boardId}
        groupId={selectedItem?.groupId ?? ''}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] });
          setSelectedItem(null);
        }}
        onDelete={() => {
          if (selectedItem) {
            deleteItemMutation.mutate({ groupId: selectedItem.groupId, itemId: selectedItem.item.id });
          }
        }}
      />
    </SafeAreaView>
  );
}

const boardStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e9ef',
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0073EA',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#676879',
  },
  tabTextActive: {
    color: '#0073EA',
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  geocodingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 24,
  },
  geocodingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#323338',
  },
  progressBar: {
    width: 260,
    height: 6,
    backgroundColor: '#E6E9EF',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0073EA',
    borderRadius: 99,
  },
  geocodingCount: {
    fontSize: 13,
    color: '#676879',
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#323338',
  },
});
