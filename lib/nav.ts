// Site map: vizion-infra/learning/architecture/dashboard.md (decided 2026-11-05).
// Icons are resolved in the Sidebar (client component) by slug.
export type NavItem = { slug: string; href: string; label: string; purpose: string; sections: string[] };

export const NAV: NavItem[] = [
  { slug: "", href: "/", label: "Overview", purpose: "What needs me right now",
    sections: ["Status tiles", "Needs your attention", "Activity feed", "Client strip"] },
  { slug: "dashboards", href: "/dashboards", label: "Dashboards", purpose: "Performance over time, charts only",
    sections: ["Trading", "Marketing", "Finances", "Operations", "AI & Models", "Opportunities"] },
  { slug: "clients", href: "/clients", label: "Clients", purpose: "Simple per-client overview",
    sections: ["Client list", "Summary", "Marketing", "Content", "Sites", "Finances", "Workflows", "New client"] },
  { slug: "finances", href: "/finances", label: "Finances", purpose: "VisionCorp's own money, including trading",
    sections: ["Summary", "Trading", "Revenue", "Costs", "Payments"] },
  { slug: "io", href: "/io", label: "Input / Output", purpose: "Applications and anything fillable",
    sections: ["Applications", "Fill a form", "Drafts", "Reviews", "Submissions", "Deadlines & Follow-ups",
      "Profiles & Documents", "Intake", "Published", "Actions log"] },
  { slug: "opportunities", href: "/opportunities", label: "Opportunities", purpose: "Finding things to apply for",
    sections: ["Contracts", "Grants", "Jobs", "Leads", "Sources", "Research"] },
  { slug: "ops", href: "/ops", label: "Operations", purpose: "System health, workflows, agents, security",
    sections: ["Services", "Workflows", "Schedules", "Tasks", "Agents", "Alerts & Reports", "Maintenance",
      "Security", "Edge & Domains", "Workspaces"] },
  { slug: "personal", href: "/personal", label: "Personal", purpose: "Own calendar, tasks, reminders",
    sections: ["Calendar", "Tasks & Reminders", "Notes", "Social drafts"] },
  { slug: "settings", href: "/settings", label: "Settings", purpose: "Access, integrations",
    sections: ["Users & access", "Integrations", "Notifications", "About"] },
];
