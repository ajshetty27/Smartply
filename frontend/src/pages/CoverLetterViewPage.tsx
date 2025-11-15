import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Send, Sparkles, Loader2, X } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string;
}

export function CoverLetterViewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatMessage, setChatMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [editingParagraphIndex, setEditingParagraphIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!jobId) {
        navigate('/');
        return;
      }

      try {
        const coverLetter = await apiService.getCoverLetter(parseInt(jobId));
        setCoverLetterContent(coverLetter.content);
        setCoverLetterId(coverLetter.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load cover letter',
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
      a.download = `cover-letter-${jobId}.pdf`;
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
      {/* Main Content - Cover Letter Preview */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/cover-letters')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cover Letters
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

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
                      className="text-gray-200 cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-colors"
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
