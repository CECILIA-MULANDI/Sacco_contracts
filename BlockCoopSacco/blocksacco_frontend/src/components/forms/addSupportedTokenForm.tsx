import { FC, useState } from "react";
import { useAddSupportedLoanTokens } from "../contractFunctions/LoanManagerFunctions";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";
import DisplaySupportedLoanTokens from "./displaySupportedLoanTokens";

const AddSupportedTokenForm: FC = () => {
  const [selectedToken, setSelectedToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const addSupportedToken = useAddSupportedLoanTokens();
  const { data: tokensInfo } = useTokensInfo(0, 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!selectedToken) {
        throw new Error("Please select a token");
      }

      addSupportedToken(selectedToken);
      setSuccess("Token successfully added as a supported loan token!");
      setSelectedToken("");
    } catch (err: any) {
      setError(err.message ?? "Failed to add supported token");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTokenInfo = () => {
    if (!tokensInfo) return [];

    const [tokens, names, symbols] = tokensInfo;
    return tokens.map((address: string, index: number) => ({
      address,
      name: names[index],
      symbol: symbols[index],
    }));
  };

  const formattedTokens = formatTokenInfo();

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Add Supported Loan Token
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-white-800"
          >
            Select Token
          </label>
          <select
            id="token"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="bg-blue-900 mt-1 block w-full pl-3 pr-10 py-2 text-base border-blue-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={isLoading}
          >
            <option value="">Select a token</option>
            {formattedTokens.map((token: any) => (
              <option key={token.address} value={token.address}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

        {success && (
          <div className="text-green-600 text-sm mt-2">{success}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          }`}
        >
          {isLoading ? "Adding..." : "Add Token"}
        </button>
      </form>
      <DisplaySupportedLoanTokens />
    </div>
  );
};

export default AddSupportedTokenForm;
