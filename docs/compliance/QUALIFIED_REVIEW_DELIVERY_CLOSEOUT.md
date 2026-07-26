# Qualified Review Delivery and Closeout

This package operationalizes the final human-review boundary without pretending that any review has occurred.

## Capabilities

1. deterministic reminder stages at 14, 7 and 1 day before due date;
2. overdue and expiry detection;
3. persistent delivery deduplication;
4. hashed recipient identity in delivery records;
5. protected internal reminder endpoint;
6. current-submission validity checks;
7. exact-SHA 51-point closeout evaluation;
8. evidence-digest promotion manifest;
9. backend-only atomic campaign promotion;
10. append-only promotion event and retained promotion record.

## Internal job

`GET|POST /api/internal/qualified-review-reminders`

The endpoint requires the internal cron credential and pre-authentication rate limiting. Delivery errors are sanitized and reported through the observability boundary.

## Promotion

`POST /api/ai-governance/qualified-reviews/promote`

Promotion requires authentication, the current organization, `manage_ai_governance`, trusted origin, distributed rate limiting, bounded input and all eight accepted non-expired review packages totaling exactly 51 points.

## Truth boundary

Before genuine qualified reviews are submitted and independently accepted, the result remains `HUMAN_REVIEW_REQUIRED`. A promotion manifest records that the configured review packages passed the product's technical acceptance controls for one exact commit SHA. It is not certification, legal advice, regulator approval, notified-body assessment or a guarantee of compliance.

## Rollback

Disable the reminder schedule, revert the application files, and roll back migration `20260725102000_qualified_review_delivery_closeout.sql` before any production delivery records or promotion records are relied upon.
