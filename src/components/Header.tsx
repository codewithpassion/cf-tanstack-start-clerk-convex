import { Link } from '@tanstack/react-router'
import { Home, Menu, User, LayoutDashboard } from 'lucide-react'
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from '@clerk/tanstack-react-start'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-4">
                <NavLink to="/" icon={<Home className="h-4 w-4" />}>
                  Home
                </NavLink>

                <SignedIn>
                  <Separator className="my-2" />
                  <NavLink
                    to="/dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink to="/profile" icon={<User className="h-4 w-4" />}>
                    Profile
                  </NavLink>
                </SignedIn>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <img
              src="/tanstack-word-logo-white.svg"
              alt="TanStack Logo"
              className="h-8 dark:invert-0 invert"
            />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: 'text-sm font-medium text-foreground' }}
          >
            Home
          </Link>
          <SignedIn>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: 'text-sm font-medium text-foreground' }}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: 'text-sm font-medium text-foreground' }}
            >
              Profile
            </Link>
          </SignedIn>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-accent"
      activeProps={{
        className:
          'flex items-center gap-3 rounded-lg px-3 py-2 bg-accent text-accent-foreground',
      }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
