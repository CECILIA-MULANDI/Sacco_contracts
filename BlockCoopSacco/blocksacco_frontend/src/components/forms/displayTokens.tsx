import React, { useState } from "react";
import {
  useTokensInfo,
  useUnWhiteListToken,
} from "../contractFunctions/BlockCoopTokensFunctions";

export default function TokenInfoDisplay() {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const removeToken = useUnWhiteListToken();

  // fetch price
  const { data, isLoading, isError } = useTokensInfo(
    currentPage * pageSize,
    pageSize
  );

  // Destructure the returned data
  const tokens = data
    ? {
        addresses: data[0],
        names: data[1],
        symbols: data[2],
        decimals: data[3],
        prices: data[4],
      }
    : null;

  // Function to handle pagination
  const handleNextPage = () => {
    if (tokens && tokens.addresses.length === pageSize) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  // removal of tokens
  const handleRemoveToken = (address: string) => {
    if (
      window.confirm(`Are you sure you want to remove this token ${address}?`)
    ) {
      removeToken(address);
    }
  };

  // Helper function to format price in a user-friendly way
  const formatPrice = (price: string) => {
    // Divide by 10^18 as per contract normalization
    const priceValue = Number(price) / 10 ** 18;

    // Format based on the price value for better readability
    if (priceValue === 0) {
      return "$0.00";
    } else if (priceValue < 0.01) {
      // For very small values, show up to 6 decimal places
      return `$${priceValue.toFixed(6)}`;
    } else if (priceValue < 1) {
      // For small values, show up to 4 decimal places
      return `$${priceValue.toFixed(4)}`;
    } else if (priceValue < 1000) {
      // For medium values, show 2 decimal places
      return `$${priceValue.toFixed(2)}`;
    } else if (priceValue < 1000000) {
      // For thousands, show with K suffix
      return `$${(priceValue / 1000).toFixed(2)}K`;
    } else {
      // For millions and above, show with M suffix
      return `$${(priceValue / 1000000).toFixed(2)}M`;
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-medium mb-4">Whitelisted Tokens</h3>

      {isLoading && (
        <div className="p-4 text-center">
          <p>Loading token information...</p>
        </div>
      )}

      {isError && (
        <div className="p-4 text-center bg-red-50 text-red-600 rounded">
          <p>Error loading token information. Please try again.</p>
        </div>
      )}

      {tokens && tokens.addresses.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-900 border border-gray-700 w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="py-2 px-4 border-b text-left text-sm sm:text-base">
                    Token
                  </th>
                  <th className="py-2 px-4 border-b text-left text-sm sm:text-base">
                    Symbol
                  </th>
                  <th className="py-2 px-4 border-b text-left text-sm sm:text-base">
                    Decimals
                  </th>
                  <th className="py-2 px-4 border-b text-right text-sm sm:text-base">
                    Price
                  </th>
                  <th className="py-2 px-4 border-b text-left text-sm sm:text-base">
                    Address
                  </th>
                  <th className="py-2 px-4 border-b text-left text-sm sm:text-base">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.addresses.map((address, index) => (
                  <tr
                    key={address}
                    className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}
                  >
                    <td className="py-2 px-4 border-b text-sm sm:text-base">
                      {tokens.names[index]}
                    </td>
                    <td className="py-2 px-4 border-b text-sm sm:text-base">
                      {tokens.symbols[index]}
                    </td>
                    <td className="py-2 px-4 border-b text-sm sm:text-base">
                      {tokens.decimals[index].toString()}
                    </td>
                    <td className="py-2 px-4 border-b text-right text-sm sm:text-base">
                      {formatPrice(tokens.prices[index].toString())}
                    </td>
                    <td className="py-2 px-4 border-b text-sm sm:text-base">
                      <span className="text-xs font-mono bg-gray-100 text-gray-800 p-1 rounded">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-sm sm:text-base">
                      <button
                        onClick={() => handleRemoveToken(address)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded ${
                currentPage === 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Previous
            </button>
            <span className="text-sm sm:text-base">Page {currentPage + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={tokens.addresses.length < pageSize}
              className={`px-4 py-2 rounded ${
                tokens.addresses.length < pageSize
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 text-center bg-gray-700 rounded">
          <p>No tokens have been whitelisted yet.</p>
        </div>
      )}
    </div>
  );
}
