import logo from "@/assets/logo.svg";
import { apiClient, type UserNotification } from "@/lib/api";
import { getCurrentUser, logout } from "@/lib/auth";
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

const isPlaceholderCandidateName = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  const em = (email || "").trim().toLowerCase();
  if (!fn || !ln) return true;
  if (fn.toLowerCase() === "candidate" && ln.toLowerCase() === "user") return true;
  if (em.startsWith("clerk_user_") || em.endsWith("@devprep.com")) return true;
  return false;
};

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const { getToken, isSignedIn } = useAuth();
  
  // Use state to force re-render when auth changes
  const [customUser, setCustomUser] = useState(getCurrentUser());
  const isStaffLoggedIn = customUser !== null;

  const [needCandidateName, setNeedCandidateName] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [candidateFirstName, setCandidateFirstName] = useState("");
  const [candidateLastName, setCandidateLastName] = useState("");
  const [savingCandidateName, setSavingCandidateName] = useState(false);
  const [candidateNameError, setCandidateNameError] = useState<string | null>(null);
  const [candidateNameFromDB, setCandidateNameFromDB] = useState<{ firstName?: string | null; lastName?: string | null } | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");

  // Get candidate name from database
  const candidateDisplayName = useMemo(() => {
    if (candidateNameFromDB?.firstName && candidateNameFromDB?.lastName) {
      return `${candidateNameFromDB.firstName} ${candidateNameFromDB.lastName}`;
    }
    if (candidateFirstName && candidateLastName) {
      return `${candidateFirstName} ${candidateLastName}`;
    }
    return "Account";
  }, [candidateNameFromDB, candidateFirstName, candidateLastName]);

  // Listen for auth changes
  useEffect(() => {
    const checkAuth = () => {
      setCustomUser(getCurrentUser());
    };

    // Check auth on mount
    checkAuth();

    // Listen for custom auth change event (same-tab updates)
    window.addEventListener("auth_changed", checkAuth);
    
    // Listen for storage events (cross-tab updates)
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("auth_changed", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // Sync candidate profile when Clerk user signs in (run once per sessionStorage flag)
  useEffect(() => {
    const syncClerkCandidate = async () => {
      if (!isSignedIn) return;
      const syncedKey = "clerk_candidate_synced";
      if (sessionStorage.getItem(syncedKey)) return;
      try {
        const token = await getToken();
        if (!token) return;
        await fetch(`${API_BASE}/auth/sync-candidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const meJson = await meRes.json();
        if (meJson?.success) {
          const fn = meJson?.firstName as string | null | undefined;
          const ln = meJson?.lastName as string | null | undefined;
          const em = meJson?.email as string | null | undefined;
          setCandidateEmail(String(em || ""));
          
          // Store name from database
          setCandidateNameFromDB({ firstName: fn, lastName: ln });
          
          if (isPlaceholderCandidateName(fn, ln, em)) {
            setCandidateFirstName(fn && fn !== "Candidate" ? String(fn) : "");
            setCandidateLastName(ln && ln !== "User" ? String(ln) : "");
            setNeedCandidateName(true);
          } else {
            // Keep local display name in sync with DB, in case Clerk lacks names
            setCandidateFirstName(String(fn || ""));
            setCandidateLastName(String(ln || ""));
          }
        }
        sessionStorage.setItem(syncedKey, "1");
      } catch (err) {
        console.error("Failed to sync candidate", err);
      }
    };
    syncClerkCandidate();
  }, [getToken, isSignedIn]);

  // Always fetch candidate name when signed in (for home page and other pages)
  useEffect(() => {
    const fetchCandidateName = async () => {
      if (!isSignedIn) {
        setCandidateNameFromDB(null);
        return;
      }
      try {
        const token = await getToken();
        if (!token) return;
        
        const meRes = await fetch(`${API_BASE}/auth/me`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const meJson = await meRes.json();
        if (meJson?.success) {
          const fn = meJson?.firstName as string | null | undefined;
          const ln = meJson?.lastName as string | null | undefined;
          setCandidateNameFromDB({ firstName: fn, lastName: ln });
        }
      } catch (err) {
        console.error("Failed to fetch candidate name", err);
      }
    };
    fetchCandidateName();
  }, [getToken, isSignedIn]);

  const saveCandidateName = async () => {
    try {
      setSavingCandidateName(true);
      setCandidateNameError(null);
      const token = await getToken();
      if (!token) return;
      const firstName = candidateFirstName.trim();
      const lastName = candidateLastName.trim();
      if (!firstName || !lastName) {
        setCandidateNameError("Please enter both first name and last name.");
        return;
      }
      const res = await fetch(`${API_BASE}/auth/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName }),
      });
      const json = await res.json();
      if (!json?.success) {
        setCandidateNameError(json?.message || "Failed to save name.");
        return;
      }
      // Update local display name immediately (Clerk name might not be set)
      setCandidateFirstName(firstName);
      setCandidateLastName(lastName);
      setCandidateNameFromDB({ firstName, lastName });
      setNeedCandidateName(false);
    } catch (e) {
      console.error(e);
      setCandidateNameError("Failed to save name.");
    } finally {
      setSavingCandidateName(false);
    }
  };

  // Fetch notifications for signed-in candidate (top nav)
  useEffect(() => {
    if (!isSignedIn) return;
    const fetchNotifications = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiClient.listNotifications({ page: 1, pageSize: 10 }, token);
        if (res?.success && Array.isArray(res.data)) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n) => !n.isRead).length);
        }
      } catch {
        // ignore
      }
    };
    fetchNotifications();

    const handler = () => {
      fetchNotifications();
    };
    window.addEventListener("company_notification", handler);
    return () => {
      window.removeEventListener("company_notification", handler);
    };
  }, [isSignedIn, getToken]);

  const handleToggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient.markAllNotificationsRead(token);
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  };

  const handleClickNotification = async (notification: UserNotification) => {
    if (!notification.isRead) {
      try {
        const token = await getToken();
        if (token) {
          await apiClient.markNotificationRead(notification.id, token);
        }
      } catch {
        // ignore
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setShowNotifications(false);
  };

  const formatTimeAgo = (iso: string) => {
    const created = new Date(iso).getTime();
    if (!created) return "";
    const diffMs = Date.now() - created;
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString();
  };

  const visibleNotifications = useMemo(
    () =>
      notificationFilter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [notifications, notificationFilter]
  );

  // Handle staff logout
  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // Navigation links component (reusable)
  const NavLinks = ({ mobile = false, onLinkClick }: { mobile?: boolean; onLinkClick?: () => void }) => (
    <>
      {/* Public Links (Everyone can see) */}
      <Link to="/" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Home className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Home</span>
        </Button>
      </Link>

      <Link to="/jobs" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Briefcase className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Jobs</span>
        </Button>
      </Link>

      <Link to="/companies" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Building2 className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Companies</span>
        </Button>
      </Link>
    </>
  );

  const resolveDashboardPath = () => {
    if (isSignedIn) return "/candidate/dashboard";
    if (customUser?.role === "ADMIN") return "/admin/dashboard";
    if (customUser?.role === "RECRUITER") return "/recruiter/dashboard";
    return null;
  };

  const dashboardPath = resolveDashboardPath();

  return (
    <>
      <Dialog open={needCandidateName} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Complete your profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground break-words">
              Please enter your first name and last name to continue. {candidateEmail ? `(${candidateEmail})` : ""}
            </div>
            {candidateNameError ? <div className="text-sm text-destructive">{candidateNameError}</div> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>First name</Label>
                <Input value={candidateFirstName} onChange={(e) => setCandidateFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-1">
                <Label>Last name</Label>
                <Input value={candidateLastName} onChange={(e) => setCandidateLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveCandidateName} disabled={savingCandidateName}>
              {savingCandidateName ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoMenuOpen} onOpenChange={setLogoMenuOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate("/");
                }}
              >
                Home
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate("/jobs");
                }}
              >
                Jobs
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate("/companies");
                }}
              >
                Companies
              </Button>
            </div>

            {isSignedIn && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate("/interview");
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Interview Prep
              </Button>
            )}
            {dashboardPath ? (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate(dashboardPath);
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setLogoMenuOpen(false);
                  navigate("/login");
                }}
              >
                Login
              </Button>
            )}
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>

      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => setLogoMenuOpen(true)}
          className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition"
        >
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent hidden sm:inline">
            DevPrep
          </span>
        </button>

        {/* Desktop Navigation Links - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1">
          <NavLinks />
        </div>

        {/* Auth Section - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {/* Clerk User (Candidate) */}
          <SignedIn>
            <div className="relative flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/interview")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden lg:inline">Prep</span>
              </Button>
              {dashboardPath ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(dashboardPath)}
                  className="gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden lg:inline">Dashboard</span>
                </Button>
              ) : null}
              <span className="text-sm font-medium hidden lg:inline">
                Hi, <span className="text-primary">{candidateDisplayName}</span>
              </span>
              <ThemeToggle />
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-muted transition"
                onClick={handleToggleNotifications}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <UserButton afterSignOutUrl="/" />

              {showNotifications && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-md border bg-popover shadow-lg">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/40">
                    <div className="flex gap-1 rounded-full bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setNotificationFilter("all")}
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                          notificationFilter === "all"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationFilter("unread")}
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                          notificationFilter === "unread"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Unread
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto text-xs">
                    {visibleNotifications.length === 0 ? (
                      <div className="px-3 py-4 text-muted-foreground text-xs">
                        No notifications yet.
                      </div>
                    ) : (
                      visibleNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleClickNotification(n)}
                          className={`flex w-full flex-col px-3 py-2 text-left hover:bg-muted/60 ${
                            n.isRead ? "opacity-70" : "bg-muted/40"
                          }`}
                        >
                          <span className="text-[11px] font-semibold">{n.title}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-2">
                            {n.message}
                          </span>
                          <span className="mt-1 text-[10px] text-muted-foreground/80">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </SignedIn>

          {/* Staff User (Admin/Recruiter) */}
          {isStaffLoggedIn && (
            <div className="flex items-center gap-2">
              {dashboardPath ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(dashboardPath)}
                  className="gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden lg:inline">Dashboard</span>
                </Button>
              ) : null}
              <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-primary/5">
                <div className="flex flex-col items-end hidden lg:flex">
                  <span className="text-xs font-medium">{customUser.firstName} {customUser.lastName}</span>
                  <span className="text-xs text-muted-foreground">{customUser.role}</span>
                </div>
                {customUser.avatarUrl ? (
                  <img 
                    src={customUser.avatarUrl} 
                    alt="Avatar" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">
                      {customUser.firstName?.[0]}{customUser.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          )}

          {/* Login Button (Guests) */}
          <SignedOut>
            {!isStaffLoggedIn && (
              <>
                <ThemeToggle />
              <Link to="/login">
                <Button size="sm" variant="default">
                  Login
                </Button>
              </Link>
              </>
            )}
          </SignedOut>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Auth - Show UserButton or Login */}
          <SignedIn>
            <Button variant="ghost" size="sm" onClick={() => navigate("/interview")} className="p-2">
              <FileText className="h-5 w-5" />
            </Button>
            {dashboardPath ? (
              <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)} className="p-2">
                <LayoutDashboard className="h-5 w-5" />
              </Button>
            ) : null}
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          {isStaffLoggedIn && (
            <>
              {dashboardPath ? (
                <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)} className="p-2">
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              ) : null}
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold">
                {customUser.firstName?.[0]}{customUser.lastName?.[0]}
              </span>
            </div>
            <ThemeToggle />
            </>
          )}
          <SignedOut>
            {!isStaffLoggedIn && (
              <Link to="/login">
                <Button size="sm" variant="default">
                  Login
                </Button>
              </Link>
            )}
          </SignedOut>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <NavLinks mobile={true} onLinkClick={() => setMobileMenuOpen(false)} />
            
            {/* Mobile Prep Button for Candidates */}
            <SignedIn>
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/interview");
                }}
                className="w-full justify-start gap-2"
              >
                <FileText className="h-4 w-4" />
                Interview Prep
              </Button>
            </SignedIn>
            
            {/* Mobile Staff Logout */}
            {isStaffLoggedIn && (
              <Button 
                variant="ghost" 
                size="default" 
                onClick={handleLogout}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
      </nav>
    </>
  );
};

export default Navbar;
