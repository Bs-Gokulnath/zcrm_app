import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Mail, Shield } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';

type Step = 'email' | 'otp';

export default function SignInScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(email.trim().toLowerCase());
      setStep('otp');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOtp(email.trim().toLowerCase(), otp.trim());
      await login(res.data.user, res.data.accessToken);
      router.replace('/(app)');
    } catch (e: unknown) {
      Alert.alert('Invalid OTP', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">Z</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">ZCRM</Text>
            <Text className="text-sm text-gray-500 mt-1">Sign in to your workspace</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {step === 'email' ? (
              <>
                <View className="bg-blue-50 rounded-2xl p-4 flex-row items-center gap-3 mb-2">
                  <Mail size={20} color="#2563eb" />
                  <Text className="text-sm text-blue-700 flex-1">
                    We'll send a one-time code to your email.
                  </Text>
                </View>
                <Input
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
                <Button title="Send OTP" onPress={handleSendOtp} loading={loading} />
              </>
            ) : (
              <>
                <View className="bg-green-50 rounded-2xl p-4 flex-row items-center gap-3 mb-2">
                  <Shield size={20} color="#16a34a" />
                  <Text className="text-sm text-green-700 flex-1">
                    OTP sent to{' '}
                    <Text className="font-semibold">{email}</Text>
                  </Text>
                </View>
                <Input
                  label="One-Time Password"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />
                <Button title="Verify & Sign In" onPress={handleVerifyOtp} loading={loading} />
                <TouchableOpacity onPress={() => { setStep('email'); setOtp(''); }}>
                  <Text className="text-center text-sm text-gray-500">
                    Use a different email
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-sm text-gray-500">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-sm text-blue-600 font-semibold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
