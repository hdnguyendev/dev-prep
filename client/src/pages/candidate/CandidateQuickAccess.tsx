import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Heart } from "lucide-react";
import { useNavigate } from "react-router";

export default function CandidateQuickAccess() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick access</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Button variant="outline" className="h-auto items-start justify-start gap-3 py-4" onClick={() => navigate("/interview")}>
          <FileText className="mt-0.5 h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Prep</div>
            <div className="text-xs text-muted-foreground">Luyện phỏng vấn</div>
          </div>
        </Button>
        <Button variant="outline" className="h-auto items-start justify-start gap-3 py-4" onClick={() => navigate("/candidate/saved-jobs")}>
          <Heart className="mt-0.5 h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Saved jobs</div>
            <div className="text-xs text-muted-foreground">Các job bạn đã lưu</div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}


