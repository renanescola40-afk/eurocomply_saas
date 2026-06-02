export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  onboarding_completed: boolean | null
  preferred_language: string | null
  created_at: string | null
  updated_at: string | null
}

type Workspace = {
  id: string
  name: string
  slug: string
  country: string | null
  industry: string | null
  company_size: string | null
  website: string | null
  logo_url: string | null
  brand_color: string | null
  readiness_score: number | null
  plan: string | null
  created_by: string
  created_at: string | null
  updated_at: string | null
}

type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  email: string | null
  role: string | null
  status: string | null
  invited_by: string | null
  created_at: string | null
  updated_at: string | null
}

type AITool = {
  id: string
  workspace_id: string
  owner_user_id: string | null
  name: string
  vendor: string | null
  department: string | null
  purpose: string | null
  risk_level: string | null
  status: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
}

type Assessment = {
  id: string
  workspace_id: string
  user_id: string | null
  title: string | null
  status: string | null
  risk_score: number | null
  risk_level: string | null
  recommendations: Json | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

type ComplianceDocument = {
  id: string
  workspace_id: string
  user_id: string | null
  title: string
  document_type: string
  status: string | null
  language: string | null
  content: Json | null
  created_at: string | null
  updated_at: string | null
}

type MonitoringPreference = {
  id: string
  workspace_id: string
  user_id: string
  email: string
  regulatory_change_alerts: boolean | null
  monthly_review_reminders: boolean | null
  low_score_alerts: boolean | null
  created_at: string | null
  updated_at: string | null
}

type AuditLog = {
  id: string
  workspace_id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
}

type Subscription = {
  id: string
  workspace_id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string
  status: string | null
  billing_interval: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  created_at: string | null
  updated_at: string | null
}

type Payment = {
  id: string
  workspace_id: string
  user_id: string
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  amount: number
  currency: string | null
  status: string | null
  payment_method: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
}

type RegulatoryUpdate = {
  id: string
  title: string
  summary: string | null
  severity: string | null
  source_url: string | null
  published_at: string
  created_at: string | null
  updated_at: string | null
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: TableDefinition<Profile, Partial<Profile> & { id: string }, Partial<Profile>>
      workspaces: TableDefinition<Workspace, Partial<Workspace> & { name: string; slug: string; created_by: string }, Partial<Workspace>>
      workspace_members: TableDefinition<WorkspaceMember, Partial<WorkspaceMember> & { workspace_id: string; user_id: string }, Partial<WorkspaceMember>>
      ai_tools: TableDefinition<AITool, Partial<AITool> & { workspace_id: string; name: string }, Partial<AITool>>
      ai_assessments: TableDefinition<Assessment, Partial<Assessment> & { workspace_id: string }, Partial<Assessment>>
      compliance_documents: TableDefinition<ComplianceDocument, Partial<ComplianceDocument> & { workspace_id: string; title: string; document_type: string }, Partial<ComplianceDocument>>
      monitoring_preferences: TableDefinition<MonitoringPreference, Partial<MonitoringPreference> & { workspace_id: string; user_id: string; email: string }, Partial<MonitoringPreference>>
      audit_logs: TableDefinition<AuditLog, Partial<AuditLog> & { workspace_id: string; action: string }, Partial<AuditLog>>
      subscriptions: TableDefinition<Subscription, Partial<Subscription> & { workspace_id: string; user_id: string; plan: string }, Partial<Subscription>>
      payments: TableDefinition<Payment, Partial<Payment> & { workspace_id: string; user_id: string; amount: number }, Partial<Payment>>
      regulatory_updates: TableDefinition<RegulatoryUpdate, Partial<RegulatoryUpdate> & { title: string; published_at: string }, Partial<RegulatoryUpdate>>
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      can_manage_workspace: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      can_use_monitoring: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
