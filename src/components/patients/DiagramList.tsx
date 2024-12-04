'use client'

import { useState } from 'react'
import { DiagramCheckbox, type CoreBeliefItem } from './DiagramCheckbox'

interface DiagramListProps {
  onUpdate?: (beliefs: Record<string, CoreBeliefItem[]>) => void
}

export function DiagramList({ onUpdate }: DiagramListProps) {
  const [selectedBeliefs, setSelectedBeliefs] = useState<Record<string, CoreBeliefItem[]>>({
    Helpless: [],
    Unlovable: [],
    Worthless: [],
    Emotion: []
  })

  const handleCheckboxChange = (category: string, checkedValues: CoreBeliefItem[]) => {
    const newBeliefs = {
      ...selectedBeliefs,
      [category]: checkedValues
    }
    setSelectedBeliefs(newBeliefs)
    onUpdate?.(newBeliefs)
  }

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Core Beliefs & Emotions</h2>
        <p className="text-sm text-muted-foreground">
          Select the core beliefs and emotions that resonate with your current state.
        </p>
      </div>

      <div className="space-y-4">
        <DiagramCheckbox
          category="Helpless"
          checkboxValues={selectedBeliefs.Helpless}
          onCheckboxChange={handleCheckboxChange}
        />
        <DiagramCheckbox
          category="Unlovable"
          checkboxValues={selectedBeliefs.Unlovable}
          onCheckboxChange={handleCheckboxChange}
        />
        <DiagramCheckbox
          category="Worthless"
          checkboxValues={selectedBeliefs.Worthless}
          onCheckboxChange={handleCheckboxChange}
        />
        <DiagramCheckbox
          category="Emotion"
          checkboxValues={selectedBeliefs.Emotion}
          onCheckboxChange={handleCheckboxChange}
        />
      </div>

      {/* Summary of selected items */}
      <div className="mt-6 space-y-4">
        {Object.entries(selectedBeliefs).map(([category, items]) => (
          items.length > 0 && (
            <div key={category} className="rounded-lg border p-4">
              <h3 className="font-medium mb-2">
                {category === 'Emotion' ? 'Selected Emotions' : `Selected ${category} Beliefs`}
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {items.map(item => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
