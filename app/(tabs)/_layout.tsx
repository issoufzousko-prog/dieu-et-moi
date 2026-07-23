import React from 'react';
import { Tabs } from 'expo-router';
import { Image } from 'expo-image';
import FluentIcon from '@/components/fluent-icons/FluentIcon';
import { Colors } from '@/constants/Colors';
import { Platform } from 'react-native';

const ministereIcon = require('@/assets/images/ministere-icon.svg');

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.grayWarm,
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 10,
          marginBottom: Platform.OS === 'ios' ? 0 : 6,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(243, 232, 210, 0.5)',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sanctuaire',
          tabBarIcon: ({ color, focused }) => (
            <FluentIcon
              name={focused ? 'homeFilled' : 'home'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="academie"
        options={{
          title: 'Académie',
          tabBarIcon: ({ color, focused }) => (
            <FluentIcon
              name={focused ? 'bookOpenFilled' : 'bookOpen'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="atlas"
        options={{
          title: 'Atlas',
          tabBarIcon: ({ color, focused }) => (
            <FluentIcon
              name={focused ? 'mapFilled' : 'map'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ministere"
        options={{
          title: 'Ministère',
          tabBarIcon: ({ color }) => (
            <Image
              source={ministereIcon}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
              tintColor={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
