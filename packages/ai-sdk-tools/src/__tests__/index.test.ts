import { describe, it, expect, beforeAll } from 'vitest';

describe('@parallel-web/ai-sdk-tools', () => {
  describe('exports', () => {
    it('should export searchTool', async () => {
      const { searchTool } = await import('../index');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      expect(searchTool.description).toBeDefined();
      expect(searchTool.parameters).toBeDefined();
      expect(typeof searchTool.execute).toBe('function');
    });

    it('should export parallelClient', async () => {
      const { parallelClient } = await import('../index');
      expect(parallelClient).toBeDefined();
      expect(typeof parallelClient).toBe('object');

      // Note: Full integration tests would require PARALLEL_API_KEY environment variable
      // The client is lazy-loaded, so we don't access its properties here
    });
  });

  describe('searchTool - unit tests', () => {
    let searchTool: typeof import('../index').searchTool;

    beforeAll(async () => {
      const module = await import('../index');
      searchTool = module.searchTool;
    });

    it('should have correct tool structure', () => {
      expect(searchTool.description).toContain('web_search_parallel');
      expect(searchTool.parameters).toBeDefined();
      expect(typeof searchTool.execute).toBe('function');
    });

    describe('parameter schema validation', () => {
      it('should accept valid objective parameter only', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Find latest news about AI',
        });
        expect(result.success).toBe(true);
      });

      it('should accept objective with search_queries', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Find AI news',
          search_queries: ['AI news', 'machine learning'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: list', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_type: 'list',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: targeted', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_type: 'targeted',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: general', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_type: 'general',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: single_page', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_type: 'single_page',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid search_type', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_type: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('should default search_type to list when not provided', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.search_type).toBe('list');
        }
      });

      it('should accept include_domains parameter', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          include_domains: ['example.com', 'test.org'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept all parameters together', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Complex search',
          search_queries: ['query1', 'query2'],
          search_type: 'targeted',
          include_domains: ['example.com'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-string objective', () => {
        const result = searchTool.parameters.safeParse({
          objective: 123,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-array search_queries', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test',
          search_queries: 'not an array',
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-array include_domains', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test',
          include_domains: 'not an array',
        });
        expect(result.success).toBe(false);
      });

      it('should accept empty arrays for optional parameters', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          search_queries: [],
          include_domains: [],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe.skipIf(!process.env.PARALLEL_API_KEY)(
    'searchTool - integration tests',
    () => {
      let searchTool: typeof import('../index').searchTool;

      beforeAll(async () => {
        const module = await import('../index');
        searchTool = module.searchTool;
      });

      it.concurrent(
        'should execute basic search with objective (defaults to list)',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'What is artificial intelligence?',
              search_type: 'list',
            },
            {
              toolCallId: 'test-1',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe(
            'What is artificial intelligence?'
          );
          expect(result.searchParams.search_type).toBe('list');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with search_type: list',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Find information about machine learning',
              search_queries: ['machine learning basics', 'ML algorithms'],
              search_type: 'list',
            },
            {
              toolCallId: 'test-2',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('list');
          expect(result.searchParams.search_queries).toEqual([
            'machine learning basics',
            'ML algorithms',
          ]);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with search_type: targeted',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Details about energy-based models in deep learning',
              search_type: 'targeted',
              search_queries: ['energy-based models'],
            },
            {
              toolCallId: 'test-3',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('targeted');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with search_type: general',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'REI locations in San Francisco',
              search_type: 'general',
            },
            {
              toolCallId: 'test-4',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('general');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with search_type: single_page',
        async () => {
          const result = await searchTool.execute(
            {
              objective:
                'Extract content from Wikipedia page about search engines at https://en.wikipedia.org/wiki/Search_engine',
              search_type: 'single_page',
            },
            {
              toolCallId: 'test-5',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('single_page');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with include_domains',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Information about search engines',
              search_type: 'list',
              include_domains: ['wikipedia.org'],
            },
            {
              toolCallId: 'test-6',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.include_domains).toEqual([
            'wikipedia.org',
          ]);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with multiple include_domains and targeted search',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Best trail running shoes',
              search_type: 'targeted',
              search_queries: ['trail running shoes reviews'],
              include_domains: ['rei.com', 'backcountry.com'],
            },
            {
              toolCallId: 'test-7',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('targeted');
          expect(result.searchParams.include_domains).toEqual([
            'rei.com',
            'backcountry.com',
          ]);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should handle abort signal for cancellation',
        async () => {
          const abortController = new AbortController();

          // Start the search and immediately abort it
          const searchPromise = searchTool.execute(
            {
              objective: 'Long running query about complex topics',
              search_type: 'list',
            },
            {
              abortSignal: abortController.signal,
              toolCallId: 'test-8',
              messages: [],
            }
          );

          // Abort after a short delay
          setTimeout(() => abortController.abort(), 100);

          await expect(searchPromise).rejects.toThrow();
        },
        30000
      );

      it.concurrent(
        'should execute list search for broad aggregation',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Latest news about AI startups',
              search_type: 'list',
              search_queries: [
                'AI startups 2024',
                'artificial intelligence companies',
              ],
            },
            {
              toolCallId: 'test-9',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toMatchObject({
            objective: 'Latest news about AI startups',
            search_type: 'list',
            search_queries: [
              'AI startups 2024',
              'artificial intelligence companies',
            ],
          });
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute general search for catch-all queries',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Top burger joints in Tokyo',
              search_type: 'general',
              search_queries: ['best burgers Tokyo'],
            },
            {
              toolCallId: 'test-10',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_type).toBe('general');
          expect(result.answer).toBeDefined();
        },
        30000
      );
    }
  );
});
