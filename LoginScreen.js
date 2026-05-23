import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { login, saveUsername, loadUsername, pingServer } from '../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    loadUsername().then((saved) => { if (saved) setUsername(saved); });
    checkServer();
  }, []);

  async function checkServer() {
    const alive = await pingServer();
    setServerStatus(alive ? 'ok' : 'waking');
    if (!alive) {
      Animated.timing(pingAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setTimeout(async () => {
        const retry = await pingServer();
        if (retry) {
          setServerStatus('ok');
          Animated.timing(pingAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
      }, 15000);
    }
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Заполните поля', 'Введите логин и пароль');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        await saveUsername(username.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLoginSuccess();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Не удалось войти', result.error || 'Неверный логин или пароль');
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Ошибка', e.message || 'Нет соединения с сервером');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bgAccent1} />
      <View style={styles.bgAccent2} />

      <Animated.View style={[styles.pingBanner, { opacity: pingAnim }]}>
        <Text style={styles.pingDot}>●</Text>
        <Text style={styles.pingText}>Сервер просыпается, это займёт ~20 сек...</Text>
      </Animated.View>

      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>У</Text>
          </View>
          <Text style={styles.title}>УУСТР</Text>
          <Text style={styles.subtitle}>Электронный журнал</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.inputWrap, focusedField === 'login' && styles.inputWrapFocused]}>
            <Text style={styles.inputLabel}>Логин</Text>
            <TextInput
              style={styles.input}
              placeholder="example@uust.ru"
              placeholderTextColor="#3d5a72"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              onFocus={() => setFocusedField('login')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={[styles.inputWrap, focusedField === 'pass' && styles.inputWrapFocused]}>
            <Text style={styles.inputLabel}>Пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#3d5a72"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              onSubmitEditing={handleLogin}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Войти →</Text>}
          </TouchableOpacity>
        </View>

        {serverStatus === 'ok' && (
          <View style={styles.statusOk}>
            <Text style={styles.statusDot}>●</Text>
            <Text style={styles.statusText}>Сервер работает</Text>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f17', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  bgAccent1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#0d3d6e', opacity: 0.25, top: -60, right: -80 },
  bgAccent2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#0a2a4a', opacity: 0.4, bottom: 80, left: -60 },
  pingBanner: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: '#2a1a00', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#5a3a00', gap: 8,
  },
  pingDot: { color: '#fb8c00', fontSize: 10 },
  pingText: { color: '#ffb74d', fontSize: 12, flex: 1 },
  inner: { width: '100%', maxWidth: 380, alignItems: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0d3d6e', borderWidth: 2, borderColor: '#1a6fbb', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoLetter: { fontSize: 26, fontWeight: '900', color: '#4fc3f7' },
  title: { fontSize: 30, fontWeight: '900', color: '#e8f4fd', letterSpacing: 6 },
  subtitle: { fontSize: 13, color: '#4a7fa0', letterSpacing: 2, marginTop: 6, textTransform: 'uppercase' },
  card: { width: '100%', backgroundColor: '#0d1e30', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#142840', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
  inputWrap: { backgroundColor: '#080f17', borderRadius: 12, borderWidth: 1, borderColor: '#142840', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginBottom: 12 },
  inputWrapFocused: { borderColor: '#1a6fbb' },
  inputLabel: { fontSize: 11, color: '#4a7fa0', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  input: { fontSize: 15, color: '#e8f4fd', padding: 0 },
  button: { backgroundColor: '#1565c0', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#1565c0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  statusOk: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  statusDot: { color: '#43a047', fontSize: 10 },
  statusText: { color: '#2a5a3a', fontSize: 12 },
});
