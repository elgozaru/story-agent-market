import { z } from "zod";
import {
  HexAddressSchema,
  KeeperHubExecutionResultSchema,
  type HexAddress,
  type KeeperHubExecutionResult
} from "@story/shared";

const KeeperHubApiErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional()
  }).passthrough()
});

const KeeperHubExecutionStatusResponseSchema =
  KeeperHubExecutionResultSchema.passthrough();

export type KeeperHubClientConfig = {
  apiBase?: string;
  apiKey?: string;
  timeoutMs?: number;
};

export type ContractCallInput = {
  network: string;
  contractAddress: HexAddress;
  functionName: string;
  functionArgs?: unknown[];
  abi?: unknown[];
  valueWei?: string;
  gasLimitMultiplier?: string;
};

export class KeeperHubError extends Error {
  readonly status: number;
  readonly responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = "KeeperHubError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class KeeperHubClient {
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: KeeperHubClientConfig = {}) {
    this.apiBase =
      config.apiBase ??
      process.env.KEEPERHUB_API_BASE ??
      "https://app.keeperhub.com/api";

    this.apiKey = config.apiKey ?? process.env.KEEPERHUB_API_KEY ?? "";
    this.timeoutMs = config.timeoutMs ?? 30_000;

    if (!this.apiKey) {
      throw new Error("Missing KeeperHub API key. Set KEEPERHUB_API_KEY.");
    }
  }

  async executeContractCall(
    input: ContractCallInput
  ): Promise<KeeperHubExecutionResult> {
    HexAddressSchema.parse(input.contractAddress);

    const body = {
      network: input.network,
      contractAddress: input.contractAddress,
      functionName: input.functionName,
      functionArgs: JSON.stringify(input.functionArgs ?? []),
      abi: input.abi ? JSON.stringify(input.abi) : undefined,
      value: input.valueWei ?? "0",
      gasLimitMultiplier: input.gasLimitMultiplier ?? "1.2"
    };

    const response = await this.request<unknown>(
      "/execute/contract-call",
      "POST",
      body
    );

    return KeeperHubExecutionResultSchema.parse(unwrapData(response));
  }

  async getExecutionStatus(executionId: string): Promise<KeeperHubExecutionResult> {
    if (!executionId) {
      throw new Error("executionId is required");
    }

    const response = await this.request<unknown>(
      `/execute/${encodeURIComponent(executionId)}/status`,
      "GET"
    );

    return KeeperHubExecutionStatusResponseSchema.parse(unwrapData(response));
  }

  async waitForExecution(input: {
    executionId: string;
    pollEveryMs?: number;
    timeoutMs?: number;
  }): Promise<KeeperHubExecutionResult> {
    const startedAt = Date.now();
    const pollEveryMs = input.pollEveryMs ?? 2_000;
    const timeoutMs = input.timeoutMs ?? 60_000;

    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.getExecutionStatus(input.executionId);

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await sleep(pollEveryMs);
    }

    throw new Error(
      `Timed out waiting for KeeperHub execution ${input.executionId}`
    );
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown
  ): Promise<T> {
    const url = `${this.apiBase.replace(/\/$/, "")}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      const text = await res.text();
      const json = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        const parsedError = KeeperHubApiErrorSchema.safeParse(json);
        const message =
          parsedError.success && parsedError.data.error.message
            ? parsedError.data.error.message
            : `KeeperHub request failed with HTTP ${res.status}`;

        throw new KeeperHubError(message, res.status, json);
      }

      return json as T;
    } catch (error) {
      if (error instanceof KeeperHubError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`KeeperHub request timed out after ${this.timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function executeContractCallWithKeeperHub(
  input: ContractCallInput,
  config?: KeeperHubClientConfig
): Promise<KeeperHubExecutionResult> {
  const client = new KeeperHubClient(config);
  return client.executeContractCall(input);
}

function unwrapData(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    "data" in value &&
    Object.keys(value as Record<string, unknown>).length === 1
  ) {
    return (value as { data: unknown }).data;
  }

  return value;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}