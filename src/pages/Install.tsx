import { Download, Smartphone, MoreVertical, Plus, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Install = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
            <Download className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TradeVault Pro Install করুন</h1>
          <p className="text-muted-foreground text-sm">
            আপনার phone এ app হিসেবে install করুন — browser bar ছাড়া full screen এ চলবে
          </p>
        </div>

        {/* Android */}
        <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-foreground">Android (Chrome)</h2>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">1</span>
                <span>Chrome browser এ এই app open করুন</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">2</span>
                <span className="flex items-center gap-1">
                  উপরে ডানদিকে <MoreVertical className="w-4 h-4 inline" /> menu তে tap করুন
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">3</span>
                <span className="flex items-center gap-1">
                  <Plus className="w-4 h-4 inline" /> "Add to Home screen" বা "Install app" select করুন
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">4</span>
                <span>"Install" confirm করুন — Home screen এ icon আসবে!</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* iOS */}
        <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-foreground">iPhone (Safari)</h2>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">1</span>
                <span>Safari browser এ এই app open করুন</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
                <span className="flex items-center gap-1">
                  নিচে <Share className="w-4 h-4 inline" /> Share button এ tap করুন
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">3</span>
                <span>"Add to Home Screen" select করুন</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">4</span>
                <span>"Add" confirm করুন — done!</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          ⚠️ Install feature শুধু published version এ কাজ করবে
        </p>
      </div>
    </div>
  );
};

export default Install;
