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

### For Humans
1. Sign up at [appsai.com](https://appsai.com)
2. Go to **Settings > Billing > API Keys**
3. Click **Create API Key**
4. Copy the key (shown once)

### For AI Agents (Autonomous Registration)

AI agents can register and obtain API keys programmatically using wallet-based authentication:

```python
import requests
from eth_account import Account
from eth_account.messages import encode_defunct

# Agent's wallet
private_key = "0x..."
account = Account.from_key(private_key)

BASE_URL = "https://internal.appsai.com/server/functions"
HEADERS = {"Content-Type": "application/json", "X-Parse-Application-Id": "appsai"}

# 1. Get nonce
nonce_data = requests.post(f"{BASE_URL}/getAgentAuthNonce", headers=HEADERS, json={}).json()["result"]

# 2. Sign the message
signed = account.sign_message(encode_defunct(text=nonce_data["message"]))

# 3. Register and get API key
result = requests.post(f"{BASE_URL}/registerAgentWallet", headers=HEADERS, json={
    "walletAddress": account.address,
    "signature": signed.signature.hex(),
    "nonce": nonce_data["nonce"]
}).json()["result"]

api_key = result["apiKey"]  # Use this with MCP
```

### Adding Credits via Crypto

Agents can pay for credits using USDC on supported chains (Ethereum, Base, Arbitrum, Polygon):

```python
# 1. Get payment info
info = requests.post(f"{BASE_URL}/getCryptoPaymentInfo", headers=HEADERS, json={}).json()["result"]
receiving_wallet = info["receivingWallet"]

# 2. Send USDC to receiving_wallet (via your preferred method)

# 3. Verify transaction and add credits
result = requests.post(f"{BASE_URL}/addFundsCrypto", headers=HEADERS, json={
    "walletAddress": account.address,
    "txHash": "0xYOUR_TX_HASH",
    "chainId": 8453  # Base
}).json()["result"]

print(f"Credits added: {result['creditsAdded']}")
```

For detailed API documentation, see [Agent API Docs](https://github.com/appsai-inc/mcp-server/blob/main/docs/agent-api.md).

## Tools (150+ Total)

### Core Development Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Project** | 5 | Create, list, and manage projects |
| **Canvas** | 25 | Edit React components, styles, and assets |
| **Backend** | 18 | Backend code, S3, CloudFormation, and AWS infrastructure |
| **System** | 11 | Deploy frontend/backend, connect apps, manage MCP servers |
| **MongoDB** | 18 | Database and collection management |
| **Agents** | 9 | AI prompt management and versioning |

### Platform Management Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Billing** | 15 | Subscription, credits, payments, invoices |
| **Marketplace** | 12 | Publish, browse, and purchase templates |
| **Seller** | 5 | Stripe Connect, earnings, seller dashboard |
| **Domain** | 7 | Subdomain and custom domain management |
| **Team** | 7 | Collaborators, permissions, invitations |
| **Transfer** | 6 | Project ownership transfers |
| **Settings** | 4 | Project display settings and metadata |
| **API Keys** | 3 | Platform API key management |
| **Cost** | 6 | AWS costs, usage metrics, forecasts |

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

### Billing Tools

| Tool | Description |
|------|-------------|
| `billing_GET_CURRENT_PLAN` | Get subscription plan details |
| `billing_CREATE_CHECKOUT` | Start subscription purchase |
| `billing_GET_PORTAL_SESSION` | Open Stripe billing portal |
| `billing_ADD_FUNDS` | Add credits to account |
| `billing_GET_AVAILABLE_CREDITS` | Get current credit balance |
| `billing_GET_INVOICES` | List invoices |
| `billing_GET_PAYMENT_METHODS` | List saved payment methods |

### Marketplace Tools

| Tool | Description |
|------|-------------|
| `marketplace_PUBLISH_TEMPLATE` | Publish project to marketplace |
| `marketplace_UNPUBLISH_TEMPLATE` | Remove from marketplace |
| `marketplace_GET_TEMPLATES` | Browse marketplace templates |
| `marketplace_GET_TEMPLATE_DETAILS` | Get template info |
| `marketplace_FORK_TEMPLATE` | Fork a template |
| `marketplace_GET_MY_PUBLISHED` | User's published templates |
| `marketplace_GET_MY_PURCHASES` | Purchase history |

### Domain Tools

| Tool | Description |
|------|-------------|
| `domain_CHECK_AVAILABILITY` | Check subdomain availability |
| `domain_UPDATE_SUBDOMAIN` | Update project subdomain |
| `domain_ADD_CUSTOM_DOMAIN` | Add custom domain |
| `domain_VERIFY_CUSTOM_DOMAIN` | Verify DNS configuration |
| `domain_REMOVE_CUSTOM_DOMAIN` | Remove custom domain |

### Team Tools

| Tool | Description |
|------|-------------|
| `team_GET_COLLABORATORS` | List project collaborators |
| `team_INVITE_COLLABORATOR` | Invite user to project |
| `team_REMOVE_COLLABORATOR` | Remove collaborator |
| `team_UPDATE_PERMISSIONS` | Change collaborator role |

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

"Check my current plan"
→ billing_GET_CURRENT_PLAN

"Publish my project to the marketplace"
→ marketplace_PUBLISH_TEMPLATE

"Add a custom domain"
→ domain_ADD_CUSTOM_DOMAIN

"Invite john@example.com to my project"
→ team_INVITE_COLLABORATOR
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
