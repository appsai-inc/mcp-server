/**
 * MCP Tool Registry
 *
 * Converts OpenAI-style tool definitions to MCP format and routes tool calls.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { runCloudFunction } from './utils/parse.js';

// Tool categories matching the backend AI types
// Note: 'shared' tools (DECLARE_*_NEED) excluded - they're for internal AI coordination
// MCP callers have direct access to all underlying tools
export type ToolCategory = 'project' | 'canvas' | 'server' | 'system' | 'aws' | 'mongodb' | 'agents';

// OpenAI-style tool definition (matches backend ai-tools/types.ts)
// Note: additionalProperties is optional - Claude Code has bugs with it set
interface AITool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties?: boolean;
  };
}

// Categories that require projectId for execution
const CATEGORIES_REQUIRING_PROJECT_ID: ToolCategory[] = ['canvas', 'server', 'system', 'aws', 'mongodb', 'agents'];

/**
 * Convert an OpenAI-style tool to MCP format
 * Note: We strip additionalProperties to fix Claude Code MCP bug
 * See: https://github.com/anthropics/claude-code/issues/2682
 *
 * Also injects projectId parameter for tools that require it.
 * This enables connected apps - AI can target different projects.
 */
function convertToMCPTool(tool: AITool, category: ToolCategory): Tool {
  // Clone and strip additionalProperties which causes Claude Code to reject tools
  const { additionalProperties, ...cleanParams } = tool.parameters;

  // Inject projectId for categories that require it (only if not already present)
  if (CATEGORIES_REQUIRING_PROJECT_ID.includes(category)) {
    // Check if projectId already exists in the tool schema (backend may define it)
    if (!cleanParams.properties.projectId) {
      cleanParams.properties = {
        projectId: {
          type: 'string',
          description: 'The project ID to execute this tool on. Required. Use project_LIST_PROJECTS to see available projects.',
        },
        ...cleanParams.properties,
      };
    }
    // Add projectId to required array if not already there
    if (!cleanParams.required.includes('projectId')) {
      cleanParams.required = ['projectId', ...cleanParams.required];
    }
  }

  return {
    name: `${category}_${tool.name}`,
    description: tool.description,
    inputSchema: cleanParams as Tool['inputSchema'],
  };
}

// Project management tools (new for MCP)
// Note: Removed additionalProperties to fix Claude Code MCP tool registration bug
// See: https://github.com/anthropics/claude-code/issues/2682
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
    },
  },
  {
    type: 'function',
    name: 'GET_TEMPLATES',
    description: 'Get available starter templates for creating new projects',
    parameters: {
      type: 'object',
      properties: {
        _placeholder: { type: 'string', description: 'Unused parameter (no parameters required)' },
      },
      required: [],
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
  agents: 'executeMCPTool',
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
