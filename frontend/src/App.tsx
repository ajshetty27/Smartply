import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JobsPage } from '@/pages/JobsPage';
import { CoverLettersPage } from '@/pages/CoverLettersPage';
import { GenerateCoverLetterPage } from '@/pages/GenerateCoverLetterPage';
import { CoverLetterViewPage } from '@/pages/CoverLetterViewPage';
import { ScoutPage } from '@/pages/ScoutPage';
import { QnABankPage } from '@/pages/QnABankPage';
import { Toaster } from '@/components/ui/toaster';
import { authService } from '@/lib/auth';

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="cover-letters" element={<CoverLettersPage />} />
          <Route path="cover-letters/generate/:jobId" element={<GenerateCoverLetterPage />} />
          <Route path="cover-letters/view/:jobId" element={<CoverLetterViewPage />} />
          <Route path="scout" element={<ScoutPage />} />
          <Route path="qna-bank" element={<QnABankPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
