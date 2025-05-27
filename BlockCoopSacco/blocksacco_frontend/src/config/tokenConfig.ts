export interface TokenConfig {
  name: string;
  symbol: string;
  tokenAddress: string;
  priceFeedAddress: string;
}

interface NetworkTokens {
  [key: string]: TokenConfig[];
}

export const networkTokens: NetworkTokens = {
  // Celo Alfajores Testnet
  "44787": [
    {
      name: "Celo Dollar",
      symbol: "cUSD",
      tokenAddress: "0x874069fa1eb16d44d622f2e0ca25eea172369bc1",
      priceFeedAddress: "0x7A5f2F362c1c705D3E83EC86B5E4a2dA19328F01"
    },
    {
      name: "Celo",
      symbol: "CELO",
      tokenAddress: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
      priceFeedAddress: "0x7A5f2F362c1c705D3E83EC86B5E4a2dA19328F01"
    }
  ],
  // Celo Mainnet
  "42220": [
    {
      name: "Celo Dollar",
      symbol: "cUSD",
      tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      priceFeedAddress: "0x0000000000000000000000000000000000000000" // Replace with actual mainnet address
    },
    {
      name: "Celo",
      symbol: "CELO",
      tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
      priceFeedAddress: "0x0000000000000000000000000000000000000000" // Replace with actual mainnet address
    }
  ]
};
