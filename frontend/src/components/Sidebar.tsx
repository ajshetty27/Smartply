import { Link, useLocation } from 'react-router-dom';
import { Briefcase, FileText, Rocket, LayoutDashboard, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Cover Letters', href: '/cover-letters', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const [username, setUsername] = useState<string>('User');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch current user info
    authService.getCurrentUser()
      .then(user => setUsername(user.username))
      .catch(() => setUsername('User'));
  }, []);

  const handleLogout = () => {
    authService.logout();
    // No need to navigate - logout handles redirect
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

      {/* User Profile Section */}
      <div className="p-3 border-t border-white/10">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Hi, {username}</p>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showDropdown && "rotate-180"
            )} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5 rounded-none"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
