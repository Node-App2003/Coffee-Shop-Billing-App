import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useStore } from '../store.js';
import { shareBackup, daysSinceBackup } from '../backup.js';

const LIMIT_DAYS = 3;

// Reminder on every admin page when the last backup is older than 3 days (or never taken).
export default function BackupBanner() {
  const { bills, lastBackupAt } = useStore(); // lastBackupAt re-renders this when a backup is taken
  const [busy, setBusy] = useState(false);
  const days = daysSinceBackup();
  if (!bills.length || days < LIMIT_DAYS) return null;

  const go = async () => {
    setBusy(true);
    try { await shareBackup(); } catch (e) { window.alert(e?.message || 'Backup aagala'); }
    setBusy(false);
  };

  return (
    <div className="banner" data-last={lastBackupAt || ''}>
      <span>
        <ShieldAlert size={16} style={{ verticalAlign: -3 }} />{' '}
        {lastBackupAt ? `Last backup ${days} naal munnadi.` : 'Innum backup edukkala.'} Phone maarina / app uninstall panna data pogum.
      </span>
      <button className="btn primary sm" disabled={busy} onClick={go}>Backup now</button>
    </div>
  );
}
