"use client";

import Image from "next/image";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { clearAdminSession, readAdminSession } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi"; // <-- add

export default function UserDropdown() {
  const router = useRouter();
  const { disconnect } = useDisconnect(); // <-- add
  const [isOpen, setIsOpen] = useState(false);

  const { wallet } = readAdminSession() || {};
  const walletFull = wallet || "0xAbcdef1234567890abcdef1234567890AbCdEf";
  const walletShort = walletFull.slice(0, 6) + "…" + walletFull.slice(-4);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }
  function closeDropdown() { setIsOpen(false); }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(walletFull); } catch {}
  }

  function handleLogout() {
    try {
      setIsOpen(false);
      clearAdminSession();     // 1) clear local session
      try { disconnect(); } catch {} // 2) disconnect wagmi connectors (best-effort)
      router.replace("/signin"); // 3) go to sign-in
      router.refresh();          // 4) re-render app tree
      // 5) last-resort hard redirect (covers any client cache edge-case)
      setTimeout(() => {
        if (window.location.pathname !== "/signin") {
          window.location.replace("/signin");
        }
      }, 0);
    } catch {}
  }
  return (
    <div className="relative">
      {/* Trigger button (avatar + short address + chevron) */}
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
          <Image
            width={44}
            height={44}
            src="/images/user/owner.jpg"
            alt="User avatar"
          />
        </span>

        <span className="block mr-1 font-medium text-theme-sm text-gray-700 dark:text-gray-400">
          {walletShort}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* Wallet summary */}
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {walletShort}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            Admin (whitelisted)
          </span>
        </div>

        {/* Actions */}
        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          {/* Copy address */}
          <li>
            <DropdownItem
              onItemClick={() => {
                handleCopy();
                closeDropdown();
              }}
              tag="button"
              className="flex w-full items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V3Zm-4 5a2 2 0 0 1 2-2h1v2H6v10h8v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
              </svg>
              Copy address
            </DropdownItem>
          </li>

          {/* Account settings placeholder */}
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566Z"
                />
              </svg>
              Account settings
            </DropdownItem>
          </li>

          {/* Support placeholder */}
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/support"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm1.07-7.75-.9.92A2.5 2.5 0 0 0 12.5 12h-1v-1c0-.55.45-1 1-1 .28 0 .5-.22.5-.5 0-.28-.22-.5-.5-.5-.28 0-.5.22-.5.5h-2a2.5 2.5 0 1 1 5 0c0 .69-.28 1.32-.73 1.75Z" />
              </svg>
              Support
            </DropdownItem>
          </li>
        </ul>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <svg
            className="fill-gray-500"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M15.1 19.247c-.414 0-.75-.336-.75-.75V14.245h-1.5v4.252c0 1.243 1.007 2.25 2.25 2.25h3.4c1.243 0 2.25-1.007 2.25-2.25V5.496c0-1.243-1.007-2.25-2.25-2.25h-3.4c-1.243 0-2.25 1.007-2.25 2.25v4.249h1.5V5.496c0-.414.336-.75.75-.75h3.4c.414 0 .75.336.75.75v12.001c0 .414-.336.75-.75.75h-3.4ZM3.251 11.998c0 .216.091.41.237.547l4.607 4.61a.75.75 0 0 0 1.061-.001.75.75 0 0 0-.001-1.06L7.811 12.748H16a.75.75 0 0 0 0-1.5H7.815l3.34-3.343a.75.75 0 1 0-1.061-1.06l-4.572 4.514c-.166.137-.272.345-.272.589Z" />
          </svg>
          Logout
        </button>
      </Dropdown>
    </div>
  );
}