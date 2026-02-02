# AppsAI MCP Server

Build and deploy full-stack apps with AI. This MCP server connects Claude Code, Cursor, Windsurf, and other AI tools to your AppsAI projects.

**Supported stacks:**
- **Frontend:** Next.js with React, Tailwind CSS, and shadcn/ui
- **Backend:** Parse Server, Express, Fastify, Hono, Supabase Edge Functions, Firebase Cloud Functions, Serverless Framework, or custom
- **Database:** MongoDB Atlas (managed)
- **Infrastructure:** AWS (S3, CloudFormation, EC2, Lambda, and more)

## Installation

### Claude Code
```bash
claude mcp add appsai -e APPSAI_API_KEY=your_key -- npx -y @appsai/mcp-server
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "appsai": {
      "command": "npx",
      "args": ["-y", "@appsai/mcp-server"],
      "env": {
        "APPSAI_API_KEY": "your_key"
      }
    }
  }
}
```

### Cursor / Windsurf
Add to MCP settings with:
- **Command:** `npx -y @appsai/mcp-server`
- **Environment:** `APPSAI_API_KEY=your_key`

## Getting Your API Key

1. Sign up at [appsai.com](https://appsai.com)
2. Go to **Settings > Billing > API Keys**
3. Click **Create API Key**
4. Copy the key (shown once)

## Tools (95+ Total)

| Category | Tools | Description |
|----------|-------|-------------|
| **Project** | 5 | Create, list, and manage projects |
| **Canvas** | 25 | Edit React components, styles, and assets |
| **Backend** | 18 | Backend code, S3, CloudFormation, and AWS infrastructure |
| **System** | 11 | Deploy frontend/backend, connect apps, manage MCP servers |
| **MongoDB** | 18 | Database and collection management |
| **Agents** | 9 | AI prompt management and versioning |

### System Tools

| Tool | Description |
|------|-------------|
| `system_DEPLOY_BACKEND` | Deploy backend infrastructure |
| `system_DEPLOY_FRONTEND` | Deploy frontend to CDN |
| `system_DEPLOY_ALL` | Deploy both frontend and backend |
| `system_GET_ENVIRONMENT_STATUS` | Get deployment status and URLs |
| `system_GET_DEPLOY_ARTIFACTS` | Get deployment artifacts and history |
| `system_CONNECT_APP` | Connect two projects for cross-app operations |
| `system_DISCONNECT_APP` | Remove connection between projects |
| `system_ADD_MCP_SERVER` | Add an external MCP server to a project |
| `system_LIST_MCP_SERVERS` | List configured MCP servers |
| `system_UPDATE_MCP_SERVER` | Update MCP server configuration |
| `system_REMOVE_MCP_SERVER` | Remove an MCP server from project |

## Example Usage

```
"List my apps"
→ project_LIST_APPS

"Create a new Next.js app"
→ project_CREATE_APP

"Show the file tree for project abc123"
→ canvas_LIST_FILES

"Deploy the frontend"
→ system_DEPLOY_FRONTEND

"Add an MCP server to my project"
→ system_ADD_MCP_SERVER
```

## MCP Server Integration

AppsAI projects can connect to external MCP servers, giving your AI agents access to additional tools:

```
"Add the Stripe MCP server to my project"
→ system_ADD_MCP_SERVER with serverUrl and serverLabel

"List my configured MCP servers"
→ system_LIST_MCP_SERVERS

"Disable the Stripe MCP server"
→ system_UPDATE_MCP_SERVER with enabled: false
```

Once configured, AI agents in your AppsAI project can use tools from connected MCP servers.

## Resources

The server provides project context as MCP resources:
- `appsai://projects` - List of your projects
- `appsai://project/{id}` - Project details and file structure

## Prompts

Built-in prompts to build full applications:
- `build-youtube` - Build a YouTube clone with video uploads and comments
- `build-slack` - Build a Slack clone with real-time messaging
- `build-twitter` - Build a Twitter/X clone with posts and follows
- `connect-apps` - Connect two AppsAI projects together

## Requirements

- Node.js 18+
- AppsAI account with credits
- API key from Settings > Billing

## Documentation

- [AppsAI Docs](https://appsai.com/docs)
- [MCP Integration Guide](https://appsai.com/docs/mcp)

## Support

- [GitHub Issues](https://github.com/appsai-inc/mcp-server/issues)
- [Discord](https://discord.gg/appsai)

## License

MIT
