erDiagram

    USERS {
        int id PK
        varchar name
        varchar email
        timestamp created_at
    }

    GENERATION_REQUESTS {
        int id PK
        text topic
        varchar language
        int count
        jsonb types
        jsonb difficulty_distribution
        jsonb learning_objectives
        varchar bloom_level
        text target_audience
        text context_text
        timestamp created_at
        int user_id FK
    }

    PROMPTS {
        int id PK
        int request_id FK
        varchar stage
        text prompt_text
        text response_text
        timestamp created_at
    }

    QUESTIONS {
        int id PK
        int request_id FK
        int prompt_id FK
        varchar type
        varchar difficulty
        text stem
        jsonb choices
        int correct_index
        text rationale
        text learning_objective
        varchar bloom_level
        float quality_score
        timestamp created_at
    }

    %% Beziehungen
    USERS ||--o{ GENERATION_REQUESTS : creates
    GENERATION_REQUESTS ||--o{ PROMPTS : has
    GENERATION_REQUESTS ||--o{ QUESTIONS : produces
    PROMPTS ||--o{ QUESTIONS : informs