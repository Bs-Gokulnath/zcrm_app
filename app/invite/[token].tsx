import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { api } from '../../lib/api';

interface InviteDetails {
  boardName: string;
  inviterName?: string;
  role: string;
  expiresAt: string;
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: InviteDetails }>(`/board-invites/${token}`);
        setInvite((res as any).data ?? res);
      } catch (e: any) {
        setError(e.message ?? 'Invalid or expired invite link.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      await api.post(`/board-invites/${token}/accept`, {});
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Could not accept invite.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-sm text-gray-500 mt-3">Loading invite…</Text>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <CheckCircle size={56} color="#16a34a" />
        <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
          You're in!
        </Text>
        <Text className="text-sm text-gray-500 mt-2 text-center">
          You have joined the board as <Text className="font-semibold">{invite?.role}</Text>.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/dashboard')}
          className="mt-8 bg-blue-600 px-8 py-3.5 rounded-2xl"
        >
          <Text className="text-white font-semibold text-sm">Go to Boards</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (error || !invite) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <XCircle size={56} color="#ef4444" />
        <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
          Invalid Invite
        </Text>
        <Text className="text-sm text-gray-500 mt-2 text-center">
          {error ?? 'This invite link is invalid or has expired.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/dashboard')}
          className="mt-8 bg-gray-100 px-8 py-3.5 rounded-2xl"
        >
          <Text className="text-gray-700 font-semibold text-sm">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const expired = new Date(invite.expiresAt) < new Date();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-6 justify-center">
      <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <View className="w-14 h-14 bg-blue-100 rounded-2xl items-center justify-center mb-4">
          <Text className="text-2xl">📋</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-1">Board Invitation</Text>
        {invite.inviterName && (
          <Text className="text-sm text-gray-500 mb-4">
            Invited by <Text className="font-semibold text-gray-700">{invite.inviterName}</Text>
          </Text>
        )}

        <View className="bg-gray-50 rounded-2xl p-4 mb-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-400">Board</Text>
            <Text className="text-xs font-semibold text-gray-800">{invite.boardName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-400">Your role</Text>
            <Text className="text-xs font-semibold text-blue-600">{invite.role}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-400">Expires</Text>
            <Text className={`text-xs font-semibold ${expired ? 'text-red-500' : 'text-gray-600'}`}>
              {expired ? 'Expired' : new Date(invite.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {expired ? (
          <View className="bg-red-50 rounded-2xl py-3 items-center">
            <Text className="text-sm text-red-500 font-medium">This invite has expired</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleAccept}
            disabled={accepting}
            className="bg-blue-600 rounded-2xl py-3.5 items-center"
          >
            {accepting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Accept Invitation</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} className="mt-3 py-2 items-center">
          <Text className="text-sm text-gray-400">Decline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
