import React, { useEffect, useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { useNavigate } from "react-router-dom";
import {
  useContractOwner,
  useIsFundManager,
} from "../contractFunctions/BlockCoopTokensFunctions";
import { client } from "../../client";

export default function Header(): React.JSX.Element {
  const address = useActiveAccount();
  const navigate = useNavigate();
  const [role, setRole] = useState<"owner" | "fundManager" | "user" | "guest">(
    "guest"
  );

  // Use custom hooks to get contract data
  const { data: ownerData, isLoading: ownerLoading } = useContractOwner();
  const { data: isFundManager, isLoading: managerLoading } = useIsFundManager(
    address?.address
  );

  // Determine user role and navigate to the appropriate dashboard
  useEffect(() => {
    if (!address) {
      setRole("guest");
      return;
    }

    // Wait until both queries have completed
    if (ownerLoading || managerLoading) {
      return;
    }

    if (ownerData?.toLowerCase() === address.address?.toLowerCase()) {
      setRole("owner");
      navigate("/owner-dashboard/managers"); // Redirect to owner dashboard
    } else if (isFundManager === true) {
      setRole("fundManager");
      navigate("/fund-manager-dashboard"); // Redirect to fund manager dashboard
    } else {
      setRole("user");
      navigate("/user-dashboard"); // Redirect to user dashboard (if implemented)
    }
  }, [
    address,
    ownerData,
    isFundManager,
    ownerLoading,
    managerLoading,
    navigate,
  ]);

  return (
    <header className="fixed top-0 left-0 w-full bg-blue-600 shadow-md z-50">
      <div className="container max-w-screen-lg mx-auto flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-white">BlockSacco</h1>
        <div className="flex items-center space-x-4">
          <ConnectButton client={client} />
        </div>
      </div>
    </header>
  );
}
