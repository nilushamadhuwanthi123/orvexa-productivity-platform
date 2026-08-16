import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useUIStore } from './store/uiStore.js';
import AppLayout from './layouts/AppLayout.jsx';
import Toasts from './components/ui/Toasts.jsx';
import CustomCursor from './components/ui/CustomCursor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Loading } from './components/ui/States.jsx';

// Route-level code splitting keeps the initial bundle small.
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace.jsx'));
const MyWork = lazy(() => import('./pages/MyWork.jsx'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Forbidden = lazy(() => import('./pages/Forbidden.jsx'));

function RequireAuth({ children, roles }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <Loading label="Restoring your session…" />;
  if (status !== 'authenticated') return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle' || status === 'loading') return <Loading />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);
  const online = useUIStore((s) => s.online);
  const toast = useUIStore((s) => s.toast);
  const { pathname } = useLocation();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Honest connectivity feedback — never claim data was saved while offline.
  useEffect(() => {
    if (status === 'idle') return;
    if (!online) {
      toast({
        title: "You're offline",
        description: 'Changes will not be saved until the connection returns.',
        tone: 'warning',
        duration: 0,
      });
    } else {
      toast({ title: 'Back online', tone: 'success', duration: 2600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <ErrorBoundary>
      <CustomCursor />

      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
            <Route path="/my-work" element={<MyWork />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/team" element={<Team />} />
            <Route
              path="/admin"
              element={
                <RequireAuth roles={['admin']}>
                  <Admin />
                </RequireAuth>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <Toasts />
    </ErrorBoundary>
  );
}
