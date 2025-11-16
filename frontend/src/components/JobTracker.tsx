import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, FileText, Send, XCircle, MessageSquare, CheckCircle } from 'lucide-react';
import type { Job } from '@/lib/api';

export type JobStage = 'found' | 'documents' | 'applied' | 'rejected' | 'interview' | 'accepted';

export interface TrackedJob extends Job {
  stage: JobStage;
}

interface JobTrackerProps {
  jobs: TrackedJob[];
  onJobStageChange: (jobId: number, newStage: JobStage) => void;
}

const STAGES: { id: JobStage; label: string; icon: any; color: string }[] = [
  { id: 'found', label: 'Job Found', icon: Briefcase, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'documents', label: 'Documents Generated', icon: FileText, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'applied', label: 'Applied', icon: Send, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'interview', label: 'Interview', icon: MessageSquare, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

export function JobTracker({ jobs, onJobStageChange }: JobTrackerProps) {
  const [draggedJob, setDraggedJob] = useState<TrackedJob | null>(null);
  const [dragOverStage, setDragOverStage] = useState<JobStage | null>(null);

  const getJobsByStage = (stage: JobStage) => {
    return jobs.filter(job => job.stage === stage);
  };

  const handleDragStart = (e: React.DragEvent, job: TrackedJob) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    // Add slight opacity to the dragged element
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedJob(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: JobStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: JobStage) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedJob && draggedJob.stage !== stage) {
      onJobStageChange(draggedJob.id, stage);
    }
    setDraggedJob(null);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageJobs = getJobsByStage(stage.id);
          const Icon = stage.icon;
          const isActive = dragOverStage === stage.id;
          const isDragging = draggedJob !== null;

          return (
            <div
              key={stage.id}
              className={`min-h-[500px] transition-all ${
                isActive ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className={`bg-black/40 backdrop-blur-xl border-white/10 h-full ${
                isActive ? 'bg-purple-500/10' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <CardTitle className="text-sm font-medium text-white">
                        {stage.label}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${stage.color} text-xs`}
                    >
                      {stageJobs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageJobs.length === 0 && !isDragging && (
                    <div className="text-center py-8 text-gray-500 text-xs">
                      No jobs at this stage
                    </div>
                  )}
                  {stageJobs.length === 0 && isDragging && (
                    <div className="text-center py-8 text-purple-400 text-xs border-2 border-dashed border-purple-500/30 rounded-lg">
                      Drop here
                    </div>
                  )}
                  {stageJobs.map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job)}
                      onDragEnd={handleDragEnd}
                      className={`group relative bg-white/5 rounded-lg p-3 border border-white/10 cursor-move hover:bg-white/10 transition-all ${
                        draggedJob?.id === job.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Trail effect - gradient behind the card */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                      
                      {/* Progress indicator on left edge */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-purple-700 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative">
                        <h4 className="text-xs font-semibold text-white mb-1 line-clamp-2">
                          {job.job_title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {job.company_name}
                        </p>
                        
                        {/* Drag indicator */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-gray-600 rounded-full" />
                            <div className="w-1 h-3 bg-gray-600 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Progress visualization */}
      <div className="mt-6 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-cyan-500 via-yellow-500 to-green-500 opacity-20 rounded-full" />
        <div className="grid grid-cols-6 gap-4">
          {STAGES.map((stage, index) => {
            const count = getJobsByStage(stage.id).length;
            const total = jobs.length;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={stage.id} className="text-center mt-4">
                <div className="text-2xl font-bold text-white mb-1">
                  {count}
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
