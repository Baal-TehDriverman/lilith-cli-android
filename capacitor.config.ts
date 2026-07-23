import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.baaltehdriverman.lilithcli',
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