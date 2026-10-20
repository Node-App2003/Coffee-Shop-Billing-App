import { actions, getState } from './store.js';
import { saveText, dmy } from './utils.js';

// Exports the backup file. On the phone this opens the share sheet (WhatsApp / Google Drive / Gmail ...).
// The "last backup" time is saved only after the share sheet closed without an error.
export async function shareBackup() {
  await saveText(`cafe-backup-${dmy()}.json`, actions.exportBackup(), 'application/json');
  actions.markBackup();
}

// whole days since the last backup (Infinity if never)
export function daysSinceBackup() {
  const t = getState().lastBackupAt;
  if (!t) return Infinity;
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000);
}
