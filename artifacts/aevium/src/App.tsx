import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { ThemeProvider } from "next-themes";
import { I18nProvider, useI18n } from "./lib/i18n";
import NotFound from "@/pages/not-found";
import { useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import Editor from "@/pages/editor";
import ProjectSettings from "@/pages/project-settings";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(278 83% 56%)",
    colorBackground: "hsl(240 11% 4%)",
    colorForeground: "hsl(0 0% 98%)",
    colorMutedForeground: "hsl(240 5% 65%)",
    colorInput: "hsl(240 11% 12%)",
    colorInputForeground: "hsl(0 0% 98%)",
    colorNeutral: "hsl(240 11% 15%)",
    fontFamily: "Geist, sans-serif",
    borderRadius: "0.5rem",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
  }, [addListener, qc]);
  return null;
}

function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
      <img
        src={`${basePath}/logo.svg`}
        alt="AEVIUM Logo"
        className="w-24 h-24 mb-8 drop-shadow-[0_0_15px_rgba(169,53,235,0.4)]"
      />
      <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tighter">
        AEVIUM
      </h1>
      <p className="text-xl text-muted-foreground mb-8 text-center max-w-lg">
        {t('landing.subtitle')}
      </p>
      <div className="flex gap-4">
        <a
          href={`${basePath}/sign-in`}
          className="bg-muted text-foreground px-6 py-3 rounded-md font-medium hover:bg-muted/80 transition-colors border border-border"
          data-testid="link-sign-in"
        >
          {t('landing.signIn')}
        </a>
        <a
          href={`${basePath}/sign-up`}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(169,53,235,0.3)]"
          data-testid="link-start-writing"
        >
          {t('landing.cta')}
        </a>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="aevium-theme">
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <ClerkProvider
                publishableKey={clerkPubKey}
                proxyUrl={clerkProxyUrl}
                appearance={clerkAppearance}
                signInUrl={`${basePath}/sign-in`}
                signUpUrl={`${basePath}/sign-up`}
              >
                <ClerkQueryClientCacheInvalidator />
                <Switch>
                  <Route path="/" component={HomeRedirect} />
                  <Route path="/sign-in/*?" component={SignInPage} />
                  <Route path="/sign-up/*?" component={SignUpPage} />

                  <Route path="/dashboard">
                    <Show when="signed-in">
                      <AppLayout><Dashboard /></AppLayout>
                    </Show>
                    <Show when="signed-out"><Redirect to="/sign-in" /></Show>
                  </Route>

                  <Route path="/projects/:id">
                    <Show when="signed-in">
                      <AppLayout><Editor /></AppLayout>
                    </Show>
                    <Show when="signed-out"><Redirect to="/sign-in" /></Show>
                  </Route>

                  <Route path="/projects/:id/settings">
                    <Show when="signed-in">
                      <AppLayout><ProjectSettings /></AppLayout>
                    </Show>
                    <Show when="signed-out"><Redirect to="/sign-in" /></Show>
                  </Route>

                  <Route path="/settings">
                    <Show when="signed-in">
                      <AppLayout><SettingsPage /></AppLayout>
                    </Show>
                    <Show when="signed-out"><Redirect to="/sign-in" /></Show>
                  </Route>

                  <Route component={NotFound} />
                </Switch>
              </ClerkProvider>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
