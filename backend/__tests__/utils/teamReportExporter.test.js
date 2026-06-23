const ExcelJS = require('exceljs')

jest.mock('exceljs', () => ({
  Workbook: jest.fn()
}))

const { exportTeamReportToExcel } = require('../../utils/teamReportExporter')

describe('Team Report Exporter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a summary sheet and a sheet for each agent', async () => {
    const sheets = []
    const workbook = {
      worksheets: sheets,
      addWorksheet: jest.fn((name) => {
        const worksheet = {
          name,
          columns: [],
          mergeCells: jest.fn(),
          getCell: jest.fn().mockReturnValue({
            value: null,
            font: {},
            alignment: {},
            fill: {}
          })
        }
        sheets.push(worksheet)
        return worksheet
      }),
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
      }
    }

    ExcelJS.Workbook.mockImplementation(() => workbook)

    const buffer = await exportTeamReportToExcel({
      team_leader_name: 'Leader One',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      month: 1,
      year: 2024,
      agent_count: 2,
      listings_count: 5,
      lead_sources: { Website: 3 },
      viewings_count: 4,
      boosts: 0,
      sales_count: 2,
      sales_amount: 100000,
      agent_commission: 0,
      finders_commission: 0,
      referral_commission: 0,
      team_leader_commission: 0,
      administration_commission: 0,
      total_commission: 0,
      referral_received_count: 1,
      referral_received_commission: 0,
      referrals_on_properties_count: 1,
      referrals_on_properties_commission: 0,
      agent_reports: [
        {
          agent_id: 11,
          agent_name: 'Alice Agent',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          listings_count: 2,
          lead_sources: { Website: 1 },
          viewings_count: 1,
          sales_count: 1,
          sales_amount: 50000,
          agent_commission: 0,
          finders_commission: 0,
          team_leader_commission: 0,
          administration_commission: 0,
          total_commission: 0,
          referral_received_count: 0,
          referral_received_commission: 0,
          referrals_on_properties_count: 0,
          referrals_on_properties_commission: 0
        },
        {
          agent_id: 12,
          agent_name: 'Bob Agent',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          listings_count: 3,
          lead_sources: { Referral: 2 },
          viewings_count: 3,
          sales_count: 1,
          sales_amount: 50000,
          agent_commission: 0,
          finders_commission: 0,
          team_leader_commission: 0,
          administration_commission: 0,
          total_commission: 0,
          referral_received_count: 1,
          referral_received_commission: 0,
          referrals_on_properties_count: 1,
          referrals_on_properties_commission: 0
        }
      ]
    })

    expect(ExcelJS.Workbook).toHaveBeenCalled()
    expect(workbook.addWorksheet).toHaveBeenCalledWith('Team Report')
    expect(workbook.addWorksheet).toHaveBeenCalledWith('Agent 1 - Alice Agent')
    expect(workbook.addWorksheet).toHaveBeenCalledWith('Agent 2 - Bob Agent')
    expect(workbook.xlsx.writeBuffer).toHaveBeenCalled()
    sheets.forEach((worksheet) => {
      worksheet.mergeCells.mock.calls.forEach(([range]) => {
        expect(range).not.toContain('undefined')
      })
    })
    expect(buffer).toBeInstanceOf(Buffer)
  })
})
