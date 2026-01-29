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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
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
        resources: {},
        prompts: {},
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

  // Handle resource listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      await ensureAuthenticated();
      return {
        resources: [
          {
            uri: 'appsai://projects',
            name: 'Projects',
            description: 'List of your AppsAI projects',
            mimeType: 'application/json',
          },
        ],
      };
    } catch {
      return { resources: [] };
    }
  });

  // Handle resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    console.error(`[MCP] Resource read: ${uri}`);

    try {
      const userId = await ensureAuthenticated();

      if (uri === 'appsai://projects') {
        const result = await executeToolCall('project_LIST_PROJECTS', {}, userId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: result.content[0].type === 'text' ? result.content[0].text : '[]',
            },
          ],
        };
      }

      // Handle appsai://project/{id}
      const projectMatch = uri.match(/^appsai:\/\/project\/(.+)$/);
      if (projectMatch) {
        const projectId = projectMatch[1];
        const result = await executeToolCall('project_GET_PROJECT_DETAILS', { projectId }, userId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: result.content[0].type === 'text' ? result.content[0].text : '{}',
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read resource: ${message}`);
    }
  });

  // Handle prompt listing
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'create-component',
          description: 'Generate a new React component with best practices',
          arguments: [
            { name: 'name', description: 'Component name', required: true },
            { name: 'projectId', description: 'Target project ID', required: true },
          ],
        },
        {
          name: 'fix-error',
          description: 'Debug and fix an error in your project',
          arguments: [
            { name: 'error', description: 'Error message or description', required: true },
            { name: 'projectId', description: 'Target project ID', required: true },
          ],
        },
        {
          name: 'deploy',
          description: 'Deploy your application to production',
          arguments: [
            { name: 'projectId', description: 'Project to deploy', required: true },
            { name: 'target', description: 'Deploy target: frontend, backend, or all', required: false },
          ],
        },
      ],
    };
  });

  // Handle prompt retrieval
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const prompts: Record<string, { description: string; content: string }> = {
      'create-component': {
        description: 'Generate a new React component',
        content: `Create a new React component named "${args?.name || 'Component'}" in project ${args?.projectId || 'unknown'}.

Requirements:
- Use TypeScript with proper types
- Follow React best practices
- Include proper exports
- Add basic styling if appropriate

Use the canvas_SET_RAW_FILE tool to create the component file.`,
      },
      'fix-error': {
        description: 'Debug and fix an error',
        content: `Fix the following error in project ${args?.projectId || 'unknown'}:

Error: ${args?.error || 'No error provided'}

Steps:
1. Use canvas_LIST_FILES to find relevant files
2. Use canvas_READ_RAW_FILE to examine the code
3. Use canvas_SET_RAW_FILE to apply the fix
4. Explain what caused the error and how you fixed it`,
      },
      'deploy': {
        description: 'Deploy application',
        content: `Deploy project ${args?.projectId || 'unknown'} to production.

Target: ${args?.target || 'all'}

Use the appropriate system tool:
- system_DEPLOY_FRONTEND for frontend only
- system_DEPLOY_BACKEND for backend only
- system_DEPLOY_ALL for full deployment

After deployment, use system_GET_ENVIRONMENT_STATUS to verify.`,
      },
    };

    const prompt = prompts[name];
    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    return {
      description: prompt.description,
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: prompt.content },
        },
      ],
    };
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
