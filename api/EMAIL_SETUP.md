# Email Setup for User Invitations

This guide explains how to set up Gmail SMTP to send user invitation emails.

## Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (custom name)"
   - Enter "TokenOps" as the app name
   - Copy the generated 16-character password

## Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration (Gmail SMTP)
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASSWORD="your-16-character-app-password"
```

## Testing Email Connection

The email service will automatically test the connection on startup. Check the API server logs for:

```
Email service connection verified successfully
```

## Email Templates

The system sends HTML emails with:
- Professional styling with emerald green branding
- Organization name and inviter information
- Role assignment details
- Invitation URL with expiration date
- Fallback text version for email clients

## Troubleshooting

### "Invalid login" error
- Ensure you're using an App Password, not your regular Gmail password
- Verify 2FA is enabled on your Gmail account

### "Less secure app access" error
- App Passwords are the recommended approach
- Don't enable "less secure app access" as it's deprecated

### Connection timeout
- Check your network connection
- Verify Gmail SMTP settings (smtp.gmail.com:587)

## Security Notes

- App Passwords are more secure than regular passwords
- Each app password is unique and can be revoked independently
- Never commit app passwords to version control
- Use environment variables for all sensitive configuration
