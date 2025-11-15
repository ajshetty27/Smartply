import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { JobsPage } from '@/pages/JobsPage';
import { CoverLettersPage } from '@/pages/CoverLettersPage';
import { GenerateCoverLetterPage } from '@/pages/GenerateCoverLetterPage';
import { CoverLetterViewPage } from '@/pages/CoverLetterViewPage';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="cover-letters" element={<CoverLettersPage />} />
          <Route path="cover-letters/generate/:jobId" element={<GenerateCoverLetterPage />} />
          <Route path="cover-letters/view/:jobId" element={<CoverLetterViewPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
