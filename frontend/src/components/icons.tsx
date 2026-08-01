// Minimal hand-drawn stroke icon set (no external icon library dependency).
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) =>
  base(
    <>
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M5.5 9v9.5a1 1 0 0 0 1 1H9v-6h6v6h2.5a1 1 0 0 0 1-1V9" />
    </>,
    p,
  )

export const FolderIcon = (p: IconProps) =>
  base(
    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" />,
    p,
  )

export const BookIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
    </>,
    p,
  )

export const TerminalIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="m7 10 2.5 2L7 14" />
      <path d="M12.5 14h4.5" />
    </>,
    p,
  )

export const WorkflowIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3.5" y="4" width="5" height="5" rx="1" />
      <rect x="15.5" y="4" width="5" height="5" rx="1" />
      <rect x="9.5" y="15" width="5" height="5" rx="1" />
      <path d="M6 9v3a3 3 0 0 0 3 3h1M18 9v3a3 3 0 0 1-3 3h-1" />
    </>,
    p,
  )

export const SparklesIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 3.5 13.4 8l4.6 1.5-4.6 1.5L12 15.5 10.6 11 6 9.5 10.6 8 12 3.5Z" />
      <path d="M18.5 15.5 19.2 17.5 21 18.2 19.2 19 18.5 21 17.8 19 16 18.2 17.8 17.5 18.5 15.5Z" />
    </>,
    p,
  )

export const CalendarClockIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <circle cx="15.5" cy="15" r="3" />
      <path d="M15.5 13.5V15l1 .8" />
    </>,
    p,
  )

export const WavesIcon = (p: IconProps) =>
  base(
    <>
      <path d="M3 8c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M3 14c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M3 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    </>,
    p,
  )

export const DatabaseIcon = (p: IconProps) =>
  base(
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
      <path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" />
    </>,
    p,
  )

export const SearchIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.5-4.5" />
    </>,
    p,
  )

export const GitBranchIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7v10" />
      <path d="M6 12c0 4 5 4 8 4M18 10V8" />
    </>,
    p,
  )

export const QualityIcon = (p: IconProps) =>
  base(
    <>
      <path d="m9 12 2 2 4-4" />
      <circle cx="12" cy="12" r="8.5" />
    </>,
    p,
  )

export const ChartBarIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>,
    p,
  )

export const BeakerIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 3h6M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7 15h10" />
    </>,
    p,
  )

export const FlaskIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 3h6M9.5 3v5l-5 10a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3l-5-10V3" />
      <path d="M7.5 14h9" />
    </>,
    p,
  )

export const BoxStackIcon = (p: IconProps) =>
  base(
    <>
      <path d="m3.5 8 8.5-4.5L20.5 8 12 12.5 3.5 8Z" />
      <path d="m3.5 8 0 8 8.5 4.5 8.5-4.5V8" />
      <path d="M12 12.5V21" />
    </>,
    p,
  )

export const CpuIcon = (p: IconProps) =>
  base(
    <>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <rect x="3.5" y="10" width="2" height="4" />
      <rect x="18.5" y="10" width="2" height="4" />
      <rect x="10" y="3.5" width="4" height="2" />
      <rect x="10" y="18.5" width="4" height="2" />
    </>,
    p,
  )

export const ActivityIcon = (p: IconProps) =>
  base(<path d="M3 12h4l2.5-7L14 19l2.5-7H21" />, p)

export const LinkIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 13 4.5a3.5 3.5 0 1 1 5 5L16 11.5" />
      <path d="M13 17.5 11 19.5a3.5 3.5 0 1 1-5-5l2-2" />
    </>,
    p,
  )

export const ChatIcon = (p: IconProps) =>
  base(
    <path d="M4 5.5h16v10H9l-4 4v-4H4v-10Z" />,
    p,
  )

export const ShieldIcon = (p: IconProps) =>
  base(<path d="M12 3.5 19 6v6c0 5-3 8-7 8.5-4-.5-7-3.5-7-8.5V6l7-2.5Z" />, p)

export const HeartPulseIcon = (p: IconProps) =>
  base(
    <path d="M3 12h4l1.5-3L11 15l2-6 1.5 3H21" />,
    p,
  )

export const PlugIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 3v6M15 3v6" />
      <path d="M6.5 9h11v3a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z" />
      <path d="M12 17v4" />
    </>,
    p,
  )

export const ChevronDownIcon = (p: IconProps) => base(<path d="m6 9 6 6 6-6" />, p)

export const LogOutIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
    p,
  )
