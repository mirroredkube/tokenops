import CollapsibleSidebar from '../components/CollapsibleSidebar'
import { ToastProvider } from '../components/Toast'
import AuthErrorHandler from '../components/AuthErrorHandler'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthErrorHandler>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <CollapsibleSidebar />
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </AuthErrorHandler>
    </ToastProvider>
  )
}