#!/usr/bin/env node
/**
 * AppsAI MCP Server
 *
 * Exposes AppsAI tools to LLMs via the Model Context Protocol.
 * Supports all AI tool categories: project, canvas, backend, system, mongodb, agents.
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
          name: 'build-youtube',
          description: 'Build a YouTube clone with video uploads, playback, and comments',
          arguments: [
            { name: 'projectId', description: 'Target project ID', required: true },
          ],
        },
        {
          name: 'build-slack',
          description: 'Build a Slack clone with real-time messaging and channels',
          arguments: [
            { name: 'projectId', description: 'Target project ID', required: true },
          ],
        },
        {
          name: 'build-twitter',
          description: 'Build a Twitter/X clone with posts, likes, and follows',
          arguments: [
            { name: 'projectId', description: 'Target project ID', required: true },
          ],
        },
        {
          name: 'connect-apps',
          description: 'Connect two AppsAI projects to share data and functionality',
          arguments: [
            { name: 'sourceProjectId', description: 'Source project ID', required: true },
            { name: 'targetProjectId', description: 'Target project ID', required: true },
          ],
        },
      ],
    };
  });

  // Handle prompt retrieval
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const prompts: Record<string, { description: string; content: string }> = {
      'build-youtube': {
        description: 'Build a YouTube clone',
        content: `Build a YouTube clone in project ${args?.projectId || 'unknown'}.

Features to implement:
1. Video upload with S3 storage (use backend_createS3Bucket, backend_uploadFilesToS3)
2. Video playback page with player component
3. Video listing/feed with thumbnails
4. Comments system with MongoDB (use mongodb_createCollection)
5. Like/dislike functionality
6. User channels and subscriptions
7. Search functionality

Start by listing current files with canvas_LIST_FILES, then build each feature incrementally.
Deploy with system_DEPLOY_ALL when ready.`,
      },
      'build-slack': {
        description: 'Build a Slack clone',
        content: `Build a Slack clone in project ${args?.projectId || 'unknown'}.

Features to implement:
1. Real-time messaging with Parse Live Queries
2. Channels (public and private)
3. Direct messages between users
4. Message threads and replies
5. File sharing with S3 (use backend_createS3Bucket)
6. User presence (online/offline status)
7. Message search
8. Emoji reactions

Set up MongoDB collections for messages, channels, and users.
Use backend_SET_BACKEND_FILE for backend real-time logic.
Deploy with system_DEPLOY_ALL when ready.`,
      },
      'build-twitter': {
        description: 'Build a Twitter/X clone',
        content: `Build a Twitter/X clone in project ${args?.projectId || 'unknown'}.

Features to implement:
1. Post tweets (280 char limit)
2. Image/video uploads to S3
3. Like and retweet functionality
4. Follow/unfollow users
5. User profiles with bio and avatar
6. Home feed with posts from followed users
7. Trending topics
8. Notifications

Set up MongoDB collections for posts, users, follows, likes.
Build the feed algorithm in backend code.
Deploy with system_DEPLOY_ALL when ready.`,
      },
      'connect-apps': {
        description: 'Connect two AppsAI projects',
        content: `Connect project ${args?.sourceProjectId || 'source'} to project ${args?.targetProjectId || 'target'}.

This enables:
1. Shared authentication between apps
2. Cross-app data access
3. Unified API endpoints
4. Shared MongoDB collections

Steps:
1. Get details of both projects with project_GET_PROJECT_DETAILS
2. Set up shared environment variables in both projects
3. Configure CORS for cross-origin requests
4. Create shared API endpoints in backend code
5. Deploy both projects

Use canvas_SET_ENV_VARIABLE and backend_SET_BACKEND_ENV_VARIABLE to configure connections.`,
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
