const sections = [
  { label: 'Index', anchor: '#experience-index', description: 'Operating grade' },
  { label: 'Command', anchor: '#executive-command-center', description: 'Control room' },
  { label: 'AI', anchor: '#ai-copilot', description: 'Copilot panel' },
  { label: 'Heatmap', anchor: '#risk-heatmap', description: 'Risk clusters' },
  { label: 'Graph', anchor: '#relationship-graph', description: 'Dependencies' },
  { label: 'Board', anchor: '#board-mode', description: 'C-level view' },
  { label: 'Cockpit', anchor: '#executive-cockpit', description: 'Health center' },
  { label: 'Activity', anchor: '#operational-feed', description: 'Work in motion' },
  { label: 'Evidence', anchor: '#evidence-graph', description: 'Connected proof' },
  { label: 'Answers', anchor: '#ai-executive-layer', description: 'Board answers' },
  { label: 'Reports', anchor: '#board-report-center', description: 'Executive package' },
  { label: 'Enterprise', anchor: '#enterprise-governance', description: 'Workflow/RBAC' },
  { label: 'Marketplace', anchor: '#marketplace-expansion', description: 'Frameworks' },
];

export function DashboardSectionNavigator() {
  return (
    <nav className="sticky top-3 z-30 rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-2 text-white shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-slate-950/75">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((section) => (
          <a
            key={section.anchor}
            href={section.anchor}
            className="group min-w-32 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 transition hover:border-primary/50 hover:bg-white/[0.08]"
          >
            <p className="text-sm font-semibold leading-none">{section.label}</p>
            <p className="mt-1 text-xs text-slate-500 transition group-hover:text-slate-300">{section.description}</p>
          </a>
        ))}
      </div>
    </nav>
  );
}
