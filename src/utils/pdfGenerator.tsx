import { pdf } from '@react-pdf/renderer';
import { TimeReportPDF, PDFLabels } from '../components/reports/TimeReportPDF';

interface TimeEntry {
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
}

export async function downloadTimeReportPDF(
  employeeName: string,
  companyName: string,
  entries: TimeEntry[],
  startDate: string,
  endDate: string,
  labels?: PDFLabels
): Promise<void> {
  const doc = <TimeReportPDF
    employeeName={employeeName}
    companyName={companyName}
    entries={entries}
    startDate={startDate}
    endDate={endDate}
    labels={labels}
  />;

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${employeeName.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
