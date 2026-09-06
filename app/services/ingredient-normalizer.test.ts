import { describe, expect, it } from 'vitest'
import { detectDuplicateIngredients } from './ingredient-normalizer'

describe('ingredient normalizer', () => {
  it('detects duplicate vitamin D sources', () => {
    expect(detectDuplicateIngredients(['Vitamin D3', 'Cholecalciferol 2000 IU'])).toContain('vitamin-d')
  })
})
