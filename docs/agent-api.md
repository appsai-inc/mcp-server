# AppsAI Agent API

This document describes the API endpoints for AI agents to autonomously register, authenticate, and pay for AppsAI services.

## Overview

AI agents can use AppsAI without human intervention by:
1. Registering with a wallet address (cryptographic signature as authentication)
2. Adding credits via USDC payments on supported chains
3. Using the MCP server with the generated API key

## Base URL

```
https://internal.appsai.com/server/functions
```

All endpoints use POST method with JSON body.

---

## Authentication Endpoints

### Get Auth Nonce

Get a nonce for signing. This must be called before registration/sign-in.

```bash
curl -X POST https://internal.appsai.com/server/functions/getAgentAuthNonce \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{}'
```

**Response:**
```json
{
  "result": {
    "nonce": "1706900000000-abc123...",
    "message": "Sign in to AppsAI as AI Agent: 1706900000000-abc123...",
    "expiresIn": 300000
  }
}
```

---

### Register Agent Wallet

Register a new agent or sign in an existing one. Returns an API key.

```bash
curl -X POST https://internal.appsai.com/server/functions/registerAgentWallet \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{
    "walletAddress": "0x1234567890abcdef...",
    "signature": "0xSIGNATURE_FROM_WALLET",
    "nonce": "1706900000000-abc123..."
  }'
```

**Response (new user):**
```json
{
  "result": {
    "success": true,
    "isNewUser": true,
    "userId": "abc123",
    "walletAddress": "0x1234567890abcdef...",
    "apiKey": "appsai_abc123def456...",
    "apiKeyPrefix": "appsai_abc123d...",
    "message": "Agent registered successfully. API key generated."
  }
}
```

**Response (existing user):**
```json
{
  "result": {
    "success": true,
    "isNewUser": false,
    "userId": "abc123",
    "walletAddress": "0x1234567890abcdef...",
    "apiKey": "appsai_new_key_here...",
    "apiKeyPrefix": "appsai_new_ke...",
    "message": "Signed in successfully. API key generated."
  }
}
```

---

### Sign In Agent Wallet

For existing agents to get a new API key.

```bash
curl -X POST https://internal.appsai.com/server/functions/signInAgentWallet \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{
    "walletAddress": "0x1234567890abcdef...",
    "signature": "0xSIGNATURE_FROM_WALLET",
    "nonce": "1706900000000-abc123..."
  }'
```

---

### Get Agent Info

Check if an agent is registered and get their credit balance.

```bash
curl -X POST https://internal.appsai.com/server/functions/getAgentInfo \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{
    "walletAddress": "0x1234567890abcdef..."
  }'
```

**Response:**
```json
{
  "result": {
    "registered": true,
    "walletAddress": "0x1234567890abcdef...",
    "userId": "abc123",
    "availableCredits": 100,
    "createdAt": "2024-02-01T00:00:00.000Z",
    "isAgent": true
  }
}
```

---

## Payment Endpoints

### Get Crypto Payment Info

Get supported chains, token addresses, and the receiving wallet.

```bash
curl -X POST https://internal.appsai.com/server/functions/getCryptoPaymentInfo \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{}'
```

**Response:**
```json
{
  "result": {
    "receivingWallet": "0xAPPSAI_WALLET_ADDRESS",
    "supportedChains": [
      {
        "chainId": 1,
        "name": "Ethereum",
        "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "tokenSymbol": "USDC",
        "tokenDecimals": 6,
        "requiredConfirmations": 12
      },
      {
        "chainId": 8453,
        "name": "Base",
        "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "tokenSymbol": "USDC",
        "tokenDecimals": 6,
        "requiredConfirmations": 6
      },
      {
        "chainId": 42161,
        "name": "Arbitrum",
        "tokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        "tokenSymbol": "USDC",
        "tokenDecimals": 6,
        "requiredConfirmations": 6
      },
      {
        "chainId": 137,
        "name": "Polygon",
        "tokenAddress": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "tokenSymbol": "USDC",
        "tokenDecimals": 6,
        "requiredConfirmations": 128
      }
    ],
    "minimumAmount": 10,
    "creditRate": 1,
    "instructions": [
      "1. Send USDC to the receiving wallet on any supported chain",
      "2. Wait for required confirmations",
      "3. Call addFundsCrypto with the transaction hash",
      "4. Credits will be added to your account"
    ]
  }
}
```

---

### Add Funds via Crypto

After sending USDC, call this to verify the transaction and add credits.

```bash
curl -X POST https://internal.appsai.com/server/functions/addFundsCrypto \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{
    "walletAddress": "0xYOUR_WALLET_ADDRESS",
    "txHash": "0xTRANSACTION_HASH",
    "chainId": 8453
  }'
```

**Response:**
```json
{
  "result": {
    "success": true,
    "alreadyProcessed": false,
    "creditsAdded": 100,
    "usdcAmount": 100.0,
    "chainName": "Base",
    "previousBalance": 0,
    "newBalance": 100,
    "expiresAt": "2027-02-03T00:00:00.000Z",
    "message": "Successfully added 100 credits to your account"
  }
}
```

---

### Get Crypto Transaction History

```bash
curl -X POST https://internal.appsai.com/server/functions/getCryptoTransactionHistory \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{
    "walletAddress": "0xYOUR_WALLET_ADDRESS",
    "limit": 50
  }'
```

---

## x402 Automatic Payments

The x402 protocol enables automatic USDC credit top-ups when an agent encounters insufficient credits. Instead of failing, the agent can automatically pay and retry.

### How It Works

1. Agent calls an MCP tool
2. Tool fails with 402 (insufficient credits)
3. Response includes x402 payment requirements
4. Agent's x402 client (e.g., `@x402/fetch`) auto-pays USDC
5. Credits are added to account
6. Original request is retried and succeeds

### x402 Endpoints

Base URL: `https://internal.appsai.com`

#### Get x402 Info

```bash
curl https://internal.appsai.com/x402/info
```

**Response:**
```json
{
  "version": "1.0",
  "protocol": "x402",
  "supportedNetworks": ["ethereum", "base", "arbitrum", "polygon"],
  "acceptedTokens": ["USDC"],
  "creditRate": 1,
  "minimumPayment": 10
}
```

#### Get Payment Requirements

Called when you need to top up credits.

```bash
curl -X POST https://internal.appsai.com/x402/pay \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "shortfall": 25.00,
    "resourceType": "ai"
  }'
```

**Response (HTTP 402):**
```json
{
  "paymentRequired": true,
  "version": "1.0",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "chainId": 8453,
      "asset": {
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "symbol": "USDC",
        "decimals": 6
      },
      "payTo": "0xAPPSAI_WALLET",
      "minAmount": "25000000",
      "recommendedAmount": "30000000"
    }
  ],
  "endpoints": {
    "verify": "https://internal.appsai.com/server/functions/verifyX402Payment",
    "settle": "https://internal.appsai.com/server/functions/settleX402Payment"
  },
  "expiresAt": "2024-02-03T12:05:00.000Z"
}
```

#### Settle Payment

After sending USDC, settle the payment to add credits.

```bash
curl -X POST https://internal.appsai.com/x402/settle \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xTRANSACTION_HASH",
    "chainId": 8453,
    "walletAddress": "0xYOUR_WALLET"
  }'
```

**Response:**
```json
{
  "success": true,
  "creditsAdded": 25,
  "usdcAmount": 25.0,
  "previousBalance": 0,
  "newBalance": 25,
  "message": "Successfully added 25 credits via x402"
}
```

### Using with @x402/fetch (Recommended)

The easiest way to use x402 is with the `@x402/fetch` library, which handles payment automatically.

```javascript
import { wrapFetchWithPayment } from '@x402/fetch';
import { ethers } from 'ethers';

// Your agent's wallet
const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY);

// Create a fetch wrapper that auto-pays on 402
const x402Fetch = wrapFetchWithPayment(fetch, {
  wallet,
  // Supported networks
  networks: ['base', 'arbitrum'],
  // Auto-approve payments up to this amount
  maxAutoPayment: 100, // $100 USDC
});

// Now use x402Fetch for API calls - payments happen automatically!
const response = await x402Fetch('https://internal.appsai.com/x402/pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'abc123', shortfall: 25 }),
});
```

### MCP Tool 402 Response

When an MCP tool fails due to insufficient credits, it returns structured payment info:

```json
{
  "error": "INSUFFICIENT_BALANCE",
  "code": 402,
  "message": "Insufficient credits. Required: $25.00, Available: $0.00",
  "x402PaymentRequired": true,
  "x402Endpoint": "https://internal.appsai.com/x402/pay",
  "payment": {
    "shortfall": 25,
    "current": 0,
    "required": 25,
    "minimumTopUp": 25,
    "recommendedTopUp": 30
  },
  "supportedNetworks": ["ethereum", "base", "arbitrum", "polygon"],
  "acceptedTokens": ["USDC"],
  "addFundsUrl": "https://appsai.com/billing"
}
```

---

## Code Examples

### Python Agent Registration

```python
import requests
from eth_account import Account
from eth_account.messages import encode_defunct

# Your agent's private key (keep this secret!)
private_key = "0x..."
account = Account.from_key(private_key)

BASE_URL = "https://internal.appsai.com/server/functions"
HEADERS = {
    "Content-Type": "application/json",
    "X-Parse-Application-Id": "YOUR_APP_ID"
}

# Step 1: Get nonce
response = requests.post(f"{BASE_URL}/getAgentAuthNonce", headers=HEADERS, json={})
nonce_data = response.json()["result"]
message = nonce_data["message"]
nonce = nonce_data["nonce"]

# Step 2: Sign the message
message_hash = encode_defunct(text=message)
signed = account.sign_message(message_hash)

# Step 3: Register
response = requests.post(f"{BASE_URL}/registerAgentWallet", headers=HEADERS, json={
    "walletAddress": account.address,
    "signature": signed.signature.hex(),
    "nonce": nonce
})

result = response.json()["result"]
api_key = result["apiKey"]
print(f"API Key: {api_key}")
```

### Node.js Agent Registration

```javascript
const { ethers } = require('ethers');

const privateKey = '0x...';
const wallet = new ethers.Wallet(privateKey);

const BASE_URL = 'https://internal.appsai.com/server/functions';
const headers = {
  'Content-Type': 'application/json',
  'X-Parse-Application-Id': 'YOUR_APP_ID'
};

async function registerAgent() {
  // Step 1: Get nonce
  const nonceRes = await fetch(`${BASE_URL}/getAgentAuthNonce`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const { result: { message, nonce } } = await nonceRes.json();

  // Step 2: Sign the message
  const signature = await wallet.signMessage(message);

  // Step 3: Register
  const regRes = await fetch(`${BASE_URL}/registerAgentWallet`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      walletAddress: wallet.address,
      signature,
      nonce
    })
  });

  const { result } = await regRes.json();
  console.log('API Key:', result.apiKey);
  return result.apiKey;
}

registerAgent();
```

### Adding Credits via USDC

```python
from web3 import Web3

# Connect to Base
w3 = Web3(Web3.HTTPProvider('https://mainnet.base.org'))

# USDC contract on Base
USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
APPSAI_WALLET = "0x..."  # Get from getCryptoPaymentInfo

# Standard ERC20 ABI for transfer
ERC20_ABI = [{"constant":False,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]

usdc = w3.eth.contract(address=USDC_ADDRESS, abi=ERC20_ABI)

# Amount in USDC (100 USDC = 100 * 10^6 because USDC has 6 decimals)
amount = 100 * 10**6

# Build and send transaction
tx = usdc.functions.transfer(APPSAI_WALLET, amount).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
    'gas': 100000,
    'maxFeePerGas': w3.eth.gas_price,
    'maxPriorityFeePerGas': w3.to_wei(1, 'gwei'),
})

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
print(f"Transaction sent: {tx_hash.hex()}")

# Wait for confirmations, then call addFundsCrypto
```

---

## Using with MCP

Once you have an API key, set it as an environment variable:

```bash
export APPSAI_API_KEY=appsai_your_key_here
```

Then connect your AI tool (Claude Code, Cursor, etc.) to the AppsAI MCP server.

---

## Rate Limits

- Registration: 10 requests per minute per IP
- Payment verification: 30 requests per minute per wallet
- API calls via MCP: Based on your credit balance

---

## Error Codes

| Error | Description |
|-------|-------------|
| `Invalid wallet address format` | Wallet address is not a valid Ethereum address |
| `Invalid signature` | Signature verification failed |
| `Nonce expired` | Nonce is older than 5 minutes |
| `Nonce already used` | Replay attack prevention |
| `No account found for this wallet` | Use registerAgentWallet instead of signInAgentWallet |
| `Transaction not found` | Transaction may still be pending |
| `Transaction needs X confirmations` | Wait for more block confirmations |
| `No valid USDC transfer found` | Transaction doesn't contain a USDC transfer to AppsAI wallet |
| `Minimum payment is $10 USDC` | Send at least $10 USDC |
