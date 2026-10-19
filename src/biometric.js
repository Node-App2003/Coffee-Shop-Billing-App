import { Capacitor } from '@capacitor/core';

// Fingerprint / face unlock - only inside the installed Android app.
// The plugin is loaded on demand so the normal browser build never touches it.
async function plugin() {
  const m = await import('@aparajita/capacitor-biometric-auth');
  return m.BiometricAuth;
}

// { ok, reason } - reason explains why fingerprint cannot be used (shown in Settings)
export async function biometricStatus() {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'Browser-la fingerprint work aagaadhu. Installed APK-la try pannunga.' };
  }
  try {
    const info = await (await plugin()).checkBiometry();
    if (info.isAvailable) return { ok: true, reason: '' };
    return {
      ok: false,
      reason: `Phone-la fingerprint ready illa (${info.reason || info.code || 'not enrolled'}). Phone Settings → Security → Fingerprint-la viral add pannunga.`,
    };
  } catch (e) {
    return { ok: false, reason: `Fingerprint plugin load aagala: ${e?.message || e}` };
  }
}

export async function biometricAvailable() {
  return (await biometricStatus()).ok;
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
