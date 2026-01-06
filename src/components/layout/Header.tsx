import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, Settings, Palette, ShoppingBag, Plus, ShieldCheck, Wallet, CreditCard, Image, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationBell } from "@/components/ui/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const auth = useAuth();
  const { toast } = useToast();
  const [isAddingRole, setIsAddingRole] = useState(false);
  
  const { user, signOut, isAdmin, isArtist, isBuyer, addRole, loading } = auth;

  const navLinks = [
    { href: "/", label: t('common.home') },
    { href: "/marketplace", label: t('common.marketplace') },
    { href: "/artists", label: t('common.artists') },
    { href: "/verification", label: t('common.verification') },
    { href: "/policy", label: t('common.policy') },
  ];

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const handleAddRole = async (role: 'artist' | 'buyer') => {
    setIsAddingRole(true);
    const { error } = await addRole(role);
    setIsAddingRole(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.addRoleFailed'),
        description: error.message,
      });
    } else {
      toast({
        title: t('auth.addRoleSuccess'),
        description: role === 'artist' ? t('auth.nowArtist') : t('auth.nowBuyer'),
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <span className="font-serif text-lg font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-serif text-xl font-semibold text-foreground">
            {t('header.soulHuman')}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`nav-link ${
                location.pathname === link.href ? "text-foreground" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
          
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {isAdmin && (
                      <Badge variant="destructive" className="text-xs">{t('roles.admin')}</Badge>
                    )}
                    {isArtist && (
                      <Badge variant="default" className="text-xs">
                        <Palette className="mr-1 h-3 w-3" />
                        {t('roles.artist')}
                      </Badge>
                    )}
                    {isBuyer && (
                      <Badge variant="secondary" className="text-xs">
                        <ShoppingBag className="mr-1 h-3 w-3" />
                        {t('roles.buyer')}
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/wallet" className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4" />
                    กระเป๋าเงิน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-orders" className="cursor-pointer">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    ประวัติการซื้อ
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        {t('common.adminDashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/topup-requests" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        จัดการเติมเงิน
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isArtist && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/sell" className="cursor-pointer">
                        <Image className="mr-2 h-4 w-4" />
                        ผลงานของฉัน
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/artist/earnings" className="cursor-pointer">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        สรุปรายได้
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/artist/my-profile" className="cursor-pointer">
                        <Palette className="mr-2 h-4 w-4" />
                        {t('common.artistProfile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/artist/verification" className="cursor-pointer">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {t('common.artistVerification', 'ยืนยันตัวตน')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {/* Add role options */}
                {!isArtist && (
                  <DropdownMenuItem 
                    onClick={() => handleAddRole('artist')}
                    disabled={isAddingRole}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.becomeArtist')}
                  </DropdownMenuItem>
                )}
                {!isBuyer && (
                  <DropdownMenuItem 
                    onClick={() => handleAddRole('buyer')}
                    disabled={isAddingRole}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.becomeBuyer')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('common.login')}
              </Link>
              <Link to="/auth" className="btn-hero-primary !px-6 !py-2.5 !text-sm">
                {t('common.signup')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="container mx-auto flex flex-col gap-4 px-4 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3">
                {user ? (
                  <>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="text-center text-sm font-medium text-muted-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t('common.adminDashboard')}
                      </Link>
                    )}
                    <Button variant="outline" onClick={handleSignOut}>
                      {t('common.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="text-center text-sm font-medium text-muted-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('common.login')}
                    </Link>
                    <Link
                      to="/auth"
                      className="btn-hero-primary text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('common.signup')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
