import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Compass, Sun, Calendar, CalendarDays, Sparkles, Layers, Trello } from "lucide-react";
import { PyramidView } from "@/components/lifeos/PyramidView";
import { TodayTab } from "@/components/lifeos/TodayTab";
import { WeekTab } from "@/components/lifeos/WeekTab";
import { MonthTab } from "@/components/lifeos/MonthTab";
import { VisionMissionTab } from "@/components/lifeos/VisionMissionTab";
import { YearlyBoard } from "@/components/lifeos/YearlyBoard";
import { SectionVisibilityProvider } from "@/contexts/SectionVisibilityContext";
import { HiddenSectionsBar } from "@/components/common/HiddenSectionsBar";
import { HideableSection } from "@/components/common/HideableSection";

export default function LifeOS() {
  return (
    <SectionVisibilityProvider pageKey="lifeos">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Life OS</h1>
            <p className="text-sm text-muted-foreground">
              Vision → Mission → Goals → Daily action. Stay aligned, A-Z accountable.
            </p>
          </div>
        </header>

        <HiddenSectionsBar />

        <Tabs defaultValue="board" className="w-full">
          <TabsList className="grid grid-cols-6 w-full md:w-auto">
            <TabsTrigger value="board" className="gap-1.5">
              <Trello className="h-4 w-4" /> <span className="hidden sm:inline">Board</span>
            </TabsTrigger>
            <TabsTrigger value="pyramid" className="gap-1.5">
              <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Pyramid</span>
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-1.5">
              <Sun className="h-4 w-4" /> <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <Calendar className="h-4 w-4" /> <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="vision" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Vision</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-6">
            <HideableSection id="yearly-board" title="Yearly Board"><YearlyBoard /></HideableSection>
          </TabsContent>
          <TabsContent value="pyramid" className="mt-6">
            <HideableSection id="pyramid-view" title="Pyramid View"><PyramidView /></HideableSection>
          </TabsContent>
          <TabsContent value="today" className="mt-6">
            <HideableSection id="today-tab" title="Today"><TodayTab /></HideableSection>
          </TabsContent>
          <TabsContent value="week" className="mt-6">
            <HideableSection id="week-tab" title="Week"><WeekTab /></HideableSection>
          </TabsContent>
          <TabsContent value="month" className="mt-6">
            <HideableSection id="month-tab" title="Month"><MonthTab /></HideableSection>
          </TabsContent>
          <TabsContent value="vision" className="mt-6">
            <HideableSection id="vision-tab" title="Vision & Mission"><VisionMissionTab /></HideableSection>
          </TabsContent>
        </Tabs>
      </div>
    </SectionVisibilityProvider>
  );
}
