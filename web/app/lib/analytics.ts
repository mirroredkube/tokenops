// Analytics utility for tracking user actions
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
}

class Analytics {
  private events: AnalyticsEvent[] = []

  // Track user actions
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now()
    }

    this.events.push(analyticsEvent)
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', analyticsEvent)
    }

    // In production, you would send this to your analytics service
    // Example: Google Analytics, Mixpanel, etc.
    this.sendToAnalyticsService(analyticsEvent)
  }

  private sendToAnalyticsService(event: AnalyticsEvent) {
    // TODO: Implement actual analytics service integration
    // For now, we just log to console
    if (process.env.NODE_ENV === 'production') {
      console.log('📊 Production Analytics:', event)
    }
  }

  // Get all tracked events (for debugging)
  getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  // Clear events (for testing)
  clearEvents() {
    this.events = []
  }
}

// Singleton instance
export const analytics = new Analytics()

// Predefined event types
export const AnalyticsEvents = {
  // Asset Management
  ASSET_CREATED: 'asset_created',
  ASSET_ACTIVATED: 'asset_activated',
  ASSET_PAUSED: 'asset_paused',
  ASSET_RETIRED: 'asset_retired',
  ASSET_VIEWED: 'asset_viewed',
  ASSET_COPIED: 'asset_copied',

  // Navigation
  PAGE_VIEWED: 'page_viewed',
  NAVIGATION_CLICKED: 'navigation_clicked',

  // User Actions
  COPY_BUTTON_CLICKED: 'copy_button_clicked',
  FILTER_APPLIED: 'filter_applied',
  SEARCH_PERFORMED: 'search_performed',

  // Form Actions
  FORM_STARTED: 'form_started',
  FORM_COMPLETED: 'form_completed',
  FORM_ERROR: 'form_error',

  // UI Interactions
  DROPDOWN_OPENED: 'dropdown_opened',
  ACCORDION_TOGGLED: 'accordion_toggled',
  CONFIRMATION_DIALOG_OPENED: 'confirmation_dialog_opened',
  CONFIRMATION_DIALOG_CONFIRMED: 'confirmation_dialog_confirmed',
  CONFIRMATION_DIALOG_CANCELLED: 'confirmation_dialog_cancelled'
} as const

// Helper functions for common tracking patterns
export const trackAssetAction = (action: string, assetId: string, properties?: Record<string, any>) => {
  analytics.track(action, {
    asset_id: assetId,
    ...properties
  })
}

export const trackPageView = (page: string, properties?: Record<string, any>) => {
  analytics.track(AnalyticsEvents.PAGE_VIEWED, {
    page,
    ...properties
  })
}

export const trackCopyAction = (type: string, value: string) => {
  analytics.track(AnalyticsEvents.COPY_BUTTON_CLICKED, {
    copy_type: type,
    value_length: value.length,
    // Don't log the actual value for privacy
  })
}
