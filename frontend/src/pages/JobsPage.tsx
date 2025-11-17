import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobInput } from '@/components/JobInput';
import { LinkedInSetupModal } from '@/components/LinkedInSetupModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { apiService } from '@/lib/api';
import type { Job } from '@/lib/api';
import { Loader2, Settings, CheckCircle2, Plus, LayoutGrid, List, Briefcase, MapPin, ExternalLink, Trash2, Wand2, FileText, Eye, X, Search } from 'lucide-react';

type ViewMode = 'table' | 'grid';

export function JobsPage() {
  const navigate = useNavigate();
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('smartply_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('smartply_session_id', id);
    }
    return id;
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsWithCoverLetters, setJobsWithCoverLetters] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [linkedInSetupOpen, setLinkedInSetupOpen] = useState(false);
  const [hasLinkedInCredentials, setHasLinkedInCredentials] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const checkLinkedInCredentials = async () => {
    try {
      const status = await apiService.getLinkedInCredentialsStatus(sessionId);
      setHasLinkedInCredentials(status.has_credentials);
    } catch (error) {
      console.error('Failed to check LinkedIn credentials:', error);
    }
  };

  const loadJobs = async () => {
    try {
      // Load all jobs for the user (including Scout jobs)
      const fetchedJobs = await apiService.getJobs('all');
      setJobs(fetchedJobs);

      // Check which jobs have cover letters
      const jobsWithCL = await apiService.getJobsWithCoverLetters('all');
      setJobsWithCoverLetters(new Set(jobsWithCL.map(j => j.id)));
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    checkLinkedInCredentials();
  }, [sessionId]);

  const handleJobAdded = () => {
    loadJobs();
    setAddJobOpen(false);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await apiService.deleteJob(jobId);
      setJobs(jobs.filter((job) => job.id !== jobId));
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handleGenerateCoverLetter = (jobId: number) => {
    navigate(`/cover-letters/generate/${jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-blue-400" />
              <h2 className="text-3xl font-bold text-white">Job Postings</h2>
            </div>
            <p className="text-gray-400">
              Add and manage job postings for document generation
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button
              onClick={() => setLinkedInSetupOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              LinkedIn
              {hasLinkedInCredentials && (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
            </Button>
            <Button
              onClick={() => setAddJobOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Job
            </Button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="py-24 text-center">
              <Briefcase className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Jobs Yet
              </h3>
              <p className="text-gray-400 mb-6">
                Add your first job posting to get started
              </p>
              <Button onClick={() => setAddJobOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Job
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-300">Job Title</TableHead>
                  <TableHead className="text-gray-300">Company</TableHead>
                  <TableHead className="text-gray-300">Location</TableHead>
                  <TableHead className="text-gray-300">Source</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow 
                    key={job.id}
                    className="border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-medium text-white">{job.job_title}</TableCell>
                    <TableCell className="text-gray-300">{job.company_name}</TableCell>
                    <TableCell className="text-gray-300">
                      {job.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.source === 'scout' ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          <Search className="w-3 h-3 mr-1" />
                          Scout
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {job.is_scraped ? 'Scraped' : 'Manual'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {jobsWithCoverLetters.has(job.id) ? (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <FileText className="w-3 h-3 mr-1" />
                          Docs Generated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">
                          No Docs
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateCoverLetter(job.id)}
                          className="gap-2 text-purple-400 hover:text-purple-300"
                        >
                          <Wand2 className="w-4 h-4" />
                          Generate
                        </Button>
                        {job.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(job.url || '', '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteJob(job.id)}
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
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="bg-black/40 backdrop-blur-xl border-white/10 hover:bg-white/5 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      {job.source === 'scout' ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          <Search className="w-3 h-3 mr-1" />
                          Scout
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {job.is_scraped ? 'Scraped' : 'Manual'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                    {job.job_title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                    {job.company_name}
                  </p>
                  {job.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </div>
                  )}
                  {jobsWithCoverLetters.has(job.id) && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-4">
                      <FileText className="w-3 h-3 mr-1" />
                      Docs Generated
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => setSelectedJob(job)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-purple-400 hover:text-purple-300"
                      onClick={() => handleGenerateCoverLetter(job.id)}
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                    {job.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(job.url || '', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Job Dialog */}
        <Dialog open={addJobOpen} onOpenChange={setAddJobOpen}>
          <DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">Add Job Posting</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a job by URL or manually enter the details
              </DialogDescription>
            </DialogHeader>
            <JobInput sessionId={sessionId} onJobAdded={handleJobAdded} />
          </DialogContent>
        </Dialog>

        {/* LinkedIn Setup Modal */}
        <LinkedInSetupModal
          open={linkedInSetupOpen}
          onClose={() => {
            setLinkedInSetupOpen(false);
            checkLinkedInCredentials();
          }}
          sessionId={sessionId}
        />
      </div>

      {/* Job Details Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          selectedJob ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedJob && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedJob.is_scraped ? 'Scraped' : 'Manual'}
                  </Badge>
                  {jobsWithCoverLetters.has(selectedJob.id) && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      Docs Generated
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedJob.job_title}
                  {selectedJob.job_title}
                </h2>
                <p className="text-lg text-gray-300 mb-2">
                  {selectedJob.company_name}
                </p>
                {selectedJob.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {selectedJob.location}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Job Description */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Job Description
                  </h3>
                  <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {selectedJob.job_description || 'No description available'}
                  </div>
                </div>

                {/* Job URL */}
                {selectedJob.url && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Job Posting URL
                    </h3>
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-2 break-all"
                    >
                      {selectedJob.url}
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    </a>
                  </div>
                )}

                {/* Added Date */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Added
                  </h3>
                  <p className="text-gray-200">
                    {new Date(selectedJob.scraped_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <Button
                onClick={() => {
                  handleGenerateCoverLetter(selectedJob.id);
                  setSelectedJob(null);
                }}
                className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Wand2 className="w-4 h-4" />
                Generate Documents
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this job?')) {
                    handleDeleteJob(selectedJob.id);
                    setSelectedJob(null);
                  }
                }}
                className="gap-2 text-red-400 hover:text-red-300 border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
