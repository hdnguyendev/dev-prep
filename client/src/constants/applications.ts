import type { Application } from "@/lib/api";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Eye,
  MailCheck,
  Send,
  Star,
  Undo2,
  XCircle,
} from "lucide-react";

export const EMPTY_TABLE_PLACEHOLDER = "—" as const;

export type ApplicationStatusMeta = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

export const APPLICATION_STATUS_META: Record<
  Application["status"],
  ApplicationStatusMeta
> = {
  APPLIED: { label: "Applied", Icon: Send },
  REVIEWING: { label: "Reviewing", Icon: Eye },
  SHORTLISTED: { label: "Shortlisted", Icon: Star },
  INTERVIEW_SCHEDULED: { label: "Interview scheduled", Icon: CalendarClock },
  INTERVIEWED: { label: "Interviewed", Icon: MailCheck },
  OFFER_SENT: { label: "Offer sent", Icon: BadgeCheck },
  HIRED: { label: "Hired", Icon: CheckCircle2 },
  REJECTED: { label: "Rejected", Icon: XCircle },
  WITHDRAWN: { label: "Withdrawn", Icon: Undo2 },
};


