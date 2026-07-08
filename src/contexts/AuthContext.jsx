import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { GOOGLE_CLIENT_ID, DRIVE_SCOPE } from '../lib/constants.js'
import { initTokenClient, requestToken, setAccessToken } from '../lib/drive.js'

const AuthContext = createContext(null)

const TOKEN_KEY      = 'biblioteca_token'
const TOKEN_TIME_KEY = 'biblioteca_token_time'
const TOKEN_TTL_MS   = 55 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [token, setToken]         = useState(null)
  const [gapiReady, setGapiReady] = useState(false)
  const [gisReady, setGisReady]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  function saveToken(accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString())
  }

  function clearSavedToken() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_TIME_KEY)
  }

  function onTokenReceived(accessToken) {
    setToken(accessToken)
    setAccessToken(accessToken)
    saveToken(accessToken)
    fetchUserInfo(accessToken)
  }

  async function fetchUserInfo(accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.sub) {
        setUser({ googleId: data.sub, name: data.name, email: data.email, picture: data.picture })
      }
    } catch (err) {
      console.error('[Auth] Erro ao buscar userinfo:', err)
    }
  }

  async function validateAndRestoreToken(saved) {
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1', {
        headers: { Authorization: `Bearer ${saved}` }
      })
      if (res.ok) {
        setToken(saved)
        setAccessToken(saved)
        fetchUserInfo(saved)
      } else {
        clearSavedToken()
        setTimeout(() => { try { requestToken('') } catch {} }, 800)
      }
    } catch {
      clearSavedToken()
      setTimeout(() => { try { requestToken('') } catch {} }, 800)
    }
  }

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

      initTokenClient(GOOGLE_CLIENT_ID, DRIVE_SCOPE, onTokenReceived, () => {
        setLoading(false)
      })

      setGisReady(true)

      const saved     = localStorage.getItem(TOKEN_KEY)
      const savedTime = parseInt(localStorage.getItem(TOKEN_TIME_KEY) || '0')
      const age       = Date.now() - savedTime

      if (saved && age < TOKEN_TTL_MS) {
        validateAndRestoreToken(saved)
      } else {
        clearSavedToken()
        setTimeout(() => { try { requestToken('') } catch {} }, 800)
      }
    }
    loadGis()
  }, [])

  useEffect(() => {
    if (gapiReady && gisReady) setLoading(false)
  }, [gapiReady, gisReady])

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
    clearSavedToken()
  }, [token])

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: Boolean(user && token),
      loading, error, signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
