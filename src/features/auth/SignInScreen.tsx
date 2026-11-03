import { colors } from '@/theme/tokens';
import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ActionButton as Button } from '@/components/ui';
import { Screen, styles } from '@/components/screen';
import { AppError, services } from '@/services';
import { demoAccounts } from '@/fixtures/demo';
import { useSession } from '@/services/session';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [registering, setRegistering] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { refresh } = useSession();
  async function login(loginEmail = email, loginPassword = password) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await services.signIn(loginEmail, loginPassword);
      await refresh();
      router.replace('/');
    } catch (e) {
      setMessage(e instanceof AppError ? e.message : 'Giriş tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }
  async function register() {
    if (busy || confirmationSent) return;
    if (password !== confirmation) {
      setMessage('Parolalar eşleşmiyor.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await services.signUp(email, password);
      setPassword('');
      setConfirmation('');
      if (result.confirmationRequired) {
        setConfirmationSent(true);
        setMessage(
          'Onay gerekiyorsa e-posta adresinize bağlantı gönderildi. E-postanızı onayladıktan sonra giriş yapın. Daha önce kayıt olduysanız mevcut hesabınızla giriş yapabilirsiniz.',
        );
      } else {
        await refresh();
        router.replace('/');
      }
    } catch (e) {
      setMessage(e instanceof AppError ? e.message : 'Kayıt tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={registering ? 'DöngüLab’a katıl' : 'DöngüLab’a giriş'}>
      {services.mode === 'demo' && (
        <Text style={styles.note}>
          Yerel demo: veriler yeniden yüklemede silinir.
        </Text>
      )}
      {registering && (
        <Text style={styles.body}>
          Öğrenci hesabını oluştur ve projen için malzeme bul. İşletme hesapları
          ekibimizin onayından sonra açılır; kayıt olmak işletme yetkisi vermez.
        </Text>
      )}
      <TextInput
        editable={!busy && !confirmationSent}
        accessibilityLabel="E-posta"
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        style={local.input}
      />
      {!confirmationSent && (
        <TextInput
          editable={!busy}
          accessibilityLabel="Parola"
          placeholder={registering ? 'Parola (en az 8 karakter)' : 'Parola'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={registering ? 'new-password' : 'current-password'}
          style={local.input}
        />
      )}
      {registering && !confirmationSent && (
        <TextInput
          editable={!busy}
          accessibilityLabel="Parola tekrarı"
          placeholder="Parola tekrarı"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          style={local.input}
        />
      )}
      {!confirmationSent && (
        <Button
          title={
            busy
              ? 'Lütfen bekleyin…'
              : registering
                ? 'Öğrenci hesabı oluştur'
                : 'Giriş yap'
          }
          disabled={
            busy ||
            !email.trim() ||
            !password ||
            (registering && (password.length < 8 || !confirmation))
          }
          onPress={() => void (registering ? register() : login())}
          color={colors.heading}
        />
      )}
      {services.mode === 'supabase' && (
        <Button
          title={
            registering
              ? 'Hesabım var, giriş yap'
              : 'Yeni öğrenci hesabı oluştur'
          }
          disabled={busy}
          onPress={() => {
            setRegistering(!registering);
            setConfirmationSent(false);
            setMessage('');
            setPassword('');
            setConfirmation('');
          }}
          color={colors.brand}
        />
      )}
      {services.mode === 'demo' &&
        demoAccounts.map((account) => (
          <Button
            key={account.email}
            title={`${account.profile.displayName} ile dene`}
            disabled={busy}
            onPress={() => void login(account.email, account.password)}
            color={colors.brand}
          />
        ))}
      {!!message && (
        <Text accessibilityRole="alert" style={styles.note}>
          {message}
        </Text>
      )}
    </Screen>
  );
}
const local = StyleSheet.create({
  input: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 16,
  },
});
