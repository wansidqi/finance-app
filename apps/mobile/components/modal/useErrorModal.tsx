// hooks/useErrorModal.ts
import { useState } from "react";

export const useErrorModal = () => {
  const [error, setError] = useState<unknown>(null);

  const showError = (err: unknown) => {
    setError(err);
  };

  const hideError = () => {
    setError(null);
  };

  return {
    error,
    isVisible: !!error,
    showError,
    hideError,
  };
};
