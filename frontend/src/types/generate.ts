export type Language = 'de' | 'en';

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';

export interface DifficultyDistribution {
  easy: number | '';
  medium: number | '';
  hard: number | '';
}

export interface GenerateRequestFormValues {
  topic: string;
  language: Language;
  count: number | '';            
  types: QuestionType[];
  difficultyDistribution: DifficultyDistribution;
  learningObjectives: string;
  bloomLevel: string;
  targetAudience: string;
  contextText: string;
}
