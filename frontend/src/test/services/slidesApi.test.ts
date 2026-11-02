import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSlides, listDecks, getDeck, updateDeck } from '../../services/slidesApi';

describe('slidesApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  function mockJsonResponse(body: unknown) {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  it('generateSlides startet die asynchrone Generierung per POST und liefert job_id', async () => {
    const mockResponse = {
      job_id: 'slides-job-1',
      status: 'pending',
    };

    mockJsonResponse(mockResponse);

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

  it('listDecks lädt archivierte Foliendecks', async () => {
    const mockResponse = {
      decks: [
        {
          id: 'deck-1',
          request_id: 'req-1',
          name: 'Neuronale Netze',
          created_at: '2026-01-10T10:00:00Z',
          slide_count: 3,
        },
      ],
    };

    mockJsonResponse(mockResponse);

    const result = await listDecks();

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/slides/archive'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getDeck lädt Deck-Details aus dem Archiv', async () => {
    const mockResponse = {
      id: 'deck-1',
      request_id: 'req-1',
      name: 'Neuronale Netze',
      created_at: '2026-01-10T10:00:00Z',
      slides: [],
    };

    mockJsonResponse(mockResponse);

    const result = await getDeck('deck-1');

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/slides/archive/deck-1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('updateDeck speichert bearbeitete Folien im Archiv', async () => {
    const slides = [
      {
        position: 1,
        slide_type: 'title',
        title: 'Titel',
        bullets: [],
        examples: [],
      },
    ];
    const mockResponse = {
      id: 'deck-1',
      request_id: 'req-1',
      name: 'Neuronale Netze',
      created_at: '2026-01-10T10:00:00Z',
      slides: [],
    };

    mockJsonResponse(mockResponse);

    await updateDeck('deck-1', slides);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/slides/archive/deck-1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ slides }),
      }),
    );
  });
});
