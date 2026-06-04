import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

const variants = {
  primary: 'bg-blue-600 active:bg-blue-700',
  secondary: 'bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-500 active:bg-red-600',
  ghost: 'bg-transparent',
};

const textVariants = {
  primary: 'text-white font-semibold',
  secondary: 'text-gray-800 font-semibold',
  danger: 'text-white font-semibold',
  ghost: 'text-blue-600 font-semibold',
};

export function Button({ title, variant = 'primary', loading, disabled, className, ...props }: ButtonProps) {
  return (
    <TouchableOpacity
      className={`rounded-xl px-4 py-3 items-center justify-center flex-row gap-2 ${variants[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#2563eb'} />}
      <Text className={`text-base ${textVariants[variant]}`}>{title}</Text>
    </TouchableOpacity>
  );
}
