import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useI18n } from "@/lib/i18n";
import { LogOut, Settings, LayoutDashboard, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useI18n();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none hover:bg-secondary/15 p-1 pr-3 transition-colors">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={user.imageUrl} />
            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline-block">
            {user.firstName || user.username || t('nav.user')}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>{t('nav.dashboard')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('nav.settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('nav.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
