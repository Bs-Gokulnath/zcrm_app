import React from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, Mail, Shield, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign Out\n\nAre you sure you want to sign out?')) logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-3 pb-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/dashboard')} className="mr-3">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Avatar */}
        <View className="items-center py-6 bg-white rounded-2xl border border-gray-100 mb-4">
          <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">{initials}</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
          <View className={`mt-1.5 px-3 py-0.5 rounded-full ${user?.role === 'ADMIN' ? 'bg-purple-100' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-semibold ${user?.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-600'}`}>
              {user?.role}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <View className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Account</Text>
          <View className="flex-row items-center px-4 py-3.5 border-b border-gray-50">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
              <User size={15} color="#2563eb" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-gray-400">Name</Text>
              <Text className="text-sm font-medium text-gray-900">{user?.name}</Text>
            </View>
          </View>
          <View className="flex-row items-center px-4 py-3.5 border-b border-gray-50">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
              <Mail size={15} color="#2563eb" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-gray-400">Email</Text>
              <Text className="text-sm font-medium text-gray-900">{user?.email}</Text>
            </View>
          </View>
          <View className="flex-row items-center px-4 py-3.5">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
              <Shield size={15} color="#2563eb" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-gray-400">Role</Text>
              <Text className="text-sm font-medium text-gray-900">{user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5"
        >
          <LogOut size={16} color="#ef4444" />
          <Text className="text-sm font-semibold text-red-600">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
