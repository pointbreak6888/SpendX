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
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Copy,
  QrCode,
  KeyRound,
} from "lucide-react";

// IMPORTANT:
// Keep using the existing Supabase client.
// Do NOT replace this with "@/lib/supabase/client".
import { supabase } from "@/lib/supabase";

import { useTheme } from "@/components/theme-provider";
import { currencies, type CurrencyCode } from "@/lib/currencies";

import {
  authenticateBiometric,
  clearStoredBiometricCredential,
  getStoredBiometricCredentialId,
  isBiometricSupported,
  registerBiometric,
} from "@/lib/biometric";

import {
  sendNotification,
  requestWebNotificationPermission,
} from "@/lib/notifications";

import {
  scheduleDailyExpenseReminder,
  cancelDailyExpenseReminder,
} from "@/lib/dailyExpenseReminder";

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
  disabled,
}: {
  checked: boolean;
  onChange: () => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label || "Toggle setting"}
      aria-pressed={checked}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors ${disabled ? "cursor-not-allowed opacity-50" : ""
        } ${checked
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

  /*
   * Daily expense reminder settings.
   */
  const [dailyExpenseReminder, setDailyExpenseReminder] =
    useState(false);

  const [dailyReminderTime, setDailyReminderTime] =
    useState("20:00");

  const [notificationBusy, setNotificationBusy] = useState(false);
  const [dailyReminderBusy, setDailyReminderBusy] = useState(false);

  const [twoFactor, setTwoFactor] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(
    null
  );

  // 2FA Enrollment modal state
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Disable modal state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disableError, setDisableError] = useState("");

  const [biometricLock, setBiometricLock] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState<
    boolean | null
  >(null);
  const [biometricBusy, setBiometricBusy] = useState(false);

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
          name: "System Alerts",
          desc: "Configure push, daily, SMS, and email alerts",
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

  /*
   * =========================================================
   * PUSH ALERTS
   * =========================================================
   */
  async function handlePushAlertsToggle() {
    if (notificationBusy) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setNotificationBusy(true);

    try {
      /*
       * Turning notifications OFF.
       */
      if (pushAlerts) {
        setPushAlerts(false);

        /*
         * Persist immediately so budget and recurring
         * notification checks stop using Push Alerts.
         */
        const savedSettings =
          localStorage.getItem("spendx-settings");

        let currentSettings: Record<string, unknown> = {};

        if (savedSettings) {
          try {
            currentSettings = JSON.parse(savedSettings);
          } catch {
            currentSettings = {};
          }
        }

        localStorage.setItem(
          "spendx-settings",
          JSON.stringify({
            ...currentSettings,
            pushAlerts: false,
          })
        );

        setMessage("Push Alerts disabled.");

        return;
      }

      /*
       * Turning notifications ON.
       */
      const permissionGranted =
        await requestWebNotificationPermission();

      const isNativeEnvironment =
        typeof window !== "undefined" &&
        !("Notification" in window);

      let enabled = permissionGranted;

      if (isNativeEnvironment) {
        enabled = await sendNotification(
          "SpendX Notifications",
          "System notifications are enabled.",
          10001
        );
      } else if (permissionGranted) {
        enabled = await sendNotification(
          "SpendX Notifications",
          "System notifications are enabled.",
          10001
        );
      }

      if (!enabled) {
        setPushAlerts(false);

        setErrorMessage(
          "Notification permission was not granted. Please allow notifications in your browser settings and try again."
        );

        return;
      }

      setPushAlerts(true);

      /*
       * Persist immediately.
       */
      const savedSettings =
        localStorage.getItem("spendx-settings");

      let currentSettings: Record<string, unknown> = {};

      if (savedSettings) {
        try {
          currentSettings = JSON.parse(savedSettings);
        } catch {
          currentSettings = {};
        }
      }

      localStorage.setItem(
        "spendx-settings",
        JSON.stringify({
          ...currentSettings,
          pushAlerts: true,
        })
      );

      setMessage(
        "Push Alerts enabled. A system notification has been sent."
      );
    } catch (error) {
      console.error(
        "Push notification toggle error:",
        error
      );

      setPushAlerts(false);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to enable system notifications."
        );
      }
    } finally {
      setNotificationBusy(false);
    }
  }

  /*
   * =========================================================
   * DAILY EXPENSE REMINDER
   * =========================================================
   */

  async function handleDailyReminderToggle() {
    if (dailyReminderBusy) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setDailyReminderBusy(true);

    try {
      /*
       * Disable reminder.
       */
      if (dailyExpenseReminder) {
        await cancelDailyExpenseReminder();

        setDailyExpenseReminder(false);

        /*
         * Persist immediately.
         */
        const savedSettings =
          localStorage.getItem("spendx-settings");

        let currentSettings: Record<string, unknown> = {};

        if (savedSettings) {
          try {
            currentSettings = JSON.parse(savedSettings);
          } catch {
            currentSettings = {};
          }
        }

        localStorage.setItem(
          "spendx-settings",
          JSON.stringify({
            ...currentSettings,
            dailyExpenseReminder: false,
            dailyReminderTime,
          })
        );

        setMessage(
          "Daily expense reminder disabled."
        );

        return;
      }

      /*
       * Enable reminder.
       */
      const scheduled =
        await scheduleDailyExpenseReminder(
          dailyReminderTime
        );

      if (!scheduled) {
        setDailyExpenseReminder(false);

        setErrorMessage(
          "Unable to enable the daily expense reminder. Please allow notifications and try again."
        );

        return;
      }

      setDailyExpenseReminder(true);

      /*
       * Persist immediately.
       */
      const savedSettings =
        localStorage.getItem("spendx-settings");

      let currentSettings: Record<string, unknown> = {};

      if (savedSettings) {
        try {
          currentSettings = JSON.parse(savedSettings);
        } catch {
          currentSettings = {};
        }
      }

      localStorage.setItem(
        "spendx-settings",
        JSON.stringify({
          ...currentSettings,
          dailyExpenseReminder: true,
          dailyReminderTime,
        })
      );

      setMessage(
        `Daily expense reminder enabled for ${dailyReminderTime}.`
      );
    } catch (error) {
      console.error(
        "Daily expense reminder toggle error:",
        error
      );

      setDailyExpenseReminder(false);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Unable to configure the daily expense reminder."
        );
      }
    } finally {
      setDailyReminderBusy(false);
    }
  }

  /*
   * Change daily reminder time.
   */
  async function handleDailyReminderTimeChange(
    newTime: string
  ) {
    setDailyReminderTime(newTime);
    setMessage("");
    setErrorMessage("");

    if (!newTime) {
      return;
    }

    /*
     * If the reminder is currently enabled,
     * reschedule it immediately.
     */
    if (dailyExpenseReminder) {
      setDailyReminderBusy(true);

      try {
        const scheduled =
          await scheduleDailyExpenseReminder(
            newTime
          );

        if (!scheduled) {
          setErrorMessage(
            "Unable to update the daily reminder time."
          );

          return;
        }

        /*
         * Persist the new time.
         */
        const savedSettings =
          localStorage.getItem("spendx-settings");

        let currentSettings: Record<string, unknown> = {};

        if (savedSettings) {
          try {
            currentSettings = JSON.parse(savedSettings);
          } catch {
            currentSettings = {};
          }
        }

        localStorage.setItem(
          "spendx-settings",
          JSON.stringify({
            ...currentSettings,
            dailyExpenseReminder: true,
            dailyReminderTime: newTime,
          })
        );

        setMessage(
          `Daily expense reminder updated to ${newTime}.`
        );
      } catch (error) {
        console.error(
          "Daily reminder time update error:",
          error
        );

        setErrorMessage(
          "Unable to update the daily reminder time."
        );
      } finally {
        setDailyReminderBusy(false);
      }
    }
  }

  /*
   * =========================================================
   * LOAD USER / SETTINGS
   * =========================================================
   */
  async function loadUser() {
    try {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

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
      const savedSettings =
        localStorage.getItem("spendx-settings");

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);

          setEmailAlerts(
            parsed.emailAlerts ?? true
          );

          setPushAlerts(
            parsed.pushAlerts ?? false
          );

          setSmsAlerts(
            parsed.smsAlerts ?? false
          );

          setDailyExpenseReminder(
            parsed.dailyExpenseReminder ?? false
          );

          setDailyReminderTime(
            parsed.dailyReminderTime ?? "20:00"
          );

          const savedBiometricLock =
            parsed.biometricLock ?? false;

          setBiometricLock(
            savedBiometricLock &&
            Boolean(
              getStoredBiometricCredentialId()
            )
          );

          setLanguage(
            parsed.language ?? "English"
          );

          setPaymentConnected(
            parsed.paymentConnected ?? false
          );
        } catch (parseError) {
          console.error(
            "Parse saved settings error:",
            parseError
          );
        }
      }

      /*
       * Load real Supabase Auth MFA factor state.
       */
      try {
        setMfaLoading(true);

        const {
          data: factorsData,
          error: factorsError,
        } =
          await supabase.auth.mfa.listFactors();

        if (factorsError) {
          console.error(
            "Failed to list MFA factors:",
            factorsError
          );
        } else if (factorsData?.totp) {
          const verifiedTotp =
            factorsData.totp.find(
              (f) => f.status === "verified"
            );

          if (verifiedTotp) {
            setTwoFactor(true);
            setVerifiedFactorId(
              verifiedTotp.id
            );
          } else {
            setTwoFactor(false);
            setVerifiedFactorId(null);
          }
        }
      } catch (mfaLoadError) {
        console.error(
          "Error loading MFA factors:",
          mfaLoadError
        );
      } finally {
        setMfaLoading(false);
      }

      /*
       * Load currency.
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
        console.error(
          "Load currency error:",
          profileError
        );
      } else if (profileSettings?.currency) {
        const savedCurrency =
          profileSettings.currency as CurrencyCode;

        const isValidCurrency =
          currencies.some(
            (item) =>
              item.code === savedCurrency
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
       * Load monthly spending limit.
       */
      const {
        data: spendingLimitSettings,
        error: spendingLimitError,
      } =
        await supabase
          .from("monthly_spending_limits")
          .select("monthly_limit")
          .eq("user_id", user.id)
          .maybeSingle();

      if (spendingLimitError) {
        console.error(
          "Load monthly spending limit error:",
          spendingLimitError
        );
      } else if (
        spendingLimitSettings?.monthly_limit !=
        null
      ) {
        setMonthlyLimit(
          String(
            spendingLimitSettings.monthly_limit
          )
        );
      } else {
        setMonthlyLimit("");
      }
    } catch (error) {
      console.error(
        "Load settings error:",
        error
      );

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

  /*
   * =========================================================
   * PROFILE
   * =========================================================
   */
  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile) {
      setErrorMessage(
        "Profile not loaded yet."
      );
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage(
        "Display name cannot be empty."
      );
      return;
    }

    try {
      setSavingProfile(true);
      setMessage("");
      setErrorMessage("");

      const cleanName =
        displayName.trim();

      const { error } =
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
            name: cleanName,
          },
        });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setProfile({
        ...profile,
        full_name: cleanName,
      });

      setMessage(
        "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Save profile error:",
        error
      );

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
   * =========================================================
   * BIOMETRIC
   * =========================================================
   */
  async function persistBiometricPreference(
    enabled: boolean
  ) {
    const savedSettings =
      localStorage.getItem(
        "spendx-settings"
      );

    let existingSettings: Record<
      string,
      unknown
    > = {};

    if (savedSettings) {
      try {
        const parsed =
          JSON.parse(savedSettings);

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          existingSettings =
            parsed;
        }
      } catch {
        existingSettings = {};
      }
    }

    localStorage.setItem(
      "spendx-settings",
      JSON.stringify({
        ...existingSettings,
        emailAlerts,
        pushAlerts,
        smsAlerts,
        dailyExpenseReminder,
        dailyReminderTime,
        twoFactor,
        biometricLock: enabled,
        language,
        paymentConnected,
      })
    );
  }

  async function handleBiometricToggle() {
    setMessage("");
    setErrorMessage("");

    if (biometricBusy) {
      return;
    }

    if (biometricLock) {
      clearStoredBiometricCredential();

      setBiometricLock(false);

      await persistBiometricPreference(
        false
      );

      setMessage(
        "Biometric Lock disabled."
      );

      return;
    }

    if (!profile) {
      setErrorMessage(
        "Your account is still loading. Please try again."
      );
      return;
    }

    try {
      setBiometricBusy(true);

      const supported =
        await isBiometricSupported();

      setBiometricAvailable(
        supported
      );

      if (!supported) {
        throw new Error(
          "Biometric authentication is not supported or available on this device."
        );
      }

      await registerBiometric(
        profile.id,
        profile.email,
        profile.full_name
      );

      const verified =
        await authenticateBiometric();

      if (!verified) {
        clearStoredBiometricCredential();

        throw new Error(
          "Biometric verification could not be completed. Biometric Lock remains disabled."
        );
      }

      setBiometricLock(true);

      await persistBiometricPreference(
        true
      );

      setMessage(
        "Biometric Lock enabled successfully. Your device will verify you with its available biometric or device authenticator."
      );
    } catch (error) {
      console.error(
        "Enable biometric lock error:",
        error
      );

      clearStoredBiometricCredential();

      setBiometricLock(false);

      if (
        error instanceof DOMException &&
        error.name === "NotAllowedError"
      ) {
        setErrorMessage(
          "Biometric verification was cancelled or not completed. Biometric Lock remains disabled."
        );
      } else if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Unable to enable Biometric Lock on this device."
        );
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  async function handleBiometricVerification() {
    setMessage("");
    setErrorMessage("");

    if (!biometricLock) {
      setErrorMessage(
        "Enable Biometric Lock before testing verification."
      );
      return;
    }

    try {
      setBiometricBusy(true);

      const verified =
        await authenticateBiometric();

      if (!verified) {
        throw new Error(
          "Biometric verification could not be completed."
        );
      }

      setMessage(
        "Biometric verification successful."
      );
    } catch (error) {
      console.error(
        "Biometric verification error:",
        error
      );

      if (
        error instanceof DOMException &&
        error.name === "NotAllowedError"
      ) {
        setErrorMessage(
          "Biometric verification was cancelled or failed."
        );
      } else if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Biometric verification failed."
        );
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkBiometricSupport() {
      try {
        const supported =
          await isBiometricSupported();

        if (!cancelled) {
          setBiometricAvailable(
            supported
          );
        }
      } catch (error) {
        console.error(
          "Check biometric support error:",
          error
        );

        if (!cancelled) {
          setBiometricAvailable(
            false
          );
        }
      }
    }

    void checkBiometricSupport();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =========================================================
   * 2FA
   * =========================================================
   */
  async function startMfaEnrollment() {
    setMfaBusy(true);
    setEnrollmentError("");
    setEnrollmentCode("");
    setCopiedSecret(false);

    try {
      const {
        data: existingFactors,
      } =
        await supabase.auth.mfa.listFactors();

      if (existingFactors?.all) {
        for (const factor of existingFactors.all) {
          if (
            factor.status ===
            "unverified"
          ) {
            await supabase.auth.mfa.unenroll(
              {
                factorId: factor.id,
              }
            );
          }
        }
      }

      const { data, error } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: "SpendX",
          friendlyName:
            "SpendX Authenticator",
        });

      if (
        error ||
        !data ||
        !data.totp
      ) {
        throw new Error(
          error?.message ||
          "Failed to initialize 2FA enrollment."
        );
      }

      setEnrollmentData({
        id: data.id,
        qrCode:
          data.totp.qr_code,
        secret:
          data.totp.secret,
      });

      setEnrollmentModalOpen(
        true
      );
    } catch (error) {
      console.error(
        "MFA enrollment error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to start 2FA setup."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function cancelMfaEnrollment() {
    if (enrollmentData?.id) {
      try {
        await supabase.auth.mfa.unenroll(
          {
            factorId:
              enrollmentData.id,
          }
        );
      } catch (unenrollErr) {
        console.warn(
          "Could not unenroll unverified factor on cancel:",
          unenrollErr
        );
      }
    }

    setEnrollmentModalOpen(
      false
    );

    setEnrollmentData(null);
    setEnrollmentCode("");
    setEnrollmentError("");
  }

  async function handleVerifyMfaEnrollment(
    e: FormEvent
  ) {
    e.preventDefault();

    setEnrollmentError("");

    const cleanCode =
      enrollmentCode
        .trim()
        .replace(/\s+/g, "");

    if (
      !cleanCode ||
      cleanCode.length !== 6 ||
      !/^\d{6}$/.test(cleanCode)
    ) {
      setEnrollmentError(
        "Please enter a valid 6-digit verification code."
      );

      return;
    }

    if (!enrollmentData) {
      setEnrollmentError(
        "Enrollment session expired. Please try again."
      );

      return;
    }

    setMfaBusy(true);

    try {
      const { error } =
        await supabase.auth.mfa.challengeAndVerify(
          {
            factorId:
              enrollmentData.id,
            code: cleanCode,
          }
        );

      if (error) {
        const msg =
          error.message.toLowerCase();

        if (
          msg.includes("invalid") ||
          msg.includes("code") ||
          msg.includes("expired")
        ) {
          setEnrollmentError(
            "Invalid or expired verification code. Please check your app and try again."
          );
        } else {
          setEnrollmentError(
            error.message
          );
        }

        setMfaBusy(false);
        return;
      }

      setTwoFactor(true);

      setVerifiedFactorId(
        enrollmentData.id
      );

      setEnrollmentModalOpen(
        false
      );

      setEnrollmentData(null);
      setEnrollmentCode("");

      setMessage(
        "Two-Factor Authentication (TOTP) has been enabled successfully."
      );

      try {
        const saved =
          localStorage.getItem(
            "spendx-settings"
          );

        const current = saved
          ? JSON.parse(saved)
          : {};

        localStorage.setItem(
          "spendx-settings",
          JSON.stringify({
            ...current,
            twoFactor: true,
          })
        );
      } catch {
        // Non-critical.
      }
    } catch (err) {
      console.error(
        "MFA verification error:",
        err
      );

      setEnrollmentError(
        "Failed to verify code. Please try again."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleTwoFactorToggle() {
    setMessage("");
    setErrorMessage("");

    if (
      mfaBusy ||
      mfaLoading
    ) {
      return;
    }

    if (twoFactor) {
      setDisableError("");
      setDisableModalOpen(true);
    } else {
      await startMfaEnrollment();
    }
  }

  async function handleConfirmDisable2FA() {
    setMfaBusy(true);
    setDisableError("");

    try {
      let factorId =
        verifiedFactorId;

      if (!factorId) {
        const {
          data: factors,
        } =
          await supabase.auth.mfa.listFactors();

        const verified =
          factors?.totp?.find(
            (f) =>
              f.status ===
              "verified"
          );

        factorId =
          verified?.id ??
          null;
      }

      if (!factorId) {
        setTwoFactor(false);
        setDisableModalOpen(
          false
        );
        return;
      }

      const { error } =
        await supabase.auth.mfa.unenroll(
          {
            factorId,
          }
        );

      if (error) {
        throw error;
      }

      setTwoFactor(false);
      setVerifiedFactorId(
        null
      );

      setDisableModalOpen(
        false
      );

      setMessage(
        "Two-Factor Authentication has been disabled."
      );

      try {
        const saved =
          localStorage.getItem(
            "spendx-settings"
          );

        const current = saved
          ? JSON.parse(saved)
          : {};

        localStorage.setItem(
          "spendx-settings",
          JSON.stringify({
            ...current,
            twoFactor: false,
          })
        );
      } catch {
        // Non-critical.
      }
    } catch (err) {
      console.error(
        "Error disabling 2FA:",
        err
      );

      setDisableError(
        err instanceof Error
          ? err.message
          : "Failed to disable 2FA. Please try again."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  function copySecretToClipboard() {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(
        enrollmentData.secret
      );

      setCopiedSecret(true);

      setTimeout(
        () =>
          setCopiedSecret(
            false
          ),
        2500
      );
    }
  }

  /*
   * =========================================================
   * SAVE PREFERENCES
   * =========================================================
   */
  async function savePreferences() {
    try {
      setSavingPreferences(
        true
      );

      setMessage("");
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Get authenticated user error:",
          userError
        );

        throw new Error(
          userError.message
        );
      }

      if (!user) {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error(
            "You must be logged in to save preferences."
          );
        }
      }

      const authenticatedUser =
        user;

      if (!authenticatedUser) {
        throw new Error(
          "Unable to determine the authenticated user."
        );
      }

      /*
       * Save currency.
       */
      const {
        error: currencyError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authenticatedUser.id,
            currency,
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

        throw new Error(
          currencyError.message
        );
      }

      /*
       * Save all local preferences.
       */
      localStorage.setItem(
        "spendx-settings",
        JSON.stringify({
          emailAlerts,
          pushAlerts,
          smsAlerts,
          dailyExpenseReminder,
          dailyReminderTime,
          twoFactor,
          biometricLock,
          language,
          paymentConnected,
        })
      );

      /*
       * If daily reminder is enabled, make sure
       * the currently selected time is scheduled.
       */
      if (dailyExpenseReminder) {
        const scheduled =
          await scheduleDailyExpenseReminder(
            dailyReminderTime
          );

        if (!scheduled) {
          throw new Error(
            "Daily expense reminder could not be scheduled. Please check notification permissions."
          );
        }
      } else {
        await cancelDailyExpenseReminder();
      }

      setMessage(
        `Settings saved successfully. Currency: ${currency}`
      );
    } catch (error) {
      console.error(
        "Save preferences error:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Something went wrong while saving preferences."
        );
      }
    } finally {
      setSavingPreferences(
        false
      );
    }
  }

  /*
   * =========================================================
   * MONTHLY SPENDING LIMIT
   * =========================================================
   */
  async function saveMonthlySpendingLimit() {
    try {
      setSavingMonthlyLimit(
        true
      );

      setMessage("");
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          userError.message
        );
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

      const parsedLimit =
        Number(monthlyLimit);

      if (
        !Number.isFinite(
          parsedLimit
        ) ||
        parsedLimit <= 0
      ) {
        throw new Error(
          "Monthly spending limit must be greater than zero."
        );
      }

      const { error } =
        await supabase
          .from(
            "monthly_spending_limits"
          )
          .upsert(
            {
              user_id: user.id,
              monthly_limit:
                parsedLimit,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id",
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMonthlyLimit(
        parsedLimit.toString()
      );

      setMessage(
        "Monthly spending limit saved successfully."
      );
    } catch (error) {
      console.error(
        "Save monthly spending limit error:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Something went wrong while saving your spending limit."
        );
      }
    } finally {
      setSavingMonthlyLimit(
        false
      );
    }
  }

  /*
   * =========================================================
   * SIGN OUT
   * =========================================================
   */
  async function handleSignOut() {
    try {
      setSigningOut(true);
      setErrorMessage("");
      setMessage("");

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw new Error(
          error.message
        );
      }

      router.push("/login");
    } catch (error) {
      console.error(
        "Sign out error:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Something went wrong while signing out."
        );
      }
    } finally {
      setSigningOut(false);
    }
  }

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadUser();
      }, 0);

    return () =>
      window.clearTimeout(
        timer
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * =========================================================
   * PROFILE INITIALS
   * =========================================================
   */
  const initials = useMemo(() => {
    const name =
      profile?.full_name ||
      profile?.email ||
      "User";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("");
  }, [profile]);

  return (
    <AuthGuard>
      <div className="sx-screen">
        <TopHeader />

        <main className="mx-auto max-w-6xl px-6 pb-32 pt-36">
          <div className="mb-10">
            <h1 className="font-mono text-4xl font-bold tracking-tight sx-title">
              Settings
            </h1>

            <p className="mt-2 sx-muted">
              Configure SpendX preferences,
              security, profile, and account
              controls.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              <span>
                {errorMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage("")
                }
                className="rounded-full p-1 hover:bg-red-500/10"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {message && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
              <span>
                {message}
              </span>

              <button
                type="button"
                onClick={() =>
                  setMessage("")
                }
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
                      src={
                        profile.avatar_url
                      }
                      alt="Profile avatar"
                      className="h-16 w-16 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xl font-bold text-white">
                      {initials ||
                        "U"}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold sx-title">
                      {profile?.full_name ||
                        "User"}
                    </h3>

                    <p className="mt-1 text-xs sx-muted">
                      {profile?.email ||
                        "No email found"}
                    </p>

                    <span className="mt-2 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                      Auth Connected
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSignOut
                  }
                  disabled={
                    signingOut
                  }
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
                      <LogOut
                        size={16}
                      />
                      Sign out
                    </>
                  )}
                </button>
              </div>

              {/* SETTINGS SECTIONS */}
              {sections.map(
                (section) => (
                  <div
                    key={
                      section.title
                    }
                    className="space-y-4"
                  >
                    <h3 className="ml-1 font-mono text-xs font-bold uppercase tracking-widest sx-muted">
                      {
                        section.title
                      }
                    </h3>

                    <div className="sx-card overflow-hidden rounded-2xl">
                      {section.items.map(
                        (item) => {
                          const Icon =
                            item.icon;

                          const isExpanded =
                            expandedItems.has(
                              item.id
                            );

                          return (
                            <div
                              key={
                                item.id
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleExpanded(
                                    item.id
                                  )
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
                                    <Icon
                                      size={
                                        18
                                      }
                                    />
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-bold sx-title">
                                      {
                                        item.name
                                      }
                                    </h4>

                                    <p className="mt-0.5 text-xs sx-muted">
                                      {
                                        item.desc
                                      }
                                    </p>
                                  </div>
                                </div>

                                <ChevronDown
                                  size={
                                    16
                                  }
                                  className={`transition-transform ${isExpanded
                                      ? "rotate-180 text-primary"
                                      : "text-muted-foreground"
                                    }`}
                                />
                              </button>

                              {isExpanded && (
                                <div className="border-b border-border/60 bg-primary/5 p-6">
                                  {/* PROFILE */}
                                  {item.id ===
                                    "profile" && (
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
                                            value={
                                              displayName
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              setDisplayName(
                                                event
                                                  .target
                                                  .value
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
                                              profile?.email ||
                                              ""
                                            }
                                            disabled
                                            className="sx-field w-full cursor-not-allowed rounded-xl px-4 py-3 text-sm opacity-70"
                                          />
                                        </div>

                                        <button
                                          type="submit"
                                          disabled={
                                            savingProfile
                                          }
                                          className="sx-primary-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {savingProfile ? (
                                            <>
                                              <Loader2
                                                size={
                                                  16
                                                }
                                                className="animate-spin"
                                              />
                                              Saving
                                            </>
                                          ) : (
                                            <>
                                              <Save
                                                size={
                                                  16
                                                }
                                              />
                                              Save Profile
                                            </>
                                          )}
                                        </button>
                                      </form>
                                    )}

                                  {/* PAYMENTS */}
                                  {item.id ===
                                    "payments" && (
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
                                                (
                                                  current
                                                ) =>
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
                                              size={
                                                16
                                              }
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Save
                                              size={
                                                16
                                              }
                                            />
                                          )}
                                          Save Payment Settings
                                        </button>
                                      </div>
                                    )}

                                  {/* ALERTS */}
                                  {item.id ===
                                    "alerts" && (
                                      <div className="space-y-6">
                                        <div>
                                          <h2 className="font-mono text-xl font-bold sx-title">
                                            System Alerts
                                          </h2>

                                          <p className="mt-2 text-sm sx-muted">
                                            Choose how SpendX
                                            should notify you.
                                          </p>
                                        </div>

                                        <div className="space-y-4">
                                          {/* EMAIL */}
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
                                              checked={
                                                emailAlerts
                                              }
                                              onChange={() =>
                                                setEmailAlerts(
                                                  (
                                                    current
                                                  ) =>
                                                    !current
                                                )
                                              }
                                            />
                                          </div>

                                          {/* PUSH */}
                                          <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                            <div className="min-w-0">
                                              <h3 className="text-sm font-bold sx-title">
                                                Push Alerts
                                              </h3>

                                              <p className="mt-1 text-xs sx-muted">
                                                Receive real browser
                                                or system notifications
                                                from SpendX.
                                              </p>

                                              {notificationBusy && (
                                                <p className="mt-2 text-[11px] text-primary">
                                                  Requesting
                                                  notification
                                                  permission...
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                              {notificationBusy && (
                                                <Loader2
                                                  size={
                                                    16
                                                  }
                                                  className="animate-spin text-primary"
                                                />
                                              )}

                                              <SettingToggle
                                                checked={
                                                  pushAlerts
                                                }
                                                disabled={
                                                  notificationBusy
                                                }
                                                onChange={
                                                  handlePushAlertsToggle
                                                }
                                                label={
                                                  pushAlerts
                                                    ? "Disable Push Alerts"
                                                    : "Enable Push Alerts"
                                                }
                                              />
                                            </div>
                                          </div>

                                          {/* DAILY EXPENSE REMINDER */}
                                          <div className="sx-panel rounded-xl p-5">
                                            <div className="flex items-center justify-between gap-4">
                                              <div className="min-w-0">
                                                <h3 className="text-sm font-bold sx-title">
                                                  Daily Expense Reminder
                                                </h3>

                                                <p className="mt-1 text-xs sx-muted">
                                                  Receive a daily reminder
                                                  to record your expenses.
                                                </p>
                                              </div>

                                              <div className="flex shrink-0 items-center gap-3">
                                                {dailyReminderBusy && (
                                                  <Loader2
                                                    size={
                                                      16
                                                    }
                                                    className="animate-spin text-primary"
                                                  />
                                                )}

                                                <SettingToggle
                                                  checked={
                                                    dailyExpenseReminder
                                                  }
                                                  disabled={
                                                    dailyReminderBusy
                                                  }
                                                  onChange={
                                                    handleDailyReminderToggle
                                                  }
                                                  label={
                                                    dailyExpenseReminder
                                                      ? "Disable Daily Expense Reminder"
                                                      : "Enable Daily Expense Reminder"
                                                  }
                                                />
                                              </div>
                                            </div>

                                            {dailyExpenseReminder && (
                                              <div className="mt-5 rounded-xl border border-border/60 bg-background/30 p-4">
                                                <label className="mb-2 block font-mono text-xs sx-muted">
                                                  Reminder Time
                                                </label>

                                                <input
                                                  type="time"
                                                  value={
                                                    dailyReminderTime
                                                  }
                                                  onChange={(
                                                    event
                                                  ) =>
                                                    void handleDailyReminderTimeChange(
                                                      event
                                                        .target
                                                        .value
                                                    )
                                                  }
                                                  disabled={
                                                    dailyReminderBusy
                                                  }
                                                  className="sx-field w-full rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                                />

                                                <p className="mt-2 text-[11px] sx-muted">
                                                  SpendX will remind
                                                  you every day at{" "}
                                                  <span className="font-semibold sx-title">
                                                    {
                                                      dailyReminderTime
                                                    }
                                                  </span>
                                                  .
                                                </p>
                                              </div>
                                            )}
                                          </div>

                                          {/* SMS */}
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
                                              checked={
                                                smsAlerts
                                              }
                                              onChange={() =>
                                                setSmsAlerts(
                                                  (
                                                    current
                                                  ) =>
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
                                              size={
                                                16
                                              }
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Save
                                              size={
                                                16
                                              }
                                            />
                                          )}

                                          Save Alert Settings
                                        </button>
                                      </div>
                                    )}

                                  {/* SECURITY */}
                                  {item.id ===
                                    "security" && (
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
                                          {/* 2FA */}
                                          <div className="sx-panel flex items-center justify-between gap-4 rounded-xl p-5">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2.5">
                                                <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                                                  <ShieldCheck
                                                    size={
                                                      18
                                                    }
                                                  />
                                                </div>

                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold sx-title">
                                                      Two-Factor Authentication (TOTP)
                                                    </h3>

                                                    {twoFactor ? (
                                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                                        Active
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                                                        Disabled
                                                      </span>
                                                    )}
                                                  </div>

                                                  <p className="mt-1 text-xs sx-muted">
                                                    Protect your account
                                                    with a time-based
                                                    one-time password
                                                    (TOTP) using Google
                                                    Authenticator, Authy,
                                                    or 1Password.
                                                  </p>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                              {mfaBusy && (
                                                <Loader2
                                                  size={
                                                    16
                                                  }
                                                  className="animate-spin text-primary"
                                                />
                                              )}

                                              <SettingToggle
                                                checked={
                                                  twoFactor
                                                }
                                                disabled={
                                                  mfaBusy ||
                                                  mfaLoading
                                                }
                                                onChange={
                                                  handleTwoFactorToggle
                                                }
                                                label={
                                                  twoFactor
                                                    ? "Disable Two-Factor Authentication"
                                                    : "Enable Two-Factor Authentication"
                                                }
                                              />
                                            </div>
                                          </div>

                                          {/* BIOMETRIC */}
                                          <div className="sx-panel rounded-xl p-5">
                                            <div className="flex items-center justify-between gap-4">
                                              <div className="flex min-w-0 items-start gap-3">
                                                <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                                                  <Fingerprint
                                                    size={
                                                      18
                                                    }
                                                  />
                                                </div>

                                                <div className="min-w-0">
                                                  <h3 className="text-sm font-bold sx-title">
                                                    Biometric Lock
                                                  </h3>

                                                  <p className="mt-1 text-xs sx-muted">
                                                    Require your device&apos;s
                                                    biometric or
                                                    user-verifying
                                                    platform authenticator
                                                    when SpendX requests
                                                    biometric verification.
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="flex shrink-0 items-center gap-3">
                                                {biometricBusy && (
                                                  <Loader2
                                                    size={
                                                      16
                                                    }
                                                    className="animate-spin text-primary"
                                                  />
                                                )}

                                                <SettingToggle
                                                  checked={
                                                    biometricLock
                                                  }
                                                  onChange={
                                                    handleBiometricToggle
                                                  }
                                                  label={
                                                    biometricLock
                                                      ? "Disable Biometric Lock"
                                                      : "Enable Biometric Lock"
                                                  }
                                                />
                                              </div>
                                            </div>

                                            <div className="mt-4 rounded-xl border border-border/60 bg-background/30 px-4 py-3">
                                              <div className="flex items-center justify-between gap-4">
                                                <div>
                                                  <p className="text-xs font-semibold sx-title">
                                                    Device support
                                                  </p>

                                                  <p className="mt-1 text-[11px] sx-muted">
                                                    {biometricAvailable ===
                                                      null
                                                      ? "Checking device support..."
                                                      : biometricAvailable
                                                        ? "A user-verifying platform authenticator is available."
                                                        : "Biometric authentication is unavailable on this device or browser."}
                                                  </p>
                                                </div>

                                                <span
                                                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${biometricAvailable ===
                                                      true
                                                      ? "bg-emerald-500/10 text-emerald-300"
                                                      : biometricAvailable ===
                                                        false
                                                        ? "bg-red-500/10 text-red-300"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                  {biometricAvailable ===
                                                    true
                                                    ? "Available"
                                                    : biometricAvailable ===
                                                      false
                                                      ? "Unavailable"
                                                      : "Checking"}
                                                </span>
                                              </div>
                                            </div>

                                            {biometricLock && (
                                              <button
                                                type="button"
                                                onClick={
                                                  handleBiometricVerification
                                                }
                                                disabled={
                                                  biometricBusy
                                                }
                                                className="sx-secondary-button mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {biometricBusy ? (
                                                  <Loader2
                                                    size={
                                                      14
                                                    }
                                                    className="animate-spin"
                                                  />
                                                ) : (
                                                  <Fingerprint
                                                    size={
                                                      14
                                                    }
                                                  />
                                                )}

                                                Test Biometric Verification
                                              </button>
                                            )}
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
                                              size={
                                                16
                                              }
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Shield
                                              size={
                                                16
                                              }
                                            />
                                          )}

                                          Save Security Settings
                                        </button>
                                      </div>
                                    )}

                                  {/* MONTHLY SPENDING LIMIT */}
                                  {item.id ===
                                    "spendingLimit" && (
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
                                            Monthly Limit (
                                            {
                                              currency
                                            }
                                            )
                                          </label>

                                          <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={
                                              monthlyLimit
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              setMonthlyLimit(
                                                event
                                                  .target
                                                  .value
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
                                          Number(
                                            monthlyLimit
                                          ) > 0 && (
                                            <div className="sx-panel rounded-xl p-5">
                                              <div className="flex items-center justify-between gap-4">
                                                <div>
                                                  <p className="text-xs sx-muted">
                                                    Current monthly
                                                    limit
                                                  </p>

                                                  <p className="mt-1 font-mono text-xl font-bold sx-title">
                                                    {
                                                      currency
                                                    }{" "}
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
                                                size={
                                                  16
                                                }
                                                className="animate-spin"
                                              />
                                              Saving...
                                            </>
                                          ) : (
                                            <>
                                              <Save
                                                size={
                                                  16
                                                }
                                              />
                                              Save Spending Limit
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}

                                  {/* LOCALIZATION */}
                                  {item.id ===
                                    "localization" && (
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
                                            value={
                                              currency
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              setCurrency(
                                                event
                                                  .target
                                                  .value as CurrencyCode
                                              )
                                            }
                                            className="sx-field w-full rounded-xl px-4 py-3 text-sm"
                                          >
                                            {currencies.map(
                                              (
                                                item
                                              ) => (
                                                <option
                                                  key={
                                                    item.code
                                                  }
                                                  value={
                                                    item.code
                                                  }
                                                >
                                                  {
                                                    item.code
                                                  }{" "}
                                                  —{" "}
                                                  {
                                                    item.name
                                                  }
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
                                            value={
                                              language
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              setLanguage(
                                                event
                                                  .target
                                                  .value
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
                                                {
                                                  currency
                                                }
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
                                          className="sx-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                                        >
                                          {savingPreferences ? (
                                            <>
                                              <Loader2
                                                size={
                                                  16
                                                }
                                                className="animate-spin"
                                              />
                                              Saving...
                                            </>
                                          ) : (
                                            <>
                                              <Check
                                                size={
                                                  16
                                                }
                                              />
                                              Save Localization
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}

                                  {/* APPEARANCE */}
                                  {item.id ===
                                    "appearance" && (
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
                                              {theme ===
                                                "dark" ? (
                                                <Moon
                                                  size={
                                                    20
                                                  }
                                                />
                                              ) : (
                                                <Sun
                                                  size={
                                                    20
                                                  }
                                                />
                                              )}
                                            </div>

                                            <div className="min-w-0">
                                              <h3 className="text-sm font-bold sx-title">
                                                {theme ===
                                                  "dark"
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
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </main>

        {/* 2FA ENROLLMENT MODAL */}
        {enrollmentModalOpen &&
          enrollmentData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1226] p-6 shadow-2xl sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
                      <ShieldCheck
                        size={20}
                      />
                    </div>

                    <div>
                      <h2 className="font-mono text-base font-bold text-white">
                        Enable Two-Factor Authentication
                      </h2>

                      <p className="text-xs text-white/50">
                        Step-by-step TOTP setup
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      cancelMfaEnrollment
                    }
                    className="rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {enrollmentError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                    <ShieldAlert
                      size={16}
                      className="mt-0.5 shrink-0 text-red-400"
                    />
                    <span>
                      {
                        enrollmentError
                      }
                    </span>
                  </div>
                )}

                <form
                  onSubmit={
                    handleVerifyMfaEnrollment
                  }
                  className="space-y-5"
                >
                  {/* Step 1 */}
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      <QrCode
                        size={14}
                      />
                      <span>
                        Step 1: Scan with Authenticator App
                      </span>
                    </div>

                    <p className="mb-3 text-xs text-white/60">
                      Open Google Authenticator, Authy, or 1Password and scan this QR code.
                    </p>

                    <div className="mx-auto flex w-fit justify-center rounded-2xl bg-white p-3.5 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          enrollmentData.qrCode
                        }
                        alt="Two-Factor QR Code"
                        className="h-44 w-44 object-contain"
                      />
                    </div>
                  </div>

                  {/* Manual Key */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-white/60">
                        <KeyRound
                          size={13}
                        />
                        Manual setup secret:
                      </span>

                      <button
                        type="button"
                        onClick={
                          copySecretToClipboard
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
                      >
                        {copiedSecret ? (
                          <>
                            <Check
                              size={12}
                            />
                            <span>
                              Copied!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy
                              size={12}
                            />
                            <span>
                              Copy Key
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="break-all rounded-lg border border-white/5 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-white/90 select-all">
                      {
                        enrollmentData.secret
                      }
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      <Check
                        size={14}
                      />
                      <span>
                        Step 2: Enter 6-Digit Code
                      </span>
                    </div>

                    <p className="mb-2.5 text-xs text-white/60">
                      Enter the code currently displayed in your authenticator app to confirm setup.
                    </p>

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={
                        enrollmentCode
                      }
                      onChange={(e) => {
                        setEnrollmentCode(
                          e.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              6
                            )
                        );

                        setEnrollmentError(
                          ""
                        );
                      }}
                      disabled={
                        mfaBusy
                      }
                      className="w-full rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-white outline-none transition focus:border-emerald-400 focus:bg-white/[0.12]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={
                        cancelMfaEnrollment
                      }
                      disabled={
                        mfaBusy
                      }
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        mfaBusy ||
                        enrollmentCode.trim()
                          .length !== 6
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {mfaBusy ? (
                        <>
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />

                          <span>
                            Verifying...
                          </span>
                        </>
                      ) : (
                        <span>
                          Verify & Activate
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* 2FA DISABLE MODAL */}
        {disableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1226] p-6 shadow-2xl sm:p-7">
              <div className="mb-4 flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-red-400">
                  <ShieldAlert
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-mono text-base font-bold text-white">
                    Disable Two-Factor Authentication?
                  </h2>

                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    This will remove the extra layer of security from your SpendX account. You will only require your email and password to log in.
                  </p>
                </div>
              </div>

              {disableError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {
                    disableError
                  }
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setDisableModalOpen(
                      false
                    )
                  }
                  disabled={
                    mfaBusy
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  Keep 2FA Enabled
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmDisable2FA
                  }
                  disabled={
                    mfaBusy
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-60"
                >
                  {mfaBusy ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />

                      <span>
                        Disabling...
                      </span>
                    </>
                  ) : (
                    <span>
                      Disable 2FA
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <LiquidGlassNavbar />
      </div>
    </AuthGuard>
  );
}