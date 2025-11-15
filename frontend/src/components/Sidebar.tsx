import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, FileText, Rocket, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Cover Letters', href: '/cover-letters', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Rocket className="w-6 h-6" />
          Smartply
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white backdrop-blur-xl'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-white/10">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
