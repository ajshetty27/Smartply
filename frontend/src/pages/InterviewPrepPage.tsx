import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Settings } from 'lucide-react';
import { apiService } from '../lib/api';
import { AudioWaveform } from '../components/AudioWaveform';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';

interface Job {
  id: number;
  job_title: string;
  company_name: string;
}

interface Resume {
  id: number;
  filename: string;
  uploaded_at: string;
}

interface InterviewSession {
  id: number;
  job_id: number | null;
  resume_id: number | null;
  voice: 'alloy' | 'shimmer';
  call_id: string | null;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration_seconds: number | null;
  created_at: string;
}

export default function InterviewPrepPage() {
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('smartply_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('smartply_session_id', id);
    }
    return id;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'shimmer'>('alloy');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadJobsAndResumes();
  }, [sessionId]);

  const loadJobsAndResumes = async () => {
    try {
      const [jobsData, resumesData] = await Promise.all([
        apiService.getJobs('all'),  // Get all jobs for authenticated user
        apiService.getResumes(sessionId)
      ]);
      setJobs(jobsData);
      setResumes(resumesData);
      
      // Auto-select latest resume
      if (resumesData.length > 0) {
        setSelectedResumeId(resumesData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
    }
  };

  const handleStartConfig = () => {
    setShowConfigModal(true);
    setError(null);
  };

  const handleStartInterview = async () => {
    if (!selectedResumeId) {
      setError('Please upload a resume first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create interview session
      const session = await apiService.createInterviewSession({
        job_id: selectedJobId || undefined,
        resume_id: selectedResumeId || undefined,
        voice: selectedVoice
      });

      setCurrentSession(session);
      setShowConfigModal(false);
      setIsConnected(true);
      setIsLoading(false);
      startCallTimer();
      
      // Start interview - AI speaks first
      startInterviewConversation(session.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start interview');
      setIsLoading(false);
    }
  };

  const startInterviewConversation = async (sessionId: number) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('smartply_auth_token');
      
      const response = await fetch(`${API_BASE_URL}/interview/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      await handleStreamingResponse(response);
    } catch (err: any) {
      console.error('Start interview error:', err);
      setError('Failed to start interview');
    }
  };

  const handleStreamingResponse = async (response: Response) => {
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const pcmChunks: ArrayBuffer[] = [];
    const transcriptChunks: string[] = [];
    let fullTranscript = '';
    
    // Add placeholder for assistant message - capture current messages
    const currentMessages = [...messages];
    const assistantIndex = currentMessages.length;
    setMessages([...currentMessages, { role: 'assistant', content: '' }]);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (reader) {
      let buffer = '';
      
      // Collect all chunks first
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              
              if (data.done) {
                break;
              }
              
              if (data.transcript) {
                transcriptChunks.push(data.transcript);
                fullTranscript += data.transcript;
              }
              
              if (data.audio) {
                const audioData = atob(data.audio);
                const bytes = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                  bytes[i] = audioData.charCodeAt(i);
                }
                pcmChunks.push(bytes.buffer);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
              // Skip malformed JSON chunks
            }
          }
        }
      }
      
      // Now play audio and animate transcript together
      if (pcmChunks.length > 0) {
        // Calculate audio duration
        const totalSamples = pcmChunks.reduce((sum, chunk) => sum + chunk.byteLength / 2, 0);
        const audioDuration = (totalSamples / 24000) * 1000; // in milliseconds
        
        // Start playing audio
        playPCM16Audio(audioContext, pcmChunks);
        
        // Animate transcript to match audio duration
        const chunkDelay = audioDuration / transcriptChunks.length;
        let displayedText = '';
        
        for (let i = 0; i < transcriptChunks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, chunkDelay));
          displayedText += transcriptChunks[i];
          setMessages([...currentMessages, { role: 'assistant', content: displayedText }]);
        }
        
        // Ensure full transcript is displayed at the end
        setMessages([...currentMessages, { role: 'assistant', content: fullTranscript }]);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use webm with opus codec (standard for browsers)
      const mimeType = 'audio/webm;codecs=opus';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendAudioMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!currentSession || isProcessing) return;

    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: '(Audio message)' }]);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('smartply_auth_token');
      
      const formData = new FormData();
      formData.append('session_id', currentSession.id.toString());
      formData.append('message', '');
      formData.append('audio_file', audioBlob, 'audio.opus');
      
      const response = await fetch(`${API_BASE_URL}/interview/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      await handleStreamingResponse(response);
    } catch (err: any) {
      console.error('Send audio error:', err);
      setError('Failed to send audio message');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!currentSession || isProcessing || !message.trim()) return;

    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setUserInput('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('smartply_auth_token');
      
      const formData = new FormData();
      formData.append('session_id', currentSession.id.toString());
      formData.append('message', message);
      
      const response = await fetch(`${API_BASE_URL}/interview/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      await handleStreamingResponse(response);
    } catch (err: any) {
      console.error('Send message error:', err);
      setError('Failed to send message');
    } finally {
      setIsProcessing(false);
    }
  };

  const playPCM16Audio = async (audioContext: AudioContext, chunks: ArrayBuffer[]) => {
    // Combine all PCM16 chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Int16Array(totalLength / 2);
    
    let offset = 0;
    for (const chunk of chunks) {
      const int16View = new Int16Array(chunk);
      combined.set(int16View, offset);
      offset += int16View.length;
    }
    
    // Convert PCM16 to Float32 for Web Audio API
    const float32 = new Float32Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      float32[i] = combined[i] / 32768.0;
    }
    
    // Create audio buffer and play
    const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  const handleEndInterview = async () => {
    if (!currentSession) return;

    try {
      await apiService.endInterviewSession(currentSession.id, callDuration);
    } catch (err) {
      console.error('Error ending session:', err);
    }

    cleanup();
    setCurrentSession(null);
    setIsConnected(false);
    setCallDuration(0);
    setMessages([]);
  };

  const cleanup = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Interview Prep</h1>
          <p className="text-muted-foreground mt-2">
            Practice your interview skills with AI-powered mock interviews
          </p>
        </div>

        {!currentSession ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Ready to Practice?</CardTitle>
              <CardDescription>
                Start a mock interview session with our AI interviewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleStartConfig} size="lg" className="gap-2">
                <Settings className="w-5 h-5" />
                Configure Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Interview Active Card */}
            <Card>
              <CardHeader>
                <CardTitle>Interview in Progress</CardTitle>
                <CardDescription>
                  Duration: {formatDuration(callDuration)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="text-sm font-medium">
                    {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Preparing...'}
                  </span>
                </div>

                {/* Conversation history */}
                <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto bg-black">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      Waiting for interview to begin...
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-600 ml-12 text-white'
                            : 'bg-purple-600 mr-12 text-white'
                        }`}
                      >
                        <div className="text-xs font-medium opacity-80 mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Interviewer'}
                        </div>
                        <div className="text-sm">{msg.content}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input area */}
                <div className="flex gap-2">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!isConnected || isProcessing}
                    className={`gap-2 ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                  >
                    <Mic className="w-5 h-5" />
                    {isRecording ? 'Stop' : 'Speak'}
                  </Button>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && userInput.trim() && sendMessage(userInput)}
                    placeholder="Type your response..."
                    disabled={!isConnected || isProcessing || isRecording}
                    className="flex-1 px-4 py-2 bg-black text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                  />
                  <Button
                    onClick={() => sendMessage(userInput)}
                    disabled={!isConnected || isProcessing || !userInput.trim() || isRecording}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isProcessing ? 'Sending...' : 'Send'}
                  </Button>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 pt-4 border-t">
                  <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    onClick={toggleMute}
                    disabled={!isConnected}
                    className="gap-2"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleEndInterview}
                    className="gap-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    End Interview
                  </Button>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interview Details */}
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice:</span>
                  <span className="font-medium capitalize">{currentSession.voice}</span>
                </div>
                {selectedJobId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium">
                      {jobs.find(j => j.id === selectedJobId)?.job_title || 'N/A'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuration Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Interview</DialogTitle>
              <DialogDescription>
                Set up your mock interview preferences
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Resume Selection */}
              <div className="space-y-2">
                <Label>Resume</Label>
                <Select
                  value={selectedResumeId?.toString()}
                  onValueChange={(val) => setSelectedResumeId(parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map(resume => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {resumes.length === 0 && (
                  <p className="text-sm text-red-500">Please upload a resume first</p>
                )}
              </div>

              {/* Job Selection */}
              <div className="space-y-2">
                <Label>Job Position (Optional)</Label>
                <Select
                  value={selectedJobId?.toString() || 'none'}
                  onValueChange={(val) => setSelectedJobId(val === 'none' ? null : parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job or skip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Interview</SelectItem>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              <div className="space-y-2">
                <Label>Interviewer Voice</Label>
                <Select
                  value={selectedVoice}
                  onValueChange={(val) => setSelectedVoice(val as 'alloy' | 'shimmer')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Male (Alloy)</SelectItem>
                    <SelectItem value="shimmer">Female (Shimmer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={isLoading || !selectedResumeId}
                className="gap-2"
              >
                <Phone className="w-4 h-4" />
                {isLoading ? 'Starting...' : 'Start Interview'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
