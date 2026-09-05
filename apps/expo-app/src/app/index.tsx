import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

type State = 'loading' | 'onboarding' | 'auth' | 'app';

export default function Index() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('onboarded'),
      AsyncStorage.getItem('auth_token'),
    ]).then(([onboarded, token]) => {
      if (token) setState('app');
      else if (onboarded) setState('auth');
      else setState('onboarding');
    });
  }, []);

  if (state === 'loading') return <View style={{ flex: 1, backgroundColor: '#ff5e3a' }} />;
  if (state === 'app') return <Redirect href="/(app)/dashboard" />;
  if (state === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
