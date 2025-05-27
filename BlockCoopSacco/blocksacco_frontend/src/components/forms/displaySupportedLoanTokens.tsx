import { useState, useMemo } from "react";
import {
  useGetSupportedLoanTokens,
  useAddSupportedLoanTokens,
  useRemoveSupportedLoanTokens,
} from "../contractFunctions/LoanManagerFunctions";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";

interface Props {
  canModify?: boolean; // Only owner and fund managers can modify
}

export default function DisplaySupportedLoanTokens({
  canModify = false,
}: Props): JSX.Element {
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: supportedTokens = [] } = useGetSupportedLoanTokens();
  const { data: tokensInfo } = useTokensInfo(0, 100);
  const addSupportedToken = useAddSupportedLoanTokens();
  const removeSupportedToken = useRemoveSupportedLoanTokens();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  // Create a map of token details
  const tokenDetails = useMemo(() => {
    if (!tokensInfo) return new Map();
    const [addresses, names, symbols, decimals, prices] = tokensInfo;
    return new Map(
      addresses.map((addr: string, i: number) => [
        addr,
        {
          name: names[i] || "Unknown",
          symbol: symbols[i] || "Unknown",
          price: prices[i] || BigInt(0),
          decimals: decimals[i] || 18,
        },
      ])
    );
  }, [tokensInfo]);

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenAddress) return;

    setIsLoading(true);
    try {
      await addSupportedToken(newTokenAddress);
      showSuccess("Token added successfully!");
      setNewTokenAddress("");
    } catch (error: any) {
      showError(error.message || "Failed to add token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    setIsLoading(true);
    try {
      await removeSupportedToken(tokenAddress);
      showSuccess("Token removed successfully!");
    } catch (error: any) {
      showError(error.message || "Failed to remove token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-10">
      <h2 className="text-xl font-semibold text-white mb-4">
        Supported Loan Tokens
      </h2>

      {/* Token List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Price (USD)
              </th>
              {canModify && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {supportedTokens.map((tokenAddress: string) => {
              const token = tokenDetails.get(tokenAddress);
              return (
                <tr key={tokenAddress}>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-200">
                    {token?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-200">
                    {token?.symbol || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-200">
                    {tokenAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-200">
                    $
                    {(
                      Number(token?.price || 0) /
                      Math.pow(10, token?.decimals || 18)
                    ).toFixed(2)}
                  </td>
                  {canModify && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRemoveToken(tokenAddress)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Token Form */}
      {canModify && (
        <form onSubmit={handleAddToken} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="tokenAddress"
              className="block text-sm font-medium text-gray-200"
            >
              Add New Token
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="tokenAddress"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                placeholder="Token address"
                required
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add Token"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
