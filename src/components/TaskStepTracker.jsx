// Copyright (c) 2026 MeeJoy

import { useCallback, useState } from "react"

let stepIdCounter = 0

export function useTaskSteps() {
  const [steps, setSteps] = useState([])
  const [activeStepId, setActiveStepId] = useState(null)

  const initSteps = useCallback((stepConfigs) => {
    stepIdCounter += 1
    const newSteps = stepConfigs.map((config, index) => ({
      id: `${Date.now()}-${stepIdCounter}-${index}`,
      content: config.content || config,
      status: "pending",
      toolName: config.toolName || null,
      result: null,
    }))
    setSteps(newSteps)
    setActiveStepId(null)
    return newSteps
  }, [])

  const startStep = useCallback((stepId) => {
    setSteps((previous) =>
      previous.map((step) =>
        step.id === stepId ? { ...step, status: "in_progress" } : step
      )
    )
    setActiveStepId(stepId)
  }, [])

  const completeStep = useCallback((stepId, result = null) => {
    setSteps((previous) =>
      previous.map((step) =>
        step.id === stepId ? { ...step, status: "completed", result } : step
      )
    )
    setActiveStepId(null)
  }, [])

  const failStep = useCallback((stepId, error = null) => {
    setSteps((previous) =>
      previous.map((step) =>
        step.id === stepId ? { ...step, status: "pending", result: error } : step
      )
    )
    setActiveStepId(null)
  }, [])

  const clearSteps = useCallback(() => {
    setSteps([])
    setActiveStepId(null)
  }, [])

  return {
    steps,
    activeStepId,
    initSteps,
    startStep,
    completeStep,
    failStep,
    clearSteps,
  }
}
