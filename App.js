// =========================
// APP.JS — точка входа
// Навигация с нижним меню
// =========================
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import GradesScreen from './src/screens/GradesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('subjects');
  const [selectedSubject, setSelectedSubject] = useState(null);

  function handleLoginSuccess() {
    setScreen('main');
  }

  function handleSelectSubject(subject) {
    setSelectedSubject(subject);
    setScreen('grades');
  }

  function handleLogout() {
    setSelectedSubject(null);
    setScreen('login');
  }

  function handleBack() {
    setScreen('main');
    setSelectedSubject(null);
  }

  if (screen === 'login') {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  if (screen === 'grades' && selectedSubject) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
        <GradesScreen subject={selectedSubject} onBack={handleBack} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
      <View style={styles.container}>
        {/* Контент */}
        <View style={styles.content}>
          {activeTab === 'subjects' && (
            <SubjectsScreen
              onSelectSubject={handleSelectSubject}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'schedule' && <ScheduleScreen />}
        </View>

        {/* Нижнее меню */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('subjects')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{activeTab === 'subjects' ? '📚' : '📖'}</Text>
            <Text style={[styles.tabLabel, activeTab === 'subjects' && styles.tabLabelActive]}>
              Оценки
            </Text>
            {activeTab === 'subjects' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{activeTab === 'schedule' ? '🗓️' : '📅'}</Text>
            <Text style={[styles.tabLabel, activeTab === 'schedule' && styles.tabLabelActive]}>
              Расписание
            </Text>
            {activeTab === 'schedule' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#132233',
    borderTopWidth: 1,
    borderTopColor: '#1e3a4f',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: {
    color: '#8a9bb0',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: { color: '#4fc3f7' },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    backgroundColor: '#4fc3f7',
    borderRadius: 2,
  },
});
