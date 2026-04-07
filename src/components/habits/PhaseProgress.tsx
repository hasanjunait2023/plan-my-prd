interface PhaseProgressProps {
  daysSinceCreation: number;
}

export function PhaseProgress({ daysSinceCreation }: PhaseProgressProps) {
  const isPhase1 = daysSinceCreation <= 66;
  const isPhase2 = daysSinceCreation > 66 && daysSinceCreation <= 90;
  const isEstablished = daysSinceCreation > 90;

  const progress = isPhase1
    ? (daysSinceCreation / 66) * 100
    : isPhase2
    ? ((daysSinceCreation - 66) / 24) * 100
    : 100;

  const barColor = isPhase1
    ? 'bg-amber-400'
    : isPhase2
    ? 'bg-blue-400'
    : 'bg-green-400';

  const label = isPhase1
    ? `Day ${daysSinceCreation}/66`
    : isPhase2
    ? `Day ${daysSinceCreation}/90`
    : `Day ${daysSinceCreation} ✅`;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}
