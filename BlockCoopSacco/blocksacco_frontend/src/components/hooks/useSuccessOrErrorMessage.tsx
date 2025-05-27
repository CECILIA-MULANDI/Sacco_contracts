// useMessages.ts
import { useState, useCallback } from "react";

export function useMessages() {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const displaySuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 5000);
  }, []);

  const displayErrorMessage = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  }, []);

  const clearMessages = useCallback(() => {
    setSuccessMessage("");
    setErrorMessage("");
  }, []);

  return {
    successMessage,
    errorMessage,
    displaySuccessMessage,
    displayErrorMessage,
    clearSuccessMessage: () => setSuccessMessage(""),
    clearErrorMessage: () => setErrorMessage(""),
    clearMessages,
  };
}
