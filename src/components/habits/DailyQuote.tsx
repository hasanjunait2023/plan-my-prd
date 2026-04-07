import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

const QUOTES = [
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Your habits will determine your future.", author: "Jack Canfield" },
  { text: "First forget inspiration. Habit is more dependable.", author: "Octavia Butler" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear" },
  { text: "The chains of habit are too weak to be felt until they are too strong to be broken.", author: "Samuel Johnson" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "Be patient with yourself. Self-growth is tender; it's holy ground.", author: "Stephen Covey" },
  { text: "One percent better every day compounds into something incredible.", author: "James Clear" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "Progress, not perfection, is what we should be asking of ourselves.", author: "Julia Cameron" },
  { text: "Winners embrace hard work. They love the discipline of it.", author: "Lou Holtz" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "Every action you take is a vote for the person you wish to become.", author: "James Clear" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

export function DailyQuote() {
  const quote = useMemo(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return QUOTES[seed % QUOTES.length];
  }, []);

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-muted/20 border border-border/20">
      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-foreground/80 italic leading-relaxed">"{quote.text}"</p>
        <p className="text-[10px] text-muted-foreground mt-1">— {quote.author}</p>
      </div>
    </div>
  );
}
