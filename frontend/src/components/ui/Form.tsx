import React from 'react'
import { cn } from '../../utils/cn'

// Form context for field registration and validation
interface FormContextValue {
  errors: Record<string, string>
  touched: Record<string, boolean>
  values: Record<string, any>
  setFieldValue: (name: string, value: any) => void
  setFieldTouched: (name: string, touched: boolean) => void
  setFieldError: (name: string, error: string) => void
  validateField: (name: string) => void
  isSubmitting: boolean
}

const FormContext = React.createContext<FormContextValue | null>(null)

export function useFormContext() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context
}

// Form validation schema type
type ValidationRule = {
  required?: boolean | string
  minLength?: number | { value: number; message: string }
  maxLength?: number | { value: number; message: string }
  pattern?: RegExp | { value: RegExp; message: string }
  min?: number | { value: number; message: string }
  max?: number | { value: number; message: string }
  validate?: (value: any) => string | boolean
  custom?: (value: any, values: Record<string, any>) => string | boolean
}

type ValidationSchema = Record<string, ValidationRule>

interface FormProps {
  children: React.ReactNode
  onSubmit: (values: Record<string, any>) => void | Promise<void>
  initialValues?: Record<string, any>
  validationSchema?: ValidationSchema
  className?: string
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export function Form({
  children,
  onSubmit,
  initialValues = {},
  validationSchema = {},
  className,
  validateOnChange = true,
  validateOnBlur = true
}: FormProps) {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const validateField = React.useCallback((name: string) => {
    const value = values[name]
    const rules = validationSchema[name]
    
    if (!rules) return

    let error = ''

    // Required validation
    if (rules.required) {
      const isEmpty = value === undefined || value === null || value === '' || 
                     (Array.isArray(value) && value.length === 0)
      if (isEmpty) {
        error = typeof rules.required === 'string' ? rules.required : `${name} is required`
      }
    }

    // Length validations
    if (!error && value && typeof value === 'string') {
      if (rules.minLength) {
        const minLength = typeof rules.minLength === 'number' ? rules.minLength : rules.minLength.value
        const message = typeof rules.minLength === 'object' ? rules.minLength.message : 
                       `${name} must be at least ${minLength} characters`
        if (value.length < minLength) {
          error = message
        }
      }

      if (rules.maxLength) {
        const maxLength = typeof rules.maxLength === 'number' ? rules.maxLength : rules.maxLength.value
        const message = typeof rules.maxLength === 'object' ? rules.maxLength.message : 
                       `${name} must be no more than ${maxLength} characters`
        if (value.length > maxLength) {
          error = message
        }
      }
    }

    // Pattern validation
    if (!error && value && rules.pattern) {
      const pattern = (rules.pattern as any).value || rules.pattern
      const message = (rules.pattern as any).message || `${name} format is invalid`
      if (!(pattern as RegExp).test(value)) {
        error = message
      }
    }

    // Numeric validations
    if (!error && typeof value === 'number') {
      if (rules.min !== undefined) {
        const min = typeof rules.min === 'number' ? rules.min : rules.min.value
        const message = typeof rules.min === 'object' ? rules.min.message : 
                       `${name} must be at least ${min}`
        if (value < min) {
          error = message
        }
      }

      if (rules.max !== undefined) {
        const max = typeof rules.max === 'number' ? rules.max : rules.max.value
        const message = typeof rules.max === 'object' ? rules.max.message : 
                       `${name} must be no more than ${max}`
        if (value > max) {
          error = message
        }
      }
    }

    // Custom validation
    if (!error && rules.validate) {
      const result = rules.validate(value)
      if (typeof result === 'string') {
        error = result
      } else if (result === false) {
        error = `${name} is invalid`
      }
    }

    // Cross-field validation
    if (!error && rules.custom) {
      const result = rules.custom(value, values)
      if (typeof result === 'string') {
        error = result
      } else if (result === false) {
        error = `${name} is invalid`
      }
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }, [values, validationSchema])

  const setFieldValue = React.useCallback((name: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (validateOnChange && touched[name]) {
      setTimeout(() => validateField(name), 0)
    }
  }, [validateField, validateOnChange, touched])

  const setFieldTouched = React.useCallback((name: string, isTouched: boolean) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched
    }))
    
    if (validateOnBlur && isTouched) {
      setTimeout(() => validateField(name), 0)
    }
  }, [validateField, validateOnBlur])

  const setFieldError = React.useCallback((name: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }, [])

  const validateForm = React.useCallback(() => {
    const fieldNames = Object.keys(validationSchema)
    fieldNames.forEach(validateField)
    
    // Mark all fields as touched
    const touchedFields = fieldNames.reduce((acc, name) => {
      acc[name] = true
      return acc
    }, {} as Record<string, boolean>)
    setTouched(prev => ({ ...prev, ...touchedFields }))
    
    // Return whether form is valid
    return fieldNames.every(name => !errors[name])
  }, [validationSchema, validateField, errors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const isValid = validateForm()
      
      if (isValid) {
        await onSubmit(values)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextValue: FormContextValue = {
    errors,
    touched,
    values,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    validateField,
    isSubmitting
  }

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} className={cn('space-y-6', className)} noValidate>
        {children}
      </form>
    </FormContext.Provider>
  )
}

// Form field wrapper component
interface FormFieldProps {
  name: string
  children: (field: {
    name: string
    value: any
    onChange: (value: any) => void
    onBlur: () => void
    error?: string
    touched: boolean
  }) => React.ReactNode
}

export function FormField({ name, children }: FormFieldProps) {
  const { values, errors, touched, setFieldValue, setFieldTouched } = useFormContext()
  
  const field = {
    name,
    value: values[name],
    onChange: (value: any) => setFieldValue(name, value),
    onBlur: () => setFieldTouched(name, true),
    error: touched[name] ? errors[name] : undefined,
    touched: touched[name] || false
  }
  
  return <>{children(field)}</>
}

// Form section component
interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-white">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// Form actions component
interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function FormActions({ children, className, align = 'right' }: FormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }
  
  return (
    <div className={cn('flex items-center gap-3 pt-6', alignClasses[align], className)}>
      {children}
    </div>
  )
}

// Form error summary component
interface FormErrorSummaryProps {
  className?: string
}

export function FormErrorSummary({ className }: FormErrorSummaryProps) {
  const { errors, touched } = useFormContext()
  
  const visibleErrors = Object.entries(errors).filter(([name, error]) => 
    touched[name] && error
  )
  
  if (visibleErrors.length === 0) return null
  
  return (
    <div className={cn('p-4 bg-red-500/10 border border-red-500 rounded-lg', className)}>
      <h4 className="text-sm font-medium text-red-400 mb-2">
        Please fix the following errors:
      </h4>
      <ul className="text-sm text-red-300 space-y-1">
        {visibleErrors.map(([name, error]) => (
          <li key={name}>• {error}</li>
        ))}
      </ul>
    </div>
  )
}