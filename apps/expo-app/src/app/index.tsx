import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

type State = 'loading' | 'onboarding' | 'auth';

export default function Index() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    AsyncStorage.getItem('onboarded').then((val) => {
      setState(val ? 'auth' : 'onboarding');
    });
  }, []);

  if (state === 'loading') {
    // Invisible — splash overlay is covering the screen
    return <View style={{ flex: 1, backgroundColor: '#ff5e3a' }} />;
  }

  if (state === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(auth)/login" />;
}
