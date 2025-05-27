import { FC, useState } from "react";
import {
  useGetSupportedLoanTokens,
  useSetPoolStatus,
  useGetPoolInfo,
} from "../contractFunctions/LoanManagerFunctions";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";

const ManagePoolStatus: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const { data: supportedTokens } = useGetSupportedLoanTokens();
  const { data: tokenInfo } = useTokensInfo(0, 100);
  const { data: poolInfo } = useGetPoolInfo(selectedToken);
  const { displayErrorMessage: showError, displaySuccessMessage: showSuccess } =
    useMessages();
  const { setPoolStatus, isPending } = useSetPoolStatus();

  const tokens = tokenInfo
    ? {
        addresses: tokenInfo[0],
        names: tokenInfo[1],
        symbols: tokenInfo[2],
        decimals: tokenInfo[3],
      }
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) {
      showError("Please select a token");
      return;
    }

    try {
      await setPoolStatus(selectedToken, isActive);
      showSuccess(
        `Pool ${isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error: any) {
      console.error("Error details:", error);
      showError(error.message ?? "Failed to update pool status");
    }
  };

  const getTokenDisplay = (address: string) => {
    if (!tokens) return address;
    const index = tokens.addresses.indexOf(address);
    if (index === -1) return address;
    return `${tokens.names[index]} (${tokens.symbols[index]})`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Manage Pool Status</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Token
          </label>
          <select
            id="token"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a token</option>
            {supportedTokens?.map((token: string) => (
              <option key={token} value={token}>
                {getTokenDisplay(token)}
              </option>
            ))}
          </select>
        </div>

        {selectedToken && poolInfo && (
          <div className="text-sm text-gray-600">
            Current Status: {poolInfo[5] ? "Active" : "Inactive"}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Status
          </label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="active"
                checked={isActive}
                onChange={() => setIsActive(true)}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2">Active</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="inactive"
                checked={!isActive}
                onChange={() => setIsActive(false)}
                className="form-radio text-indigo-600"
              />
              <span className="ml-2">Inactive</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !selectedToken}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isPending || !selectedToken
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPending
            ? "Updating Status..."
            : `Set Pool to ${isActive ? "Active" : "Inactive"}`}
        </button>
      </form>
    </div>
  );
};

export default ManagePoolStatus;
