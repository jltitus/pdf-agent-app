# MFP Publication Agent Routes

## Pages

- `/login` — user login
- `/dashboard` — authenticated landing page
- `/chat` — AI publication chat
- `/publications` — publication library
- `/help` — help and testing instructions
- `/report-issue` — issue reporting
- `/request-access` — request access form
- `/update-password` — password setup/reset
- `/admin` — admin dashboard

## API Routes

- `/api/chat` — handles document-grounded AI answers
- `/api/access-requests` — creates and lists access requests
- `/api/approve-access-request` — approves users and sends setup email
- `/api/send-user-invite` — direct admin invite
- `/api/resend-user-invite` — resend setup link
- `/api/process-document` — processes uploaded PDFs
- `/api/view-source` — opens source PDFs
- `/api/feedback` — saves chat feedback
- `/api/send-issue-notification` — emails issue notifications
- `/api/trusted-answers` — manages trusted answers
- `/admin/feedback` — detailed admin feedback review
- `/admin/issues` — detailed admin issue review
- `/admin/enhancements` — admin enhancement request tracking
- `/api/admin-notes` — creates and retrieves admin notes/comments
- `/api/enhancement-requests` — creates, lists, updates, and tracks enhancement requests