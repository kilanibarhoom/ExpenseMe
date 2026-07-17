import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DbProvider } from '@/db/DbProvider';
import { useFxAutoRefresh } from '@/features/fx/refresh';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } },
});

function FxAutoRefresh() {
  useFxAutoRefresh();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
