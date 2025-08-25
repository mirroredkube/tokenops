interface TransactionResultProps {
  title: string
  txHash: string
  explorer?: string
  className?: string
}

export default function TransactionResult({ 
  title, 
  txHash, 
  explorer, 
  className = '' 
}: TransactionResultProps) {
  return (
    <div className={className}>
      <span className="font-medium">{title}:</span>
      <div className="flex items-center gap-2 mt-1">
        <code className="bg-white px-2 py-1 rounded text-sm font-mono break-all">
          {txHash}
        </code>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm whitespace-nowrap"
          >
            View on Explorer →
          </a>
        )}
      </div>
    </div>
  )
}
