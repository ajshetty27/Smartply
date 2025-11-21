import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Loader2, 
  Lightbulb, 
  AlertCircle, 
  Plus, 
  Edit, 
  Trash,
  CheckCircle
} from 'lucide-react';
import { apiService, ResumeModification } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function CoverLetterViewPage() {
  const { jobId } = useParams<{ jobId: string }>(); // Note: despite the name, this is the cover letter ID
  const navigate = useNavigate();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [resumeModifications, setResumeModifications] = useState<ResumeModification[] | null>(null);
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('cover-letter');
  
  // AI Edit states
  const [aiInstruction, setAiInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!jobId) {
        navigate('/');
        return;
      }

      try {
        const coverLetter = await apiService.getCoverLetter(parseInt(jobId));
        setCoverLetterContent(coverLetter.content);
        setResumeModifications(coverLetter.resume_modifications);
        setCoverLetterId(coverLetter.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load documents',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadCoverLetter();
  }, [jobId, navigate, toast]);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText('');
    }
  };

  // Handle content changes (manual typing)
  const handleContentChange = () => {
    if (contentRef.current) {
      setCoverLetterContent(contentRef.current.innerText);
    }
  };

  // Handle AI edit
  const handleAiEdit = async () => {
    if (!coverLetterId || !selectedText || !aiInstruction.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select text and provide an instruction',
        variant: 'destructive',
      });
      return;
    }

    setIsEditing(true);
    setAiExplanation('');
    
    try {
      const result = await apiService.editCoverLetter(
        coverLetterId,
        selectedText,
        aiInstruction
      );
      
      // Update content
      setCoverLetterContent(result.full_content);
      if (contentRef.current) {
        contentRef.current.innerText = result.full_content;
      }
      
      // Show explanation
      setAiExplanation(result.explanation || 'Text updated successfully');
      
      // Highlight the modified text for 10 seconds
      setHighlightedText(result.modified_text);
      setTimeout(() => {
        setHighlightedText('');
      }, 10000);
      
      // Clear inputs
      setAiInstruction('');
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
      
      toast({
        title: 'Success',
        description: 'Cover letter updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to edit cover letter',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!coverLetterId) {
      toast({
        title: 'Error',
        description: 'No cover letter to download',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blob = await apiService.downloadCoverLetterPDF(coverLetterId);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${coverLetterId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Cover letter downloaded successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  // Render content with highlighting
  const renderContent = () => {
    if (!highlightedText) {
      return coverLetterContent;
    }

    // Split by highlighted text and wrap it
    const parts = coverLetterContent.split(highlightedText);
    return parts.map((part, index) => (
      <span key={index}>
        {part}
        {index < parts.length - 1 && (
          <span className="bg-green-500/30 animate-pulse rounded px-1">
            {highlightedText}
          </span>
        )}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-black">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/docs')}
              className="gap-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Docs
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-black/40 border border-white/10">
              <TabsTrigger value="cover-letter" className="data-[state=active]:bg-purple-600">
                <Edit className="w-4 h-4 mr-2" />
                Cover Letter
              </TabsTrigger>
              <TabsTrigger value="resume-suggestions" className="data-[state=active]:bg-purple-600">
                <Lightbulb className="w-4 h-4 mr-2" />
                Resume Suggestions
              </TabsTrigger>
            </TabsList>

            {/* Cover Letter Tab */}
            <TabsContent value="cover-letter" className="space-y-4 mt-6">
              {/* AI Explanation Banner */}
              {aiExplanation && (
                <Card className="bg-green-500/10 border-green-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold mb-1">AI Edit Applied</h4>
                      <p className="text-gray-300 text-sm">{aiExplanation}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Editable Cover Letter */}
              <Card className="bg-white p-12 min-h-[800px] shadow-xl">
                <div
                  ref={contentRef}
                  contentEditable={!isEditing}
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  onMouseUp={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  className="outline-none text-gray-900 whitespace-pre-wrap font-serif text-base leading-relaxed focus:ring-2 focus:ring-purple-500/20 rounded p-4"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '12pt',
                    lineHeight: '1.8',
                  }}
                >
                  {highlightedText ? renderContent() : coverLetterContent}
                </div>
              </Card>
            </TabsContent>

            {/* Resume Suggestions Tab */}
            <TabsContent value="resume-suggestions" className="mt-6">
              {!resumeModifications || resumeModifications.length === 0 ? (
                <Card className="bg-black/40 backdrop-blur-xl border-white/10 p-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No resume modifications suggested</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {resumeModifications.map((mod, index) => (
                    <Card key={index} className="bg-black/40 backdrop-blur-xl border-white/10 p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          mod.type === 'add' ? 'bg-green-500/20' :
                          mod.type === 'modify' ? 'bg-blue-500/20' :
                          mod.type === 'remove' ? 'bg-red-500/20' :
                          'bg-yellow-500/20'
                        }`}>
                          {mod.type === 'add' ? <Plus className="w-5 h-5 text-green-400" /> :
                           mod.type === 'modify' ? <Edit className="w-5 h-5 text-blue-400" /> :
                           mod.type === 'remove' ? <Trash className="w-5 h-5 text-red-400" /> :
                           <Sparkles className="w-5 h-5 text-yellow-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-purple-400 uppercase">
                              {mod.section}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              mod.type === 'add' ? 'bg-green-500/20 text-green-400' :
                              mod.type === 'modify' ? 'bg-blue-500/20 text-blue-400' :
                              mod.type === 'remove' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {mod.type}
                            </span>
                          </div>
                          <p className="text-white mb-2">{mod.suggestion}</p>
                          <p className="text-sm text-gray-400 italic">{mod.reason}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* AI Edit Sidebar */}
      <div className="w-96 border-l border-white/10 bg-black/40 backdrop-blur-xl p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Editor</h3>
          </div>
          <p className="text-sm text-gray-400">
            Select text in the document and tell me what to change
          </p>
        </div>

        {/* Selected Text Display */}
        {selectedText && (
          <Card className="bg-purple-500/10 border-purple-500/30 p-4">
            <p className="text-xs text-purple-400 mb-1 font-semibold">SELECTED TEXT:</p>
            <p className="text-white text-sm italic">"{selectedText}"</p>
          </Card>
        )}

        {/* AI Instruction Input */}
        <div className="space-y-3">
          <label className="text-sm text-gray-300 font-medium">
            What would you like to change?
          </label>
          <Input
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="e.g., Make it more professional, add excitement, shorten this..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAiEdit();
              }
            }}
          />
          <Button
            onClick={handleAiEdit}
            disabled={isEditing || !selectedText || !aiInstruction.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isEditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Editing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Apply AI Edit
              </>
            )}
          </Button>
        </div>

        {/* Tips */}
        <Card className="bg-white/5 border-white/10 p-4">
          <p className="text-xs text-purple-400 mb-2 font-semibold">💡 QUICK TIPS</p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li>• Select any text to edit it</li>
            <li>• Click and type to edit directly</li>
            <li>• AI highlights changes for 10 seconds</li>
            <li>• Changes auto-save to your document</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
