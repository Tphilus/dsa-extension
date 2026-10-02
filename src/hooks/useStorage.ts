import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, saveSettings, saveToken, getRecentSubmissions, onStorageChanged } from '../utils/storage'
import { STORAGE_KEYS } from '../utils/constants'
import { useEffect } from 'react'

export function useSettings() {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ['storage', 'settings'],
    queryFn: getSettings
  })

  // Listen for sync storage changes (token specifically)
  useEffect(() => {
    const unsubscribe = onStorageChanged((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEYS.GITHUB_TOKEN]) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'settings'] })
      }
    })
    return unsubscribe
  }, [queryClient])

  return query
}

export function useSubmissions() {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ['storage', 'submissions'],
    queryFn: getRecentSubmissions,
    initialData: []
  })

  useEffect(() => {
    const unsubscribe = onStorageChanged((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.SUBMISSIONS]) {
        queryClient.setQueryData(['storage', 'submissions'], changes[STORAGE_KEYS.SUBMISSIONS].newValue || [])
      }
    })
    return unsubscribe
  }, [queryClient])

  return query
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', 'settings'] })
    }
  })
}

export function useSaveToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', 'settings'] })
    }
  })
}
