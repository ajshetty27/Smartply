import type { Job } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, MapPin, Building2, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobListProps {
  jobs: Job[];
  onDelete: (jobId: number) => void;
}

export function JobList({ jobs, onDelete }: JobListProps) {
  const navigate = useNavigate();

  const handleGenerateCoverLetter = (job: Job) => {
    navigate(`/cover-letters/generate/${job.id}`);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'linkedin':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'indeed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'manual':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (jobs.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No jobs added yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first job posting to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Card key={job.id} className="w-full hover:bg-accent/5 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl">{job.job_title}</CardTitle>
                  <Badge className={getSourceBadgeColor(job.source)}>
                    {job.source.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {job.company_name}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleGenerateCoverLetter(job)}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  title="Generate Cover Letter"
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
                {job.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(job.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {job.job_description}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Added {new Date(job.scraped_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
