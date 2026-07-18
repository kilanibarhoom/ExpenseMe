import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DbProvider } from '@/db/DbProvider';
import { useFxAutoRefresh } from '@/features/fx/refresh';
import { queryClient } from '@/lib/query-client';

function FxAutoRefresh() {
  useFxAutoRefresh();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <DbProvider>
          <FxAutoRefresh />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="quick-add"
              options={{ presentation: 'modal', sheetGrabberVisible: true }}
            />
          </Stack>
        </DbProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
