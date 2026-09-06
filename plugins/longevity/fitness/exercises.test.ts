import { describe, expect, it } from 'vitest'
import { listExercisesByEquipment, loadExerciseCatalog, searchExercises } from './exercises'

describe('exercise catalog', () => {
  it('loads the vendored MIT metadata subset', () => {
    const catalog = loadExerciseCatalog()
    expect(catalog.count).toBeGreaterThan(20)
    expect(catalog.license).toContain('MIT')
    expect(catalog.exercises.every((exercise) => exercise.instructionsEn.length > 0)).toBe(true)
  })

  it('filters bodyweight and search terms', () => {
    expect(listExercisesByEquipment('body weight').length).toBeGreaterThan(0)
    expect(searchExercises('squat').some((exercise) => exercise.name.includes('squat'))).toBe(true)
  })
})
