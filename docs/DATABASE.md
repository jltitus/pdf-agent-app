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