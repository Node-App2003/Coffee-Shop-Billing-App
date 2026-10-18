import { Capacitor } from '@capacitor/core';

// Fingerprint / face unlock - only inside the installed Android app.
// The plugin is loaded on demand so the normal browser build never touches it.
async function plugin() {
  const m = await import('@aparajita/capacitor-biometric-auth');
  return m.BiometricAuth;
}

export async function biometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const info = await (await plugin()).checkBiometry();
    return !!info.isAvailable;
  } catch {
    return false;
  }
}

// true = the phone confirmed the fingerprint, false = failed / cancelled
export async function biometricPrompt(reason = 'Confirm your fingerprint') {
  try {
    await (await plugin()).authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: false,
      androidTitle: 'Admin login',
      androidSubtitle: reason,
    });
    return true;
  } catch {
    return false;
  }
}
