import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Home, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";

const InterviewThankYouPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [interviewData, setInterviewData] = useState<{
    jobTitle?: string;
    companyName?: string;
  } | null>(null);

  useEffect(() => {
    const loadInterviewInfo = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const token = await getToken().catch(() => undefined);
        const res = await apiClient.getInterview(id, token);
        if (res.success && res.data) {
          setInterviewData({
            jobTitle: (res.data as any).job?.title,
            companyName: (res.data as any).job?.company?.name,
          });
        }
      } catch (err) {
        console.error("Failed to load interview info:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInterviewInfo();
  }, [id, getToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle2 className="h-20 w-20 text-emerald-500 animate-pulse" />
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-ping" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Thank you for joining the interview!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            We appreciate your time and effort. Your responses are now being reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {interviewData?.jobTitle && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Vị trí ứng tuyển / Position:</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {interviewData.jobTitle}
                  </p>
                  {interviewData.companyName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {interviewData.companyName}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Vui lòng chờ kết quả / Please wait for results
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Nhà tuyển dụng sẽ xem xét phản hồi từ cuộc phỏng vấn và liên hệ với bạn trong thời gian sớm nhất.
                      <br />
                      The recruiter will review the interview feedback and contact you as soon as possible.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Thông báo qua email / Email notification
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bạn sẽ nhận được thông báo qua email khi có kết quả mới.
                      <br />
                      You will receive an email notification when there are new results.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => navigate("/candidate/applications")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Xem đơn ứng tuyển / View Applications
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Về trang chủ / Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewThankYouPage;


