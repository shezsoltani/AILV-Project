// src/types/jobs.ts
// Typen für das asynchrone Job-System (spiegelt backend/app/models/job_models.py)

// Antwort des Backends beim Starten eines asynchronen Jobs (POST /api/generate, POST /api/slides/generate).
export interface JobCreateResponse {
  job_id: string;
  status: string;
}

// Vollständige Job-Status-Antwort von GET /api/jobs/{job_id}.
export interface JobStatusResponse {
  job_id: string;
  job_type: string;
  status: string;
  // Fortschritt in Prozent (0–100).
  progress: number;
  batch_current: number;
  batch_total: number;
  batch_retrying: boolean;
  stage_label: string | null;
  result_data: unknown | null;
  error_message: string | null;
}
