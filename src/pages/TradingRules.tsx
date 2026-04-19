import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, Pencil, Check, X, ChevronsUpDown, Tag, Palette } from 'lucide-react';
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Rules</h1>
          <p className="text-sm text-muted-foreground">
            Your personal trading rules, grouped by category
          </p>
        </div>
      </div>

      {/* Add new rule */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add a rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              placeholder="Write your rule…"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <CategoryCombobox
              value={newCategory}
              onChange={setNewCategory}
              options={allCategories}
              className="sm:w-44"
            />
            <Button onClick={handleAdd} disabled={!newRule.trim() || insertRule.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rules grouped by category */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : rules.length === 0 ? (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-8 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No rules yet. Add your first rule above.
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([category, items]) => (
          <Card key={category} className="border-border/30 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-[10px]">
                  {items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((rule) => {
                const isEditing = editingId === rule.id;
                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/20 bg-background/40"
                  >
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
                          className="w-36"
                          size="sm"
                        />
                        <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                          <Check className="w-4 h-4 text-emerald-400" />
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
                          className={`flex-1 text-sm ${
                            rule.active ? 'text-foreground' : 'text-muted-foreground/60 line-through'
                          }`}
                        >
                          {rule.text}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(rule)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(rule.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default TradingRules;
