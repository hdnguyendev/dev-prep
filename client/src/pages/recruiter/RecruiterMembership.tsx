import { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MembershipPlan {
  id: string;
  name: string;
  planType: "FREE" | "VIP";
  role: string;
  price: number;
  currency: "VND" | "USD" | "EUR" | "JPY";
  duration: number;
  maxJobPostings?: number | null;
  rankedCandidateList: boolean;
  directCandidateContact: boolean;
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
    jobsPosted?: number;
    jobsLimit?: number | null;
    jobsRemaining?: number | null;
  };
}

export default function RecruiterMembership() {
  const currentUser = getCurrentUser();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
          const res = await apiClient.getPaymentStatus(currentOrderCode, currentUser?.id);

          if (res.success && res.data) {
            const transaction = res.data.transaction;
            
            if (transaction.status === "COMPLETED") {
              // Payment completed!
              setSuccess("Payment successful! Your VIP membership has been activated.");
              setCurrentOrderCode(null);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              await loadData(); // Reload to show updated status
            } else if (transaction.status === "FAILED" || transaction.status === "CANCELED" || transaction.status === "EXPIRED") {
              // Payment failed/canceled/expired
              setCurrentOrderCode(null);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (transaction.status === "FAILED") {
                setError("Payment failed. Please try again.");
              }
            }
            // PENDING - continue polling
          }
        } catch {
        }
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentOrderCode, currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load plans for RECRUITER role
      const plansRes = await apiClient.getMembershipPlans("RECRUITER");
      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }

      // Load status
      const statusRes = await apiClient.getMembershipStatus(currentUser?.id);
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
    } catch {
      setError("Failed to load membership information");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderCode: string) => {
    try {
      const res = await apiClient.getPaymentStatus(orderCode, currentUser?.id);

      if (res.success && res.data) {
        if (res.data.status === "COMPLETED") {
          setSuccess("Payment successful! Your VIP membership has been activated.");
          await loadData(); // Reload to show updated status
        } else if (res.data.status === "FAILED") {
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

      // Backend will automatically create returnUrl and cancelUrl with correct orderCode
      const returnUrl = "";
      const cancelUrl = "";

      const res = await apiClient.purchaseMembership(planId, returnUrl, cancelUrl, currentUser?.id);

      if (res.success && res.data) {
        const url = res.data.paymentLinkUrl || res.data.paymentUrl;
        const orderCode = res.data.orderCode;
        if (url && orderCode) {
          // Open payment in new tab and start polling
          setCurrentOrderCode(orderCode);
          window.open(url, "_blank");
        } else {
          throw new Error("Payment URL or orderCode not found in response");
        }
      } else {
        throw new Error(res.message || "Failed to create payment link");
      }
    } catch {
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
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Membership Plans</h1>
        <p className="text-muted-foreground">Choose the plan that works best for you</p>
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
            <CardDescription>Your current plan and features</CardDescription>
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

            {/* Job Postings Usage */}
            {status.usage.jobsLimit !== null && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Job Postings Used</span>
                  <span className="font-medium">
                    {status.usage.jobsPosted || 0} / {status.usage.jobsLimit === null ? "∞" : status.usage.jobsLimit}
                  </span>
                </div>
                {status.usage.jobsRemaining !== null && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, ((status.usage.jobsPosted || 0) / status.usage.jobsLimit!) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {status.usage.jobsRemaining} job{status.usage.jobsRemaining !== 1 ? "s" : ""} remaining
                    </p>
                  </div>
                )}
                {status.usage.jobsRemaining === 0 && currentPlan === "FREE" && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    You've reached your job posting limit. Upgrade to VIP for unlimited job postings.
                  </p>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Plans Comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FREE Plan */}
        {freePlan && (
          <Card className={currentPlan === "FREE" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{freePlan.name}</span>
                {currentPlan === "FREE" && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </CardTitle>
              <CardDescription>{freePlan.description || "Perfect for getting started"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {formatPrice(freePlan.price, freePlan.currency)}
                <span className="text-sm text-muted-foreground font-normal"> / forever</span>
              </div>
              <ul className="space-y-2">
                {freePlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                {currentPlan === "FREE" ? "Your Current Plan" : "Free Forever"}
              </Button>
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span>{vipPlan.name}</span>
                </div>
              </CardTitle>
              <CardDescription>{vipPlan.description || "Unlock premium features"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 text-yellow-600">
                {formatPrice(vipPlan.price, vipPlan.currency)}
                <span className="text-sm text-muted-foreground font-normal"> / {vipPlan.duration} days</span>
              </div>
              <ul className="space-y-2">
                {vipPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === "VIP" ? (
                <Button variant="outline" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0" disabled>
                  <Crown className="h-4 w-4 mr-2" />
                  Your VIP Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0"
                  onClick={() => handlePurchase(vipPlan.id)}
                  disabled={purchasing === vipPlan.id}
                >
                  {purchasing === vipPlan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to VIP
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

