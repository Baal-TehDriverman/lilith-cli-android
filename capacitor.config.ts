import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.baal-tehdriverman.lilith-cli',
  appName: 'Lilith CLI',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*'],
  },
  plugins: {
    Bluetooth: {
      /* Bluetooth LE config */
    },
  },
};

export default config;