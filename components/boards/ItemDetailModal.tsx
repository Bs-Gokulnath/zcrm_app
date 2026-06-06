import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { X, ChevronDown, MessageSquare, Activity, Save } from 'lucide-react-native';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { groupsApi, type BoardItem, type ItemUpdate, type ItemActivity } from '../../services/board-groups';

const STATUS_OPTIONS = ['Not Started', 'Working on it', 'Stuck', 'Done', 'In Progress', 'Commissioned', 'Proposed', 'Identified', 'Rejected'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

interface ItemDetailModalProps {
  item: BoardItem | null;
  boardId: string;
  groupId: string;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: BoardItem) => void;
  onDelete: () => void;
}

type Tab = 'details' | 'updates' | 'activity';

interface FieldRowProps {
  label: string;
  value?: string | null;
  onSave: (val: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
}

function FieldRow({ label, value, onSave, multiline, keyboardType }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  if (editing) {
    return (
      <View className="py-2 border-b border-gray-100">
        <Text className="text-xs text-gray-400 mb-1">{label}</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline={multiline}
          keyboardType={keyboardType}
          autoFocus
          className="text-sm text-gray-900 border border-blue-300 rounded-lg px-3 py-2 bg-blue-50"
          placeholderTextColor="#9ca3af"
        />
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            onPress={() => { onSave(draft); setEditing(false); }}
            className="flex-row items-center gap-1 bg-blue-600 rounded-lg px-3 py-1.5"
          >
            <Save size={12} color="#fff" />
            <Text className="text-xs text-white font-medium">Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setDraft(value ?? ''); setEditing(false); }}
            className="bg-gray-100 rounded-lg px-3 py-1.5"
          >
            <Text className="text-xs text-gray-600">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => setEditing(true)} className="py-3 border-b border-gray-100">
      <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
      <Text className={`text-sm ${value ? 'text-gray-900' : 'text-gray-300 italic'}`}>
        {value || 'Tap to edit'}
      </Text>
    </TouchableOpacity>
  );
}

interface SelectRowProps {
  label: string;
  value?: string | null;
  options: string[];
  onSelect: (val: string) => void;
}

function SelectRow({ label, value, options, onSelect }: SelectRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <View className="py-3 border-b border-gray-100">
      <Text className="text-xs text-gray-400 mb-1">{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between"
      >
        {value ? <StatusBadge label={value} type={label === 'Priority' ? 'priority' : 'status'} /> : (
          <Text className="text-sm text-gray-300 italic">Select {label.toLowerCase()}</Text>
        )}
        <ChevronDown size={14} color="#94a3b8" />
      </TouchableOpacity>
      {open && (
        <View className="mt-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => { onSelect(opt); setOpen(false); }}
              className="px-3 py-2.5 border-b border-gray-100 last:border-0"
            >
              <StatusBadge label={opt} type={label === 'Priority' ? 'priority' : 'status'} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function ItemDetailModal({
  item, boardId, groupId, visible, onClose, onUpdate, onDelete,
}: ItemDetailModalProps) {
  const [tab, setTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<ItemUpdate[]>([]);
  const [activities, setActivities] = useState<ItemActivity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  useEffect(() => {
    if (!item || !visible) return;
    if (tab === 'updates') loadUpdates();
    if (tab === 'activity') loadActivities();
  }, [tab, item, visible]);

  async function loadUpdates() {
    if (!item) return;
    setLoadingUpdates(true);
    try {
      const res = await groupsApi.getUpdates(boardId, groupId, item.id);
      setUpdates(res.data);
    } catch {
      // silent
    } finally {
      setLoadingUpdates(false);
    }
  }

  async function loadActivities() {
    if (!item) return;
    setLoadingUpdates(true);
    try {
      const res = await groupsApi.getActivities(boardId, groupId, item.id);
      setActivities(res.data);
    } catch {
      // silent
    } finally {
      setLoadingUpdates(false);
    }
  }

  async function handleFieldSave(field: keyof BoardItem, value: string) {
    if (!item) return;
    setSaving(true);
    try {
      const res = await groupsApi.updateItem(boardId, groupId, item.id, { [field]: value });
      onUpdate(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handlePostComment() {
    if (!item || !newComment.trim()) return;
    setPostingComment(true);
    try {
      await groupsApi.createUpdate(boardId, groupId, item.id, newComment.trim());
      setNewComment('');
      await loadUpdates();
    } catch {
      // silent
    } finally {
      setPostingComment(false);
    }
  }

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this item?\n\nThis action cannot be undone.')) onDelete();
    } else {
      Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }
  }

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-gray-900 flex-1 text-center mx-4" numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            className="px-3 py-1 bg-red-50 rounded-lg"
          >
            <Text className="text-xs text-red-500 font-medium">Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-200">
          {(['details', 'updates', 'activity'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-3 items-center border-b-2 ${tab === t ? 'border-blue-600' : 'border-transparent'}`}
            >
              <Text className={`text-sm font-medium capitalize ${tab === t ? 'text-blue-600' : 'text-gray-500'}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {tab === 'details' && (
            <View className="py-2">
              <FieldRow label="Name" value={item.name} onSave={(v) => handleFieldSave('name', v)} />
              <SelectRow label="Status" value={item.status} options={STATUS_OPTIONS} onSelect={(v) => handleFieldSave('status', v)} />
              <SelectRow label="Priority" value={item.priority} options={PRIORITY_OPTIONS} onSelect={(v) => handleFieldSave('priority', v)} />
              <FieldRow label="Owner" value={item.owner} onSave={(v) => handleFieldSave('owner', v)} />
              <FieldRow label="City" value={item.city} onSave={(v) => handleFieldSave('city', v)} />
              <FieldRow label="State" value={item.state} onSave={(v) => handleFieldSave('state', v)} />
              <FieldRow label="Location" value={item.location} onSave={(v) => handleFieldSave('location', v)} />
              <FieldRow label="Property Type" value={item.propertyType} onSave={(v) => handleFieldSave('propertyType', v)} />
              <FieldRow label="Phone" value={item.phone} onSave={(v) => handleFieldSave('phone', v)} keyboardType="phone-pad" />
              <FieldRow label="Email" value={item.email} onSave={(v) => handleFieldSave('email', v)} keyboardType="email-address" />
              <FieldRow label="Power Availability" value={item.powerAvailability} onSave={(v) => handleFieldSave('powerAvailability', v)} />
              <FieldRow label="Investment" value={item.investment} onSave={(v) => handleFieldSave('investment', v)} />
              <FieldRow label="Available Parking" value={item.availableParking} onSave={(v) => handleFieldSave('availableParking', v)} />
              <FieldRow label="Land Owner Contact" value={item.landOwnerContact} onSave={(v) => handleFieldSave('landOwnerContact', v)} />
              <FieldRow label="Notes" value={item.notes} onSave={(v) => handleFieldSave('notes', v)} multiline />
            </View>
          )}

          {tab === 'updates' && (
            <View className="py-3 gap-3">
              <View className="flex-row gap-2">
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Write a comment..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50"
                />
                <Button
                  title="Post"
                  onPress={handlePostComment}
                  loading={postingComment}
                  disabled={!newComment.trim()}
                  className="self-end"
                />
              </View>
              {loadingUpdates ? (
                <Text className="text-center text-gray-400 py-4">Loading...</Text>
              ) : updates.length === 0 ? (
                <View className="items-center py-8 gap-2">
                  <MessageSquare size={32} color="#d1d5db" />
                  <Text className="text-gray-400 text-sm">No updates yet</Text>
                </View>
              ) : (
                updates.map((u) => (
                  <View key={u.id} className="bg-gray-50 rounded-xl p-3">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">{u.author}</Text>
                    <Text className="text-sm text-gray-800">{u.content}</Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {new Date(u.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'activity' && (
            <View className="py-3 gap-2">
              {loadingUpdates ? (
                <Text className="text-center text-gray-400 py-4">Loading...</Text>
              ) : activities.length === 0 ? (
                <View className="items-center py-8 gap-2">
                  <Activity size={32} color="#d1d5db" />
                  <Text className="text-gray-400 text-sm">No activity yet</Text>
                </View>
              ) : (
                activities.map((a) => (
                  <View key={a.id} className="flex-row gap-2 py-2 border-b border-gray-100">
                    <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                    <View className="flex-1">
                      <Text className="text-xs text-gray-700">
                        <Text className="font-semibold">{a.author}</Text>
                        {' changed '}
                        <Text className="font-medium">{a.field}</Text>
                        {a.oldValue ? ` from "${a.oldValue}"` : ''}
                        {a.newValue ? ` to "${a.newValue}"` : ''}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
