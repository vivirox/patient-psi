'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '../ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { ChevronsUpDown } from 'lucide-react'

export interface CoreBeliefItem {
  id: string
  label: string
}

export interface CoreBeliefMapping {
  Helpless: CoreBeliefItem[]
  Unlovable: CoreBeliefItem[]
  Worthless: CoreBeliefItem[]
  Emotion: CoreBeliefItem[]
  [key: string]: CoreBeliefItem[] // index signature
}

// Core belief items
export const helplessBeliefItems: CoreBeliefItem[] = [
  { id: 'helpless-1', label: 'I am helpless and unable to cope' },
  { id: 'helpless-2', label: 'I am powerless to change my situation' },
  { id: 'helpless-3', label: 'I need others to solve my problems' },
  { id: 'helpless-4', label: 'I cannot manage on my own' },
  { id: 'helpless-5', label: 'I am weak and vulnerable' }
]

export const unlovableBeliefItems: CoreBeliefItem[] = [
  { id: 'unlovable-1', label: 'I am unworthy of love' },
  { id: 'unlovable-2', label: 'I will always be alone' },
  { id: 'unlovable-3', label: 'I am different and do not belong' },
  { id: 'unlovable-4', label: 'No one could truly care about me' },
  { id: 'unlovable-5', label: 'I am fundamentally flawed' }
]

export const worthlessBeliefItems: CoreBeliefItem[] = [
  { id: 'worthless-1', label: 'I am worthless' },
  { id: 'worthless-2', label: 'I am a failure' },
  { id: 'worthless-3', label: 'I am inadequate' },
  { id: 'worthless-4', label: 'I do not deserve good things' },
  { id: 'worthless-5', label: 'I am not good enough' }
]

export const emotionItems: CoreBeliefItem[] = [
  { id: 'emotion-1', label: 'Sadness' },
  { id: 'emotion-2', label: 'Anxiety' },
  { id: 'emotion-3', label: 'Anger' },
  { id: 'emotion-4', label: 'Fear' },
  { id: 'emotion-5', label: 'Shame' },
  { id: 'emotion-6', label: 'Guilt' },
  { id: 'emotion-7', label: 'Hopelessness' },
  { id: 'emotion-8', label: 'Loneliness' }
]

const FormSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    label: z.string()
  }))
})

interface DiagramCheckboxProps {
  category: string
  onCheckboxChange: (category: string, checkedValues: CoreBeliefItem[]) => void
  checkboxValues: CoreBeliefItem[]
}

export function DiagramCheckbox({
  category,
  onCheckboxChange,
  checkboxValues
}: DiagramCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false)

  const coreBeliefMapping: CoreBeliefMapping = {
    Helpless: helplessBeliefItems,
    Unlovable: unlovableBeliefItems,
    Worthless: worthlessBeliefItems,
    Emotion: emotionItems
  }

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: checkboxValues
    }
  })

  const items = coreBeliefMapping[category] || []

  const handleCheckboxChange = (item: CoreBeliefItem, checked: boolean) => {
    const newValues = checked
      ? [...checkboxValues, item]
      : checkboxValues.filter(v => v.id !== item.id)
    onCheckboxChange(category, newValues)
  }

  return (
    <div>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-[350px] space-y-2 mb-4"
      >
        <div className="flex items-center space-x-1 px-0">
          <div className="rounded-md border px-2 py-3 text-sm font-semibold">
            Expand to select{' '}
            <span className="underline">
              {category === 'Emotion' ? 'emotions' : `${category} Core Beliefs`}
            </span>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-9 p-0 hover:bg-gray-200"
            >
              <ChevronsUpDown className="h-5 w-5" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-4">
          <Form {...form}>
            <form className="space-y-4">
              <div className="space-y-2">
                {items.map(item => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="items"
                    render={() => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={checkboxValues.some(v => v.id === item.id)}
                            onCheckedChange={checked => {
                              handleCheckboxChange(item, checked as boolean)
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </form>
          </Form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
