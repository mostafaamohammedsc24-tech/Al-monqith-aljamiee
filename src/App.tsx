import { lazy, Suspense } from "react";

const AppView = lazy(() => import("./AppView"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="route-loader app-loader" role="status" aria-live="polite" dir="rtl">
          <img className="app-loader-icon" src="/icons/icon-maskable-512.png" alt="" />
          <strong>المنقذ الجامعي</strong>
          <small>مساحتك الجامعية، جاهزة خلال لحظات</small>
          <span className="app-loader-progress" aria-hidden="true"><i /></span>
        </div>
      }
    >
      <AppView />
    </Suspense>
  );
}
