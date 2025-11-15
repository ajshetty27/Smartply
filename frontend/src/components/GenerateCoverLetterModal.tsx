import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface GenerateCoverLetterModalProps {
  jobTitle: string;
  jobId: number;
}

export function GenerateCoverLetterModal({ jobTitle, jobId }: GenerateCoverLetterModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResume, setExistingResume] = useState<any>(null);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingResume, setLoadingResume] = useState(true);

  useEffect(() => {
    const checkExistingResume = async () => {
      try {
        const sessionId = localStorage.getItem('smartply_session_id') || '';
        const resume = await apiService.getBaseResume(sessionId);
        if (resume) {
          setExistingResume(resume);
        }
      } catch (error) {
        console.error('Failed to check for existing resume:', error);
      } finally {
        setLoadingResume(false);
      }
    };
    
    checkExistingResume();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleClose = () => {
    setOpen(false);
    navigate('/');
  };

  const handleGenerate = async () => {
    if (!resumeFile && !existingResume) {
      toast({
        title: 'Resume Required',
        description: 'Please upload your resume to generate a cover letter.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const sessionId = localStorage.getItem('smartply_session_id') || '';
      let resumeId: number;

      // Use existing resume or upload new one
      if (resumeFile) {
        const uploadedResume = await apiService.uploadResume(sessionId, resumeFile);
        resumeId = uploadedResume.id;
      } else {
        resumeId = existingResume.id;
      }

      // Generate cover letter
      const coverLetter = await apiService.generateCoverLetter({
        job_id: jobId,
        resume_id: resumeId,
        session_id: sessionId,
        additional_prompt: additionalPrompt || undefined,
      });

      // Navigate to cover letter view
      navigate(`/cover-letters/view/${coverLetter.id}`);
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate cover letter. Please try again.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border-white/10">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-purple-400" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Generating Cover Letter</h3>
              <p className="text-sm text-gray-400">
                Our AI is crafting a personalized cover letter for you...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl">Generate Cover Letter</DialogTitle>
          <DialogDescription>
            Creating a cover letter for: <span className="font-semibold text-white">{jobTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resume Upload */}
          <div className="space-y-2">
            <Label>Resume (PDF) {existingResume ? '(Optional - Using existing resume)' : '*'}</Label>
            {loadingResume ? (
              <div className="p-8 text-center border border-white/10 rounded-lg bg-white/5">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                <p className="text-sm text-gray-400 mt-2">Checking for existing resume...</p>
              </div>
            ) : existingResume && !resumeFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-green-500/30 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{existingResume.filename}</p>
                      <p className="text-xs text-gray-400">
                        Uploaded {new Date(existingResume.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                    Using this resume
                  </div>
                </div>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                    ${isDragActive 
                      ? 'border-purple-400 bg-purple-500/10' 
                      : 'border-white/20 hover:border-white/40 bg-white/5'
                    }
                  `}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-300">
                    Or upload a different resume
                  </p>
                </div>
              </div>
            ) : !resumeFile ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-purple-400 bg-purple-500/10' 
                    : 'border-white/20 hover:border-white/40 bg-white/5'
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-300 mb-2">
                  {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume, or click to browse'}
                </p>
                <p className="text-xs text-gray-500">PDF files only</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{resumeFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setResumeFile(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Additional Prompt */}
          <div className="space-y-2">
            <Label htmlFor="additionalPrompt">
              Additional Instructions (Optional)
            </Label>
            <Textarea
              id="additionalPrompt"
              placeholder="e.g., Emphasize my leadership experience, use a formal tone, mention my passion for the industry..."
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Add any specific instructions to customize your cover letter
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!resumeFile && !existingResume}
          >
            Generate Cover Letter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
