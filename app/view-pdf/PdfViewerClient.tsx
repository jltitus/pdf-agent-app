'use client'

import { useEffect, useState } from 'react'
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { createClient } from '../../lib/supabase/client'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

interface Props {
  filename: string
  initialPage: number
}

export default function PdfViewerClient({ filename, initialPage }: Props) {
  const defaultLayout = defaultLayoutPlugin()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    setPdfUrl(`/api/pdf-proxy?file=${encodeURIComponent(filename)}`)

    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return
      fetch('/api/track-document-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename }),
      }).catch(() => {})
    })
  }, [filename])

  if (!pdfUrl) return null

  return (
    <div style={{ height: '100dvh' }}>
      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayout]}
          defaultScale={SpecialZoomLevel.PageWidth}
          initialPage={initialPage}
        />
      </Worker>
    </div>
  )
}
