type KeeperHubContractCallInput = {
  network: string;
  contractAddress: string;
  functionName: string;
  functionArgs: unknown[];
  abi: unknown[];
  value?: string;
  gasLimitMultiplier?: string;
};

export async function keeperhubContractCall(input: KeeperHubContractCallInput) {
  const apiBase = process.env.KEEPERHUB_API_BASE!;
  const apiKey = process.env.KEEPERHUB_API_KEY!;

  const res = await fetch(`${apiBase}/execute/contract-call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: JSON.stringify({
      network: input.network,
      contractAddress: input.contractAddress,
      functionName: input.functionName,
      functionArgs: JSON.stringify(input.functionArgs),
      abi: JSON.stringify(input.abi),
      value: input.value ?? "0",
      gasLimitMultiplier: input.gasLimitMultiplier ?? "1.2"
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KeeperHub execution failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<{
    executionId?: string;
    status?: "completed" | "failed" | "pending" | "running";
    result?: unknown;
  }>;
}

