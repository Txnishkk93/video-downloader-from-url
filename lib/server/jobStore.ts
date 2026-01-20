type JobStatus = "pending" | "downloading" | "processing" | "completed" | "error";

interface Job {
  status: JobStatus;
  progress: number;
  file: string | null;
  error?: string;
  createdAt: number;
}

class JobStore {
  private jobs: Record<string, Job> = {};

  public createJob(jobId: string): void {
    this.jobs[jobId] = {
      status: "downloading",
      progress: 0,
      file: null,
      createdAt: Date.now(),
    };
    console.log(`Job created: ${jobId}. Total jobs: ${Object.keys(this.jobs).length}`);
  }

  public getJob(jobId: string): Job | undefined {
    return this.jobs[jobId];
  }

  public updateJob(jobId: string, updates: Partial<Job>): void {
    if (this.jobs[jobId]) {
      this.jobs[jobId] = { ...this.jobs[jobId], ...updates };
    }
  }

  public getAllJobIds(): string[] {
    return Object.keys(this.jobs);
  }

  public deleteJob(jobId: string): void {
    delete this.jobs[jobId];
  }

  // Clean up old jobs (older than 1 hour)
  public cleanupOldJobs(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    Object.keys(this.jobs).forEach((jobId) => {
      if (now - this.jobs[jobId].createdAt > oneHour) {
        delete this.jobs[jobId];
      }
    });
  }
}

// Use globalThis to persist across hot reloads in development
const globalForJobStore = globalThis as unknown as {
  jobStore: JobStore | undefined;
};

export const jobStore = globalForJobStore.jobStore ?? new JobStore();

if (process.env.NODE_ENV !== "production") {
  globalForJobStore.jobStore = jobStore;
}

export type { Job, JobStatus };
