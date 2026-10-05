import { lazy, Suspense } from "react";

const AppView = lazy(() => import("./AppView"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="route-loader app-loader" role="status">
          <span />
          <strong>المنقذ الجامعي</strong>
          <small>جارٍ تجهيز تجربتك...</small>
        </div>
      }
    >
      <AppView />
    </Suspense>
  );
}
