import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c21dee520e7f40aa980f0561830f9121',
  appName: 'fxjunait',
  webDir: 'dist',
  server: {
    url: 'https://c21dee52-0e7f-40aa-980f-0561830f9121.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
