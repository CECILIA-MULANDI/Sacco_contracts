# BlockSacco - Decentralized Cooperative Lending Platform

BlockSacco is a decentralized finance (DeFi) platform that enables cooperative-style lending and borrowing using blockchain technology. The platform allows users to deposit ERC20 tokens as collateral and request loans against their deposits, with fund managers overseeing the approval process.

## 🏗️ Project Architecture

The project consists of three main components:

### 1. Smart Contracts (`BlockCoopSacco/hardhat-javascript-starter/contracts/`)

- **BlockCoopTokens.sol**: Core token management contract handling deposits, withdrawals, and collateral management
- **LoanManager.sol**: Loan lifecycle management including requests, approvals, and repayments

### 2. Frontend Application (`BlockCoopSacco/blocksacco_frontend/`)

- React + TypeScript application built with Vite
- Thirdweb integration for Web3 connectivity
- Role-based access control (Owner, Fund Manager, User)
- Tailwind CSS for styling

### 3. Smart Contract Development Environment (`BlockCoopSacco/hardhat-javascript-starter/`)

- Hardhat configuration for zkSync Era deployment
- Thirdweb deployment integration
- OpenZeppelin and Chainlink dependencies

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- MetaMask or compatible Web3 wallet



### Development

1. **Start Frontend Development Server**

   ```bash
   cd BlockCoopSacco/blocksacco_frontend
   npm run dev
   ```

2. **Compile Smart Contracts**

   ```bash
   cd BlockCoopSacco/hardhat-javascript-starter
   npx hardhat compile
   ```

3. **Deploy Smart Contracts**
   ```bash
   npx thirdweb deploy -k <your-private-key>
   ```

## 📋 Core Features

### Token Management (BlockCoopTokens)

- **Multi-token Support**: Deposit various whitelisted ERC20 tokens
- **Price Feed Integration**: Chainlink oracles for real-time token pricing
- **Collateral Management**: Lock/unlock tokens for loan collateral
- **Role-based Access**: Owner and fund manager permissions
- **Emergency Controls**: Pause functionality and emergency withdrawals

### Loan Management (LoanManager)

- **Loan Requests**: Users can request loans against their deposits
- **Risk Assessment**: Automated LTV (Loan-to-Value) ratio calculations
- **Interest Rate Calculation**: Dynamic rates based on risk factors
- **Repayment System**: Partial or full loan repayments
- **Collateral Return**: Automatic collateral release upon full repayment

### Frontend Features

- **Wallet Integration**: Seamless Web3 wallet connectivity
- **Role-based Dashboards**: Different interfaces for owners, fund managers, and users
- **Real-time Data**: Live contract state updates
- **Responsive Design**: Mobile-friendly interface
- **Transaction Management**: Easy contract interaction

## 🔧 Smart Contract Details

### BlockCoopTokens Contract

**Key Functions:**

- `depositTokens(address token, uint256 amount)`: Deposit tokens to the cooperative
- `withdrawTokens(address token, uint256 amount)`: Withdraw available tokens
- `whitelistToken(address token, address priceFeed)`: Add supported tokens (Owner/Fund Manager)
- `lockDepositAsCollateral()`: Lock tokens for loan collateral
- `unlockCollateral()`: Release collateral after loan repayment

**Security Features:**

- ReentrancyGuard protection
- Pausable functionality
- Emergency pause with timelock
- Multi-signature support for critical operations

### LoanManager Contract

**Key Functions:**

- `requestLoan()`: Submit a loan request with collateral
- `approveLoanRequest()`: Approve loan requests (Fund Manager)
- `repayLoan()`: Make loan repayments
- `addSupportedLoanToken()`: Add tokens available for borrowing

**Risk Management:**

- Maximum LTV ratio: 70%
- Required collateral ratio: 150%
- Interest rate range: 0-50%
- Loan duration limits: 7 days to 365 days

## 🎯 User Roles & Permissions

### Contract Owner

- Deploy and configure contracts
- Add/remove fund managers
- Whitelist tokens and price feeds
- Emergency controls
- Set loan manager contract

### Fund Manager

- Approve/reject loan requests
- Add supported loan tokens
- Manage lending pool liquidity
- Whitelist new tokens

### Regular User

- Deposit/withdraw tokens
- Request loans
- Repay loans
- View portfolio and loan history

## 📁 Project Structure

```
modified_BlockSacco/
├── current_working_v1/           # Latest contract versions
│   ├── BlockCoop.sol
│   └── LoanManager.sol
├── BlockCoopSacco/
│   ├── hardhat-javascript-starter/  # Smart contract development
│   │   ├── contracts/
│   │   ├── scripts/
│   │   ├── test/
│   │   └── hardhat.config.js
│   ├── blocksacco_frontend/         # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── config/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── decision.txt                 # Deployment decisions
└── README.md
```

## 🔄 Typical User Flow

1. **Setup Phase**

   - Owner deploys contracts
   - Owner adds fund managers
   - Fund managers whitelist tokens and set price feeds

2. **User Interaction**

   - User connects wallet to frontend
   - User deposits ERC20 tokens to cooperative
   - User requests loan specifying collateral and loan terms

3. **Loan Process**
   - Fund manager reviews loan request
   - System validates collateral and LTV ratio
   - Upon approval, loan is issued and collateral locked
   - User repays loan over time
   - Collateral released upon full repayment

## 🛠️ Development Commands

### Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy with Thirdweb
npx thirdweb deploy

# Verify contracts
npx hardhat verify --network zkSyncSepoliaTestnet <contract-address>
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔗 Deployed Contracts

- **BlockCoopTokens**: `0xFB72F0acE60b8E8a2eAb5e98c9F005b422F5Cb70`

- **LoanManager**:
  `0x1AaEb0D828adDebf9CB7c2A9f2E653d57557FCa3`;

---

**Note**: This is a DeFi application handling financial transactions. Always conduct thorough testing and security audits before deploying to mainnet.
