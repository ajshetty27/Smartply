import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Landmark,
  Plus,
  Sparkles,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  LayoutGrid,
  List,
  Briefcase,
  Eye,
  Search,
  MessageSquare,
} from 'lucide-react';
import { apiService, QnAItem, Job } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'table' | 'grid';

export function QnABankPage() {
  const [qnaItems, setQnaItems] = useState<QnAItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QnAItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [useAI, setUseAI] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qnaData, jobsData] = await Promise.all([
        apiService.getQnAItems(),
        apiService.getJobs('all')
      ]);
      setQnaItems(qnaData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Q&A bank',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getJobById = (jobId?: number) => {
    if (!jobId) return null;
    return jobs.find(j => j.id === jobId);
  };

  // Calculate similarity score between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Exact match
    if (s1 === s2) return 100;
    
    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    // Word-based matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchCount = 0;
    for (const word of words2) {
      if (words1.some(w => w.includes(word) || word.includes(w))) {
        matchCount++;
      }
    }
    
    const wordMatchScore = (matchCount / words2.length) * 60;
    
    // Character overlap
    const chars1 = new Set(s1.replace(/\s/g, ''));
    const chars2 = new Set(s2.replace(/\s/g, ''));
    const commonChars = [...chars1].filter(c => chars2.has(c)).length;
    const charScore = (commonChars / Math.max(chars1.size, chars2.size)) * 20;
    
    return wordMatchScore + charScore;
  };

  // Filter and sort Q&A items by search query
  const filteredQnaItems = searchQuery.trim()
    ? qnaItems
        .map(item => ({
          ...item,
          similarity: calculateSimilarity(item.question, searchQuery)
        }))
        .filter(item => item.similarity > 20) // Show items with >20% similarity
        .sort((a, b) => b.similarity - a.similarity)
    : qnaItems;

  const handleAddQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    if (!useAI && !answer.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide an answer or use AI to generate one',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      await apiService.createQnAItem({
        question,
        answer: useAI ? undefined : answer,
        generate_answer: useAI,
        job_id: selectedJobId ? parseInt(selectedJobId) : undefined,
      });

      toast({
        title: 'Success',
        description: 'Question added to your bank',
      });

      setAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add question',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!selectedItem || !question.trim() || !answer.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      await apiService.updateQnAItem(selectedItem.id, {
        question,
        answer,
      });

      toast({
        title: 'Success',
        description: 'Question updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedItem(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update question',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await apiService.deleteQnAItem(id);
      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateAnswer = async (item: QnAItem) => {
    try {
      setGenerating(true);
      await apiService.regenerateQnAAnswer(item.id);
      toast({
        title: 'Success',
        description: 'Answer regenerated with AI',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate answer',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleEditClick = (item: QnAItem) => {
    setSelectedItem(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setEditDialogOpen(true);
  };

  const handleViewClick = (item: QnAItem) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setSelectedJobId('');
    setUseAI(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
      setSelectedItem(null);
    }
    setAddDialogOpen(open);
  };

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
      setSelectedItem(null);
    }
    setEditDialogOpen(open);
  };

  const handleViewDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
    setViewDialogOpen(open);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">Q&A Bank</h1>
          </div>
          <p className="text-gray-400">
            Store and manage common job application questions and answers
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </Button>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-white/10 text-white hover:bg-white/10'}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-white/10 text-white hover:bg-white/10'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {qnaItems.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for similar questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              {searchQuery && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  {filteredQnaItems.length} result{filteredQnaItems.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Q&A Items */}
        {qnaItems.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="py-24 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Questions Yet
              </h3>
              <p className="text-gray-400 mb-6">
                Start building your Q&A bank by adding common interview questions
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="gap-2 bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-300">Question</TableHead>
                  <TableHead className="text-gray-300">Job Context</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQnaItems.map((item) => {
                  const job = getJobById(item.job_id);
                  return (
                    <TableRow 
                      key={item.id}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-medium text-white max-w-md">
                        <div className="flex items-start gap-2">
                          <div className="line-clamp-2 flex-1">{item.question}</div>
                          {searchQuery && 'similarity' in item && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                              {Math.round(item.similarity as number)}% match
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {job ? (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            <span className="line-clamp-1">{job.job_title} at {job.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">General</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.is_ai_generated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <Sparkles className="w-3 h-3" />
                            AI
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(item)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                            className="gap-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerateAnswer(item)}
                            disabled={generating}
                            className="gap-2 text-yellow-400 hover:text-yellow-300"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(item.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : filteredQnaItems.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="py-24 text-center">
              <Search className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Matching Questions
              </h3>
              <p className="text-gray-400 mb-6">
                Try a different search term or add a new question
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                }}
                variant="outline"
                className="gap-2 border-white/10 text-white hover:bg-white/10"
              >
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQnaItems.map((item) => {
              const job = getJobById(item.job_id);
              return (
                <Card
                  key={item.id}
                  className="bg-black/40 backdrop-blur-xl border-white/10 hover:bg-white/5 transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {searchQuery && 'similarity' in item && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            {Math.round(item.similarity as number)}% match
                          </span>
                        )}
                        {item.is_ai_generated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <Sparkles className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {item.question}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                      {item.answer}
                    </p>
                    {job && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                        <Briefcase className="w-3 h-3" />
                        <span className="line-clamp-1">{job.job_title} at {job.company_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleViewClick(item)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerateAnswer(item)}
                        disabled={generating}
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Question Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">Add New Question</DialogTitle>
              <DialogDescription>
                Add a common job application question and provide an answer or let AI generate one
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="question" className="text-white">Question</Label>
                <Textarea
                  id="question"
                  placeholder="e.g., Tell me about yourself"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="job" className="text-white">Job Context (Optional)</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a job for context..." />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="none" className="text-white">No specific job</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()} className="text-white">
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-4 border border-white/10 rounded-lg bg-white/5">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20"
                />
                <Label htmlFor="useAI" className="text-white cursor-pointer flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Generate answer with AI (uses your resume and job context)
                </Label>
              </div>

              {!useAI && (
                <div>
                  <Label htmlFor="answer" className="text-white">Your Answer</Label>
                  <Textarea
                    id="answer"
                    placeholder="Enter your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    rows={6}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddQuestion}
                disabled={generating}
                className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {useAI ? 'Generating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Question
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Question Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={handleEditDialogClose}>
          <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">Edit Question</DialogTitle>
              <DialogDescription>
                Update the question and answer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-question" className="text-white">Question</Label>
                <Textarea
                  id="edit-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-answer" className="text-white">Answer</Label>
                <Textarea
                  id="edit-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleEditDialogClose(false)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateQuestion}
                disabled={generating}
                className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Question Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={handleViewDialogClose}>
          <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white flex items-center gap-2">
                {selectedItem?.is_ai_generated && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Sparkles className="w-3 h-3" />
                    AI Generated
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-4 py-4">
                {selectedItem.job_id && getJobById(selectedItem.job_id) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span>Job Context</span>
                    </div>
                    <div className="text-white">
                      {getJobById(selectedItem.job_id)?.job_title} at {getJobById(selectedItem.job_id)?.company_name}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-white text-lg">Question</Label>
                  <p className="mt-2 text-white text-lg">{selectedItem.question}</p>
                </div>

                <div>
                  <Label className="text-white text-lg">Answer</Label>
                  <p className="mt-2 text-gray-300 whitespace-pre-wrap">{selectedItem.answer}</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleViewDialogClose(false);
                      handleEditClick(selectedItem);
                    }}
                    className="gap-2 border-white/10 text-white hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleViewDialogClose(false);
                      handleRegenerateAnswer(selectedItem);
                    }}
                    disabled={generating}
                    className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate with AI
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
