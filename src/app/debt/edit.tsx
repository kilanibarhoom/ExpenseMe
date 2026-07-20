import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/form';
import { NativeButton } from '@/components/NativeButton';
import { updateDebt, useDebt } from '@/features/debts/queries';
import { spacing, useNativeSheetColors } from '@/lib/theme';

/** Native Liquid Glass pull-up sheet for editing a debt's person name / note. */
export default function DebtEditScreen() {
  const { debtId } = useLocalSearchParams<{ debtId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useNativeSheetColors();
  const insets = useSafeAreaInsets();
  const { debt } = useDebt(debtId);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');

  const prefilled = useRef(false);
  useEffect(() => {
    if (debt && !prefilled.current) {
      prefilled.current = true;
      setEditName(debt.personName);
      setEditNote(debt.note ?? '');
    }
  }, [debt]);

  if (!debt) return null;

  const save = async () => {
    if (editName.trim() === '') return;
    await updateDebt(debt.id, { personName: editName, note: editNote });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t('debts.editTitle')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>
        <TextField label={t('debts.personName')} value={editName} onChangeText={setEditName} autoFocus />
        <TextField
          label={`${t('common.note')} (${t('common.optional')})`}
          value={editNote}
          onChangeText={setEditNote}
        />
        <NativeButton title={t('common.save')} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  title: { fontSize: 20, fontWeight: '800', flex: 1 },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.24)',
  },
});
