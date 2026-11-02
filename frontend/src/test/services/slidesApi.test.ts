import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSlides } from '../../services/slidesApi';

describe('slidesApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  it('generateSlides startet die asynchrone Generierung per POST und liefert job_id', async () => {
    const mockResponse = {
      job_id: 'slides-job-1',
      status: 'pending',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await generateSlides({
      topic: 'Neuronale Netze',
      slideCount: 5,
      language: 'de',
    });

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/slides/generate'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          topic: 'Neuronale Netze',
          language: 'de',
          slide_count: 5,
        }),
      }),
    );
  });
});
