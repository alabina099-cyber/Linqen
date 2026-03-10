"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Check, 
  X, 
  Clock, 
  Search, 
  User, 
  MessageSquare, 
  Link as LinkIcon,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink
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
  const [stats, setStats] = useState<ActionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Charger les actions en attente
  const fetchPendingActions = async () => {
    try {
      const response = await fetch('/api/linkedin-actions/approval?status=pending_approval');
      const data = await response.json();
      if (data.success) {
        setActions(data.actions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching pending actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Approuver une action
  const approveAction = async (id: number) => {
    setProcessingId(id);
    try {
      const response = await fetch('/api/linkedin-actions/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      });
      const data = await response.json();
      if (data.success) {
        // Retirer l'action de la liste
        setActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Error approving action:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Rejeter une action
  const rejectAction = async (id: number) => {
    setProcessingId(id);
    try {
      const response = await fetch('/api/linkedin-actions/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject' }),
      });
      const data = await response.json();
      if (data.success) {
        // Retirer l'action de la liste
        setActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Error rejecting action:', error);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingActions();
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchPendingActions, 5000);
    return () => clearInterval(interval);
  }, []);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'search': return <Search className="w-5 h-5 text-blue-600" />;
      case 'visit_profile': return <User className="w-5 h-5 text-amber-600" />;
      case 'send_connection': return <LinkIcon className="w-5 h-5 text-green-600" />;
      case 'send_message': return <MessageSquare className="w-5 h-5 text-purple-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'search': 'Recherche LinkedIn',
      'visit_profile': 'Visiter profil',
      'send_connection': 'Demande de connexion',
      'send_message': 'Envoyer message',
    };
    return labels[type] || type;
  };

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case 'search': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'visit_profile': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'send_connection': return 'bg-green-100 text-green-700 border-green-200';
      case 'send_message': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPendingCount = () => {
    return stats.find(s => s.status === 'pending_approval')?.count || 0;
  };

  const getApprovedCount = () => {
    return stats.find(s => s.status === 'approved')?.count || 0;
  };

  const formatPayload = (action: PendingAction) => {
    const payload = typeof action.payload === 'string' 
      ? JSON.parse(action.payload) 
      : action.payload;
    
    if (action.action_type === 'send_connection' && payload?.note) {
      return `Note: "${payload.note.substring(0, 100)}${payload.note.length > 100 ? '...' : ''}"`;
    }
    if (action.action_type === 'send_message' && payload?.message) {
      return `Message: "${payload.message.substring(0, 100)}${payload.message.length > 100 ? '...' : ''}"`;
    }
    if (action.action_type === 'search' && payload?.keywords) {
      return `Mots-clés: "${payload.keywords}"`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            File d&apos;approbation
          </h2>
          <p className="text-gray-500 mt-1">
            Les actions LinkedIn créées par l&apos;agent attendent votre approbation avant d&apos;être exécutées
          </p>
        </div>
        <Button variant="outline" onClick={fetchPendingActions} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">En attente d&apos;approbation</p>
              <p className="text-2xl font-bold text-orange-700">{getPendingCount()}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Approuvées (en attente d&apos;exécution)</p>
              <p className="text-2xl font-bold text-green-700">{getApprovedCount()}</p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total actions aujourd&apos;hui</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.reduce((acc: number, s: ActionStats) => acc + parseInt(s.count.toString()), 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Liste des actions en attente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Actions en attente d&apos;approbation
            {getPendingCount() > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {getPendingCount()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Aucune action en attente</p>
              <p className="text-sm">Les actions créées par l&apos;agent apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getActionBadgeColor(action.action_type)}`}>
                      {getActionIcon(action.action_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {getActionLabel(action.action_type)}
                        </h4>
                        <Badge variant="outline" className="text-xs">
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
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {formatPayload(action)}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        Créée le {new Date(action.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveAction(action.id)}
                        disabled={processingId === action.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === action.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectAction(action.id)}
                        disabled={processingId === action.id}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
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
              <h4 className="font-medium text-blue-900">Comment ça marche ?</h4>
              <p className="text-sm text-blue-700 mt-1">
                1. L&apos;agent crée une action (recherche, connexion, message)<br />
                2. L&apos;action apparaît ici en attente d&apos;approbation<br />
                3. Vous approuvez ou rejetez chaque action<br />
                4. Les actions approuvées sont exécutées automatiquement par l&apos;extension Chrome<br />
                5. Les actions rejetées sont supprimées
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
