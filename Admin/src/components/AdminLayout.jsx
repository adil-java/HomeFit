import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  UserCheck,
  Tags,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { adminApi } from '@/services/adminApi';
import { cn } from '@/lib/utils';

const sections = [
  {
    label: 'Overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Marketplace',
    items: [
      { name: 'Orders', href: '/orders', icon: ShoppingCart },
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Categories', href: '/categories', icon: Tags },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Customers', href: '/users', icon: Users },
      { name: 'Sellers', href: '/sellers', icon: Store },
      { name: 'Seller requests', href: '/seller-requests', icon: UserCheck, badgeKey: 'pendingRequests' },
    ],
  },
];

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <img src="/logo.png" alt="HomeFit" className="h-9 w-9 rounded-lg object-cover" />
    <div className="leading-tight">
      <p className="text-[15px] font-extrabold tracking-tight text-foreground">
        Home<span className="text-primary">Fit</span>
      </p>
      <p className="text-[11px] font-medium text-muted-foreground">Admin panel</p>
    </div>
  </div>
);

const NavList = ({ pathname, badges, onNavigate }) => (
  <nav className="flex flex-1 flex-col gap-6">
    {sections.map((section) => (
      <div key={section.label}>
        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {section.label}
        </p>
        <ul className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                  <span className="flex-1">{item.name}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-bold leading-none text-brand-foreground">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({ pendingRequests: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Pending seller requests count for the menu badge (refreshed on navigation)
  useEffect(() => {
    let alive = true;
    adminApi
      .listSellerRequests('PENDING')
      .then((res) => alive && setBadges({ pendingRequests: (res?.data || []).length }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name || user?.email || 'A').trim().slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-sidebar lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Brand />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-4 pt-2">
          <NavList pathname={location.pathname} badges={badges} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', sidebarOpen ? 'block' : 'hidden')}>
        <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-sidebar">
          <div className="flex h-16 items-center justify-between px-5">
            <Brand />
            <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <NavList pathname={location.pathname} badges={badges} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      </div>

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="lg:hidden">
            <Brand />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{user?.name || 'Admin'}</span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user?.name || 'Admin'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
