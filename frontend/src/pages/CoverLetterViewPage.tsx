import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Send, Sparkles, Loader2, X, FileText, Lightbulb, AlertCircle, Plus, Edit, Trash } from 'lucide-react';
import { apiService, ResumeModification } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string;
}

export function CoverLetterViewPage() {
  const { jobId } = useParams<{ jobId: string }>(); // Note: despite the name, this is the cover letter ID
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatMessage, setChatMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [resumeModifications, setResumeModifications] = useState<ResumeModification[] | null>(null);
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [editingParagraphIndex, setEditingParagraphIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');
  const [activeTab, setActiveTab] = useState<string>('cover-letter');
  const [highlightedText, setHighlightedText] = useState<string>('');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString());
    }
  };

  const handleClearSelection = () => {
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleSendMessage = async () => {
    if (!coverLetterId || !selectedText || !chatMessage.trim()) return;

    // Add user message to chat history
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatMessage,
      selectedText: selectedText,
    };
    setChatHistory((prev) => [...prev, userMessage]);

    setIsEditing(true);
    try {
      const result = await apiService.editCoverLetter(
        coverLetterId,
        selectedText,
        chatMessage
      );
      
      // Add assistant response to chat history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.modified_text,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
      
      setCoverLetterContent(result.full_content);
      
      // Highlight the new text
      setHighlightedText(result.modified_text);
      setTimeout(() => {
        setHighlightedText('');
      }, 5000);
      
      setChatMessage('');
      setSelectedText('');
      
      toast({
        title: 'Success',
        description: 'Cover letter updated successfully',
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
      
      // Create download link
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

  const handleParagraphClick = (index: number, text: string) => {
    setEditingParagraphIndex(index);
    setEditedText(text);
  };

  const handleCancelEdit = () => {
    setEditingParagraphIndex(null);
    setEditedText('');
  };

  const handleSaveEdit = () => {
    if (editingParagraphIndex === null) return;
    
    const paragraphs = coverLetterContent.split('\n\n');
    paragraphs[editingParagraphIndex] = editedText;
    setCoverLetterContent(paragraphs.join('\n\n'));
    
    setEditingParagraphIndex(null);
    setEditedText('');
    
    toast({
      title: 'Success',
      description: 'Paragraph updated',
    });
  };

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-black">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/cover-letters')}
              className="gap-2 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Docs
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          {/* Tabs for Cover Letter and Resume Modifications */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="cover-letter" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
                <FileText className="w-4 h-4" />
                Cover Letter
              </TabsTrigger>
              <TabsTrigger value="resume-mods" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2">
                <Lightbulb className="w-4 h-4" />
                Resume Suggestions
                {resumeModifications && resumeModifications.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 rounded-full">
                    {resumeModifications.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cover-letter" className="mt-6">
          {/* Cover Letter */}
          <Card className="p-8 md:p-12">
            <div
              className="prose prose-invert max-w-none"
              onMouseUp={handleTextSelection}
              style={{
                fontFamily: 'Georgia, serif',
                lineHeight: '1.8',
                fontSize: '16px',
              }}
            >
              {coverLetterContent.split('\n\n').map((paragraph, index) => (
                <div key={index} className="mb-4">
                  {editingParagraphIndex === index ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-[100px] bg-white/5 border-white/20 text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-gray-200 cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-all ${
                        highlightedText && paragraph.includes(highlightedText)
                          ? 'bg-green-500/30 animate-pulse'
                          : ''
                      }`}
                      onClick={() => handleParagraphClick(index, paragraph)}
                      title="Click to edit"
                    >
                      {paragraph}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
            </TabsContent>

            <TabsContent value="resume-mods" className="mt-6">
              <Card className="p-8 bg-black/40 backdrop-blur-xl border-white/10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Resume Modification Suggestions</h3>
                      <p className="text-gray-400">
                        AI-generated suggestions to tailor your resume for this specific job
                      </p>
                    </div>
                  </div>

                  {resumeModifications && resumeModifications.length > 0 ? (
                    <div className="space-y-4">
                      {resumeModifications.map((mod, index) => {
                        const getTypeIcon = (type: string) => {
                          switch (type) {
                            case 'add':
                              return <Plus className="w-5 h-5 text-green-400" />;
                            case 'modify':
                              return <Edit className="w-5 h-5 text-blue-400" />;
                            case 'remove':
                              return <Trash className="w-5 h-5 text-red-400" />;
                            case 'highlight':
                              return <Sparkles className="w-5 h-5 text-yellow-400" />;
                            default:
                              return <AlertCircle className="w-5 h-5 text-gray-400" />;
                          }
                        };

                        const getTypeColor = (type: string) => {
                          switch (type) {
                            case 'add':
                              return 'border-green-500/30 bg-green-500/10';
                            case 'modify':
                              return 'border-blue-500/30 bg-blue-500/10';
                            case 'remove':
                              return 'border-red-500/30 bg-red-500/10';
                            case 'highlight':
                              return 'border-yellow-500/30 bg-yellow-500/10';
                            default:
                              return 'border-gray-500/30 bg-gray-500/10';
                          }
                        };

                        return (
                          <div
                            key={index}
                            className={`p-4 border rounded-lg ${getTypeColor(mod.type)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">{getTypeIcon(mod.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-white capitalize">
                                    {mod.type}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-300">{mod.section}</span>
                                </div>
                                <p className="text-white mb-2 font-medium">{mod.suggestion}</p>
                                <p className="text-gray-400 text-sm">{mod.reason}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lightbulb className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Suggestions Available
                      </h3>
                      <p className="text-gray-400">
                        Resume modification suggestions will appear here after document generation
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar - Chat */}
      <div className="w-96 border-l border-white/10 bg-black/20 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">AI Assistant</h3>
          </div>
          <p className="text-sm text-gray-400">
            Highlight text and chat to refine your cover letter
          </p>
        </div>

        {/* Selected Text Display */}
        {selectedText && (
          <div className="p-4 mx-4 mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs text-purple-400">Selected Text:</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearSelection}
                className="h-5 w-5 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-gray-300 line-clamp-3">{selectedText}</p>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                Select text in the cover letter and ask me to make changes
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-500/10 border border-purple-500/20'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 text-purple-400">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </p>
                  {message.selectedText && (
                    <div className="mb-2 p-2 bg-black/30 rounded text-xs text-gray-400 italic">
                      "{message.selectedText.substring(0, 100)}
                      {message.selectedText.length > 100 ? '...' : ''}"
                    </div>
                  )}
                  <p className="text-sm text-gray-200">{message.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10">
          <div className="space-y-2">
            <Textarea
              placeholder={
                selectedText
                  ? 'How would you like to modify the selected text?'
                  : 'Select text first, then describe your changes...'
              }
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              rows={3}
              disabled={!selectedText}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || !selectedText || isEditing}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
