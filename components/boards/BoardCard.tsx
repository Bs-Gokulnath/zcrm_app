import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LayoutGrid, Lock, Users } from 'lucide-react-native';
import type { Board } from '../../services/boards';

interface BoardCardProps {
  board: Board;
  onPress: () => void;
}

const roleColors: Record<string, string> = {
  OWNER: 'text-blue-600',
  ADMIN: 'text-purple-600',
  EDITOR: 'text-green-600',
  VIEWER: 'text-gray-500',
};

export function BoardCard({ board, onPress }: BoardCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 active:opacity-80"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
            <LayoutGrid size={18} color="#2563eb" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {board.name}
            </Text>
            {board.description ? (
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                {board.description}
              </Text>
            ) : null}
          </View>
        </View>
        {board.isPrivate && <Lock size={14} color="#94a3b8" />}
      </View>

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-1">
          <Users size={12} color="#94a3b8" />
          <Text className="text-xs text-gray-400">
            {board._count?.members ?? 0} member{board._count?.members !== 1 ? 's' : ''}
          </Text>
        </View>
        {board.userRole && (
          <Text className={`text-xs font-medium ${roleColors[board.userRole] ?? 'text-gray-500'}`}>
            {board.userRole}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
