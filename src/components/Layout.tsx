import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, BarChart3, Brain, Settings, Gauge, TrendingUp
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Journal', url: '/journal', icon: BookOpen },
  { title: 'New Trade', url: '/new-trade', icon: PlusCircle },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Psychology', url: '/psychology', icon: Brain },
  { title: 'Strength', url: '/currency-strength', icon: Gauge },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/30 px-4 md:px-6">
        <div className="flex items-center h-14 gap-6 max-w-[1400px] mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_12px_hsla(145,63%,49%,0.3)]">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">TradeVault</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase leading-none">Pro</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 relative ${
                      isActive
                        ? 'text-primary bg-primary/10 shadow-[0_0_8px_hsla(145,63%,49%,0.15)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline">{item.title}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
