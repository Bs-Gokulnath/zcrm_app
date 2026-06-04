import React from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Briefcase, Building2, LayoutGrid, Users } from 'lucide-react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { boardsApi, type Board } from '../../services/boards';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 items-center">
      <Text style={{ color }} className="text-2xl font-bold">{value}</Text>
      <Text className="text-xs text-gray-500 text-center mt-0.5">{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.getAll(),
  });

  const boards: Board[] = Array.isArray(data)
    ? data
    : (data as { data?: Board[] })?.data ?? [];

  const total = boards.length;
  const owned = boards.filter((b) => b.userRole === 'OWNER').length;
  const shared = boards.filter((b) => b.userRole !== 'OWNER').length;
  const recent = [...boards]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader />

      {isLoading ? (
        <LoadingSpinner message="Loading..." />
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(b) => b.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View>
              {/* Greeting */}
              <View className="mb-5">
                <Text className="text-2xl font-bold text-gray-900">
                  {greeting},{' '}
                  <Text className="text-blue-600">{user?.name?.split(' ')[0]}</Text> 👋
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">Here's what's happening today.</Text>
              </View>

              {/* Stats */}
              <View className="flex-row gap-3 mb-5">
                <StatCard label="Total Boards" value={total} color="#2563eb" />
                <StatCard label="Owned by You" value={owned} color="#16a34a" />
                <StatCard label="Shared" value={shared} color="#d97706" />
              </View>

              {/* Quick Actions */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  onPress={() => router.push('/(app)')}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-blue-600 rounded-2xl py-3"
                >
                  <LayoutGrid size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-white">All Boards</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/my-work')}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3"
                >
                  <Briefcase size={16} color="#374151" />
                  <Text className="text-sm font-semibold text-gray-700">My Work</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/workspaces')}
                  className="flex-row items-center justify-center gap-1 bg-white border border-gray-200 rounded-2xl px-3 py-3"
                >
                  <Building2 size={16} color="#374151" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-700 mb-3">Recent Boards</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/board/${item.id}`)}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {item.type === 'MULTI_LEVEL' ? 'Multi-level' : 'Standard'} · {item.userRole}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Users size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-400">{item._count?.members ?? 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-gray-400 text-sm">No boards yet. Create your first board.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
