import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { GOOGLE_CLIENT_ID, DRIVE_SCOPE } from '../lib/constants.js'
import { initTokenClient, requestToken, setAccessToken } from '../lib/drive.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [token, setToken]         = useState(null)
  const [gapiReady, setGapiReady] = useState(false)
  const [gisReady, setGisReady]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    function loadGapi() {
      if (!window.gapi) { setTimeout(loadGapi, 200); return }
      window.gapi.load('client', async () => {
        await window.gapi.client.init({})
        await window.gapi.client.load(
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        )
        setGapiReady(true)
      })
    }
    loadGapi()
  }, [])

  useEffect(() => {
    function loadGis() {
      if (!window.google?.accounts?.oauth2) { setTimeout(loadGis, 200); return }

      initTokenClient(
        GOOGLE_CLIENT_ID,
        DRIVE_SCOPE,
        (accessToken) => {
          setToken(accessToken)
          setAccessToken(accessToken)
          fetchUserInfo(accessToken)
        },
        (err) => {
          console.info('[Auth] Login silencioso falhou, aguardando clique manual.')
          setLoading(false)
        }
      )

      setGisReady(true)

      // Login silencioso — não mostra popup se sessão Google ainda ativa
      setTimeout(() => {
        try { requestToken('') } catch { /* usuário vai clicar manualmente */ }
      }, 800)
    }
    loadGis()
  }, [])

  useEffect(() => {
    if (gapiReady && gisReady) setLoading(false)
  }, [gapiReady, gisReady])

  async function fetchUserInfo(accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setUser({ googleId: data.sub, name: data.name, email: data.email, picture: data.picture })
    } catch (err) {
      console.error('[Auth] Erro ao buscar userinfo:', err)
    }
  }

  const signIn = useCallback(() => {
    setError(null)
    requestToken('consent')
  }, [])

  const signOut = useCallback(() => {
    if (token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token, () => {})
    }
    setUser(null)
    setToken(null)
    setAccessToken(null)
  }, [token])

  return (
    <AuthContext.Provider
