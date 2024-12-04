import { useState } from 'react';
import { ThemeToggle } from '../ui/theme-toggle';
import { Button } from '../ui/button';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Patient PSI</span>
          </a>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <a
              href="/dashboard"
              className="transition-colors hover:text-foreground/80"
            >
              Dashboard
            </a>
            <a
              href="/patients"
              className="transition-colors hover:text-foreground/80"
            >
              Patients
            </a>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="text-base"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </nav>
          <Button
            className="md:hidden"
            variant="ghost"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="border-t px-4 py-4 space-y-4">
            <a
              href="/dashboard"
              className="block text-sm font-medium transition-colors hover:text-foreground/80"
            >
              Dashboard
            </a>
            <a
              href="/patients"
              className="block text-sm font-medium transition-colors hover:text-foreground/80"
            >
              Patients
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
