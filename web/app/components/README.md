# Token Issuance UI Components

This directory contains the UI components for the token issuance flow in the TokenOps platform.

## Components

### TokenIssuanceFlow
The main component that handles the complete token issuance process. It provides a multi-step wizard interface:

1. **Ledger Selection**: Choose the target blockchain (XRPL, Hedera, Ethereum)
2. **Trustline Setup**: For XRPL, establish trust between holder and issuer
3. **Token Issuance**: Issue tokens with metadata
4. **Success**: Display transaction results and explorer links

### FormField
A reusable form field component that provides consistent styling and validation support.

### TransactionResult
Displays transaction hashes with explorer links in a consistent format.

### TokenDashboard
Shows token issuance statistics and recent activity on the main dashboard.

### ServiceHealthCard
Displays service health information in a clean, readable format with status indicators, uptime, memory usage, and process details.

### XrplStatusCard
Shows XRPL network status including connection state, ledger information, network fees, and peer count in an organized dashboard format.

## User Flow

1. **Navigate to Issuance**: User clicks "Issue Token" in the sidebar
2. **Select Ledger**: User chooses their target blockchain platform
3. **Setup Trustline** (XRPL only): User provides holder credentials and trust limit
4. **Issue Token**: User enters token details and metadata
5. **View Results**: User sees transaction hashes and can view on blockchain explorer

## API Integration

The components integrate with the following API endpoints:

- `POST /opt-in/check` - Check Opt-In status for XRPL
- `POST /opt-in/setup` - Setup Opt-In for XRPL
- `POST /tokens/issue` - Issue tokens on the selected ledger
- `GET /registry/tokens` - Get token records and statistics

## Features

- **Ledger Agnostic**: Supports multiple blockchain platforms
- **Multi-step Flow**: Guided process with progress indicator
- **Error Handling**: Comprehensive error display and recovery
- **Transaction Tracking**: Links to blockchain explorers
- **Metadata Support**: JSON metadata storage with validation
- **Responsive Design**: Works on desktop and mobile devices

## Usage

```tsx
import TokenIssuanceFlow from './components/TokenIssuanceFlow'

export default function IssuancePage() {
  return (
    <div>
      <h1>Token Issuance</h1>
      <TokenIssuanceFlow />
    </div>
  )
}
```

## Styling

All components use Tailwind CSS for styling and are designed to match the existing application theme. The components include:

- Progress indicators
- Form validation
- Loading states
- Error messages
- Success confirmations
- Responsive layouts
