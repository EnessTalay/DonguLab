import { useState } from 'react';
import { router } from 'expo-router';
import { Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { Screen, styles } from '@/components/screen';
import { AppError, services } from '@/services';
import { demoAccounts } from '@/services/mock';
import { useSession } from '@/services/session';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { refresh } = useSession();
  async function login(loginEmail = email, loginPassword = password) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await services.signIn(loginEmail, loginPassword); await refresh(); router.replace('/'); }
    catch (e) { setMessage(e instanceof AppError ? e.message : 'Giriş tamamlanamadı.'); }
    finally { setBusy(false); }
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="DöngüLab’a giriş">
        <Text style={styles.note}>{services.mode === 'demo' ? 'Yerel demo: örnek hesaplar, bellekte veri. Yeniden yükleme verileri siler; diğer cihazlarla paylaşılmaz.' : 'Supabase: gerçek hesapla giriş. Rolünüz sunucudaki profilinizden alınır.'}</Text>
        <TextInput accessibilityLabel="E-posta" placeholder="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={local.input} />
        <TextInput accessibilityLabel="Parola" placeholder="Parola" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" style={local.input} />
        <Button title={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} disabled={busy || !email.trim() || !password} onPress={() => void login()} color="#16493e" />
        {services.mode === 'demo' && demoAccounts.map(account => (
          <Button key={account.email} title={`${account.profile.displayName} ile dene`} disabled={busy}
            onPress={() => void login(account.email, account.password)} color="#476957" />
        ))}
        {!!message && <Text accessibilityRole="alert" style={styles.note}>{message}</Text>}
      </Screen>
    </KeyboardAvoidingView>
  );
}
const local = StyleSheet.create({ input: { backgroundColor: 'white', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#a8bdae', fontSize: 16 } });
