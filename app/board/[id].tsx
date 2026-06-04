import React, { useState, useEffect } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, ChevronDown, ChevronRight, Copy, FileSpreadsheet, Images,
  LayoutGrid, Lock, Map, MoreVertical,
  Plus, Settings, Trash2, UserPlus, Users, X,
} from 'lucide-react-native';
import { ItemCard } from '../../components/boards/ItemCard';
import { ItemDetailModal } from '../../components/boards/ItemDetailModal';
import { ImportModal } from '../../components/boards/ImportModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OlaMap, type MapMarker } from '../../components/ui/OlaMap';
import { boardsApi, type BoardMember, type MemberRole, type DuplicateMode } from '../../services/boards';
import { groupsApi, type BoardItem, type BoardGroup } from '../../services/board-groups';
import { resolveItem } from '../../services/geocoding';

type BoardTab = 'table' | 'map' | 'files';

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
  const [showOptions, setShowOptions] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [importGroup, setImportGroup] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('structure_items');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('VIEWER');

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

  const { data: membersData, refetch: refetchMembers } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardsApi.getMembers(boardId),
    enabled: showMembers,
  });

  const board = (boardData as any)?.data ?? boardData;
  const groups: BoardGroup[] = Array.isArray(groupsData)
    ? groupsData
    : (groupsData as any)?.data ?? [];

  const allItems = groups.flatMap((g) => g.items.map((item) => ({ item, group: g })));
  const filesItems = allItems.filter(({ item }) => item.files);

  // Mutations
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

  const archiveMutation = useMutation({
    mutationFn: () => boardsApi.archive(boardId),
    onSuccess: () => {
      setShowOptions(false);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      router.canGoBack() ? router.back() : router.replace('/(app)');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => boardsApi.remove(boardId),
    onSuccess: () => {
      setShowOptions(false);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      router.canGoBack() ? router.back() : router.replace('/(app)');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => boardsApi.duplicate(boardId, duplicateName.trim(), duplicateMode),
    onSuccess: (res) => {
      setShowDuplicate(false);
      setDuplicateName('');
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      const newBoard = (res as any)?.data ?? res;
      if (newBoard?.id) router.push(`/board/${newBoard.id}`);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const updateBoardMutation = useMutation({
    mutationFn: () =>
      boardsApi.update(boardId, { name: editName.trim(), description: editDesc.trim(), isPrivate: editPrivate }),
    onSuccess: () => {
      setShowEditBoard(false);
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => boardsApi.addMember(boardId, inviteEmail.trim().toLowerCase(), inviteRole),
    onSuccess: () => {
      setShowAddMember(false);
      setInviteEmail('');
      setInviteRole('VIEWER');
      refetchMembers();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => boardsApi.removeMember(boardId, memberId),
    onSuccess: () => refetchMembers(),
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

  function handleArchive() {
    Alert.alert('Archive Board', 'Archive this board? You can restore it later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', onPress: () => archiveMutation.mutate() },
    ]);
  }

  function handleDelete() {
    Alert.alert('Delete Board', 'Move this board to trash?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }

  function openEditBoard() {
    setEditName(board?.name ?? '');
    setEditDesc(board?.description ?? '');
    setEditPrivate(board?.isPrivate ?? false);
    setShowOptions(false);
    setShowEditBoard(true);
  }

  function openDuplicate() {
    setDuplicateName(`${board?.name ?? 'Board'} (Copy)`);
    setShowOptions(false);
    setShowDuplicate(true);
  }

  function handleRemoveMember(member: BoardMember) {
    Alert.alert('Remove Member', `Remove ${member.user.name} from this board?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMemberMutation.mutate(member.id) },
    ]);
  }

  useEffect(() => {
    if (activeTab !== 'map' || groups.length === 0) return;
    let cancelled = false;
    setGeocoding(true);
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
            id: item.id, latitude: coords[0], longitude: coords[1],
            title: item.name, city: item.city, state: item.state,
            location: item.location, status: item.status, priority: item.priority,
            owner: item.owner, phone: item.phone, email: item.email,
            investment: item.investment, powerAvailability: item.powerAvailability,
            availableParking: item.availableParking, propertyType: item.propertyType,
            googleRating: item.googleRating, noOfRatings: item.noOfRatings,
            landOwnerContact: item.landOwnerContact, notes: item.notes,
            groupName: group.name, groupColor: group.color,
          });
        }
      }
      if (!cancelled) { setMapMarkers(markers); setGeocoding(false); }
    })();

    return () => { cancelled = true; };
  }, [activeTab, groups]);

  const MEMBER_ROLES: MemberRole[] = ['VIEWER', 'EDITOR', 'ADMIN'];
  const DUPLICATE_MODES: { key: DuplicateMode; label: string }[] = [
    { key: 'structure', label: 'Structure only' },
    { key: 'structure_items', label: 'Structure + Items' },
    { key: 'structure_items_updates', label: 'Structure + Items + Updates' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? router.back() : router.replace('/(app)')}
          className="mr-3 p-1"
        >
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {board?.name ?? 'Board'}
            </Text>
            {board?.isPrivate && <Lock size={13} color="#9ca3af" />}
          </View>
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
          <TouchableOpacity
            onPress={() => setShowOptions(true)}
            className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center"
          >
            <MoreVertical size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Tabs */}
      <View style={boardStyles.tabBar}>
        {[
          { key: 'table' as BoardTab, icon: <LayoutGrid size={14} color={activeTab === 'table' ? '#0073EA' : '#676879'} />, label: 'Table' },
          { key: 'map' as BoardTab, icon: <Map size={14} color={activeTab === 'map' ? '#0073EA' : '#676879'} />, label: 'Map' },
          { key: 'files' as BoardTab, icon: <Images size={14} color={activeTab === 'files' ? '#0073EA' : '#676879'} />, label: 'Files' },
        ].map(({ key, icon, label }) => (
          <TouchableOpacity
            key={key}
            style={[boardStyles.tab, activeTab === key && boardStyles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            {icon}
            <Text style={[boardStyles.tabText, activeTab === key && boardStyles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
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
                {mapMarkers.length} / {allItems.length} plotted
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        filesItems.length === 0 ? (
          <EmptyState title="No files attached" subtitle="Attach files to items to see them here" />
        ) : (
          <FlatList
            data={filesItems}
            keyExtractor={({ item }) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item: { item, group } }) => (
              <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
                <Text className="text-sm font-semibold text-gray-900 mb-1">{item.name}</Text>
                <Text className="text-xs text-gray-400 mb-2">in {group.name}</Text>
                <Text className="text-xs text-blue-600 break-all">{item.files}</Text>
              </View>
            )}
          />
        )
      )}

      {/* Table tab */}
      {activeTab === 'table' && isLoading ? (
        <LoadingSpinner message="Loading board..." />
      ) : activeTab === 'table' && groups.length === 0 ? (
        <EmptyState title="No groups yet" subtitle="Tap + to add your first group" />
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
                <View
                  className="flex-row items-center justify-between px-3 py-2.5 rounded-t-xl"
                  style={{ backgroundColor: group.color + '18', borderBottomWidth: 2, borderBottomColor: group.color }}
                >
                  <TouchableOpacity
                    onPress={() => toggleGroup(group.id)}
                    className="flex-row items-center gap-2 flex-1"
                  >
                    {isCollapsed
                      ? <ChevronRight size={16} color={group.color} />
                      : <ChevronDown size={16} color={group.color} />}
                    <Text style={{ color: group.color }} className="text-sm font-bold">
                      {group.name}
                    </Text>
                    <Text className="text-xs text-gray-400">({group.items.length})</Text>
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
                      onPress={() => setImportGroup({ id: group.id, name: group.name })}
                      className="px-2 py-1 rounded-lg bg-green-50"
                    >
                      <FileSpreadsheet size={14} color="#16a34a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group)}
                      className="px-2 py-1 rounded-lg bg-red-50"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {!isCollapsed && (
                  <View className="bg-gray-50 rounded-b-xl border border-t-0 border-gray-100 px-3 py-2">
                    {group.items.length === 0 && addingItemToGroup !== group.id ? (
                      <Text className="text-xs text-gray-400 py-3 text-center">No items — tap + to add one</Text>
                    ) : (
                      group.items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onPress={() => setSelectedItem({ item, groupId: group.id })}
                        />
                      ))
                    )}
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
                            if (newItemName.trim()) addItemMutation.mutate({ groupId: group.id, name: newItemName.trim() });
                          }}
                          className="flex-1 border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
                        />
                        <TouchableOpacity
                          onPress={() => { if (newItemName.trim()) addItemMutation.mutate({ groupId: group.id, name: newItemName.trim() }); }}
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
      <Modal visible={showAddGroup} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAddGroup(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Add Group</Text>
            <TouchableOpacity onPress={() => setShowAddGroup(false)}><X size={22} color="#374151" /></TouchableOpacity>
          </View>
          <View className="gap-4">
            <Input label="Group name" value={newGroupName} onChangeText={setNewGroupName}
              placeholder="e.g. Mumbai Sites" autoFocus returnKeyType="done"
              onSubmitEditing={() => newGroupName.trim() && addGroupMutation.mutate()} />
            <Button title="Create Group" onPress={() => addGroupMutation.mutate()}
              loading={addGroupMutation.isPending} disabled={!newGroupName.trim()} />
          </View>
        </View>
      </Modal>

      {/* Board Options Modal */}
      <Modal visible={showOptions} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowOptions(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Board Options</Text>
            <TouchableOpacity onPress={() => setShowOptions(false)}><X size={22} color="#374151" /></TouchableOpacity>
          </View>
          <View className="gap-3">
            <TouchableOpacity onPress={openEditBoard}
              className="flex-row items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <Settings size={18} color="#374151" />
              <Text className="text-sm font-medium text-gray-800">Edit Board Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openDuplicate}
              className="flex-row items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <Copy size={18} color="#374151" />
              <Text className="text-sm font-medium text-gray-800">Duplicate Board</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowOptions(false); handleArchive(); }}
              className="flex-row items-center gap-3 p-4 bg-amber-50 rounded-2xl">
              <Settings size={18} color="#d97706" />
              <Text className="text-sm font-medium text-amber-700">Archive Board</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowOptions(false); handleDelete(); }}
              className="flex-row items-center gap-3 p-4 bg-red-50 rounded-2xl">
              <Trash2 size={18} color="#ef4444" />
              <Text className="text-sm font-medium text-red-600">Delete Board</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Board Modal */}
      <Modal visible={showEditBoard} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowEditBoard(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Edit Board</Text>
            <TouchableOpacity onPress={() => setShowEditBoard(false)}><X size={22} color="#374151" /></TouchableOpacity>
          </View>
          <View className="gap-4">
            <Input label="Board name" value={editName} onChangeText={setEditName} placeholder="Board name" />
            <Input label="Description (optional)" value={editDesc} onChangeText={setEditDesc}
              placeholder="What is this board about?" multiline />
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Privacy</Text>
              <View className="flex-row gap-3">
                {[{ label: 'Public', value: false }, { label: 'Private', value: true }].map((opt) => (
                  <TouchableOpacity key={String(opt.value)} onPress={() => setEditPrivate(opt.value)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      editPrivate === opt.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                    }`}>
                    <Text className={`text-sm font-medium ${editPrivate === opt.value ? 'text-white' : 'text-gray-600'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Button title="Save Changes" onPress={() => updateBoardMutation.mutate()}
              loading={updateBoardMutation.isPending} disabled={!editName.trim()} />
          </View>
        </View>
      </Modal>

      {/* Duplicate Board Modal */}
      <Modal visible={showDuplicate} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowDuplicate(false)}>
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Duplicate Board</Text>
            <TouchableOpacity onPress={() => setShowDuplicate(false)}><X size={22} color="#374151" /></TouchableOpacity>
          </View>
          <View className="gap-4">
            <Input label="New board name" value={duplicateName} onChangeText={setDuplicateName} placeholder="Board name" autoFocus />
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">What to copy</Text>
              {DUPLICATE_MODES.map((m) => (
                <TouchableOpacity key={m.key} onPress={() => setDuplicateMode(m.key)}
                  className={`flex-row items-center gap-3 p-3 rounded-xl mb-2 border ${
                    duplicateMode === m.key ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                  }`}>
                  <View className={`w-4 h-4 rounded-full border-2 ${
                    duplicateMode === m.key ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`} />
                  <Text className={`text-sm ${duplicateMode === m.key ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Duplicate" onPress={() => duplicateMutation.mutate()}
              loading={duplicateMutation.isPending} disabled={!duplicateName.trim()} />
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal visible={showMembers} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMembers(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">Board Members</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setShowAddMember(true)}
                className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2">
                <UserPlus size={14} color="#fff" />
                <Text className="text-sm text-white font-semibold">Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <X size={22} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {showAddMember ? (
            <View className="px-4 pt-4 pb-2 bg-blue-50 border-b border-blue-100">
              <Text className="text-sm font-semibold text-blue-800 mb-3">Add Member</Text>
              <Input label="Email" value={inviteEmail} onChangeText={setInviteEmail}
                placeholder="colleague@example.com" keyboardType="email-address"
                autoCapitalize="none" autoFocus />
              <View className="flex-row gap-2 mt-3 mb-2">
                {MEMBER_ROLES.map((r) => (
                  <TouchableOpacity key={r} onPress={() => setInviteRole(r)}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      inviteRole === r ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                    }`}>
                    <Text className={`text-xs font-medium ${inviteRole === r ? 'text-white' : 'text-gray-600'}`}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-2 mt-1">
                <Button title="Add" onPress={() => addMemberMutation.mutate()}
                  loading={addMemberMutation.isPending} disabled={!inviteEmail.trim()} />
                <TouchableOpacity onPress={() => setShowAddMember(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl items-center">
                  <Text className="text-sm font-medium text-gray-600">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <FlatList
            data={(membersData as any)?.data ?? membersData ?? []}
            keyExtractor={(m: BoardMember) => m.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: member }: { item: BoardMember }) => (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
                    <Text className="text-sm font-bold text-blue-600">
                      {member.user.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-800">{member.user.name}</Text>
                    <Text className="text-xs text-gray-400">{member.user.email}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
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
                  <TouchableOpacity onPress={() => handleRemoveMember(member)}>
                    <X size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text className="text-center text-gray-400 py-8">No members yet</Text>}
          />
        </View>
      </Modal>

      {/* Import Modal */}
      <ImportModal
        visible={!!importGroup}
        boardId={boardId}
        groupId={importGroup?.id ?? ''}
        groupName={importGroup?.name ?? ''}
        onClose={() => setImportGroup(null)}
        onSuccess={() => {
          setImportGroup(null);
          queryClient.invalidateQueries({ queryKey: ['board-groups', boardId] });
        }}
      />

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
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e9ef', paddingHorizontal: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0073EA' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#676879' },
  tabTextActive: { color: '#0073EA', fontWeight: '700' },
  mapContainer: { flex: 1, position: 'relative' },
  geocodingOverlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  geocodingTitle: { fontSize: 15, fontWeight: '600', color: '#323338' },
  progressBar: { width: 260, height: 6, backgroundColor: '#E6E9EF', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0073EA', borderRadius: 99 },
  geocodingCount: { fontSize: 13, color: '#676879' },
  legend: { position: 'absolute', bottom: 24, left: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  legendTitle: { fontSize: 12, fontWeight: '600', color: '#323338' },
});
