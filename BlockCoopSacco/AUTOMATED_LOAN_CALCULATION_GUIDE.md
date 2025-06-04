# 🤖 Automated Loan Calculation System

## Overview

This system **completely eliminates manual "from chart" inputs** and replaces them with automated, real-time market data fetching for accurate loan limit calculations.

## ❌ Before: Manual Chart Inputs

Your loan calculation chart showed these **manual inputs**:

| Parameter                 | Manual Value                | Source                             |
| ------------------------- | --------------------------- | ---------------------------------- |
| Collateral value          | 100,000.00                  | ✅ **User Input** (stays manual)   |
| Base LTV Ratio            | 80%                         | ✅ **Admin Config** (stays manual) |
| **Volatility Adjustment** | **7% from chart**           | ❌ **Manual chart lookup**         |
| **24hr Volume**           | **5,000,000.00 from chart** | ❌ **Manual chart lookup**         |
| **Liquidity adjustment**  | **1**                       | ❌ **Manual adjustment**           |
| Loan Period               | 21                          | ✅ **User Input** (stays manual)   |

## ✅ After: Automated Market Data

Now these values are **automatically fetched and calculated**:

| Parameter                 | Automated Source                                    | Update Frequency |
| ------------------------- | --------------------------------------------------- | ---------------- |
| **Volatility Adjustment** | **CoinGecko price history + real-time calculation** | **Every hour**   |
| **24hr Volume**           | **Uniswap V3 + DEX aggregators + CoinGecko**        | **Every hour**   |
| **Liquidity adjustment**  | **Pool depth analysis + market cap scoring**        | **Every hour**   |

## 🏗️ System Architecture

```
External APIs → Market Data Oracle → Loan Manager → Final Loan Limit
     ↓                  ↓                ↓              ↓
CoinGecko API      Store/Process    Calculate      Automated
Uniswap Graph      Market Data      Adjusted       Decision
DEX APIs          Real-time        LTV Ratio
```

## 📊 Calculation Flow

### 1. **Volatility Calculation** (Replaces "7% from chart")

```javascript
// OLD: Manual chart lookup → "7% from chart"
// NEW: Automated calculation
const volatility = calculateRealVolatility(tokenSymbol);
// ↓ Fetches 7 days of price history from CoinGecko
// ↓ Calculates actual price volatility mathematically
// ↓ Returns real volatility (e.g., 12% if market is volatile)
```

### 2. **Volume Fetching** (Replaces "5,000,000.00 from chart")

```javascript
// OLD: Manual chart lookup → "5,000,000.00 from chart"
// NEW: Automated aggregation
const volume = await fetchRealVolume(tokenAddress);
// ↓ Aggregates from multiple sources:
//   - CoinGecko 24h volume
//   - Uniswap V3 subgraph data
//   - DEX aggregator APIs
// ↓ Returns weighted average (e.g., $3,200,000 actual volume)
```

### 3. **Liquidity Scoring** (Replaces manual adjustment)

```javascript
// OLD: Manual adjustment → "1"
// NEW: Automated scoring
const liquidityScore = calculateLiquidityScore(volume, marketCap);
// ↓ Analyzes:
//   - Trading volume tiers
//   - Market capitalization
//   - Pool depth metrics
// ↓ Returns dynamic score (0-100%, e.g., 85% for good liquidity)
```

### 4. **Final LTV Calculation**

```solidity
// Automated adjustment in smart contract
uint256 adjustedLTV = marketDataOracle.calculateLoanLimitAdjustment(
    collateralToken,
    baseLTV
);

// Applies all automated factors:
// adjustedLTV = baseLTV * volatilityFactor * liquidityFactor
```

## 🚀 Deployment Instructions

### 1. Install Dependencies

```bash
cd BlockCoopSacco/hardhat-javascript-starter
npm install
```

### 2. Deploy Oracle Contract

```bash
npm run oracle:deploy
```

### 3. Configure Environment

```bash
# Add to .env file:
MARKET_DATA_ORACLE_ADDRESS=<deployed_oracle_address>
LOAN_MANAGER_ADDRESS=<your_loan_manager_address>
```

### 4. Start Automation

```bash
# Start continuous automation (updates every hour)
npm run oracle:start

# Or run one-time test
npm run oracle:test
```

## 🔧 Configuration

### Set Token Base LTV Ratios

```javascript
// Configure base LTV for each token (admin function)
await loanManager.setTokenBaseLTV(
  "0x...", // token address
  8000 // 80% base LTV
);
```

### Monitor Market Data

```javascript
// Check current automated data
const [volatility, volume, liquidityScore] =
  await marketDataOracle.getMarketData(tokenAddress);

console.log(`Volatility: ${volatility / 100}%`); // e.g., "12%" (was "7% from chart")
console.log(`Volume: $${volume.toLocaleString()}`); // e.g., "$3,200,000" (was "5,000,000.00 from chart")
console.log(`Liquidity Score: ${liquidityScore / 100}%`); // e.g., "85%" (was manual "1")
```

## 📈 Example Transformation

### Scenario: User wants $70,000 loan with $100,000 ETH collateral

#### ❌ **Before (Manual)**:

```
Collateral: $100,000 ETH
Base LTV: 80%
Volatility: 7% from chart ← MANUAL
Volume: $5,000,000 from chart ← MANUAL
Liquidity: 1 ← MANUAL
Final Loan Limit: 70.15% → $70,150
```

#### ✅ **After (Automated)**:

```
Collateral: $100,000 ETH
Base LTV: 80%
Volatility: 12% (real-time) ← AUTOMATED
Volume: $3,200,000 (live DEX data) ← AUTOMATED
Liquidity: 85% (pool analysis) ← AUTOMATED
Final Loan Limit: 65.2% → $65,200
```

**Result**: More accurate, conservative lending based on **real market conditions** instead of static chart values.

## ⚡ Real-time Benefits

### 1. **Dynamic Risk Management**

- High volatility → Lower loan limits automatically
- Low liquidity → Conservative lending
- High volume → More confidence in pricing

### 2. **Market-Responsive Lending**

- Bull market: Higher loan limits due to lower volatility
- Bear market: Lower loan limits due to higher volatility
- Stable periods: Optimal loan limits

### 3. **Eliminate Human Error**

- No more manual chart reading
- No outdated data entry
- Consistent, mathematical calculations

## 🔄 Automation Features

### Continuous Updates

```bash
⏰ Update Schedule: Every 60 minutes
📊 Data Sources: 3+ APIs per metric
🔄 Fallback System: Multiple data source redundancy
📈 Real-time Alerts: Significant market changes
```

### Monitoring Dashboard

```javascript
// Get loan calculation breakdown
const breakdown = await loanManager.getLoanCalculationBreakdown(
  tokenAddress,
  collateralValue
);

console.log("Base LTV:", breakdown.baseLTV / 100, "%");
console.log("Adjusted LTV:", breakdown.adjustedLTV / 100, "%");
console.log("Max Loan:", breakdown.maxLoanValue);
console.log("Market Data:", breakdown.marketData);
```

## 🛡️ Safety Features

### 1. **Data Validation**

- Multiple API sources prevent single point of failure
- Outlier detection and filtering
- Maximum/minimum bounds on all adjustments

### 2. **Gradual Updates**

- Volatility capped at 50% maximum
- Liquidity scores bounded 50%-100%
- LTV never exceeds 70% hard limit

### 3. **Emergency Fallbacks**

- If APIs fail → Use conservative defaults
- If oracle fails → Revert to base LTV only
- Admin override capabilities maintained

## 📋 Usage Examples

### For Borrowers

```javascript
// Check your potential loan limit
const collateralValue = 100000; // $100k
const breakdown = await loanManager.getLoanCalculationBreakdown(
  collateralToken,
  collateralValue
);

console.log(`With $${collateralValue} collateral:`);
console.log(`Maximum loan: $${breakdown.maxLoanValue}`);
console.log(`Current market volatility: ${breakdown.marketData[0] / 100}%`);
```

### For Admins

```javascript
// Monitor all token market data
const tokens = await loanManager.getSupportedTokens();
for (const token of tokens) {
  const data = await marketDataOracle.getMarketData(token);
  console.log(
    `${token}: ${data.volatility / 100}% vol, $${data.volume24h} volume`
  );
}
```

## 🎯 Success Metrics

This automation system has **eliminated**:

- ❌ Manual chart lookups for volatility
- ❌ Manual volume data entry
- ❌ Manual liquidity adjustments
- ❌ Outdated market data
- ❌ Human calculation errors

And **enabled**:

- ✅ Real-time market responsiveness
- ✅ Mathematical precision in loan calculations
- ✅ Dynamic risk management
- ✅ 24/7 automated operations
- ✅ Multi-source data reliability

---

**🎉 Your loan calculation system is now fully automated and market-responsive!**

No more "from chart" manual inputs. Every market data point is now live, accurate, and automatically updated every hour.
