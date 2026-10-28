import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { TreePine, Compass, Bell, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getNotifications } from "@/lib/api";

type Tab = {
  to: "/tree" | "/discover" | "/notifications" | "/me";
  labelKey: "nav.tree" | "nav.discover" | "nav.notifications" | "nav.me";
  icon: typeof TreePine;
};

const tabs: Tab[] = [
  { to: "/tree", labelKey: "nav.tree", icon: TreePine },
  { to: "/discover", labelKey: "nav.discover", icon: Compass },
  { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { to: "/me", labelKey: "nav.me", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { isAuthenticated, useMocks } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (useMocks || !isAuthenticated) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    void getNotifications()
      .then((res) => {
        if (!cancelled) setPendingCount(res.data.summary.pendingApprovalsCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, useMocks, pathname]);

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex items-stretch justify-between rounded-3xl border border-border bg-card/95 p-1.5 shadow-[0_8px_32px_-8px_rgba(41,21,8,0.22)] backdrop-blur">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.to);
          const Icon = tab.icon;
          const badge = tab.to === "/notifications" ? pendingCount : 0;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </div>
              <span>{t(tab.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
