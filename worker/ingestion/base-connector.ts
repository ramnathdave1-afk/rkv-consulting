/**
 * BaseConnector — Abstract base class for all data ingestion connectors.
 *
 * Each connector implements:
 *   - fetch(): Pull raw data from the external source
 *   - transform(): Normalize raw records into our schema
 *   - load(): Upsert transformed records into Supabase
 *
 * The base class handles:
 *   - Job lifecycle (create, start, complete, fail)
 *   - Progress tracking and logging
 *   - Rate limiting and retry logic
 *   - Error handling with structured diagnostics
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

export interface ConnectorConfig {
  sourceSlug: string;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimitRpm: number;        // requests per minute
  timeoutMs: number;
}

export interface FetchResult<T = unknown> {
  records: T[];
  hasMore: boolean;
  cursor?: string;
  metadata?: Record<string, unknown>;
}

export interface TransformResult {
  table: string;
  records: Record<string, unknown>[];
  conflictColumns: string[];   // for upsert ON CONFLICT
}

export interface JobProgress {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
}

const DEFAULT_CONFIG: Partial<ConnectorConfig> = {
  batchSize: 500,
  maxRetries: 3,
  retryDelayMs: 2000,
  rateLimitRpm: 60,
  timeoutMs: 30000,
};

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected sourceId: string | null = null;
  protected jobId: string | null = null;
  protected progress: JobProgress = { fetched: 0, created: 0, updated: 0, skipped: 0, errored: 0 };
  protected warnings: string[] = [];
  private lastRequestTime = 0;
  private requestInterval: number;

  constructor(config: Partial<ConnectorConfig> & { sourceSlug: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ConnectorConfig;
    this.requestInterval = 60000 / this.config.rateLimitRpm;
  }

  /**
   * Main entry point. Runs the full ETL pipeline.
   */
  async run(options?: {
    states?: string[];
    counties?: string[];
    bbox?: [number, number, number, number];
    triggeredBy?: string;
  }): Promise<JobProgress> {
    const startTime = Date.now();

    try {
      // Resolve source
      await this.resolveSource();

      // Create job
      await this.createJob({
        targetStates: options?.states,
        targetCounties: options?.counties,
        targetBbox: options?.bbox,
        triggeredBy: options?.triggeredBy || 'schedule',
      });

      await this.log(`Starting ingestion from ${this.config.sourceSlug}`);

      // ETL
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        // Fetch
        const fetchResult = await this.retryWithBackoff(() =>
          this.fetch({
            states: options?.states,
            counties: options?.counties,
            bbox: options?.bbox,
            cursor,
            limit: this.config.batchSize,
          })
        );

        this.progress.fetched += fetchResult.records.length;

        if (fetchResult.records.length === 0) break;

        // Transform
        const transformed = await this.transform(fetchResult.records);

        // Load
        for (const batch of transformed) {
          await this.loadBatch(batch);
        }

        // Update job progress
        await this.updateJobProgress();

        hasMore = fetchResult.hasMore;
        cursor = fetchResult.cursor;

        await this.log(
          `Progress: ${this.progress.fetched} fetched, ${this.progress.created} created, ${this.progress.updated} updated`,
        );
      }

      // Complete job
      const durationMs = Date.now() - startTime;
      await this.completeJob(durationMs);
      await this.log(
        `Ingestion complete in ${(durationMs / 1000).toFixed(1)}s — ` +
        `${this.progress.created} created, ${this.progress.updated} updated, ${this.progress.skipped} skipped`,
      );

      return this.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      await this.failJob(message, stack);
      await this.log(`Ingestion failed: ${message}`, 'error');
      throw err;
    }
  }

  // ─── Abstract methods (connectors must implement) ────────────────────────

  /**
   * Fetch raw records from the external data source.
   */
  protected abstract fetch(params: {
    states?: string[];
    counties?: string[];
    bbox?: [number, number, number, number];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult>;

  /**
   * Transform raw records into normalized database rows.
   * Returns one or more TransformResults (a connector may write to multiple tables).
   */
  protected abstract transform(raw: unknown[]): Promise<TransformResult[]>;

  // ─── Load ────────────────────────────────────────────────────────────────

  private async loadBatch(batch: TransformResult): Promise<void> {
    if (batch.records.length === 0) return;

    const chunks = this.chunk(batch.records, this.config.batchSize);

    for (const chunk of chunks) {
      const { data, error, count } = await supabase
        .from(batch.table)
        .upsert(chunk, {
          onConflict: batch.conflictColumns.join(','),
          ignoreDuplicates: false,
          count: 'exact',
        })
        .select('id');

      if (error) {
        this.progress.errored += chunk.length;
        this.warnings.push(`Batch insert to ${batch.table} failed: ${error.message}`);
        await this.log(`Batch error on ${batch.table}: ${error.message}`, 'warn');
        continue;
      }

      // Supabase upsert doesn't distinguish created vs updated easily,
      // so we count all as "updated" and track net new separately
      const affected = data?.length || count || 0;
      this.progress.updated += affected;
    }
  }

  // ─── Job Lifecycle ───────────────────────────────────────────────────────

  private async resolveSource(): Promise<void> {
    const { data, error } = await supabase
      .from('data_sources')
      .select('id')
      .eq('slug', this.config.sourceSlug)
      .single();

    if (error || !data) {
      throw new Error(`Data source '${this.config.sourceSlug}' not found. Run migrations first.`);
    }

    this.sourceId = data.id;
  }

  private async createJob(params: {
    targetStates?: string[];
    targetCounties?: string[];
    targetBbox?: [number, number, number, number];
    triggeredBy: string;
  }): Promise<void> {
    const { data, error } = await supabase
      .from('ingestion_jobs')
      .insert({
        source_id: this.sourceId,
        status: 'running',
        triggered_by: params.triggeredBy,
        target_states: params.targetStates || null,
        target_counties: params.targetCounties || null,
        target_bbox: params.targetBbox || null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create ingestion job: ${error?.message}`);
    }

    this.jobId = data.id;
  }

  private async updateJobProgress(): Promise<void> {
    if (!this.jobId) return;

    await supabase
      .from('ingestion_jobs')
      .update({
        records_fetched: this.progress.fetched,
        records_created: this.progress.created,
        records_updated: this.progress.updated,
        records_skipped: this.progress.skipped,
        records_errored: this.progress.errored,
      })
      .eq('id', this.jobId);
  }

  private async completeJob(durationMs: number): Promise<void> {
    if (!this.jobId) return;

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        records_fetched: this.progress.fetched,
        records_created: this.progress.created,
        records_updated: this.progress.updated,
        records_skipped: this.progress.skipped,
        records_errored: this.progress.errored,
        warnings: this.warnings.length > 0 ? this.warnings : null,
      })
      .eq('id', this.jobId);
  }

  private async failJob(message: string, stack?: string): Promise<void> {
    if (!this.jobId) return;

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now(),
        error_message: message,
        error_stack: stack || null,
        records_fetched: this.progress.fetched,
        records_created: this.progress.created,
        records_updated: this.progress.updated,
        records_errored: this.progress.errored,
        warnings: this.warnings.length > 0 ? this.warnings : null,
      })
      .eq('id', this.jobId);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  /**
   * Rate-limited HTTP fetch with timeout.
   */
  protected async httpFetch(url: string, init?: RequestInit): Promise<Response> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestInterval) {
      await this.sleep(this.requestInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Retry a function with exponential backoff.
   */
  protected async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.log(`Retry ${attempt + 1}/${this.config.maxRetries} after ${delay}ms: ${lastError.message}`, 'warn');
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected async log(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📥';
    await logActivity('zeta' as any, `[${this.config.sourceSlug}] ${prefix} ${message}`, {
      source: this.config.sourceSlug,
      jobId: this.jobId,
      level,
      progress: { ...this.progress },
    });
  }

  protected chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
