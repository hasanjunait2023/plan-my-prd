import { Trade, TradeOutcome } from '@/types/trade';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

interface ExportOptions {
  format: 'pdf' | 'docx';
  trades: Trade[];
  dateLabel: string;
  outcomeFilters: TradeOutcome[];
  includeScreenshots?: boolean;
}

function calcStats(trades: Trade[]) {
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalPips = trades.reduce((s, t) => s + t.pips, 0);
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : '0';
  const avgRrr = trades.length > 0 ? (trades.reduce((s, t) => s + t.rrr, 0) / trades.length).toFixed(2) : '0';
  return { totalPnl, totalPips, wins, winRate, avgRrr };
}

function outcomeLabel(filters: TradeOutcome[]): string {
  if (filters.length === 3) return 'All trades';
  return filters.map(f => f === 'WIN' ? 'Winning' : f === 'LOSS' ? 'Losing' : 'Breakeven').join(' & ') + ' trades';
}

function getAllScreenshots(trade: Trade): { label: string; url: string }[] {
  const shots: { label: string; url: string }[] = [];
  trade.entryScreenshots.forEach((url, i) => shots.push({ label: `Entry Screenshot ${i + 1}`, url }));
  trade.exitScreenshots.forEach((url, i) => shots.push({ label: `Exit Screenshot ${i + 1}`, url }));
  trade.screenshots.forEach((url, i) => shots.push({ label: `Screenshot ${i + 1}`, url }));
  return shots;
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; format: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: reader.result as string, format });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchImageAsArrayBuffer(url: string): Promise<{ buffer: ArrayBuffer; type: 'png' | 'jpg' } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const type = blob.type.includes('png') ? 'png' as const : 'jpg' as const;
    const buffer = await blob.arrayBuffer();
    return { buffer, type };
  } catch {
    return null;
  }
}

// ─── PDF Export ───

export async function exportToPdf({ trades, dateLabel, outcomeFilters, includeScreenshots }: ExportOptions) {
  const doc = new jsPDF();
  const stats = calcStats(trades);
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(13, 27, 42); // #0D1B2A
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(0, 201, 167); // #00C9A7
  doc.setFontSize(18);
  doc.text('TradeVault Pro', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 220);
  doc.text('Trade Journal Report', 14, 26);
  doc.setFontSize(9);
  doc.text(`${dateLabel}  |  ${outcomeLabel(outcomeFilters)}  |  ${trades.length} trades`, 14, 34);

  // Summary stats
  let y = 50;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.text('Summary', 14, y);
  y += 8;

  const summaryData = [
    ['Total P&L', `$${stats.totalPnl.toFixed(2)}`],
    ['Win Rate', `${stats.winRate}%`],
    ['Total Pips', `${stats.totalPips}`],
    ['Avg RRR', `${stats.avgRrr}`],
    ['Total Trades', `${trades.length}`],
    ['Wins', `${stats.wins}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [13, 27, 42], textColor: [0, 201, 167], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  });

  // Trade summary table
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(12);
  doc.text('Trade Summary', 14, y);
  y += 6;

  const tableBody = trades.map(t => [
    t.date, t.pair, t.direction, t.session, `$${t.pnl.toFixed(2)}`, `${t.pips}`, t.outcome
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Pair', 'Dir', 'Session', 'P&L', 'Pips', 'Outcome']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [13, 27, 42], textColor: [0, 201, 167], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
    bodyStyles: {
      textColor: [30, 30, 30],
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw;
        if (val === 'WIN') data.cell.styles.textColor = [0, 180, 100];
        else if (val === 'LOSS') data.cell.styles.textColor = [220, 50, 50];
        else data.cell.styles.textColor = [180, 160, 40];
      }
    }
  });

  // Individual trade details
  const grouped = groupByDate(trades);
  for (const [date, dateTrades] of Object.entries(grouped)) {
    doc.addPage();
    let cy = 20;
    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(0, 201, 167);
    doc.setFontSize(12);
    doc.text(date, 14, 10);

    for (const trade of dateTrades) {
      if (cy > 240) { doc.addPage(); cy = 20; }
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.text(`${trade.pair} — ${trade.direction} (${trade.outcome})`, 14, cy);
      cy += 6;

      const details = [
        ['Entry', `${trade.entryPrice}`, 'Exit', `${trade.exitPrice}`],
        ['SL', `${trade.stopLoss}`, 'TP', `${trade.takeProfit}`],
        ['Lots', `${trade.lotSize}`, 'Risk', `${trade.riskPercent}%`],
        ['P&L', `$${trade.pnl.toFixed(2)}`, 'Pips', `${trade.pips}`],
        ['RRR', `${trade.rrr}`, 'Session', trade.session],
        ['Strategy', trade.strategy, 'TF', trade.timeframe],
      ];

      autoTable(doc, {
        startY: cy,
        body: details,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5 },
        margin: { left: 14, right: 14 },
        tableWidth: 160,
      });
      cy = (doc as any).lastAutoTable.finalY + 4;

      if (trade.smcTags.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`SMC Tags: ${trade.smcTags.join(', ')}`, 14, cy);
        cy += 5;
      }

      if (trade.reasonForEntry) {
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(`Entry Reason: ${trade.reasonForEntry}`, pageWidth - 28);
        doc.text(lines, 14, cy);
        cy += lines.length * 4 + 3;
      }

      if (trade.mistakes.length > 0) {
        doc.text(`Mistakes: ${trade.mistakes.join(', ')}`, 14, cy);
        cy += 5;
      }

      if (trade.whatWentWell) {
        const lines = doc.splitTextToSize(`What Went Well: ${trade.whatWentWell}`, pageWidth - 28);
        doc.text(lines, 14, cy);
        cy += lines.length * 4 + 3;
      }

      if (trade.improvementNotes) {
        const lines = doc.splitTextToSize(`Improvement: ${trade.improvementNotes}`, pageWidth - 28);
        doc.text(lines, 14, cy);
        cy += lines.length * 4 + 3;
      }

      doc.setFontSize(8);
      doc.text(`Psychology: ${trade.psychologyEmotion} (${trade.psychologyState}/10)  |  Confidence: ${trade.confidenceLevel}/10  |  Plan: ${trade.planAdherence ? 'Yes' : 'No'}`, 14, cy);
      cy += 10;
    }
  }

  doc.save(`TradeVault_Report_${dateLabel.replace(/\s/g, '_')}.pdf`);
}

// ─── DOCX Export ───

export async function exportToDocx({ trades, dateLabel, outcomeFilters }: ExportOptions) {
  const stats = calcStats(trades);
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const children: any[] = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'TradeVault Pro — Trade Journal Report', bold: true, size: 32, color: '00C9A7' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: `${dateLabel}  |  ${outcomeLabel(outcomeFilters)}  |  ${trades.length} trades`, size: 20, color: '666666' })],
  }));

  // Summary stats table
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Summary', bold: true, size: 28 })] }));

  const summaryRows = [
    ['Total P&L', `$${stats.totalPnl.toFixed(2)}`],
    ['Win Rate', `${stats.winRate}%`],
    ['Total Pips', `${stats.totalPips}`],
    ['Avg RRR', `${stats.avgRrr}`],
    ['Total Trades', `${trades.length}`],
  ];

  children.push(new Table({
    width: { size: 5000, type: WidthType.DXA },
    columnWidths: [2500, 2500],
    rows: summaryRows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, shading: { fill: 'F0F0F0', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })] }),
        new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })] }),
      ]
    })),
  }));

  children.push(new Paragraph({ spacing: { before: 300 } }));

  // Trade summary table
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Trade Summary', bold: true, size: 28 })] }));

  const headerCells = ['Date', 'Pair', 'Dir', 'Session', 'P&L', 'Pips', 'Outcome'];
  const colWidths = [1400, 1200, 800, 1200, 1200, 800, 1200];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: headerCells.map((h, i) => new TableCell({
          borders, width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: '0D1B2A', type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: '00C9A7' })] })],
        })),
      }),
      ...trades.map(t => new TableRow({
        children: [t.date, t.pair, t.direction, t.session, `$${t.pnl.toFixed(2)}`, `${t.pips}`, t.outcome].map((val, i) => new TableCell({
          borders, width: { size: colWidths[i], type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: val, size: 16, color: val === 'WIN' ? '00B464' : val === 'LOSS' ? 'DC3232' : undefined })] })],
        })),
      })),
    ],
  }));

  // Individual trade details
  const grouped = groupByDate(trades);
  for (const [date, dateTrades] of Object.entries(grouped)) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [new TextRun({ text: date, bold: true, size: 28, color: '00C9A7' })],
    }));

    for (const trade of dateTrades) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: `${trade.pair} — ${trade.direction} (${trade.outcome})`, bold: true, size: 24 })],
      }));

      const detailRows = [
        ['Entry', `${trade.entryPrice}`, 'Exit', `${trade.exitPrice}`],
        ['SL', `${trade.stopLoss}`, 'TP', `${trade.takeProfit}`],
        ['Lots', `${trade.lotSize}`, 'Risk', `${trade.riskPercent}%`],
        ['P&L', `$${trade.pnl.toFixed(2)}`, 'Pips', `${trade.pips}`],
        ['RRR', `${trade.rrr}`, 'Strategy', trade.strategy],
        ['Session', trade.session, 'Timeframe', trade.timeframe],
      ];

      children.push(new Table({
        width: { size: 7800, type: WidthType.DXA },
        columnWidths: [1500, 2400, 1500, 2400],
        rows: detailRows.map(row => new TableRow({
          children: row.map((val, i) => new TableCell({
            borders, width: { size: [1500, 2400, 1500, 2400][i], type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            shading: i % 2 === 0 ? { fill: 'F0F0F0', type: ShadingType.CLEAR } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: val, size: 16, bold: i % 2 === 0 })] })],
          })),
        })),
      }));

      const addNote = (label: string, value: string) => {
        if (!value) return;
        children.push(new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 18 }),
            new TextRun({ text: value, size: 18 }),
          ],
        }));
      };

      if (trade.smcTags.length > 0) addNote('SMC Tags', trade.smcTags.join(', '));
      addNote('Entry Reason', trade.reasonForEntry);
      addNote('Pre-Trade', trade.preSituation);
      addNote('During Trade', trade.duringSituation);
      addNote('Post-Trade', trade.postSituation);
      addNote('What Went Well', trade.whatWentWell);
      if (trade.mistakes.length > 0) addNote('Mistakes', trade.mistakes.join(', '));
      addNote('Improvement', trade.improvementNotes);

      children.push(new Paragraph({
        spacing: { before: 80, after: 200 },
        children: [
          new TextRun({ text: `Psychology: ${trade.psychologyEmotion} (${trade.psychologyState}/10)  |  Confidence: ${trade.confidenceLevel}/10  |  Plan Followed: ${trade.planAdherence ? 'Yes' : 'No'}`, size: 16, color: '888888' }),
        ],
      }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `TradeVault_Report_${dateLabel.replace(/\s/g, '_')}.docx`);
}

// ─── Helpers ───

function groupByDate(trades: Trade[]): Record<string, Trade[]> {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }
  return groups;
}

export function filterTrades(
  trades: Trade[],
  dateMode: 'monthly' | 'yearly' | 'custom',
  dateValue: { month?: number; year?: number; startDate?: string; endDate?: string },
  outcomes: TradeOutcome[]
): Trade[] {
  let filtered = trades;

  if (dateMode === 'monthly' && dateValue.year && dateValue.month !== undefined) {
    const prefix = `${dateValue.year}-${String(dateValue.month + 1).padStart(2, '0')}`;
    filtered = filtered.filter(t => t.date.startsWith(prefix));
  } else if (dateMode === 'yearly' && dateValue.year) {
    filtered = filtered.filter(t => t.date.startsWith(`${dateValue.year}`));
  } else if (dateMode === 'custom' && dateValue.startDate && dateValue.endDate) {
    filtered = filtered.filter(t => t.date >= dateValue.startDate! && t.date <= dateValue.endDate!);
  }

  filtered = filtered.filter(t => outcomes.includes(t.outcome));
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}
