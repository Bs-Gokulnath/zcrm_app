import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Mail, Shield, User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);

  function handleLogout() {
    if (Platform.OS === 'web') {
      setConfirming(true);
    } else {
      const { Alert } = require('react-native');
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
      {confirming && (
        <Modal transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
          <Pressable
            className="flex-1 bg-black/40 items-center justify-center px-8"
            onPress={() => setConfirming(false)}
          >
            <Pressable className="bg-white rounded-2xl w-full p-6" onPress={() => {}}>
              <Text className="text-lg font-bold text-gray-900 mb-1">Sign Out</Text>
              <Text className="text-sm text-gray-500 mb-5">Are you sure you want to sign out?</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setConfirming(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center"
                >
                  <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setConfirming(false); logout(); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 items-center"
                >
                  <Text className="text-sm font-semibold text-white">Sign Out</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Avatar */}
        <View className="items-center py-6 bg-white rounded-2xl border border-gray-100 mb-4">
          <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">{initials}</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
          <View
            className={`mt-1.5 px-3 py-0.5 rounded-full ${
              user?.role === 'ADMIN' ? 'bg-purple-100' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                user?.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              {user?.role}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <View className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
            Account
          </Text>
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
