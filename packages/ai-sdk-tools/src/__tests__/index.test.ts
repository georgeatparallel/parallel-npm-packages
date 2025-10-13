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
      expect(searchTool.description).toBe(
        'Search Tool to quickly search in websites and published/public information on the internet like news, articles, blogs, posts, products, services, etc.'
      );
      expect(searchTool.parameters).toBeDefined();
      expect(typeof searchTool.execute).toBe('function');
    });

    describe('parameter schema validation', () => {
      it('should accept valid objective parameter', () => {
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

      it('should accept valid processor types', () => {
        const resultPro = searchTool.parameters.safeParse({
          objective: 'Test query',
          processor: 'pro',
        });
        expect(resultPro.success).toBe(true);

        const resultBase = searchTool.parameters.safeParse({
          objective: 'Test query',
          processor: 'base',
        });
        expect(resultBase.success).toBe(true);
      });

      it('should reject invalid processor type', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          processor: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('should accept max_results parameter', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          max_results: 5,
        });
        expect(result.success).toBe(true);
      });

      it('should accept source_policy with include_domains', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          source_policy: {
            include_domains: ['example.com', 'test.org'],
          },
        });
        expect(result.success).toBe(true);
      });

      it('should accept source_policy with exclude_domains', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          source_policy: {
            exclude_domains: ['spam.com'],
          },
        });
        expect(result.success).toBe(true);
      });

      it('should accept source_policy with both include and exclude domains', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test query',
          source_policy: {
            include_domains: ['example.com'],
            exclude_domains: ['spam.com'],
          },
        });
        expect(result.success).toBe(true);
      });

      it('should accept all optional parameters together', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Complex search',
          search_queries: ['query1', 'query2'],
          processor: 'pro',
          max_results: 10,
          source_policy: {
            include_domains: ['example.com'],
            exclude_domains: ['spam.com'],
          },
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

      it('should reject non-number max_results', () => {
        const result = searchTool.parameters.safeParse({
          objective: 'Test',
          max_results: '5',
        });
        expect(result.success).toBe(false);
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
        'should execute basic search with objective',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'What is artificial intelligence?',
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
          expect(result.answer).toBeDefined();
        },
        30000
      ); // Increased timeout for API call

      it.concurrent(
        'should execute search with search_queries array',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Find information about machine learning',
              search_queries: ['machine learning basics', 'ML algorithms'],
            },
            {
              toolCallId: 'test-2',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.search_queries).toEqual([
            'machine learning basics',
            'ML algorithms',
          ]);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with pro processor',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Energy based models in machine learning',
              processor: 'pro',
            },
            {
              toolCallId: 'test-3',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.processor).toBe('pro');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with base processor',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'REI location near SOMA, San Francisco',
              processor: 'base',
            },
            {
              toolCallId: 'test-4',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.processor).toBe('base');
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should respect max_results parameter',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Top burger joints in Tokyo',
              max_results: 3,
            },
            {
              toolCallId: 'test-5',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.max_results).toBe(3);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with include_domains in source_policy',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Information about search engines',
              source_policy: {
                include_domains: ['wikipedia.org'],
              },
            },
            {
              toolCallId: 'test-6',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.source_policy).toBeDefined();
          expect(result.searchParams.source_policy?.include_domains).toEqual([
            'wikipedia.org',
          ]);
          expect(result.answer).toBeDefined();
        },
        30000
      );

      it.concurrent(
        'should execute search with exclude_domains in source_policy',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'General technology news',
              source_policy: {
                exclude_domains: ['example.com'],
              },
            },
            {
              toolCallId: 'test-7',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams.source_policy).toBeDefined();
          expect(result.searchParams.source_policy?.exclude_domains).toEqual([
            'example.com',
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
        'should execute search with all parameters',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'La Sportiva Ultra Raptor II',
              search_queries: [
                'La Sportiva Ultra Raptor reviews',
                'La Sportiva Ultra Raptor Two',
                'La Sportiva Ultra Raptor 2 review',
              ],
              processor: 'pro',
              max_results: 5,
              source_policy: {
                include_domains: ['rei.com'],
                exclude_domains: ['spam.com'],
              },
            },
            {
              toolCallId: 'test-9',
              messages: [],
            }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toMatchObject({
            objective: 'La Sportiva Ultra Raptor II',
            search_queries: [
              'La Sportiva Ultra Raptor reviews',
              'La Sportiva Ultra Raptor Two',
              'La Sportiva Ultra Raptor 2 review',
            ],
            processor: 'pro',
            max_results: 5,
            source_policy: {
              include_domains: ['rei.com'],
              exclude_domains: ['spam.com'],
            },
          });
          expect(result.answer).toBeDefined();
        },
        30000
      );
    }
  );
});
