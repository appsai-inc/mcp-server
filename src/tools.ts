/**
 * MCP Tool Registry
 *
 * Converts OpenAI-style tool definitions to MCP format and routes tool calls.
 * All tool definitions come from the backend - this file handles:
 * - Converting to MCP format
 * - Injecting projectId where needed
 * - Routing tool calls to the backend
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { runCloudFunction } from './utils/parse.js';

/**
 * Tool categories matching the backend.
 * - AI Types: canvas, backend, mongodb, agents
 * - Shared Tools: project, system (available to all AIs)
 */
export type ToolCategory = 'project' | 'canvas' | 'backend' | 'system' | 'mongodb' | 'agents';

// OpenAI-style tool definition (matches backend ai-tools/types.ts)
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
const CATEGORIES_REQUIRING_PROJECT_ID: ToolCategory[] = ['canvas', 'backend', 'system', 'mongodb', 'agents'];

/**
 * Convert an OpenAI-style tool to MCP format
 * - Strips additionalProperties (Claude Code MCP bug workaround)
 * - Injects projectId parameter for categories that require it
 */
function convertToMCPTool(tool: AITool, category: ToolCategory): Tool {
  // Clone and strip additionalProperties which causes Claude Code to reject tools
  // See: https://github.com/anthropics/claude-code/issues/2682
  const { additionalProperties, ...cleanParams } = tool.parameters;

  // Inject projectId for categories that require it (only if not already present)
  if (CATEGORIES_REQUIRING_PROJECT_ID.includes(category)) {
    if (!cleanParams.properties.projectId) {
      cleanParams.properties = {
        projectId: {
          type: 'string',
          description: 'The project ID to execute this tool on. Required. Use project_LIST_APPS to see available apps.',
        },
        ...cleanParams.properties,
      };
    }
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

/**
 * Get all MCP tools
 * Fetches tool definitions from the backend
 */
export async function getAllTools(): Promise<Tool[]> {
  const tools: Tool[] = [];

  try {
    const result = await runCloudFunction<{ tools: Record<ToolCategory, AITool[]> }>('getMCPToolDefinitions', {});

    for (const [category, categoryTools] of Object.entries(result.tools)) {
      for (const tool of categoryTools) {
        tools.push(convertToMCPTool(tool, category as ToolCategory));
      }
    }
  } catch (error) {
    console.error('[Tools] Failed to fetch tool definitions from backend:', error);
    // No fallback - MCP server requires backend connectivity
  }

  return tools;
}

/**
 * Execute a tool call
 * Routes all tools through the unified executeMCPTool backend function
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
    const result = await runCloudFunction('executeMCPTool', {
      category,
      tool: name,
      params: args,
      userId,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = (error as { code?: number })?.code;

    if (code === 402) {
      return {
        content: [{ type: 'text', text: 'Insufficient credits. Add funds at https://appsai.com/billing' }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: `Error executing ${toolName}: ${message}` }],
      isError: true,
    };
  }
}
