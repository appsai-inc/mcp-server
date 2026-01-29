/**
 * MCP Tool Registry
 *
 * Converts OpenAI-style tool definitions to MCP format and routes tool calls.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { runCloudFunction } from './utils/parse.js';

// Tool categories matching the backend AI types
export type ToolCategory = 'project' | 'canvas' | 'server' | 'system' | 'aws' | 'mongodb' | 'agent' | 'shared';

// OpenAI-style tool definition (matches backend ai-tools/types.ts)
interface AITool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };
}

/**
 * Convert an OpenAI-style tool to MCP format
 */
function convertToMCPTool(tool: AITool, category: ToolCategory): Tool {
  return {
    name: `${category}_${tool.name}`,
    description: tool.description,
    inputSchema: tool.parameters as Tool['inputSchema'],
  };
}

// Project management tools (new for MCP)
const projectTools: AITool[] = [
  {
    type: 'function',
    name: 'LIST_PROJECTS',
    description: 'List all projects owned by or shared with the authenticated user',
    parameters: {
      type: 'object',
      properties: {
        skip: { type: 'number', description: 'Number of projects to skip (for pagination)' },
        limit: { type: 'number', description: 'Maximum number of projects to return (default 20)' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'GET_TEMPLATES',
    description: 'Get available starter templates for creating new projects',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'CREATE_PROJECT',
    description: 'Create a new project from a starter template',
    parameters: {
      type: 'object',
      properties: {
        templateS3Key: { type: 'string', description: 'S3 key of the starter template to use' },
      },
      required: ['templateS3Key'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'GET_PROJECT_DETAILS',
    description: 'Get detailed information about a specific project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'DELETE_PROJECT',
    description: 'Delete a project (owner only). This action cannot be undone.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'The project ID to delete' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
];

// Map project tool names to cloud functions
const projectToolToCloudFunction: Record<string, string> = {
  LIST_PROJECTS: 'getUserProjects',
  GET_TEMPLATES: 'getTemplates',
  CREATE_PROJECT: 'createProject',
  GET_PROJECT_DETAILS: 'getProjectDetails',
  DELETE_PROJECT: 'deleteProject',
};

// Map category tools to cloud functions
const categoryToolToCloudFunction: Record<ToolCategory, string> = {
  project: 'executeProjectTool',
  canvas: 'executeMCPTool',
  server: 'executeMCPTool',
  system: 'executeMCPTool',
  aws: 'executeMCPTool',
  mongodb: 'executeMCPTool',
  agent: 'executeMCPTool',
  shared: 'executeMCPTool',
};

/**
 * Get all MCP tools
 * Fetches tool definitions from Parse Server
 */
export async function getAllTools(): Promise<Tool[]> {
  const tools: Tool[] = [];

  // Add project tools (defined locally)
  for (const tool of projectTools) {
    tools.push(convertToMCPTool(tool, 'project'));
  }

  // Fetch category tools from backend
  try {
    const result = await runCloudFunction<{ tools: Record<ToolCategory, AITool[]> }>('getMCPToolDefinitions', {});

    for (const [category, categoryTools] of Object.entries(result.tools)) {
      for (const tool of categoryTools) {
        tools.push(convertToMCPTool(tool, category as ToolCategory));
      }
    }
  } catch (error) {
    console.error('[Tools] Failed to fetch tool definitions from backend:', error);
    // Return just project tools if backend is unavailable
  }

  return tools;
}

/**
 * Execute a tool call
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  // Parse tool name: category_TOOL_NAME
  const underscoreIndex = toolName.indexOf('_');
  if (underscoreIndex === -1) {
    return {
      content: [{ type: 'text', text: `Invalid tool name format: ${toolName}` }],
      isError: true,
    };
  }

  const category = toolName.substring(0, underscoreIndex) as ToolCategory;
  const name = toolName.substring(underscoreIndex + 1);

  try {
    let result: unknown;

    if (category === 'project') {
      // Handle project tools with direct cloud function mapping
      const cloudFunction = projectToolToCloudFunction[name];
      if (!cloudFunction) {
        return {
          content: [{ type: 'text', text: `Unknown project tool: ${name}` }],
          isError: true,
        };
      }
      result = await runCloudFunction(cloudFunction, { ...args, _mcpUserId: userId });
    } else {
      // Handle category tools via unified MCP executor
      result = await runCloudFunction('executeMCPTool', {
        category,
        tool: name,
        params: args,
        userId,
      });
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = (error as { code?: number })?.code;

    if (code === 402) {
      return {
        content: [{ type: 'text', text: 'Insufficient credits. Please add funds at appsai.com/billing' }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: `Error executing ${toolName}: ${message}` }],
      isError: true,
    };
  }
}
