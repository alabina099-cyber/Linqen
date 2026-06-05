"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle,
  CheckSquare,
  X,
  Clock,
  Search,
  User,
  MessageSquare,
  Link as LinkIcon,
  UserPlus,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Square,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface PendingAction {
  id: number;
  action_type: string;
  target_url: string;
  target_name: string | null;
  payload: any;
  status: string;
  created_at: string;
  error_message?: string | null;
  result?: any;
  user_id?: number | null;
  owner_name?: string | null;
}

interface ActionStats {
  status: string;
  count: number;
}

export default function ApprovalQueue() {
  const { user } = useAuth();
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [allActions, setAllActions] = useState<PendingAction[]>([]);
  const [stats, setStats] = useState<ActionStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>("pending_approval");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);

  // --- API helpers ---

  const fetchActionsAndStats = useCallback(async (statusFilter?: string | null) => {
    try {
      setIsRefreshing(true);
      const currentFilter = statusFilter !== undefined ? statusFilter : selectedStatus;

      // Fetch all actions for allActions cache + stats
      const allResponse = await fetch("/api/linkedin-actions/approval");
      const allData = await allResponse.json();

      if (allData.success) {
        setAllActions(allData.actions || []);
        setStats(allData.stats || []);

        // Filtrer les actions affichées selon le statut sélectionné
        const all = allData.actions || [];
        if (currentFilter === null) {
          setActions([...all].sort((a: PendingAction, b: PendingAction) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        } else if (currentFilter === "rejected_failed") {
          setActions(all.filter((a: PendingAction) => a.status === "rejected" || a.status === "failed"));
        } else if (currentFilter === "processing_stopped") {
          setActions(all.filter((a: PendingAction) => a.status === "processing" || a.status === "stopped"));
        } else {
          setActions(all.filter((a: PendingAction) => a.status === currentFilter));
        }
      }
    } catch (error) {
      console.error("Error fetching actions:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  const filterByStatus = (status: string | null) => {
    // IMPORTANT: Arrêter le polling en cours pour éviter qu'il écrase le nouveau filtre
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setSelectedStatus(status);
    // Re-fetch avec le nouveau filtre pour avoir des données fraîches
    fetchActionsAndStats(status);
  };

  // Démarrer un auto-refresh temporaire (ex: après une approbation)
  // Le polling utilise toujours le selectedStatus ACTUEL pour ne pas écraser le filtre utilisateur
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      // Utiliser undefined pour que fetchActionsAndStats utilise le selectedStatus actuel
      await fetchActionsAndStats();
      if (count >= 6) {
        // Stop après 30s (6 x 5s)
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  }, [fetchActionsAndStats]);

  const updateAction = async (
    id: number,
    action: "approve" | "reject" | "retry" | "stop" | "continue"
  ) => {
    setProcessingId(id);
    try {
      const response = await fetch("/api/linkedin-actions/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await response.json();
      if (data.success) {
        // Naviguer vers le bon onglet après l'action
        let targetStatus: string | null = selectedStatus;
        if (action === "approve") targetStatus = "approved";
        else if (action === "reject") targetStatus = "rejected_failed";
        else if (action === "retry") targetStatus = "pending_approval";
        else if (action === "stop") targetStatus = "processing_stopped";
        else if (action === "continue") targetStatus = "processing_stopped";

        setSelectedStatus(targetStatus);
        await fetchActionsAndStats(targetStatus);

        // Démarrer un polling temporaire pour suivre l'action
        if (action === "approve" || action === "retry" || action === "continue" || action === "stop") {
          startPolling();
        }
      }
    } catch (error) {
      console.error(`Error trying to ${action} action:`, error);
    } finally {
      setProcessingId(null);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const approveAction = (id: number) => updateAction(id, "approve");
  const rejectAction = (id: number) => updateAction(id, "reject");
  const retryAction = (id: number) => updateAction(id, "retry");
  const stopAction = (id: number) => updateAction(id, "stop");

  useEffect(() => {
    fetchActionsAndStats();
    // Auto-refresh removed - manual refresh only
  }, [fetchActionsAndStats]);

  // --- Helpers UI ---

  const getActionIcon = (type: string) => {
    switch (type) {
      case "search":
        return <Search className="w-5 h-5" />;
      case "search_and_message":
        return <MessageSquare className="w-5 h-5" />;
      case "search_and_connection":
        return <UserPlus className="w-5 h-5" />;
      case "visit_profile":
        return <User className="w-5 h-5" />;
      case "send_connection":
        return <LinkIcon className="w-5 h-5" />;
      case "send_message":
        return <MessageSquare className="w-5 h-5" />;
      case "check_connection":
        return <CheckSquare className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      search: "Recherche LinkedIn",
      search_and_message: "Recherche et Envoi de message",
      search_and_connection: "Recherche et Envoi de connexion",
      visit_profile: "Visiter profil",
      send_connection: "Demande de connexion",
      send_message: "Envoyer un message",
      check_connection: "Vérification réseau",
    };
    return labels[type] || type;
  };

  const getActionBadgeColor = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "processing":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "rejected":
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      case "stopped":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "paused":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIconColor = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "text-yellow-600";
      case "approved":
        return "text-green-600";
      case "processing":
        return "text-indigo-600";
      case "completed":
        return "text-blue-600";
      case "rejected":
      case "failed":
        return "text-red-600";
      case "stopped":
        return "text-orange-600";
      case "paused":
        return "text-amber-600";
      default:
        return "text-gray-600";
    }
  };

  const getCount = (status: string): number => {
    const found = stats.find((s) => s.status === status);
    return found ? Number(found.count) : 0;
  };

  const formatPayload = (action: PendingAction) => {
    const payload =
      typeof action.payload === "string"
        ? (() => {
            try {
              return JSON.parse(action.payload);
            } catch {
              return null;
            }
          })()
        : action.payload;

    if (action.action_type === "send_connection" && payload?.note) {
      const text = payload.note as string;
      return `Note : "${text.substring(0, 100)}${
        text.length > 100 ? "..." : ""
      }"`;
    }
    if (action.action_type === "send_message" && payload?.message) {
      const text = payload.message as string;
      return `Message : "${text.substring(0, 100)}${
        text.length > 100 ? "..." : ""
      }"`;
    }
    if (action.action_type === "search" && payload?.keywords) {
      return `Mots-clés : "${payload.keywords}"`;
    }
    if (action.action_type === "search_and_message" && payload?.message_template) {
      const text = payload.message_template as string;
      return `"${text.substring(0, 120)}${text.length > 120 ? "..." : ""}"`;
    }
    return "";
  };

  const totalToday = stats.reduce(
    (acc: number, s: ActionStats) => acc + Number(s.count || 0),
    0
  );

  // Badge de statut pour chaque action
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]">En attente</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">Approuvée</Badge>;
      case "processing":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px]">En cours</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">Terminée</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">Rejetée</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">Échouée</Badge>;
      case "stopped":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px]">Arrêtée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-[10px]">{status}</Badge>;
    }
  };

  // Helper pour afficher les bons boutons selon le statut
  const renderActionButtons = (action: PendingAction) => {
    const isProcessing = processingId === action.id;
    
    switch (action.status) {
      case "pending_approval":
        return (
          <>
            <Button
              size="sm"
              onClick={() => approveAction(action.id)}
              disabled={isProcessing}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 h-8 px-2.5 text-xs font-medium shadow-none"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              Approuver
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectAction(action.id)}
              disabled={isProcessing}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 h-8 px-2.5 text-xs font-medium shadow-none"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Rejeter
            </Button>
          </>
        );
      
      case "approved":
      case "processing":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => stopAction(action.id)}
            disabled={isProcessing}
            className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 h-8 px-2.5 text-xs font-medium shadow-none"
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5 mr-1" />
            )}
            Stop
          </Button>
        );
      
      case "stopped":
        return (
          <Button
            size="sm"
            onClick={() => updateAction(action.id, "continue")}
            disabled={isProcessing}
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 h-8 px-2.5 text-xs font-medium shadow-none"
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1" />
            )}
            Continuer
          </Button>
        );

      case "rejected":
      case "failed":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => retryAction(action.id)}
            disabled={isProcessing}
            className="bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 h-8 px-2.5 text-xs font-medium shadow-none"
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            Réessayer
          </Button>
        );
      
      case "completed":
        // Aucun bouton pour les actions terminées
        return null;
      
      default:
        return null;
    }
  };

  const pendingCount = getCount("pending_approval");
  const approvedCount = getCount("approved");
  const completedCount = getCount("completed");
  const processingCount = getCount("processing") + getCount("stopped");
  const rejectedCount = getCount("rejected") + getCount("failed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-blue-600" />
            File d&apos;approbation
          </h1>
          <p className="text-gray-500 mt-1">
            Les actions LinkedIn créées par l&apos;agent attendent votre
            approbation avant d&apos;être exécutées.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchActionsAndStats()}
          disabled={isRefreshing}
          className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow-md transition-all"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${
              isRefreshing ? "animate-spin text-blue-600" : "text-gray-600"
            }`}
          />
          {isRefreshing ? "Chargement..." : "Rafraîchir"}
        </Button>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* En attente */}
        <Card
          className={`border-0 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-200/80 dark:to-amber-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === "pending_approval" ? "ring-2 ring-yellow-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus("pending_approval")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#92400e' }}>
                En attente
              </p>
              <p className="text-xl font-bold" style={{ color: '#78350f' }}>
                {pendingCount}
              </p>
            </div>
            <Clock className="w-7 h-7" style={{ color: '#ca8a04' }} />
          </CardContent>
        </Card>

        {/* Approuvées = VERT */}
        <Card
          className={`border-0 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-200/80 dark:to-emerald-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === "approved" ? "ring-2 ring-green-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus("approved")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#166534' }}>
                Approuvées
              </p>
              <p className="text-xl font-bold" style={{ color: '#14532d' }}>
                {approvedCount}
              </p>
            </div>
            <Check className="w-7 h-7" style={{ color: '#16a34a' }} />
          </CardContent>
        </Card>

        {/* En cours = ORANGE */}
        <Card
          className={`border-0 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-200/80 dark:to-amber-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === "processing_stopped" ? "ring-2 ring-orange-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus("processing_stopped")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#9a3412' }}>
                En cours
              </p>
              <p className="text-xl font-bold" style={{ color: '#7c2d12' }}>
                {processingCount}
              </p>
            </div>
            <Loader2 className="w-7 h-7" style={{ color: '#ea580c' }} />
          </CardContent>
        </Card>

        {/* Terminées = BLEU (cohérent avec campaigns) */}
        <Card
          className={`border-0 bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-200/80 dark:to-sky-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === "completed" ? "ring-2 ring-blue-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus("completed")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#1d4ed8' }}>
                Terminées
              </p>
              <p className="text-xl font-bold" style={{ color: '#1e40af' }}>
                {completedCount}
              </p>
            </div>
            <CheckCircle className="w-7 h-7" style={{ color: '#2563eb' }} />
          </CardContent>
        </Card>

        {/* Rejetées / échouées = ROUGE */}
        <Card
          className={`border-0 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-200/80 dark:to-rose-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === "rejected_failed" ? "ring-2 ring-red-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus("rejected_failed")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#991b1b' }}>
                Rejetées / échouées
              </p>
              <p className="text-xl font-bold" style={{ color: '#7f1d1d' }}>
                {rejectedCount}
              </p>
            </div>
            <X className="w-7 h-7" style={{ color: '#dc2626' }} />
          </CardContent>
        </Card>

        {/* Total = VIOLET */}
        <Card
          className={`border-0 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-200/80 dark:to-violet-200/80 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] rounded-xl ${
            selectedStatus === null ? "ring-2 ring-purple-500 ring-offset-2 shadow-md" : "shadow-sm"
          }`}
          onClick={() => filterByStatus(null)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#7e22ce' }}>
                Total
              </p>
              <p className="text-xl font-bold" style={{ color: '#6b21a8' }}>
                {totalToday}
              </p>
            </div>
            <AlertCircle className="w-7 h-7" style={{ color: '#a855f7' }} />
          </CardContent>
        </Card>
      </div>

      {/* Liste des actions */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            {selectedStatus === "pending_approval" && "Actions en attente d'approbation"}
            {selectedStatus === "approved" && "Actions approuvées"}
            {selectedStatus === "processing_stopped" && "Actions en cours"}
            {selectedStatus === "completed" && "Actions terminées"}
            {selectedStatus === "rejected_failed" && "Actions rejetées / échouées"}
            {selectedStatus === null && "Toutes les actions"}
            {selectedStatus === "pending_approval" && pendingCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                {pendingCount}
              </Badge>
            )}
            {selectedStatus === "approved" && approvedCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-800"
              >
                {approvedCount}
              </Badge>
            )}
            {selectedStatus === "processing_stopped" && processingCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800"
              >
                {processingCount}
              </Badge>
            )}
            {selectedStatus === "completed" && completedCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {completedCount}
              </Badge>
            )}
            {selectedStatus === "rejected_failed" && rejectedCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-800"
              >
                {rejectedCount}
              </Badge>
            )}
            {selectedStatus === null && actions.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800"
              >
                {actions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p className="text-base font-medium">
                {selectedStatus === null 
                  ? "Aucune action" 
                  : selectedStatus === "pending_approval"
                    ? "Aucune action en attente"
                    : selectedStatus === "approved"
                      ? "Aucune action approuvée"
                      : selectedStatus === "processing_stopped"
                        ? "Aucune action en cours"
                        : selectedStatus === "completed"
                          ? "Aucune action terminée"
                          : selectedStatus === "rejected_failed"
                            ? "Aucune action rejetée ou échouée"
                            : "Aucune action dans cette catégorie"}
              </p>
              <p className="text-xs mt-1">
                {selectedStatus === null 
                  ? "Les actions créées par l'agent apparaîtront ici."
                  : "Cliquez sur une autre carte pour voir les actions."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
                  whileHover={{ scale: 1.005, y: -2 }}
                  className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-100/60 hover:shadow-lg hover:border-purple-300 transition-all duration-300 cursor-default"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2.5 rounded-xl border-0 shadow-sm ${getActionBadgeColor(
                        action.status
                      )}`}
                    >
                      <div className={`w-5 h-5 ${getStatusIconColor(action.status)}`}>
                        {getActionIcon(action.action_type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {getActionLabel(action.action_type)}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 border-gray-200/60 text-gray-400 font-mono"
                        >
                          {action.id}
                        </Badge>
                        {getStatusBadge(action.status)}
                        {user?.role === "admin" && action.owner_name && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200"
                          >
                            {action.owner_name}
                          </Badge>
                        )}
                      </div>

                      {action.target_name && (
                        <p className="text-sm font-medium text-gray-700">
                          {action.target_name}
                        </p>
                      )}

                      {action.target_url && (
                        <a
                          href={action.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          {action.action_type === "search_and_message"
                            ? "Voir la liste des prospects"
                            : action.action_type === "search_and_connection"
                            ? "Voir la liste des connexions"
                            : `${action.target_url.substring(0, 60)}...`}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {action.action_type === "search_and_message" && (() => {
                        const p = typeof action.payload === "string" ? (() => { try { return JSON.parse(action.payload); } catch { return null; } })() : action.payload;
                        const msg = p?.message_template as string | undefined;
                        if (!msg) return null;
                        const isExpanded = expandedMessageId === action.id;
                        return (
                          <div className="mt-2">
                            <div className={`text-xs text-gray-700 bg-purple-50 border border-purple-100 rounded-lg p-3 leading-relaxed ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}>
                              {msg}
                            </div>
                            <button
                              onClick={() => setExpandedMessageId(isExpanded ? null : action.id)}
                              className="mt-1 flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-medium"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? "Réduire" : "Voir le message complet"}
                            </button>
                          </div>
                        );
                      })()}

                      {action.action_type !== "search_and_message" && action.action_type !== "search_and_connection" && formatPayload(action) && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {formatPayload(action)}
                        </p>
                      )}


                      <p className="text-[11px] text-gray-300 mt-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(
                          action.created_at
                        ).toLocaleString("fr-FR")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {renderActionButtons(action)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">
                Comment ça marche ?
              </h4>
              <p className="text-sm text-blue-800 mt-1 space-y-1">
                <span className="block">
                  1. L&apos;agent crée une action (recherche, connexion, message) qui apparaît ici en attente d&apos;approbation.
                </span>
                <span className="block">
                  2. Vous pouvez approuver ou rejeter chaque action, ainsi que la réessayer ou l&apos;arrêter.
                </span>
                <span className="block">
                  3. Les actions approuvées sont exécutées automatiquement par l&apos;extension Chrome, puis passent au statut « terminées ».
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
