"use client";

import AssistantButton from "@/components/chatbot/AssistantButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ReceiptText,
    BarChart3,
    Settings,
    TrendingUp,
} from "lucide-react";
import { useRef, useState } from "react";

const navItems = [
    {
        label: "Dashboard",
        mobileLabel: "Home",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Records",
        mobileLabel: "Records",
        href: "/transactions",
        icon: ReceiptText,
    },
    {
        label: "Reports",
        mobileLabel: "Reports",
        href: "/reports",
        icon: BarChart3,
    },
    {
        label: "Analyze",
        mobileLabel: "Analyze",
        href: "/analyze",
        icon: TrendingUp,
    },
    {
        label: "Settings",
        mobileLabel: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export default function LiquidGlassNavbar() {
    const pathname = usePathname();

    const itemRefs = useRef<(HTMLAnchorElement | null)[]>(
        []
    );

    const [hoveredIndex, setHoveredIndex] =
        useState<number | null>(null);

    const [hoverStyle, setHoverStyle] = useState({
        left: 0,
        width: 0,
    });

    const activeIndex = navItems.findIndex(
        (item) =>
            pathname === item.href ||
            (item.href === "/dashboard" &&
                pathname === "/")
    );

    const handleMouseEnter = (index: number) => {
        const item = itemRefs.current[index];

        if (!item) return;

        setHoveredIndex(index);

        setHoverStyle({
            left: item.offsetLeft,
            width: item.offsetWidth,
        });
    };

    const shouldShowHover =
        hoveredIndex !== null &&
        hoveredIndex !== activeIndex;

    return (
        <>
            {/* Floating SpendX Assistant */}
            <AssistantButton />

            {/* Existing Navigation */}
            <div className="fixed bottom-4 left-1/2 z-50 w-full -translate-x-1/2 px-3 xl:bottom-8 xl:px-4">
                <nav
                    onMouseLeave={() =>
                        setHoveredIndex(null)
                    }
                    className="
                        relative mx-auto grid w-full max-w-[calc(100vw-24px)] grid-cols-5 items-center gap-1
                        overflow-hidden rounded-[28px] border border-transparent
                        bg-background/78 p-1.5
                        shadow-[0_16px_42px_rgba(15,23,42,0.16)]
                        backdrop-blur-[28px] backdrop-saturate-[180%]
                        dark:bg-white/[0.025]
                        dark:shadow-[0_22px_80px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.12)]
                        xl:border-border/70
                        xl:bg-background/70
                        xl:shadow-[0_22px_70px_rgba(15,23,42,0.18),inset_0_1px_1px_rgba(255,255,255,0.18)]
                        xl:dark:border-white/12
                        xl:dark:shadow-[0_22px_80px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1px_1px_rgba(255,255,255,0.04)]
                        xl:flex
                        xl:w-fit
                        xl:max-w-[calc(100vw-32px)]
                        xl:gap-2
                        xl:rounded-full
                        xl:p-2
                    "
                >
                    {/* Desktop glass background */}
                    <div className="pointer-events-none absolute inset-0 hidden rounded-full bg-white/20 dark:bg-zinc-950/32 xl:block" />

                    <div className="pointer-events-none absolute inset-0 hidden rounded-full bg-gradient-to-b from-white/50 via-white/[0.08] to-transparent dark:from-white/12 dark:via-white/[0.02] xl:block" />

                    <div className="pointer-events-none absolute -left-24 top-0 hidden h-full w-56 rotate-12 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent blur-md xl:block" />

                    <div className="pointer-events-none absolute inset-[1px] hidden rounded-full border border-white/[0.055] shadow-[inset_0_0_24px_rgba(255,255,255,0.055),inset_0_-18px_32px_rgba(255,255,255,0.025)] xl:block" />

                    {/* Smooth moving hover pill */}
                    <div
                        className={`
                            pointer-events-none absolute top-2 z-[6] hidden h-14 rounded-full border border-border/70
                            bg-primary/8
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_8px_24px_rgba(15,23,42,0.12)]
                            backdrop-blur-2xl
                            transition-all duration-300 ease-out
                            dark:border-white/12
                            dark:bg-white/[0.055]
                            dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1px_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.28)]
                            xl:block
                            ${shouldShowHover
                                ? "opacity-100"
                                : "opacity-0"
                            }
                        `}
                        style={{
                            left: `${hoverStyle.left}px`,
                            width: `${hoverStyle.width}px`,
                        }}
                    >
                        <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/16 via-white/[0.03] to-transparent" />

                        <div className="absolute left-5 top-1 h-3 w-16 rounded-full bg-white/18 blur-md" />
                    </div>

                    {/* Navigation items */}
                    {navItems.map(
                        (item, index) => {
                            const Icon = item.icon;

                            const isActive =
                                pathname ===
                                item.href ||
                                (item.href ===
                                    "/dashboard" &&
                                    pathname === "/");

                            const isHovered =
                                hoveredIndex ===
                                index;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    ref={(element) => {
                                        itemRefs.current[
                                            index
                                        ] =
                                            element;
                                    }}
                                    onMouseEnter={() =>
                                        handleMouseEnter(
                                            index
                                        )
                                    }
                                    className="
                                        group relative z-10 flex h-14 min-w-0 flex-col items-center justify-center gap-1
                                        overflow-hidden rounded-[22px] px-1 text-[10px] font-semibold tracking-normal
                                        transition-transform duration-300 hover:-translate-y-[1px]
                                        xl:w-[200px]
                                        xl:flex-row
                                        xl:gap-2
                                        xl:rounded-full
                                        xl:px-4
                                        xl:text-sm
                                    "
                                >
                                    {/* Active pill */}
                                    {isActive && (
                                        <div
                                            className="
                                                pointer-events-none absolute inset-0 rounded-[22px] border border-transparent
                                                bg-primary/10
                                                shadow-none
                                                backdrop-blur-2xl
                                                dark:bg-white/[0.12]
                                                xl:rounded-full
                                                xl:border-primary/20
                                                xl:shadow-[inset_0_1px_1px_rgba(255,255,255,0.36),0_10px_30px_rgba(15,23,42,0.14)]
                                                xl:dark:border-white/24
                                                xl:dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.36),inset_0_-14px_24px_rgba(255,255,255,0.055),0_10px_30px_rgba(0,0,0,0.42),0_0_24px_rgba(255,255,255,0.055)]
                                            "
                                        >
                                            <div className="absolute inset-[1px] hidden rounded-full bg-gradient-to-b from-white/24 via-white/[0.045] to-transparent xl:block" />

                                            <div className="absolute left-5 top-1 hidden h-3 w-16 rounded-full bg-white/24 blur-md xl:block" />

                                            <div className="absolute bottom-1 right-4 hidden h-4 w-14 rounded-full bg-white/[0.065] blur-md xl:block" />
                                        </div>
                                    )}

                                    <Icon
                                        className={`relative z-10 h-5 w-5 shrink-0 transition-colors duration-300 ${isActive ||
                                                isHovered
                                                ? "text-primary dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]"
                                                : "text-muted-foreground"
                                            }`}
                                    />

                                    <span
                                        className={`relative z-10 whitespace-nowrap transition-colors duration-300 ${isActive ||
                                                isHovered
                                                ? "text-foreground dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.16)]"
                                                : "text-muted-foreground"
                                            }`}
                                    >
                                        <span className="xl:hidden">
                                            {
                                                item.mobileLabel
                                            }
                                        </span>

                                        <span className="hidden xl:inline">
                                            {
                                                item.label
                                            }
                                        </span>
                                    </span>
                                </Link>
                            );
                        }
                    )}
                </nav>
            </div>
        </>
    );
}