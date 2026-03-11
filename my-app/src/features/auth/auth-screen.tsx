import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';

type Mode = 'login' | 'register';
export function AuthScreen({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text>{mode === 'login' ? 'Login' : 'Register'}</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="email" style={{ borderWidth: 1, padding: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="password" secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      <Button title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={() => {}} />
    </View>
  );
}
