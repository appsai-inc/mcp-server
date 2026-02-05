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
 * - Platform Tools: billing, marketplace, seller, domain, team, transfer, settings, apikey, cost
 */
export type ToolCategory =
  | 'project' | 'canvas' | 'backend' | 'system' | 'mongodb' | 'agents'
  | 'billing' | 'marketplace' | 'seller' | 'domain' | 'team' | 'transfer' | 'settings' | 'apikey' | 'cost';

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
// User-level categories (don't require projectId): project, billing, seller, apikey, transfer
const CATEGORIES_REQUIRING_PROJECT_ID: ToolCategory[] = [
  'canvas', 'backend', 'system', 'mongodb', 'agents',
  'marketplace', 'domain', 'team', 'settings', 'cost'
];

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
    const errorData = (error as { data?: Record<string, unknown> })?.data;

    if (code === 402) {
      // Extract balance error details if available
      const shortfall = (errorData?.shortfall as number) || 10;
      const current = (errorData?.current as number) || 0;
      const required = (errorData?.required as number) || shortfall;
      const resourceType = (errorData?.resourceType as string) || 'general';

      // Return structured x402 payment info
      const paymentInfo = {
        error: 'INSUFFICIENT_BALANCE',
        code: 402,
        message: `Insufficient credits. Required: $${required.toFixed(2)}, Available: $${current.toFixed(2)}`,

        // x402 automatic payment support
        x402PaymentRequired: true,
        x402Endpoint: 'https://internal.appsai.com/x402/pay',

        // Payment details
        payment: {
          shortfall,
          current,
          required,
          resourceType,
          minimumTopUp: Math.max(10, Math.ceil(shortfall)),
          recommendedTopUp: Math.max(25, Math.ceil(shortfall * 1.2)),
        },

        // Supported payment methods
        supportedNetworks: ['ethereum', 'base', 'arbitrum', 'polygon'],
        acceptedTokens: ['USDC'],
        creditRate: 1, // 1 USDC = 1 credit

        // Manual payment fallback
        addFundsUrl: 'https://appsai.com/billing',
        apiEndpoints: {
          getPaymentInfo: 'https://internal.appsai.com/server/functions/getCryptoPaymentInfo',
          getPaymentRequirements: 'https://internal.appsai.com/server/functions/getX402PaymentRequirements',
          addFundsCrypto: 'https://internal.appsai.com/server/functions/addFundsCrypto',
        },
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(paymentInfo, null, 2) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: `Error executing ${toolName}: ${message}` }],
      isError: true,
    };
  }
}
