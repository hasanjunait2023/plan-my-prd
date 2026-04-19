import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LifeNode } from "@/hooks/useLifeNodes";
import type { Achievement } from "@/hooks/useAchievements";
import type { DailyStat } from "@/hooks/useStreakStats";

interface ReportInput {
  nodes: LifeNode[];
  achievements: Achievement[];
  stats: {
    currentStreak: number;
    longestStreak: number;
    last7Rate: number;
    totalCompletedAllTime: number;
    last30: DailyStat[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  vision: "Vision",
  mission: "Mission",
  yearly: "Yearly",
  quarterly: "Quarterly",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
};

export async function generateYearEndReport({ nodes, achievements, stats }: ReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const year = new Date().getFullYear();

  // Cover
  doc.setFillColor(13, 27, 42); // brand bg
  doc.rect(0, 0, pageWidth, 200, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("Life OS", margin, 90);
  doc.setFontSize(20);
  doc.setFont("helvetica", "normal");
  doc.text(`${year} Year-End Report`, margin, 125);
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 220);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, 150);

  // Reset text color
  doc.setTextColor(20, 20, 20);

  let y = 240;

  // Highlights
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Highlights", margin, y);
  y += 20;

  const highlights: [string, string][] = [
    ["Longest streak", `${stats.longestStreak} days`],
    ["Current streak", `${stats.currentStreak} days`],
    ["7-day completion avg", `${stats.last7Rate}%`],
    ["Total tasks completed", `${stats.totalCompletedAllTime}`],
    ["Achievements unlocked", `${achievements.filter((a) => a.unlocked).length} / ${achievements.length}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: highlights,
    theme: "striped",
    headStyles: { fillColor: [0, 201, 167] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 30;

  // Achievements
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Achievements", margin, y);
  y += 12;

  const achievementRows = achievements.map((a) => [
    a.unlocked ? "✓" : "—",
    a.title,
    a.tier.toUpperCase(),
    a.unlocked ? "Unlocked" : `${Math.round(a.progress)}%`,
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [["", "Title", "Tier", "Status"]],
    body: achievementRows,
    theme: "grid",
    headStyles: { fillColor: [26, 43, 60] },
    columnStyles: { 0: { halign: "center", cellWidth: 30 } },
    margin: { left: margin, right: margin },
  });

  // New page for nodes
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Life Pyramid Snapshot", margin, y);
  y += 12;

  const layerOrder = ["vision", "mission", "yearly", "quarterly", "monthly", "weekly", "daily"];
  const nodeRows: string[][] = [];
  layerOrder.forEach((type) => {
    const filtered = nodes.filter((n) => n.type === type);
    filtered.forEach((n) => {
      nodeRows.push([
        TYPE_LABELS[type] ?? type,
        n.title.slice(0, 60),
        `${Math.round(Number(n.progress))}%`,
        n.status,
      ]);
    });
  });

  autoTable(doc, {
    startY: y + 8,
    head: [["Layer", "Title", "Progress", "Status"]],
    body: nodeRows.length ? nodeRows : [["—", "No nodes yet", "—", "—"]],
    theme: "striped",
    headStyles: { fillColor: [0, 201, 167] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
  });

  // 30-day activity
  doc.addPage();
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Last 30 Days Activity", margin, y);
  y += 12;

  const activityRows = stats.last30.map((d) => [
    d.date,
    String(d.total),
    String(d.done),
    `${d.rate}%`,
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Planned", "Done", "Rate"]],
    body: activityRows,
    theme: "grid",
    headStyles: { fillColor: [26, 43, 60] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
  });

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Life OS · ${year} Year-End Report · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`LifeOS-${year}-Year-End-Report.pdf`);
}
