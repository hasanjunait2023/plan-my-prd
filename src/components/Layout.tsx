import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, BarChart3, Brain, Settings, Gauge, TrendingUp, Bell, User
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { title: 'Dashboard', short: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Journal', short: 'Jrnl', url: '/journal', icon: BookOpen },
  { title: 'New Trade', short: 'New', url: '/new-trade', icon: PlusCircle },
  { title: 'Analytics', short: 'Ana', url: '/analytics', icon: BarChart3 },
  { title: 'Psychology', short: 'Psy', url: '/psychology', icon: Brain },
  { title: 'Strength', short: 'Str', url: '/currency-strength', icon: Gauge },
  { title: 'Settings', short: 'Set', url: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/30 px-4 md:px-6">
        <div className="flex items-center h-14 gap-6 max-w-[1400px] mx-auto w-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_12px_hsla(145,63%,49%,0.3)]">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">TradeVault</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase leading-none">Pro</p>
            </div>
          </div>

          {/* Desktop Nav Tabs — hidden on mobile */}
          <nav className="flex-1 overflow-x-auto scrollbar-hide hidden md:block">
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
                      <span>{item.title}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right side — Bell + Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_hsla(var(--primary)/0.6)]" />
            </button>
            <Avatar className="w-8 h-8 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
              <AvatarFallback className="bg-card text-xs font-semibold text-foreground">
                TV
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-md bg-background/90 border-t border-border/30"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around px-1 h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-xl min-w-[44px] transition-all duration-200 relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Top glow indicator */}
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full shadow-[0_0_8px_hsla(145,63%,49%,0.4)]" />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive ? 'drop-shadow-[0_0_6px_hsla(145,63%,49%,0.5)]' : ''
                    }`}
                  />
                  <span className={`text-[10px] font-medium leading-none ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {item.short}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
