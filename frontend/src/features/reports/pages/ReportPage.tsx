import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Compass,
  Download,
  FileWarning,
  FolderGit2,
  GraduationCap,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useTheme } from "@/hooks/useTheme";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { toneDot, toneText, type ToneKey } from "@/styles/tone";

import { interviewsApi } from "../../interviews/api";
import type { InterviewSessionDetail } from "../../interviews/types";
import { reportsApi } from "../api";
import type { HiringRecommendation, InterviewReport } from "../types";

const HIRING_BADGE_TONE: Record<Exclude<HiringRecommendation, "">, "green" | "brand" | "amber" | "red"> = {
  strong_hire: "green",
  hire: "brand",
  no_hire: "amber",
  strong_no_hire: "red",
};

function ListSection({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  tone: ToneKey;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${toneText[tone]}`} />
          {title}
        </CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[tone]}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ReportPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void Promise.all([interviewsApi.retrieve(id), reportsApi.retrieveBySession(id)])
      .then(([sessionRes, reportRes]) => {
        setSession(sessionRes.data);
        setReport(reportRes);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !report) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={FileWarning}
          title={t("report.notReady")}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate(`/interviews/${id}`)}>
              {t("report.backToSession")}
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const radarColor = theme === "dark" ? "#818cf8" : "#4f46e5";

  const scoreBreakdown = [
    { label: t("report.technical"), value: Number(report.technical_score) },
    { label: t("report.communication"), value: Number(report.communication_score) },
    { label: t("report.confidence"), value: Number(report.confidence_score) },
    { label: t("report.bodyLanguage"), value: Number(report.body_language_score) },
    { label: t("report.eyeContact"), value: Number(report.eye_contact_score) },
    { label: t("report.resumeMatch"), value: Number(report.resume_matching_score) },
    { label: t("report.voiceClarity"), value: Number(report.voice_clarity_score) },
    { label: t("report.grammar"), value: Number(report.grammar_score) },
    { label: t("report.problemSolving"), value: Number(report.problem_solving_score) },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {session.avatar_name} &middot; {new Date(report.generated_at).toLocaleDateString()}
              </p>
              <p className="text-5xl font-bold text-brand-600 dark:text-brand-400">
                {Math.round(Number(report.overall_score))}
                <span className="text-xl text-slate-400 dark:text-slate-500">/100</span>
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("report.overallScore")}</p>
            </div>
            <div className="flex-1" />
            {report.pdf_file && (
              <Button variant="outline" size="sm" onClick={() => window.open(report.pdf_file!, "_blank")}>
                <Download className="h-4 w-4" />
                {t("report.downloadPdf")}
              </Button>
            )}
          </div>

          {report.spoken_summary && (
            <blockquote className="mt-6 rounded-xl border-l-4 border-brand-500 bg-brand-50 p-4 text-sm italic text-slate-700 dark:bg-brand-950/30 dark:text-slate-300">
              &ldquo;{report.spoken_summary}&rdquo;
            </blockquote>
          )}

          {report.hiring_recommendation && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("report.hiringRecommendation")}:
              </span>
              <Badge tone={HIRING_BADGE_TONE[report.hiring_recommendation]}>
                {report.hiring_recommendation_display}
              </Badge>
              {report.hiring_recommendation_reason && (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {report.hiring_recommendation_reason}
                </span>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("report.scoreBreakdown")}</CardTitle>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={scoreBreakdown} outerRadius="75%">
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="label" tick={{ fill: tickColor, fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={radarColor} fill={radarColor} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ListSection icon={CheckCircle2} title={t("report.strengths")} items={report.strengths} tone="success" />
          <ListSection icon={Sparkles} title={t("report.weaknesses")} items={report.weaknesses} tone="warning" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ListSection
            icon={Lightbulb}
            title={t("report.improvementTips")}
            items={report.improvement_tips}
            tone="brand"
          />
          <ListSection
            icon={GraduationCap}
            title={t("report.learningRoadmap")}
            items={report.learning_roadmap}
            tone="brand"
          />
          <ListSection
            icon={Compass}
            title={t("report.careerSuggestions")}
            items={report.career_suggestions}
            tone="brand"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ListSection
            icon={BookOpen}
            title={t("report.recommendedCourses")}
            items={report.recommended_courses}
            tone="brand"
          />
          <ListSection
            icon={BadgeCheck}
            title={t("report.recommendedCertifications")}
            items={report.recommended_certifications}
            tone="brand"
          />
          <ListSection
            icon={FolderGit2}
            title={t("report.recommendedProjects")}
            items={report.recommended_projects}
            tone="brand"
          />
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <Award className="h-4 w-4" />
            {t("report.backToDashboard")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
