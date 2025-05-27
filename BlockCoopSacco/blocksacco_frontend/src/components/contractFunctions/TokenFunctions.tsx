// TokenFunctions.tsx
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { chain } from "../../config";

// Get contract instance for a specific token
function getTokenContractInstance(tokenAddress: string) {
  return getContract({
    client,
    address: tokenAddress,
    chain,
  });
}

// Get token symbol
export function useTokenSymbol(tokenAddress: string | undefined) {
  return useReadContract({
    contract: tokenAddress ? getTokenContractInstance(tokenAddress) : undefined,
    method: "function symbol() view returns (string)",
    params: [],
  });
}

// Approve tokens for spending
export function useApproveToken() {
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const approveToken = async (
    tokenAddress: string,
    spender: string,
    amount: bigint
  ) => {
    const tokenContract = getTokenContractInstance(tokenAddress);
    const transaction = prepareContractCall({
      contract: tokenContract,
      method:
        "function approve(address spender, uint256 amount) returns (bool)",
      params: [spender, amount],
    });
    return await sendTransaction(transaction);
  };

  return approveToken;
}
