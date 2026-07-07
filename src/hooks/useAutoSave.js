import { useEffect, useRef, useState } from 'react'
import { updateFile } from '../lib/drive.js'
import { cachePage } from '../lib/cache.js'
import { AUTOSAVE_DEBOUNCE_MS as SAVE_DEBOUNCE_MS } from '../lib/constants.js'

/**
 * Salva automaticamente o conteúdo da página no Drive após debounce.
 *
 * @param {string|null} fileId — ID do arquivo no Drive
 * @param {Object|null} data   — dados a salvar
 * @param {boolean} enabled    — se false, não salva (ex: durante carregamento)
 * @returns {{ saving, lastSaved, error }}
 */
export function useAutoSave(fileId, data, enabled = true) {
  const [saving, setSaving]       = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError]         = useState(null)
  const timerRef = useRef(null)
  const dataRef  = useRef(data)

  // Mantém ref sempre atualizada (evita closure stale)
  useEffect(() => {
    dataRef.current = data
  })

  useEffect(() => {
    if (!enabled || !fileId || !data) return

    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaving(true)
      setError(null)

      try {
        const payload = {
          ...dataRef.current,
          updatedAt: new Date().toISOString(),
        }
        await updateFile(fileId, payload)
        await cachePage(fileId, payload)
        setLastSaved(new Date())
      } catch (err) {
        console.error('[AutoSave] Erro ao salvar:', err)
        setError('Falha ao salvar. Verifique sua conexão.')
      } finally {
        setSaving(false)
      }
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [fileId, data, enabled])

  return { saving, lastSaved, error }
}
