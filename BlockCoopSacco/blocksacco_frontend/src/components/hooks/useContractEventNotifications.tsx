import { useState, useEffect } from "react";
import { useMessages } from "./useSuccessOrErrorMessage";

export function useContractEventNotifications(
  eventObject: { events: any[] | undefined; isLoading: boolean; error: any },
  successMessageFormatter: (event: any) => string,
  expectedTxHash?: string
) {
  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();
  const [lastProcessedEventHash, setLastProcessedEventHash] = useState("");
  const [processedHashes] = useState(new Set<string>());

  useEffect(() => {
    const { events, error } = eventObject;

    if (error) {
      console.error('Event processing error:', error);
      return;
    }

    if (events && events.length > 0) {
      // Process all new events, focusing on the expected transaction if provided
      for (const event of events) {
        const txHash = event.transactionHash;
        
        // Skip if we've already processed this event
        if (processedHashes.has(txHash)) continue;

        // If we're looking for a specific transaction and this is it, or if we're not looking for any specific transaction
        if (!expectedTxHash || txHash === expectedTxHash) {
          processedHashes.add(txHash);
          setLastProcessedEventHash(txHash);
          displaySuccessMessage(successMessageFormatter(event));
          
          // If this was the specific transaction we were looking for, we can stop
          if (txHash === expectedTxHash) break;
        }
      }
    }
  }, [
    eventObject.events,
    eventObject.error,
    expectedTxHash,
    lastProcessedEventHash,
    successMessageFormatter,
    displaySuccessMessage,
    processedHashes
  ]);

  return {
    successMessage,
    clearSuccessMessage,
  };
}
