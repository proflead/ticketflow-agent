import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { RecordsPage } from "./pages/RecordsPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { LoginPage } from "./pages/LoginPage";
import { RunsPage } from "./pages/RunsPage";
import { TasksPage } from "./pages/TasksPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CaseDetailsPage } from "./pages/CaseDetailsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { TaskDetailsPage } from "./pages/TaskDetailsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/cases/:caseId" element={<CaseDetailsPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </AppShell>
  );
}
