// src/hooks/useProjects.js
import { useState, useCallback } from 'react'

const getHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export default function useProjects() {
  const [projects,   setProjects]   = useState([])
  const [project,    setProject]    = useState(null)   // detail 1 project
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // ── List ──────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/projects', { headers: getHeaders() })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setProjects(json.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  // ── Detail ────────────────────────────────────────────────────
  const fetchProject = useCallback(async (id) => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/projects/${id}`, { headers: getHeaders() })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setProject(json.data)
      return json.data
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  // ── Create ────────────────────────────────────────────────────
  const createProject = useCallback(async (data) => {
    const res  = await fetch('/api/projects', {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message || Object.values(json.errors ?? {}).flat()[0])
    setProjects(p => [json.data, ...p])
    return json.data
  }, [])

  // ── Update ────────────────────────────────────────────────────
  const updateProject = useCallback(async (id, data) => {
    const res  = await fetch(`/api/projects/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    setProjects(p => p.map(x => x.id === id ? json.data : x))
    if (project?.id === id) setProject(json.data)
    return json.data
  }, [project])

  // ── Delete ────────────────────────────────────────────────────
  const deleteProject = useCallback(async (id) => {
    const res  = await fetch(`/api/projects/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    setProjects(p => p.filter(x => x.id !== id))
  }, [])

  // ── Members ───────────────────────────────────────────────────
  const syncMembers = useCallback(async (projectId, memberIds) => {
    const res  = await fetch(`/api/projects/${projectId}/members`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify({ member_ids: memberIds }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    setProject(prev => prev ? { ...prev, members: json.data } : prev)
    return json.data
  }, [])

  // ── Tasks ─────────────────────────────────────────────────────
  const createTask = useCallback(async (projectId, data) => {
    const res  = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message || Object.values(json.errors ?? {}).flat()[0])
    // Inject task ke kolom yang sesuai
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map(col =>
          col.id === json.data.column_id
            ? { ...col, tasks: [...(col.tasks ?? []), json.data] }
            : col
        ),
      }
    })
    return json.data
  }, [])

  const updateTask = useCallback(async (projectId, taskId, data) => {
    const res  = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    // Update task di semua kolom
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          tasks: (col.tasks ?? []).map(t => t.id === taskId ? json.data : t),
        })),
      }
    })
    return json.data
  }, [])

  const deleteTask = useCallback(async (projectId, taskId) => {
    const res  = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE', headers: getHeaders(),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          tasks: (col.tasks ?? []).filter(t => t.id !== taskId),
        })),
      }
    })
  }, [])

  // Drag & drop reorder — update lokal dulu, lalu sync ke API
  const reorderTasks = useCallback(async (projectId, updatedColumns) => {
    // Update state lokal langsung (optimistic)
    setProject(prev => prev ? { ...prev, columns: updatedColumns } : prev)

    // Bangun payload untuk API
    const tasks = updatedColumns.flatMap(col =>
      (col.tasks ?? []).map((t, idx) => ({
        id:        t.id,
        column_id: col.id,
        position:  idx,
      }))
    )
    try {
      await fetch(`/api/projects/${projectId}/tasks/reorder`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ tasks }),
      })
    } catch {
      // Rollback jika gagal — refetch
      fetchProject(projectId)
    }
  }, [fetchProject])

  return {
    projects, project, loading, error,
    fetchProjects, fetchProject,
    createProject, updateProject, deleteProject,
    syncMembers,
    createTask, updateTask, deleteTask, reorderTasks,
    setProject,
  }
}
