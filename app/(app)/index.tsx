import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Plus, Search, X } from 'lucide-react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BoardCard } from '../../components/boards/BoardCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { boardsApi, type BoardType } from '../../services/boards';
import { groupsApi } from '../../services/board-groups';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BoardType;
  groups: { name: string; color: string }[];
}

const TEMPLATES: Template[] = [
  {
    id: 'crm-pipeline',
    name: 'CRM Pipeline',
    description: 'Track leads from prospecting to closing',
    icon: '🎯',
    type: 'NORMAL',
    groups: [
      { name: 'Prospecting', color: '#6c7a89' },
      { name: 'Qualified', color: '#2980b9' },
      { name: 'Proposal Sent', color: '#8e44ad' },
      { name: 'Negotiation', color: '#e67e22' },
      { name: 'Closed Won', color: '#27ae60' },
      { name: 'Closed Lost', color: '#e74c3c' },
    ],
  },
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Manage tasks and milestones for any project',
    icon: '📁',
    type: 'NORMAL',
    groups: [
      { name: 'Backlog', color: '#95a5a6' },
      { name: 'To Do', color: '#3498db' },
      { name: 'In Progress', color: '#f39c12' },
      { name: 'Review', color: '#9b59b6' },
      { name: 'Done', color: '#2ecc71' },
    ],
  },
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    description: 'Organise and run agile sprints',
    icon: '⚡',
    type: 'NORMAL',
    groups: [
      { name: 'Sprint Backlog', color: '#7f8c8d' },
      { name: 'In Sprint', color: '#2980b9' },
      { name: 'In Progress', color: '#e67e22' },
      { name: 'Testing', color: '#8e44ad' },
      { name: 'Done', color: '#27ae60' },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Log, prioritise and resolve bugs',
    icon: '🐛',
    type: 'NORMAL',
    groups: [
      { name: 'New', color: '#e74c3c' },
      { name: 'Triaged', color: '#e67e22' },
      { name: 'In Progress', color: '#3498db' },
      { name: 'Testing', color: '#9b59b6' },
      { name: 'Resolved', color: '#27ae60' },
      { name: 'Closed', color: '#95a5a6' },
    ],
  },
  {
    id: 'roadmap',
    name: 'Roadmap',
    description: 'Plan and track product milestones',
    icon: '🗺️',
    type: 'NORMAL',
    groups: [
      { name: 'Ideas', color: '#7f8c8d' },
      { name: 'Q1', color: '#3498db' },
      { name: 'Q2', color: '#27ae60' },
      { name: 'Q3', color: '#f39c12' },
      { name: 'Q4', color: '#e67e22' },
      { name: 'Shipped', color: '#2ecc71' },
    ],
  },
  {
    id: 'employee-onboarding',
    name: 'Employee Onboarding',
    description: 'Guide new hires through onboarding',
    icon: '👋',
    type: 'NORMAL',
    groups: [
      { name: 'Pre-boarding', color: '#3498db' },
      { name: 'Week 1', color: '#27ae60' },
      { name: 'Week 2-4', color: '#f39c12' },
      { name: 'Month 2-3', color: '#9b59b6' },
      { name: 'Completed', color: '#2ecc71' },
    ],
  },
];

export default function BoardsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<'blank' | 'template'>('blank');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<BoardType>('NORMAL');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

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

  async function createFromTemplate(template: Template) {
    if (!newName.trim()) return;
    setCreatingFromTemplate(true);
    try {
      const res = await boardsApi.create(newName.trim(), template.type, template.description);
      const board = (res as any)?.data ?? res;
      for (const group of template.groups) {
        await groupsApi.create(board.id, group.name, group.color);
      }
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setNewName('');
      setSelectedTemplate(null);
      router.push(`/board/${board.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreatingFromTemplate(false);
    }
  }

  const boards = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const filtered = search
    ? boards.filter((b: any) => b.name.toLowerCase().includes(search.toLowerCase()))
    : boards;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader
        right={
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-sm text-white font-semibold">New</Text>
          </TouchableOpacity>
        }
      />
      <View className="px-4 pt-2 pb-2 bg-white border-b border-gray-100">
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
          keyExtractor={(b: any) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <BoardCard board={item} onPress={() => router.push(`/board/${item.id}`)} />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <EmptyState
              title={search ? 'No boards match your search' : 'No boards yet'}
              subtitle={search ? 'Try a different keyword' : 'Tap New Board to get started'}
            />
          }
        />
      )}

      {/* Create Board Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">New Board</Text>
            <TouchableOpacity onPress={() => { setShowCreate(false); setSelectedTemplate(null); setCreateTab('blank'); }}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row mx-6 mt-4 mb-4 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'blank' as const, label: 'Blank Board' },
              { key: 'template' as const, label: 'From Template' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { setCreateTab(tab.key); setSelectedTemplate(null); }}
                className={`flex-1 py-2 rounded-lg items-center ${
                  createTab === tab.key ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text className={`text-sm font-medium ${createTab === tab.key ? 'text-gray-900' : 'text-gray-500'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
            {createTab === 'blank' ? (
              <View className="gap-4">
                <Input label="Board name" value={newName} onChangeText={setNewName}
                  placeholder="e.g. EV Site Tracker" autoFocus />
                <Input label="Description (optional)" value={newDesc} onChangeText={setNewDesc}
                  placeholder="What is this board for?" multiline />
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
                  <View className="flex-row gap-2">
                    {(['NORMAL', 'MULTI_LEVEL'] as BoardType[]).map((t) => (
                      <TouchableOpacity key={t} onPress={() => setNewType(t)}
                        className={`flex-1 py-2.5 rounded-xl border items-center ${
                          newType === t ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'
                        }`}>
                        <Text className={`text-sm font-medium ${newType === t ? 'text-blue-600' : 'text-gray-600'}`}>
                          {t === 'NORMAL' ? 'Standard' : 'Multi-Level'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Button title="Create Board" onPress={() => createMutation.mutate()}
                  loading={createMutation.isPending} disabled={!newName.trim()} />
              </View>
            ) : selectedTemplate ? (
              <View className="gap-4">
                <View className="bg-blue-50 rounded-2xl p-4 mb-2">
                  <Text className="text-2xl mb-1">{selectedTemplate.icon}</Text>
                  <Text className="text-base font-bold text-gray-900">{selectedTemplate.name}</Text>
                  <Text className="text-sm text-gray-500 mt-0.5">{selectedTemplate.description}</Text>
                  <View className="flex-row flex-wrap gap-1.5 mt-3">
                    {selectedTemplate.groups.map((g) => (
                      <View key={g.name} className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: g.color + '22' }}>
                        <Text className="text-xs font-medium" style={{ color: g.color }}>{g.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Input label="Board name" value={newName} onChangeText={setNewName}
                  placeholder={selectedTemplate.name} autoFocus />
                <Button title="Create from Template" onPress={() => createFromTemplate(selectedTemplate)}
                  loading={creatingFromTemplate} disabled={!newName.trim()} />
                <TouchableOpacity onPress={() => setSelectedTemplate(null)} className="py-2 items-center">
                  <Text className="text-sm text-gray-400">← Back to templates</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-3">
                {TEMPLATES.map((template) => (
                  <TouchableOpacity key={template.id}
                    onPress={() => { setSelectedTemplate(template); setNewName(template.name); }}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex-row items-center gap-3 shadow-sm"
                  >
                    <View className="w-12 h-12 bg-gray-50 rounded-xl items-center justify-center">
                      <Text className="text-2xl">{template.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{template.name}</Text>
                      <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                        {template.description}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1">
                        {template.groups.length} groups
                      </Text>
                    </View>
                    <LayoutTemplate size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
