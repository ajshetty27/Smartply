import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, FileText } from 'lucide-react';
import { apiService } from '@/lib/api';

interface JobInputProps {
  sessionId: string;
  onJobAdded: () => void;
}

export function JobInput({ sessionId, onJobAdded }: JobInputProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL input state
  const [url, setUrl] = useState('');

  // Manual input state
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.submitJobURL({
        url,
        session_id: sessionId,
      });
      setUrl('');
      onJobAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.submitJobManual({
        job_title: jobTitle,
        company_name: companyName,
        location: location || undefined,
        job_description: jobDescription,
        session_id: sessionId,
      });
      setJobTitle('');
      setCompanyName('');
      setLocation('');
      setJobDescription('');
      onJobAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Job Posting</CardTitle>
        <CardDescription>
          Copy and paste job details directly (recommended) or try submitting a URL
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Manual Entry (Recommended)
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Job URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form onSubmit={handleURLSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Job URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-sm text-yellow-400/80">
                  Note: URL scraping may be slow or fail. Manual entry is faster and more reliable.
                </p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping job details...
                  </>
                ) : (
                  'Add Job from URL'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  placeholder="Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Tech Company Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                  disabled={loading}
                  rows={8}
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving job...
                  </>
                ) : (
                  'Add Job Manually'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
