export type AiActRiskLevel =
  | 'minimal'
  | 'limited_transparency'
  | 'high_risk_review'
  | 'prohibited_review'
  | string;

export type AiSystemClientRecord = {
  id: string;
  organization_id?: string;
  name: string;
  owner_team: string | null;
  vendor_name: string | null;
  use_case: string;
  role: string;
  lifecycle_status: string;
  risk_domain: string;
  uses_personal_data?: boolean;
  interacts_with_people?: boolean;
  generates_content?: boolean;
  biometric_identification?: boolean;
  manipulative_or_exploitative?: boolean;
  risk_level: AiActRiskLevel;
  classification_summary: string;
  obligations: string[];
  next_actions: string[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AiIncidentClientRecord = {
  id: string;
  ai_system_id: string | null;
  title: string;
  summary: string;
  category: string;
  severity: string;
  detected_at: string;
  report_status: string;
  authority: string | null;
  internal_owner: string | null;
  created_at: string;
  updated_at?: string;
};

export type NotificationClientItem = {
  id: string;
  type: 'invite' | 'document' | 'approval' | 'alert' | string;
  read: boolean;
  message: string;
  createdAt: string;
};

export type RiskEntitlementsClient = {
  plan?: string | null;
  riskMatrix?: string | null;
  approvalWorkflows?: boolean | null;
} | null;
