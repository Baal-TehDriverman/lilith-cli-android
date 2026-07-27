import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const root = createRoot(document.getElementById('root')!);

if (Capacitor.isNativePlatform()) {
  // Native platform - hide splash screen and configure status bar
  SplashScreen.hide().catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0d0d1a' }).catch(() => {});
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);