import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PDFViewer } from '@/components/PDFViewer';
import { JobInput } from '@/components/JobInput';
import { apiService } from '@/lib/api';
import type { Job, UserProfile } from '@/lib/api';
import { Loader2, FileText, Briefcase, User, Save, Eye, Upload, MapPin, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DashboardPage() {
  const { toast } = useToast();
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('smartply_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('smartply_session_id', id);
    }
    return id;
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [baseResume, setBaseResume] = useState<any>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [processedJobs, setProcessedJobs] = useState<Job[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [jobsTab, setJobsTab] = useState<'processed' | 'pending'>('processed');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState<string>('');
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [addJobOpen, setAddJobOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProfile(),
        loadBaseResume(),
        loadProcessedJobs(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const userProfile = await apiService.getUserProfile(sessionId);
      setProfile(userProfile);
      if (userProfile.id > 0) {
        setProfileForm({
          full_name: userProfile.full_name || '',
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          location: userProfile.location || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadBaseResume = async () => {
    try {
      const resume = await apiService.getBaseResume(sessionId);
      setBaseResume(resume);
    } catch (error) {
      console.error('Failed to load base resume:', error);
    }
  };

  const loadProcessedJobs = async () => {
    try {
      // Load jobs with cover letters (processed)
      const jobsWithCoverLetters = await apiService.getJobsWithCoverLetters(sessionId);
      setProcessedJobs(jobsWithCoverLetters);
      
      // Load all jobs to find pending ones
      const allJobsList = await apiService.getJobs(sessionId);
      setAllJobs(allJobsList);
      
      // Find pending jobs (jobs without cover letters)
      const processedIds = new Set(jobsWithCoverLetters.map(j => j.id));
      const pending = allJobsList.filter(job => !processedIds.has(job.id));
      setPendingJobs(pending);
      
      // Select first job if available
      if (jobsWithCoverLetters.length > 0) {
        setSelectedJob(jobsWithCoverLetters[0]);
        await loadCoverLetter(jobsWithCoverLetters[0].id);
      }
    } catch (error) {
      console.error('Failed to load processed jobs:', error);
    }
  };

  const loadCoverLetter = async (jobId: number) => {
    setLoadingCoverLetter(true);
    try {
      const coverLetter = await apiService.getCoverLetter(jobId);
      setCoverLetterContent(coverLetter.content);
    } catch (error) {
      console.error('Failed to load cover letter:', error);
      setCoverLetterContent('No cover letter found for this job.');
    } finally {
      setLoadingCoverLetter(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiService.saveUserProfile({
        session_id: sessionId,
        ...profileForm,
      });
      toast({
        title: 'Success',
        description: 'Profile saved successfully',
      });
      await loadProfile();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    setUploadingResume(true);
    try {
      await apiService.uploadResume(sessionId, file);
      toast({
        title: 'Success',
        description: 'Resume uploaded successfully',
      });
      await loadBaseResume();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload resume',
        variant: 'destructive',
      });
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  const handleJobSelect = async (job: Job) => {
    setSelectedJob(job);
    await loadCoverLetter(job.id);
  };

  const handleJobAdded = () => {
    loadProcessedJobs();
    setAddJobOpen(false);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Manage your profile, resume, and cover letters</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Resume */}
          <div className="lg:col-span-1">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="resume">Resume</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="john@example.com"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-gray-300">Location</Label>
                      <Input
                        id="location"
                        value={profileForm.location}
                        onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                        placeholder="San Francisco, CA"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="w-full gap-2 bg-white hover:bg-white/90 text-black"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="resume" className="mt-4">
                    {baseResume ? (
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium truncate">{baseResume.filename}</h3>
                              <p className="text-xs text-gray-400">
                                Uploaded {new Date(baseResume.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-3">
                            Active Resume
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                              onClick={() => setPdfViewerOpen(true)}
                            >
                              <Eye className="w-4 h-4" />
                              View PDF
                            </Button>
                            <input
                              type="file"
                              accept=".pdf"
                              id="resume-upload"
                              className="hidden"
                              onChange={handleResumeUpload}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                              onClick={() => document.getElementById('resume-upload')?.click()}
                              disabled={uploadingResume}
                            >
                              {uploadingResume ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                        <div className="w-12 h-12 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">No Resume</h3>
                        <p className="text-sm text-gray-400 mb-4">
                          Upload a base resume for automatic cover letter generation
                        </p>
                        <input
                          type="file"
                          accept=".pdf"
                          id="resume-upload"
                          className="hidden"
                          onChange={handleResumeUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('resume-upload')?.click()}
                          disabled={uploadingResume}
                          className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                        >
                          {uploadingResume ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Resume
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Jobs */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Your Jobs</span>
                  <div className="flex items-center gap-3">
                    <Tabs value={jobsTab} onValueChange={(v) => setJobsTab(v as 'processed' | 'pending')} className="w-auto">
                      <TabsList className="bg-white/5">
                        <TabsTrigger value="processed" className="data-[state=active]:bg-white data-[state=active]:text-black">
                          Processed ({processedJobs.length})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-black">
                          Pending ({pendingJobs.length})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button 
                      onClick={() => setAddJobOpen(true)} 
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Job
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobsTab === 'processed' && processedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400 mb-4">No processed jobs yet</p>
                    <Button onClick={() => setAddJobOpen(true)} className="gap-2 bg-white hover:bg-white/90 text-black font-semibold">
                      <Plus className="w-4 h-4" />
                      Add Job
                    </Button>
                  </div>
                ) : jobsTab === 'pending' && pendingJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400 mb-4">No pending jobs - all jobs have cover letters!</p>
                  </div>
                ) : jobsTab === 'processed' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Job List */}
                    <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {processedJobs.map((job) => (
                        <Card
                          key={job.id}
                          className={`cursor-pointer transition-all ${
                            selectedJob?.id === job.id
                              ? 'bg-white/10 border-purple-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                          onClick={() => handleJobSelect(job)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
                              {job.job_title}
                            </h3>
                            <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                              {job.company_name}
                            </p>
                            {job.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Job Details with Tabs */}
                    <div className="lg:col-span-2">
                      {selectedJob ? (
                        <Tabs defaultValue="description" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 bg-white/5">
                            <TabsTrigger value="description" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                              Job Description
                            </TabsTrigger>
                            <TabsTrigger value="cover-letter" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                              Cover Letter
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="description" className="mt-4">
                            <div className="bg-white/5 rounded-lg p-6 border border-white/10 max-h-[500px] overflow-y-auto">
                              <h2 className="text-xl font-bold text-white mb-2">
                                {selectedJob.job_title}
                              </h2>
                              <p className="text-lg text-gray-300 mb-4">{selectedJob.company_name}</p>
                              {selectedJob.location && (
                                <div className="flex items-center gap-2 text-gray-400 mb-4">
                                  <MapPin className="w-4 h-4" />
                                  {selectedJob.location}
                                </div>
                              )}
                              <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 whitespace-pre-wrap">
                                  {selectedJob.job_description}
                                </p>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="cover-letter" className="mt-4">
                            <div className="bg-white/5 rounded-lg p-6 border border-white/10 max-h-[500px] overflow-y-auto">
                              {loadingCoverLetter ? (
                                <div className="flex items-center justify-center py-12">
                                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                </div>
                              ) : (
                                <div className="prose prose-invert max-w-none">
                                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {coverLetterContent}
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  // Pending Jobs View
                  <div className="space-y-3">
                    {pendingJobs.map((job) => (
                      <Card
                        key={job.id}
                        className="bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">
                                {job.job_title}
                              </h3>
                              <p className="text-sm text-gray-400 mb-2">
                                {job.company_name}
                              </p>
                              {job.location && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {job.location}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => {
                                // Navigate to cover letter generation
                                window.location.href = `/cover-letters/generate/${job.id}`;
                              }}
                            >
                              <FileText className="w-4 h-4" />
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {baseResume && (
        <PDFViewer
          open={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          pdfUrl={`http://localhost:8000/api/resumes/${sessionId}/pdf`}
          title={baseResume.filename}
        />
      )}

      {/* Add Job Dialog */}
      <Dialog open={addJobOpen} onOpenChange={setAddJobOpen}>
        <DialogContent className="max-w-2xl bg-black/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Job</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a job posting to generate a cover letter
            </DialogDescription>
          </DialogHeader>
          <JobInput sessionId={sessionId} onJobAdded={handleJobAdded} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
