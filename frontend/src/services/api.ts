import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
}

interface GenerateResponseDto {
  accepted: boolean;
  topic: string;
  language: string;
  count: number;
  questions: GeneratedQuestion[];
  note: string;
}

export async function generateQuestions(
  formValues: GenerateRequestFormValues
): Promise<GeneratedQuestion[]> {
  // Payload so bauen, dass es exakt zu GenerateRequest im Backend passt:
  const payload = {
    topic: formValues.topic,
    language: formValues.language,
    count:
      typeof formValues.count === 'string'
        ? Number(formValues.count)
        : formValues.count,
    types: formValues.types,
    difficulty_distribution: {
      easy: Number(formValues.difficultyDistribution.easy),
      medium: Number(formValues.difficultyDistribution.medium),
      hard: Number(formValues.difficultyDistribution.hard),
    },
  };

  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Request to /api/generate failed with ${response.status} ${response.statusText}: ${text}`,
    );
  }

  const data: GenerateResponseDto = await response.json();
  return data.questions;
}

