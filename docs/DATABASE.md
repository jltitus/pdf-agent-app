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