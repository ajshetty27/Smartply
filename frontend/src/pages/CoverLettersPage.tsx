import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiService } from '@/lib/api';
import type { Job } from '@/lib/api';
import { Loader2, LayoutGrid, List, FileText, ExternalLink, Trash2, Eye, Briefcase, Plus, Wand2 } from 'lucide-react';

type ViewMode = 'table' | 'grid';

interface CoverLetterWithJob {
  id: number;
  job_id: number;
  content: string;
  generated_at: string;
  job_title: string;
  company_name: string;
  job_url: string | null;
}

export function CoverLettersPage() {
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('smartply_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('smartply_session_id', id);
    }
    return id;
  });

  const [coverLetters, setCoverLetters] = useState<CoverLetterWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [jobSelectOpen, setJobSelectOpen] = useState(false);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCoverLetters();
  }, [sessionId]);

  const loadCoverLetters = async () => {
    try {
      setLoading(true);
      const jobs = await apiService.getJobsWithCoverLetters(sessionId);
      
      // Load cover letter data for each job
      const coverLettersData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const coverLetter = await apiService.getCoverLetter(job.id);
            return {
              id: coverLetter.id,
              job_id: job.id,
              content: coverLetter.content,
              generated_at: coverLetter.generated_at,
              job_title: job.job_title,
              company_name: job.company_name,
              job_url: job.url,
            };
          } catch (error) {
            console.error(`Failed to load cover letter for job ${job.id}:`, error);
            return null;
          }
        })
      );

      setCoverLetters(coverLettersData.filter((cl): cl is CoverLetterWithJob => cl !== null));
    } catch (error) {
      console.error('Failed to load cover letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    
    try {
      await apiService.deleteJob(jobId);
      await loadCoverLetters();
    } catch (error) {
      console.error('Failed to delete cover letter:', error);
      alert('Failed to delete cover letter. Please try again.');
    }
  };

  const handleView = (jobId: number) => {
    navigate(`/cover-letters/view/${jobId}`);
  };

  const handleOpenJobSelect = async () => {
    setJobSelectOpen(true);
    setLoadingJobs(true);
    try {
      const jobs = await apiService.getJobs(sessionId);
      setAllJobs(jobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSelectJob = (jobId: number) => {
    navigate(`/cover-letters/generate/${jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Cover Letters</h2>
            <p className="text-gray-400">
              Manage your generated cover letters
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                Table
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </Button>
            </div>
            <Button
              onClick={handleOpenJobSelect}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Generate Cover Letter
            </Button>
          </div>
        </div>

        {coverLetters.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="py-24 text-center">
              <Briefcase className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Cover Letters Yet
              </h3>
              <p className="text-gray-400 mb-6">
                Generate your first cover letter from a job posting
              </p>
              <Button onClick={() => navigate('/jobs')} variant="outline">
                Go to Jobs
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-300">Cover Letter</TableHead>
                  <TableHead className="text-gray-300">Job Title</TableHead>
                  <TableHead className="text-gray-300">Company</TableHead>
                  <TableHead className="text-gray-300">Generated</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverLetters.map((coverLetter) => (
                  <TableRow 
                    key={coverLetter.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        Cover Letter #{coverLetter.id}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{coverLetter.job_title}</TableCell>
                    <TableCell className="text-gray-300">{coverLetter.company_name}</TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(coverLetter.generated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(coverLetter.job_id)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {coverLetter.job_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(coverLetter.job_url || '', '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coverLetter.job_id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverLetters.map((coverLetter) => (
              <Card
                key={coverLetter.id}
                className="bg-black/40 backdrop-blur-xl border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => handleView(coverLetter.job_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex gap-2">
                      {coverLetter.job_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(coverLetter.job_url || '', '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(coverLetter.job_id);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                    {coverLetter.job_title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                    {coverLetter.company_name}
                  </p>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                    {coverLetter.content.substring(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Generated {new Date(coverLetter.generated_at).toLocaleDateString()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(coverLetter.job_id);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Selection Dialog */}
      <Dialog open={jobSelectOpen} onOpenChange={setJobSelectOpen}>
        <DialogContent className="max-w-4xl bg-black/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Select a Job</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a job posting to generate a cover letter for
            </DialogDescription>
          </DialogHeader>
          
          {loadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No jobs found. Add a job first.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-300">Job Title</TableHead>
                    <TableHead className="text-gray-300">Company</TableHead>
                    <TableHead className="text-gray-300">Location</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allJobs.map((job) => {
                    const hasCoverLetter = coverLetters.some(cl => cl.job_id === job.id);
                    return (
                      <TableRow key={job.id} className="border-white/10">
                        <TableCell className="text-white font-medium">{job.job_title}</TableCell>
                        <TableCell className="text-gray-300">{job.company_name}</TableCell>
                        <TableCell className="text-gray-300">{job.location || 'N/A'}</TableCell>
                        <TableCell>
                          {hasCoverLetter ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Has Cover Letter
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">
                              No Cover Letter
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSelectJob(job.id)}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Wand2 className="w-4 h-4" />
                            Generate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
