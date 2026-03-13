import type { ExpoConfig } from 'expo/config';

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? process.env.EAS_PROJECT_ID;

export default (): ExpoConfig => ({
  name: 'Patrol Zones Melbourne',
  slug: 'patrol-zones-melbourne',
  scheme: 'patrolzones',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'au.melbourne.patrolzones',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Location is required to detect patrol zones and infer street position.'
    }
  },
  android: {
    package: 'au.melbourne.patrolzones',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']
  },
  plugins: ['expo-router'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
    eas: {
      projectId: easProjectId
    }
  }
});
