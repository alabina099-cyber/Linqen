export interface LinkedInAction {
  id: number;
  action_type: 'search' | 'visit_profile' | 'send_connection' | 'send_message' | 'search_and_connection' | 'search_and_message' | 'connection_accepted';
  target_url: string | null;
  target_name: string | null;
  payload: Record<string, any>;
  status: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'stopped';
  result: Record<string, any> | null;
  error_message: string | null;
  campaign_id: number | null;
  prospect_id: number | null;
  // Multi-admin SaaS : propriétaire de l'action.
  // - Si role='admin' : c'est l'admin lui-même.
  // - Si role='user'  : on remonte à admin_id pour le cookie LinkedIn.
  user_id: number | null;
  created_at: string;
  executed_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
}

// Session LinkedIn d'un admin, résolue à partir d'une action.
export interface AdminLinkedInSession {
  adminId: number;
  adminName: string;
  cookieValue: string; // li_at en clair (déchiffré juste-en-temps)
}

export interface ActionResult {
  success: boolean;
  profile?: {
    name?: string;
    role?: string;
    company?: string;
    industry?: string;
    location?: string;
    company_size?: string;
  };
  message_sent?: boolean;
  connection_sent?: boolean;
  screenshot?: string;
  error?: string;
  details?: string;
}

export interface WorkerConfig {
  workerId: string;
  pollIntervalMs: number;
  claimTimeoutMs: number;
  maxRetries: number;
  databaseUrl: string;
  linkedinEmail?: string;
  linkedinPassword?: string;
  headless: boolean;
  puppeteerArgs: string[];
}
