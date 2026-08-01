export interface OperationsDailyFieldDefinition {
  key: keyof OperationsDailyRowDraft
  label: string
  workbookHeader: string
  calculated: boolean
  visible: boolean
}

export interface OperationsDailyRowDraft {
  operations_id?: number
  operations_name?: string
  properties_added: number
  preparing_daily_report: number
  phone_calls_duty_time: number
  replying_to_msg_on_sm_duty_time: number
  cvs: number
  amending_previous_properties: number
  filling: number
  preparing_contract: number
  tasks_efficiency: number
  phone_calls_out_of_duty_time: number
  replying_to_msg_on_sm_out_of_duty_time: number
  replying_to_whats_up_msg_out_of_duty_time: number
  leads_responded_to: number
  leads_responded_out_of_duty_time: number
  tasks_efficiency_duty_time: number
  tasks_efficiency_uniform: number
  tasks_efficiency_after_duty: number
  report_exists?: boolean
  existing_report_id?: number | null
}

export const OPERATIONS_DAILY_FIELD_DEFINITIONS: OperationsDailyFieldDefinition[] = [
  {
    key: 'properties_added',
    label: 'New Data',
    workbookHeader: 'New Data',
    calculated: true,
    visible: true
  },
  {
    key: 'preparing_daily_report',
    label: 'Preparing Daily report',
    workbookHeader: 'Preparing Daily report',
    calculated: false,
    visible: true
  },
  {
    key: 'phone_calls_duty_time',
    label: 'PHONE CALLS duty time',
    workbookHeader: 'PHONE CALLS duty time',
    calculated: false,
    visible: true
  },
  {
    key: 'replying_to_msg_on_sm_duty_time',
    label: 'Replying to msg on SM duty time',
    workbookHeader: 'Replying to msg on SM duty time',
    calculated: false,
    visible: true
  },
  {
    key: 'cvs',
    label: "CV's",
    workbookHeader: "CV's",
    calculated: false,
    visible: true
  },
  {
    key: 'amending_previous_properties',
    label: 'Amending previous data',
    workbookHeader: 'Amending previous data',
    calculated: true,
    visible: true
  },
  {
    key: 'filling',
    label: 'Filling',
    workbookHeader: 'Filling',
    calculated: false,
    visible: true
  },
  {
    key: 'preparing_contract',
    label: 'Preparing contract',
    workbookHeader: 'Preparing contract',
    calculated: false,
    visible: true
  },
  {
    key: 'tasks_efficiency',
    label: 'Tasks Efficiency',
    workbookHeader: 'Tasks Efficiency',
    calculated: false,
    visible: true
  },
  {
    key: 'phone_calls_out_of_duty_time',
    label: 'Phone calls out of duty time',
    workbookHeader: 'Phone calls out of duty time',
    calculated: false,
    visible: true
  },
  {
    key: 'replying_to_msg_on_sm_out_of_duty_time',
    label: 'Replying to msg on SM out of duty time',
    workbookHeader: 'Replying to msg on SM out of duty time',
    calculated: false,
    visible: true
  },
  {
    key: 'replying_to_whats_up_msg_out_of_duty_time',
    label: "Replying to what's up msg out of duty time",
    workbookHeader: "Replying to what's up msg out of duty time",
    calculated: false,
    visible: true
  }
]

export const OPERATIONS_DAILY_LEGACY_FIELD_DEFINITIONS: OperationsDailyFieldDefinition[] = [
  {
    key: 'leads_responded_to',
    label: 'Leads Responded To',
    workbookHeader: 'Leads Responded To',
    calculated: true,
    visible: false
  },
  {
    key: 'leads_responded_out_of_duty_time',
    label: 'Leads Responded Out of Duty Time',
    workbookHeader: 'Leads Responded Out of Duty Time',
    calculated: false,
    visible: false
  },
  {
    key: 'tasks_efficiency_duty_time',
    label: 'Tasks Efficiency - Duty Time',
    workbookHeader: 'Tasks Efficiency - Duty Time',
    calculated: false,
    visible: false
  },
  {
    key: 'tasks_efficiency_uniform',
    label: 'Tasks Efficiency - Uniform',
    workbookHeader: 'Tasks Efficiency - Uniform',
    calculated: false,
    visible: false
  },
  {
    key: 'tasks_efficiency_after_duty',
    label: 'Tasks Efficiency - After Duty Performance',
    workbookHeader: 'Tasks Efficiency - After Duty Performance',
    calculated: false,
    visible: false
  }
]

export const OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS = OPERATIONS_DAILY_FIELD_DEFINITIONS.filter(
  (field) => field.visible
)

export const OPERATIONS_DAILY_VISIBLE_FIELD_KEYS = OPERATIONS_DAILY_VISIBLE_FIELD_DEFINITIONS.map(
  (field) => field.key
)

export const OPERATIONS_DAILY_ALL_FIELD_DEFINITIONS = [
  ...OPERATIONS_DAILY_FIELD_DEFINITIONS,
  ...OPERATIONS_DAILY_LEGACY_FIELD_DEFINITIONS
]

export const OPERATIONS_DAILY_ALL_FIELD_KEYS = OPERATIONS_DAILY_ALL_FIELD_DEFINITIONS.map(
  (field) => field.key
)

export const OPERATIONS_DAILY_DEFAULT_ROW: OperationsDailyRowDraft = {
  properties_added: 0,
  preparing_daily_report: 0,
  phone_calls_duty_time: 0,
  replying_to_msg_on_sm_duty_time: 0,
  cvs: 0,
  amending_previous_properties: 0,
  filling: 0,
  preparing_contract: 0,
  tasks_efficiency: 0,
  phone_calls_out_of_duty_time: 0,
  replying_to_msg_on_sm_out_of_duty_time: 0,
  replying_to_whats_up_msg_out_of_duty_time: 0,
  leads_responded_to: 0,
  leads_responded_out_of_duty_time: 0,
  tasks_efficiency_duty_time: 0,
  tasks_efficiency_uniform: 0,
  tasks_efficiency_after_duty: 0
}

export function createDefaultOperationsDailyRow(
  overrides: Partial<OperationsDailyRowDraft> = {}
): OperationsDailyRowDraft {
  return {
    ...OPERATIONS_DAILY_DEFAULT_ROW,
    ...overrides
  }
}

export function toOperationsDailyRowDraft(
  row: Partial<OperationsDailyRowDraft> = {}
): OperationsDailyRowDraft {
  return createDefaultOperationsDailyRow(row)
}
