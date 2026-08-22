import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import HealthPage from '../pages/HealthPage'
import WorkspacePage from '../pages/WorkspacePage'
import NotebooksPage from '../pages/NotebooksPage'
import SQLPage from '../pages/SQLPage'
import PipelinesPage from '../pages/PipelinesPage'
import DbtPage from '../pages/DbtPage'
import LineagePage from '../pages/LineagePage'
import ERDiagramPage from '../pages/ERDiagramPage'
import QualityPage from '../pages/QualityPage'
import StreamingPage from '../pages/StreamingPage'
import AssistantPage from '../pages/AssistantPage'
import ComputePage from '../pages/ComputePage'
import CatalogPage from '../pages/CatalogPage'
import ExplorerPage from '../pages/ExplorerPage'
import DashboardsPage from '../pages/DashboardsPage'
import MLPage from '../pages/MLPage'
import ExperimentsPage from '../pages/ExperimentsPage'
import ModelsPage from '../pages/ModelsPage'
import GitPage from '../pages/GitPage'
import JobsPage from '../pages/JobsPage'
import MonitoringPage from '../pages/MonitoringPage'
import AdminPage from '../pages/AdminPage'
import ConnectionsPage from '../pages/ConnectionsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/notebooks" element={<NotebooksPage />} />
        <Route path="/sql" element={<SQLPage />} />
        <Route path="/pipelines" element={<PipelinesPage />} />
        <Route path="/nocode" element={<PipelinesPage />} />
        <Route path="/dbt" element={<DbtPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/lineage" element={<LineagePage />} />
        <Route path="/er-diagram" element={<ERDiagramPage />} />
        <Route path="/quality" element={<QualityPage />} />
        <Route path="/streaming" element={<StreamingPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/dashboards" element={<DashboardsPage />} />
        <Route path="/ml" element={<MLPage />} />
        <Route path="/experiments" element={<ExperimentsPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/git" element={<GitPage />} />
        <Route path="/compute" element={<ComputePage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/health" element={<HealthPage />} />
      </Route>
    </Routes>
  )
}

