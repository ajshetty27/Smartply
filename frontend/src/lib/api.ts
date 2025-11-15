const API_BASE_URL = 'http://localhost:8000/api';

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
}

export interface UserProfile {
  id: number;
  session_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
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

  async uploadResume(sessionId: string, file: File): Promise<{ id: number; filename: string; uploaded_at: string }> {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: 'POST',
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

  async getCoverLetter(coverLetterId: number): Promise<{ id: number; job_id: number; content: string; generated_at: string }> {
    return this.request(`/cover-letters/${coverLetterId}`);
  }

  async getCoverLettersForJob(jobId: number): Promise<Array<{ id: number; job_id: number; content: string; generated_at: string }>> {
    return this.request(`/cover-letters/job/${jobId}`);
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
}

export const apiService = new ApiService();
