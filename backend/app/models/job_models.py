from uuid import UUID
from typing import Optional, Any
from pydantic import BaseModel

class JobCreateResponse(BaseModel):
    job_id: UUID
    status: str

class JobStatusResponse(BaseModel):
    job_id: UUID
    job_type: str
    status: str
    progress: int
    batch_current: int = 0
    batch_total: int = 1
    # Frontend braucht dieses Flag, um den Retry-Indikator in der Statusleiste anzuzeigen.
    batch_retrying: bool = False
    stage_label: Optional[str] = None
    result_data: Optional[Any] = None
    error_message: Optional[str] = None