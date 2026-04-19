import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { AdherenceReport } from '@/components/rules/AdherenceReport';
import { CoachingPlanCard } from '@/components/rules/CoachingPlanCard';

const RulesReport = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg ring-1 ring-primary/40">
                <BarChart3 className="w-7 h-7 text-primary-foreground" strokeWidth={2.2} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Adherence Report
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Deep dive into your discipline patterns & coaching insights
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/rules">
              <ArrowLeft className="w-4 h-4" />
              Back to Rules
            </Link>
          </Button>
        </div>
      </div>

      {/* Full report */}
      <AdherenceReport />

      {/* Coaching plan below */}
      <CoachingPlanCard />
    </div>
  );
};

export default RulesReport;
