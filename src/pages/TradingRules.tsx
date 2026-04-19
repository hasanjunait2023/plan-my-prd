import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, Pencil, Check, X, ChevronsUpDown, Tag, Palette, Brain, ListChecks, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useTradingRules,
  useInsertRule,
  useDeleteRule,
  useToggleRule,
  useUpdateRule,
} from '@/hooks/useTradingRules';
import { useRuleCategories, useUpsertRuleCategory } from '@/hooks/useRuleCategories';
import { TradingRule } from '@/types/trade';
import { MemorizeMode } from '@/components/rules/MemorizeMode';
import { DailyReminderCard } from '@/components/rules/DailyReminderCard';
import { ConfidenceOverview } from '@/components/rules/ConfidenceOverview';
import { MemorizeStreakBanner } from '@/components/rules/MemorizeStreakBanner';

const DEFAULT_CATEGORIES = ['Risk', 'Entry', 'Exit', 'Psychology', 'General'];

const PRESET_COLORS = [
  '#00C9A7', // teal (default)
  '#3B82F6', // blue
  '#A855F7', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#64748B', // slate
];

// Simple deterministic fallback color from a string
const fallbackColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PRESET_COLORS[h % PRESET_COLORS.length];
};

interface CategoryComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorMap: Record<string, string>;
  className?: string;
  size?: 'sm' | 'md';
}

const CategoryCombobox = ({ value, onChange, options, colorMap, className, size = 'md' }: CategoryComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const exists = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const heightClass = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn('justify-between font-normal', heightClass, className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            {value ? (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/30"
                style={{ backgroundColor: colorMap[value] || fallbackColor(value) }}
              />
            ) : (
              <Tag className="w-3.5 h-3.5 opacity-60" />
            )}
            {value || 'Category'}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-56" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? (
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                  onClick={() => {
                    onChange(trimmed);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Create "{trimmed}"
                </button>
              ) : (
                <span className="text-sm text-muted-foreground px-2">No categories</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('w-3.5 h-3.5 mr-2', value === opt ? 'opacity-100' : 'opacity-0')} />
                  <span
                    className="w-2.5 h-2.5 rounded-full mr-2 border border-border/30"
                    style={{ backgroundColor: colorMap[opt] || fallbackColor(opt) }}
                  />
                  {opt}
                </CommandItem>
              ))}
              {trimmed && !exists && (
                <CommandItem
                  value={`__create_${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Create "{trimmed}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const TradingRules = () => {
  const { data: rules = [], isLoading } = useTradingRules();
  const { data: categoryRows = [] } = useRuleCategories();
  const insertRule = useInsertRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const toggleRule = useToggleRule();
  const upsertCategory = useUpsertRuleCategory();

  const [newRule, setNewRule] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [memorizeOpen, setMemorizeOpen] = useState(false);

  // Build color map: saved rows override fallback
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categoryRows) map[c.name] = c.color;
    return map;
  }, [categoryRows]);

  // Build category list from existing data + defaults + saved categories
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const r of rules) set.add(r.category || 'General');
    for (const c of categoryRows) set.add(c.name);
    return Array.from(set);
  }, [rules, categoryRows]);

  // Group rules by category
  const grouped = useMemo(() => {
    const map = new Map<string, TradingRule[]>();
    for (const r of rules) {
      const cat = r.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rules]);

  const getColor = (cat: string) => colorMap[cat] || fallbackColor(cat);

  const handlePickColor = async (category: string, color: string) => {
    try {
      await upsertCategory.mutateAsync({ name: category, color });
      toast.success('Color updated');
    } catch {
      toast.error('Failed to save color');
    }
  };


  const handleAdd = async () => {
    const text = newRule.trim();
    if (!text) return;
    try {
      await insertRule.mutateAsync({ text, category: newCategory });
      setNewRule('');
      toast.success('Rule added');
    } catch {
      toast.error('Failed to add rule');
    }
  };

  const startEdit = (rule: TradingRule) => {
    setEditingId(rule.id);
    setEditText(rule.text);
    setEditCategory(rule.category || 'General');
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await updateRule.mutateAsync({
        id: editingId,
        text: editText.trim(),
        category: editCategory,
      });
      setEditingId(null);
      toast.success('Rule updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.active).length;
  const totalCategories = grouped.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 shadow-lg">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg ring-1 ring-primary/40">
                <Shield className="w-7 h-7 text-primary-foreground" strokeWidth={2.2} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Trading Rules
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Discipline is freedom — your edge, codified
              </p>
            </div>
          </div>

          <Button
            onClick={() => setMemorizeOpen(true)}
            disabled={activeRules === 0}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground shadow-lg shadow-primary/30 border-0"
          >
            <Brain className="w-4 h-4" />
            Memorize Mode
          </Button>
        </div>

        {/* Stats strip */}
        <div className="relative grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border/40">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">Total</div>
            <div className="text-2xl font-bold mt-0.5">{totalRules}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">Active</div>
            <div className="text-2xl font-bold mt-0.5 text-primary">{activeRules}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">Categories</div>
            <div className="text-2xl font-bold mt-0.5">{totalCategories}</div>
          </div>
        </div>
      </div>

      {/* Daily reminders */}
      <DailyReminderCard />

      <Tabs defaultValue="rules" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 h-11 bg-card/60 border border-border/40 backdrop-blur-sm">
          <TabsTrigger value="rules" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <ListChecks className="w-4 h-4" />
            My Rules
          </TabsTrigger>
          <TabsTrigger value="confidence" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Activity className="w-4 h-4" />
            Confidence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-5 mt-0">
      {/* Add new rule */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-primary" />
            </div>
            Add a new rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              placeholder="e.g. Never risk more than 1% per trade…"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 h-10 bg-background/60 border-border/50 focus-visible:ring-primary/40"
            />
            <CategoryCombobox
              value={newCategory}
              onChange={setNewCategory}
              options={allCategories}
              colorMap={colorMap}
              className="sm:w-44"
            />
            <Button
              onClick={handleAdd}
              disabled={!newRule.trim() || insertRule.isPending}
              className="gap-1.5 shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rules grouped by category */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-card/30">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">No rules yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first trading rule above to start building your edge.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, items]) => {
            const color = getColor(category);
            const activeCount = items.filter((i) => i.active).length;
            return (
              <Card
                key={category}
                className="group relative border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Left color stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: color }}
                />
                {/* Subtle category-tinted glow */}
                <div
                  className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.07] blur-2xl"
                  style={{ backgroundColor: color }}
                />

                <CardHeader className="pb-3 pl-6">
                  <CardTitle className="text-sm flex items-center gap-2.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          title="Pick color"
                          className="relative w-3.5 h-3.5 rounded-full ring-2 ring-background hover:scale-125 transition-transform shrink-0 shadow-sm"
                          style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}40, 0 0 8px ${color}60` }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          <Palette className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Pick a color</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handlePickColor(category, c)}
                              className={cn(
                                'w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform shadow-sm',
                                color.toLowerCase() === c.toLowerCase()
                                  ? 'border-foreground ring-2 ring-foreground/20'
                                  : 'border-border/30'
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className="font-semibold tracking-tight text-base">{category}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium px-1.5 py-0 h-5 bg-background/60 border border-border/40"
                    >
                      {activeCount}/{items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 pl-6">
                  {items.map((rule, idx) => {
                    const isEditing = editingId === rule.id;
                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          'group/row flex items-center gap-3 p-3 rounded-xl border transition-all',
                          rule.active
                            ? 'border-border/30 bg-background/40 hover:bg-background/70 hover:border-border/60'
                            : 'border-border/20 bg-background/20 opacity-60 hover:opacity-100'
                        )}
                      >
                        <span className="text-[10px] font-mono text-muted-foreground/50 w-5 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) =>
                            toggleRule.mutate({ id: rule.id, active: checked })
                          }
                        />
                        {isEditing ? (
                          <>
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <CategoryCombobox
                              value={editCategory}
                              onChange={setEditCategory}
                              options={allCategories}
                              colorMap={colorMap}
                              className="w-36"
                              size="sm"
                            />
                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-8 w-8"
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span
                              className={cn(
                                'flex-1 text-sm leading-relaxed',
                                rule.active
                                  ? 'text-foreground'
                                  : 'text-muted-foreground/60 line-through'
                              )}
                            >
                              {rule.text}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEdit(rule)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(rule.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="confidence" className="mt-0">
          <ConfidenceOverview rules={rules} colorFor={getColor} />
        </TabsContent>
      </Tabs>

      <MemorizeMode
        open={memorizeOpen}
        onClose={() => setMemorizeOpen(false)}
        rules={rules}
        colorFor={getColor}
      />
    </div>
  );
};

export default TradingRules;
