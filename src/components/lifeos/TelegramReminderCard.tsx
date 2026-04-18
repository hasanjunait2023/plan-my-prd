import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Sun, Moon, Save, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function TelegramReminderCard() {
  const [chatId, setChatId] = useState("");
  const [savedChatId, setSavedChatId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"morning" | "evening" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("alert_settings")
        .select("id,telegram_chat_id")
        .limit(1)
        .maybeSingle();
      if (data?.telegram_chat_id) {
        setChatId(data.telegram_chat_id);
        setSavedChatId(data.telegram_chat_id);
      }
    })();
  }, []);

  const saveChatId = async () => {
    if (!chatId.trim()) {
      toast({ title: "Chat ID required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: existing } = await supabase
      .from("alert_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    const payload = { telegram_chat_id: chatId.trim() };
    const { error } = existing
      ? await supabase.from("alert_settings").update(payload).eq("id", existing.id)
      : await supabase.from("alert_settings").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setSavedChatId(chatId.trim());
    toast({ title: "Saved ✅", description: "Telegram chat ID linked" });
  };

  const trigger = async (which: "morning" | "evening") => {
    if (!savedChatId) {
      toast({ title: "Save chat ID first", variant: "destructive" });
      return;
    }
    setTesting(which);
    try {
      const fn = which === "morning" ? "lifeos-morning-push" : "lifeos-evening-review";
      const { data, error } = await supabase.functions.invoke(fn);
      if (error) throw error;
      toast({
        title: which === "morning" ? "☀️ Morning push sent" : "🌙 Evening review sent",
        description: `Check Telegram. Sent: ${data?.sent ?? 0}`,
      });
    } catch (e) {
      toast({
        title: "Send failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          Telegram Accountability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            ☀️ <b>7:00 AM</b> — Top 3 priorities + ✅ buttons
          </p>
          <p>
            🌙 <b>9:00 PM</b> — Completion review with stats
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-id" className="text-xs">
            Telegram Chat ID
          </Label>
          <div className="flex gap-2">
            <Input
              id="chat-id"
              placeholder="e.g. 123456789"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={saveChatId} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Get your ID by messaging{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              @userinfobot
            </a>{" "}
            on Telegram.
          </p>
        </div>

        {savedChatId && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => trigger("morning")}
              disabled={testing !== null}
            >
              <Sun className="h-4 w-4 mr-1" />
              {testing === "morning" ? "Sending…" : "Test morning"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => trigger("evening")}
              disabled={testing !== null}
            >
              <Moon className="h-4 w-4 mr-1" />
              {testing === "evening" ? "Sending…" : "Test evening"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
