"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Header from "./Header";
import ProspectsPipeline from "./ProspectsPipeline";
import Campaigns from "./Campaigns";
import Settings from "./Settings";
import AgentChat from "./AgentChat";
import ApprovalQueue from "./ApprovalQueue";
import BIShell from "./bi/BIShell";
import UsersManagement from "./UsersManagement";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("");
  const initialized = useRef(false);

  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Initialiser le tab selon le rôle + écouter les changements de hash
  useEffect(() => {
    if (authLoading || !user) return;

    const adminTabs = ["dashboard", "prospects", "campaigns", "approval", "agent", "settings", "users"];
    const userTabs  = ["prospects", "campaigns", "approval", "agent", "settings"];
    const validTabs = user.role === "admin" ? adminTabs : userTabs;

    if (!initialized.current) {
      initialized.current = true;
      const hash = window.location.hash.replace("#", "");
      queueMicrotask(() => {
        if (hash && validTabs.includes(hash)) {
          setActiveTab(hash);
        } else {
          // Admin → dashboard BI, User → chat agent
          setActiveTab(user.role === "admin" ? "dashboard" : "agent");
        }
      });
    }

    const onHashChange = () => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash && validTabs.includes(newHash)) {
        setActiveTab(newHash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [user, authLoading]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className={`flex-1 min-h-0 ${activeTab === "agent" ? "overflow-hidden" : "overflow-y-auto p-3 sm:p-4 lg:p-6"}`}>
          {activeTab === "dashboard" && user?.role === "admin" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <BIShell />
            </motion.div>
          )}

          {activeTab === "prospects" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ProspectsPipeline fullView />
            </motion.div>
          )}

          {activeTab === "campaigns" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Campaigns />
            </motion.div>
          )}


          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Settings />
            </motion.div>
          )}

          {activeTab === "approval" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ApprovalQueue />
            </motion.div>
          )}


          {activeTab === "agent" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
              <AgentChat />
            </motion.div>
          )}

          {activeTab === "users" && user?.role === "admin" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UsersManagement />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
