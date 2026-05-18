// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri, loadBrowserCronJobs, saveBrowserCronJobs, sortBrowserCronJobs, makeBrowserCronScheduleDisplay } from './browser-utils.js'

// ========================
// 定时任务 API
// ========================
export async function getCronJobs() {
  if (!isTauri) {
    return sortBrowserCronJobs(loadBrowserCronJobs())
  }
  return await invoke('get_cron_jobs')
}

export async function createCronJob({ prompt, schedule, name, deliver = 'local' }) {
  if (!isTauri) {
    const now = new Date().toISOString()
    const job = {
      id: `cron-${Date.now()}`,
      name: name?.trim() || null,
      prompt: String(prompt || '').trim(),
      schedule: {
        kind: 'cron',
        expr: String(schedule || '').trim(),
        display: makeBrowserCronScheduleDisplay(schedule),
      },
      schedule_display: makeBrowserCronScheduleDisplay(schedule),
      enabled: true,
      state: 'scheduled',
      deliver,
      last_run_at: null,
      next_run_at: now,
      last_error: null,
    }
    const nextJobs = sortBrowserCronJobs([...loadBrowserCronJobs(), job])
    saveBrowserCronJobs(nextJobs)
    return job
  }
  return await invoke('create_cron_job', {
    input: { prompt, schedule, name, deliver },
  })
}

export async function checkCronDependency() {
  if (!isTauri) {
    return {
      package_name: 'croniter',
      installed: true,
      python_command: 'python3',
      install_command: 'python3 -m pip install croniter',
      message: 'Browser preview mode does not require croniter.',
    }
  }
  return await invoke('check_cron_python_dependency')
}

export async function installCronDependency() {
  if (!isTauri) {
    return {
      package_name: 'croniter',
      success: true,
      python_command: 'python3',
      install_command: 'python3 -m pip install croniter',
      stdout: 'Browser preview mode: simulated installation.',
      stderr: '',
      message: 'Browser preview mode does not require croniter.',
    }
  }
  return await invoke('install_cron_python_dependency')
}

export async function restartHermesDashboard() {
  if (!isTauri) {
    return {
      success: true,
      command: 'hermes dashboard --port 9119 --no-open',
      message: 'Browser preview mode: simulated dashboard restart.',
    }
  }
  return await invoke('restart_hermes_dashboard')
}

export async function pauseCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, enabled: false, state: 'paused' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('pause_cron_job', { id })
}

export async function resumeCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, enabled: true, state: 'scheduled' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('resume_cron_job', { id })
}

export async function triggerCronJob(id) {
  if (!isTauri) {
    const now = new Date().toISOString()
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, last_run_at: now, state: job.state === 'paused' ? 'paused' : 'scheduled' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('trigger_cron_job', { id })
}

export async function deleteCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().filter((job) => job.id !== id)
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('delete_cron_job', { id })
}
