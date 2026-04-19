import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import {
  useTradingRules,
  useInsertRule,
  useDeleteRule,
  useToggleRule,
  useUpdateRule,
} from '@/hooks/useTradingRules';
import { TradingRule } from '@/types/trade';

const DEFAULT_CATEGORIES = ['Risk', 'Entry', 'Exit', 'Psychology', 'General'];

const TradingRules = () => {
  const { data: rules = [], isLoading } = useTradingRules();
  const insertRule = useInsertRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const toggleRule = useToggleRule();

  const [newRule, setNewRule] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('General');

  // Build category list from existing data + defaults
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const r of rules) set.add(r.category || 'General');
    return Array.from(set);
  }, [rules]);

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
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
