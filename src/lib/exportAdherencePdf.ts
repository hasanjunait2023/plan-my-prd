import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AdherenceExportData {
  history: Array<{
    date: string;
    adherence_score: number;
    followed_count: number;
    violated_count: number;
    total_rules: number;
    trades_count: number;
    mood: string;
    general_note: string;
  }>;
  ruleBreakdown: Array<{
    text: string;
    category: string;
    violations: number;
    adherencePct: number;
  }>;
  patterns: string[];
  stats: {
    last7Avg: number;
    last30Avg: number;
    perfectStreak: number;
    totalLogs: number;
  };
  rangeLabel?: string;
}

export function exportAdherencePdf(data: AdherenceExportData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(0, 201, 167);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 30);
  doc.text('Trading Rules — Adherence Report', margin, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 110);
  const generated = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Generated ${generated}`, margin, y + 42);
  if (data.rangeLabel) {
    doc.setTextColor(60, 60, 70);
    doc.text(`Range: ${data.rangeLabel}`, margin, y + 56);
    y += 14;
  }
  y += 70;

  // Stats overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text('Overview', margin, y);
  y += 14;

  const statBoxes = [
    { label: 'Perfect streak', value: `${data.stats.perfectStreak} days` },
    { label: '7-day avg', value: `${data.stats.last7Avg}%` },
    { label: '30-day avg', value: `${data.stats.last30Avg}%` },
    { label: 'Total logs', value: String(data.stats.totalLogs) },
  ];
  const boxW = (pageWidth - margin * 2 - 18) / 4;
  statBoxes.forEach((s, i) => {
    const x = margin + i * (boxW + 6);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y, boxW, 50, 4, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 130);
    doc.text(s.label.toUpperCase(), x + 8, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 150, 130);
    doc.text(s.value, x + 8, y + 36);
    doc.setFont('helvetica', 'normal');
  });
  y += 70;

  // Daily history table (last 14 days)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text('Daily History (last 14 days)', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Score', 'Followed', 'Broken', 'Trades', 'Mood']],
    body: data.history.slice(0, 14).map(h => [
      h.date,
      `${Math.round(Number(h.adherence_score))}%`,
      String(h.followed_count),
      String(h.violated_count),
      String(h.trades_count),
      h.mood || '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 201, 167], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable injected by autoTable
  y = doc.lastAutoTable.finalY + 24;

  // Per-rule breakdown
  if (y > 700) { doc.addPage(); y = margin; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text('Per-Rule Adherence', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    head: [['Rule', 'Category', 'Violations', 'Adherence']],
    body: data.ruleBreakdown.slice(0, 25).map(r => [
      r.text.length > 80 ? r.text.slice(0, 77) + '…' : r.text,
      r.category,
      String(r.violations),
      `${r.adherencePct}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 280 },
      1: { cellWidth: 70 },
      2: { cellWidth: 60, halign: 'center' },
      3: { cellWidth: 70, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable injected by autoTable
  y = doc.lastAutoTable.finalY + 24;

  // Patterns
  if (data.patterns.length > 0) {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 30);
    doc.text('Pattern Insights', margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 70);
    data.patterns.forEach(p => {
      const lines = doc.splitTextToSize(`• ${p}`, pageWidth - margin * 2);
      if (y + lines.length * 12 > 780) { doc.addPage(); y = margin; }
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(
      `TradeVault Pro  •  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' },
    );
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`adherence-report-${fileDate}.pdf`);
}
