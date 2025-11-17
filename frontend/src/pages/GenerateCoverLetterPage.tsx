import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GenerateCoverLetterModal } from '@/components/GenerateCoverLetterModal';
import { apiService } from '@/lib/api';
import type { Job } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export function GenerateCoverLetterPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        navigate('/');
        return;
      }

      try {
        // Load all jobs for the user
        const jobs = await apiService.getJobs('all');
        const foundJob = jobs.find((j) => j.id === parseInt(jobId));

        if (foundJob) {
          setJob(foundJob);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load job:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return <GenerateCoverLetterModal jobTitle={job.job_title} jobId={job.id} />;
}
