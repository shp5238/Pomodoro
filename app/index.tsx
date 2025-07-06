import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import alarmFile from '../assets/alarm.wav';

const DEFAULTS = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
};

export default function App() {
  const [mode, setMode] = useState('pomodoro');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULTS.pomodoro * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [durations, setDurations] = useState({
    pomodoro: DEFAULTS.pomodoro,
    short: DEFAULTS.shortBreak,
    long: DEFAULTS.longBreak,
  });
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartPomodoros, setAutoStartPomodoros] = useState(false);
  const [longBreakInterval, setLongBreakInterval] = useState(
    DEFAULTS.longBreakInterval
  );
  const [darkMode, setDarkMode] = useState(true);
  const [alarmVolume, setAlarmVolume] = useState(100);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    }
  }, []);

  useEffect(() => {
    const modeKey =
      mode === 'pomodoro' ? 'pomodoro' : mode === 'short' ? 'short' : 'long';
    setTimeLeft(durations[modeKey] * 60);
    clearInterval(intervalRef.current);
    setIsRunning(false);
  }, [mode, durations]);

  const handleTimerEnd = useCallback(async () => {
    await playAlarm();
    if (mode === 'pomodoro') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      const nextMode = newCount % longBreakInterval === 0 ? 'long' : 'short';
      setMode(nextMode);
      if (autoStartBreaks) setIsRunning(true);
    } else {
      setMode('pomodoro');
      if (autoStartPomodoros) setIsRunning(true);
    }
  }, [
    mode,
    pomodoroCount,
    longBreakInterval,
    autoStartBreaks,
    autoStartPomodoros,
  ]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, handleTimerEnd]);

  const playAlarm = async () => {
    if (Platform.OS === 'web') {
      const audio = document.getElementById('web-audio');
      if (audio) {
        audio.volume = alarmVolume / 100;
        audio.currentTime = 0;
        audio.play().catch((err) => console.log('Playback error:', err));
      }
    } else {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/alarm.wav'),
        { volume: alarmVolume / 100, shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (showSettings) {
    return (
      <ScrollView style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <Text style={styles.sectionTitle}>Timer</Text>
        {['pomodoro', 'short', 'long'].map((key) => (
          <SettingInput
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            value={durations[key]}
            setValue={(v) => setDurations({ ...durations, [key]: v })}
          />
        ))}
        <SettingSwitch
          label="Auto Start Breaks"
          value={autoStartBreaks}
          setValue={setAutoStartBreaks}
        />
        <SettingSwitch
          label="Auto Start Pomodoros"
          value={autoStartPomodoros}
          setValue={setAutoStartPomodoros}
        />
        <SettingInput
          label="Long Break Interval"
          value={longBreakInterval}
          setValue={setLongBreakInterval}
        />
        <Text style={styles.sectionTitle}>Sound</Text>
        <SettingSlider
          label="Alarm Volume"
          value={alarmVolume}
          setValue={setAlarmVolume}
        />
        <Text style={styles.sectionTitle}>Theme</Text>
        <SettingSwitch
          label="Dark Mode When Running"
          value={darkMode}
          setValue={setDarkMode}
        />
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowSettings(false)}>
          <Text style={styles.buttonText}>Back to Timer</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <audio
            id="web-audio"
            src={require('../assets/alarm.wav')}
            preload="auto"
          />
        )}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        darkMode && isRunning ? { backgroundColor: '#000' } : null,
      ]}>
      <View style={styles.modeContainer}>
        {['pomodoro', 'short', 'long'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.modeButton, mode === key && styles.activeMode]}
            onPress={() => setMode(key)}>
            <Text style={styles.modeText}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => setIsRunning(!isRunning)}
          style={styles.controlButton}>
          <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            const modeKey =
              mode === 'pomodoro'
                ? 'pomodoro'
                : mode === 'short'
                ? 'short'
                : 'long';
            setTimeLeft(durations[modeKey] * 60);
          }}
          style={[styles.controlButton, styles.resetButton]}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => setShowSettings(true)}
        style={[styles.controlButton, { marginTop: 30 }]}>
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <audio
          id="web-audio"
          src={require('../assets/alarm.wav')}
          preload="auto"
        />
      )}
    </View>
  );
}

const SettingInput = ({ label, value, setValue }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      keyboardType="numeric"
      value={value.toString()}
      onChangeText={(v) => setValue(Number(v))}
    />
  </View>
);

const SettingSwitch = ({ label, value, setValue }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch value={value} onValueChange={setValue} />
  </View>
);

const SettingSlider = ({ label, value, setValue }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>
      {label} ({value})
    </Text>
    <Slider
      style={{ width: 150 }}
      minimumValue={0}
      maximumValue={100}
      step={1}
      value={value}
      onValueChange={setValue}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f26',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modeContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  modeButton: {
    marginHorizontal: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  activeMode: {
    backgroundColor: '#ff4c4c',
  },
  modeText: {
    color: '#fff',
    fontSize: 16,
  },
  timerText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    backgroundColor: '#ff4c4c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  resetButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  settingsTitle: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ff4c4c',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    color: '#ccc',
    fontSize: 16,
    flex: 1,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 10,
    width: 60,
    borderRadius: 6,
    textAlign: 'center',
  },
});

