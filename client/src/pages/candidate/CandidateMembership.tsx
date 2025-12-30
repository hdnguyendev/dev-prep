import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Sparkles, Zap, Infinity as InfinityIcon, TrendingUp, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MembershipPlan {
  id: string;
  name: string;
  planType: "FREE" | "VIP";
  role: string;
  price: number;
  currency: "VND" | "USD" | "EUR" | "JPY";
  duration: number;
  maxInterviews?: number | null;
  maxMatchingViews?: number | null;
  unlimitedInterviews: boolean;
  fullMatchingInsights: boolean;
  features: string[];
  description?: string | null;
}

interface MembershipStatus {
  membership: {
    id: string;
    plan: {
      id: string;
      name: string;
      planType: "FREE" | "VIP";
      features: string[];
    };
    startDate: string;
    endDate: string | null;
    status: string;
  } | null;
  usage: {
    planType: "FREE" | "VIP";
    planName: string;
    interviewsUsed?: number;
    interviewsLimit?: number | null;
    interviewsRemaining?: number | null;
  };
}

export default function CandidateMembership() {
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    progress: number; // Percentage of time remaining (0-100)
  } | null>(null);

  useEffect(() => {
    loadData();
    
    // Check for payment callback
    const urlParams = new URLSearchParams(window.location.search);
    const orderCode = urlParams.get("orderCode");
    const status = urlParams.get("status");
    
    if (orderCode && status === "success") {
      // Payment success - check status
      checkPaymentStatus(orderCode);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "canceled") {
      // Payment canceled - show error message
      setError("Payment was canceled. You can try again or contact support.");
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Poll payment status when orderCode is set (payment initiated)
  useEffect(() => {
    if (currentOrderCode) {
      // Start polling payment status every 3 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const token = await getToken();
          const res = await apiClient.getPaymentStatus(currentOrderCode, token || undefined);

          if (res.success && res.data) {
            const transaction = (res.data as any).transaction;
            
            if (transaction.status === "COMPLETED") {
              // Payment completed!
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setCurrentOrderCode(null);
              setSuccess("Payment successful! Your VIP membership has been activated.");
              await loadData();
            } else if (transaction.status === "FAILED" || transaction.status === "CANCELED") {
              // Payment failed
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setCurrentOrderCode(null);
              setError("Payment failed or was canceled. Please try again.");
            }
            // If still PENDING, continue polling
          } else {
          }
        } catch {
          // Continue polling even if there's an error
        }
      }, 3000); // Poll every 3 seconds

      // Cleanup on unmount or when orderCode is cleared
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [currentOrderCode, getToken]);

  // Listen for postMessage from iframe (if PayOS supports it)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security (adjust to PayOS domain)
      if (event.origin.includes("payos.vn") || event.origin.includes("localhost")) {
        // Note: postMessage won't work when opening in new tab
        // Payment status will be detected via polling instead
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Countdown timer for VIP membership
  useEffect(() => {
    if (!status?.membership?.endDate || !status?.membership?.startDate) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const startDate = new Date(status.membership!.startDate);
      const endDate = new Date(status.membership!.endDate!);
      const now = new Date();
      
      const totalDuration = endDate.getTime() - startDate.getTime();
      const remaining = endDate.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeRemaining({ days: 0, progress: 0 });
        return;
      }

      const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
      const progress = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

      setTimeRemaining({ days, progress });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000 * 60); // Update every minute

    return () => clearInterval(interval);
  }, [status?.membership?.endDate, status?.membership?.startDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansRes, statusRes] = await Promise.all([
        apiClient.getMembershipPlans("CANDIDATE"),
        (async () => {
          const token = await getToken();
          return apiClient.getMembershipStatus(token || undefined);
        })(),
      ]);

      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data as any);
      }

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data as any);
      }
    } catch {
      setError("Failed to load membership information");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderCode: string) => {
    try {
      const token = await getToken();
      const res = await apiClient.getPaymentStatus(orderCode, token || undefined);

      if (res.success && res.data) {
        if ((res.data as any).status === "COMPLETED") {
          setSuccess("Payment successful! Your VIP membership has been activated.");
          await loadData(); // Reload to show updated status
        } else if ((res.data as any).status === "FAILED") {
          setError("Payment failed. Please try again.");
        }
      }
    } catch {
    }
  };

  const handlePurchase = async (planId: string) => {
    try {
      setPurchasing(planId);
      setError(null);
      setSuccess(null);

      const token = await getToken();
      // Backend will automatically create returnUrl and cancelUrl with correct orderCode
      // Just pass empty strings or let backend handle it
      const returnUrl = ""; // Backend will construct this
      const cancelUrl = ""; // Backend will construct this

      const res = await apiClient.purchaseMembership(planId, returnUrl, cancelUrl, token || undefined);

      if (res.success && res.data) {
        const url = (res.data as any).paymentLinkUrl || (res.data as any).paymentUrl;
        const orderCode = (res.data as any).orderCode;
        if (url && orderCode) {
          // Open payment in new tab and start polling
          setCurrentOrderCode(orderCode);
          window.open(url, "_blank"); // Open in new tab
          
          // Start polling to check payment status
          // The polling will continue even after tab is opened
        } else {
          throw new Error("Payment URL or orderCode not found in response");
        }
      } else {
        throw new Error(res.message || "Failed to create payment link");
      }
    } catch (err: any) {
      // Extract error message from response if available
      const errorMessage = err.response?.data?.message || err.message || "Failed to initiate payment. Please try again.";
      setError(errorMessage);
      setPurchasing(null);
    } finally {
      setPurchasing(null);
    }
  };


  const formatPrice = (price: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
      }).format(price);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = status?.membership?.plan.planType || "FREE";
  const vipPlan = plans.find((p) => p.planType === "VIP");
  const freePlan = plans.find((p) => p.planType === "FREE");

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section */}
      <div className="rounded-lg bg-gradient-to-r from-primary/5 to-blue-500/5 p-6 border border-primary/10">
        <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that best fits your career development needs
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Current Membership Status */}
      {status && (
        <Card className={currentPlan === "VIP" ? "border-primary/30 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/10 dark:to-orange-950/10" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${currentPlan === "VIP" ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
              Current Membership
            </CardTitle>
            <CardDescription>Your current plan and usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{status.usage.planName}</p>
                <p className="text-sm text-muted-foreground">
                  {status.membership
                    ? `Active since ${formatDate(status.membership.startDate)}`
                    : "Free plan (no expiration)"}
                </p>
              </div>
              <Badge 
                variant={currentPlan === "VIP" ? "default" : "secondary"}
                className={currentPlan === "VIP" ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0" : ""}
              >
                {currentPlan === "VIP" && <Crown className="h-3 w-3 mr-1" />}
                {currentPlan}
              </Badge>
            </div>

            {status.usage.interviewsLimit !== null && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    Practice Interviews Used
                    {currentPlan === "FREE" && (
                      <span className="text-xs ml-1">(this week)</span>
                    )}
                  </span>
                  <span className="font-medium">
                    {status.usage.interviewsUsed || 0} / {status.usage.interviewsLimit === null ? "∞" : status.usage.interviewsLimit}
                  </span>
                </div>
                {currentPlan === "FREE" && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Scheduled interviews (via access code) are unlimited and don't count towards this limit.
                  </p>
                )}
                {status.usage.interviewsRemaining !== null && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, ((status.usage.interviewsUsed || 0) / status.usage.interviewsLimit!) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {status.usage.interviewsRemaining} practice interview{status.usage.interviewsRemaining !== 1 ? "s" : ""} remaining
                      {currentPlan === "FREE" && " this week"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {status.membership?.endDate && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Expires on: <span className="font-medium">{formatDate(status.membership.endDate)}</span>
                  </span>
                  {timeRemaining && timeRemaining.days > 0 && (
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {timeRemaining.days} day{timeRemaining.days !== 1 ? "s" : ""} left
                    </span>
                  )}
                </div>
                {timeRemaining && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
                        style={{
                          width: `${timeRemaining.progress}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeRemaining.progress.toFixed(1)}% of membership remaining
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Membership Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FREE Plan */}
        {freePlan && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                {freePlan.name}
              </CardTitle>
              <CardDescription>{freePlan.description || "Perfect for getting started"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">Free</div>
                <div className="text-sm text-muted-foreground">Forever</div>
              </div>

              <ul className="space-y-2">
                {freePlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {freePlan.maxInterviews && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      {freePlan.maxInterviews} practice interviews per week
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        (Scheduled interviews via access code are unlimited)
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === "FREE" ? (
                <Button variant="outline" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 font-bold shadow-md" disabled>
                  <Check className="mr-2 h-4 w-4" />
                  Current Plan
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Free Plan
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        {/* VIP Plan */}
        {vipPlan && (
          <Card className="border-2 border-primary relative overflow-hidden bg-gradient-to-br from-yellow-50/30 via-orange-50/20 to-background dark:from-yellow-950/10 dark:via-orange-950/10">
            {currentPlan === "VIP" && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg z-10">
                Active
              </div>
            )}
            
            {currentPlan !== "VIP" && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  Popular
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Crown className="h-4 w-4 text-white fill-white" />
                </div>
                <span className="text-primary font-bold">{vipPlan.name}</span>
              </CardTitle>
              <CardDescription>{vipPlan.description || "Unlock all premium features"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  {formatPrice(vipPlan.price, vipPlan.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  per {vipPlan.duration} days
                </div>
              </div>

              <ul className="space-y-2">
                {vipPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {vipPlan.unlimitedInterviews && (
                  <li className="flex items-start gap-2 text-sm">
                    <InfinityIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Unlimited interviews</span>
                  </li>
                )}
                {vipPlan.fullMatchingInsights && (
                  <li className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Full CV-Job matching insights</span>
                  </li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${currentPlan === "VIP"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 font-bold shadow-lg"
                  : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-md hover:shadow-lg"}`}
                onClick={() => handlePurchase(vipPlan.id)}
                disabled={currentPlan === "VIP" || purchasing === vipPlan.id}
              >
                {purchasing === vipPlan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : currentPlan === "VIP" ? (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Current Plan
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to VIP
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Benefits Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Why Upgrade to VIP?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <InfinityIcon className="h-4 w-4" />
                Unlimited Interviews
              </h4>
              <p className="text-sm text-muted-foreground">
                Practice as much as you need with unlimited AI-powered interview sessions. Perfect your answers and build confidence.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
              <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                Advanced Matching
              </h4>
              <p className="text-sm text-muted-foreground">
                Get detailed insights on how well your CV matches job requirements, with actionable suggestions to improve your profile.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Zap className="h-4 w-4" />
                Priority Support
              </h4>
              <p className="text-sm text-muted-foreground">
                Get faster response times and priority support for any questions or issues you may have.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Crown className="h-4 w-4" />
                Exclusive Features
              </h4>
              <p className="text-sm text-muted-foreground">
                Access to new features and improvements before they're available to free users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Info (when payment tab is open) */}
      {currentOrderCode && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Payment window opened in a new tab</p>
                <p className="text-sm mt-1">
                  Please complete the payment in the new tab. This page will automatically update when payment is confirmed.
                </p>
              </div>
              {pollingIntervalRef.current && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

