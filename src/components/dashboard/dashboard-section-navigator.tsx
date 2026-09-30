const sections = [
  { label: 'Index', anchor: '#experience-index', description: 'Operating grade' },
  { label: 'Command', anchor: '#executive-command-center', description: 'Control room' },
  { label: 'AI', anchor: '#ai-copilot', description: 'Copilot panel' },
  { label: 'Heatmap', anchor: '#risk-heatmap', description: 'Risk clusters' },
  { label: 'Graph', anchor: '#relationship-graph', description: 'Dependencies' },
  { label: 'Board', anchor: '#board-mode', description: 'C-level view' },
  { label: 'Simulate', anchor: '#scenario-simulator', description: 'Score lift' },
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
    <nav className="sticky top-3 z-30 rounded-xl border border-slate-800 bg-[#080e18]/95 p-2 text-white shadow-lg backdrop-blur supports-[backdrop-filter]:bg-[#080e18]/85" aria-label="Dashboard sections">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((section) => (
          <a
            key={section.anchor}
            href={section.anchor}
            className="group min-w-32 rounded-lg border border-slate-800 bg-[#0d1624] px-3 py-2.5 transition hover:border-blue-500/50 hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          >
            <p className="text-sm font-semibold leading-none text-slate-100">{section.label}</p>
            <p className="mt-1 text-xs text-slate-600 transition group-hover:text-slate-400">{section.description}</p>
          </a>
        ))}
      </div>
    </nav>
  );
}
