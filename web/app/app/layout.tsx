import CollapsibleSidebar from '../components/CollapsibleSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <CollapsibleSidebar />
      <main className="flex-1 p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}