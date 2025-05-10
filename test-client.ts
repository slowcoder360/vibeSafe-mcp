import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";

async function runTest() {
  const serverCommand = "node";
  const serverArgs = ["build/src/index.js"];

  console.log(`Setting up MCP client to spawn server with: ${serverCommand} ${serverArgs.join(' ')}`);

  const transport = new StdioClientTransport({
    command: serverCommand,
    args: serverArgs,
  });

  const client = new Client({
    name: "VibeSafeTestClient",
    version: "0.1.0",
  });

  let serverProcess: ChildProcess | undefined = undefined;

  try {
    await client.connect(transport);
    console.log("MCP Client connected to server.");

    if ('process' in transport && transport.process instanceof ChildProcess) {
      serverProcess = transport.process;
      console.log(`Server process PID: ${serverProcess?.pid}`);
    }

    const toolName = "secret-scan";
    const params = { path: "./test-assets/dummy-secrets.txt" };

    console.log(`Calling tool: ${toolName} with arguments:`, params);
    const result = await client.callTool({
      name: toolName,
      arguments: params,
    });
    console.log("Tool call result:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("MCP Client Error:", error);
  } finally {
    console.log("Disconnecting client and attempting to terminate server...");
    await client.close();

    if (serverProcess && !serverProcess.killed) {
      console.log(`Terminating server process PID: ${serverProcess.pid}`);
      const killed = serverProcess.kill();
      console.log(`Server process termination attempt result: ${killed}`);
    } else if (!serverProcess) {
      console.warn("Could not get server process handle from transport to terminate it. The StdioClientTransport might handle this automatically upon client.close().");
    }
    console.log("Test finished.");
  }
}

runTest().catch(console.error); 