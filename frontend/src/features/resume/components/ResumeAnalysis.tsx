import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Code2,
  FolderGit2,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

import type { Resume } from "../types";

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const, delay: 0.05 * i },
});

const SKILL_GROUPS: { key: string; label: string; chip: string }[] = [
  {
    key: "technical",
    label: "Technical",
    chip: "bg-brand-50 text-brand-700 ring-brand-600/15 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-400/20",
  },
  {
    key: "tool",
    label: "Tools & platforms",
    chip: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-400/20",
  },
  {
    key: "soft",
    label: "Soft skills",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20",
  },
];

function formatMonth(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function dateRange(start?: string | null, end?: string | null, isCurrent?: boolean) {
  const from = formatMonth(start);
  const to = isCurrent ? "Present" : formatMonth(end);
  if (!from && !to) return null;
  return [from, to].filter(Boolean).join(" – ");
}

function Section({
  icon,
  title,
  count,
  children,
  className,
  index,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
  index: number;
}) {
  return (
    <motion.div {...fadeUp(index)} className={className}>
      <Card className="h-full">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-900/40 dark:text-brand-300">
            {icon}
          </span>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          {count !== undefined && (
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {count}
            </span>
          )}
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400 dark:text-slate-500">{children}</p>;
}

function InsightList({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={cn("mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", tone)}>
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current", tone)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResumeAnalysis({ resume }: { resume: Resume }) {
  const { t } = useTranslation();
  const { insight, skills, experiences, projects, education_history: education, certifications } = resume;

  const groupedSkills = SKILL_GROUPS.map((g) => ({ ...g, items: skills.filter((s) => s.category === g.key) }));
  const otherSkills = skills.filter((s) => !SKILL_GROUPS.some((g) => g.key === s.category));
  if (otherSkills.length) groupedSkills[0].items.push(...otherSkills);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {insight && (insight.summary || insight.strengths.length > 0) && (
        <motion.div {...fadeUp(0)} className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-indigo-50 p-6 shadow-sm dark:border-brand-900/50 dark:from-brand-900/30 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/30">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t("resume.aiInsight", "AI resume insight")}
                </h3>
              </div>
              {insight.summary && (
                <p className="max-w-4xl text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{insight.summary}</p>
              )}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <InsightList
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title={t("resume.strengths", "Strengths")}
                  items={insight.strengths}
                  tone="text-emerald-600 dark:text-emerald-400"
                />
                <InsightList
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  title={t("resume.toImprove", "To improve")}
                  items={insight.weaknesses}
                  tone="text-amber-600 dark:text-amber-400"
                />
                <InsightList
                  icon={<Target className="h-3.5 w-3.5" />}
                  title={t("resume.focusAreas", "Focus areas for interviews")}
                  items={insight.suggested_focus_areas ?? []}
                  tone="text-brand-600 dark:text-brand-400"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <Section index={1} icon={<Code2 className="h-4.5 w-4.5" />} title={t("resume.skills", "Skills")} count={skills.length}>
        {skills.length === 0 ? (
          <Muted>{t("resume.noSkills", "No skills were detected.")}</Muted>
        ) : (
          <div className="space-y-4">
            {groupedSkills
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((skill) => (
                      <span key={skill.id} className={cn("rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset", group.chip)}>
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      <Section
        index={2}
        icon={<Briefcase className="h-4.5 w-4.5" />}
        title={t("resume.experience", "Experience")}
        count={experiences.length}
      >
        {experiences.length === 0 ? (
          <Muted>{t("resume.noExperience", "No work experience found — internships count too!")}</Muted>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5 dark:border-slate-800">
            {experiences.map((exp) => (
              <li key={exp.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900",
                    exp.is_current ? "bg-emerald-500" : "bg-brand-500"
                  )}
                />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.role}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{exp.company}</p>
                {dateRange(exp.start_date, exp.end_date, exp.is_current) && (
                  <p className="mt-0.5 text-xs text-slate-400">{dateRange(exp.start_date, exp.end_date, exp.is_current)}</p>
                )}
                {exp.description && (
                  <p className="mt-1.5 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{exp.description}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        index={3}
        icon={<FolderGit2 className="h-4.5 w-4.5" />}
        title={t("resume.projects", "Projects")}
        count={projects.length}
        className="lg:col-span-2"
      >
        {projects.length === 0 ? (
          <Muted>{t("resume.noProjects", "No projects found. Adding 2–3 projects makes for much better questions.")}</Muted>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/30 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{project.title}</p>
                  {project.duration && <span className="shrink-0 text-xs text-slate-400">{project.duration}</span>}
                </div>
                {project.description && (
                  <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.technologies.slice(0, 6).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        index={4}
        icon={<GraduationCap className="h-4.5 w-4.5" />}
        title={t("resume.education", "Education")}
        count={education.length}
      >
        {education.length === 0 ? (
          <Muted>{t("resume.noEducation", "No education details found.")}</Muted>
        ) : (
          <ul className="space-y-4">
            {education.map((edu) => (
              <li key={edu.id}>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{edu.institution}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {[dateRange(edu.start_date, edu.end_date), edu.grade && `Grade: ${edu.grade}`].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        index={5}
        icon={<Award className="h-4.5 w-4.5" />}
        title={t("resume.certifications", "Certifications")}
        count={certifications.length}
      >
        {certifications.length === 0 ? (
          <Muted>{t("resume.noCertifications", "No certifications found.")}</Muted>
        ) : (
          <ul className="space-y-3">
            {certifications.map((cert) => (
              <li key={cert.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <Award className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{cert.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {[cert.issuer, formatMonth(cert.issue_date)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
