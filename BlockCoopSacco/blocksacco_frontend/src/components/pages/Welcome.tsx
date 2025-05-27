import React from "react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount } from "thirdweb/react";
import {
  useContractOwner,
  useIsFundManager,
} from "../contractFunctions/BlockCoopTokensFunctions";

export default function Welcome() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const { data: ownerAddress } = useContractOwner();
  const { data: isFundManager } = useIsFundManager(account?.address);

  const isOwner =
    ownerAddress?.toLowerCase() === account?.address?.toLowerCase();

  const handleRoleSelect = (role: string) => {
    switch (role) {
      case "owner":
        navigate("/owner-dashboard/managers");
        break;
      case "fundManager":
        navigate("/fund-manager-dashboard");
        break;
      case "user":
        navigate("/user-dashboard");
        break;
    }
  };

  const features = [
    {
      title: "Secure Deposits",
      description:
        "Your funds are secured by smart contracts on the blockchain, ensuring maximum safety and transparency",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      title: "Multiple Tokens",
      description:
        "Deposit and manage various whitelisted tokens in one place, diversifying your portfolio",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Easy Withdrawals",
      description:
        "Access your funds whenever you need them with our streamlined withdrawal process",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  const stats = [
    { label: "Total Members", value: "500+" },
    { label: "Assets Under Management", value: "$2M+" },
    { label: "Supported Tokens", value: "10+" },
    { label: "Average APY", value: "8.5%" },
  ];

  if (!account) {
    return (
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="relative pt-6 pb-16 sm:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Welcome to</span>
                <span className="block text-blue-600">BlockCoop SACCO</span>
              </h1>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Join the future of cooperative banking. Secure, transparent, and
                efficient.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="relative bg-white py-8 sm:py-12 mt-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-t-2 border-gray-100 pt-6"
                  >
                    <dt className="text-base font-medium text-gray-500">
                      {stat.label}
                    </dt>
                    <dd className="text-3xl font-extrabold tracking-tight text-blue-600">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Feature Section */}
          <div className="relative bg-gray-50 py-16 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-md px-4 text-center sm:max-w-3xl sm:px-6 lg:max-w-7xl lg:px-8">
              <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
                Why Choose BlockCoop SACCO?
              </p>
              <p className="mt-5 max-w-prose mx-auto text-xl text-gray-500">
                Experience the benefits of decentralized finance with the
                security of traditional banking
              </p>
              <div className="mt-12">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {features.map((feature) => (
                    <div key={feature.title} className="pt-6">
                      <div className="flow-root bg-white rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div>
                            <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                              <div className="h-6 w-6 text-white">
                                {feature.icon}
                              </div>
                            </span>
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                            {feature.title}
                          </h3>
                          <p className="mt-5 text-base text-gray-500">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-blue-700">
            <div className="max-w-7xl mx-auto text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                <span className="block">Ready to grow your wealth?</span>
                <span className="block text-blue-200">
                  Start your journey with BlockCoop today.
                </span>
              </h2>
              <div className="mt-8 flex justify-center">
                <div className="inline-flex rounded-md shadow">
                  <div className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50">
                    Connect your wallet using the button in the header
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-4">
          Welcome Back!
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Your journey to financial growth continues here. Choose your role to
          proceed.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {isOwner && (
          <button
            onClick={() => handleRoleSelect("owner")}
            className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Contract Owner
              </h3>
            </div>
            <p className="text-gray-600">
              Manage fund managers and whitelisted tokens
            </p>
          </button>
        )}

        {isFundManager && (
          <button
            onClick={() => handleRoleSelect("fundManager")}
            className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Fund Manager
              </h3>
            </div>
            <p className="text-gray-600">
              Manage fund operations and strategies
            </p>
          </button>
        )}

        <button
          onClick={() => handleRoleSelect("user")}
          className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-green-500"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              SACCO Member
            </h3>
          </div>
          <p className="text-gray-600">
            View your portfolio, deposit, and withdraw funds
          </p>
        </button>
      </div>
    </div>
  );
}
