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

    // --- Test secret-scan --- (Commented out for now)
    // const toolNameSecretScan = "secret-scan";
    // const paramsSecretScan = { path: "./test-assets/dummy-secrets.txt" };
    // console.log(`Calling tool: ${toolNameSecretScan} with arguments:`, paramsSecretScan);
    // const resultSecretScan = await client.callTool({
    //   name: toolNameSecretScan,
    //   arguments: paramsSecretScan,
    // });
    // console.log("Secret Scan Tool call result:", JSON.stringify(resultSecretScan, null, 2));

    // --- Test secure-install: Good Package (axios) ---
    const toolNameSecureInstall = "secure-install";
    console.log(`
--- Test 1: Calling tool: ${toolNameSecureInstall} for a GOOD package (axios) ---`);
    let resultSecureInstall = await client.callTool({
      name: toolNameSecureInstall,
      arguments: { packageName: "axios" },
    });
    console.log("Secure Install (axios) result:", JSON.stringify(resultSecureInstall, null, 2));

    // --- Test secure-install: Dummy Package (vibesafe-dummy-test) - Check Only ---
    console.log(`
--- Test 2: Calling tool: ${toolNameSecureInstall} for a DUMMY package (vibesafe-dummy-test) - Check Only ---`);
    resultSecureInstall = await client.callTool({
      name: toolNameSecureInstall,
      arguments: { packageName: "vibesafe-dummy-test" }, // yes: false or undefined is implicit
    });
    console.log("Secure Install (vibesafe-dummy-test, check only) result:", JSON.stringify(resultSecureInstall, null, 2));

    // --- Test secure-install: Dummy Package (vibesafe-dummy-test) - Confirm Install ---
    console.log(`
--- Test 3: Calling tool: ${toolNameSecureInstall} for a DUMMY package (vibesafe-dummy-test) - Confirm Install ---`);
    resultSecureInstall = await client.callTool({
      name: toolNameSecureInstall,
      arguments: { packageName: "vibesafe-dummy-test", yes: true },
    });
    console.log("Secure Install (vibesafe-dummy-test, confirm install) result:", JSON.stringify(resultSecureInstall, null, 2));

    // --- Add more tool tests here as we develop them --- 

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