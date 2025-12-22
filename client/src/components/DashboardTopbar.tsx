import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { Briefcase, Building2, Home, LogOut, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { apiClient, type UserNotification } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.svg";

type DashboardTopbarProps = {
  title: string;
};

/**
 * Top navigation for dashboard areas (candidate/admin/recruiter).
 * Keeps dashboard UX consistent even when the main navbar is hidden.
 */
export default function DashboardTopbar({ title }: DashboardTopbarProps) {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const customUser = getCurrentUser();
  const [candidateNameFromDB, setCandidateNameFromDB] = useState<{ firstName?: string | null; lastName?: string | null } | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");

  const isStaff = Boolean(customUser);

  const handleStaffLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch candidate name from database
  useEffect(() => {
    if (!isSignedIn) return;
    const fetchCandidateName = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.success) {
          setCandidateNameFromDB({
            firstName: data.firstName,
            lastName: data.lastName,
          });
        }
      } catch (err) {
        // Ignore errors
      }
    };
    fetchCandidateName();
  }, [isSignedIn, getToken]);

  // Fetch notifications (top 10) for candidate
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

  const handleOpenNotifications = () => {
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

  const candidateDisplayName = useMemo(() => {
    if (candidateNameFromDB?.firstName && candidateNameFromDB?.lastName) {
      return `${candidateNameFromDB.firstName} ${candidateNameFromDB.lastName}`;
    }
    if (clerkUser?.firstName && clerkUser?.lastName) {
      return `${clerkUser.firstName} ${clerkUser.lastName}`;
    }
    return "Account";
  }, [candidateNameFromDB, clerkUser]);

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src={logo} alt="Logo" className="h-7 w-7" />
            <span className="hidden sm:inline font-semibold">DevPrep</span>
          </Link>
          <span className="hidden sm:inline text-sm text-muted-foreground">/</span>
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden lg:inline">Home</span>
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="ghost" size="sm" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden lg:inline">Jobs</span>
            </Button>
          </Link>
          <Link to="/companies">
            <Button variant="ghost" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden lg:inline">Companies</span>
            </Button>
          </Link>

          {/* Candidate (Clerk) */}
          <SignedIn>
            <div className="relative flex items-center gap-2">
              <span className="hidden lg:inline text-sm font-medium">
                Hi, <span className="text-primary">{candidateDisplayName}</span>
              </span>
              <ThemeToggle />
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-muted transition"
                onClick={handleOpenNotifications}
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

          {/* Staff (custom auth) */}
          {isStaff && !isSignedIn && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-medium">
                  {customUser?.firstName} {customUser?.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{customUser?.role}</span>
              </div>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleStaffLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          )}

          <SignedOut>
            {!isStaff && (
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
      </div>
    </div>
  );
}


