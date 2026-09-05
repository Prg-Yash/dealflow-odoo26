import { type Job as BullJob } from "bullmq";
import { prisma, JobStatus, LogLevel, Prisma } from "@repo/db";
import { type HeavyComputeJobData } from "../queues/index.js";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface ComputeResult {
  checksum: number;
  matrixDimensions: string;
  operationsPerformed: number;
  durationMs: number;
  workerId: string;
  completedAt: string;
}

/**
 * Heavy mathematical compute simulation (matrix multiplication & data transformations)
 */
function performMatrixMultiplication(size: number, iterations: number, onProgress?: (pct: number) => void): number {
  let checksum = 0;
  
  for (let it = 0; it < iterations; it++) {
    // Generate deterministic test matrices
    const A: number[][] = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => ((i * size + j + it) % 100) / 10)
    );
    const B: number[][] = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => ((j * size + i + it) % 100) / 10)
    );

    // Matrix multiplication C = A * B
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          sum += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
        }
        checksum = (checksum + sum) % 1_000_000_007;
      }
    }

    if (onProgress) {
      const progressPercent = Math.round(((it + 1) / iterations) * 100);
      onProgress(progressPercent);
    }
  }

  return checksum;
}

export async function processHeavyComputeJob(bullJob: BullJob<HeavyComputeJobData>): Promise<ComputeResult> {
  const startTime = Date.now();
  const { data } = bullJob;
  const taskType = data.taskType || "matrix-multiplication";
  const matrixSize = Math.min(Math.max(data.matrixSize ?? 64, 16), 256);
  const iterations = Math.min(Math.max(data.iterations ?? 10, 1), 100);

  logger.info(`Starting heavy compute job #${bullJob.id} [${taskType}] (matrix: ${matrixSize}x${matrixSize}, iters: ${iterations})`);

  let dbJobId = data.jobId;

  // Persist / initialize job record in NeonDB
  try {
    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: JobStatus.PROCESSING,
          workerId: ENV.WORKER_ID,
          attempts: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } else {
      const created = await prisma.job.create({
        data: {
          name: `Compute Task: ${taskType}`,
          type: taskType,
          payload: (data.parameters ?? { matrixSize, iterations }) as Prisma.InputJsonValue,
          status: JobStatus.PROCESSING,
          workerId: ENV.WORKER_ID,
          userId: data.userId,
          attempts: 1,
        },
      });
      dbJobId = created.id;
    }

    // Log initialization step in database
    await prisma.taskLog.create({
      data: {
        jobId: dbJobId,
        level: LogLevel.INFO,
        message: `Job picked up by worker ${ENV.WORKER_ID}. Starting compute execution.`,
        metadata: { matrixSize, iterations, taskType } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logger.warn(`Could not sync initial job status to NeonDB (continuing compute): ${(err as Error).message}`);
  }

  try {
    // Execute compute with progress updates
    const checksum = performMatrixMultiplication(matrixSize, iterations, async (pct) => {
      await bullJob.updateProgress(pct);

      if (dbJobId && pct % 25 === 0) {
        try {
          await prisma.job.update({
            where: { id: dbJobId },
            data: { progress: pct },
          });
        } catch {
          // Non-blocking progress update
        }
      }
    });

    const durationMs = Date.now() - startTime;
    const operationsPerformed = iterations * matrixSize * matrixSize * matrixSize;

    const result: ComputeResult = {
      checksum,
      matrixDimensions: `${matrixSize}x${matrixSize}`,
      operationsPerformed,
      durationMs,
      workerId: ENV.WORKER_ID,
      completedAt: new Date().toISOString(),
    };

    logger.info(`Completed heavy compute job #${bullJob.id} in ${durationMs}ms (checksum: ${checksum})`);

    // Record completion in NeonDB
    if (dbJobId) {
      try {
        await prisma.job.update({
          where: { id: dbJobId },
          data: {
            status: JobStatus.COMPLETED,
            progress: 100,
            result: result as unknown as Prisma.InputJsonValue,
            durationMs,
            processedAt: new Date(),
          },
        });

        await prisma.taskLog.create({
          data: {
            jobId: dbJobId,
            level: LogLevel.INFO,
            message: `Compute completed successfully in ${durationMs}ms with ${operationsPerformed.toLocaleString()} ops.`,
            metadata: result as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        logger.error(`Failed to record job completion to NeonDB: ${(err as Error).message}`);
      }
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Heavy compute job #${bullJob.id} failed after ${durationMs}ms:`, error);

    if (dbJobId) {
      try {
        await prisma.job.update({
          where: { id: dbJobId },
          data: {
            status: JobStatus.FAILED,
            error: errorMessage,
            durationMs,
            processedAt: new Date(),
          },
        });

        await prisma.taskLog.create({
          data: {
            jobId: dbJobId,
            level: LogLevel.ERROR,
            message: `Job failed: ${errorMessage}`,
            metadata: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined } as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        logger.error(`Failed to record job error to NeonDB: ${(err as Error).message}`);
      }
    }

    throw error;
  }
}
