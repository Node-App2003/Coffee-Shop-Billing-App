import { Download, FileText } from 'lucide-react';

// The same CSV + PDF pair on every admin page.
export default function ExportButtons({ onCsv, onPdf, disabled }) {
  return (
    <div className="row">
      <button className="btn sm" disabled={disabled} onClick={onCsv}>
        <Download size={14} /> CSV
      </button>
      <button className="btn sm" disabled={disabled} onClick={onPdf}>
        <FileText size={14} /> PDF
      </button>
    </div>
  );
}
