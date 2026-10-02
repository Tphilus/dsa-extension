import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthenticatedUser, listUserRepos, listBranches, createRepo, verifyAccess } from '../utils/github'

export function useGithubUser(token: string) {
  return useQuery({
    queryKey: ['github', 'user', token],
    queryFn: () => getAuthenticatedUser(token),
    enabled: !!token,
    retry: false
  })
}

export function useGithubRepos(token: string) {
  return useQuery({
    queryKey: ['github', 'repos', token],
    queryFn: () => listUserRepos(token),
    enabled: !!token
  })
}

export function useGithubBranches(token: string, repo: string) {
  return useQuery({
    queryKey: ['github', 'branches', token, repo],
    queryFn: () => {
      const [owner, name] = repo.split('/')
      if (!owner || !name) throw new Error('Invalid repo format')
      return listBranches(token, owner, name)
    },
    enabled: !!token && !!repo && repo.includes('/')
  })
}

export function useCreateRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, name, isPrivate }: { token: string, name: string, isPrivate: boolean }) => createRepo(token, name, isPrivate),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['github', 'repos', variables.token], (old: any) => {
        if (!old) return [data]
        return [data, ...old.filter((r: any) => r.fullName !== data.fullName)]
      })
    }
  })
}

export function useVerifyAccess() {
  return useMutation({
    mutationFn: (params: { token: string, repo: string, branch: string }) => verifyAccess(params)
  })
}
