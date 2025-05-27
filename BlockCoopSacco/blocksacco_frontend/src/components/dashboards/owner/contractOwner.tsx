import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useAddFundManager,
  useGetActiveFundManagers,
  useRemoveFundManager,
} from "../../contractFunctions/BlockCoopTokensFunctions";
import {
  useFundManagerAddedEvents,
  useFundManagerRemovedEvents,
} from "../../contractFunctions/useContractEvents";
import { useMessages } from "../../hooks/useSuccessOrErrorMessage";
import WhitelistTokenForm from "../../forms/whiteListTokens";
import TokenInfoDisplay from "../../forms/displayTokens";
import DisplaySupportedLoanTokens from "../../forms/displaySupportedLoanTokens";
import SetLoanManagerForm from "../../forms/setLoanManagerForm";
import LoanManagement from "../../forms/LoanManagement";
import AddSupportedTokenForm from "../../forms/addSupportedTokenForm";
import AddLiquidityForm from "../../forms/addLiquidityForm";

import ManagePoolStatus from "../../forms/ManagePoolStatus";
import ApprovedLoans from "../../forms/ApprovedLoans";

export default function OwnerDashboard() {
  const location = useLocation();
  const [newManagerAddress, setNewManagerAddress] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("ownerDashboardTab");
    return savedTab || "managers";
  });
  const navigate = useNavigate();

  const {
    addManager,
    error: addManagerError,
    isLoading: addingManager,
  } = useAddFundManager();
  const removeManager = useRemoveFundManager();
  const { data: fundManagers, isLoading } = useGetActiveFundManagers();

  const addedEventsObj = useFundManagerAddedEvents();
  const removedEventsObj = useFundManagerRemovedEvents();

  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();

  const lastAddedEventHashRef = useRef("");
  const lastRemovedEventHashRef = useRef("");

  useEffect(() => {
    const events = addedEventsObj.events as
      | { transactionHash: string; args: { fundManager: string } }[]
      | undefined;

    if (events && events.length > 0) {
      const latestEvent = events[0];

      if (latestEvent.transactionHash !== lastAddedEventHashRef.current) {
        console.log("New manager added event:", latestEvent);
        lastAddedEventHashRef.current = latestEvent.transactionHash;
        displaySuccessMessage(
          `Fund manager ${latestEvent.args.fundManager} was successfully added!`
        );
      }
    }
  }, [addedEventsObj.events, displaySuccessMessage]);

  useEffect(() => {
    const events = removedEventsObj.events as
      | { transactionHash: string; args: { fundManager: string } }[]
      | undefined;

    if (events && events.length > 0) {
      const latestEvent = events[0];

      if (latestEvent.transactionHash !== lastRemovedEventHashRef.current) {
        console.log("Manager removed event:", latestEvent);
        lastRemovedEventHashRef.current = latestEvent.transactionHash;
        displaySuccessMessage(
          `Fund manager ${latestEvent.args.fundManager} was successfully removed!`
        );
      }
    }
  }, [removedEventsObj.events, displaySuccessMessage]);

  const handleAddManager = () => {
    if (newManagerAddress?.startsWith("0x")) {
      addManager(newManagerAddress);
      if (!addManagerError) {
        setNewManagerAddress("");
      }
    } else {
      alert("Please enter a valid wallet address");
    }
  };

  const handleRemoveManager = (address: string) => {
    if (
      window.confirm(`Are you sure you want to remove fund manager ${address}?`)
    ) {
      removeManager(address);
    }
  };

  const renderFundManagersList = () => {
    if (isLoading || fundManagers === undefined) {
      return <p>Loading fund managers...</p>;
    }

    if (fundManagers.length > 0) {
      return (
        <ul className="divide-y">
          {fundManagers.map((address) => (
            <li
              key={address}
              className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
            >
              <span className="font-mono text-sm sm:text-base break-all">
                {address}
              </span>
              <button
                onClick={() => handleRemoveManager(address)}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      );
    }

    return <p>No fund managers found.</p>;
  };

  const handleTabChange = (tab: string) => {
    console.log("Changing tab to:", tab);
    localStorage.setItem("ownerDashboardTab", tab);
    setActiveTab(tab);
  };

  const tabs = [
    {
      label: "Manage Fund Managers",
      value: "managers",
    },
    {
      label: "Whitelist Tokens",
      value: "tokens",
    },
    {
      label: "Display Whitelisted Tokens",
      value: "displayTokens",
    },
    {
      label: "Add Supported Token",
      value: "addSupportedToken",
    },
    {
      label: "Set Loan Manager",
      value: "setLoanManager",
    },
    {
      label: "Manage Liquidity",
      value: "liquidity",
    },
    {
      label: "Display Loan Requests",
      value: "loanRequests",
    },
    {
      label: "Add Liquidity",
      value: "addLiquidity",
    },
    {
      label: "Manage Pool Status",
      value: "poolStatus",
    },
    {
      label: "Approved Loans",
      value: "approvedLoans",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
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
            className="ml-4 text-green-700 hover:text-green-900"
          >
            <svg
              className="h-5 w-5"
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  py-3 px-4 rounded-lg text-sm font-medium
                  ${
                    activeTab === tab.value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "managers" && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Add Fund Manager
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Enter the wallet address of the fund manager to add.</p>
                  </div>
                  <div className="mt-5">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={newManagerAddress}
                        onChange={(e) => setNewManagerAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <button
                        onClick={handleAddManager}
                        disabled={addingManager}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {addingManager ? "Adding..." : "Add Manager"}
                      </button>
                    </div>
                    {addManagerError && (
                      <p className="mt-2 text-sm text-red-600">
                        {addManagerError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "managers" && (
              <div className="mt-6 bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Active Fund Managers
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>List of currently active fund managers.</p>
                  </div>
                  <div className="mt-5">{renderFundManagersList()}</div>
                </div>
              </div>
            )}

            {activeTab === "tokens" && <WhitelistTokenForm />}
            {activeTab === "displayTokens" && <TokenInfoDisplay />}
            {activeTab === "addSupportedToken" && <AddSupportedTokenForm />}

            {activeTab === "setLoanManager" && <SetLoanManagerForm />}

            {activeTab === "loanRequests" && <LoanManagement />}
            {activeTab === "addLiquidity" && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Add Liquidity
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500 mb-4">
                    <p>Provide liquidity to earn yield from loan interest.</p>
                  </div>
                  <AddLiquidityForm />
                </div>
              </div>
            )}
            {activeTab === "poolStatus" && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Manage Pool Status
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500 mb-4">
                    <p>
                      Activate or deactivate liquidity pools for supported
                      tokens.
                    </p>
                  </div>
                  <ManagePoolStatus />
                </div>
              </div>
            )}

            {activeTab === "approvedLoans" && (
              <div>
                <ApprovedLoans />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
