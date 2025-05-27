// contracts/config.ts
import { getContract } from "thirdweb";
import { client } from "./client";

export const chain = {
  id: 44787,
  chainId: 44787,
  rpc: "https://alfajores-forno.celo-testnet.org",
  name: "Celo Alfajores",
  currency: { name: "Celo", symbol: "CELO", decimals: 18 },
  blockExplorerUrl: "https://alfajores.celoscan.io/",
};
// 1.WAS WORKING
// export const BLOCKCOOPTOKENS_CONTRACT_ADDRESS =
//   "0xc3522d1c550F70550B1c67A34c21Da589c2B3086";
// export const LOANMANAGER_CONTRACT_ADDRESS =
//   "0xca6DDCD5Df262b23a1e1A34c126Fa606CAbf58D4";

// 2.WAS WORKING
// export const LOANMANAGER_CONTRACT_ADDRESS =
//   "0xab78C6770DdE78978751b879c88020468d2eae70";

// export const BLOCKCOOPTOKENS_CONTRACT_ADDRESS =
//   "0xc5D2d6716232e949C8C6C66EE08AeE20BD730F4C";
// export const LOANMANAGER_CONTRACT_ADDRESS =
//   "0xDE7d49D940F1807D7b906a578Bf7B4F85DDCD55c";
// export const LOANMANAGER_CONTRACT_ADDRESS =
//   "0x8521671BA5065274f68e9F6b903839296c134701";
export const getContractInstance = () => {
  return getContract({
    client,
    address: BLOCKCOOPTOKENS_CONTRACT_ADDRESS,
    chain: chain,
  });
};
export const BLOCKCOOPTOKENS_CONTRACT_ADDRESS =
  "0xFB72F0acE60b8E8a2eAb5e98c9F005b422F5Cb70";
// "0x4CA138AA51187984b21961b7fAc784c729e34f1a";
export const LOANMANAGER_CONTRACT_ADDRESS =
  "0x1AaEb0D828adDebf9CB7c2A9f2E653d57557FCa3";
// "0x5B7511FC6ecDA99F7B4f0504EE850669cA9f8592";
export const getLoanManagerContractInstance = () => {
  return getContract({
    client,
    address: LOANMANAGER_CONTRACT_ADDRESS,
    chain: chain,
  });
};
