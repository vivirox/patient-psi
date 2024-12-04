import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { IconSpinner } from '../ui/icons'

export interface PatientType {
  id: string
  type: string
  name: string
  description: string
  systemPrompt: string
}

export interface PatientProfile {
  id: string
  name: string
  type: string
  dateOfBirth?: string
  medicalHistory?: Record<string, any>
  metadata?: Record<string, any>
}

export const patientTypes: PatientType[] = [
  {
    id: 'depression',
    type: 'Depression',
    name: 'Depression Patient',
    description: 'A patient experiencing symptoms of depression.',
    systemPrompt: 'You are a mental health professional specializing in depression treatment.'
  },
  {
    id: 'anxiety',
    type: 'Anxiety',
    name: 'Anxiety Patient',
    description: 'A patient dealing with anxiety disorders.',
    systemPrompt: 'You are a mental health professional specializing in anxiety disorders.'
  },
  {
    id: 'bipolar',
    type: 'Bipolar Disorder',
    name: 'Bipolar Patient',
    description: 'A patient with bipolar disorder requiring specialized care.',
    systemPrompt: 'You are a mental health professional specializing in bipolar disorder treatment.'
  },
  {
    id: 'schizophrenia',
    type: 'Schizophrenia',
    name: 'Schizophrenia Patient',
    description: 'A patient with schizophrenia requiring comprehensive care.',
    systemPrompt: 'You are a mental health professional specializing in schizophrenia treatment.'
  }
]

interface PatientTypeMenuProps {
  onStartedChange: (isStarted: boolean) => void
  onSetPatientProfile: (profile: PatientProfile) => void
}

export function PatientTypeMenu({
  onStartedChange,
  onSetPatientProfile
}: PatientTypeMenuProps) {
  const [selectedType, setSelectedType] = useState<string>('Select Patient Type')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredTypes = patientTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTypeSelect = async (type: PatientType) => {
    setSelectedType(type.type)
    setShowDropdown(false)
  }

  const handleStartSession = async () => {
    if (selectedType === 'Select Patient Type') {
      toast.error('Please select a patient type first')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/patients/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch patient profile')
      }

      const profile = await response.json()
      onSetPatientProfile(profile)
      onStartedChange(true)
      toast.success('Session started successfully')
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="relative flex h-[35px] w-full sm:w-[240px] items-center justify-between gap-2"
            >
              <span className="truncate">{selectedType}</span>
              <svg
                className="h-4 w-4 opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[300px] p-2"
          >
            <div className="mb-2">
              <Input
                placeholder="Search patient types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredTypes.map((type) => (
                <DropdownMenuItem
                  key={type.id}
                  className="flex flex-col items-start py-2 cursor-pointer"
                  onClick={() => handleTypeSelect(type)}
                >
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {type.description}
                  </div>
                </DropdownMenuItem>
              ))}
              {filteredTypes.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  No patient types found
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="w-full sm:w-auto"
          onClick={handleStartSession}
          disabled={isLoading || selectedType === 'Select Patient Type'}
        >
          {isLoading ? (
            <>
              <IconSpinner className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            'Start Session'
          )}
        </Button>
      </div>

      {selectedType !== 'Select Patient Type' && (
        <div className="p-4 rounded-lg border bg-muted/50">
          <h3 className="font-medium mb-2">Selected Patient Type</h3>
          <p className="text-sm text-muted-foreground">
            {patientTypes.find(t => t.type === selectedType)?.description}
          </p>
        </div>
      )}
    </div>
  )
}
