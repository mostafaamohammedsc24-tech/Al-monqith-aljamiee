import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

export default function PwaPrompts() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      if (!standalone && sessionStorage.getItem("install-dismissed") !== "1") setShowInstall(true);
    };
    const handleInstalled = () => {
      setShowInstall(false);
      setInstallPrompt(null);
      window.setTimeout(() => setShowNotifications("Notification" in window && Notification.permission === "default"), 900);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const notificationTimer = window.setTimeout(() => {
      if (!standalone && !showInstall && "Notification" in window && Notification.permission === "default" && sessionStorage.getItem("notifications-dismissed") !== "1") {
        setShowNotifications(true);
      }
    }, 4500);

    return () => {
      window.clearTimeout(notificationTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [showInstall]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setShowInstall(false);
    setInstallPrompt(null);
    if (choice.outcome === "accepted") window.setTimeout(() => setShowNotifications("Notification" in window && Notification.permission === "default"), 800);
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setShowNotifications(false);
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("تم تفعيل الإشعارات", {
        body: "سنخبرك عند تحديث حالة طلبك أو وصول عرض مهم.",
        icon: "/icons/icon-192.png",
        dir: "rtl",
        tag: "notifications-enabled",
      });
    }
  }

  if (!showInstall && !showNotifications) return null;

  return (
    <aside className="pwa-prompt" aria-live="polite">
      <button
        className="pwa-close"
        aria-label="إغلاق"
        onClick={() => {
          if (showInstall) sessionStorage.setItem("install-dismissed", "1");
          if (showNotifications) sessionStorage.setItem("notifications-dismissed", "1");
          setShowInstall(false);
          setShowNotifications(false);
        }}
      >
        ×
      </button>
      <span className="pwa-prompt-icon">{showInstall ? <DownloadIcon /> : <BellIcon />}</span>
      <div>
        <strong>{showInstall ? "ثبّت المنقذ الجامعي" : "ابقَ على اطلاع"}</strong>
        <p>{showInstall ? "وصول أسرع من الشاشة الرئيسية وتجربة كتطبيق مستقل." : "اسمح بالإشعارات لمعرفة حالة طلباتك والعروض الجديدة."}</p>
      </div>
      <button className="pwa-action" onClick={showInstall ? installApp : enableNotifications}>
        {showInstall ? "تثبيت التطبيق" : "تفعيل الإشعارات"}
      </button>
    </aside>
  );
}
