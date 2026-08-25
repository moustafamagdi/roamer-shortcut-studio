/* Quiet Blueprint: keep the application shell minimal so the editor remains the hero. */
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "@/pages/Home";

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" closeButton />
      <Home />
    </ErrorBoundary>
  );
}
