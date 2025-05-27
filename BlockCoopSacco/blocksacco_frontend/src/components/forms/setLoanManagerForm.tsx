import { useState } from "react";
import {
  useGetLoanManagerAddress,
  useSetLoanManager,
} from "../contractFunctions/BlockCoopTokensFunctions";

export default function SetLoanManagerForm() {
  const [loanManagerAddress, setLoanManagerAddress] = useState("");

  const { setLoanManager, isPending } = useSetLoanManager();
  const { data: currentLoanManager, isLoading: isLoadingCurrent } =
    useGetLoanManagerAddress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!loanManagerAddress) {
        throw new Error("Please enter the LoanManager contract address");
      }

      await setLoanManager(loanManagerAddress);
      setLoanManagerAddress("");
    } catch (error: any) {
      console.error("Error setting LoanManager:", error);
      // Error handling is already done in the useSetLoanManager hook
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      {/* Display current LoanManager address */}
      <div className="bg-gray-800 p-4 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-200 mb-2">
          Current LoanManager Address
        </h3>
        {isLoadingCurrent ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : currentLoanManager ? (
          <p className="text-sm text-gray-300 font-mono break-all">
            {currentLoanManager}
          </p>
        ) : (
          <p className="text-sm text-gray-400">No LoanManager set</p>
        )}
      </div>

      {/* Form to set new LoanManager address */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200">
            New LoanManager Contract Address
          </label>
          <input
            type="text"
            value={loanManagerAddress}
            onChange={(e) => setLoanManagerAddress(e.target.value)}
            placeholder="Enter LoanManager contract address"
            required
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isPending
              ? "bg-indigo-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isPending ? "Setting..." : "Set LoanManager Address"}
        </button>
      </form>
    </div>
  );
}
