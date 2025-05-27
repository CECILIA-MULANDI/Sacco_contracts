import { useContractEvents } from "thirdweb/react";
import { prepareEvent } from "thirdweb";
import { getContractInstance } from "../../config";
import { useEffect, useState } from "react";

function createEventHook(eventSignature: `event ${string}`) {
  const contract = getContractInstance();
  const preparedEvent = prepareEvent({
    signature: eventSignature,
  });

  return function (txHash?: string) {
    const [lastBlock, setLastBlock] = useState<bigint>(0n);
    const [pollingCount, setPollingCount] = useState(0);

    const {
      data: events,
      isLoading,
      error,
      refetch
    } = useContractEvents({
      contract,
      events: [preparedEvent],
      fromBlock: lastBlock, // Start from last known block
    });

    // If we have a transaction hash, poll for new events
    useEffect(() => {
      if (txHash && pollingCount < 5) { // Try up to 5 times
        const pollTimer = setTimeout(() => {
          console.log(`Polling for events after tx ${txHash}, attempt ${pollingCount + 1}`);
          refetch();
          setPollingCount(prev => prev + 1);
        }, 2000); // Poll every 2 seconds

        return () => clearTimeout(pollTimer);
      }
    }, [txHash, pollingCount, refetch]);

    if (error) {
      console.error(`Error in ${eventSignature}:`, error);
    }

    // Always log events status for debugging
    console.log(`${eventSignature} status:`, {
      events: events || [],
      isLoading,
      error,
      contract: contract?.address,
      txHash,
      pollingCount
    });

    return { events, isLoading, error, refetch };
  };
}

// Create specific hooks using the helper function
export const useFundManagerAddedEvents = createEventHook(
  "event FundManagerAdded(address indexed fundManager)"
);

export const useFundManagerRemovedEvents = createEventHook(
  "event FundManagerRemoved(address indexed fundManager)"
);
export const useTokenWhitelistedEvents = createEventHook(
  "event TokenWhitelisted(address indexed tokenAddress, address indexed priceFeed)"
);

export const useDepositEvents = createEventHook(
  "event Deposit(address indexed user, address indexed tokenAddress, uint256 amount)"
);

export const useWithdrawEvents = createEventHook(
  "event Withdraw(address indexed user, address indexed tokenAddress, uint256 amount)"
);
