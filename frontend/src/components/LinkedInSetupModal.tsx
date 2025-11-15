import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface LinkedInSetupModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function LinkedInSetupModal({ open, onClose, sessionId }: LinkedInSetupModalProps) {
  const { toast } = useToast();
  const [liAtCookie, setLiAtCookie] = useState('');
  const [jsessionidCookie, setJsessionidCookie] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedLiAt = liAtCookie.trim();
    
    if (!trimmedLiAt) {
      toast({
        title: 'Cookie Required',
        description: 'Please enter your li_at cookie value',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await apiService.saveLinkedInCredentials(
        sessionId, 
        trimmedLiAt, 
        jsessionidCookie.trim() || undefined
      );
      toast({
        title: 'Success',
        description: 'LinkedIn credentials saved! You can now scrape job URLs.',
      });
      setLiAtCookie('');
      setJsessionidCookie('');
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save credentials',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure LinkedIn Access</DialogTitle>
          <DialogDescription>
            Add your LinkedIn session cookies to enable automatic job scraping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <InfoIcon className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-sm text-gray-300">
              <strong>How to get your LinkedIn cookies:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Open LinkedIn in your browser and log in</li>
                <li>Open Developer Tools (F12 or Right-click → Inspect)</li>
                <li>Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)</li>
                <li>Click "Cookies" → "https://www.linkedin.com"</li>
                <li>Find and copy the value of the "li_at" cookie</li>
                <li>(Optional) Copy the "JSESSIONID" cookie for better reliability</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="liAtCookie">
              li_at Cookie Value * 
              <a 
                href="https://www.linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                Open LinkedIn
                <ExternalLink className="w-3 h-3" />
              </a>
            </Label>
            <Input
              id="liAtCookie"
              placeholder="Paste your li_at cookie value here"
              value={liAtCookie}
              onChange={(e) => setLiAtCookie(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              This cookie authenticates you with LinkedIn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jsessionidCookie">JSESSIONID Cookie Value (Optional)</Label>
            <Input
              id="jsessionidCookie"
              placeholder="Paste your JSESSIONID cookie value here (optional)"
              value={jsessionidCookie}
              onChange={(e) => setJsessionidCookie(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Additional authentication cookie for better reliability
            </p>
          </div>

          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <InfoIcon className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-sm text-gray-300">
              <strong>Important:</strong> Your cookies are stored locally and only used for scraping job postings. Keep them secure and don't share them.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!liAtCookie.trim() || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save Credentials'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
