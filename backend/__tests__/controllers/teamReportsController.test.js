const TeamReport = require('../../models/teamReportsModel')

jest.mock('../../models/teamReportsModel', () => ({
  createTeamMonthlyReport: jest.fn(),
  getAllTeamMonthlyReports: jest.fn(),
  getTeamMonthlyReportById: jest.fn(),
  deleteTeamMonthlyReport: jest.fn()
}))

jest.mock('../../utils/teamReportExporter', () => ({
  exportTeamReportToExcel: jest.fn()
}))

const { exportTeamReportToExcel } = require('../../utils/teamReportExporter')
const TeamReportsController = require('../../controllers/teamReportsController')

describe('Team Reports Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forces team leaders to view only their own team reports', async () => {
    TeamReport.getAllTeamMonthlyReports.mockResolvedValue([])

    const req = {
      user: { role: 'team leader', id: 7 },
      query: { team_leader_id: '99', start_date: '2024-01-01' }
    }
    const res = {
      json: jest.fn()
    }

    await TeamReportsController.getAllTeamMonthlyReports(req, res)

    expect(TeamReport.getAllTeamMonthlyReports).toHaveBeenCalledWith({
      team_leader_id: 7,
      start_date: '2024-01-01'
    })
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: []
    }))
  })

  it('exports team reports with a sanitized attachment filename', async () => {
    TeamReport.getTeamMonthlyReportById.mockResolvedValue({
      id: 42,
      team_leader_id: 7,
      team_leader_name: 'North / West Team',
      team_leader_code: null,
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    })
    exportTeamReportToExcel.mockResolvedValue(Buffer.from('mock excel data'))

    const req = {
      params: { id: '42' },
      user: { role: 'admin', id: 1 }
    }
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    await TeamReportsController.exportTeamMonthlyReportToExcel(req, res)

    expect(exportTeamReportToExcel).toHaveBeenCalledWith(expect.objectContaining({
      team_leader_name: 'North / West Team'
    }))
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Team_Report_North_West_Team_Jan_01_2024_to_Jan_31_2024.xlsx"'
    )
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('normalizes stored team report JSON before exporting by id', async () => {
    TeamReport.getTeamMonthlyReportById.mockResolvedValue({
      id: 42,
      team_leader_id: 7,
      team_leader_name: 'North / West Team',
      team_leader_code: null,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      lead_sources: '{"Website": 3}',
      agent_reports: JSON.stringify([
        {
          agent_id: 11,
          agent_name: 'Alice Agent',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          lead_sources: '{"Website": 1}'
        }
      ])
    })
    exportTeamReportToExcel.mockResolvedValue(Buffer.from('mock excel data'))

    const req = {
      params: { id: '42' },
      user: { role: 'admin', id: 1 }
    }
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    await TeamReportsController.exportTeamMonthlyReportToExcel(req, res)

    expect(exportTeamReportToExcel).toHaveBeenCalledWith(expect.objectContaining({
      lead_sources: { Website: 3 },
      agent_reports: [
        expect.objectContaining({
          lead_sources: { Website: 1 }
        })
      ]
    }))
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Team_Report_North_West_Team_Jan_01_2024_to_Jan_31_2024.xlsx"'
    )
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('exports team report payloads with normalized nested report data', async () => {
    exportTeamReportToExcel.mockResolvedValue(Buffer.from('mock excel data'))

    const req = {
      body: {
        report: {
          id: 42,
          team_leader_id: 7,
          team_leader_name: 'North / West Team',
          team_leader_code: null,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          lead_sources: '{"Website": 3}',
          agent_reports: JSON.stringify([
            {
              agent_id: 11,
              agent_name: 'Alice Agent',
              start_date: '2024-01-01',
              end_date: '2024-01-31',
              lead_sources: '{"Website": 1}'
            }
          ])
        }
      },
      user: { role: 'admin', id: 1 }
    }
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    await TeamReportsController.exportTeamMonthlyReportToExcelFromPayload(req, res)

    expect(exportTeamReportToExcel).toHaveBeenCalledWith(expect.objectContaining({
      lead_sources: { Website: 3 },
      agent_reports: [
        expect.objectContaining({
          lead_sources: { Website: 1 }
        })
      ]
    }))
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Team_Report_North_West_Team_Jan_01_2024_to_Jan_31_2024.xlsx"'
    )
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
  })
})
