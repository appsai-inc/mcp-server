#!/usr/bin/env node
/**
 * AppsAI MCP Server
 *
 * Exposes AppsAI tools to LLMs via the Model Context Protocol.
 * Supports all AI tool categories: project, canvas, server, system, aws, mongodb, agent.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { getAllTools, executeToolCall } from './tools.js';
import { validateAPIKey, initializeParse } from './utils/parse.js';

// Load environment variables
dotenv.config();

// Get API key from environment
const API_KEY = process.env.APPSAI_API_KEY;

// Cached user ID after validation
let cachedUserId: string | null = null;

/**
 * Validate the API key and cache the user ID
 */
async function ensureAuthenticated(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  if (!API_KEY) {
    throw new Error('APPSAI_API_KEY environment variable is required');
  }

  const result = await validateAPIKey(API_KEY);

  if (!result.valid) {
    throw new Error(result.error || 'Invalid API key');
  }

  cachedUserId = result.userId!;
  return cachedUserId;
}

/**
 * Create and configure the MCP server
 */
async function createServer() {
  // Initialize Parse SDK
  initializeParse();

  const server = new Server(
    {
      name: 'appsai',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      // Validate API key on first request
      await ensureAuthenticated();

      const tools = await getAllTools();
      console.error(`[MCP] Returning ${tools.length} tools`);

      return { tools };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCP] Error listing tools: ${message}`);

      // Return empty tools if auth fails
      return { tools: [] };
    }
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[MCP] Tool call: ${name}`);

    try {
      // Ensure authenticated
      const userId = await ensureAuthenticated();

      // Execute the tool
      const result = await executeToolCall(name, (args as Record<string, unknown>) || {}, userId);

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCP] Error executing ${name}: ${message}`);

      return {
        content: [{ type: 'text', text: `Authentication error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  console.error('[MCP] Starting AppsAI MCP Server...');

  try {
    const server = await createServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);
    console.error('[MCP] Server connected and ready');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MCP] Fatal error: ${message}`);
    process.exit(1);
  }
}

// Run the server
main();
