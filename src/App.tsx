import { lazy, Suspense } from "react";

const AppView = lazy(() => import("./AppView"));

export default function App() {
  return (
    <Suspense
      fallback={<div className="app-startup-placeholder" aria-hidden="true" />}
    >
      <AppView />
    </Suspense>
  );
}
