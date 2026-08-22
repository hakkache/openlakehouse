import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import {
  HomeIcon,
  FolderIcon,
  BookIcon,
  TerminalIcon,
  WorkflowIcon,
  SparklesIcon,
  CalendarClockIcon,
  WavesIcon,
  DatabaseIcon,
  SearchIcon,
  GitBranchIcon,
  QualityIcon,
  ChartBarIcon,
  BeakerIcon,
  FlaskIcon,
  BoxStackIcon,
  CpuIcon,
  ActivityIcon,
  PlugIcon,
  ChatIcon,
  ShieldIcon,
  HeartPulseIcon,
  LogOutIcon,
  ChevronDownIcon,
  LinkIcon,
} from '../components/icons'
import type { ComponentType, SVGProps } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'openlakehouse.sidebarCollapsed'

interface NavItem {
  to: string
  label: string
  end?: boolean
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Home', end: true, icon: HomeIcon }],
  },
  {
    label: 'Build',
    items: [
      { to: '/workspace', label: 'Workspace', icon: FolderIcon },
      { to: '/notebooks', label: 'Notebooks', icon: BookIcon },
      { to: '/sql', label: 'SQL', icon: TerminalIcon },
      { to: '/pipelines', label: 'Pipelines', icon: WorkflowIcon },
      { to: '/nocode', label: 'No-Code Builder', icon: SparklesIcon },
      { to: '/dbt', label: 'dbt', icon: BoxStackIcon },
      { to: '/jobs', label: 'Jobs', icon: CalendarClockIcon },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/streaming', label: 'Streaming', icon: WavesIcon },
      { to: '/catalog', label: 'Catalog', icon: DatabaseIcon },
      { to: '/explorer', label: 'Data Explorer', icon: SearchIcon },
      { to: '/lineage', label: 'Lineage', icon: GitBranchIcon },
      { to: '/er-diagram', label: 'ER Diagram', icon: LinkIcon },
      { to: '/quality', label: 'Data Quality', icon: QualityIcon },
    ],
  },
  {
    label: 'Analytics & ML',
    items: [
      { to: '/dashboards', label: 'Dashboards', icon: ChartBarIcon },
      { to: '/ml', label: 'ML', icon: BeakerIcon },
      { to: '/experiments', label: 'Experiments', icon: FlaskIcon },
      { to: '/models', label: 'Models', icon: BoxStackIcon },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/git', label: 'Git', icon: GitBranchIcon },
      { to: '/compute', label: 'Compute', icon: CpuIcon },
      { to: '/monitoring', label: 'Monitoring', icon: ActivityIcon },
      { to: '/connections', label: 'Connections', icon: PlugIcon },
    ],
  },
  {
    label: 'Assistant & Admin',
    items: [
      { to: '/assistant', label: 'AI Assistant', icon: ChatIcon },
      { to: '/admin', label: 'Admin', icon: ShieldIcon },
      { to: '/health', label: 'Platform Health', icon: HeartPulseIcon },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

export default function MainLayout() {
  const { authenticated, username, roles, login, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  const currentLabel =
    ALL_ITEMS.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      ?.label ?? 'OpenLakehouse'

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={`slim-scroll flex shrink-0 flex-col overflow-y-auto border-r border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950 py-4 transition-[width] duration-200 ${
          collapsed ? 'w-14 px-1.5' : 'w-64 px-3'
        }`}
      >
        <div className={`mb-6 flex items-center gap-2.5 px-2 ${collapsed ? 'justify-center px-0' : ''}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-950/50">
            OL
          </span>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-white">OpenLakehouse</span>}
        </div>
        <nav className="flex flex-1 flex-col gap-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                          collapsed ? 'justify-center px-0' : ''
                        } ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-950/40'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
          <p className="truncate whitespace-nowrap text-sm font-semibold text-slate-700">{currentLabel}</p>
          {authenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {username?.[0]?.toUpperCase() ?? '?'}
                </span>
                <span className="text-sm text-slate-700">{username}</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {roles[0] ?? 'no role'}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <LogOutIcon className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500"
            >
              Login
            </button>
          )}
        </header>
        <main className="slim-scroll flex-1 overflow-y-auto">
          <div className="mx-auto h-full w-full max-w-7xl animate-fade-in px-8 py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

