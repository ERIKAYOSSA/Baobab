import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { TreePine, Compass, Bell, User, MessageCircle } from "lucide-react";
import { tr, useI18n } from "../lib/i18n/I18nProvider";
import { useAuth } from "../lib/auth/AuthProvider";
import { getChatUnread, getNotifications } from "../lib/api";
import { countUnseenReplies } from "../lib/notificationsSeen";
import { subscribeChat } from "../lib/chatStream";
import { toast } from "sonner";

type Tab = {
  to: "/tree" | "/discover" | "/chat" | "/notifications" | "/me";
  label: string;
  icon: typeof TreePine;
};

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { isAuthenticated, useMocks } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  const tabs: Tab[] = [
    { to: "/chat", label: tr("Discussions"), icon: MessageCircle },
    { to: "/discover", label: t("nav.discover"), icon: Compass },
    { to: "/tree", label: t("nav.tree"), icon: TreePine },
    { to: "/notifications", label: t("nav.notifications"), icon: Bell },
    { to: "/me", label: t("nav.me"), icon: User },
  ];

  useEffect(() => {
    if (useMocks || !isAuthenticated) {
      setPendingCount(0);
      setChatCount(0);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      void getNotifications()
        .then((res) => {
          if (cancelled) return;
          // Demandes à approuver + réponses à mes demandes pas encore vues.
          setPendingCount(
            (res.data.summary.pendingApprovalsCount ?? 0) + countUnseenReplies(res.data.myRequests),
          );
        })
        .catch(() => {
          if (!cancelled) setPendingCount(0);
        });
      void getChatUnread()
        .then((res) => {
          if (!cancelled) setChatCount(res.data.unread);
        })
        .catch(() => {
          if (!cancelled) setChatCount(0);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [isAuthenticated, useMocks, pathname]);

  // Pastilles et alertes mises à jour dès qu'un message ou une demande arrive.
  useEffect(() => {
    if (useMocks || !isAuthenticated) return;
    return subscribeChat((event) => {
      if (event.type === "notify") {
        void getNotifications()
          .then((res) =>
            setPendingCount((res.data.summary.pendingApprovalsCount ?? 0) + countUnseenReplies(res.data.myRequests)),
          )
          .catch(() => undefined);
        if (event.kind === "approval_required") {
          toast(tr("Nouvelle demande de lien"), { description: tr("Ouvre tes notifications pour répondre.") });
        } else if (event.kind === "request_updated" && event.status === "approved" && event.finalized) {
          toast.success(tr("Un lien familial vient d'être confirmé"));
        } else if (event.kind === "request_updated" && event.status === "rejected") {
          toast(tr("Une de tes demandes a été refusée"));
        }
        return;
      }
      void getChatUnread()
        .then((res) => setChatCount(res.data.unread))
        .catch(() => undefined);
    });
  }, [isAuthenticated, useMocks]);

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex items-stretch justify-between rounded-3xl border border-border bg-card/95 p-1.5 shadow-[0_8px_32px_-8px_rgba(41,21,8,0.22)] backdrop-blur">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.to);
          const Icon = tab.icon;
          const badge = active ? 0 : tab.to === "/notifications" ? pendingCount : tab.to === "/chat" ? chatCount : 0;
          if (tab.to === "/tree") {
            // Onglet central : plus grand, en relief au-dessus de la barre.
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="group relative -mt-7 flex min-h-11 flex-[1.25] flex-col items-center justify-end gap-0.5 pb-1 text-[12px] font-semibold"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-background shadow-[0_8px_20px_-6px_rgba(41,21,8,0.45)] transition active:scale-95 ${
                    active ? "bg-primary text-primary-foreground" : "bg-primary/90 text-primary-foreground"
                  }`}
                >
                  <Icon className="h-8 w-8" strokeWidth={2.2} />
                </span>
                <span className={active ? "text-primary" : "text-foreground"}>{tab.label}</span>
              </NavLink>
            );
          }
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
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
