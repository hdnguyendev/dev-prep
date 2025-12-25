import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ClipboardList, FileText, Heart, Zap, Building2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

type QuickLink = {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
};

const LINKS: QuickLink[] = [
  { label: "Interviews", href: "/interviews", icon: <Calendar className="h-4 w-4" />, description: "Xem lịch + feedback phỏng vấn" },
  { label: "Applications", href: "/applications", icon: <ClipboardList className="h-4 w-4" />, description: "Track jobs you have applied to" },
  { label: "Saved jobs", href: "/saved-jobs", icon: <Heart className="h-4 w-4" />, description: "Your list of saved jobs" },
  { label: "Followed companies", href: "/followed-companies", icon: <Building2 className="h-4 w-4" />, description: "Companies you are following" },
  { label: "Interview prep", href: "/interview", icon: <FileText className="h-4 w-4" />, description: "Luyện phỏng vấn" },
];

export default function QuickAccessMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden md:inline">Quick</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick access</DialogTitle>
          <DialogDescription>Mở nhanh các mục cá nhân (không đặt trực tiếp trên navbar).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 md:grid-cols-2">
          {LINKS.map((l) => (
            <Button key={l.href} variant="outline" className="h-auto items-start justify-start gap-3 py-3" onClick={() => go(l.href)}>
              <div className="mt-0.5">{l.icon}</div>
              <div className="text-left">
                <div className="text-sm font-medium">{l.label}</div>
                <div className="text-xs text-muted-foreground">{l.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}


