import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function connectProvider(provider) {
  const client = new Client(
    {
      name: 'firecrawl-results-agent-benchmark',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  let transport;
  if (provider.transport === 'stdio') {
    transport = new StdioClientTransport({
      command: provider.command,
      args: provider.args,
      cwd: provider.cwd,
      env: provider.runtimeEnv,
      stderr: 'pipe',
    });
  } else if (provider.transport === 'streamable-http') {
    transport = new StreamableHTTPClientTransport(new URL(provider.runtimeUrl), {
      requestInit: {
        headers: provider.runtimeHeaders,
      },
    });
  } else {
    throw new Error(`Unsupported transport: ${provider.transport}`);
  }

  const started = performance.now();
  await client.connect(transport);
  const connectMs = Math.round(performance.now() - started);

  return {
    client,
    transport,
    connectMs,
    async close() {
      await client.close();
    },
  };
}

export async function listTools(provider) {
  const session = await connectProvider(provider);
  try {
    const started = performance.now();
    const response = await session.client.listTools();
    return {
      connectMs: session.connectMs,
      latencyMs: Math.round(performance.now() - started),
      response,
    };
  } finally {
    await session.close();
  }
}

export async function callTool(provider, name, args) {
  const session = await connectProvider(provider);
  try {
    const started = performance.now();
    const response = await session.client.callTool({
      name,
      arguments: args,
    });
    return {
      connectMs: session.connectMs,
      latencyMs: Math.round(performance.now() - started),
      response,
    };
  } finally {
    await session.close();
  }
}
