'use client'

import { useEffect } from 'react'

export default function MarkMessagesRead({ clientId }: { clientId: string }) {
  useEffect(() => {
    fetch('/api/messages/read', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ client_id: clientId }),
    }).catch(() => {})
  }, [clientId])

  return null
}
