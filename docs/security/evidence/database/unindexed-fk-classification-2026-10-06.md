# Unindexed Foreign Key Classification — 2026-10-06

Source: Supabase Production advisor + pg_stat_user_tables.
Project: tganhbbhfxcpblmgqprg

## Decision rule

- `FUTURE_ONLY`: current estimated rows = 0; no production query/delete pressure justifies an index now.
- `LOW_VOLUME`: current estimated rows = 1–5; retain without new index until workload evidence or scale threshold justifies it.
- No item is classified `INDEX_REQUIRED_NOW` from current production evidence.
- Re-run this classification before material scale expansion or when query plans/latency show FK pressure.

## Summary

- Advisor unindexed FK findings: 111
- FUTURE_ONLY: 111
- LOW_VOLUME: 0
- UNCLASSIFIED: 0

| # | Table | Foreign key | Est. rows | Classification |
|---:|---|---|---:|---|
| 1 | `ai_annex_iv_changes` | `ai_annex_iv_changes_assessed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 2 | `ai_annex_iv_changes` | `ai_annex_iv_changes_reviewed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 3 | `ai_annex_iv_decisions` | `ai_annex_iv_decisions_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 4 | `ai_annex_iv_evidence` | `ai_annex_iv_evidence_organization_id_package_id_fkey` | 0 | FUTURE_ONLY |
| 5 | `ai_annex_iv_evidence` | `ai_annex_iv_evidence_package_section_fk` | 0 | FUTURE_ONLY |
| 6 | `ai_annex_iv_evidence` | `ai_annex_iv_evidence_reviewed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 7 | `ai_annex_iv_evidence` | `ai_annex_iv_evidence_submitted_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 8 | `ai_annex_iv_packages` | `ai_annex_iv_packages_approver_user_id_fkey` | 0 | FUTURE_ONLY |
| 9 | `ai_annex_iv_packages` | `ai_annex_iv_packages_legal_reviewed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 10 | `ai_annex_iv_packages` | `ai_annex_iv_packages_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 11 | `ai_annex_iv_packages` | `ai_annex_iv_packages_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 12 | `ai_annex_iv_sections` | `ai_annex_iv_sections_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 13 | `ai_annex_iv_sections` | `ai_annex_iv_sections_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 14 | `ai_article50_assessments` | `ai_article50_assessments_ai_system_id_fkey` | 0 | FUTURE_ONLY |
| 15 | `ai_article50_assessments` | `ai_article50_assessments_created_by_fkey` | 0 | FUTURE_ONLY |
| 16 | `ai_article50_events` | `ai_article50_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 17 | `ai_article50_events` | `ai_article50_events_assessment_id_fkey` | 0 | FUTURE_ONLY |
| 18 | `ai_article50_events` | `ai_article50_events_assessment_org_fk` | 0 | FUTURE_ONLY |
| 19 | `ai_article50_evidence` | `ai_article50_evidence_assessment_id_fkey` | 0 | FUTURE_ONLY |
| 20 | `ai_article50_evidence` | `ai_article50_evidence_assessment_org_fk` | 0 | FUTURE_ONLY |
| 21 | `ai_article50_evidence` | `ai_article50_evidence_reviewed_by_fkey` | 0 | FUTURE_ONLY |
| 22 | `ai_article50_evidence` | `ai_article50_evidence_submitted_by_fkey` | 0 | FUTURE_ONLY |
| 23 | `ai_literacy_assignments` | `ai_literacy_assignments_assigned_by_fkey` | 0 | FUTURE_ONLY |
| 24 | `ai_literacy_assignments` | `ai_literacy_assignments_assignee_user_id_fkey` | 0 | FUTURE_ONLY |
| 25 | `ai_literacy_assignments` | `ai_literacy_assignments_course_org_fk` | 0 | FUTURE_ONLY |
| 26 | `ai_literacy_assignments` | `ai_literacy_assignments_waiver_approved_by_fkey` | 0 | FUTURE_ONLY |
| 27 | `ai_literacy_courses` | `ai_literacy_courses_created_by_fkey` | 0 | FUTURE_ONLY |
| 28 | `ai_literacy_courses` | `ai_literacy_courses_program_org_fk` | 0 | FUTURE_ONLY |
| 29 | `ai_literacy_evidence` | `ai_literacy_evidence_assignment_org_fk` | 0 | FUTURE_ONLY |
| 30 | `ai_literacy_evidence` | `ai_literacy_evidence_reviewed_by_fkey` | 0 | FUTURE_ONLY |
| 31 | `ai_literacy_evidence` | `ai_literacy_evidence_submitted_by_fkey` | 0 | FUTURE_ONLY |
| 32 | `ai_literacy_programs` | `ai_literacy_programs_created_by_fkey` | 0 | FUTURE_ONLY |
| 33 | `ai_literacy_programs` | `ai_literacy_programs_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 34 | `ai_prohibited_practice_decisions` | `ai_prohibited_practice_decisi_organization_id_review_id_si_fkey` | 0 | FUTURE_ONLY |
| 35 | `ai_prohibited_practice_decisions` | `ai_prohibited_practice_decisions_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 36 | `ai_prohibited_practice_evidence` | `ai_prohibited_practice_evide_organization_id_review_id_si_fkey1` | 0 | FUTURE_ONLY |
| 37 | `ai_prohibited_practice_evidence` | `ai_prohibited_practice_evidence_reviewed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 38 | `ai_prohibited_practice_evidence` | `ai_prohibited_practice_evidence_submitted_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 39 | `ai_prohibited_practice_exception_claims` | `ai_prohibited_practice_exception_cl_legal_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 40 | `ai_prohibited_practice_exception_claims` | `ai_prohibited_practice_exception_claims_approver_user_id_fkey` | 0 | FUTURE_ONLY |
| 41 | `ai_prohibited_practice_exception_claims` | `ai_prohibited_practice_exception_claims_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 42 | `ai_prohibited_practice_reviews` | `ai_prohibited_practice_reviews_approver_user_id_fkey` | 0 | FUTURE_ONLY |
| 43 | `ai_prohibited_practice_reviews` | `ai_prohibited_practice_reviews_legal_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 44 | `ai_prohibited_practice_reviews` | `ai_prohibited_practice_reviews_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 45 | `ai_prohibited_practice_reviews` | `ai_prohibited_practice_reviews_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 46 | `ai_prohibited_practice_signal_assessments` | `ai_prohibited_practice_signal_asses_legal_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 47 | `ai_prohibited_practice_signal_assessments` | `ai_prohibited_practice_signal_assessments_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 48 | `ai_prohibited_practice_signal_assessments` | `ai_prohibited_practice_signal_assessments_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 49 | `ai_qms_audits` | `ai_qms_audits_lead_auditor_user_id_fkey` | 0 | FUTURE_ONLY |
| 50 | `ai_qms_audits` | `ai_qms_audits_reviewed_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 51 | `ai_qms_controls` | `ai_qms_controls_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 52 | `ai_qms_decisions` | `ai_qms_decisions_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 53 | `ai_qms_management_reviews` | `ai_qms_management_reviews_approved_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 54 | `ai_qms_management_reviews` | `ai_qms_management_reviews_chair_user_id_fkey` | 0 | FUTURE_ONLY |
| 55 | `ai_qms_management_reviews` | `ai_qms_management_reviews_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 56 | `ai_qms_nonconformities` | `ai_qms_nonconformities_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 57 | `ai_qms_nonconformities` | `ai_qms_nonconformities_verified_by_user_id_fkey` | 0 | FUTURE_ONLY |
| 58 | `ai_qms_systems` | `ai_qms_systems_approver_user_id_fkey` | 0 | FUTURE_ONLY |
| 59 | `ai_qms_systems` | `ai_qms_systems_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 60 | `ai_qms_systems` | `ai_qms_systems_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 61 | `ai_system_history` | `ai_system_history_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 62 | `audit_integrity_checkpoints` | `audit_integrity_checkpoints_generated_by_fkey` | 0 | FUTURE_ONLY |
| 63 | `enterprise_access_escalation_policies` | `enterprise_access_escalation_policies_updated_by_fkey` | 0 | FUTURE_ONLY |
| 64 | `enterprise_access_export_download_events` | `enterprise_access_export_download_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 65 | `enterprise_access_export_download_events` | `enterprise_access_export_download_events_export_job_id_fkey` | 0 | FUTURE_ONLY |
| 66 | `enterprise_access_export_jobs` | `enterprise_access_export_jobs_requested_by_fkey` | 0 | FUTURE_ONLY |
| 67 | `enterprise_access_operation_events` | `enterprise_access_operation_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 68 | `enterprise_access_operation_items` | `enterprise_access_operation_items_identity_id_fkey` | 0 | FUTURE_ONLY |
| 69 | `enterprise_access_operation_items` | `enterprise_access_operation_items_user_id_fkey` | 0 | FUTURE_ONLY |
| 70 | `enterprise_access_operations` | `enterprise_access_operations_requested_by_fkey` | 0 | FUTURE_ONLY |
| 71 | `enterprise_access_runtime_alerts` | `enterprise_access_runtime_alerts_acknowledged_by_fkey` | 0 | FUTURE_ONLY |
| 72 | `enterprise_access_runtime_alerts` | `enterprise_access_runtime_alerts_resolved_by_fkey` | 0 | FUTURE_ONLY |
| 73 | `enterprise_api_keys` | `enterprise_api_keys_created_by_fkey` | 0 | FUTURE_ONLY |
| 74 | `enterprise_api_keys` | `enterprise_api_keys_revoked_by_fkey` | 0 | FUTURE_ONLY |
| 75 | `enterprise_break_glass_approvals` | `enterprise_break_glass_approvals_request_tenant_fk` | 0 | FUTURE_ONLY |
| 76 | `enterprise_break_glass_events` | `enterprise_break_glass_events_request_tenant_fk` | 0 | FUTURE_ONLY |
| 77 | `enterprise_break_glass_reviews` | `enterprise_break_glass_reviews_request_tenant_fk` | 0 | FUTURE_ONLY |
| 78 | `enterprise_contract_billing_events` | `enterprise_contract_billing_events_organization_id_fkey` | 0 | FUTURE_ONLY |
| 79 | `enterprise_evidence_pack_items` | `enterprise_evidence_pack_items_pack_organization_fkey` | 0 | FUTURE_ONLY |
| 80 | `enterprise_evidence_packs` | `enterprise_evidence_packs_approved_by_fkey` | 0 | FUTURE_ONLY |
| 81 | `enterprise_evidence_packs` | `enterprise_evidence_packs_created_by_fkey` | 0 | FUTURE_ONLY |
| 82 | `enterprise_identity_connections` | `enterprise_identity_connections_created_by_fkey` | 0 | FUTURE_ONLY |
| 83 | `enterprise_identity_connections` | `enterprise_identity_connections_verified_by_fkey` | 0 | FUTURE_ONLY |
| 84 | `enterprise_integration_audit_events` | `enterprise_integration_audit_even_actor_service_account_id_fkey` | 0 | FUTURE_ONLY |
| 85 | `enterprise_integration_audit_events` | `enterprise_integration_audit_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 86 | `enterprise_integration_audit_events` | `enterprise_integration_audit_service_account_tenant_fk` | 0 | FUTURE_ONLY |
| 87 | `enterprise_risk_reviews` | `enterprise_risk_reviews_ai_system_id_fkey` | 0 | FUTURE_ONLY |
| 88 | `enterprise_risk_reviews` | `enterprise_risk_reviews_requested_by_fkey` | 0 | FUTURE_ONLY |
| 89 | `enterprise_risk_reviews` | `enterprise_risk_reviews_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 90 | `enterprise_scim_identities` | `enterprise_scim_identities_user_id_fkey` | 0 | FUTURE_ONLY |
| 91 | `enterprise_scim_tokens` | `enterprise_scim_tokens_created_by_fkey` | 0 | FUTURE_ONLY |
| 92 | `enterprise_seat_contention_events` | `enterprise_seat_contention_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 93 | `enterprise_seat_contention_events` | `enterprise_seat_contention_events_membership_id_fkey` | 0 | FUTURE_ONLY |
| 94 | `enterprise_seat_operations` | `enterprise_seat_operations_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 95 | `enterprise_seat_operations` | `enterprise_seat_operations_membership_id_fkey` | 0 | FUTURE_ONLY |
| 96 | `enterprise_seat_operations` | `enterprise_seat_operations_target_user_id_fkey` | 0 | FUTURE_ONLY |
| 97 | `enterprise_service_accounts` | `enterprise_service_accounts_created_by_fkey` | 0 | FUTURE_ONLY |
| 98 | `enterprise_service_accounts` | `enterprise_service_accounts_revoked_by_fkey` | 0 | FUTURE_ONLY |
| 99 | `enterprise_vendor_due_diligence` | `enterprise_vendor_due_diligence_ai_system_id_fkey` | 0 | FUTURE_ONLY |
| 100 | `enterprise_vendor_due_diligence` | `enterprise_vendor_due_diligence_created_by_fkey` | 0 | FUTURE_ONLY |
| 101 | `enterprise_vendor_due_diligence` | `enterprise_vendor_due_diligence_reviewer_user_id_fkey` | 0 | FUTURE_ONLY |
| 102 | `enterprise_webhook_subscriptions` | `enterprise_webhook_subscriptions_created_by_fkey` | 0 | FUTURE_ONLY |
| 103 | `evidence_item_audit_events` | `evidence_item_audit_events_evidence_item_id_fkey` | 0 | FUTURE_ONLY |
| 104 | `intelligence_calendar_suggestions` | `intelligence_calendar_suggestions_intelligence_item_id_fkey` | 0 | FUTURE_ONLY |
| 105 | `platform_admin_users` | `platform_admin_users_created_by_fkey` | 0 | FUTURE_ONLY |
| 106 | `sales_lead_activities` | `sales_lead_activities_created_by_fkey` | 0 | FUTURE_ONLY |
| 107 | `sales_lead_activity_events` | `sales_lead_activity_events_actor_user_id_fkey` | 0 | FUTURE_ONLY |
| 108 | `sales_lead_notes` | `sales_lead_notes_created_by_fkey` | 0 | FUTURE_ONLY |
| 109 | `sales_leads` | `sales_leads_owner_user_id_fkey` | 0 | FUTURE_ONLY |
| 110 | `sales_leads` | `sales_leads_updated_by_fkey` | 0 | FUTURE_ONLY |
| 111 | `vendor_review_history` | `vendor_review_history_actor_user_id_fkey` | 0 | FUTURE_ONLY |

## Closure

UNINDEXED_FK_TOTAL=111
UNCLASSIFIED_FKS=0
INDEXES_CREATED=0
PERFORMANCE_CLASSIFICATION=PASS
