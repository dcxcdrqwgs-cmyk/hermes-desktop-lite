// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri, loadBrowserDisabledSkills, saveBrowserDisabledSkills, loadBrowserInstalledSkills, saveBrowserInstalledSkills, getBrowserSkills, fetchMarketIndex, toBrowserInstalledSkill } from './browser-utils.js'
import { MOCK_TOOLSETS } from './mock-data.js'

// ========================
// 技能 API（Phase 3）
// ========================
export async function getSkills() {
  if (!isTauri) {
    return getBrowserSkills()
  }
  return await invoke('get_skills')
}

export async function getSkillDetail(name) {
  if (!isTauri) {
    const skill = getBrowserSkills().find((item) => item.name === name)
    if (!skill) throw new Error(`Skill not found: ${name}`)

    return {
      skill,
      content_preview: skill.content_preview || skill.description,
    }
  }
  return await invoke('get_skill_detail', { name })
}

export async function toggleSkill(name, enabled) {
  if (!isTauri) {
    const disabledSkills = loadBrowserDisabledSkills()
    if (enabled) {
      disabledSkills.delete(name)
    } else {
      disabledSkills.add(name)
    }
    saveBrowserDisabledSkills(disabledSkills)
    return getBrowserSkills().find((skill) => skill.name === name)
  }
  return await invoke('toggle_skill', { name, enabled })
}

export async function getToolsets() {
  if (!isTauri) return MOCK_TOOLSETS
  return await invoke('get_toolsets')
}

export async function getMarketSkills() {
  if (!isTauri) {
    const installedNames = new Map(getBrowserSkills().map((skill) => [skill.name, skill.source]))
    const skills = await fetchMarketIndex()

    return skills.map((skill) => ({
      ...skill,
      category: skill?.path?.split('/')?.[0] || null,
      installed: installedNames.has(skill.name),
      installed_source: installedNames.get(skill.name) || null,
    }))
  }
  return await invoke('get_market_skills')
}

export async function installSkill(identifier) {
  if (!isTauri) {
    const skills = await fetchMarketIndex()
    const marketSkill = skills.find((skill) => skill.identifier === identifier)

    if (!marketSkill) {
      return {
        success: false,
        stdout: '',
        stderr: `Preview mode: skill not found for ${identifier}`,
      }
    }

    const installedSkill = toBrowserInstalledSkill(marketSkill)
    const nextSkills = loadBrowserInstalledSkills().filter((skill) => skill?.name !== installedSkill.name)
    nextSkills.push(installedSkill)
    nextSkills.sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
    saveBrowserInstalledSkills(nextSkills)

    const disabledSkills = loadBrowserDisabledSkills()
    disabledSkills.delete(installedSkill.name)
    saveBrowserDisabledSkills(disabledSkills)

    return {
      success: true,
      stdout: `Preview mode: installed ${identifier}`,
      stderr: '',
    }
  }
  return await invoke('install_skill', { identifier })
}

export async function uninstallSkill(name) {
  if (!isTauri) {
    const nextSkills = loadBrowserInstalledSkills().filter((skill) => skill?.name !== name)
    saveBrowserInstalledSkills(nextSkills)

    const disabledSkills = loadBrowserDisabledSkills()
    disabledSkills.delete(name)
    saveBrowserDisabledSkills(disabledSkills)

    return {
      success: true,
      stdout: `Preview mode: uninstalled ${name}`,
      stderr: '',
    }
  }
  return await invoke('uninstall_skill', { name })
}

export async function checkSkillUpdates(name = null) {
  if (!isTauri) {
    return {
      success: true,
      stdout: 'Preview mode: no updates available',
      stderr: '',
    }
  }
  return await invoke('check_skill_updates', { name })
}

export async function updateSkill(name = null) {
  if (!isTauri) {
    return {
      success: true,
      stdout: `Preview mode: updated ${name || 'skills'}`,
      stderr: '',
    }
  }
  return await invoke('update_skill', { name })
}

export async function inspectMarketSkill(identifier) {
  if (!isTauri) {
    const skills = await fetchMarketIndex()
    const marketSkill = skills.find((skill) => skill.identifier === identifier)

    if (!marketSkill) {
      return {
        success: false,
        stdout: '',
        stderr: `Preview mode: skill not found for ${identifier}`,
      }
    }

    const lines = [
      `${marketSkill.name}`,
      '',
      marketSkill.description || '',
      '',
      `Identifier: ${marketSkill.identifier}`,
      `Source: ${marketSkill.source}`,
      marketSkill.path ? `Path: ${marketSkill.path}` : '',
      Array.isArray(marketSkill.tags) && marketSkill.tags.length > 0
        ? `Tags: ${marketSkill.tags.join(', ')}`
        : '',
    ].filter(Boolean)

    return {
      success: true,
      stdout: lines.join('\n'),
      stderr: '',
    }
  }
  return await invoke('inspect_market_skill', { identifier })
}
