import { Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { useMembership } from "@/hooks/useMembership";
import { apiClient } from "@/lib/api";

interface VIPBadgeProps {
  /**
   * Show badge only if user is VIP
   * @default true
   */
  onlyIfVIP?: boolean;
  /**
   * Size of the badge
   * @default "sm"
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Show as icon only (no text)
   * @default false
   */
  iconOnly?: boolean;
  /**
   * Show as simple badge (rectangle with text, no icon)
   * @default false
   */
  simple?: boolean;
  /**
   * Custom className
   */
  className?: string;
  /**
   * User ID for custom user (recruiter/admin)
   */
  userId?: string;
  /**
   * User role for custom user
   */
  userRole?: "RECRUITER" | "ADMIN" | "CANDIDATE";
  /**
   * Custom text to show instead of "VIP"
   */
  customText?: string;
}

/**
 * VIP Badge Component
 * Displays a VIP badge with tooltip showing membership privileges
 */
export function VIPBadge({
  onlyIfVIP = true,
  size = "sm",
  iconOnly = false,
  simple = false,
  className = "",
  userId,
  userRole,
  customText
}: VIPBadgeProps) {
  const { isVIP: candidateIsVIP, membershipStatus: candidateMembershipStatus, loading: candidateLoading } = useMembership();

  // State for custom users (recruiters/admins)
  const [customIsVIP, setCustomIsVIP] = useState<boolean>(false);
  const [customMembershipStatus, setCustomMembershipStatus] = useState<any>(null);
  const [customLoading, setCustomLoading] = useState<boolean>(false);

  // Determine which user type we're dealing with
  const isCustomUser = Boolean(userId && userRole);
  const isVIP = isCustomUser ? customIsVIP : candidateIsVIP;
  const membershipStatus = isCustomUser ? customMembershipStatus : candidateMembershipStatus;
  const loading = isCustomUser ? customLoading : candidateLoading;

  // Fetch membership for custom users
  useEffect(() => {
    if (!isCustomUser || !userId) return;

    const fetchMembership = async () => {
      try {
        setCustomLoading(true);
        const res = await apiClient.getMembershipStatus(userId);

        if (res.success && res.data) {
          const planType = (res.data as any).usage?.planType;
          setCustomIsVIP(planType === "VIP");
          setCustomMembershipStatus(res.data);
        } else {
          setCustomIsVIP(false);
        }
      } catch {
        setCustomIsVIP(false);
      } finally {
        setCustomLoading(false);
      }
    };

    fetchMembership();
  }, [userId, userRole, isCustomUser]);

  // Don't show if onlyIfVIP is true and user is not VIP
  if (onlyIfVIP && !isVIP) {
    return null;
  }

  // Show loading state
  if (loading) {
    return null;
  }

  const features = membershipStatus?.membership?.plan.features || [];
  const planName = membershipStatus?.usage.planName || "VIP";

  // Determine display text
  const displayText = customText || (userRole ? `VIP ${userRole}` : "VIP");

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  const iconSize = sizeClasses[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center ${className}`}>
            {simple ? (
              <Badge
                variant="default"
                className="bg-yellow-500 text-white border-yellow-600 font-semibold px-2 py-0.5 text-xs rounded"
              >
                {displayText}
              </Badge>
            ) : iconOnly ? (
              <div className={`relative ${size === "xl" ? "animate-bounce" : size === "lg" ? "animate-pulse" : ""}`}>
                <Crown className={`${iconSize} text-yellow-500 fill-yellow-500 drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]`} />
                {size === "xl" && (
                  <div className="absolute inset-0 -z-10 bg-yellow-400/30 rounded-full blur-md animate-ping" />
                )}
              </div>
            ) : (
              <Badge
                variant="default"
                className="gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400"
              >
                <Crown className={iconSize} />
                {!iconOnly && <span>{displayText}</span>}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              {planName} {userRole ? `${userRole} ` : ""}Membership
            </div>
            <div className="text-xs space-y-1">
              <p className="font-medium text-muted-foreground mb-2">VIP Privileges:</p>
              <ul className="list-disc list-inside space-y-1">
                {features.length > 0 ? (
                  features.slice(0, 5).map((feature: string, idx: number) => (
                    <li key={idx} className="text-xs">{feature}</li>
                  ))
                ) : (
                  <>
                    <li>Unlimited interviews</li>
                    <li>Full CV-Job matching insights</li>
                    <li>Priority support</li>
                    <li>Exclusive features</li>
                  </>
                )}
              </ul>
              {membershipStatus?.membership?.endDate && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Expires: {new Date(membershipStatus.membership.endDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

