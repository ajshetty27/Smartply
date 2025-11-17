import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Search,
  Loader2,
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  Star,
  Save,
  X,
  Sparkles,
  Briefcase,
  Lightbulb,
  Target,
  TrendingUp,
  Brain,
} from 'lucide-react';
import { apiService, ScoutedJob } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function ScoutPage() {
  const [jobs, setJobs] = useState<ScoutedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ScoutedJob | null>(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);
  const [searching, setSearching] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const { toast } = useToast();

  const loadExistingJobs = async () => {
    try {
      setLoading(true);
      const scoutedJobs = await apiService.getScoutedJobs('new');
      setJobs(scoutedJobs);
    } catch (error) {
      console.error('Failed to load scouted jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExistingJobs();
  }, []);

  const handleSearch = async () => {
    try {
      setSearching(true);
      const scoutedJobs = await apiService.searchScoutJobs({
        location: jobDescription || undefined,
        max_results: 20,
      });
      
      setJobs(scoutedJobs);
      
      toast({
        title: 'Success!',
        description: `Found ${scoutedJobs.length} matching jobs`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to search for jobs',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSaveJob = async (job: ScoutedJob) => {
    try {
      await apiService.performJobAction(job.id, 'save');
      setJobs(jobs.filter(j => j.id !== job.id));
      
      toast({
        title: 'Job Saved!',
        description: 'Added to your jobs list',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save job',
        variant: 'destructive',
      });
    }
  };

  const handleDismissJob = async (job: ScoutedJob) => {
    try {
      await apiService.performJobAction(job.id, 'dismiss');
      setJobs(jobs.filter(j => j.id !== job.id));
      
      toast({
        title: 'Job Dismissed',
        description: 'Removed from recommendations',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to dismiss job',
        variant: 'destructive',
      });
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      const recs = await apiService.getJobSearchRecommendations();
      setRecommendations(recs);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load recommendations',
        variant: 'destructive',
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleJobClick = (job: ScoutedJob, index: number) => {
    setSelectedJob(job);
    setSelectedJobIndex(index);
  };

  const handlePreviousJob = () => {
    if (selectedJobIndex > 0) {
      const newIndex = selectedJobIndex - 1;
      setSelectedJobIndex(newIndex);
      setSelectedJob(jobs[newIndex]);
    }
  };

  const handleNextJob = () => {
    if (selectedJobIndex < jobs.length - 1) {
      const newIndex = selectedJobIndex + 1;
      setSelectedJobIndex(newIndex);
      setSelectedJob(jobs[newIndex]);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-green-400';
    return 'text-orange-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-green-500/20 border-green-500/30';
    return 'bg-orange-500/20 border-orange-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-8 h-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">Scout</h1>
            </div>
            <p className="text-gray-400">
              AI-powered job recommendations based on your resume
            </p>
          </div>
          <Button
            onClick={() => {
              setShowRecommendations(true);
              if (!recommendations) {
                loadRecommendations();
              }
            }}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Brain className="w-4 h-4" />
            Search Recs
          </Button>
        </div>

        {/* Search Controls */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Describe the type of job you're looking for (e.g., Remote software engineer, Data analyst in NYC, Marketing manager)"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white px-8"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Find Jobs for Me
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Describe what you're looking for and we'll find the best matches based on your resume
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {jobs.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="py-24 text-center">
              <Briefcase className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Jobs Found Yet
              </h3>
              <p className="text-gray-400 mb-6">
                Click "Find Jobs for Me" to discover opportunities tailored to your resume
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Recommended Jobs ({jobs.length})
              </h2>
              <div className="text-sm text-gray-400">
                Sorted by relevance score
              </div>
            </div>

            {/* Carousel */}
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {jobs.map((job, index) => (
                    <CarouselItem key={job.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4 xl:basis-1/5">
                      <Card 
                        className="h-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-green-500/50 transition-all cursor-pointer"
                        onClick={() => handleJobClick(job, index)}
                      >
                      <CardContent className="p-6 flex flex-col h-full">
                        {/* Score Badge */}
                        <div className={`inline-flex items-center gap-1 self-start px-2 py-1 rounded-full text-xs font-semibold mb-4 border ${getScoreBg(job.relevance_score)}`}>
                          <Star className={`w-3 h-3 ${getScoreColor(job.relevance_score)}`} />
                          <span className={getScoreColor(job.relevance_score)}>
                            {job.relevance_score.toFixed(0)}% Match
                          </span>
                        </div>

                        {/* Company */}
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-300">
                            {job.company}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">
                          {job.title}
                        </h3>

                        {/* Location */}
                        {job.location && (
                          <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{job.location}</span>
                          </div>
                        )}

                        {/* Salary */}
                        <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                          <DollarSign className="w-3 h-3" />
                          <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                        </div>

                        {/* Contract Type */}
                        {job.contract_type && (
                          <div className="mb-4">
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {job.contract_type}
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                          {job.description?.replace(/<[^>]*>/g, '') || 'No description available'}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          <Button
                            size="sm"
                            onClick={() => handleSaveJob(job)}
                            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissJob(job)}
                            className="flex-1 gap-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-3 h-3" />
                            Pass
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => window.open(job.redirect_url, '_blank')}
                          className="w-full mt-2 gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Apply
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
                </CarouselContent>
                <CarouselPrevious className="bg-black/40 border-white/10 text-white hover:bg-white/10 -left-4" />
                <CarouselNext className="bg-black/40 border-white/10 text-white hover:bg-white/10 -right-4" />
              </Carousel>
            </div>
          </div>
        )}

        {/* Job Details Modal */}
        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-black/90 backdrop-blur-xl border-white/10 overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-2xl text-white flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-green-400" />
                  {selectedJob?.company}
                </DialogTitle>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${selectedJob && getScoreBg(selectedJob.relevance_score)}`}>
                  <Star className={`w-4 h-4 ${selectedJob && getScoreColor(selectedJob.relevance_score)}`} />
                  <span className={selectedJob && getScoreColor(selectedJob.relevance_score)}>
                    {selectedJob?.relevance_score.toFixed(0)}% Match
                  </span>
                </div>
              </div>
            </DialogHeader>

            {selectedJob && (
              <div className="space-y-6">
                {/* Job Title */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedJob.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    {selectedJob.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedJob.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {formatSalary(selectedJob.salary_min, selectedJob.salary_max)}
                    </div>
                    {selectedJob.contract_type && (
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {selectedJob.contract_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Job Description</h4>
                  <div 
                    className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedJob.description || 'No description available' }}
                  />
                </div>

                {/* Navigation and Actions */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousJob}
                      disabled={selectedJobIndex === 0}
                      className="gap-2"
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextJob}
                      disabled={selectedJobIndex === jobs.length - 1}
                      className="gap-2"
                    >
                      Next →
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveJob(selectedJob);
                        setSelectedJob(null);
                      }}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleDismissJob(selectedJob);
                        setSelectedJob(null);
                      }}
                      className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4" />
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(selectedJob.redirect_url, '_blank')}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Job Recommendations Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          showRecommendations ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {showRecommendations && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-green-400" />
                  <h2 className="text-2xl font-bold text-white">Job Search Recommendations</h2>
                </div>
                <p className="text-gray-400 text-sm">
                  AI-powered search strategies based on your resume
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommendations(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingRecommendations ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div>
              ) : recommendations ? (
                <>
                  {/* LinkedIn Queries */}
                  {recommendations.linkedin_queries && recommendations.linkedin_queries.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">LinkedIn Search Queries</h3>
                      </div>
                      <div className="space-y-2">
                        {recommendations.linkedin_queries.map((query: string, index: number) => (
                          <div
                            key={index}
                            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <p className="text-white font-mono text-sm">{query}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indeed Queries */}
                  {recommendations.indeed_queries && recommendations.indeed_queries.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Search className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Indeed Search Queries</h3>
                      </div>
                      <div className="space-y-2">
                        {recommendations.indeed_queries.map((query: string, index: number) => (
                          <div
                            key={index}
                            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <p className="text-white font-mono text-sm">{query}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Strategies */}
                  {recommendations.strategies && recommendations.strategies.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Search Strategies</h3>
                      </div>
                      <div className="space-y-3">
                        {recommendations.strategies.map((strategy: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-white/5 border border-white/10 rounded-lg"
                          >
                            <h4 className="text-white font-semibold mb-2">{strategy.title}</h4>
                            <p className="text-gray-400 text-sm">{strategy.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Skills to Highlight */}
                  {recommendations.key_skills && recommendations.key_skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Key Skills to Highlight</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.key_skills.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400">
                  <p>No recommendations available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
