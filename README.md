# AppsAI MCP Server

Build and deploy full-stack Next.js apps with AI. This MCP server connects Claude Code, Cursor, Windsurf, and other AI tools to your AppsAI projects.

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

## Tools (90+ Total)

| Category | Tools | Description |
|----------|-------|-------------|
| **Project** | 5 | Create, list, and manage projects |
| **Canvas** | 25 | Edit React components, styles, and assets |
| **Server** | 6 | Backend Parse Server cloud functions |
| **System** | 7 | Deploy frontend/backend, connect apps |
| **AWS** | 23 | CloudFormation, S3, EC2, and more |
| **MongoDB** | 18 | Database and collection management |
| **Agents** | 9 | AI prompt management and versioning |

## Example Usage

```
"List my projects"
→ project_LIST_PROJECTS

"Create a new Next.js app"
→ project_CREATE_APP

"Show the file tree for project abc123"
→ canvas_LIST_FILES

"Deploy the frontend"
→ system_DEPLOY_FRONTEND
```

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
