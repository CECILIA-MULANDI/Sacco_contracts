// import React from "react";
// import { useActiveAccount, useWalletBalance } from "thirdweb/react";
// import { client } from "../client";
// import { chain } from "../config";

// // Function to shorten the address
// const shortenAddress = (address?: string) => {
//   if (!address) return "Not connected";
//   return `${address.slice(0, 6)}...${address.slice(-4)}`;
// };

// export default function WalletInfo(): React.JSX.Element {
//   const account = useActiveAccount();
//   const { data: balance, isLoading } = useWalletBalance({
//     client,
//     chain,
//     address: account?.address, // Ensure this doesn't break if account is null
//   });

//   return (
//     <div>
//       <p>Wallet address: {shortenAddress(account?.address)}</p>
//       <p>
//         Wallet balance:{" "}
//         {isLoading
//           ? "Loading..."
//           : balance
//           ? `${balance.displayValue} ${balance.symbol}`
//           : "Unavailable"}
//       </p>
//     </div>
//   );
// }
