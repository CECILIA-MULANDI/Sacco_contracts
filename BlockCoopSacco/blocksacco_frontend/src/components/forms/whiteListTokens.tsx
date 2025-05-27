import React, { useState, useRef, useEffect } from "react";
import { useWhiteListToken } from "../contractFunctions/BlockCoopTokensFunctions";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import { useTokenWhitelistedEvents } from "../contractFunctions/useContractEvents";

export default function WhitelistTokenForm() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [priceFeed, setPriceFeed] = useState("");
  const [isStable, setIsStable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const whiteListToken = useWhiteListToken();
  const tokenWhitelistedEventsObj = useTokenWhitelistedEvents();
  const lastTokenWhitelistedEventHashRef = useRef("");
  // Use the shared success message hook
  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();

  useEffect(() => {
    const events = tokenWhitelistedEventsObj.events as
      | {
          transactionHash: string;
          args: { tokenAddress: string; priceFeed: string };
        }[]
      | undefined;

    if (events && events.length > 0) {
      const latestEvent = events[0];

      // Only process if this is a new event
      if (
        latestEvent.transactionHash !== lastTokenWhitelistedEventHashRef.current
      ) {
        console.log("Token whitelisted event:", latestEvent);
        lastTokenWhitelistedEventHashRef.current = latestEvent.transactionHash;
        displaySuccessMessage(
          `Token ${latestEvent.args.tokenAddress} was successfully whitelisted with price feed ${latestEvent.args.priceFeed}!`
        );
      }
    }
  }, [tokenWhitelistedEventsObj.events, displaySuccessMessage]);

  const handleWhitelistToken = () => {
    if (!tokenAddress.startsWith("0x") || !priceFeed.startsWith("0x")) {
      alert("Please enter valid addresses for token and price feed !.");
      return;
    }

    try {
      whiteListToken(tokenAddress, priceFeed, isStable);

      displaySuccessMessage(`Token ${tokenAddress} whitelisting initiated!`);
      setTokenAddress("");
      setPriceFeed("");
      setIsStable(false);
    } catch (error) {
      console.error("Error whitelisting token:", error);
      if (error instanceof Error) {
        alert(`Error whitelisting token: ${error.message}`);
      } else {
        alert("An unknown error occurred while whitelisting the token.");
      }
    }
  };

  return (
    <>
      {/* Success message toast notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md flex items-center max-w-md">
          <div className="mr-3">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">{successMessage}</div>
          <button
            onClick={clearSuccessMessage}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Whitelist Token Form */}
      <div className="p-4 border rounded-lg bg-gray-50 shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-black">
          Whitelist Token
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Address
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Enter token address (0x...)"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Feed Address
            </label>
            <input
              type="text"
              value={priceFeed}
              onChange={(e) => setPriceFeed(e.target.value)}
              placeholder="Enter price feed address (0x...)"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isStable"
              checked={isStable}
              onChange={(e) => setIsStable(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isStable" className="ml-2 block text-sm">
              This is a stablecoin
            </label>
          </div>
          <button
            onClick={handleWhitelistToken}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Whitelist Token
          </button>
        </div>
      </div>
    </>
  );
}
