import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Lock, Mail, Users, ShieldCheck, User as UserIcon } from "lucide-react";
import { login, getCurrentUser } from "../lib/auth";
import { SignInButton, useUser } from "@clerk/clerk-react";

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"staff" | "candidate">("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for existing authentication
  const { user: clerkUser } = useUser();
  const customUser = getCurrentUser();

  // Redirect if already logged in
  useEffect(() => {
    if (clerkUser) {
      // Clerk user (Candidate) - redirect to dashboard
      navigate("/dashboard");
    } else if (customUser) {
      // Custom user (Staff) - redirect based on role
      if (customUser.role === "ADMIN") {
        navigate("/admin");
      } else if (customUser.role === "RECRUITER") {
        navigate("/recruiter");
      }
    }
  }, [clerkUser, customUser, navigate]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter both email and password");
        return;
      }

      const result = await login(email, password);

      if (result.success && result.user) {
        // Redirect based on role
        if (result.user.role === "ADMIN") {
          navigate("/admin");
        } else if (result.user.role === "RECRUITER") {
          navigate("/recruiter");
        } else {
          setError("Invalid role. Staff login is for Admin and Recruiter only.");
        }
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue to your dashboard</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Choose your login method below</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "staff" | "candidate")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="staff" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value="candidate" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  Candidate
                </TabsTrigger>
              </TabsList>

              {/* Staff Login (Admin & Recruiter) */}
              <TabsContent value="staff" className="space-y-4">
                <div className="text-sm text-muted-foreground text-center py-2">
                  For <strong>Admins</strong> and <strong>Recruiters</strong> only
                </div>

                <form onSubmit={handleStaffLogin} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-email@company.com"
                        className="w-full pl-10 pr-3 py-2 border rounded-md bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3 py-2 border rounded-md bg-background"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      <span>Admin</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span>Recruiter</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm border-t pt-4">
                  <span className="text-muted-foreground">New recruiter? </span>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={() => navigate("/register")}
                  >
                    Create an account
                  </Button>
                </div>
              </TabsContent>

              {/* Candidate Login (Clerk) */}
              <TabsContent value="candidate" className="space-y-4">
                <div className="text-sm text-muted-foreground text-center py-2">
                  For <strong>Job Seekers</strong> and <strong>Candidates</strong>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <UserIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Candidate Account</h4>
                        <p className="text-xs text-muted-foreground">
                          Apply for jobs, track applications, and prepare for interviews
                        </p>
                      </div>
                    </div>
                  </div>

                  <SignInButton mode="modal">
                    <Button className="w-full" variant="default">
                      Sign In as Candidate
                    </Button>
                  </SignInButton>

                  <div className="text-center text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <button className="text-primary hover:underline font-medium">
                      Sign up
                    </button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>© 2024 Dev Prep. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
