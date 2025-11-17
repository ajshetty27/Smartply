const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export type JobStage = 'found' | 'documents' | 'applied' | 'rejected' | 'interview' | 'accepted';

export interface Job {
  id: number;
  url: string | null;
  source: string;
  job_title: string;
  company_name: string;
  location: string | null;
  job_description: string;
  scraped_at: string;
  is_scraped: boolean;
  stage: JobStage;
}

export interface UserProfile {
  id: number;
  session_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  additional_information: string | null;
}

export interface ResumeModification {
  section: string;
  type: 'add' | 'modify' | 'remove' | 'highlight';
  suggestion: string;
  reason: string;
}

export interface CoverLetter {
  id: number;
  job_id: number;
  content: string;
  resume_modifications: ResumeModification[] | null;
  generated_at: string;
}

export interface ScoutedJob {
  id: number;
  external_id: string | null;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  salary_min: number | null;  // Float from API, will be displayed as rounded
  salary_max: number | null;  // Float from API, will be displayed as rounded
  contract_type: string | null;
  redirect_url: string;
  relevance_score: number;
  scouted_at: string;
  status: string;
}

export interface ScoutSearchRequest {
  country?: string;
  location?: string;
  max_results?: number;
}

export interface QnAItem {
  id: number;
  job_id?: number;
  question: string;
  answer: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface QnACreate {
  question: string;
  answer?: string;
  generate_answer: boolean;
  job_id?: number;
}

export interface QnAUpdate {
  question?: string;
  answer?: string;
}

export interface JobURLSubmit {
  url: string;
  session_id: string;
}

export interface JobManualSubmit {
  job_title: string;
  company_name: string;
  location?: string;
  job_description: string;
  session_id: string;
}

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('smartply_auth_token');
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  async submitJobURL(data: JobURLSubmit): Promise<Job> {
    return this.request<Job>('/jobs/url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitJobManual(data: JobManualSubmit): Promise<Job> {
    return this.request<Job>('/jobs/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJobs(sessionId: string): Promise<Job[]> {
    return this.request<Job[]>(`/jobs/${sessionId}`);
  }

  async getJobsWithCoverLetters(sessionId: string): Promise<Job[]> {
    return this.request<Job[]>(`/jobs/${sessionId}/with-cover-letters`);
  }

  async deleteJob(jobId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  async updateJobStage(jobId: number, stage: JobStage): Promise<Job> {
    return this.request<Job>(`/jobs/${jobId}/stage?stage=${stage}`, {
      method: 'PATCH',
    });
  }

  async uploadResume(sessionId: string, file: File): Promise<{ id: number; filename: string; uploaded_at: string }> {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload resume');
    }

    return response.json();
  }

  async getBaseResume(sessionId: string): Promise<{ id: number; filename: string; content: string; uploaded_at: string } | null> {
    return this.request(`/resumes/${sessionId}/base`);
  }

  async generateCoverLetter(data: {
    job_id: number;
    resume_id: number;
    session_id: string;
    additional_prompt?: string;
  }): Promise<{ id: number; job_id: number; content: string; generated_at: string }> {
    return this.request(`/cover-letters/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCoverLetter(coverLetterId: number): Promise<CoverLetter> {
    const data = await this.request<any>(`/cover-letters/${coverLetterId}`);
    // Parse resume_modifications if it's a JSON string
    if (data.resume_modifications && typeof data.resume_modifications === 'string') {
      try {
        data.resume_modifications = JSON.parse(data.resume_modifications);
      } catch (e) {
        data.resume_modifications = null;
      }
    }
    return data;
  }

  async getCoverLettersForJob(jobId: number): Promise<CoverLetter[]> {
    const data = await this.request<any[]>(`/cover-letters/job/${jobId}`);
    // Parse resume_modifications for each cover letter
    return data.map(cl => {
      if (cl.resume_modifications && typeof cl.resume_modifications === 'string') {
        try {
          cl.resume_modifications = JSON.parse(cl.resume_modifications);
        } catch (e) {
          cl.resume_modifications = null;
        }
      }
      return cl;
    });
  }

  async deleteCoverLetter(coverLetterId: number): Promise<void> {
    return this.request(`/cover-letters/${coverLetterId}`, {
      method: 'DELETE',
    });
  }

  async editCoverLetter(coverLetterId: number, selectedText: string, instruction: string): Promise<{
    original_text: string;
    modified_text: string;
    full_content: string;
  }> {
    const formData = new FormData();
    formData.append('selected_text', selectedText);
    formData.append('instruction', instruction);

    const response = await fetch(`${API_BASE_URL}/cover-letters/${coverLetterId}/edit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Edit failed' }));
      throw new Error(error.detail || 'Failed to edit cover letter');
    }

    return response.json();
  }

  async saveLinkedInCredentials(sessionId: string, liAtCookie: string, jsessionidCookie?: string): Promise<{ message: string }> {
    return this.request(`/linkedin/credentials`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        li_at_cookie: liAtCookie,
        jsessionid_cookie: jsessionidCookie || null,
      }),
    });
  }

  async getLinkedInCredentialsStatus(sessionId: string): Promise<{ id: number; has_credentials: boolean }> {
    return this.request(`/linkedin/credentials/${sessionId}`);
  }

  async deleteLinkedInCredentials(sessionId: string): Promise<{ message: string }> {
    return this.request(`/linkedin/credentials/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getUserProfile(sessionId: string): Promise<UserProfile> {
    return this.request(`/profile/${sessionId}`);
  }

  async saveUserProfile(data: {
    session_id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  }): Promise<UserProfile> {
    return this.request(`/profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async downloadCoverLetterPDF(coverLetterId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/cover-letters/${coverLetterId}/pdf`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    return response.blob();
  }

  getContentDispositionFilename(response: Response): string {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        return filenameMatch[1];
      }
    }
    return 'cover-letter.pdf';
  }

  // Scout API methods
  async searchScoutJobs(request: ScoutSearchRequest = {}): Promise<ScoutedJob[]> {
    return this.request(`/scout/search`, {
      method: 'POST',
      body: JSON.stringify({
        country: request.country || 'us',
        location: request.location || null,
        max_results: request.max_results || 20,
      }),
    });
  }

  async getScoutedJobs(status: string = 'new'): Promise<ScoutedJob[]> {
    return this.request(`/scout/jobs?status=${status}`);
  }

  async performJobAction(jobId: number, action: 'save' | 'dismiss'): Promise<{ message: string }> {
    return this.request(`/scout/jobs/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async deleteScoutedJob(jobId: number): Promise<{ message: string }> {
    return this.request(`/scout/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Q&A Bank API methods
  async getQnAItems(): Promise<QnAItem[]> {
    return this.request('/qna');
  }

  async createQnAItem(data: QnACreate): Promise<QnAItem> {
    return this.request('/qna', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQnAItem(qnaId: number, data: QnAUpdate): Promise<QnAItem> {
    return this.request(`/qna/${qnaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQnAItem(qnaId: number): Promise<{ message: string }> {
    return this.request(`/qna/${qnaId}`, {
      method: 'DELETE',
    });
  }

  async regenerateQnAAnswer(qnaId: number): Promise<QnAItem> {
    return this.request(`/qna/${qnaId}/regenerate`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
