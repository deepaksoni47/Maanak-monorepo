"use client";

import React from "react";
import { Shell } from "@/components/layout/Shell";
import { UserManagementView } from "@/components/admin/UserManagementView";

export default function AdminUsersPage() {
  return (
    <Shell
      pageTitle="Personnel & Access Management"
      pageSubtitle="Provision legal metrology officer credentials and govern statutory role clearances across RRSL facilities."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Admin Portal", href: "/admin/users" },
        { label: "Personnel Directory" },
      ]}
    >
      <UserManagementView />
    </Shell>
  );
}
