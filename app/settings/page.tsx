"use client";

import AuthGuard from "@/components/AuthGuard";
import LiquidGlassNavbar from "@/components/ui/liquidglassnavbar";
import TopHeader from "@/components/ui/topheader";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Palette,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Loader2,
  Save,
  Check,
  X,
} from "lucide-react";

// IMPORTANT:
// Keep using the existing Supabase client.
// Do NOT replace this with "@/lib/supabase/client".
import { supabase } from "@/lib/supabase";

import { useTheme } from "@/components/theme-provider";
import { currencies, type CurrencyCode } from "@/lib/currencies";

type ActivePanel =
  | "profile"
  | "payments"
  | "alerts"
  | "security"
  | "spendingLimit"
  | "localization"
  | "appearance";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
};

function SettingToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label || "Toggle setting"}
      aria-pressed={checked}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors ${checked
          ? "border-emerald-400/40 bg-emerald-500"
          : "border-border bg-muted"
        }`}
    >
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
}

function ThemeSlider() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Switch light and dark theme"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`
        relative h-14 w-28 shrink-0 overflow-hidden rounded-full border p-1
        transition-all duration-300
        ${isDark
          ? "border-white/10 bg-zinc-950"
          : "border-slate-300 bg-slate-200"
        }
      `}
    >
      <span
        className={`
          absolute top-1 h-12 w-12 rounded-full shadow-lg
          transition-all duration-300 ease-out
          ${isDark ? "left-[60px] bg-black" : "left-1 bg-white"}
        `}
      />

      <span className="absolute left-1 top-1 z-10 flex h-12 w-12 items-center justify-center">
        <Sun
          className={`
            h-5 w-5 transition-colors duration-300
            ${!isDark ? "text-orange-400" : "text-zinc-400"}
          `}
        />
      </span>

      <span className="absolute right-1 top-1 z-10 flex h-12 w-12 items-center justify-center">
        <Moon
          className={`
            h-5 w-5 transition-colors duration-300
            ${isDark ? "text-cyan-400" : "text-slate-600"}
          `}
        />
      </span>
    </button>
  );
}

export default function Settings() {
  const router = useRouter();
  const { theme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [expandedItems, setExpandedItems] = useState<Set<ActivePanel>>(
    new Set()
  );

  const toggleExpanded = (itemId: ActivePanel) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(false);

  const [twoFactor, setTwoFactor] = useState(false);
  const [biometricLock, setBiometricLock] = useState(false);

  // Currency is stored in profiles.currency.
  // Database transaction amounts are NOT modified.
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  const [language, setLanguage] = useState("English");

  const [paymentConnected, setPaymentConnected] = useState(false);

  // Monthly spending limit is stored in
  // monthly_spending_limits.monthly_limit.
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [savingMonthlyLimit, setSavingMonthlyLimit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sections = [
    {
      title: "System Accounts",
      items: [
        {
          id: "profile" as ActivePanel,
          name: "Personal Profile",
          desc: "Manage your display name and account identity",
          icon: User,
        },
        {
          id: "payments" as ActivePanel,
          name: "Payment Portals",
          desc: "Manage linked cards and bank accounts",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "Preferences & Operations",
      items: [
        {
          id: "alerts" as ActivePanel,
          name: "Visual Alerts",
          desc: "Configure push, SMS, and email alerts",
          icon: Bell,
        },
        {
          id: "security" as ActivePanel,
          name: "Security Protocols",
          desc: "Adjust security and access preferences",
          icon: Shield,
        },
        {
          id: "spendingLimit" as ActivePanel,
          name: "Monthly Spending Limit",
          desc: "Set a limit to control your monthly expenses",
          icon: CreditCard,
        },
        {
          id: "localization" as ActivePanel,
          name: "Localization",
          desc: "Select currency and system language",
          icon: Globe,
        },
        {
          id: "appearance" as ActivePanel,
          name: "Appearance",
          desc: "Switch between light and dark workspace modes",
          icon: Palette,
        },
      ],
    },
  ];

  async function loadUser() {
    try {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

      /*
       * Use the existing SpendX Supabase client.
       * This keeps the same authentication/session flow
       * that AuthGuard and the rest of the application use.
       */
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Get user error:", error);
        router.push("/login");
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const avatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const loadedProfile: UserProfile = {
        id: user.id,
        email: user.email || "",
        full_name: name,
        avatar_url: avatar,
      };

      setProfile(loadedProfile);
      setDisplayName(name);

      /*
       * Load locally stored preferences.
       */
      const savedSettings = localStorage.getItem("spendx-settings");

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);

          setEmailAlerts(parsed.emailAlerts ?? true);
          setPushAlerts(parsed.pushAlerts ?? false);
          setSmsAlerts(parsed.smsAlerts ?? false);
          setTwoFactor(parsed.twoFactor ?? false);
          setBiometricLock(parsed.biometricLock ?? false);
          setLanguage(parsed.language ?? "English");
          setPaymentConnected(parsed.paymentConnected ?? false);
        } catch (parseError) {
          console.error("Parse saved settings error:", parseError);
        }
      }

      /*
       * Load the user's currency from profiles.
       */
      const {
        data: profileSettings,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Load currency error:", profileError);
      } else if (profileSettings?.currency) {
        const savedCurrency = profileSettings.currency as CurrencyCode;

        /*
         * Only accept currencies supported by the application.
         */
        const isValidCurrency = currencies.some(
          (item) => item.code === savedCurrency
        );

        if (isValidCurrency) {
          setCurrency(savedCurrency);
        } else {
          setCurrency("INR");
        }
      } else {
        setCurrency("INR");
      }

      /*
       * Load the user's monthly spending limit.
       *
       * The limit is stored separately from the profile
       * in monthly_spending_limits.
       */
      const {
        data: spendingLimitSettings,
        error: spendingLimitError,
      } = await supabase
        .from("monthly_spending_limits")
        .select("monthly_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (spendingLimitError) {
        console.error(
          "Load monthly spending limit error:",
          spendingLimitError
        );
      } else if (spendingLimitSettings?.monthly_limit != null) {
        setMonthlyLimit(String(spendingLimitSettings.monthly_limit));
      } else {
        setMonthlyLimit("");
      }
    } catch (error) {
      console.error("Load settings error:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Something went wrong while loading settings."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile) {
      setErrorMessage("Profile not loaded yet.");
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage("Display name cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      setMessage("");
      setErrorMessage("");

      const cleanName = displayName.trim();

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          name: cleanName,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setProfile({
        ...profile,
        full_name: cleanName,
      });

      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Save profile error:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Something went wrong while saving profile."
        );
      }
    } finally {
      setSavingProfile(false);
    }
  }

  /*
   * Save all preferences.
   *
   * IMPORTANT:
   * - Currency is saved in profiles.currency.
   * - Transaction amounts are never converted.
   * - upsert handles both existing and missing profile rows.
   */
  async function savePreferences() {
    try {
      setSavingPreferences(true);
      setMessage("");
      setErrorMessage("");

      /*
       * Get the current authenticated user using the existing
       * SpendX Supabase client.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Get authenticated user error:",
          userError
        );

        throw new Error(userError.message);
      }

      if (!user) {
        /*
         * Try to get the session as an additional check.
         */
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error(
            "You must be logged in to save preferences."
          );
        }
      }

      /*
       * Use the authenticated user's ID.
       */
      const authenticatedUser = user;

      if (!authenticatedUser) {
        throw new Error(
          "Unable to determine the authenticated user."
        );
      }

      /*
       * Save the selected currency.
       *
       * upsert:
       * - updates the row if it exists
       * - creates the row if it doesn't exist
       */
      const { error: currencyError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authenticatedUser.id,
            currency: currency,
          },
          {
            onConflict: "id",
          }
        );

      if (currencyError) {
        console.error(
          "Save currency error:",
          currencyError
        );

        throw new Error(currencyError.message);
      }

      /*
       * Save the other UI preferences locally.
       */
      localStorage.setItem(
        "spendx-settings",
        JSON.stringify({
          emailAlerts,
          pushAlerts,
          smsAlerts,
          twoFactor,
          biometricLock,
          language,
          paymentConnected,
        })
      );

      setMessage(
        `Localization settings saved successfully. Currency: ${currency}`
      );
    } catch (error) {
      console.error("Save preferences error:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Something went wrong while saving preferences."
        );
      }
    } finally {
      setSavingPreferences(false);
    }
  }

  /*
   * Save the monthly spending limit.
   *
   * The limit is stored in monthly_spending_limits and
   * automatically remains active for future months until
   * the user changes it.
   */
  async function saveMonthlySpendingLimit() {
    try {
      setSavingMonthlyLimit(true);
      setMessage("");
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error(
          "You must be logged in to save your spending limit."
        );
      }

      if (!monthlyLimit.trim()) {
        throw new Error(
          "Please enter a monthly spending limit."
        );
      }

      const parsedLimit = Number(monthlyLimit);

      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        throw new Error(
          "Monthly spending limit must be greater than zero."
        );
      }

      const { error } = await supabase
        .from("monthly_spending_limits")
        .upsert(
          {
            user_id: user.id,
            monthly_limit: parsedLimit,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      setMonthlyLimit(parsedLimit.toString());

      setMessage(
        "Monthly spending limit saved successfully."
      );
    } catch (error) {
      console.error(
        "Save monthly spending limit error:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Something went wrong while saving your spending limit."
        );
      }
    } finally {
      setSavingMonthlyLimit(false);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Something went wrong while signing out."
        );
      }
    } finally {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser();
    }, 0);

    return () => window.clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = useMemo(() => {
    const name =
      profile?.full_name ||
      profile?.email ||
      "User";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile]);

  return (
    <AuthGuard>
      <div className="sx-screen">
        <TopHeader />

        <main className="mx-auto max-w-6xl px-6 pt-36 pb-32">
          <div className="mb-10">
            <h1 className="font-mono text-4xl font-bold tracking-tight sx-title">
              Settings
            </h1>

            <p className="mt-2 sx-muted">
              Configure SpendX preferences, security,
              profile, and account controls.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              <span>{errorMessage}</span>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="rounded-full p-1 hover:bg-red-500/10"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {message && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
              <span>{message}</span>

              <button
                type="button"
                onClick={() => setMessage("")}
                className="rounded-full p-1 hover:bg-emerald-500/10"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="sx-card flex items-center justify-center rounded-2xl py-20 sx-muted">
              <Loader2
                size={20}
                className="mr-2 animate-spin"
              />
              Loading settings...
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-8">
              {/* PROFILE SUMMARY */}
              <div className="sx-card rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Profile avatar"
                      className="h-16 w-16 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xl font-bold text-white">
                      {initials || "U"}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold sx-title">
                      {profile?.full_name || "User"}
                    </h3>

                    <p className="mt-1 text-xs sx-muted">
                      {profile?.email || "No email found"}
                    </p>

                    <span className="mt-2 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                      Auth Connected
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Signing out
                    </>
                  ) : (
                    <>
                      <LogOut size={16} />
                      Sign out
                    </>
                  )}
                </button>
              </div>

              {/* SETTINGS SECTIONS */}
              {sections.map((section) => (
                <div
                  key={section.title}
                  className="space-y-4"
                >
                  <h3 className="ml-1 font-mono text-xs font-bold uppercase tracking-widest sx-muted">
                    {section.title}
                  </h3>

                  <div className="sx-card overflow-hidden rounded-2xl">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isExpanded =
                        expandedItems.has(item.id);

                      return (
                        <div key={item.id}>
                          <button
                            type="button"
                            onClick={() =>
                              toggleExpanded(item.id)
                            }
                            className={`flex w-full items-center justify-between border-b border-border/60 p-5 text-left transition-colors last:border-b-0 ${isExpanded
                                ? "bg-primary/10"
                                : "hover:bg-primary/5"
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`rounded-2xl border p-3 transition-colors ${isExpanded
                                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                                    : "border-border bg-muted/60 text-muted-foreground"
                                  }`}
                              >
                                <Icon size={18} />
                              </div>

                              <div>
                                <h4 className="text-sm font-bold sx-title">
                                  {item.name}
                                </h4>

                                <p className="mt-0.5 text-xs sx-muted">
                                  {item.desc}
                                </p>
                              </div>
                            </div>

                            <ChevronDown
                              size={16}
                              className={`transition-transform ${isExpanded
                                  ? "rotate-180 text-primary"
                                  : "text-muted-foreground"
                                }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="border-b border-border/60 bg-primary/5 p-6">
                              {/* PROFILE */}
                              {item.id === "profile" && (
                                <form
                                  onSubmit={
                                    handleSaveProfile
                                  }
                                  className="space-y-6"
                                >
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Personal Profile
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Update the name shown
                                      across your SpendX
                                      dashboard.
                                    </p>
                                  </div>

                                  <div>
                                    <label className="mb-2 block font-mono text-xs sx-muted">
                                      Display Name
                                    </label>

                                    <input
                                      type="text"
                                      value={displayName}
                                      onChange={(event) =>
                                        setDisplayName(
                                          event.target.value
                                        )
                                      }
                                      placeholder="Enter your display name"
                                      className="sx-field w-full rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block font-mono text-xs sx-muted">
                                      Email Address
                                    </label>

                                    <input
                                      type="email"
                                      value={
                                        profile?.email || ""
                                      }
                                      disabled
                                      className="sx-field w-full cursor-not-allowed rounded-xl px-4 py-3 text-sm opacity-70"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="sx-primary-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {savingProfile ? (
                                      <>
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                        Saving
                                      </>
                                    ) : (
                                      <>
                                        <Save size={16} />
                                        Save Profile
                                      </>
                                    )}
                                  </button>
                                </form>
                              )}

                              {/* PAYMENTS */}
                              {item.id === "payments" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Payment Portals
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Simulate linking a
                                      payment account for
                                      now.
                                    </p>
                                  </div>

                                  <div className="sx-panel rounded-xl p-5">
                                    <div className="flex items-center justify-between gap-4">
                                      <div>
                                        <h3 className="text-sm font-bold sx-title">
                                          Bank/Card Connection
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          {paymentConnected
                                            ? "A payment portal is currently marked as connected."
                                            : "No payment portal connected yet."}
                                        </p>
                                      </div>

                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentConnected
                                            ? "bg-emerald-500/10 text-emerald-300"
                                            : "bg-muted text-muted-foreground"
                                          }`}
                                      >
                                        {paymentConnected
                                          ? "Connected"
                                          : "Not connected"}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPaymentConnected(
                                          (current) =>
                                            !current
                                        )
                                      }
                                      className="sx-primary-button mt-5 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
                                    >
                                      {paymentConnected
                                        ? "Disconnect Portal"
                                        : "Connect Portal"}
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={
                                      savePreferences
                                    }
                                    disabled={
                                      savingPreferences
                                    }
                                    className="sx-secondary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                                  >
                                    {savingPreferences ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Save size={16} />
                                    )}
                                    Save Payment Settings
                                  </button>
                                </div>
                              )}

                              {/* ALERTS */}
                              {item.id === "alerts" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Visual Alerts
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Choose how SpendX
                                      should notify you.
                                    </p>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          Email Alerts
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          Receive transaction
                                          and report alerts
                                          by email.
                                        </p>
                                      </div>

                                      <SettingToggle
                                        checked={emailAlerts}
                                        onChange={() =>
                                          setEmailAlerts(
                                            (current) =>
                                              !current
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          Push Alerts
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          Enable app-style
                                          visual
                                          notifications.
                                        </p>
                                      </div>

                                      <SettingToggle
                                        checked={pushAlerts}
                                        onChange={() =>
                                          setPushAlerts(
                                            (current) =>
                                              !current
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          SMS Alerts
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          Receive important
                                          alerts by phone
                                          message.
                                        </p>
                                      </div>

                                      <SettingToggle
                                        checked={smsAlerts}
                                        onChange={() =>
                                          setSmsAlerts(
                                            (current) =>
                                              !current
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={
                                      savePreferences
                                    }
                                    disabled={
                                      savingPreferences
                                    }
                                    className="sx-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                                  >
                                    {savingPreferences ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Save size={16} />
                                    )}
                                    Save Alert Settings
                                  </button>
                                </div>
                              )}

                              {/* SECURITY */}
                              {item.id === "security" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Security Protocols
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Control security
                                      preferences for your
                                      account.
                                    </p>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          Two-Factor
                                          Authentication
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          This stores the
                                          preference for now.
                                          Real 2FA can be
                                          connected later.
                                        </p>
                                      </div>

                                      <SettingToggle
                                        checked={twoFactor}
                                        onChange={() =>
                                          setTwoFactor(
                                            (current) =>
                                              !current
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          Biometric Lock
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          Save biometric
                                          lock preference
                                          for supported
                                          devices later.
                                        </p>
                                      </div>

                                      <SettingToggle
                                        checked={biometricLock}
                                        onChange={() =>
                                          setBiometricLock(
                                            (current) =>
                                              !current
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={
                                      savePreferences
                                    }
                                    disabled={
                                      savingPreferences
                                    }
                                    className="sx-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                                  >
                                    {savingPreferences ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Shield size={16} />
                                    )}
                                    Save Security Settings
                                  </button>
                                </div>
                              )}

                              {/* MONTHLY SPENDING LIMIT */}
                              {item.id === "spendingLimit" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Monthly Spending Limit
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Set a monthly spending
                                      limit to help control
                                      your expenses and avoid
                                      overspending.
                                    </p>
                                  </div>

                                  <div>
                                    <label className="mb-2 block font-mono text-xs sx-muted">
                                      Monthly Limit ({currency})
                                    </label>

                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={monthlyLimit}
                                      onChange={(event) =>
                                        setMonthlyLimit(
                                          event.target.value
                                        )
                                      }
                                      placeholder="Enter monthly spending limit"
                                      className="sx-field w-full rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />

                                    <p className="mt-2 text-xs sx-muted">
                                      This limit will
                                      automatically apply to
                                      each month until you
                                      change it.
                                    </p>
                                  </div>

                                  {monthlyLimit &&
                                    Number(monthlyLimit) > 0 && (
                                      <div className="sx-panel rounded-xl p-5">
                                        <div className="flex items-center justify-between gap-4">
                                          <div>
                                            <p className="text-xs sx-muted">
                                              Current monthly
                                              limit
                                            </p>

                                            <p className="mt-1 font-mono text-xl font-bold sx-title">
                                              {currency}{" "}
                                              {Number(
                                                monthlyLimit
                                              ).toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )}
                                            </p>
                                          </div>

                                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                            Active
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                  <button
                                    type="button"
                                    onClick={
                                      saveMonthlySpendingLimit
                                    }
                                    disabled={
                                      savingMonthlyLimit
                                    }
                                    className="sx-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {savingMonthlyLimit ? (
                                      <>
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Save size={16} />
                                        Save Spending Limit
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* LOCALIZATION */}
                              {item.id === "localization" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Localization
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Choose your preferred
                                      currency and language.
                                    </p>
                                  </div>

                                  <div>
                                    <label className="mb-2 block font-mono text-xs sx-muted">
                                      Currency
                                    </label>

                                    <select
                                      value={currency}
                                      onChange={(event) =>
                                        setCurrency(
                                          event.target
                                            .value as CurrencyCode
                                        )
                                      }
                                      className="sx-field w-full rounded-xl px-4 py-3 text-sm"
                                    >
                                      {currencies.map(
                                        (item) => (
                                          <option
                                            key={item.code}
                                            value={item.code}
                                          >
                                            {item.code} —{" "}
                                            {item.name}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="mb-2 block font-mono text-xs sx-muted">
                                      Language
                                    </label>

                                    <select
                                      value={language}
                                      onChange={(event) =>
                                        setLanguage(
                                          event.target.value
                                        )
                                      }
                                      className="sx-field w-full rounded-xl px-4 py-3 text-sm"
                                    >
                                      <option value="English">
                                        English
                                      </option>
                                      <option value="Hindi">
                                        Hindi
                                      </option>
                                      <option value="Malayalam">
                                        Malayalam
                                      </option>
                                      <option value="Tamil">
                                        Tamil
                                      </option>
                                    </select>
                                  </div>

                                  <div className="sx-panel rounded-xl p-4">
                                    <div className="flex items-center justify-between gap-4">
                                      <div>
                                        <p className="text-xs sx-muted">
                                          Current currency
                                        </p>

                                        <p className="mt-1 font-mono text-lg font-bold sx-title">
                                          {currency}
                                        </p>
                                      </div>

                                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                        Ready
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={
                                      savePreferences
                                    }
                                    disabled={
                                      savingPreferences
                                    }
                                    className="sx-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {savingPreferences ? (
                                      <>
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Check size={16} />
                                        Save Localization
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* APPEARANCE */}
                              {item.id === "appearance" && (
                                <div className="space-y-6">
                                  <div>
                                    <h2 className="font-mono text-xl font-bold sx-title">
                                      Appearance
                                    </h2>

                                    <p className="mt-2 text-sm sx-muted">
                                      Choose the workspace
                                      theme that feels
                                      best for your finance
                                      review sessions.
                                    </p>
                                  </div>

                                  <div className="sx-panel flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-4">
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                                        {theme === "dark" ? (
                                          <Moon size={20} />
                                        ) : (
                                          <Sun size={20} />
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <h3 className="text-sm font-bold sx-title">
                                          {theme === "dark"
                                            ? "Dark Mode"
                                            : "Light Mode"}
                                        </h3>

                                        <p className="mt-1 text-xs sx-muted">
                                          Slider preference
                                          is saved on this
                                          device.
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex w-full justify-center sm:w-auto sm:justify-end">
                                      <ThemeSlider />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <LiquidGlassNavbar />
      </div>
    </AuthGuard>
  );
}