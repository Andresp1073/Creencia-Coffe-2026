"use client";

import { useEffect } from "react";

export default function PanelEntry() {
  useEffect(() => {
    const hasAccess = sessionStorage.getItem("adminTabId");
    window.location.replace(hasAccess ? "/admin" : "/login");
  }, []);
  return null;
}