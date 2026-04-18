import { registerPlugin, Capacitor } from '@capacitor/core';

export interface FloatingBubblePlugin {
  /** Check if "Display over other apps" permission is granted */
  hasOverlayPermission(): Promise<{ granted: boolean }>;
  /** Open Android settings page so user can grant overlay permission */
  requestOverlayPermission(): Promise<void>;
  /** Show the system-wide floating bubble */
  showBubble(options?: { route?: string }): Promise<void>;
  /** Hide / remove the floating bubble */
  hideBubble(): Promise<void>;
  /** Whether bubble is currently visible */
  isBubbleVisible(): Promise<{ visible: boolean }>;
}

// Registered native plugin (Android only). On web, calls become no-ops.
export const FloatingBubble = registerPlugin<FloatingBubblePlugin>('FloatingBubble', {
  web: {
    hasOverlayPermission: async () => ({ granted: false }),
    requestOverlayPermission: async () => {
      console.warn('[FloatingBubble] Overlay permission only available on Android native build');
    },
    showBubble: async () => {
      console.warn('[FloatingBubble] showBubble is a no-op on web');
    },
    hideBubble: async () => {
      console.warn('[FloatingBubble] hideBubble is a no-op on web');
    },
    isBubbleVisible: async () => ({ visible: false }),
  },
});

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
