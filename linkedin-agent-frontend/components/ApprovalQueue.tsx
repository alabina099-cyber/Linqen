"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckSquare,
  X,
  Clock,
  Search,
  User,
  MessageSquare,
  Link as LinkIcon,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PendingAction {
  id: number;
  action_type: string;
  target_url: string;
  target_name: string | null;
  payload: any;
  status: string;
  created_at: string;
}

interface ActionStats {
  status: string;
  count: number;
}

export default function ApprovalQueue() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [allActions, setAllActions] = useState<PendingAction[]>([]);
  const [stats, setStats] = useState<ActionStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // --- API helpers ---

  const fetchActionsAndStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      // Fetch all actions for stats
      const allResponse = await fetch("/api/linkedin-actions/approval");
      const allData = await allResponse.json();
      
      // Fetch pending actions for the list
      const pendingResponse = await fetch(
        "/api/linkedin-actions/approval?status=pending_approval"
      );
      const pendingData = await pendingResponse.json();
      
      if (allData.success) {
        setAllActions(allData.actions || []);
        setStats(allData.stats || []);
      }
      if (pendingData.success) {
        setActions(pendingData.actions || []);
      }
    } catch (error) {
      console.error("Error fetching actions:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const filterByStatus = (status: string | null) => {
    setSelectedStatus(status);
    if (!status) {
      // Total - show all actions ordered chronologically
      const sorted = [...allActions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setActions(sorted);
      return;
    }
    if (status === "rejected_failed") {
      setActions(allActions.filter(a => a.status === "rejected" || a.status === "failed"));
      return;
    }
    setActions(allActions.filter(a => a.status === status));
  };

  const updateAction = async (
    id: number,
    action: "approve" | "reject" | "retry"
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
        await fetchActionsAndStats();
      }
    } catch (error) {
      console.error(`Error trying to ${action} action:`, error);
    } finally {
      setProcessingId(null);
    }
  };

  const approveAction = (id: number) => updateAction(id, "approve");
  const rejectAction = (id: number) => updateAction(id, "reject");
  const retryAction = (id: number) => updateAction(id, "retry");

  useEffect(() => {
    fetchActionsAndStats();
    // Auto-refresh removed - manual refresh only
  }, [fetchActionsAndStats]);

  // --- Helpers UI ---

  const getActionIcon = (type: string) => {
    switch (type) {
      case "search":
        return <Search className="w-5 h-5 text-blue-600" />;
      case "visit_profile":
        return <User className="w-5 h-5 text-amber-600" />;
      case "send_connection":
        return <LinkIcon className="w-5 h-5 text-green-600" />;
      case "send_message":
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      search: "Recherche LinkedIn",
      visit_profile: "Visiter profil",
      send_connection: "Demande de connexion",
      send_message: "Envoyer message",
    };
    return labels[type] || type;
  };

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case "search":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "visit_profile":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "send_connection":
        return "bg-green-100 text-green-700 border-green-200";
      case "send_message":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getCount = (status: string) =>
    stats.find((s) => s.status === status)?.count || 0;

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
    return "";
  };

  const totalToday = stats.reduce(
    (acc: number, s: ActionStats) => acc + Number(s.count || 0),
    0
  );

  const pendingCount = getCount("pending_approval");
  const approvedCount = getCount("approved");
  const completedCount = getCount("completed");
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
          onClick={fetchActionsAndStats}
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* En attente */}
        <Card 
          className={`border-yellow-200 bg-yellow-50 cursor-pointer transition-all hover:shadow-md ${
            selectedStatus === "pending_approval" ? "ring-2 ring-yellow-400 shadow-md" : ""
          }`}
          onClick={() => filterByStatus("pending_approval")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 font-medium">
                En attente d&apos;approbation
              </p>
              <p className="text-xl font-bold text-yellow-800">
                {pendingCount}
              </p>
            </div>
            <Clock className="w-7 h-7 text-yellow-500" />
          </CardContent>
        </Card>

        {/* Approuvées = BLEU */}
        <Card 
          className={`border-blue-200 bg-blue-50 cursor-pointer transition-all hover:shadow-md ${
            selectedStatus === "approved" ? "ring-2 ring-blue-400 shadow-md" : ""
          }`}
          onClick={() => filterByStatus("approved")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-medium">
                Approuvées
              </p>
              <p className="text-xl font-bold text-blue-800">
                {approvedCount}
              </p>
            </div>
            <Check className="w-7 h-7 text-blue-500" />
          </CardContent>
        </Card>

        {/* Terminées = VERT avec icône checkbox */}
        <Card 
          className={`border-green-200 bg-green-50 cursor-pointer transition-all hover:shadow-md ${
            selectedStatus === "completed" ? "ring-2 ring-green-400 shadow-md" : ""
          }`}
          onClick={() => filterByStatus("completed")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-medium">
                Actions terminées
              </p>
              <p className="text-xl font-bold text-green-800">
                {completedCount}
              </p>
            </div>
            <CheckSquare className="w-7 h-7 text-green-500" />
          </CardContent>
        </Card>

        {/* Rejetées / échouées = ROUGE */}
        <Card 
          className={`border-red-200 bg-red-50 cursor-pointer transition-all hover:shadow-md ${
            selectedStatus === "rejected_failed" ? "ring-2 ring-red-400 shadow-md" : ""
          }`}
          onClick={() => filterByStatus("rejected_failed")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-medium">
                Rejetées / échouées
              </p>
              <p className="text-xl font-bold text-red-800">
                {rejectedCount}
              </p>
            </div>
            <X className="w-7 h-7 text-red-500" />
          </CardContent>
        </Card>

        {/* Total = VIOLET */}
        <Card 
          className={`border-purple-200 bg-purple-50 cursor-pointer transition-all hover:shadow-md ${
            selectedStatus === null ? "ring-2 ring-purple-400 shadow-md" : ""
          }`}
          onClick={() => filterByStatus(null)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-700 font-medium">
                Total actions aujourd&apos;hui
              </p>
              <p className="text-xl font-bold text-purple-800">
                {totalToday}
              </p>
            </div>
            <AlertCircle className="w-7 h-7 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Liste des actions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            {selectedStatus === "pending_approval" && "Actions en attente d'approbation"}
            {selectedStatus === "approved" && "Actions approuvées"}
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
            {selectedStatus === null && totalToday > 0 && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800"
              >
                {totalToday}
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
              {actions.map((action) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg border ${getActionBadgeColor(
                        action.action_type
                      )}`}
                    >
                      {getActionIcon(action.action_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {getActionLabel(action.action_type)}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          #{action.id}
                        </Badge>
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
                          {action.target_url.substring(0, 60)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {formatPayload(action) && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {formatPayload(action)}
                        </p>
                      )}

                      <p className="text-[11px] text-gray-400 mt-2">
                        Créée le{" "}
                        {new Date(
                          action.created_at
                        ).toLocaleString("fr-FR")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveAction(action.id)}
                        disabled={processingId === action.id}
                        className="bg-green-600 hover:bg-green-700 h-8 px-2 text-xs"
                      >
                        {processingId === action.id ? (
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
                        disabled={processingId === action.id}
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Rejeter
                      </Button>
                      {/* Optionnel : bouton Réessayer pour les échouées */}
                      {action.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryAction(action.id)}
                          disabled={processingId === action.id}
                          className="border-purple-200 text-purple-700 hover:bg-purple-50 h-8 px-2 text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">
                Comment ça marche ?
              </h4>
              <p className="text-sm text-blue-800 mt-1 space-y-1">
                <span className="block">
                  1. L&apos;agent crée une action (recherche, connexion,
                  message).
                </span>
                <span className="block">
                  2. L&apos;action apparaît ici en attente d&apos;approbation.
                </span>
                <span className="block">
                  3. Vous approuvez ou rejetez chaque action.
                </span>
                <span className="block">
                  4. Les actions approuvées sont exécutées automatiquement
                  par l&apos;extension Chrome et passent ensuite en
                  « terminées ».
                </span>
                <span className="block">
                  5. Les actions rejetées ou échouées peuvent être
                  réessayées avec le bouton « Réessayer ».
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
