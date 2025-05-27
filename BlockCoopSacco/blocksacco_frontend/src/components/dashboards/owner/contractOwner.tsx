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
// import DisplaySupportedLoanTokens from "../../forms/displaySupportedLoanTokens";
import SetLoanManagerForm from "../../forms/setLoanManagerForm";
import LoanManagement from "../../forms/LoanManagement";
import AddSupportedTokenForm from "../../forms/addSupportedTokenForm";
import AddLiquidityForm from "../../forms/addLiquidityForm";

import ManagePoolStatus from "../../forms/ManagePoolStatus";
import ApprovedLoans from "../../forms/ApprovedLoans";

const menuItems = [
  {
    label: "Manage Fund Managers",
    value: "managers",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    label: "General Deposits",
    isDropdown: true,
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    items: [
      {
        label: "Whitelist Tokens",
        value: "tokens",
      },
      {
        label: "Display Whitelisted Tokens",
        value: "displayTokens",
      },
    ],
  },
  {
    label: "Loan Module",
    isDropdown: true,
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    items: [
      {
        label: "Add Supported Token",
        value: "addSupportedToken",
      },
      {
        label: "Set Loan Manager",
        value: "setLoanManager",
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
    ],
  },
];

export default function OwnerDashboard() {
  const location = useLocation();
  const [newManagerAddress, setNewManagerAddress] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("ownerDashboardTab");
    return savedTab || "managers";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({});

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
    localStorage.setItem("ownerDashboardTab", tab);
    setActiveTab(tab);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Success message toast notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/50 border border-green-700 text-green-200 p-4 rounded shadow-md flex items-center max-w-md">
          <div className="mr-3">
            <svg
              className="h-6 w-6 text-green-400"
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
            className="ml-4 text-green-400 hover:text-green-300"
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

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`bg-gray-800 text-white w-64 min-h-screen ${
            isSidebarOpen ? "" : "hidden"
          }`}
        >
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Owner Dashboard</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <div key={item.label}>
                  {item.isDropdown ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors text-gray-300 hover:bg-gray-700"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            openDropdowns[item.label] ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {openDropdowns[item.label] && (
                        <div className="ml-4 pl-3 border-l border-gray-700">
                          {item.items.map((subItem) => (
                            <button
                              key={subItem.value}
                              onClick={() => handleTabChange(subItem.value)}
                              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg mb-1 transition-colors ${
                                activeTab === subItem.value
                                  ? "bg-gray-900 text-white"
                                  : "text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              <span>{subItem.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTabChange(item.value)}
                      className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg mb-1 transition-colors ${
                        activeTab === item.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <span className="text-gray-400">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="max-w-6xl mx-auto">
            {activeTab === "managers" && (
              <div className="space-y-6">
                <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-white">
                      Add Fund Manager
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-300">
                      <p>
                        Enter the wallet address of the fund manager to add.
                      </p>
                    </div>
                    <div className="mt-5">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          value={newManagerAddress}
                          onChange={(e) => setNewManagerAddress(e.target.value)}
                          placeholder="Enter wallet address"
                          className="shadow-sm bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm rounded-md"
                        />
                        <button
                          onClick={handleAddManager}
                          disabled={addingManager}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {addingManager ? "Adding..." : "Add Manager"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-white">
                      Active Fund Managers
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-300">
                      <p>List of currently active fund managers.</p>
                    </div>
                    <div className="mt-5 text-white">
                      {renderFundManagersList()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tokens" && <WhitelistTokenForm />}
            {activeTab === "displayTokens" && <TokenInfoDisplay />}
            {activeTab === "addSupportedToken" && <AddSupportedTokenForm />}
            {activeTab === "setLoanManager" && <SetLoanManagerForm />}
            {activeTab === "loanRequests" && <LoanManagement />}
            {activeTab === "addLiquidity" && (
              <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white mb-4">
                    Add Liquidity
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-300 mb-4">
                    <p>Provide liquidity to earn yield from loan interest.</p>
                  </div>
                  <AddLiquidityForm />
                </div>
              </div>
            )}
            {activeTab === "poolStatus" && (
              <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white mb-4">
                    Manage Pool Status
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-300 mb-4">
                    <p>
                      Activate or deactivate liquidity pools for supported
                      tokens.
                    </p>
                  </div>
                  <ManagePoolStatus />
                </div>
              </div>
            )}
            {activeTab === "approvedLoans" && <ApprovedLoans />}
          </div>
        </div>
      </div>
    </div>
  );
}
