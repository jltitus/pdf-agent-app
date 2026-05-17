# Supabase Tables

## profiles
- id
- full_name
- role
- is_active

## access_requests
- email
- status
- approved_at
## admin_notes
- id
- target_type
- target_id
- note
- created_by
- created_at

Stores admin notes/comments connected to feedback, issue reports, and enhancement requests.

## enhancement_requests
- id
- title
- description
- status
- source_type
- source_id
- created_by
- created_at
- updated_at
- resolved_at

Tracks enhancement candidates and admin-created improvement requests.

## issue_reports
- status values include:
  - new
  - reviewed
  - resolved
  - enhancement_candidate

  ### Additional User Activity Fields

The `profiles` table includes activity tracking fields used for admin analytics and engagement monitoring.

| Column | Type | Purpose |
|---|---|---|
| `last_activity_at` | timestamptz | Most recent tracked user activity |
| `last_login_at` | timestamptz | Most recent successful login |
| `last_chat_at` | timestamptz | Most recent chat question submitted |
| `total_questions_asked` | integer | Running count of user questions |

### Activity Tracking RPC

Function:

```sql
track_profile_activity(p_activity_type text)

## documents — Processing State Tracking

The `documents` table includes PDF processing reliability fields used by Phase 5.

| Column | Type | Purpose |
|---|---|---|
| `processing_status` | text | Tracks processing lifecycle: `pending`, `validating`, `processing`, `processed`, `failed`, `encrypted`, `invalid_pdf` |
| `processing_error` | text | Stores the latest processing failure message for admin review |
| `processing_progress` | integer | Stores processing progress from 0–100 |
| `processing_started_at` | timestamptz | Timestamp when processing began |
| `processing_completed_at` | timestamptz | Timestamp when processing finished or failed |
| `processing_attempts` | integer | Number of processing attempts or retries |
| `last_processed_page` | integer | Last successfully processed page number |
| `is_encrypted` | boolean | Indicates whether the PDF was detected as encrypted/password protected |
| `file_size_bytes` | bigint | Uploaded PDF file size in bytes |

# Release Management Tables

## releases

Tracks application release versions and lifecycle.

### Key fields
- `id`
- `version`
- `title`
- `description`
- `status`
- `planned_release_date`
- `deployed_at`
- `created_by`
- `created_at`
- `updated_at`

### Status values
- planned
- development
- qa
- production
- archived

---

## release_items

Associates enhancements and issue reports to releases.

### Key fields
- `id`
- `release_id`
- `enhancement_request_id`
- `issue_report_id`
- `item_type`

---

## deployment_history

Tracks deployment events and deployment metadata.

### Key fields
- `id`
- `release_id`
- `environment`
- `deployment_notes`
- `deployed_by`
- `deployed_at`

### Environment values
- production
- preview
- local

---

## deployment_smoke_tests

Tracks post-deployment verification and smoke testing.

### Key fields
- `id`
- `deployment_id`
- `route_path`
- `test_status`
- `notes`
- `tested_by`
- `tested_at`

### Status values
- pending
- pass
- fail
- blocked

## enhancement_requests

### New fields

| Field | Type | Purpose |
|---|---|---|
| `is_public` | boolean | Controls whether enhancement appears on public roadmap |

### Public Roadmap Rules
Only enhancements where:
- `is_public = true`

are exposed through:
- `/roadmap`
- `/api/public-roadmap`

# Phase 9 Database Additions

## `profiles` table additions

Additional profile-related fields:

| Column | Type | Purpose |
|---|---|---|
| city | text | User city |
| county | text | User county |
| state | text | User state |
| mfp_affiliation | text | MFP organization/affiliation |
| specialties | text[] | User specialties/interests |
| website_url | text | External website |
| social_url | text | Social profile URL |
| profile_url | text | Additional profile link |
| avatar_url | text | Public avatar image URL |
| bio | text | User biography |
| is_profile_public | boolean | Community visibility |
| last_activity_at | timestamptz | Last activity timestamp |
| last_login_at | timestamptz | Last login timestamp |
| last_chat_at | timestamptz | Last chat timestamp |
| total_questions_asked | integer | Activity metric |

---

## `favorite_publications`

Stores user-saved publications.

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| document_id | uuid |
| created_at | timestamptz |

Relationships:
- `user_id → profiles.id`
- `document_id → documents.id`

---

## `saved_chats`

Stores user-saved chat answers.

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| chat_history_id | uuid nullable |
| question | text |
| answer | text |
| category | text |
| answer_mode | text |
| notes | text nullable |
| created_at | timestamptz |

Relationships:
- `user_id → profiles.id`

---

## Storage

### `profile-avatars`
Public Supabase Storage bucket for user avatars.

Security:
- Upload/update/delete restricted to authenticated owner
- Public read access enabled